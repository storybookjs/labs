<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { expect } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import { getReadingStats } from './blog.remote.ts';
  import { longPost, postSummaries, published } from './fixtures.ts';
  import PostCard from './PostCard.svelte';
  import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

  // `mockQuietFeed` is not on the meta: a reset spy counts as mocked, so the server mode story
  // must start unmocked.
  const { Story } = preview.meta({
    title: 'Posts/PostCard',
    component: PostCard,
    parameters: { layout: 'padded' },
    args: { post: published[0]! },
  });
</script>

<Story
  name="Default"
  beforeEach={mockQuietFeed}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: published[0]!.title })).toHaveAttribute(
      'href',
      `/posts/${published[0]!.id}`
    );
    await expect(await canvas.findByText(/views/)).toBeVisible();
  }}
/>

<Story
  name="Draft"
  beforeEach={mockQuietFeed}
  args={{ post: postSummaries.find((post) => !post.published)! }}
  play={async ({ canvas }) => {
    await expect(canvas.getByText('Draft')).toBeVisible();
  }}
/>

<Story
  name="Active tag"
  beforeEach={mockQuietFeed}
  args={{ activeTag: published[0]!.tags[0] }}
/>

<Story
  name="Long content"
  beforeEach={mockQuietFeed}
  args={{ post: { ...longPost, excerpt: longPost.excerpt.repeat(2) } }}
/>

<Story
  name="Stats loading"
  beforeEach={() => {
    mockRemote(getReadingStats).mockPending();
  }}
/>

<Story
  name="Server mode"
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    // The real `getReadingStats` reads the seed: 266 views, 19 likes.
    await expect(await canvas.findByText('266 views')).toBeVisible();
  }}
/>
