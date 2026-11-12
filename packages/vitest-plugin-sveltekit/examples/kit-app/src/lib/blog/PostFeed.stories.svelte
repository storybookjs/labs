<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, fn, userEvent, waitFor } from 'storybook/test';

  import { listPosts, watchNewPosts } from './blog.remote.ts';
  import { postPage, published } from './fixtures.ts';
  import PostFeed from './PostFeed.svelte';
  import { defaultListParams } from './posts.ts';
  import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

  const { Story } = defineMeta({
    title: 'Posts/PostFeed',
    component: PostFeed,
    parameters: { layout: 'padded' },
    args: { params: defaultListParams, onfilter: fn() },
  });
</script>

<Story
  name="Data"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockResolvedValue(postPage());
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('10 posts')).toBeVisible();
    await expect(canvas.getAllByRole('article')).toHaveLength(6);
    await expect(canvas.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
  }}
/>

<Story
  name="Loading"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockPending();
  }}
/>

<Story
  name="Empty"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockResolvedValue({ ...postPage([]), tags: [] });
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('No posts yet')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Write a post' })).toHaveAttribute(
      'href',
      '/posts/new'
    );
  }}
/>

<Story
  name="No matches"
  args={{ params: { ...defaultListParams, q: 'nothing like this' } }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockResolvedValue(postPage([]));
  }}
  play={async ({ canvas, args }) => {
    await expect(await canvas.findByText('No posts match')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }));
    await expect(args.onfilter).toHaveBeenCalledWith(defaultListParams);
  }}
/>

<Story
  name="Second page"
  args={{ params: { ...defaultListParams, page: 2 } }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockResolvedValue(postPage(published, 2));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { current: 'page' })).toHaveTextContent('2');
  }}
/>

<Story
  name="New posts waiting"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockResolvedValue(postPage());
    mockRemote(watchNewPosts).mockStream(2);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText(/2 new posts since/)).toBeVisible();
  }}
/>

<!-- "Show" on page 2: back to page 1 with the same filters, where the new posts are. -->
<Story
  name="Show new posts from page two"
  args={{ params: { ...defaultListParams, tag: 'design', page: 2 } }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockImplementation(async (params) => postPage(published, params.page));
    mockRemote(watchNewPosts).mockStream(1);
  }}
  play={async ({ canvas, args }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Show' }));
    await waitFor(() => expect(args.onfilter).toHaveBeenCalledWith({ page: 1 }));
    await expect(mockRemote(listPosts)).toHaveBeenCalledWith({ ...args.params, page: 1 });
  }}
/>

<Story
  name="Error"
  exportName="Failed"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(listPosts).mockRejectedValue(httpError(503, 'The database is asleep'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('The posts did not load')).toBeVisible();
    await expect(canvas.getByText('The database is asleep')).toBeVisible();
  }}
/>

<!-- The real `listPosts`: `%` matches only itself, so nothing matches. -->
<Story
  name="Wildcard search (server mode)"
  exportName="WildcardSearch"
  args={{ params: { ...defaultListParams, q: '%' } }}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('No posts match', {}, { timeout: 5000 })).toBeVisible();
  }}
/>

<Story
  name="Server mode"
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('10 posts', {}, { timeout: 5000 })).toBeVisible();
    await expect(canvas.getAllByRole('article')[0]).toHaveTextContent(
      'Notes from a quiet refactor'
    );
  }}
/>
