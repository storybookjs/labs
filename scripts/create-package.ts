import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import * as p from '@clack/prompts';

/**
 * Flags accepted by the script; any missing value is prompted for.
 */
type CliArgs = {
  /** Package name without scope. */
  name?: string;
  /** One-line package description. */
  description?: string;
  /** Template folder under `templates/`. */
  template?: string;
  /** Skip `vp install` after scaffolding. */
  'skip-install': boolean;
  /** Print usage and exit. */
  help: boolean;
};

const ROOT_DIR = join(import.meta.dirname, '..');
const PACKAGES_DIR = join(ROOT_DIR, 'packages');
const TEMPLATES_DIR = join(ROOT_DIR, 'templates');
const SCOPE = '@storybookjs';
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const PLACEHOLDER_FILES = ['README.md'];

const HELP = `Usage: pnpm new [options]

Scaffolds packages/<name> from templates/<template>. Missing options are prompted for.

Options:
  --name <name>          Package name, published as ${SCOPE}/<name>
  --description <text>   One-line package description
  --template <template>  Template folder under templates/
  --skip-install         Don't run vp install afterwards
  -h, --help             Show this help`;

const args = parseCliArgs();

if (args.help) {
  console.log(HELP);
  process.exit(0);
}

const interactive = process.stdin.isTTY;
const templates = (await readdir(TEMPLATES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

p.intro(`Create a ${SCOPE} package`);

const name = await resolveOption('name', args.name, () =>
  p.text({ message: 'Package name', placeholder: 'vite-plugin-foo', validate: validateName })
);
const nameError = validateName(name);
if (nameError) fail(nameError);

const description = await resolveOption('description', args.description, () =>
  p.text({ message: 'Description', placeholder: 'One line about what it does' })
);

const template = await resolveOption(
  'template',
  args.template ?? (templates.length === 1 ? templates[0] : undefined),
  () =>
    p.select({
      message: 'Template',
      options: templates.map((value) => ({ value, label: value })),
    })
);
if (!templates.includes(template)) {
  fail(`Unknown template "${template}". Available: ${templates.join(', ')}`);
}

const fullName = `${SCOPE}/${name}`;
if (await isPublished(fullName)) {
  p.log.warn(`${fullName} already exists on npm, publishing will need a different name.`);
}

const targetDir = join(PACKAGES_DIR, name);
try {
  await cp(join(TEMPLATES_DIR, template), targetDir, { recursive: true });

  const pkgPath = join(targetDir, 'package.json');
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.name = fullName;
  pkg.description = description;
  pkg.repository.directory = `packages/${name}`;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  for (const file of PLACEHOLDER_FILES) {
    const path = join(targetDir, file);
    const content = await readFile(path, 'utf8');
    // Function replacers, so `$&`-style patterns in user input stay literal.
    await writeFile(
      path,
      content.replaceAll('{{name}}', () => name).replaceAll('{{description}}', () => description)
    );
  }

  run('vp', ['fmt', targetDir]);
} catch (error) {
  await rm(targetDir, { recursive: true, force: true });
  fail(`Scaffolding failed, removed packages/${name}:\n${errorMessage(error)}`);
}

if (!args['skip-install']) {
  const spin = p.spinner();
  spin.start('Installing dependencies');
  try {
    run('vp', ['install']);
    spin.stop('Dependencies installed');
  } catch (error) {
    spin.error('vp install failed');
    fail(`packages/${name} was created; run \`vp install\` once fixed:\n${errorMessage(error)}`);
  }
}

p.outro(`Created ${fullName} in packages/${name}`);

/**
 * Parses CLI flags, tolerating the `--` separator that `pnpm new -- --name x` forwards.
 */
function parseCliArgs(): CliArgs {
  const argv = process.argv.slice(2);
  try {
    const { values } = parseArgs({
      args: argv[0] === '--' ? argv.slice(1) : argv,
      options: {
        name: { type: 'string' },
        description: { type: 'string' },
        template: { type: 'string' },
        'skip-install': { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
    return values;
  } catch (error) {
    console.error(`${errorMessage(error)}\n\n${HELP}`);
    process.exit(1);
  }
}

/**
 * Runs a command from the repo root, surfacing its stderr when it fails.
 */
function run(command: string, commandArgs: string[]): void {
  const result = spawnSync(command, commandArgs, { cwd: ROOT_DIR, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `\`${command} ${commandArgs.join(' ')}\` failed\n${result.stderr || result.stdout}`
    );
  }
}

/**
 * Extracts a printable message from an unknown thrown value.
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Returns the CLI value when given, otherwise prompts for it (or fails when not interactive).
 */
async function resolveOption(
  flag: string,
  value: string | undefined,
  prompt: () => Promise<string | symbol>
): Promise<string> {
  if (value !== undefined) return value;
  if (!interactive) fail(`Missing --${flag} (required when not running in a terminal)`);

  const answer = await prompt();
  if (typeof answer === 'symbol') {
    p.cancel('Cancelled');
    process.exit(1);
  }
  return answer;
}

/**
 * Returns an error message when the name is invalid or already taken locally.
 */
function validateName(value: string | undefined): string | undefined {
  if (!value) return 'Name is required';
  if (!NAME_PATTERN.test(value)) return 'Use lowercase letters, digits and dashes only';
  if (existsSync(join(PACKAGES_DIR, value))) return `packages/${value} already exists`;
  return undefined;
}

/**
 * Checks the npm registry; network failures count as "not published" so offline use still works.
 */
async function isPublished(packageName: string): Promise<boolean> {
  try {
    const url = `https://registry.npmjs.org/${packageName.replace('/', '%2f')}`;
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Prints the error and exits.
 */
function fail(message: string): never {
  p.cancel(message);
  process.exit(1);
}
