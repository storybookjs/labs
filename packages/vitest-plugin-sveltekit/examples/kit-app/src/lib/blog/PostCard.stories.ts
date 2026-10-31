import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { getReadingStats } from './blog.remote.ts';
import { longPost, postSummaries, published } from './fixtures.ts';
import PostCard from './PostCard.svelte';
import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/PostCard',
  component: PostCard,
  parameters: { layout: 'padded' },
  args: { post: published[0]! },
});

// Not on `meta`: a reset spy counts as mocked, so the server mode story must start unmocked.
const mocked = { beforeEach: mockQuietFeed };

export const Default = meta.story({
  ...mocked,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: published[0]!.title })).toHaveAttribute(
      'href',
      `/posts/${published[0]!.id}`
    );
    await expect(await canvas.findByText(/views/)).toBeVisible();
  },
});

export const Draft = meta.story({
  ...mocked,
  args: { post: postSummaries.find((post) => !post.published)! },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Draft')).toBeVisible();
  },
});

export const ActiveTag = meta.story({ ...mocked, args: { activeTag: published[0]!.tags[0] } });

export const LongContent = meta.story({
  ...mocked,
  args: { post: { ...longPost, excerpt: longPost.excerpt.repeat(2) } },
});

export const StatsLoading = meta.story({
  beforeEach: () => {
    remote(getReadingStats).mockPending();
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    // The real `getReadingStats` reads the seed: 266 views, 19 likes.
    await expect(await canvas.findByText('266 views')).toBeVisible();
  },
});
