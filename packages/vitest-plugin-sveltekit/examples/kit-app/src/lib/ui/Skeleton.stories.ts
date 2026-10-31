import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Skeleton from './Skeleton.svelte';

const meta = preview.meta({
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
});

export const Default = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.skeleton')).toHaveAttribute('aria-hidden', 'true');
  },
});

export const Paragraph = meta.story({ args: { lines: 4 } });

export const Heading = meta.story({ args: { width: '60%', height: '2rem' } });

export const Circle = meta.story({
  args: { width: '3.5rem', height: '3.5rem', radius: 'var(--radius-full)' },
});

export const Dark = meta.story({ args: { lines: 3 }, globals: { theme: 'dark' } });
