<script module lang="ts">
  import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { invalid } from '@sveltejs/kit';
  import { expect, userEvent } from 'storybook/test';

  import AppShell from '#lib/blog/AppShell.svelte';
  import { editPost, publishPost, readPost } from '#lib/blog/blog.remote.ts';
  import { postDetails } from '#lib/blog/fixtures.ts';
  import { seedDatabase } from '#lib/blog/story-helpers.ts';

  import EditPostPage from './EditPostPage.svelte';
  import NewPostPage from './NewPostPage.svelte';

  const post = postDetails.find((item) => item.title === 'A calmer colour palette')!;

  const { Story } = defineMeta({
    title: 'Pages/Editor',
    parameters: {
      layout: 'fullscreen',
      sveltekit_experimental: { state: { page: { url: new URL('http://localhost/posts/new') } } },
    },
  });
</script>

{#snippet newPostPage()}
  <AppShell width="narrow"><NewPostPage /></AppShell>
{/snippet}

{#snippet editPostPage()}
  <AppShell width="narrow"><EditPostPage id={post.id} /></AppShell>
{/snippet}

<Story
  name="New post"
  template={newPostPage}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'New post' })).toBeVisible();
  }}
/>

<Story
  name="New post with issues"
  template={newPostPage}
  beforeEach={() => {
    remote(publishPost).mockImplementation(async (_data, issue) =>
      invalid(issue.title('A post with this title exists'))
    );
  }}
  play={async ({ canvas }) => {
    // A form that passes the preflight, so the (mocked) handler reports the issue.
    await userEvent.type(canvas.getByLabelText('Title'), 'A calmer colour palette');
    await userEvent.type(canvas.getByLabelText('Body'), 'Fewer colours.');
    await userEvent.type(canvas.getByLabelText('Author'), 'Sanna');
    await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
    await expect(await canvas.findByText('A post with this title exists')).toBeVisible();
  }}
/>

<Story
  name="Edit post"
  template={editPostPage}
  beforeEach={() => {
    remote(readPost).mockResolvedValue(post);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Title')).toHaveValue(post.title);
  }}
/>

<Story
  name="Edit post with issues"
  template={editPostPage}
  beforeEach={() => {
    remote(readPost).mockResolvedValue(post);
    remote(editPost).mockImplementation(async (_data, issue) =>
      invalid(issue.title('A post with this title exists'))
    );
  }}
  play={async ({ canvas }) => {
    const title = await canvas.findByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Typography for long reads');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(await canvas.findByText('A post with this title exists')).toBeVisible();
  }}
/>

<Story
  name="Edit post loading"
  template={editPostPage}
  beforeEach={() => {
    remote(readPost).mockPending();
  }}
/>

<Story
  name="New post, server mode"
  template={newPostPage}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    // The real `publishPost`: its schema reports every missing field.
    await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
    await expect(await canvas.findByText('Write something first', {}, { timeout: 5000 })).toBeVisible();
    await expect(canvas.getByText('Say who wrote this')).toBeVisible();
  }}
/>

<Story
  name="Edit post, server mode"
  template={editPostPage}
  beforeEach={seedDatabase}
  play={async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Title', {}, { timeout: 5000 })).toHaveValue(post.title);
  }}
/>
