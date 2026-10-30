import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import Posts from '../Posts.svelte';

beforeEach(async () => {
  await resetDb([{ title: 'First post', body: '' }]);
});

test('creates a post with the real form handler and refreshes the list', async () => {
  const screen = await render(Posts);
  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();

  await screen.getByLabelText('Title').fill('Second post');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect.element(screen.getByRole('link', { name: 'Second post' })).toBeVisible();
  expect(await db.$count(posts)).toBe(2);
});

test('shows the issue from the real valibot schema', async () => {
  const screen = await render(Posts);

  await screen.getByLabelText('Title').fill('   ');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect.element(screen.getByRole('alert')).toHaveTextContent('Title is required');
});

test('shows the issue the real handler reports with invalid()', async () => {
  const screen = await render(Posts);

  await screen.getByLabelText('Title').fill('First post');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect.element(screen.getByRole('alert')).toHaveTextContent('A post with this title exists');
  expect(await db.$count(posts)).toBe(1);
});
