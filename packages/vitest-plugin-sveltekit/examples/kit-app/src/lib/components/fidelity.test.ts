// What a component sees matches SvelteKit: serialisation, errors, redirects, caching and live
// streams, for mocked remote functions.
import { goto } from '@storybookjs/vitest-plugin-sveltekit/vitest';
import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { error, redirect } from '@sveltejs/kit';
import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
  createPost,
  deletePost,
  getPost,
  getPostCount,
  getPosts,
  getStats,
} from '#lib/posts.remote.ts';

import PostCount from './PostCount.svelte';
import PostForm from './PostForm.svelte';
import PostList from './PostList.svelte';
import { track } from './track-effect.svelte.ts';

const posts = [
  { id: 1, title: 'First post', body: '' },
  { id: 2, title: 'Second post', body: '' },
  { id: 3, title: 'Third post', body: '' },
];

const anyPosts = getPosts as unknown as (arg: unknown) => Promise<unknown> & {
  refresh(): Promise<void>;
  set(v: unknown): void;
  withOverride(fn: (v: unknown) => unknown): () => void;
};

beforeEach(() => {
  remote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
});

// --- Fidelity --------------------------------------------------------------------------

test('arguments and results survive devalue in every shape', async () => {
  const arg = {
    when: new Date(0),
    tags: new Set(['a', 'b']),
    map: new Map([[1, { deep: [1, 2, { u: undefined }] }]]),
    big: 10n,
    none: null,
    missing: undefined,
    nested: { inner: { list: [new Date(1), 2n] } },
  };
  remote(getPosts).mockImplementation(async (received) => ({ echo: received }) as never);

  const result = (await anyPosts(arg)) as { echo: unknown };

  expect(remote(getPosts)).toHaveBeenCalledWith(arg);
  expect(result.echo).toEqual(arg);
});

test('a query without an argument calls the spy with undefined', async () => {
  remote(getPosts).mockResolvedValue([]);
  await getPosts();
  expect(remote(getPosts)).toHaveBeenCalledWith(undefined);
  expect(remote(getPosts).mock.calls[0]).toHaveLength(1);
});

test('a plain Error in a query mock is an Internal Error for the component', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  remote(getPosts).mockImplementation(() => {
    throw new Error('boom');
  });
  const screen = await render(PostList);
  await expect.element(screen.getByRole('alert')).toMatchTextContent(/Internal Error/);
});

test('error() in a command rejects the command promise with the status and body', async () => {
  remote(deletePost).mockImplementation(() => error(409, 'Taken'));
  await expect(deletePost(1)).rejects.toMatchObject({ status: 409, body: { message: 'Taken' } });
});

test('a rejected plain Error in a command is an Internal Error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  remote(deletePost).mockRejectedValue(new Error('boom'));
  await expect(deletePost(1)).rejects.toMatchObject({
    status: 500,
    body: { message: 'Internal Error' },
  });
});

test('error() in a form handler leaves the form idle, like a handled error', async () => {
  remote(createPost).mockImplementation(() => error(500, 'nope'));
  const screen = await render(PostForm);
  await screen.getByLabelText('Title').fill('Hello');
  await screen.getByRole('button', { name: 'Create' }).click();
  await vi.waitFor(() => expect(createPost.pending).toBe(0));
  expect(createPost.result).toBeUndefined();
  expect(createPost.fields.title.issues()).toBeUndefined();
});

test('one failing batch entry fails only that entry', async () => {
  remote(getPosts).mockResolvedValue(posts);
  remote(getStats).mockImplementation(async (id) => {
    if (id === 2) error(404, 'No stats for 2');
    return { views: id, likes: id };
  });
  await expect(getStats(1)).resolves.toEqual({ views: 1, likes: 1 });
  await expect(getStats(2)).rejects.toMatchObject({ status: 404 });
  await expect(getStats(3)).resolves.toEqual({ views: 3, likes: 3 });
  expect(remote(getStats)).toHaveBeenCalledTimes(3);
});

test('redirect() in a query navigates (relative)', async () => {
  remote(getPosts).mockImplementation(() => redirect(303, '/elsewhere'));
  await getPosts();
  expect(goto).toHaveBeenCalledWith('/elsewhere', undefined);
});

test('redirect() in a query navigates (absolute, external: true as SvelteKit requires)', async () => {
  remote(getPosts).mockImplementation(() =>
    redirect(303, 'https://example.com/x', { external: true } as never)
  );
  await getPosts();
  expect(goto).toHaveBeenCalledWith('https://example.com/x', undefined);
});

test('an external redirect without `external: true` is a 500, as on a real server', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  remote(getPosts).mockImplementation(() => redirect(303, 'https://example.com/x'));
  await expect(getPosts()).rejects.toMatchObject({ status: 500 });
  expect(goto).not.toHaveBeenCalled();
});

test('redirect() in a prerender navigates', async () => {
  remote(getPost).mockImplementation(() => redirect(303, '/post-moved'));
  await getPost(1);
  expect(goto).toHaveBeenCalledWith('/post-moved', undefined);
});

test('redirect() in a command is an error, as in SvelteKit', async () => {
  remote(deletePost).mockImplementation(() => redirect(303, '/x'));
  await expect(deletePost(1)).rejects.toThrow(/redirect/i);
});

test('redirect() from a live stream navigates', async () => {
  remote(getPostCount).mockImplementation(async function* () {
    yield 1;
    redirect(303, '/live-moved');
  });
  const screen = await render(PostCount);
  await expect.element(screen.getByText('1', { exact: true })).toBeVisible();
  await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/live-moved', undefined));
  // In an app the navigation unmounts the component. Here it would stay mounted, and SvelteKit
  // keeps reconnecting after each redirect, until the next test's reset pulls the query away.
  await screen.unmount();
});

// --- Caching ---------------------------------------------------------------------------

test('the same argument from two components hits the spy once', async () => {
  remote(getPosts).mockResolvedValue(posts);
  await render(PostList, { order: 'newest' });
  const screen = await render(PostList, { order: 'newest' });
  await expect.element(screen.getByRole('link', { name: 'First post' }).nth(1)).toBeVisible();
  await expect.element(screen.getByTestId('stats-3').nth(1)).toMatchTextContent(/300 views/);
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
  expect(remote(getStats)).toHaveBeenCalledTimes(3);
});

test('different arguments hit the spy once each', async () => {
  remote(getPosts).mockResolvedValue(posts);
  await render(PostList, { order: 'newest' });
  const screen = await render(PostList, { order: 'oldest' });
  await expect.element(screen.getByRole('link', { name: 'First post' }).nth(1)).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(2);
});

const orders = ['newest', 'oldest', 'newest', 'oldest'] as const;
const permutations = <T>(items: T[]): T[][] =>
  items.length <= 1
    ? [items]
    : items.flatMap((item, i) =>
        permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
      );
const seen = new Set<string>();
for (const order of permutations([...orders])) {
  const key = order.join(',');
  if (seen.has(key)) continue;
  seen.add(key);
  test(`concurrent calls ${key} hit the spy once per distinct argument`, async () => {
    remote(getPosts).mockImplementation(async (o) => [{ id: 1, title: o ?? 'none', body: '' }]);
    const results = await Promise.all(order.map((o) => getPosts(o)));
    results.forEach((r, i) => expect(r[0]!.title).toBe(order[i]));
    expect(remote(getPosts)).toHaveBeenCalledTimes(2);
    expect(remote(getPosts)).toHaveBeenCalledWith('newest');
    expect(remote(getPosts)).toHaveBeenCalledWith('oldest');
  });
}

test('refresh() calls the spy again and set() does not', async () => {
  let n = 0;
  remote(getPosts).mockImplementation(async () => [{ id: ++n, title: `Run ${n}`, body: '' }]);
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'Run 1' })).toBeVisible();

  await getPosts('newest').refresh();
  await expect.element(screen.getByRole('link', { name: 'Run 2' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(2);

  getPosts('newest').set([{ id: 9, title: 'Set by hand', body: '' }]);
  await expect.element(screen.getByRole('link', { name: 'Set by hand' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(2);
});

test('withOverride applies and reverts', async () => {
  remote(getPosts).mockResolvedValue(posts);
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();

  const release = getPosts('newest').withOverride(() => []);
  await expect.element(screen.getByText('No posts yet')).toBeVisible();
  release();
  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
});

// --- Live streams ----------------------------------------------------------------------

test('emits before mount: the connection starts with the latest value', async () => {
  const feed = remote(getPostCount).mockStream();
  feed.emit(1);
  feed.emit(2);
  const screen = await render(PostCount);
  await expect.element(screen.getByText('2', { exact: true })).toBeVisible();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('live');
});

test('a burst of emits arrives in order', async () => {
  const feed = remote(getPostCount).mockStream(0);
  const screen = await render(PostCount);
  await expect.element(screen.getByText('0', { exact: true })).toBeVisible();
  const values: number[] = [];
  const q = getPostCount();
  const stop = track(() => values.push(q.current as number));
  feed.emit(1);
  feed.emit(2);
  feed.emit(2);
  feed.emit(3);
  await expect.element(screen.getByText('3', { exact: true })).toBeVisible();
  stop();
  expect(values.filter((v) => v !== undefined)).toEqual([0, 1, 2, 3]);
  expect(remote(getPostCount)).toHaveBeenCalledTimes(1);
});

test('end() marks the query done and keeps the last value', async () => {
  const feed = remote(getPostCount).mockStream(4);
  const screen = await render(PostCount);
  await expect.element(screen.getByText('4', { exact: true })).toBeVisible();
  feed.end();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('done');
  feed.emit(9);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await expect.element(screen.getByText('4', { exact: true })).toBeVisible();
});

// SvelteKit evicts a live query entry when its last proxy is garbage collected, not on unmount,
// so the generator keeps running after `unmount()` until GC. Same as in a SvelteKit app.
test('unmount while a pull is pending: the stream outlives the component until GC', async () => {
  let pulls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  remote(getPostCount).mockImplementation(async function* () {
    pulls++;
    yield 1;
    pulls++;
    await gate;
    yield 2;
    pulls++;
    yield 3;
  });
  const screen = await render(PostCount);
  await expect.element(screen.getByText('1', { exact: true })).toBeVisible();
  await screen.unmount();
  await new Promise((resolve) => setTimeout(resolve, 20));
  release();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(pulls).toBe(3);
  expect(remote(getPostCount)).toHaveBeenCalledTimes(1);
});

test('a live mock that never yields stays pending without error', async () => {
  remote(getPostCount).mockPending();
  const screen = await render(PostCount);
  await expect.element(screen.getByText(/Counting posts…/)).toBeVisible();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(screen.getByRole('alert').query()).toBeNull();
});
