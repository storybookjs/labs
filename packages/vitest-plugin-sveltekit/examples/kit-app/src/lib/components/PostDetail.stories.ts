import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { error } from '@sveltejs/kit';
import { expect } from 'storybook/test';

import { getPost } from '#lib/posts.remote.ts';

import preview from '../../../.storybook/preview';
import PostDetail from './PostDetail.svelte';

const meta = preview.meta({
  parameters: { demo: true },
  title: 'Remote functions/PostDetail',
  component: PostDetail,
  args: { id: 7 },
});

export const Prerendered = meta.story({
  beforeEach: () => {
    remote(getPost).mockImplementation(async (id) => ({
      id,
      title: `Post ${id}`,
      body: 'Rendered from a prerender function.',
    }));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Post 7' })).toBeVisible();
    await expect(remote(getPost)).toHaveBeenCalledWith(7);
  },
});

export const NotFound = meta.story({
  beforeEach: () => {
    remote(getPost).mockImplementation((id) => error(404, `Post ${id} not found`));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Post 7 not found');
  },
});
