import { readFile } from 'node:fs/promises';

import path from 'pathe';

import { importSpecifiers } from './dependencies.ts';
import { REMOTE_MODULE } from './files.ts';

/** Resolves `specifier` from `importer` to a file, as Vite would. */
export type Resolve = (specifier: string, importer: string) => Promise<string | null>;

const SCRIPT = /\.(m?[jt]s|[jt]sx)$/;

/** A script file of the project: an absolute path, not in `node_modules`, not a virtual module. */
export function isProjectScript(file: string): boolean {
  return path.isAbsolute(file) && SCRIPT.test(file) && !file.includes('/node_modules/');
}

/** A remote module of the project (remote modules in packages are not supported). */
export function isRemoteModule(file: string): boolean {
  return REMOTE_MODULE.test(file) && !file.includes('/node_modules/');
}

/**
 * Whether `file` imports a remote module, directly or through other project scripts. Server code
 * that imports such a module (`a.remote.ts → helper.ts → b.remote.ts`) needs a server copy of it,
 * so that the remote functions it reaches are the server ones too.
 */
export async function reachesRemoteModule(file: string, resolve: Resolve): Promise<boolean> {
  const seen = new Set([file]);
  const queue = [file];

  for (let current = queue.pop(); current; current = queue.pop()) {
    let code: string;
    try {
      code = await readFile(current, 'utf8');
    } catch {
      continue;
    }

    for (const specifier of importSpecifiers(current, code)) {
      const resolved = await resolve(specifier, current);
      if (!resolved || seen.has(resolved)) continue;
      if (isRemoteModule(resolved)) return true;
      if (!isProjectScript(resolved)) continue;
      seen.add(resolved);
      queue.push(resolved);
    }
  }
  return false;
}
