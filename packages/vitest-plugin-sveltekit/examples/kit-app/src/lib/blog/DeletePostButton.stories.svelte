<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, userEvent, waitFor, within } from 'storybook/test';

  import { db } from '#lib/server/db.ts';
  import { posts } from '#lib/server/schema.ts';
  import { toasts } from '#lib/ui/toasts.svelte.ts';

  import { removePost } from './blog.remote.ts';
  import DeletePostButton from './DeletePostButton.svelte';
  import { seedDatabase } from './story-helpers.ts';

  const { Story } = defineMeta({
    title: 'Posts/DeletePostButton',
    component: DeletePostButton,
    parameters: { layout: 'centered' },
    args: { id: 3, title: 'A calmer colour palette' },
  });

  // Storybook runs in server mode: without a mock, `removePost` would delete for real.
  function mockRemovePost() {
    mockRemote(removePost).mockResolvedValue(undefined);
  }

  const dialog = () => within(document.body).getByRole('dialog');

  /** Opens the dialog and waits until it has faded in. */
  async function openDialog(canvas: {
    getByRole: (role: string, options: object) => HTMLElement;
  }) {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialog()).toBeVisible());
  }
</script>

<Story name="Default" beforeEach={mockRemovePost} />

<Story
  name="Cancel keeps the post"
  beforeEach={mockRemovePost}
  play={async ({ canvas, step }) => {
    await step('Open the confirmation', () => openDialog(canvas));
    await step('Cancel: the dialog closes and nothing is deleted', async () => {
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
      await expect(mockRemote(removePost)).not.toHaveBeenCalled();
    });
  }}
/>

<Story
  name="Confirm"
  beforeEach={mockRemovePost}
  play={async ({ canvas, args, step }) => {
    await step('Open the confirmation', () => openDialog(canvas));
    await step('Confirm: removePost runs and a toast says so', async () => {
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
      await waitFor(() => expect(mockRemote(removePost)).toHaveBeenCalledWith(args.id));
      await waitFor(() => expect(toasts.at(-1)?.message).toBe(`Deleted “${args.title}”`));
    });
  }}
/>

<Story
  name="Failure"
  beforeEach={() => {
    mockRemote(removePost).mockRejectedValue(
      httpError(404, 'This post does not exist, or it was deleted.')
    );
  }}
  play={async ({ canvas, step }) => {
    await step('Open the confirmation', () => openDialog(canvas));
    await step(
      'Confirm: the (mocked) removePost fails with a 404, so an error toast shows',
      async () => {
        await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
        await waitFor(() => expect(toasts.at(-1)).toMatchObject({ tone: 'error' }));
      }
    );
  }}
/>

<Story
  name="Server mode"
  beforeEach={seedDatabase}
  play={async ({ canvas, step }) => {
    await step('Open the confirmation', () => openDialog(canvas));
    await step('Confirm: the real removePost deletes one of the 12 seeded posts', async () => {
      await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
      await waitFor(async () => expect(await db.$count(posts)).toBe(11));
    });
  }}
/>
