import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Avatar from './Avatar.svelte';

const meta = preview.meta({
  title: 'UI/Avatar',
  component: Avatar,
  parameters: { layout: 'centered' },
  args: { name: 'Ada Lovelace' },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Ada Lovelace' });
    await expect(avatar).toHaveTextContent('AL');
  },
});

export const Small = meta.story({ args: { size: 'sm' } });

export const Large = meta.story({ args: { size: 'lg', name: 'Grace Brewster Murray Hopper' } });

export const SingleName = meta.story({
  args: { name: 'Hypatia' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Hypatia' })).toHaveTextContent('H');
  },
});

// An inline SVG, so the story needs no network.
export const WithImage = meta.story({
  args: {
    src: `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#a8461f"/><circle cx="20" cy="16" r="7" fill="#f8f4ec"/><rect x="8" y="26" width="24" height="14" rx="7" fill="#f8f4ec"/></svg>'
    )}`,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Ada Lovelace' }).tagName).toBe('IMG');
  },
});
