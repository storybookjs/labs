import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import semver from 'semver';

/**
 * Resolves a release tag of the form `<package name>@<version>` (e.g. `@storybookjs/vite-plugin@0.1.0`)
 * to the workspace package it releases, and verifies that:
 * - the version is valid semver and still `0.x`, since labs packages are experimental;
 * - exactly one workspace package under `packages/` has that name;
 * - that package's `package.json` carries the same, also `0.x`, version.
 *
 * Writes `name`, `version`, `dir`, `previous` and `prerelease` to `$GITHUB_OUTPUT` (or stdout when
 * unset) for the release workflow.
 *
 * Usage: node scripts/resolve-release.ts <tag>
 */

type WorkspacePackage = { name: string; path: string };

const ROOT_DIR = join(import.meta.dirname, '..');
// The name is everything before the last `@`; the leading `@` belongs to the scope.
const TAG_PATTERN = /^(?<name>@[a-z0-9-]+\/[a-z0-9._-]+)@(?<version>[^@]+)$/;

const tag = process.argv[2];
if (!tag) fail('Usage: node scripts/resolve-release.ts <tag>');

const match = TAG_PATTERN.exec(tag)?.groups;
if (!match?.name || !match.version) {
  fail(`Tag ${tag} is not '<package name>@<version>', e.g. @storybookjs/vite-plugin@0.1.0.`);
}
const { name } = match;
const version = assertExperimentalVersion(match.version, `Tag ${tag}`);

// `--filter` is a pnpm selector, so the match is checked against the tag's name exactly.
const packages = JSON.parse(
  run('pnpm', ['list', '--filter', name, '--depth', '-1', '--json'])
) as WorkspacePackage[];
const [pkg] = packages;
if (!pkg || packages.length !== 1) {
  fail(`Tag ${tag} matched ${packages.length} workspace packages instead of exactly one.`);
}
const dir = relative(ROOT_DIR, pkg.path);
const manifestPath = `${dir}/package.json`;

if (pkg.name !== name) fail(`Tag ${tag} names ${name} but resolved to ${pkg.name}.`);
if (!dir.startsWith('packages/')) fail(`${name} lives in ${dir}, not under packages/.`);

// Read from disk rather than trusting pnpm's view, since this is exactly what gets published.
const manifest = JSON.parse(readFileSync(join(ROOT_DIR, manifestPath), 'utf8')) as {
  version?: unknown;
};
if (typeof manifest.version !== 'string') fail(`${name} has no version.`, manifestPath);
const manifestVersion = assertExperimentalVersion(manifest.version, `${name}'s package.json`, manifestPath);
if (!semver.eq(manifestVersion, version)) {
  fail(`Tag ${tag} but ${name} is at version ${manifestVersion}.`, manifestPath);
}

// Previous release of this package, if any, for the changelog range.
const previous =
  run('git', ['tag', '--list', `${name}@*`, '--sort=-v:refname'])
    .split('\n')
    .map((line) => line.trim())
    .find((other) => other && other !== tag) ?? '';

const outputs = {
  name,
  version,
  dir,
  previous,
  prerelease: String(semver.prerelease(version) !== null),
};
const lines = Object.entries(outputs)
  .map(([key, value]) => `${key}=${value}\n`)
  .join('');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
else process.stdout.write(lines);

/**
 * Checks that `value` is a canonical semver version on major `0`, and returns it. Canonical rules
 * out a `v` prefix, ranges, and build metadata (`+…`), which npm drops on publish.
 */
function assertExperimentalVersion(value: string, label: string, file?: string): string {
  const parsed = semver.parse(value);
  if (!parsed || parsed.version !== value) {
    fail(`${label} has invalid semver version ${value}.`, file);
  }
  if (parsed.major !== 0) {
    fail(`${label} is at ${value}, but labs packages are experimental and must stay on 0.x.`, file);
  }
  return parsed.version;
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { cwd: ROOT_DIR, encoding: 'utf8' });
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout;
}

/** Reports the error as a GitHub Actions annotation and exits. */
function fail(message: string, file?: string): never {
  const location = file ? ` file=${file}` : '';
  console.error(process.env.GITHUB_ACTIONS ? `::error${location}::${message}` : message);
  process.exit(1);
}
