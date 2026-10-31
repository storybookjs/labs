import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { createPost } from '#lib/posts.remote.ts';

import PostForm from './PostForm.svelte';

beforeEach(() => {
  remote(createPost).mockImplementation(async (data, issue) => {
    if (data.title.length < 3) invalid(issue.title('Title must be at least 3 characters'));
    return { id: 3, title: data.title, body: data.body ?? '' };
  });
});

test('shows the issue the form handler reports', async () => {
  const screen = await render(PostForm);

  await screen.getByLabelText('Title').fill('Hi');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Title must be at least 3 characters');
  expect(remote(createPost)).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Hi' }),
    expect.anything()
  );
});

test('shows the result of a successful submission', async () => {
  const screen = await render(PostForm);

  await screen.getByLabelText('Title').fill('A real title');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect.element(screen.getByRole('status')).toHaveTextContent('Created “A real title”');
});

test('starts each test with an empty form', async () => {
  const screen = await render(PostForm);

  await expect.element(screen.getByLabelText('Title')).toHaveValue('');
  await expect.element(screen.getByRole('status')).not.toBeInTheDocument();
});
