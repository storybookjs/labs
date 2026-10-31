<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Avatar from './Avatar.svelte';
  import Button from './Button.svelte';
  import Header from './Header.svelte';

  const { Story } = defineMeta({
    title: 'UI/Header',
    component: Header,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story
  name="Brand only"
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Field Notes' })).toHaveAttribute('href', '/');
    await expect(canvas.getByRole('button', { name: 'Dark theme' })).toBeVisible();
  }}
/>

<Story
  name="With nav and actions"
  asChild
  play={async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Posts' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  }}
>
  {@render full()}
</Story>

<Story name="Custom title" args={{ title: 'Field Notes · Staging' }} />

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile1' } }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Field Notes' })).toBeVisible();
    await expect(canvas.getByRole('navigation', { name: 'Main' })).toBeVisible();
  }}
>
  {@render full()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render full()}
</Story>

{#snippet full()}
  <Header>
    {#snippet nav()}
      <a href="/posts" aria-current="page">Posts</a>
      <a href="/tags">Tags</a>
      <a href="/drafts">Drafts</a>
      <a href="/about">About</a>
    {/snippet}
    {#snippet actions()}
      <Button size="sm" href="/posts/new">Write</Button>
      <Avatar name="Ada Lovelace" size="sm" />
    {/snippet}
  </Header>
{/snippet}
