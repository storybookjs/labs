import { describe, expect, it } from 'vite-plus/test';

import { serverFilter } from './server-option.ts';

const root = '/app';
const posts = '/app/src/lib/posts.remote.ts';
const blog = '/app/src/lib/blog/blog.remote.ts';
const admin = '/app/src/lib/admin/users.remote.ts';

describe('serverFilter', () => {
  it('is mock mode for `false` and by default', () => {
    expect(serverFilter(false, root)).toBeNull();
    expect(serverFilter(undefined, root)).toBeNull();
  });

  it('takes every remote file for `true` and for an object without `include`', () => {
    expect(serverFilter(true, root)!(admin)).toBe(true);
    expect(serverFilter({}, root)!(admin)).toBe(true);
  });

  it('matches `include` and `exclude` relative to the project root, like vite-plugin-svelte', () => {
    const filter = serverFilter({ include: 'src/lib/**', exclude: ['src/lib/admin/**'] }, root)!;
    expect([posts, blog, admin].map(filter)).toEqual([true, true, false]);
  });

  it('takes regular expressions', () => {
    const filter = serverFilter({ exclude: /admin/ }, root)!;
    expect([posts, admin].map(filter)).toEqual([true, false]);
  });

  it('matches nothing for an empty `include`, unlike `createFilter`', () => {
    expect([posts, blog].map(serverFilter({ include: [] }, root)!)).toEqual([false, false]);
  });
});
