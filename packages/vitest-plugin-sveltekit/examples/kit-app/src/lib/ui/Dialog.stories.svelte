<script module lang="ts">
  import type { ComponentProps } from 'svelte';
  import { expect, waitFor } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Button from './Button.svelte';
  import Dialog from './Dialog.svelte';
  import Input from './Input.svelte';

  const { Story } = preview.meta({
    title: 'UI/Dialog',
    component: Dialog,
    parameters: { layout: 'centered' },
  });
</script>

<script lang="ts">
  let open = $state(false);
  let deleted = $state(false);
</script>

<!-- The first four stories are a page with a dialog in it: the page owns `open`, so there is
     nothing for Controls to change. -->
<Story
  name="Open and close"
  asChild
  parameters={{ controls: { disable: true } }}
  play={async ({ canvas, userEvent, step }) => {
    const opener = canvas.getByRole('button', { name: 'Delete post' });
    let dialog!: HTMLElement;

    await step('Open the dialog', async () => {
      await userEvent.click(opener);
      dialog = await canvas.findByRole('dialog', { name: 'Delete this post?' });
      await expect(dialog).toHaveAccessibleDescription('It goes away for good, with its comments.');
    });

    await step('Escape closes it and gives the focus back', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(dialog).not.toBeVisible());
      await expect(opener).toHaveFocus();
    });

    await step('The Close button does the same', async () => {
      await userEvent.click(opener);
      await userEvent.click(await canvas.findByRole('button', { name: 'Close' }));
      await waitFor(() => expect(dialog).not.toBeVisible());
      await expect(opener).toHaveFocus();
    });
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Keyboard"
  asChild
  parameters={{ controls: { disable: true } }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Open the dialog: it has the focus itself', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
      const dialog = await canvas.findByRole('dialog');
      // So a screen reader starts at its title.
      await waitFor(() => expect(dialog).toHaveFocus());
    });

    await step('Tab goes round the controls, with no stop on the dialog', async () => {
      await userEvent.tab();
      await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
      await userEvent.tab();
      await expect(canvas.getByRole('button', { name: 'Keep it' })).toHaveFocus();
      await userEvent.tab();
      await expect(canvas.getByRole('button', { name: 'Delete' })).toHaveFocus();
      await userEvent.tab();
      await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    await step('Shift+Tab goes round backwards', async () => {
      await userEvent.tab({ shift: true });
      await expect(canvas.getByRole('button', { name: 'Delete' })).toHaveFocus();
    });
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Confirm action"
  asChild
  parameters={{ controls: { disable: true } }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Open the dialog', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
    });
    const dialog = await canvas.findByRole('dialog');

    await step('Confirm: the dialog closes and the page acts', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(dialog).not.toBeVisible());
      await expect(await canvas.findByRole('status')).toHaveTextContent('Deleted');
    });
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Backdrop click"
  asChild
  parameters={{ controls: { disable: true } }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Open the dialog', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
    });
    const dialog = await canvas.findByRole('dialog');

    await step('Click the backdrop: it closes', async () => {
      // A point on the backdrop: the dialog element itself, outside its panel.
      await userEvent.pointer({ keys: '[MouseLeft]', target: dialog, coords: { x: 1, y: 1 } });
      await waitFor(() => expect(dialog).not.toBeVisible());
    });
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Opened"
  args={{
    open: true,
    title: 'Rename tag',
    description: 'Posts with this tag keep it under the new name.',
  }}
  template={renameTag}
/>

<Story
  name="Long content"
  args={{
    open: true,
    title: 'Terms for contributors to Field Notes, version three, with a long title',
  }}
  template={terms}
/>

<Story
  name="Dark"
  args={{
    open: true,
    title: 'Rename tag',
    description: 'Posts with this tag keep it under the new name.',
  }}
  template={renameTag}
  globals={{ theme: 'dark' }}
/>

{#snippet confirm()}
  <Button variant="danger" onclick={() => (open = true)}>Delete post</Button>
  <Dialog
    bind:open
    title="Delete this post?"
    description="It goes away for good, with its comments."
  >
    {#snippet actions()}
      <Button variant="secondary" onclick={() => (open = false)}>Keep it</Button>
      <Button
        variant="danger"
        onclick={() => {
          deleted = true;
          open = false;
        }}>Delete</Button
      >
    {/snippet}
  </Dialog>
  {#if deleted}
    <p role="status">Deleted</p>
  {/if}
{/snippet}

{#snippet renameTag(args: ComponentProps<typeof Dialog>)}
  <Dialog {...args}>
    <Input label="New name" value="svelte-5" />
    {#snippet actions()}
      <Button variant="secondary">Cancel</Button>
      <Button>Rename</Button>
    {/snippet}
  </Dialog>
{/snippet}

{#snippet terms(args: ComponentProps<typeof Dialog>)}
  <Dialog {...args}>
    {#each { length: 12 } as _, index (index)}
      <p>
        Paragraph {index + 1}. Contributions are published under the blog's licence. Keep notes
        short, cite your sources, and be kind in the comments.
      </p>
    {/each}
    {#snippet actions()}
      <Button variant="secondary">Decline</Button>
      <Button>Accept</Button>
    {/snippet}
  </Dialog>
{/snippet}
