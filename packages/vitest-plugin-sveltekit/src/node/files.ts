import { existsSync } from 'node:fs';

/**
 * SvelteKit's `remote_module_pattern`: `x.remote.ts`, `x.remote.svelte.ts`, `remote.js`, ...
 * SvelteKit's remote plugin matches on this alone; `moduleExtensions` only drive its guard for a
 * disabled flag. `[^/]+` also covers the server copy's `?server`.
 */
export const REMOTE_MODULE: RegExp = /[/.]remote\.[^/]+$/;

export const MODULE_EXTENSIONS: string[] = ['.ts', '.js', '.mts', '.mjs'];

/** `base` itself if it is a script file, else the first `base<extension>` that exists. */
export function resolveModule(base: string): string | null {
  if (MODULE_EXTENSIONS.some((extension) => base.endsWith(extension)) && existsSync(base)) {
    return base;
  }
  for (const extension of MODULE_EXTENSIONS) {
    if (existsSync(base + extension)) return base + extension;
  }
  return null;
}
