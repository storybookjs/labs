<script module lang="ts">
  import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost } from '#lib/posts.remote.ts';

  import { db } from '#lib/server/db.ts';
  import { resetDb } from '#lib/server/mocked-db.ts';
  import { posts } from '#lib/server/schema.ts';

  import Posts from '../Posts.svelte';

  // The real `createPost`: its valibot schema, its `invalid()` calls, its insert.
  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Server/Posts',
    component: Posts,
    beforeEach: async () => {
      await resetDb([{ title: 'First post', body: '' }]);
    },
  });
</script>

<Story
  name="Create and refresh"
  play={async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await userEvent.type(canvas.getByLabelText('Title'), 'Second post');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));

    await expect(await canvas.findByRole('link', { name: 'Second post' })).toBeVisible();
    await expect(await db.$count(posts)).toBe(2);
  }}
/>

<Story
  name="Schema issue"
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText('Title'), '   ');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Title is required');
  }}
/>

<Story
  name="Handler issue"
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText('Title'), 'First post');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'A post with this title exists'
    );
    await expect(await db.$count(posts)).toBe(1);
  }}
/>

<Story
  name="Submitting"
  beforeEach={() => {
    remote(createPost).mockPending();
  }}
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText('Title'), 'Slow');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled());
  }}
/>
