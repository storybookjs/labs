import { goto } from 'vitest-plugin-sveltekit/vitest';
import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
import { redirect } from '@sveltejs/kit';
import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { createPost, getPosts, getStats } from '#lib/posts.remote.ts';

import Posts from './Posts.svelte';

beforeEach(() => {
  mockRemote(getStats).mockResolvedValue({ views: 1, likes: 0 });
});

test('refreshes the queries after a successful submission', async () => {
  const posts: Awaited<ReturnType<typeof getPosts>> = [{ id: 1, title: 'First post', body: '' }];
  mockRemote(getPosts).mockImplementation(async () => [...posts]);
  mockRemote(createPost).mockImplementation(async ({ title, body }) => {
    const post = { id: posts.length + 1, title, body: body ?? '' };
    posts.push(post);
    return post;
  });
  const screen = await render(Posts);

  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();
  await screen.getByLabelText('Title').fill('Second post');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect.element(screen.getByRole('link', { name: 'Second post' })).toBeVisible();
  expect(mockRemote(getPosts)).toHaveBeenCalledTimes(2);
});

test('navigates when the form handler redirects', async () => {
  mockRemote(getPosts).mockResolvedValue([]);
  mockRemote(createPost).mockImplementation(() => redirect(303, '/posts/42'));
  const screen = await render(Posts);

  await screen.getByLabelText('Title').fill('Go somewhere');
  await screen.getByRole('button', { name: 'Create' }).click();

  await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/posts/42', expect.anything()));
});
