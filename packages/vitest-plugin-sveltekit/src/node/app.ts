import path from 'pathe';
import type { ResolvedConfig } from 'vite';

import { literal } from './code.ts';
import { resolveModule } from './files.ts';

export interface AppFiles {
  serverHooks: string | null;
  universalHooks: string | null;
  /** `src/env.ts`, where the app declares its env variables. */
  envEntry: string | null;
  /** The folder of the `.env` files. */
  envDir: string;
  /** SvelteKit's output folder, `.svelte-kit`. */
  outDir: string;
}

interface KitOptions {
  files?: { src?: string; hooks?: { server?: string | null; universal?: string | null } };
  env?: { dir?: string };
  outDir?: string;
}

/** Finds the app's hooks files and its env setup. */
export function findAppFiles(config: ResolvedConfig, server: boolean): AppFiles {
  const kit = config.plugins.find((plugin) => plugin.name === 'vite-plugin-sveltekit-setup')?.api
    ?.options as KitOptions | undefined;
  const src = kit?.files?.src ?? 'src';
  const hook = (configured: string | null | undefined, name: string) =>
    resolveModule(path.resolve(config.root, configured ?? path.join(src, name)));

  return {
    serverHooks: server ? hook(kit?.files?.hooks?.server, 'hooks.server') : null,
    universalHooks: hook(kit?.files?.hooks?.universal, 'hooks'),
    envEntry: resolveModule(path.resolve(config.root, src, 'env')),
    envDir: path.resolve(config.root, kit?.env?.dir || '.'),
    outDir: path.resolve(config.root, kit?.outDir ?? '.svelte-kit'),
  };
}

/** App code the runtime loads: the hooks. */
export function appModule(app: AppFiles, server: boolean): string {
  const lines = [`export const serverMode = ${server};`];

  lines.push(
    app.universalHooks
      ? `export * as universalHooks from ${literal(app.universalHooks)};`
      : 'export const universalHooks = {};'
  );

  // Lazy: the server hooks may import `$app/env/private`, which reads the env when it loads.
  lines.push(
    app.serverHooks
      ? `export const loadServerHooks = () => import(${literal(app.serverHooks)});`
      : 'export const loadServerHooks = async () => ({});'
  );

  return lines.join('\n') + '\n';
}
