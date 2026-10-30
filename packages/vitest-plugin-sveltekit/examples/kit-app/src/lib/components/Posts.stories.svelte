<script module lang="ts">
  import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { redirect } from '@sveltejs/kit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost, getPosts, getStats } from '#lib/posts.remote.ts';
  import type { Post } from '#lib/server/db.ts';

  import Posts from './Posts.svelte';

  const { Story } = defineMeta({
    title: 'Posts',
    component: Posts,
    beforeEach: () => {
      remote(getStats).mockResolvedValue({ views: 1, likes: 0 });
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
    const posts: Post[] = [{ id: 1, title: 'First post', body: '' }];
    remote(getPosts).mockImplementation(async () => [...posts]);
    remote(createPost).mockImplementation(async ({ title, body }) => {
      const post = { id: posts.length + 1, title, body: body ?? '' };
      posts.push(post);
      return post;
    });
  }}
  play={async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await userEvent.type(canvas.getByLabelText('Title'), 'Second post');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    // A successful form submission refreshes the queries on the page.
    await expect(await canvas.findByRole('link', { name: 'Second post' })).toBeVisible();
    await expect(remote(getPosts)).toHaveBeenCalledTimes(2);
  }}
/>

<Story
  name="Redirect"
  beforeEach={() => {
    remote(getPosts).mockResolvedValue([]);
    remote(createPost).mockImplementation(() => redirect(303, '/posts/42'));
    return recordNavigations();
  }}
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText('Title'), 'Go somewhere');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(navigations[0]?.[0]).toBe('/posts/42'));
  }}
/>
