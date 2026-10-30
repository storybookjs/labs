import { describe, expect, it } from 'vite-plus/test';

import { analyzeRemoteModule, RemoteAnalysisError } from './analyze.ts';

const analyze = (code: string, file = 'src/lib/data.remote.ts') => analyzeRemoteModule(code, file);

describe('analyzeRemoteModule', () => {
  it('reads the kind of each exported remote function', () => {
    const code = `
      import { command, form, prerender, query } from '$app/server';
      import * as v from 'valibot';

      export const getPosts = query(v.string(), async (search) => []);
      export const getStats = query.batch(v.number(), async (ids) => (id) => id);
      export const getCount = query.live(async function* () { yield 1; });
      export const createPost = form(v.object({ title: v.string() }), async () => {});
      export const deletePost = command(v.number(), async () => {});
      export const getPost = prerender(v.number(), async () => ({}), { dynamic: true });
    `;

    expect(analyze(code)).toEqual([
      { name: 'getPosts', kind: 'query' },
      { name: 'getStats', kind: 'query_batch' },
      { name: 'getCount', kind: 'query_live' },
      { name: 'createPost', kind: 'form' },
      { name: 'deletePost', kind: 'command' },
      { name: 'getPost', kind: 'prerender' },
    ]);
  });

  it('follows renamed and namespace imports', () => {
    const code = `
      import { query as q, form as f } from '$app/server';
      import * as server from '$app/server';

      export const a = q(() => 1);
      export const b = f(() => 1);
      export const c = server.command(() => 1);
      export const d = server.query.live(async function* () {});
    `;

    expect(analyze(code)).toEqual([
      { name: 'a', kind: 'query' },
      { name: 'b', kind: 'form' },
      { name: 'c', kind: 'command' },
      { name: 'd', kind: 'query_live' },
    ]);
  });

  it('reads `export { x }` and `export { x as y }`', () => {
    const code = `
      import { query } from '$app/server';
      const getPosts = query(() => []);
      const internal = query(() => 1);
      export { getPosts, internal as getInternal };
    `;

    expect(analyze(code)).toEqual([
      { name: 'getPosts', kind: 'query' },
      { name: 'getInternal', kind: 'query' },
    ]);
  });

  it('strips TypeScript wrappers and ignores type exports', () => {
    const code = `
      import { query } from '$app/server';
      import type { RemoteQueryFunction } from '$app/server';
      export type Post = { id: number };
      export interface Stats { views: number }
      export const a = query(() => 1) satisfies RemoteQueryFunction<void, number>;
      export const b = (query(() => 1)) as RemoteQueryFunction<void, number>;
      export const c = query<number>(() => 1)!;
    `;

    expect(analyze(code)).toEqual([
      { name: 'a', kind: 'query' },
      { name: 'b', kind: 'query' },
      { name: 'c', kind: 'query' },
    ]);
  });

  it('handles several declarators and a file without exports', () => {
    expect(
      analyze(`import { query, command } from '$app/server';
        export const a = query(() => 1), b = command(() => 1);`)
    ).toEqual([
      { name: 'a', kind: 'query' },
      { name: 'b', kind: 'command' },
    ]);
    expect(analyze(`import { query } from '$app/server'; const a = query(() => 1);`)).toEqual([]);
  });

  it('parses JavaScript files', () => {
    expect(
      analyze(
        `import { query } from '$app/server';\nexport const a = query(() => 1);`,
        'x.remote.js'
      )
    ).toEqual([{ name: 'a', kind: 'query' }]);
  });

  describe('errors name the file', () => {
    it.each([
      [
        'a wrapper',
        `import { query } from '$app/server';
         const guarded = (fn) => query(fn);
         export const a = guarded(() => 1);`,
        /data\.remote\.ts: cannot tell which kind of remote function `a` is/,
      ],
      [
        'a factory that is not from $app/server',
        `import { query } from './my-query';\nexport const a = query(() => 1);`,
        /cannot tell which kind of remote function `a` is/,
      ],
      ['a default export', `export default 1;`, /cannot have a default export/],
      [
        'a default export through specifiers',
        `import { query } from '$app/server';\nconst a = query(() => 1);\nexport { a as default };`,
        /cannot have a default export/,
      ],
      ['a function export', `export function helper() {}`, /`helper` is not a remote function/],
      ['`export *`', `export * from './other.remote.ts';`, /`export \* from` is not supported/],
      ['a re-export', `export { a } from './other.remote.ts';`, /`export \{ \.\.\. \} from`/],
      [
        'an export without declaration',
        `import { a } from './x';\nexport { a };`,
        /cannot find the declaration of `a`/,
      ],
      ['a syntax error', `export const = ;`, /cannot parse the file/],
    ])('%s', (_name, code, message) => {
      expect(() => analyze(code)).toThrow(message);
      expect(() => analyze(code)).toThrow(
        /^\[vitest-plugin-sveltekit\] src\/lib\/data\.remote\.ts:/
      );
    });
  });
});

// More export shapes, each in a `.ts` and a `.js` file. SvelteKit's plugin evaluates the module and
// reads `fn.__.type`; the analysis must give the same kind or throw an error that names the file,
// never a wrong kind.
const imports = `import { query, form, command, prerender } from '$app/server';\n`;
const kinds: Array<[name: string, code: string, expected: Record<string, string>]> = [
  [
    'export before the declaration',
    `${imports}export { a };\nconst a = form(() => 1);`,
    { a: 'form' },
  ],
  ['let', `${imports}export let a = query(() => 1);`, { a: 'query' }],
  [
    'renamed import with .batch',
    `import { query as q } from '$app/server';\nexport const a = q.batch(() => 1);`,
    { a: 'query_batch' },
  ],
  [
    'declare const next to a remote function',
    `${imports}export declare const t: number;\nexport const a = query(() => 1);`,
    { a: 'query' },
  ],
  [
    'factories from two import declarations',
    `import { query } from '$app/server';\nimport { form } from '$app/server';\nexport const a = query(() => 1);\nexport const b = form(() => 1);`,
    { a: 'query', b: 'form' },
  ],
];
// SvelteKit accepts the first ones by evaluation; the analysis refuses them instead of guessing.
// SvelteKit's `init_remote_functions` refuses the rest too.
const refused: Array<[name: string, code: string]> = [
  ['alias of a remote function', `${imports}const a = query(() => 1);\nexport const b = a;`],
  ['IIFE', `${imports}export const a = (() => query(() => 1))();`],
  ['await', `${imports}export const a = await query(() => 1);`],
  ['conditional', `${imports}export const a = Math.random() ? query(() => 1) : form(() => 1);`],
  ['local function named query', `const query = (f) => f;\nexport const a = query(() => 1);`],
  ['destructured export', `${imports}export const { a } = { a: query(() => 1) };`],
  ['plain value', `${imports}export const n = 1;\nexport const a = query(() => 1);`],
  ['class', `${imports}export class C {}\nexport const a = query(() => 1);`],
  ['enum', `${imports}export enum E { A }\nexport const a = query(() => 1);`],
  [
    'schema next to the functions',
    `${imports}import * as v from 'valibot';\nexport const schema = v.string();\nexport const a = query(schema, () => 1);`,
  ],
];
const files = ['src/lib/x.remote.ts', 'src/lib/x.remote.js'];
const tsOnly = /declare const|enum E/;
const forFile = (code: string) =>
  files.filter((file) => file.endsWith('.ts') || !tsOnly.test(code));

describe('export shapes in .ts and .js files', () => {
  for (const [name, code, expected] of kinds) {
    for (const file of forFile(code)) {
      it(`${name} (${file})`, () => {
        const result = analyzeRemoteModule(code, file);
        expect(Object.fromEntries(result.map((entry) => [entry.name, entry.kind]))).toEqual(
          expected
        );
      });
    }
  }

  for (const [name, code] of refused) {
    for (const file of forFile(code)) {
      it(`refuses: ${name} (${file})`, () => {
        expect(() => analyzeRemoteModule(code, file)).toThrow(RemoteAnalysisError);
        expect(() => analyzeRemoteModule(code, file)).toThrow(file);
      });
    }
  }

  it('a JSDoc cast in parentheses (.js)', () => {
    const code = `${imports}/** @type {import('$app/server').RemoteQueryFunction<void, number>} */\nexport const a = /** @type {any} */ (query(() => 1));`;
    const result = analyzeRemoteModule(code, 'src/lib/x.remote.js');
    expect(result.map((entry) => [entry.name, entry.kind])).toEqual([['a', 'query']]);
  });
});
