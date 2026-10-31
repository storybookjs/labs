// The blog's real remote functions on the in-memory database (server mode).
import { eq } from 'drizzle-orm';
import { beforeEach, expect, test } from 'vitest';

import {
  countView,
  getReadingStats,
  listPosts,
  readPost,
  removePost,
  watchNewPosts,
} from '#lib/blog/blog.remote.ts';
import { defaultListParams, PAGE_SIZE } from '#lib/blog/posts.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';
import { seedPosts } from '#lib/server/seed.ts';

beforeEach(async () => {
  await resetDb(seedPosts);
});

const list = (params: Partial<typeof defaultListParams> = {}) =>
  listPosts({ ...defaultListParams, ...params });

test('lists published posts, newest first, a page at a time', async () => {
  const first = await list();
  const published = seedPosts.filter((post) => post.published !== false);
  expect(first.total).toBe(published.length);
  expect(first.posts).toHaveLength(PAGE_SIZE);
  expect(first.posts[0]!.title).toBe('Notes from a quiet refactor');
  expect(first.pageCount).toBe(Math.ceil(published.length / PAGE_SIZE));

  const second = await list({ page: 2 });
  expect(second.posts.map((post) => post.title)).not.toContain(first.posts[0]!.title);
});

test('filters by tag, search and status, and counts the tags', async () => {
  const design = await list({ tag: 'design' });
  expect(design.posts.every((post) => post.tags.includes('design'))).toBe(true);
  expect(design.tags).toContainEqual({ name: 'design', count: design.total });

  const search = await list({ q: 'TYPOGRAPHY' });
  expect(search.posts.map((post) => post.title)).toEqual(['Typography for long reads']);

  const drafts = await list({ status: 'drafts' });
  expect(drafts.posts.every((post) => !post.published)).toBe(true);
  expect(drafts.total).toBe(2);
});

test('sorts by title', async () => {
  const { posts } = await list({ sort: 'title', status: 'all' });
  const titles = posts.map((post) => post.title.toLowerCase());
  expect(titles).toEqual([...titles].sort());
});

test('reads a post, counts a view, and deletes it', async () => {
  const { posts } = await list();
  const id = posts[0]!.id;
  const post = await readPost(id);
  expect(post.body).toContain('Slow refactors are the fast ones');
  expect(post.readingMinutes).toBeGreaterThanOrEqual(1);

  const before = await getReadingStats(id);
  await countView(id);
  await getReadingStats(id).refresh();
  expect((await getReadingStats(id)).views).toBe(before.views + 1);

  await removePost(id);
  // A query this test has not read yet, so not an answer from the client's cache.
  const all = await list({ status: 'all' });
  expect(all.posts.map((post) => post.id)).not.toContain(id);
  await expect(removePost(id)).rejects.toMatchObject({ status: 404 });
});

test('a post that does not exist is a 404', async () => {
  await expect(readPost(999)).rejects.toMatchObject({ status: 404 });
});

test('search matches % and _ literally', async () => {
  expect((await list({ q: '%' })).total).toBe(0);
  expect((await list({ q: '_' })).total).toBe(0);
  await resetDb([
    { title: '100% done', body: '' },
    { title: 'snake_case names', body: '' },
  ]);
  expect((await list({ q: '0%' })).posts.map((post) => post.title)).toEqual(['100% done']);
  expect((await list({ q: 'e_c' })).posts.map((post) => post.title)).toEqual(['snake_case names']);
});

test('the live count sees an older draft that gets published', async () => {
  // The draft has a lower id than the published post the reader sees.
  const [draft] = await resetDb([
    { title: 'Written first, published later', body: '', published: false },
    { title: 'Published first', body: '', createdAt: new Date('2026-10-01T09:00:00Z') },
  ]);
  const { lastPublishedAt } = await list({ q: 'Published first' });
  const fresh = watchNewPosts(lastPublishedAt);
  await expect.poll(() => fresh.current).toBe(0);

  await db
    .update(posts)
    .set({ published: true, publishedAt: new Date() })
    .where(eq(posts.id, draft!.id));
  await expect.poll(() => fresh.current).toBe(1);
});
