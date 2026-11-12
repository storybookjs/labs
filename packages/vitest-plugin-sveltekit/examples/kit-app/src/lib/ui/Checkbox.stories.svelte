<script module lang="ts">
  import { expect } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Checkbox from './Checkbox.svelte';

  const { Story } = preview.meta({
    title: 'UI/Checkbox',
    component: Checkbox,
    parameters: { layout: 'padded' },
    args: { label: 'Save as draft', name: 'draft' },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole('checkbox', { name: 'Save as draft' });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(canvas.getByText('Save as draft'));
    await expect(checkbox).toBeChecked();
  }}
/>

<Story
  name="Checked"
  args={{ checked: true }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeChecked();
  }}
/>

<Story
  name="With hint"
  args={{ hint: 'Drafts are only visible to you.' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAccessibleDescription(
      'Drafts are only visible to you.'
    );
  }}
/>

<Story
  name="With error"
  args={{ label: 'I accept the contributor terms', error: 'Accept the terms to publish' }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  }}
/>

<Story
  name="Disabled"
  args={{ disabled: true, checked: true }}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox')).toBeDisabled();
  }}
/>

<Story
  name="Long content"
  args={{
    label:
      'Send me an email when someone comments on one of my posts, replies to my comment, or mentions me',
    hint: 'At most one email a day, with everything that happened.',
  }}
/>

<Story
  name="Focus"
  play={async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('checkbox')).toHaveFocus();
  }}
/>
