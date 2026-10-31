import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { publishPost } from './blog.remote.ts';
import PostEditor from './PostEditor.svelte';

test('a body issue that arrives in the Preview view shows the Write view with the issue', async () => {
  remote(publishPost).mockImplementation(async (_data, issue) =>
    invalid(issue.body('Write something first'))
  );
  const screen = await render(PostEditor);

  await screen.getByRole('button', { name: 'Preview' }).click();
  await expect.element(screen.getByRole('region', { name: 'Preview' })).toBeVisible();
  await screen.getByRole('button', { name: 'Publish' }).click();

  await expect.element(screen.getByText('Write something first')).toBeVisible();
  await expect.element(screen.getByRole('textbox', { name: 'Body' })).toBeVisible();
  await expect.element(screen.getByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
});

test('after a failed submit, the first field with an issue has the focus', async () => {
  const screen = await render(PostEditor);
  await screen.getByRole('button', { name: 'Publish' }).click();

  await expect.element(screen.getByText('Give the post a title')).toBeVisible();
  await expect.element(screen.getByText('Use at least 3 characters')).not.toBeInTheDocument();
  await expect.element(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
});

test('a field loses its issue as soon as it is fixed', async () => {
  const screen = await render(PostEditor);
  await screen.getByRole('button', { name: 'Publish' }).click();
  await expect.element(screen.getByText('Say who wrote this')).toBeVisible();

  await screen.getByRole('textbox', { name: 'Author' }).fill('Ada');

  await expect.element(screen.getByText('Say who wrote this')).not.toBeInTheDocument();
  await expect
    .element(screen.getByRole('textbox', { name: 'Author' }))
    .not.toHaveAttribute('aria-invalid', 'true');
  // The other fields keep theirs.
  await expect.element(screen.getByText('Write something first')).toBeVisible();
});
