<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Avatar from './Avatar.svelte';

  const { Story } = defineMeta({
    title: 'UI/Avatar',
    component: Avatar,
    parameters: { layout: 'centered' },
    args: { name: 'Svelty McSvelteface' },
  });

  // An inline SVG, so the story needs no network.
  const image = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#a8461f"/><circle cx="20" cy="16" r="7" fill="#f8f4ec"/><rect x="8" y="26" width="24" height="14" rx="7" fill="#f8f4ec"/></svg>'
  )}`;
</script>

<Story
  name="Default"
  play={async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Svelty McSvelteface' });
    await expect(avatar).toHaveTextContent('SM');
  }}
/>

<Story name="Small" args={{ size: 'sm' }} />

<Story name="Large" args={{ size: 'lg', name: 'Null Pointer McException the Second' }} />

<Story
  name="Single name"
  args={{ name: 'Undefinedia' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Undefinedia' })).toHaveTextContent('U');
  }}
/>

<Story
  name="With image"
  args={{ src: image }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Svelty McSvelteface' }).tagName).toBe('IMG');
  }}
/>
