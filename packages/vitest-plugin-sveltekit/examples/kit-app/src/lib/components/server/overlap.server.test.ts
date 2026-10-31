import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { deletePost, getPosts, getStats } from '#lib/posts.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import PostCount from '../PostCount.svelte';
import { gate, open, resetGates } from '#lib/probes/gate.ts';
import {
  addTitle,
  getTitles,
  probeCommand,
  signIn,
  slowTitles,
  ticker,
} from '#lib/probes/probes.remote.ts';
import { countViaHelper } from '#lib/probes/via-helper.remote.ts';

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(async () => {
  await resetDb([{ title: 'seed' }]);
});
afterEach(() => resetGates());

test('O1: a command keeps its own event while a live query pulls', async () => {
  requestEvent.cookies.set('session', 'ada');
  const live = ticker();
  await expect.poll(() => live.current?.n).toBe(0);
  // `handle` ran for the live request: the user comes from the session cookie.
  expect(live.current?.user).toBe('ada');

  const pending = probeCommand('A');
  await tick();
  // The live generator yields; SvelteKit pulls the next value, entering the live request's store.
  open('tick');
  await expect.poll(() => live.current?.n).toBe(1);
  await tick();

  open('A');
  const result = await pending;
  expect(result).toEqual({
    name: 'A',
    sameRequest: true,
    user: { name: 'ada' },
    url: '/',
    cookieSet: true,
  });
  expect(requestEvent.cookies.get('seen-by')).toBe('A');
});

test('O2: two real commands in flight each refresh their own requested query', async () => {
  await getTitles();
  const a = addTitle('A').updates(getTitles());
  const b = addTitle('B').updates(getTitles());
  await tick();
  open('B');
  await tick();
  open('A');
  await Promise.all([a, b]);
  expect([...(await getTitles())].sort()).toEqual(['A', 'B', 'seed']);
});

test('O3: a cookie set by a command survives a slower (mocked) request already in flight', async () => {
  remote(slowTitles).mockImplementation(async () => {
    await gate('slow');
    return [];
  });
  const slow = slowTitles();
  void slow.then(
    () => {},
    () => {}
  );
  await tick();
  const signedIn = signIn('ada');
  await tick();
  open('signIn');
  await signedIn;
  expect(requestEvent.cookies.get('session')).toBe('ada');

  open('slow');
  await slow;
  expect(requestEvent.cookies.get('session')).toBe('ada');
});

test('O4: deleting posts while PostCount polls (the example as is)', async () => {
  requestEvent.cookies.set('session', 'ada');
  const rows = await resetDb(Array.from({ length: 100 }, (_, i) => ({ title: `Post ${i}` })));
  const screen = await render(PostCount);
  await expect.element(screen.getByText('100', { exact: true })).toBeVisible();

  const failures: string[] = [];
  for (const { id } of rows) {
    try {
      await deletePost(id).updates(getPosts('newest'));
    } catch (e) {
      failures.push(String((e as { body?: { message?: string } }).body?.message ?? e));
    }
  }
  expect(failures).toEqual([]);
  expect(await db.$count(posts)).toBe(0);
});

test('O5: a mocked query left pending does not hold up a real command', async () => {
  remote(slowTitles).mockPending();
  const pending = slowTitles();
  void pending.then(
    () => {},
    () => {}
  );
  await tick();
  open('X');
  await addTitle('X');
  expect(await getTitles()).toContain('X');
});

test('O6: a real batch in flight and a command with .updates() both land', async () => {
  await resetDb([{ title: 'a' }, { title: 'b' }]);
  await getTitles();
  const stats = Promise.all([getStats(1), getStats(2)]);
  open('X');
  const command = addTitle('X').updates(getTitles());
  await Promise.all([stats, command]);
  expect(await stats).toEqual([
    { views: 0, likes: 0 },
    { views: 0, likes: 0 },
  ]);
  expect([...(await getTitles())].sort()).toEqual(['X', 'a', 'b']);
});

test('O7: a command that calls a remote function through a server helper', async () => {
  expect(await countViaHelper()).toBe(1);
});

test('O8: a command fired while a real query is still loading', async () => {
  await getTitles();
  const slow = slowTitles();
  void slow.then(
    () => {},
    () => {}
  );
  await tick();
  const command = addTitle('X').updates(getTitles());
  await tick();
  open('slow');
  await slow;
  await tick();
  open('X');
  await command;
  expect([...(await getTitles())].sort()).toEqual(['X', 'seed']);
});
