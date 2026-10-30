import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect } from 'storybook/test';

import { getPosts, getStats } from '#lib/posts.remote';

import preview from '../../../.storybook/preview';
import PostList from './PostList.svelte';

const meta = preview.meta({
  title: 'PostList',
  component: PostList,
  beforeEach: () => {
    remote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
  },
});

export const Data = meta.story({
  beforeEach: () => {
    remote(getPosts).mockResolvedValue([
      { id: 1, title: 'First post', body: '' },
      { id: 2, title: 'Second post', body: '' },
    ]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await expect(remote(getPosts)).toHaveBeenCalledWith('newest');
  },
});

export const Failed = meta.story({
  beforeEach: () => {
    remote(getPosts).mockRejectedValue(httpError(404, 'No posts here'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('No posts here');
  },
});
