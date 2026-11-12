<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { error } from '@sveltejs/kit';
  import { expect } from 'storybook/test';

  import { getPost } from '#lib/posts.remote.ts';

  import PostDetail from './PostDetail.svelte';

  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Remote functions/PostDetail',
    component: PostDetail,
    args: { id: 7 },
  });
</script>

<Story
  name="Prerendered"
  beforeEach={() => {
    mockRemote(getPost).mockImplementation(async (id) => ({
      id,
      title: `Post ${id}`,
      body: 'Rendered from a prerender function.',
    }));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Post 7' })).toBeVisible();
    await expect(mockRemote(getPost)).toHaveBeenCalledWith(7);
  }}
/>

<Story
  name="Not found"
  beforeEach={() => {
    mockRemote(getPost).mockImplementation((id) => error(404, `Post ${id} not found`));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Post 7 not found');
  }}
/>
