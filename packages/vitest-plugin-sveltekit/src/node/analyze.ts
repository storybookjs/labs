import { parseSync } from 'oxc-parser';

/** The remote function kinds, named like SvelteKit's client runtime exports. */
export type RemoteKind = 'query' | 'query_batch' | 'query_live' | 'form' | 'command' | 'prerender';

export interface RemoteExport {
  /** The exported name. */
  name: string;
  /** The name of the binding in the file (differs for `export { local as name }`). */
  local: string;
  kind: RemoteKind;
}

const SERVER_MODULE = '$app/server';
const FACTORIES = new Set(['query', 'form', 'command', 'prerender']);
const QUERY_VARIANTS: Record<string, RemoteKind> = { batch: 'query_batch', live: 'query_live' };
const EXPECTED =
  '`query(...)`, `query.batch(...)`, `query.live(...)`, `form(...)`, `command(...)` or `prerender(...)` from `$app/server`';

type Node = { type: string; [key: string]: any };

export class RemoteAnalysisError extends Error {
  constructor(file: string, message: string) {
    super(`[vitest-plugin-sveltekit] ${file}: ${message}`);
    this.name = 'RemoteAnalysisError';
  }
}

/**
 * Reads the exports of a `.remote.ts` file and the kind of remote function behind each one,
 * without running the file. Only direct calls of the `$app/server` factories are understood.
 */
export function analyzeRemoteModule(code: string, file: string): RemoteExport[] {
  const { program, errors } = parseSync(file, code, { lang: langFor(file), sourceType: 'module' });
  const fatal = errors.find((error) => error.severity === 'Error');
  if (fatal) throw new RemoteAnalysisError(file, `cannot parse the file: ${fatal.message}`);

  // Local name -> imported name, for `import { query as q } from '$app/server'`.
  const factories = new Map<string, string>();
  // Local names of `import * as server from '$app/server'`.
  const namespaces = new Set<string>();
  // Top-level `const x = ...` initialisers, for `export { x }`.
  const declarations = new Map<string, Node | null>();

  for (const node of program.body as Node[]) {
    if (node.type === 'ImportDeclaration' && node.source.value === SERVER_MODULE) {
      if (node.importKind === 'type') continue;
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          namespaces.add(specifier.local.name);
        } else if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
          factories.set(specifier.local.name, moduleExportName(specifier.imported));
        }
      }
    }

    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type === 'Identifier') {
          declarations.set(declarator.id.name, declarator.init ?? null);
        }
      }
    }
  }

  const kindOf = (name: string, init: Node | null | undefined): RemoteKind => {
    const kind = init ? callKind(unwrap(init), factories, namespaces) : undefined;
    if (kind) return kind;
    throw new RemoteAnalysisError(
      file,
      `cannot tell which kind of remote function \`${name}\` is. Remote functions must be declared as ${EXPECTED}, for example \`export const ${name} = query(...)\`. Wrappers around these functions are not supported.`
    );
  };

  const result: RemoteExport[] = [];

  for (const node of program.body as Node[]) {
    switch (node.type) {
      case 'ExportDefaultDeclaration':
        throw new RemoteAnalysisError(
          file,
          'remote files cannot have a default export. Export each remote function by name.'
        );

      case 'ExportAllDeclaration':
        if (node.exportKind === 'type') break;
        throw new RemoteAnalysisError(
          file,
          '`export * from` is not supported in remote files. Declare each remote function in the file.'
        );

      case 'ExportNamedDeclaration': {
        if (node.exportKind === 'type') break;
        const declaration = node.declaration;

        if (declaration) {
          if (declaration.type === 'VariableDeclaration') {
            for (const declarator of declaration.declarations) {
              if (declarator.id.type !== 'Identifier') {
                throw new RemoteAnalysisError(
                  file,
                  'destructured exports are not supported in remote files.'
                );
              }
              const name = declarator.id.name;
              result.push({ name, local: name, kind: kindOf(name, declarator.init) });
            }
          } else if (!isTypeOnly(declaration)) {
            const name = declaration.id?.name ?? 'unknown';
            throw new RemoteAnalysisError(
              file,
              `\`${name}\` is not a remote function. Remote files can only export ${EXPECTED}.`
            );
          }
          break;
        }

        if (node.source) {
          throw new RemoteAnalysisError(
            file,
            '`export { ... } from` is not supported in remote files. Declare each remote function in the file.'
          );
        }

        for (const specifier of node.specifiers) {
          if (specifier.exportKind === 'type') continue;
          const local = moduleExportName(specifier.local);
          const exported = moduleExportName(specifier.exported);
          if (exported === 'default') {
            throw new RemoteAnalysisError(
              file,
              'remote files cannot have a default export. Export each remote function by name.'
            );
          }
          if (!declarations.has(local)) {
            throw new RemoteAnalysisError(
              file,
              `cannot find the declaration of \`${local}\`. Exported remote functions must be declared with \`const\` in the same file.`
            );
          }
          result.push({
            name: exported,
            local,
            kind: kindOf(exported, declarations.get(local)),
          });
        }
        break;
      }
    }
  }

  return result;
}

function callKind(
  node: Node,
  factories: Map<string, string>,
  namespaces: Set<string>
): RemoteKind | undefined {
  if (node.type !== 'CallExpression') return undefined;
  const callee = unwrap(node.callee);

  // query(...), form(...), q(...) where `q` is `query` imported under another name
  if (callee.type === 'Identifier') {
    const imported = factories.get(callee.name);
    return imported && FACTORIES.has(imported) ? (imported as RemoteKind) : undefined;
  }

  if (callee.type !== 'MemberExpression' || callee.computed) return undefined;
  const object = unwrap(callee.object);
  const property: string = callee.property.name;

  // server.query(...), where `server` is `import * as server from '$app/server'`
  if (object.type === 'Identifier' && namespaces.has(object.name)) {
    return FACTORIES.has(property) ? (property as RemoteKind) : undefined;
  }

  // query.batch(...), query.live(...), server.query.live(...)
  const variant = QUERY_VARIANTS[property];
  if (!variant) return undefined;

  if (object.type === 'Identifier') {
    return factories.get(object.name) === 'query' ? variant : undefined;
  }

  if (object.type === 'MemberExpression' && !object.computed) {
    const namespace = unwrap(object.object);
    if (
      namespace.type === 'Identifier' &&
      namespaces.has(namespace.name) &&
      object.property.name === 'query'
    ) {
      return variant;
    }
  }

  return undefined;
}

/** Strips TypeScript-only wrappers and parentheses: `query(...) satisfies X`, `(form(...))`. */
function unwrap(node: Node): Node {
  while (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSNonNullExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSInstantiationExpression'
  ) {
    node = node.expression;
  }
  return node;
}

function moduleExportName(node: Node): string {
  return node.type === 'Literal' ? String(node.value) : node.name;
}

function isTypeOnly(node: Node): boolean {
  return (
    node.type === 'TSTypeAliasDeclaration' ||
    node.type === 'TSInterfaceDeclaration' ||
    node.declare === true
  );
}

function langFor(file: string): 'ts' | 'js' | 'tsx' | 'jsx' {
  if (/\.[cm]?tsx$/.test(file)) return 'tsx';
  if (/\.[cm]?ts$/.test(file)) return 'ts';
  if (/\.[cm]?jsx$/.test(file)) return 'jsx';
  return 'js';
}
