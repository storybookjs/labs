<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { mockRequestEvent } from 'vitest-plugin-sveltekit/server.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import { getStats } from '#lib/posts.remote.ts';
  import { db } from '#lib/server/db.ts';
  import { resetDb } from '#lib/server/mocked-db.ts';
  import { posts } from '#lib/server/schema.ts';

  import PostList from '../PostList.svelte';

  // No `mockRemote()` mocks here: `getPosts`, `getStats` and `deletePost` run the code in
  // `posts.remote.ts`, on the in-memory database from `__mocks__/db.ts`.
  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Server/PostList',
    component: PostList,
    beforeEach: async () => {
      await resetDb([
        { title: 'From the database', body: '', views: 7, likes: 3 },
        { title: 'Also from the database', body: '', views: 1, likes: 0 },
      ]);
    },
  });
</script>

<Story
  name="Real query"
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'From the database' })).toBeVisible();
    await expect(await canvas.findByTestId('stats-1')).toHaveTextContent('7 views, 3 likes');
  }}
/>

<Story
  name="Mixed with mock"
  beforeEach={() => {
    // Mocked: `getStats`. Real: `getPosts`.
    mockRemote(getStats).mockResolvedValue({ views: 99, likes: 9 });
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'From the database' })).toBeVisible();
    await expect(await canvas.findByTestId('stats-1')).toHaveTextContent('99 views, 9 likes');
    await expect(mockRemote(getStats)).toHaveBeenCalledWith(1);
  }}
/>

<Story
  name="Delete signed in"
  beforeEach={() => {
    // `hooks.server.ts` reads the session cookie into `locals.user`.
    mockRequestEvent({ cookies: { session: 'svelty' } });
  }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Delete a post while signed in: the real command deletes it', async () => {
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Delete From the database' })
      );
      await waitFor(() => expect(canvas.queryByText('From the database')).toBeNull());
      await expect(await db.$count(posts)).toBe(1);
    });
  }}
/>

<Story
  name="Delete forbidden"
  beforeEach={() => {
    mockRequestEvent({ locals: { user: null } });
  }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Delete a post while signed out: the real command refuses', async () => {
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Delete From the database' })
      );
      await expect(await canvas.findByRole('alert')).toHaveTextContent('Sign in to delete posts');
      await expect(await db.$count(posts)).toBe(2);
    });
  }}
/>
