<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import TagList from './TagList.svelte';

  const { Story } = defineMeta({
    title: 'Posts/TagList',
    component: TagList,
    parameters: { layout: 'padded' },
    args: { tags: ['design', 'writing', 'notes'] },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'design' })).toHaveAttribute(
      'href',
      '/?tag=design'
    );
  }}
/>

<Story
  name="Active tag"
  args={{ active: 'writing' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'writing' })).toHaveAttribute(
      'aria-current',
      'true'
    );
  }}
/>

<Story
  name="Empty"
  args={{ tags: [] }}
  play={async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('ul')).toBeNull();
  }}
/>

<Story
  name="Many"
  args={{
    tags: ['design', 'writing', 'notes', 'testing', 'tooling', 'svelte', 'typography', 'release'],
  }}
/>
