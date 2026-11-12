import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { longPost, postDetails } from './fixtures.ts';
import Markdown from './Markdown.svelte';

const meta = preview.meta({
  title: 'Posts/Markdown',
  component: Markdown,
  parameters: { layout: 'padded' },
});

export const Default = meta.story({
  args: { source: postDetails.find((post) => post.body.includes('| Setting'))!.body },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(canvas.getByRole('table')).toBeVisible();
  },
});

export const Code = meta.story({
  args: { source: postDetails.find((post) => post.body.includes('```ts'))!.body },
});

/** Raw HTML is text, and `javascript:` links are not links. */
export const UnsafeInput = meta.story({
  args: {
    source:
      'An <img src=x onerror="alert(1)"> image, a <script>alert(1)</script> script and [a link](javascript:alert(1)).',
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText(/<img src=x onerror/)).toBeVisible();
    await expect(canvasElement.querySelector('img, script')).toBeNull();
    await expect(canvasElement.querySelector('a[href^="javascript:"]')).toBeNull();
  },
});

export const LongContent = meta.story({ args: { source: longPost.body } });

export const Empty = meta.story({ args: { source: '' } });
