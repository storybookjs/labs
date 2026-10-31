import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { listPosts, watchNewPosts } from './blog.remote.ts';
import { postPage, published } from './fixtures.ts';
import PostFeed from './PostFeed.svelte';
import { defaultListParams } from './posts.ts';
import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/PostFeed',
  component: PostFeed,
  parameters: { layout: 'padded' },
  args: { params: defaultListParams, onfilter: fn() },
});

export const Data = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage());
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('10 posts')).toBeVisible();
    await expect(canvas.getAllByRole('article')).toHaveLength(6);
    await expect(canvas.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
  },
});

export const Loading = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockPending();
  },
});

export const Empty = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue({ ...postPage([]), tags: [] });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No posts yet')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Write a post' })).toHaveAttribute(
      'href',
      '/posts/new'
    );
  },
});

export const NoMatches = meta.story({
  args: { params: { ...defaultListParams, q: 'nothing like this' } },
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage([]));
  },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByText('No posts match')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));
    await expect(args.onfilter).toHaveBeenCalledWith(defaultListParams);
  },
});

export const SecondPage = meta.story({
  args: { params: { ...defaultListParams, page: 2 } },
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage(published, 2));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { current: 'page' })).toHaveTextContent('2');
  },
});

export const NewPostsWaiting = meta.story({
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage());
    remote(watchNewPosts).mockStream(2);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/2 new posts since/)).toBeVisible();
  },
});

/** "Show" on page 2: back to page 1 with the same filters, where the new posts are. */
export const ShowNewPostsFromPageTwo = meta.story({
  args: { params: { ...defaultListParams, tag: 'design', page: 2 } },
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockImplementation(async (params) => postPage(published, params.page));
    remote(watchNewPosts).mockStream(1);
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Show' }));
    await waitFor(() => expect(args.onfilter).toHaveBeenCalledWith({ page: 1 }));
    await expect(remote(listPosts)).toHaveBeenCalledWith({ ...args.params, page: 1 });
  },
});

export const Failed = meta.story({
  name: 'Error',
  beforeEach: () => {
    mockQuietFeed();
    remote(listPosts).mockRejectedValue(httpError(503, 'The database is asleep'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The posts did not load')).toBeVisible();
    await expect(canvas.getByText('The database is asleep')).toBeVisible();
  },
});

/** The real `listPosts`: `%` matches only itself, so nothing matches. */
export const WildcardSearch = meta.story({
  name: 'Wildcard search (server mode)',
  args: { params: { ...defaultListParams, q: '%' } },
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No posts match', {}, { timeout: 5000 })).toBeVisible();
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('10 posts', {}, { timeout: 5000 })).toBeVisible();
    await expect(canvas.getAllByRole('article')[0]).toHaveTextContent(
      'Notes from a quiet refactor'
    );
  },
});
