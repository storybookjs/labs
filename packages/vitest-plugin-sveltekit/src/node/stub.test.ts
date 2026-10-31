import { expect, it } from 'vite-plus/test';

import { createClientStub } from './stub.ts';

const options = {
  hash: 'abc123',
  kitClientRuntime: '/kit/src/runtime/client/remote-functions/index.js',
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
    "import * as __remote from "/kit/src/runtime/client/remote-functions/index.js";
    import { registerRemoteFunction as __register } from "/pkg/dist/internal/registry.mjs";

    export const getPosts = __remote.query("abc123/getPosts");
    export const createPost = __remote.form("abc123/createPost");

    __register(getPosts, "abc123/getPosts", "query");
    __register(createPost, "abc123/createPost", "form");
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
  expect(code).toContain('const _1 = __remote0.command("abc123/delete");');
  expect(code).toContain('export { _1 as delete };');
  expect(code).toContain('export const __remote = __remote0.query("abc123/__remote");');
  expect(code).toContain('__register(_1, "abc123/delete", "command");');
});
