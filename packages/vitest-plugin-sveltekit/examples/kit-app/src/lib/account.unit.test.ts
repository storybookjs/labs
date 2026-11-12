// Auth through `locals` and cookies, in Vitest's Node mode. `hooks.server` does not run here (no
// request goes through `handle`), so a test sets `locals` itself.
import { mockRequestEvent } from 'vitest-plugin-sveltekit/server.mock';
import { beforeEach, expect, test, vi } from 'vitest';

import { clearPosts, signIn } from '#lib/account.remote.ts';
import { deletePost, getPost, getPosts } from '#lib/posts.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

beforeEach(async () => {
  await resetDb([{ title: 'One' }, { title: 'Two' }]);
});

test('a command reads `locals` from the mock request event', async () => {
  await expect(deletePost(1)).rejects.toMatchObject({
    status: 403,
    body: { message: 'Sign in to delete posts' },
  });

  mockRequestEvent({ locals: { user: { name: 'svelty' } } });
  await deletePost(1);
  expect(await getPosts('newest')).toEqual([expect.objectContaining({ title: 'Two' })]);
});

test('a cookie that a command sets shows in mockRequestEvent().cookies', async () => {
  await expect(signIn({ name: 'svelty', password: 'wrong' })).rejects.toMatchObject({
    status: 401,
  });
  expect(mockRequestEvent().cookies.get('session')).toBeUndefined();

  await signIn({ name: 'svelty', password: 'svelty-secret' });
  expect(mockRequestEvent().cookies.get('session')).toBe('svelty');
});

test('the cookie jar starts empty in the next test', () => {
  expect(mockRequestEvent().cookies.getAll()).toEqual([]);
});

test('a command refreshes a query, through a helper in another file, in its own request', async () => {
  mockRequestEvent({ locals: { user: { name: 'svelty' } } });
  const select = vi.spyOn(db, 'select');
  await clearPosts('svelty-secret');

  expect(await db.$count(posts)).toBe(0);
  // `refreshPosts()` ran the real `getPosts` handler at the end of the command's request.
  expect(select).toHaveBeenCalledOnce();
});

test('prerender, with `dynamic: true`, runs like a query', async () => {
  expect(await getPost(2)).toEqual({ id: 2, title: 'Two', body: '' });
  await expect(getPost(9)).rejects.toMatchObject({ status: 404 });
});
