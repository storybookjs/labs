import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { parseSync } from 'oxc-parser';
import path from 'pathe';

import { REMOTE_MODULE, resolveModule } from './files.ts';
// Resolved by SvelteKit, not packages to pre-bundle.
const KIT_MODULES = /^(\$app\/|\$env\/|@sveltejs\/kit(\/|$)|<sveltekit:)/;

/**
 * The packages that server code imports, found by following the local imports of `entries`.
 * In server mode these load only when the first request needs them, and Vite would then find
 * them late and reload the page; listing them in `optimizeDeps.include` avoids that.
 */
export function findServerDependencies(root: string, entries: string[]): string[] {
  const subpathImports = readSubpathImports(root);
  const packages = new Set<string>();
  const seen = new Set<string>();
  const queue = [...entries];

  for (let file = queue.pop(); file; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);

    let code: string;
    try {
      code = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    for (const specifier of importSpecifiers(file, code)) {
      const local = specifier.startsWith('.')
        ? path.resolve(path.dirname(file), specifier)
        : specifier.startsWith('#')
          ? resolveSubpathImport(root, subpathImports, specifier)
          : null;

      if (local) {
        const resolved = resolveModule(local);
        if (resolved) queue.push(resolved);
      } else if (!specifier.startsWith('#') && !specifier.startsWith('/')) {
        packages.add(specifier);
      }
    }
  }

  return [...packages].sort();
}

/**
 * The modules that `code` imports or re-exports at runtime (not type-only), without SvelteKit's
 * own modules and Node's built-ins.
 */
export function importSpecifiers(file: string, code: string): string[] {
  const { module } = parseSync(file, code, { sourceType: 'module' });
  return [
    ...module.staticImports
      // `import 'x'` has no entries and is not type-only.
      .filter(
        (record) => record.entries.length === 0 || !record.entries.every((entry) => entry.isType)
      )
      .map((record) => record.moduleRequest.value),
    ...module.staticExports.flatMap((record) =>
      record.entries.flatMap((entry) => (entry.moduleRequest ? [entry.moduleRequest.value] : []))
    ),
  ].filter((specifier) => !KIT_MODULES.test(specifier) && !specifier.startsWith('node:'));
}

/** The remote files under `dir` (the files SvelteKit treats as remote), without `node_modules`. */
export function findRemoteFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => REMOTE_MODULE.test(`/${file}`) && !file.includes('node_modules'))
    .map((file) => path.join(dir, file));
}

function readSubpathImports(root: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).imports ?? {};
  } catch {
    return {};
  }
}

/** Node's subpath imports, for the string and `*` pattern forms. */
function resolveSubpathImport(
  root: string,
  imports: Record<string, unknown>,
  specifier: string
): string | null {
  for (const [key, target] of Object.entries(imports)) {
    const value = typeof target === 'string' ? target : (target as { default?: unknown })?.default;
    if (typeof value !== 'string') continue;

    if (key === specifier) return path.resolve(root, value);

    const star = key.indexOf('*');
    if (star === -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
      const match = specifier.slice(prefix.length, specifier.length - suffix.length);
      return path.resolve(root, value.replace('*', match));
    }
  }
  return null;
}
