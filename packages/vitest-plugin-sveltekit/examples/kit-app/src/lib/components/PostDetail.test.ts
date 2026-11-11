import { mockRemote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { error } from '@sveltejs/kit';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getPost } from '#lib/posts.remote.ts';

import PostDetail from './PostDetail.svelte';

test('renders the result of a prerender function', async () => {
  mockRemote(getPost).mockImplementation(async (id) => ({ id, title: `Post ${id}`, body: '' }));
  const screen = await render(PostDetail, { id: 7 });

  await expect.element(screen.getByRole('heading', { name: 'Post 7' })).toBeVisible();
  expect(mockRemote(getPost)).toHaveBeenCalledWith(7);
});

test('does not reuse the previous test’s prerendered result', async () => {
  mockRemote(getPost).mockImplementation((id) => error(404, `Post ${id} not found`));
  const screen = await render(PostDetail, { id: 7 });

  await expect.element(screen.getByRole('alert')).toHaveTextContent('Post 7 not found');
});
