<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import Button from './Button.svelte';
  import Dialog from './Dialog.svelte';
  import Input from './Input.svelte';

  const { Story } = defineMeta({
    title: 'UI/Dialog',
    component: Dialog,
    parameters: { layout: 'centered' },
  });
</script>

<script lang="ts">
  let open = $state(false);
  let deleted = $state(false);
</script>

<Story
  name="Open and close"
  asChild
  play={async ({ canvas, userEvent }) => {
    const opener = canvas.getByRole('button', { name: 'Delete post' });
    await userEvent.click(opener);

    const dialog = await canvas.findByRole('dialog', { name: 'Delete this post?' });
    await expect(dialog).toHaveAccessibleDescription('It goes away for good, with its comments.');

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(opener).toHaveFocus();

    await userEvent.click(opener);
    await userEvent.click(await canvas.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(opener).toHaveFocus();
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Keyboard"
  asChild
  play={async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
    const dialog = await canvas.findByRole('dialog');
    // The dialog itself has the focus, so a screen reader starts at its title.
    await waitFor(() => expect(dialog).toHaveFocus());

    // Tab goes round the controls, with no stop on the dialog.
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole('button', { name: 'Delete' })).toHaveFocus();
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Confirm action"
  asChild
  play={async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
    const dialog = await canvas.findByRole('dialog');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialog).not.toBeVisible());
    await expect(await canvas.findByRole('status')).toHaveTextContent('Deleted');
  }}
>
  {@render confirm()}
</Story>

<Story
  name="Backdrop click"
  asChild
  play={async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete post' }));
    const dialog = await canvas.findByRole('dialog');
    // A point on the backdrop: the dialog element itself, outside its panel.
    await userEvent.pointer({ keys: '[MouseLeft]', target: dialog, coords: { x: 1, y: 1 } });
    await waitFor(() => expect(dialog).not.toBeVisible());
  }}
>
  {@render confirm()}
</Story>

<Story name="Opened" asChild>
  {@render openDialog()}
</Story>

<Story name="Long content" asChild>
  <Dialog open title="Terms for contributors to Field Notes, version three, with a long title">
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
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render openDialog()}
</Story>

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

{#snippet openDialog()}
  <Dialog open title="Rename tag" description="Posts with this tag keep it under the new name.">
    <Input label="New name" value="svelte-5" />
    {#snippet actions()}
      <Button variant="secondary">Cancel</Button>
      <Button>Rename</Button>
    {/snippet}
  </Dialog>
{/snippet}
