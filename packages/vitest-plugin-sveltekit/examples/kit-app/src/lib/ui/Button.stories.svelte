<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Button from './Button.svelte';

  const { Story } = defineMeta({
    title: 'UI/Button',
    component: Button,
    parameters: { layout: 'centered' },
    argTypes: {
      variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
      size: { control: 'inline-radio', options: ['sm', 'md'] },
    },
  });
</script>

<Story name="Primary">Publish</Story>

<Story name="Secondary" args={{ variant: 'secondary' }}>Save draft</Story>

<Story name="Ghost" args={{ variant: 'ghost' }}>Cancel</Story>

<Story name="Danger" args={{ variant: 'danger' }}>Delete post</Story>

<Story name="Small" args={{ size: 'sm' }}>Edit</Story>

<Story
  name="Disabled"
  args={{ disabled: true }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Publish' })).toBeDisabled();
  }}>Publish</Story
>

<Story
  name="Loading"
  args={{ loading: true, type: 'submit' }}
  play={async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Publishing…' });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
  }}>Publishing…</Story
>

<Story
  name="Link"
  args={{ href: '/posts/new', variant: 'secondary' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Write a post' })).toHaveAttribute(
      'href',
      '/posts/new'
    );
  }}>Write a post</Story
>

<Story
  name="Disabled link"
  args={{ href: '/posts/new', disabled: true }}
  play={async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Write a post' });
    await expect(link).not.toHaveAttribute('href');
    await expect(link).toHaveAttribute('aria-disabled', 'true');
  }}>Write a post</Story
>

<Story name="Long label">Publish this post and tell everyone who follows the blog about it</Story>

<Story
  name="Focus"
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Publish' })).toHaveFocus();
  }}>Publish</Story
>

<Story name="All variants" asChild>
  {@render variants()}
</Story>

<Story
  name="Dark"
  asChild
  globals={{ theme: 'dark' }}
  play={async () => {
    await expect(document.documentElement.dataset.theme).toBe('dark');
  }}
>
  {@render variants()}
</Story>

{#snippet variants()}
  <div class="grid">
    {#each ['md', 'sm'] as const as size (size)}
      <div class="row">
        <Button {size}>Publish</Button>
        <Button {size} variant="secondary">Save draft</Button>
        <Button {size} variant="ghost">Cancel</Button>
        <Button {size} variant="danger">Delete</Button>
        <Button {size} loading>Saving</Button>
        <Button {size} disabled>Disabled</Button>
      </div>
    {/each}
  </div>
{/snippet}

<style>
  .grid {
    display: grid;
    gap: var(--space-4);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }
</style>
