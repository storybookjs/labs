import { command, form, getRequestEvent, prerender, query, requested } from '$app/server';
import { error, invalid } from '@sveltejs/kit';
import { asc, count, desc, eq, inArray } from 'drizzle-orm';
import * as v from 'valibot';

import { LIVE_POLL_MS } from '$app/env/private';
import { db } from '#lib/server/db.ts';
import { posts, postStats } from '#lib/server/schema.ts';

export const getPosts = query(v.optional(v.picklist(['newest', 'oldest']), 'newest'), (order) =>
  db
    .select()
    .from(posts)
    .orderBy(order === 'newest' ? desc(posts.id) : asc(posts.id))
);

export const createPost = form(
  v.object({
    title: v.pipe(v.string(), v.trim(), v.nonEmpty('Title is required')),
    body: v.optional(v.string(), ''),
  }),
  async ({ title, body }, issue) => {
    if (title.length < 3) invalid(issue.title('Title must be at least 3 characters'));

    const [duplicate] = await db.select().from(posts).where(eq(posts.title, title));
    if (duplicate) invalid(issue.title('A post with this title exists'));

    const [post] = await db.insert(posts).values({ title, body }).returning();
    return post!;
  }
);

export const deletePost = command(v.number(), async (id) => {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) error(404, `Post ${id} not found`);

  // After an `await`: the request event is still there.
  const { locals } = getRequestEvent();
  if (!locals.user) error(403, 'Sign in to delete posts');

  await db.delete(posts).where(eq(posts.id, id));
  await requested(getPosts, 5).refreshAll();
});

export const getPost = prerender(
  v.number(),
  async (id) => {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post ?? error(404, `Post ${id} not found`);
  },
  {
    inputs: async () => (await db.select({ id: posts.id }).from(posts)).map(({ id }) => id),
    dynamic: true,
  }
);

export const getStats = query.batch(v.number(), async (ids) => {
  const rows = await db.select().from(postStats).where(inArray(postStats.postId, ids));
  const byId = new Map(rows.map(({ postId, views, likes }) => [postId, { views, likes }]));
  return (id) => byId.get(id) ?? { views: 0, likes: 0 };
});

export const getPostCount = query.live(async function* () {
  const { signal } = getRequestEvent().request;
  while (!signal.aborted) {
    const [row] = await db.select({ value: count() }).from(posts);
    yield row?.value ?? 0;
    await sleep(LIVE_POLL_MS, signal);
  }
});

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}
