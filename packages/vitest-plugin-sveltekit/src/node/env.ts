import { readFileSync } from 'node:fs';

import path from 'pathe';
import { loadEnv } from 'vite';

import { literal } from './code.ts';
import { type Program, parseModule } from './parse.ts';

export interface DeclaredEnvVar {
  name: string;
  /** `public: true` in `src/env.ts`. A value that is not a literal `true` counts as private. */
  public: boolean;
}

/**
 * The variables that `src/env.ts` declares: the keys of `export const variables =
 * defineEnvVars({ ... })` (or a plain object), and whether each is public. Read from the source,
 * without running it. When they cannot be read that way (a spread, a computed key), none are
 * returned, with a warning.
 */
export function declaredEnvVars(file: string | null): DeclaredEnvVar[] {
  if (!file) return [];

  let body: Program['body'] = [];
  try {
    body = parseModule(readFileSync(file, 'utf8'), file).body;
  } catch {
    // Reported below, like keys that cannot be read.
  }
  for (const statement of body) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    if (statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const { id, init } of statement.declaration.declarations) {
      if (id.type !== 'Identifier' || id.name !== 'variables') continue;
      const config = init?.type === 'CallExpression' ? init.arguments[0] : init;
      if (config?.type !== 'ObjectExpression') break;

      const declared = config.properties.map((property) => {
        if (property.type !== 'Property' || property.computed) return null;
        const name =
          property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'Literal'
              ? String(property.key.value)
              : null;
        if (name === null) return null;
        const options = property.value.type === 'ObjectExpression' ? property.value : null;
        const isPublic = !!options?.properties.some(
          (option) =>
            option.type === 'Property' &&
            !option.computed &&
            option.key.type === 'Identifier' &&
            option.key.name === 'public' &&
            option.value.type === 'Literal' &&
            option.value.value === true
        );
        return { name, public: isPublic };
      });
      if (declared.every((variable) => variable !== null)) return declared;
    }
  }

  console.warn(
    `[vitest-plugin-sveltekit] cannot read the variable names in ${file}: write \`export const variables = defineEnvVars({ NAME: ... })\` with plain keys. Stories and tests get no env values.`
  );
  return [];
}

/** What the browser gets in place of SvelteKit's generated env modules. */
export interface BrowserEnv {
  /** `src/env.ts`, or `null` when the app declares no variables. */
  entry: string | null;
  variables: DeclaredEnvVar[];
  /** Public values from the app's env, as in the app. Private values from the plugin's `env`. */
  values: Record<string, string>;
  /** Private variables without a value. */
  missing: string[];
}

/**
 * The env for stories and tests. Public variables get the app's values (`.env` files and the
 * shell, like SvelteKit): the app sends them to the browser too. Private variables get only the
 * values passed to the plugin: real `.env` values never reach the browser.
 */
export function browserEnv(options: {
  entry: string | null;
  envDir: string;
  mode: string;
  env: Readonly<Record<string, string | undefined>>;
}): BrowserEnv {
  const variables = declaredEnvVars(options.entry);
  const appEnv = loadEnv(options.mode, options.envDir, '');
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const { name, public: isPublic } of variables) {
    const value = isPublic ? appEnv[name] : options.env[name];
    if (value !== undefined) values[name] = value;
    else if (!isPublic) missing.push(name);
  }
  return { entry: options.entry, variables, values, missing };
}

const GENERATED_ENV =
  /[/\\]generated[/\\](?:dev|build)[/\\]env[/\\](config|private[/\\]server)\.js$/;

/**
 * Which of SvelteKit's generated env modules `file` is (`<sveltekit:generated>/env/...` resolves
 * into `outDir`), if it is one this package replaces in the browser.
 */
export function generatedEnvModule(file: string, outDir: string): 'config' | 'private' | null {
  if (!path.normalize(file).startsWith(`${path.normalize(outDir)}/`)) return null;
  const match = GENERATED_ENV.exec(file);
  if (!match) return null;
  return match[1] === 'config' ? 'config' : 'private';
}

/**
 * `<sveltekit:generated>/env/config.js` for the browser. SvelteKit's own module has the app's
 * values (in dev, every declared variable). This one has `env.values` only. A variable without a
 * value gets its schema's default, or stays unset instead of failing the page.
 */
export function envConfigModule(env: BrowserEnv): string {
  if (!env.entry) {
    return [
      'export const variables = {};',
      'export const dynamic_private_env = {};',
      'export const explicit_public_env = {};',
      'export const rendered_env = {};',
      'export function set_env() {}',
      '',
    ].join('\n');
  }
  return `// vitest-plugin-sveltekit: private values come from the plugin's \`env\` option, never from .env files.
import { variables } from ${literal(env.entry)};
import { validate, handle_issues } from '@sveltejs/kit/internal/env';

export { variables };
export const dynamic_private_env = {};
export const explicit_public_env = {};
export const rendered_env = {};

export function set_env(env) {
  const issues = {};
  for (const name of Object.keys(variables)) {
    const own = {};
    const value = validate(variables, env[name], name, own);
    if (Object.keys(own).length > 0) {
      if (env[name] === undefined) continue;
      Object.assign(issues, own);
    } else if (variables[name].public) {
      explicit_public_env[name] = value;
      rendered_env[name] = value;
    } else {
      dynamic_private_env[name] = value;
    }
  }
  handle_issues(issues);
}

set_env(${literal(env.values)});
`;
}

/** `<sveltekit:generated>/env/private/server.js` for the browser: the values from the config module. */
export function privateEnvModule(env: BrowserEnv): string {
  return [
    `import { dynamic_private_env as env } from '../config.js';`,
    '',
    ...env.variables
      .filter((variable) => !variable.public)
      .map(({ name }) => `export const ${name} = env.${name};`),
    '',
  ].join('\n');
}

/** The warning for private variables that stories and tests run without. */
export function missingEnvWarning(missing: readonly string[]): string {
  const example = missing.map((name) => `${name}: '...'`).join(', ');
  return `[vitest-plugin-sveltekit] no value for ${missing.join(', ')} in stories and tests: real .env values never reach the browser. Pass the values server code needs with \`vitestPluginSvelteKit({ server: true, env: { ${example} } })\`.`;
}
