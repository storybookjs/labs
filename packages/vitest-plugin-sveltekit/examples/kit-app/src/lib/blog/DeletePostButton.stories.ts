import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';
import { toasts } from '#lib/ui/toasts.svelte.ts';

import preview from '../../../.storybook/preview';
import { removePost } from './blog.remote.ts';
import DeletePostButton from './DeletePostButton.svelte';
import { seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/DeletePostButton',
  component: DeletePostButton,
  parameters: { layout: 'centered' },
  args: { id: 3, title: 'A calmer colour palette' },
});

// Storybook runs in server mode: without a mock, `removePost` would delete for real.
const mocked = {
  beforeEach: () => {
    remote(removePost).mockResolvedValue(undefined);
  },
};

const dialog = () => within(document.body).getByRole('dialog');

/** Opens the dialog and waits until it has faded in. */
async function openDialog(canvas: { getByRole: (role: string, options: object) => HTMLElement }) {
  await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(dialog()).toBeVisible());
}

export const Default = meta.story({ ...mocked });

export const CancelKeepsThePost = meta.story({
  ...mocked,
  play: async ({ canvas }) => {
    await openDialog(canvas);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull());
    await expect(remote(removePost)).not.toHaveBeenCalled();
  },
});

export const Confirm = meta.story({
  ...mocked,
  play: async ({ canvas, args }) => {
    await openDialog(canvas);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
    await waitFor(() => expect(remote(removePost)).toHaveBeenCalledWith(args.id));
    await waitFor(() => expect(toasts.at(-1)?.message).toBe(`Deleted “${args.title}”`));
  },
});

export const Failure = meta.story({
  beforeEach: () => {
    remote(removePost).mockRejectedValue(
      httpError(404, 'This post does not exist, or it was deleted.')
    );
  },
  play: async ({ canvas }) => {
    await openDialog(canvas);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
    await waitFor(() => expect(toasts.at(-1)).toMatchObject({ tone: 'error' }));
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas }) => {
    await openDialog(canvas);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete post' }));
    await waitFor(async () => expect(await db.$count(posts)).toBe(11));
  },
});
