import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Checkbox from './Checkbox.svelte';

const meta = preview.meta({
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: { layout: 'padded' },
  args: { label: 'Save as draft', name: 'draft' },
});

export const Default = meta.story({
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox', { name: 'Save as draft' });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(canvas.getByText('Save as draft'));
    await expect(checkbox).toBeChecked();
  },
});

export const Checked = meta.story({
  args: { checked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeChecked();
  },
});

export const WithHint = meta.story({
  args: { hint: 'Drafts are only visible to you.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAccessibleDescription(
      'Drafts are only visible to you.'
    );
  },
});

export const WithError = meta.story({
  args: { label: 'I accept the contributor terms', error: 'Accept the terms to publish' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  },
});

export const Disabled = meta.story({
  args: { disabled: true, checked: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeDisabled();
  },
});

export const LongContent = meta.story({
  args: {
    label:
      'Send me an email when someone comments on one of my posts, replies to my comment, or mentions me',
    hint: 'At most one email a day, with everything that happened.',
  },
});

export const Focus = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('checkbox')).toHaveFocus();
  },
});
