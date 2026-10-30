import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vite-plus/test';

import { analyzeRemoteModule } from './analyze.ts';
import { createServerModule } from './server-module.ts';

/** Runs the generated registration with `$$_init_$$` replaced, and returns what it got. */
function registeredExports(code: string, bindings: Record<string, unknown>): object {
  const body = code
    .split('\n')
    .filter((line) => !line.startsWith('import '))
    .join('\n');
  let received: object | undefined;
  runInNewContext(body, {
    ...bindings,
    $$_init_$$: (exports: object) => (received = exports),
  });
  return received!;
}

describe('createServerModule', () => {
  it('gives SvelteKit every export under its exported name', () => {
    const code = createServerModule(
      '',
      [
        { name: 'getPosts', local: 'getPosts', kind: 'query' },
        { name: 'createPost', local: 'create', kind: 'form' },
      ],
      'src/lib/posts.remote.ts',
      '/kit'
    );

    expect(registeredExports(code, { getPosts: 1, create: 2 })).toEqual({
      getPosts: 1,
      createPost: 2,
    });
  });

  it('keeps an export named `__proto__` as an export', () => {
    // `export { getOdd as __proto__ }`
    const code = createServerModule(
      '',
      [{ name: '__proto__', local: 'getOdd', kind: 'query' }],
      'src/lib/odd.remote.ts',
      '/kit'
    );
    const exports = registeredExports(code, { getOdd: 'the query' });

    expect(Object.getPrototypeOf(exports)).toBeNull();
    expect(Object.getOwnPropertyNames(exports)).toEqual(['__proto__']);
    expect(Object.getOwnPropertyDescriptor(exports, '__proto__')?.value).toBe('the query');
  });

  it('lists every export shape under its exported name, bound to its local binding', () => {
    // SvelteKit passes the module namespace; the list must name every export the namespace would.
    const code = [
      "import { query, command } from '$app/server';",
      'export const a = query(() => 1), b = query(() => 2);',
      'const c = command(() => {});',
      'const d = query(() => 4);',
      'const e = query(() => 5);',
      'export { c, d as renamed, e as delete };',
      'export let f = query(() => 6);',
      'export type T = number;',
    ].join('\n');
    const exports = analyzeRemoteModule(code, 'src/lib/x.remote.ts');
    const module = createServerModule('', exports, 'src/lib/x.remote.ts', '/kit');

    expect(registeredExports(module, { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f' })).toEqual({
      a: 'a',
      b: 'b',
      c: 'c',
      renamed: 'd',
      delete: 'e',
      f: 'f',
    });
  });
});
