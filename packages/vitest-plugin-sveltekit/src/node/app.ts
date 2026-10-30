import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { parseSync } from 'oxc-parser';
import path from 'pathe';
import { loadEnv, type ResolvedConfig } from 'vite';

import { resolveModule } from './files.ts';

export interface AppFiles {
  serverHooks: string | null;
  universalHooks: string | null;
  /** Private env values for a static build (server mode). */
  env: Record<string, string> | null;
}

interface KitOptions {
  files?: { src?: string; hooks?: { server?: string | null; universal?: string | null } };
  env?: { dir?: string };
}

/** Finds the app's hooks files and, for a server-mode build, its env values. */
export function findAppFiles(config: ResolvedConfig, server: boolean): AppFiles {
  const kit = config.plugins.find((plugin) => plugin.name === 'vite-plugin-sveltekit-setup')?.api
    ?.options as KitOptions | undefined;
  const src = kit?.files?.src ?? 'src';
  const hook = (configured: string | null | undefined, name: string) =>
    resolveModule(path.resolve(config.root, configured ?? path.join(src, name)));

  return {
    serverHooks: server ? hook(kit?.files?.hooks?.server, 'hooks.server') : null,
    universalHooks: hook(kit?.files?.hooks?.universal, 'hooks'),
    // In dev, SvelteKit's generated env module already has the values.
    env:
      server && config.command === 'build'
        ? readEnv(
            path.resolve(config.root, kit?.env?.dir || '.'),
            config.mode,
            declaredEnvKeys(resolveModule(path.resolve(config.root, src, 'env')))
          )
        : null,
  };
}

/**
 * The variable names that `src/env.ts` declares: the keys of `export const variables =
 * defineEnvVars({ ... })` (or a plain object). Read from the source, without running it. When the
 * names cannot be read that way (a spread, a computed key), none are returned, and the build gets
 * no values.
 */
export function declaredEnvKeys(file: string | null): Set<string> {
  if (!file) return new Set();

  const { program } = parseSync(file, readFileSync(file, 'utf8'), { sourceType: 'module' });
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    if (statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const { id, init } of statement.declaration.declarations) {
      if (id.type !== 'Identifier' || id.name !== 'variables') continue;
      const config = init?.type === 'CallExpression' ? init.arguments[0] : init;
      if (config?.type !== 'ObjectExpression') break;

      const keys = config.properties.map((property) =>
        property.type === 'Property' && !property.computed
          ? property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'Literal'
              ? String(property.key.value)
              : null
          : null
      );
      if (keys.every((key) => key !== null)) return new Set(keys);
    }
  }

  console.warn(
    `[vitest-plugin-sveltekit] cannot read the variable names in ${file}: write \`export const variables = defineEnvVars({ NAME: ... })\` with plain keys. The build gets no private env values.`
  );
  return new Set();
}

/**
 * The env values a static build writes into the page. Values come from Vite's `loadEnv`, as in
 * SvelteKit (`${VAR}` expansion, the shell overrides the files). Only keys that the `.env` files
 * name and `src/env.ts` declares are kept, never the whole process environment.
 */
export function readEnv(
  dir: string,
  mode: string,
  declared: ReadonlySet<string>
): Record<string, string> {
  const values = loadEnv(mode, dir, '');
  const keys = new Set<string>();
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const file = path.join(dir, name);
    if (existsSync(file)) {
      for (const key of Object.keys(parseEnv(readFileSync(file, 'utf8')))) keys.add(key);
    }
  }
  return Object.fromEntries(
    [...keys]
      .filter((key) => declared.has(key) && values[key] !== undefined)
      .map((key) => [key, values[key]!])
  );
}

/** App code the runtime loads: hooks, and in server mode the env setup. */
export function appModule(app: AppFiles, server: boolean): string {
  const lines = [`export const serverMode = ${server};`];

  lines.push(
    app.universalHooks
      ? `export * as universalHooks from ${JSON.stringify(app.universalHooks)};`
      : 'export const universalHooks = {};'
  );

  // Lazy: the server hooks may import `$app/env/private`, which reads the env when it loads.
  lines.push(
    app.serverHooks
      ? `export const loadServerHooks = () => import(${JSON.stringify(app.serverHooks)});`
      : 'export const loadServerHooks = async () => ({});'
  );

  if (app.env) {
    lines.push(
      `import { set_env } from '<sveltekit:generated>/env/config.js';`,
      `export function initEnv() {`,
      `  set_env(${JSON.stringify(app.env)});`,
      '}'
    );
  } else {
    lines.push('export function initEnv() {}');
  }

  return lines.join('\n') + '\n';
}
