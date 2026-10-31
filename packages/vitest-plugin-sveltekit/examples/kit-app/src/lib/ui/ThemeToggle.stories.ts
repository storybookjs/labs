import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import ThemeToggle, { THEME_STORAGE_KEY } from './ThemeToggle.svelte';

const meta = preview.meta({
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  parameters: { layout: 'centered' },
  beforeEach: () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    return () => localStorage.removeItem(THEME_STORAGE_KEY);
  },
});

export const Default = meta.story({
  play: async ({ canvas, userEvent }) => {
    const root = document.documentElement;
    const toggle = canvas.getByRole('button', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(root.dataset.theme).toBe('light');

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(root.dataset.theme).toBe('dark');
    await expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(root.dataset.theme).toBe('light');
  },
});

export const Dark = meta.story({
  globals: { theme: 'dark' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  },
});

export const Focus = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Dark theme' })).toHaveFocus();
  },
});
