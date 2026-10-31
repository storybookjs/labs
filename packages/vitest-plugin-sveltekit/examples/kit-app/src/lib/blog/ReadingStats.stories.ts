import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { getReadingStats } from './blog.remote.ts';
import ReadingStats from './ReadingStats.svelte';
import { seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/ReadingStats',
  component: ReadingStats,
  parameters: { layout: 'padded' },
  args: { id: 2 },
});

export const Data = meta.story({
  beforeEach: () => {
    remote(getReadingStats).mockResolvedValue({ views: 12_800, likes: 96 });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('13K views')).toBeVisible();
    await expect(remote(getReadingStats)).toHaveBeenCalledWith(2);
  },
});

export const Loading = meta.story({
  beforeEach: () => {
    remote(getReadingStats).mockPending();
  },
});

export const Failed = meta.story({
  name: 'Error',
  beforeEach: () => {
    remote(getReadingStats).mockRejectedValue(httpError(503, 'Stats are resting'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Stats unavailable')).toBeVisible();
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    // The second seed post: 1280 views, 96 likes.
    await expect(await canvas.findByText('1.3K views')).toBeVisible();
  },
});
