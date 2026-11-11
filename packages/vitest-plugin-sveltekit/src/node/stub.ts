import { literal } from './code.ts';
import type { RemoteExport } from './analyze.ts';

// Copied from `packages/kit/src/core/env.js`, so export names that are reserved words get the
// same aliases as in SvelteKit's own stub.
const RESERVED = new Set([
  'do',
  'if',
  'in',
  'for',
  'let',
  'new',
  'try',
  'var',
  'case',
  'else',
  'enum',
  'eval',
  'null',
  'this',
  'true',
  'void',
  'with',
  'await',
  'break',
  'catch',
  'class',
  'const',
  'false',
  'super',
  'throw',
  'while',
  'yield',
  'delete',
  'export',
  'import',
  'public',
  'return',
  'static',
  'switch',
  'typeof',
  'default',
  'extends',
  'finally',
  'package',
  'private',
  'continue',
  'debugger',
  'function',
  'arguments',
  'interface',
  'protected',
  'implements',
  'instanceof',
]);

/** SvelteKit's client remote functions, the module its own stubs import (sveltejs/kit PR A). */
const KIT_REMOTE_CLIENT = '@sveltejs/kit/internal/remote-client';

export interface StubOptions {
  /** The hash of the remote file, as SvelteKit computes it. */
  hash: string;
  /** Path of this package's registry module. */
  registry: string;
  /** Server mode: the id of the module's server copy, loaded when a request needs it. */
  serverModule?: string;
  /** Server mode, for a file the `server` filter leaves out: its path, for the error hint. */
  excludedFile?: string;
}

/**
 * Builds the client module for a remote file: SvelteKit's own stub (the code
 * `vite-plugin-sveltekit-remote` emits for the browser), plus one line that tells the registry
 * which id and kind each export has.
 */
export function createClientStub(exports: RemoteExport[], options: StubOptions): string {
  const names = new Set(exports.map((entry) => entry.name));
  const namespace = freeName('__remote', names);
  const registry = freeName('__register', names);
  const registerModule = freeName('__registerModule', names);
  const registerExcluded = freeName('__registerExcluded', names);

  const aliases = new Map<string, string>();
  let aliasIndex = 0;
  for (const name of names) {
    if (!RESERVED.has(name)) continue;
    let alias = `_${aliasIndex++}`;
    while (names.has(alias)) alias = `_${aliasIndex++}`;
    aliases.set(name, alias);
  }

  const declarations: string[] = [];
  const reexports: string[] = [];
  const registrations: string[] = [];

  for (const { name, kind } of exports) {
    const id = `${options.hash}/${name}`;
    const local = aliases.get(name) ?? name;
    const expression = `${namespace}.${kind}(${literal(id)})`;

    if (aliases.has(name)) {
      declarations.push(`const ${local} = ${expression};`);
      reexports.push(`${local} as ${name}`);
    } else {
      declarations.push(`export const ${name} = ${expression};`);
    }

    registrations.push(`${registry}(${local}, ${literal(id)}, ${literal(kind)});`);
  }

  const registryImports = [`registerRemoteFunction as ${registry}`];
  if (options.serverModule) registryImports.push(`registerRemoteModule as ${registerModule}`);
  if (options.excludedFile) registryImports.push(`registerExcludedModule as ${registerExcluded}`);

  let code = `import * as ${namespace} from ${literal(KIT_REMOTE_CLIENT)};\n`;
  code += `import { ${registryImports.join(', ')} } from ${literal(options.registry)};\n\n`;
  code += declarations.join('\n');
  if (reexports.length > 0) code += `\nexport { ${reexports.join(', ')} };`;
  code += `\n\n${registrations.join('\n')}\n`;

  if (options.serverModule) {
    code += `${registerModule}(${literal(options.hash)}, () => import(${literal(options.serverModule)}));\n`;
  }
  if (options.excludedFile) {
    code += `${registerExcluded}(${literal(options.hash)}, ${literal(options.excludedFile)});\n`;
  }

  return code;
}

function freeName(base: string, taken: Set<string>): string {
  let name = base;
  let index = 0;
  while (taken.has(name)) name = `${base}${index++}`;
  return name;
}
