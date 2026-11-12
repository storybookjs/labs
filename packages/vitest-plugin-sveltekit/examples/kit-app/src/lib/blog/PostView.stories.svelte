<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import { countView, readPost } from './blog.remote.ts';
  import { longPost, postDetails } from './fixtures.ts';
  import PostView from './PostView.svelte';
  import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

  const typography = postDetails.find((post) => post.title === 'Typography for long reads')!;

  const { Story } = defineMeta({
    title: 'Posts/PostView',
    component: PostView,
    parameters: { layout: 'padded' },
    args: { id: typography.id },
  });
</script>

<Story
  name="Data"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockResolvedValue(typography);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1 })).toHaveTextContent(
      typography.title
    );
    await expect(canvas.getByRole('table')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/posts/${typography.id}/edit`
    );
    // The page counts the visit.
    await waitFor(() => expect(mockRemote(countView)).toHaveBeenCalledWith(typography.id));
  }}
/>

<Story
  name="Draft"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockResolvedValue(postDetails.find((post) => !post.published)!);
  }}
/>

<Story
  name="Long content"
  args={{ id: longPost.id }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockResolvedValue(longPost);
  }}
/>

<!-- A long code line wraps; the page does not scroll sideways on a phone. -->
<Story
  name="Mobile with code"
  globals={{ viewport: { value: 'mobile1' } }}
  args={{ id: 2 }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockResolvedValue(
      postDetails.find((post) => post.title === 'Remote functions, one month in')!
    );
  }}
  play={async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('pre')).not.toBeNull());
    const block = canvasElement.querySelector('pre')!;
    await expect(block.scrollWidth).toBeLessThanOrEqual(block.clientWidth);
  }}
/>

<Story
  name="Loading"
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockPending();
  }}
/>

<Story
  name="Not found"
  args={{ id: 404 }}
  beforeEach={() => {
    mockRemote(readPost).mockRejectedValue(
      httpError(404, 'This post does not exist, or it was deleted.')
    );
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('Post not found')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Back to all posts' })).toHaveAttribute(
      'href',
      '/'
    );
  }}
/>

<Story
  name="Error"
  exportName="Failed"
  beforeEach={() => {
    mockRemote(readPost).mockRejectedValue(httpError(500, 'The database is asleep'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('The post did not load')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  }}
/>

<Story
  name="Server mode"
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 1 }, { timeout: 5000 })
    ).toHaveTextContent(typography.title);
    await expect(await canvas.findByText(/views/)).toBeVisible();
  }}
/>
