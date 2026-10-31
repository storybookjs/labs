import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import TagList from './TagList.svelte';

const meta = preview.meta({
  title: 'Posts/TagList',
  component: TagList,
  parameters: { layout: 'padded' },
  args: { tags: ['design', 'writing', 'notes'] },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'design' })).toHaveAttribute(
      'href',
      '/?tag=design'
    );
  },
});

export const ActiveTag = meta.story({
  args: { active: 'writing' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'writing' })).toHaveAttribute(
      'aria-current',
      'true'
    );
  },
});

export const Empty = meta.story({
  args: { tags: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('ul')).toBeNull();
  },
});

export const Many = meta.story({
  args: {
    tags: ['design', 'writing', 'notes', 'testing', 'tooling', 'svelte', 'typography', 'release'],
  },
});
