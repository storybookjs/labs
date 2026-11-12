<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { redirect } from '@sveltejs/kit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost, getPosts, getStats } from '#lib/posts.remote.ts';

  import preview from '../../../.storybook/preview';
  import Posts from './Posts.svelte';

  const { Story } = preview.meta({
    parameters: { demo: true },
    title: 'Remote functions/Posts',
    component: Posts,
    beforeEach: () => {
      mockRemote(getStats).mockResolvedValue({ views: 1, likes: 0 });
    },
  });

  // `goto` from Storybook's `$app/navigation` mock dispatches this event.
  let navigations: unknown[][] = [];
  function recordNavigations() {
    navigations = [];
    const listener = (event: Event) => navigations.push((event as CustomEvent<unknown[]>).detail);
    window.addEventListener('storybook:goto', listener);
    return () => window.removeEventListener('storybook:goto', listener);
  }
</script>

<Story
  name="Refresh after submit"
  beforeEach={() => {
    const posts: Awaited<ReturnType<typeof getPosts>> = [{ id: 1, title: 'First post', body: '' }];
    mockRemote(getPosts).mockImplementation(async () => [...posts]);
    mockRemote(createPost).mockImplementation(async ({ title, body }) => {
      const post = { id: posts.length + 1, title, body: body ?? '' };
      posts.push(post);
      return post;
    });
  }}
  play={async ({ canvas, userEvent, step }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await step('Create a post: the (mocked) handler adds it to the list', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'Second post');
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    });
    await step('The submission refreshes getPosts, so the list shows it', async () => {
      await expect(await canvas.findByRole('link', { name: 'Second post' })).toBeVisible();
      await expect(mockRemote(getPosts)).toHaveBeenCalledTimes(2);
    });
  }}
/>

<Story
  name="Redirect"
  beforeEach={() => {
    mockRemote(getPosts).mockResolvedValue([]);
    mockRemote(createPost).mockImplementation(() => redirect(303, '/posts/42'));
    return recordNavigations();
  }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Create a post: the (mocked) handler redirects to /posts/42', async () => {
      await userEvent.type(await canvas.findByLabelText('Title'), 'Go somewhere');
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    });
    await waitFor(() => expect(navigations[0]?.[0]).toBe('/posts/42'));
  }}
/>
