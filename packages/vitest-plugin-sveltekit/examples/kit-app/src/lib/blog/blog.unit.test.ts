// Unit tests of the Field Notes remote functions in Vitest's Node mode (the `unit` project): the
// real functions, called directly, on the in-memory database of `__mocks__/db.ts`. Each call runs
// in a request built from `mockRequestEvent()`.
import { runInRequest, submitForm } from 'vitest-plugin-sveltekit/server.mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  countView,
  getReadingStats,
  listPosts,
  publishPost,
  readPost,
  removePost,
  watchNewPosts,
} from '#lib/blog/blog.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts, postStats } from '#lib/server/schema.ts';
import { seedPosts } from '#lib/server/seed.ts';

const post = { title: 'Notes from the field', body: 'Hello', author: 'Svelty', tags: 'notes' };

beforeEach(async () => {
  await resetDb(seedPosts);
});

describe('query', () => {
  test('reads the database through the real handler', async () => {
    const page = await listPosts({ tag: 'svelte' });
    expect(page.posts.length).toBeGreaterThan(0);
    expect(page.posts.every((summary) => summary.tags.includes('svelte'))).toBe(true);
  });

  test('the real schema rejects a bad argument with its issues', async () => {
    await expect(listPosts({ page: 0 })).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: [expect.objectContaining({ key: 'page' })] })],
    });
  });

  test('error() comes out as SvelteKit’s HttpError', async () => {
    await expect(readPost(999)).rejects.toMatchObject({
      status: 404,
      body: { message: 'This post does not exist, or it was deleted.' },
    });
  });
});

describe('form', () => {
  test('the real schema gives issues per field', async () => {
    const { result, issues } = await submitForm(publishPost, { title: '', body: '', author: '' });
    expect(result).toBeUndefined();
    expect(issues?.map(({ name, message }) => [name, message])).toEqual([
      ['title', 'Give the post a title'],
      ['body', 'Write something first'],
      ['author', 'Say who wrote this'],
    ]);
  });

  test('invalid() in the handler gives an issue too', async () => {
    const { issues } = await submitForm(publishPost, { ...post, title: seedPosts[0]!.title });
    expect(issues).toEqual([
      { name: 'title', path: ['title'], message: 'A post with this title exists' },
    ]);
  });

  test('redirect() after a valid submission comes out as SvelteKit’s Redirect', async () => {
    await expect(submitForm(publishPost, post)).rejects.toMatchObject({
      status: 303,
      location: `/posts/${seedPosts.length + 1}`,
    });
    expect(await db.$count(posts)).toBe(seedPosts.length + 1);
  });
});

describe('command', () => {
  test('refreshes the query.batch it updates, inside its own request', async () => {
    const select = vi.spyOn(db, 'select');
    await countView(1);
    // The only read: `getReadingStats(1).refresh()` ran the batch handler at the end.
    expect(select).toHaveBeenCalledOnce();
    expect(await getReadingStats(1)).toMatchObject({ views: seedPosts[0]!.views! + 1 });
  });

  test('changes the database, and error() comes out as SvelteKit’s HttpError', async () => {
    await removePost(1);
    expect(await db.$count(posts)).toBe(seedPosts.length - 1);
    await expect(removePost(1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('query.batch', () => {
  test('calls in one request share one run of the handler', async () => {
    const select = vi.spyOn(db, 'select');
    const [first, second] = await runInRequest(() =>
      Promise.all([getReadingStats(1), getReadingStats(2)])
    );
    expect(select).toHaveBeenCalledOnce();
    expect([first, second]).toEqual([
      { views: seedPosts[0]!.views, likes: seedPosts[0]!.likes },
      { views: seedPosts[1]!.views, likes: seedPosts[1]!.likes },
    ]);
  });
});

describe('query.live', () => {
  test('pushes a new value when a post is published', async () => {
    const live = watchNewPosts(Date.now())[Symbol.asyncIterator]();
    expect(await live.next()).toEqual({ value: 0, done: false });

    await db.insert(posts).values({ ...post, tags: [], publishedAt: new Date() });
    expect(await live.next()).toEqual({ value: 1, done: false });
    await live.return?.(undefined);
  });

  test('awaiting it gives the first value', async () => {
    expect(await watchNewPosts(0)).toBe(
      seedPosts.filter((seed) => seed.published !== false).length
    );
  });
});

test('the next test starts with a fresh database and no live query', async () => {
  expect(await db.$count(postStats)).toBe(seedPosts.length);
});
