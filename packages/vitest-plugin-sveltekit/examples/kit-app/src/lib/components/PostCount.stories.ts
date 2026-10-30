import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect } from 'storybook/test';

import { getPostCount } from '#lib/posts.remote';

import preview from '../../../.storybook/preview';
import PostCount from './PostCount.svelte';

const meta = preview.meta({ title: 'PostCount', component: PostCount });

export const LiveGenerator = meta.story({
  beforeEach: () => {
    remote(getPostCount).mockImplementation(async function* () {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield 2;
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2')).toBeVisible();
  },
});

export const LiveStream = meta.story({
  play: async ({ canvas }) => {
    const feed = remote(getPostCount).mockStream(5);
    await expect(await canvas.findByText('5')).toBeVisible();
    feed.emit(6);
    await expect(await canvas.findByText('6')).toBeVisible();
  },
});
