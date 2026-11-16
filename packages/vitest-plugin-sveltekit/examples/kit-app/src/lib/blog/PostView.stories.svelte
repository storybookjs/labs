<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { expect, waitFor } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import { countView, readPost } from './blog.remote.ts';
  import { longPost, postDetails } from './fixtures.ts';
  import PostView from './PostView.svelte';
  import { mockQuietFeed, seedDatabase } from './story-helpers.ts';

  const typography = postDetails.find((post) => post.title === 'Typography for long reads')!;

  const { Story } = preview.meta({
    title: 'Posts/PostView',
    tags: ['autodocs'],
    component: PostView,
    parameters: {
      layout: 'padded',
      docs: { story: { inline: false, height: '720px' } },
    },
    args: { id: typography.id },
  });
</script>

<!-- A published post: its body, meta, stats, and the Edit and Delete actions. -->
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
  tags={['!manifest']}
  args={{ id: longPost.id }}
  beforeEach={() => {
    mockQuietFeed();
    mockRemote(readPost).mockResolvedValue(longPost);
  }}
/>

<!-- A long code line wraps; the page does not scroll sideways on a phone. -->
<Story
  name="Mobile with code"
  tags={['!manifest']}
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

<!-- A post that does not exist: an empty state with a link back to all posts. -->
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

<!-- When the post does not load: an empty state with Try again. -->
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
  tags={['!manifest', '!autodocs']}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 1 }, { timeout: 5000 })
    ).toHaveTextContent(typography.title);
    await expect(await canvas.findByText(/views/)).toBeVisible();
  }}
/>
