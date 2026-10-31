import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect, waitFor } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { countView, readPost } from './blog.remote.ts';
import { longPost, postDetails } from './fixtures.ts';
import PostView from './PostView.svelte';
import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

const typography = postDetails.find((post) => post.title === 'Typography for long reads')!;

const meta = preview.meta({
  title: 'Posts/PostView',
  component: PostView,
  parameters: { layout: 'padded' },
  args: { id: typography.id },
});

export const Data = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(typography);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1 })).toHaveTextContent(
      typography.title
    );
    await expect(canvas.getByRole('table')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/posts/${typography.id}/edit`
    );
    // The page counts the visit.
    await waitFor(() => expect(remote(countView)).toHaveBeenCalledWith(typography.id));
  },
});

export const Draft = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(postDetails.find((post) => !post.published)!);
  },
});

export const LongContent = meta.story({
  args: { id: longPost.id },
  beforeEach: () => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(longPost);
  },
});

/** A long code line wraps; the page does not scroll sideways on a phone. */
export const MobileWithCode = meta.story({
  globals: { viewport: { value: 'mobile1' } },
  args: { id: 2 },
  beforeEach: () => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(
      postDetails.find((post) => post.title === 'Remote functions, one month in')!
    );
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('pre')).not.toBeNull());
    const block = canvasElement.querySelector('pre')!;
    await expect(block.scrollWidth).toBeLessThanOrEqual(block.clientWidth);
  },
});

export const Loading = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(readPost).mockPending();
  },
});

export const NotFound = meta.story({
  args: { id: 404 },
  beforeEach: () => {
    remote(readPost).mockRejectedValue(
      httpError(404, 'This post does not exist, or it was deleted.')
    );
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Post not found')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Back to all posts' })).toHaveAttribute(
      'href',
      '/'
    );
  },
});

export const Failed = meta.story({
  name: 'Error',
  beforeEach: () => {
    remote(readPost).mockRejectedValue(httpError(500, 'The database is asleep'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The post did not load')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 1 }, { timeout: 5000 })
    ).toHaveTextContent(typography.title);
    await expect(await canvas.findByText(/views/)).toBeVisible();
  },
});
