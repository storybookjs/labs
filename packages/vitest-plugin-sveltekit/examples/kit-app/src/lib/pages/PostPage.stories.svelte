<script module lang="ts">
  import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import AppShell from '#lib/blog/AppShell.svelte';
  import { readPost } from '#lib/blog/blog.remote.ts';
  import { postDetails } from '#lib/blog/fixtures.ts';
  import { mockQuietFeed, seedDatabase } from '#lib/blog/story-helpers.ts';

  import PostPage from './PostPage.svelte';

  const post = postDetails.find((item) => item.title === 'Remote functions, one month in')!;

  const { Story } = defineMeta({
    title: 'Pages/Post',
    component: PostPage,
    parameters: {
      layout: 'fullscreen',
      sveltekit_experimental: { state: { page: { url: new URL(`http://localhost/posts/${post.id}`) } } },
    },
    args: { id: post.id },
  });
</script>

{#snippet template(args: { id: number })}
  <AppShell width="narrow"><PostPage {...args} /></AppShell>
{/snippet}

<Story
  name="Data"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(post);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1 })).toHaveTextContent(post.title);
    await expect(canvas.getByRole('link', { name: '← All posts' })).toHaveAttribute('href', '/');
  }}
/>

<Story
  name="Loading"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(readPost).mockPending();
  }}
/>

<Story
  name="Not found"
  {template}
  args={{ id: 404 }}
  beforeEach={() => {
    remote(readPost).mockRejectedValue(httpError(404, 'This post does not exist, or it was deleted.'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('Post not found')).toBeVisible();
  }}
/>

<Story
  name="Error"
  {template}
  beforeEach={() => {
    remote(readPost).mockRejectedValue(httpError(503, 'The database is asleep'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('The post did not load')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Try again' })).toBeVisible();
  }}
/>

<Story
  name="Dark"
  {template}
  globals={{ theme: 'dark' }}
  beforeEach={() => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(post);
  }}
/>

<Story
  name="Mobile"
  {template}
  globals={{ viewport: { value: 'mobile1' } }}
  beforeEach={() => {
    mockQuietFeed();
    remote(readPost).mockResolvedValue(post);
  }}
/>

<Story
  name="Server mode"
  {template}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent(
      post.title
    );
  }}
/>
