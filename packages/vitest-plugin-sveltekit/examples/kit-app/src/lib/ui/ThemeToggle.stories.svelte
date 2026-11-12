<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import ThemeToggle, { THEME_STORAGE_KEY } from './ThemeToggle.svelte';

  const { Story } = defineMeta({
    title: 'UI/ThemeToggle',
    component: ThemeToggle,
    parameters: { layout: 'centered' },
    beforeEach: () => {
      localStorage.removeItem(THEME_STORAGE_KEY);
      return () => localStorage.removeItem(THEME_STORAGE_KEY);
    },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas, userEvent, step }) => {
    const root = document.documentElement;
    const toggle = canvas.getByRole('button', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(root.dataset.theme).toBe('light');

    await step('Turn the dark theme on: the page changes and remembers it', async () => {
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(root.dataset.theme).toBe('dark');
      await expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    await step('Turn it off again', async () => {
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await expect(root.dataset.theme).toBe('light');
    });
  }}
/>

<Story
  name="Dark"
  globals={{ theme: 'dark' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  }}
/>

<Story
  name="Focus"
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Dark theme' })).toHaveFocus();
  }}
/>
