import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Input from './Input.svelte';

const meta = preview.meta({
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'padded' },
  args: { label: 'Title', name: 'title' },
});

export const Default = meta.story({
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByLabelText('Title');
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'Field notes');
    await expect(input).toHaveValue('Field notes');
  },
});

export const WithHint = meta.story({
  args: { hint: 'Keep it under 80 characters.', placeholder: 'A short, clear title' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Title')).toHaveAccessibleDescription(
      'Keep it under 80 characters.'
    );
  },
});

export const WithError = meta.story({
  args: { value: 'Hi', hint: 'Keep it under 80 characters.', error: 'Title is too short' },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Title');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(
      'Keep it under 80 characters. Title is too short'
    );
  },
});

export const MultipleErrors = meta.story({
  args: { error: ['Title is required', 'Title must start with a letter'] },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Title')).toHaveAccessibleDescription(
      'Title is required Title must start with a letter'
    );
  },
});

// The props a SvelteKit remote form field spreads: they win over the defaults, and its
// `aria-invalid` stays when there is no `error` prop.
export const SpreadFieldProps = meta.story({
  args: {
    label: 'Email',
    name: 'email/form-1',
    type: 'email',
    value: 'not-an-email',
    'aria-invalid': 'true',
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Email');
    await expect(input).toHaveAttribute('type', 'email');
    await expect(input).toHaveAttribute('name', 'email/form-1');
    await expect(input).toHaveValue('not-an-email');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  },
});

export const Disabled = meta.story({
  args: { value: 'Published posts cannot be renamed', disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Title')).toBeDisabled();
  },
});

export const LongContent = meta.story({
  args: {
    label: 'A label that is long enough to wrap onto a second line on a small phone screen',
    value:
      'A value that is much longer than the input is wide, so the text scrolls inside the input',
    hint: 'A hint that also runs long, to show how the description wraps under the label on narrow screens.',
  },
});

export const Focus = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText('Title')).toHaveFocus();
  },
});

export const Dark = meta.story({
  args: { hint: 'Keep it under 80 characters.', error: 'Title is too short', value: 'Hi' },
  globals: { theme: 'dark' },
});
