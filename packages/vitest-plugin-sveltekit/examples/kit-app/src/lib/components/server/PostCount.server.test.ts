import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { db } from '#lib/server/db.ts';
import { openSubscriptions } from '#lib/server/changes.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import PostCount from '../PostCount.svelte';

beforeEach(async () => {
  await resetDb([{ title: 'One' }, { title: 'Two' }]);
});

test('follows the database with the real live query', async () => {
  const screen = await render(PostCount);
  await expect.element(screen.getByText('2', { exact: true })).toBeVisible();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('live');

  await db.insert(posts).values({ title: 'Three' });

  await expect.element(screen.getByText('3', { exact: true })).toBeVisible();
});

test('stops the real generator when the component is gone', async () => {
  const screen = await render(PostCount);
  await expect.element(screen.getByText('2', { exact: true })).toBeVisible();

  // SvelteKit closes a live query when its proxy is garbage collected, not at unmount. Closing
  // aborts the request signal, and the generator in `posts.remote.ts` stops on it.
  await screen.unmount();
  await expect
    .poll(
      () => {
        (globalThis as { gc?: () => void }).gc?.();
        return openSubscriptions();
      },
      { timeout: 5000 }
    )
    .toBe(0);
});

test('leaves no generator running from the previous test', () => {
  // The previous tests left no live query waiting for changes.
  expect(openSubscriptions()).toBe(0);
});
