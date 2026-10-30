import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getPosts, getStats } from '#lib/posts.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import PostList from '../PostList.svelte';

beforeEach(async () => {
  await resetDb([
    { title: 'From the database', body: '', views: 7, likes: 3 },
    { title: 'Also from the database', body: '', views: 1, likes: 0 },
  ]);
});

test('runs the real query and batch on the mocked database', async () => {
  const screen = await render(PostList);

  await expect.element(screen.getByRole('link', { name: 'From the database' })).toBeVisible();
  await expect.element(screen.getByTestId('stats-1')).toHaveTextContent('7 views, 3 likes');
});

test('mixes a mocked function with real ones', async () => {
  remote(getStats).mockResolvedValue({ views: 99, likes: 9 });
  const screen = await render(PostList);

  await expect.element(screen.getByRole('link', { name: 'From the database' })).toBeVisible();
  await expect.element(screen.getByTestId('stats-1')).toHaveTextContent('99 views, 9 likes');
});

test('a once mock serves one call, then the real handler runs again', async () => {
  remote(getPosts).mockResolvedValueOnce([{ id: 99, title: 'From the mock', body: '' }]);
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'From the mock' })).toBeVisible();

  await getPosts('newest').refresh();

  await expect.element(screen.getByRole('link', { name: 'From the database' })).toBeVisible();
  await expect.element(screen.getByText('From the mock')).not.toBeInTheDocument();
  // The spy only sees the call it answered.
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
});

test('runs the real command with the session cookie from requestEvent', async () => {
  requestEvent.cookies.set('session', 'ada');
  const screen = await render(PostList);

  await screen.getByRole('button', { name: 'Delete From the database' }).click();

  await expect.element(screen.getByText('From the database', { exact: true })).not.toBeInTheDocument();
  expect(await db.$count(posts)).toBe(1);
});

test('reads locals from requestEvent', async () => {
  requestEvent.locals.user = null;
  const screen = await render(PostList);

  await screen.getByRole('button', { name: 'Delete From the database' }).click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Could not delete: Sign in to delete posts');
  expect(await db.$count(posts)).toBe(2);
});
