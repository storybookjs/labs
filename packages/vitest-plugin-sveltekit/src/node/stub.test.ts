import { expect, it } from 'vite-plus/test';

import { createClientStub } from './stub.ts';
import { literal } from './code.ts';

const options = {
  hash: 'abc123',
  registry: '/pkg/dist/internal/registry.mjs',
};

it('emits SvelteKit’s stub and registers each export', () => {
  expect(
    createClientStub(
      [
        { name: 'getPosts', local: 'getPosts', kind: 'query' },
        { name: 'createPost', local: 'createPost', kind: 'form' },
      ],
      options
    )
  ).toMatchInlineSnapshot(`
    "import * as __remote from "@sveltejs\\u002Fkit\\u002Finternal\\u002Fremote-client";
    import { registerRemoteFunction as __register } from "\\u002Fpkg\\u002Fdist\\u002Finternal\\u002Fregistry.mjs";

    export const getPosts = __remote.query("abc123\\u002FgetPosts");
    export const createPost = __remote.form("abc123\\u002FcreatePost");

    __register(getPosts, "abc123\\u002FgetPosts", "query");
    __register(createPost, "abc123\\u002FcreatePost", "form");
    "
  `);
});

it('aliases reserved words and avoids name clashes, like SvelteKit', () => {
  const code = createClientStub(
    [
      { name: 'delete', local: 'delete', kind: 'command' },
      { name: '__remote', local: '__remote', kind: 'query' },
      { name: '_0', local: '_0', kind: 'query' },
    ],
    options
  );

  expect(code).toContain('import * as __remote0 from');
  expect(code).toContain(`const _1 = __remote0.command(${literal('abc123/delete')});`);
  expect(code).toContain('export { _1 as delete };');
  expect(code).toContain(`export const __remote = __remote0.query(${literal('abc123/__remote')});`);
  expect(code).toContain(`__register(_1, ${literal('abc123/delete')}, "command");`);
});
