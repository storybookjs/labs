import {
  httpError,
  remote,
  type RemoteStream,
} from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect } from 'storybook/test';

import { getPostCount } from '#lib/posts.remote.ts';

import preview from '../../../.storybook/preview';
import PostCount from './PostCount.svelte';

const meta = preview.meta({
  parameters: { demo: true },
  title: 'Remote functions/PostCount',
  component: PostCount,
});

export const LiveGenerator = meta.story({
  beforeEach: () => {
    remote(getPostCount).mockImplementation(async function* () {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield 2;
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1')).toBeVisible();
    await expect(await canvas.findByText('2')).toBeVisible();
    await expect(await canvas.findByText('done')).toBeVisible();
  },
});

export const LiveArray = meta.story({
  beforeEach: () => {
    remote(getPostCount).mockReturnValue([3, 4]);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('4')).toBeVisible();
    await expect(await canvas.findByText('done')).toBeVisible();
  },
});

let feed: RemoteStream<number>;

export const LiveStream = meta.story({
  beforeEach: () => {
    feed = remote(getPostCount).mockStream(5);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('5')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    feed.emit(6);
    await expect(await canvas.findByText('6')).toBeVisible();

    feed.error(httpError(503, 'Feed down'));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Feed down');
  },
});

export const LiveStreamOpen = meta.story({
  beforeEach: () => {
    remote(getPostCount).mockStream(7);
  },
  // Ends with the stream still open.
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('7')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();
  },
});
