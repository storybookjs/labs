import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { error } from '@sveltejs/kit';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { deletePost, getPosts, getStats } from '#lib/posts.remote';

import PostList from './PostList.svelte';

const posts = [
  { id: 1, title: 'First post', body: '' },
  { id: 2, title: 'Second post', body: '' },
];

beforeEach(() => {
  remote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
});

test('renders the posts from the query', async () => {
  remote(getPosts).mockResolvedValue(posts);
  const screen = await render(PostList, { order: 'oldest' });

  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Second post' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledWith('oldest');
});

test('shows the pending snippet while the query is pending', async () => {
  remote(getPosts).mockPending();
  const screen = await render(PostList);

  await expect.element(screen.getByText('Loading posts…')).toBeVisible();
});

test('shows the failed snippet for an HTTP error', async () => {
  remote(getPosts).mockImplementation(() => error(503, 'The database is asleep'));
  const screen = await render(PostList);

  await expect.element(screen.getByRole('alert')).toMatchTextContent(/The database is asleep/);
});

test('accepts a rejected value', async () => {
  remote(getPosts).mockRejectedValue(httpError(404, 'No posts here'));
  const screen = await render(PostList);

  await expect.element(screen.getByRole('alert')).toMatchTextContent(/No posts here/);
});

test('explains how to mock a query without a mock', async () => {
  const screen = await render(PostList);

  await expect
    .element(screen.getByRole('alert'))
    .toMatchTextContent(/`getPosts` has no mock\. Call `remote\(getPosts\)\.mockResolvedValue\(\.\.\.\)`/);
});

test('calls the batch mock once per argument', async () => {
  remote(getPosts).mockResolvedValue(posts);
  const screen = await render(PostList);

  await expect.element(screen.getByTestId('stats-2')).toHaveTextContent('200 views, 2 likes');
  expect(remote(getStats)).toHaveBeenCalledTimes(2);
  expect(remote(getStats)).toHaveBeenCalledWith(1);
  expect(remote(getStats)).toHaveBeenCalledWith(2);
});

test('refreshes the query a command updates', async () => {
  let current = [...posts];
  remote(getPosts).mockImplementation(async () => current);
  remote(deletePost).mockImplementation(async (id) => {
    current = current.filter((post) => post.id !== id);
  });
  const screen = await render(PostList);

  await screen.getByRole('button', { name: 'Delete First post' }).click();

  await expect.element(screen.getByText('First post')).not.toBeInTheDocument();
  expect(remote(deletePost)).toHaveBeenCalledWith(1);
  expect(remote(getPosts)).toHaveBeenCalledTimes(2);
});
