import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { createPost } from '#lib/posts.remote.ts';
import { queryCount, resetDb } from '#lib/server/mocked-db.ts';

import PostCount from '../PostCount.svelte';
import PostList from '../PostList.svelte';
import Posts from '../Posts.svelte';
import { open, resetGates } from '#lib/probes/gate.ts';
import { faulty, getTitles, signIn, whoAmI } from '#lib/probes/probes.remote.ts';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  await resetDb([{ title: 'seed' }]);
});
afterEach(() => resetGates());

/** What a story can leave behind. Each returns nothing; the next test checks the slate is clean. */
const scenarios = {
  // A live generator polling the database, still mounted when the test ends.
  live: async () => {
    const screen = await render(PostCount);
    await expect.element(screen.getByText('1', { exact: true })).toBeVisible();
  },
  // A handler that threw `error(403)` after awaits.
  forbidden: async () => {
    requestEvent.locals.user = null;
    const screen = await render(PostList);
    await screen.getByRole('button', { name: 'Delete seed' }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Could not delete: Sign in to delete posts');
  },
  // A handler that set a cookie; the jar now has it.
  cookie: async () => {
    open('signIn');
    await signIn('ada');
    expect(requestEvent.cookies.get('session')).toBe('ada');
    await whoAmI().refresh();
    expect(await whoAmI()).toEqual({ user: { name: 'ada' }, session: 'ada' });
  },
  // A form left with issues and a touched field.
  issue: async () => {
    const screen = await render(Posts);
    await screen.getByLabelText('Title').fill('seed');
    await screen.getByRole('button', { name: 'Create' }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('A post with this title exists');
  },
};
type Scenario = keyof typeof scenarios;

/** What the next story or test can see of the previous one. */
async function leftovers(previous: Scenario | undefined) {
  // After a live test: does a generator keep polling the database? Nothing else queries meanwhile.
  const queries = queryCount();
  if (previous === 'live') await wait(350);
  const polling = queryCount() - queries;
  return {
    cookies: requestEvent.cookies.getAll(),
    locals: requestEvent.locals,
    pending: createPost.pending,
    result: createPost.result,
    issues: createPost.fields.title.issues() ?? [],
    request: await whoAmI(),
    titles: await getTitles(),
    polling,
  };
}

const clean = {
  cookies: [],
  locals: {},
  pending: 0,
  result: undefined,
  issues: [],
  request: { user: null, session: null },
  titles: ['seed'],
  polling: 0,
};

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
  );
}

for (const order of permutations(['live', 'forbidden', 'cookie'] as Scenario[])) {
  order.forEach((name, i) => {
    test(`I: ${order.join('>')} step ${i + 1} (${name})`, async () => {
      expect(await leftovers(order[i - 1])).toEqual(clean);
      await scenarios[name]();
    });
  });
}

test('I-live-throws: a live generator that fails mid-poll', async () => {
  const live = faulty();
  await expect.poll(() => live.current).toBe('ok');
  open('fault');
  await expect.poll(() => live.error?.message).toBe('Internal Error');
  expect(live.connected).toBe(false);
});

test('I-live-throws: the next test starts clean', async () => {
  const live = faulty();
  await expect.poll(() => live.current).toBe('ok');
  expect(live.error).toBeUndefined();
  expect(live.connected).toBe(true);
});

test('I-form: a form left with an issue', async () => {
  await scenarios.issue();
  expect(createPost.fields.title.issues()).toHaveLength(1);
});

test('I-form: the next test starts with a clean form', async () => {
  expect(await leftovers('issue')).toEqual(clean);
  await scenarios.live();
});

test('I-form: after a live test, the form is still clean', async () => {
  expect(await leftovers('live')).toEqual(clean);
});
