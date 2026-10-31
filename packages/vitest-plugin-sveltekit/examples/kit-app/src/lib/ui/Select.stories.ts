import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Select from './Select.svelte';

const options = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title' },
];

const meta = preview.meta({
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'padded' },
  args: { label: 'Sort by', name: 'order', options },
});

export const Default = meta.story({
  play: async ({ canvas, userEvent }) => {
    const select = canvas.getByLabelText('Sort by');
    await expect(select).toHaveValue('newest');
    await userEvent.selectOptions(select, 'Oldest first');
    await expect(select).toHaveValue('oldest');
  },
});

export const WithValue = meta.story({
  args: { value: 'title', hint: 'Applies to every list of posts.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Sort by')).toHaveValue('title');
  },
});

export const WithError = meta.story({
  args: { error: 'Choose how to sort the posts' },
  play: async ({ canvas }) => {
    const select = canvas.getByLabelText('Sort by');
    await expect(select).toHaveAttribute('aria-invalid', 'true');
    await expect(select).toHaveAccessibleDescription('Choose how to sort the posts');
  },
});

export const Disabled = meta.story({ args: { disabled: true } });

export const LongContent = meta.story({
  args: {
    options: [
      { value: 'a', label: 'An option label that is far too long to fit in a narrow select box' },
      ...options,
    ],
  },
});

export const Focus = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText('Sort by')).toHaveFocus();
  },
});
