<script module lang="ts">
  import { expect } from 'storybook/test';

  import Button from '#lib/ui/Button.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';

  import preview from '../../../.storybook/preview';
  import AppShell from './AppShell.svelte';
  import { page } from '$app/state';

  const { Story } = preview.meta({
    title: 'Posts/AppShell',
    tags: ['autodocs'],
    component: AppShell,
    parameters: {
      layout: 'fullscreen',
      docs: { story: { inline: false, height: '480px' } },
    },
  });
</script>

<!-- A page with a list, such as the home page: the default `wide` width. -->
<Story
  name="List page"
  asChild
  beforeEach={() => {
    page.url = new URL('http://localhost/');
  }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Posts' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(canvas.getByRole('link', { name: 'New post' })).toHaveAttribute(
      'href',
      '/posts/new'
    );
  }}
>
  <AppShell>
    <h1>Posts</h1>
    <EmptyState title="No posts yet" description="Write the first note before you forget it.">
      {#snippet action()}
        <Button href="/posts/new">Write a post</Button>
      {/snippet}
    </EmptyState>
  </AppShell>
</Story>

<!-- A page with a form or one post, such as the editor: `width="narrow"`. -->
<Story
  name="Narrow page"
  asChild
  beforeEach={() => {
    page.url = new URL('http://localhost/posts/new');
  }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('main')).toHaveClass('narrow');
  }}
>
  <AppShell width="narrow">
    <h1>New post</h1>
    <p>Put the form of the page here, such as a <code>PostEditor</code>.</p>
  </AppShell>
</Story>
