import { expect } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Textarea from './Textarea.svelte';

const meta = preview.meta({
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'padded' },
  args: { label: 'Body', name: 'body' },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Body')).toHaveAttribute('rows', '8');
  },
});

export const Markdown = meta.story({
  args: {
    mono: true,
    hint: 'Markdown: **bold**, _italic_, [links](https://example.com).',
    value: '# Field notes\n\nA paragraph with **bold** text.\n\n- one\n- two\n',
  },
});

export const WithError = meta.story({
  args: { error: 'Body is required', rows: 4 },
  play: async ({ canvas }) => {
    const textarea = canvas.getByLabelText('Body');
    await expect(textarea).toHaveAttribute('aria-invalid', 'true');
    await expect(textarea).toHaveAttribute('rows', '4');
    await expect(textarea).toHaveAccessibleDescription('Body is required');
  },
});

export const Disabled = meta.story({
  args: { disabled: true, value: 'This post is locked.' },
});

export const LongContent = meta.story({
  args: {
    rows: 4,
    value: Array.from({ length: 12 }, (_, index) => `Line ${index + 1} of a long draft.`).join(
      '\n'
    ),
  },
});

export const Focus = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText('Body')).toHaveFocus();
  },
});
