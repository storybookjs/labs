<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Tag from './Tag.svelte';

  const { Story } = defineMeta({
    title: 'UI/Tag',
    component: Tag,
    parameters: { layout: 'centered' },
  });
</script>

<Story name="Static">svelte</Story>

<Story
  name="Link"
  args={{ href: '/tags/svelte' }}
  play={async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'svelte' });
    await expect(link).toHaveAttribute('href', '/tags/svelte');
    await expect(link).not.toHaveAttribute('aria-current');
  }}>svelte</Story
>

<Story
  name="Active"
  args={{ href: '/tags/svelte', active: true }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'svelte' })).toHaveAttribute(
      'aria-current',
      'true'
    );
  }}>svelte</Story
>

<Story
  name="Focus"
  args={{ href: '/tags/svelte' }}
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('link', { name: 'svelte' })).toHaveFocus();
  }}>svelte</Story
>

<Story name="Long content" asChild>
  <div style="max-width: 14rem">
    <Tag href="/tags/long">a-tag-name-that-is-much-longer-than-the-others</Tag>
  </div>
</Story>

<Story name="Tag list" asChild>
  {@render list()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render list()}
</Story>

{#snippet list()}
  <ul style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none">
    <li><Tag href="/tags/all" active>all</Tag></li>
    <li><Tag href="/tags/svelte">svelte</Tag></li>
    <li><Tag href="/tags/storybook">storybook</Tag></li>
    <li><Tag href="/tags/testing">testing</Tag></li>
    <li><Tag>static</Tag></li>
  </ul>
{/snippet}
