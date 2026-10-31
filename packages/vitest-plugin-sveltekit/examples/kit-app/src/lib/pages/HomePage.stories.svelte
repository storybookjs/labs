<script module lang="ts">
  import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import type { ComponentProps } from 'svelte';
  import { expect, fn } from 'storybook/test';

  import AppShell from '#lib/blog/AppShell.svelte';
  import { listPosts } from '#lib/blog/blog.remote.ts';
  import { postPage } from '#lib/blog/fixtures.ts';
  import { defaultListParams } from '#lib/blog/posts.ts';
  import { mockQuietFeed, seedDatabase } from '#lib/blog/story-helpers.ts';

  import HomePage from './HomePage.svelte';

  const { Story } = defineMeta({
    title: 'Pages/Home',
    component: HomePage,
    parameters: {
      layout: 'fullscreen',
      sveltekit_experimental: { state: { page: { url: new URL('http://localhost/') } } },
    },
    args: { params: defaultListParams, onfilter: fn() },
  });
</script>

{#snippet template(args: ComponentProps<typeof HomePage>)}
  <AppShell><HomePage {...args} /></AppShell>
{/snippet}

<Story
  name="Data"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage());
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Field Notes' })).toBeVisible();
    await expect(await canvas.findAllByRole('article')).toHaveLength(6);
    await expect(canvas.getByRole('link', { name: 'New post' })).toHaveAttribute('href', '/posts/new');
  }}
/>

<Story
  name="Loading"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockPending();
  }}
/>

<Story
  name="Empty"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue({ ...postPage([]), tags: [] });
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('No posts yet')).toBeVisible();
  }}
/>

<Story
  name="Filtered"
  {template}
  args={{ params: { ...defaultListParams, tag: 'design', sort: 'title' } }}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockImplementation(async (params) => {
      const page = postPage();
      return { ...page, posts: page.posts.filter((post) => post.tags.includes(params.tag ?? '')) };
    });
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText(/tagged/)).toBeVisible();
    await expect(remote(listPosts)).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'design', sort: 'title' })
    );
  }}
/>

<Story
  name="Error"
  {template}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockRejectedValue(httpError(503, 'The database is asleep'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('The posts did not load')).toBeVisible();
  }}
/>

<Story
  name="Mobile"
  {template}
  globals={{ viewport: { value: 'mobile1' } }}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage());
  }}
/>

<Story
  name="Dark"
  {template}
  globals={{ theme: 'dark' }}
  beforeEach={() => {
    mockQuietFeed();
    remote(listPosts).mockResolvedValue(postPage());
  }}
/>

<Story
  name="Server mode"
  {template}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('10 posts', {}, { timeout: 5000 })).toBeVisible();
  }}
/>
