<script module lang="ts">
  import { expect } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Skeleton from './Skeleton.svelte';

  const { Story } = preview.meta({
    title: 'UI/Skeleton',
    tags: ['autodocs'],
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

<!-- A paragraph that is loading: `lines` bars, the last one shorter. -->
<Story name="Paragraph" args={{ lines: 4 }} />

<Story name="Heading" args={{ width: '60%', height: '2rem' }} />

<!-- An avatar that is loading: the same width and height, and a full radius. -->
<Story name="Circle" args={{ width: '3.5rem', height: '3.5rem', radius: 'var(--radius-full)' }} />

<Story name="Dark" tags={['!manifest']} args={{ lines: 3 }} globals={{ theme: 'dark' }} />
