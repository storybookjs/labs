import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { db } from '#lib/server/db.ts';
import { queryCount, resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import PostCount from '../PostCount.svelte';

// `.env` sets LIVE_POLL_MS=100: the real generator queries the database ten times a second.
const POLL_MS = 100;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      async () => {
        (globalThis as { gc?: () => void }).gc?.();
        const before = queryCount();
        await wait(POLL_MS * 3);
        return queryCount() - before;
      },
      { timeout: 5000 }
    )
    .toBe(0);
});

test('leaves no generator running from the previous test', async () => {
  // The previous tests left nothing polling: no query runs while nothing is rendered.
  const before = queryCount();
  await wait(POLL_MS * 5);
  expect(queryCount()).toBe(before);
});
