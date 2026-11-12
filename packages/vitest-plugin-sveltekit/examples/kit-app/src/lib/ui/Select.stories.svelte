<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Select from './Select.svelte';

  const options = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'title', label: 'Title' },
  ];

  const { Story } = defineMeta({
    title: 'UI/Select',
    component: Select,
    parameters: { layout: 'padded' },
    args: { label: 'Sort by', name: 'order', options },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas, userEvent }) => {
    const select = canvas.getByLabelText('Sort by');
    await expect(select).toHaveValue('newest');
    await userEvent.selectOptions(select, 'Oldest first');
    await expect(select).toHaveValue('oldest');
  }}
/>

<Story
  name="With value"
  args={{ value: 'title', hint: 'Applies to every list of posts.' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByLabelText('Sort by')).toHaveValue('title');
  }}
/>

<Story
  name="With error"
  args={{ error: 'Choose how to sort the posts' }}
  play={async ({ canvas }) => {
    const select = canvas.getByLabelText('Sort by');
    await expect(select).toHaveAttribute('aria-invalid', 'true');
    await expect(select).toHaveAccessibleDescription('Choose how to sort the posts');
  }}
/>

<Story name="Disabled" args={{ disabled: true }} />

<Story
  name="Long content"
  args={{
    options: [
      { value: 'a', label: 'An option label that is far too long to fit in a narrow select box' },
      ...options,
    ],
  }}
/>

<Story
  name="Focus"
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByLabelText('Sort by')).toHaveFocus();
  }}
/>
