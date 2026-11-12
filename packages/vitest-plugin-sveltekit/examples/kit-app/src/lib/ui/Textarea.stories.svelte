<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Textarea from './Textarea.svelte';

  const { Story } = defineMeta({
    title: 'UI/Textarea',
    component: Textarea,
    parameters: { layout: 'padded' },
    args: { label: 'Body', name: 'body' },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas }) => {
    await expect(canvas.getByLabelText('Body')).toHaveAttribute('rows', '8');
  }}
/>

<Story
  name="Markdown"
  args={{
    mono: true,
    hint: 'Markdown: **bold**, _italic_, [links](https://example.com).',
    value: '# Field notes\n\nA paragraph with **bold** text.\n\n- one\n- two\n',
  }}
/>

<Story
  name="With error"
  args={{ error: 'Body is required', rows: 4 }}
  play={async ({ canvas }) => {
    const textarea = canvas.getByLabelText('Body');
    await expect(textarea).toHaveAttribute('aria-invalid', 'true');
    await expect(textarea).toHaveAttribute('rows', '4');
    await expect(textarea).toHaveAccessibleDescription('Body is required');
  }}
/>

<Story name="Disabled" args={{ disabled: true, value: 'This post is locked.' }} />

<Story
  name="Long content"
  args={{
    rows: 4,
    value: Array.from({ length: 12 }, (_, index) => `Line ${index + 1} of a long draft.`).join(
      '\n'
    ),
  }}
/>

<Story
  name="Focus"
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText('Body')).toHaveFocus();
  }}
/>
