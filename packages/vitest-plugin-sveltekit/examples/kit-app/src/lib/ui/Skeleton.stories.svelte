<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Skeleton from './Skeleton.svelte';

  const { Story } = defineMeta({
    title: 'UI/Skeleton',
    component: Skeleton,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  play={async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.skeleton')).toHaveAttribute('aria-hidden', 'true');
  }}
/>

<Story name="Paragraph" args={{ lines: 4 }} />

<Story name="Heading" args={{ width: '60%', height: '2rem' }} />

<Story name="Circle" args={{ width: '3.5rem', height: '3.5rem', radius: 'var(--radius-full)' }} />

<Story name="Dark" args={{ lines: 3 }} globals={{ theme: 'dark' }} />
