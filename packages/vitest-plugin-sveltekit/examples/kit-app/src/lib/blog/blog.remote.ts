import { command, form, getRequestEvent, query } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';
import {
  and,
  arrayContains,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  max,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import * as v from 'valibot';

import { LIVE_POLL_MS } from '$app/env/private';
import {
  listParamsSchema,
  PAGE_SIZE,
  postFields,
  type PostDetail,
  type PostPage,
  type ReadingStats,
  type TagCount,
  toSummary,
} from '#lib/blog/posts.ts';
import { db } from '#lib/server/db.ts';
import { sleep } from '#lib/server/sleep.ts';
import { posts, postStats } from '#lib/server/schema.ts';

/** One page of posts, with the filters of the home page. */
export const listPosts = query(listParamsSchema, async ({ q, tag, sort, status, page }) => {
  const filters: SQL[] = [];
  if (status === 'published') filters.push(eq(posts.published, true));
  if (status === 'drafts') filters.push(eq(posts.published, false));
  if (tag) filters.push(arrayContains(posts.tags, [tag]));
  if (q) filters.push(or(ilike(posts.title, `%${like(q)}%`), ilike(posts.body, `%${like(q)}%`))!);
  const where = filters.length ? and(...filters) : undefined;

  const order =
    sort === 'title'
      ? [asc(sql`lower(${posts.title})`), asc(posts.id)]
      : sort === 'oldest'
        ? [asc(posts.createdAt), asc(posts.id)]
        : [desc(posts.createdAt), desc(posts.id)];

  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(posts).where(where);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = await db
    .select()
    .from(posts)
    .where(where)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((Math.min(page, pageCount) - 1) * PAGE_SIZE);

  const [{ lastPublishedAt } = { lastPublishedAt: null }] = await db
    .select({ lastPublishedAt: max(posts.publishedAt) })
    .from(posts)
    .where(eq(posts.published, true));

  const result: PostPage = {
    posts: rows.map(toSummary),
    total,
    page: Math.min(page, pageCount),
    pageCount,
    lastPublishedAt: lastPublishedAt?.getTime() ?? 0,
    tags: await tagCounts(),
  };
  return result;
});

/** A whole post, drafts included. */
export const readPost = query(v.pipe(v.number(), v.integer()), async (id): Promise<PostDetail> => {
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) error(404, 'This post does not exist, or it was deleted.');
  return { ...toSummary(post), body: post.body };
});

/** Views and likes, one request for every post on the page. */
export const getReadingStats = query.batch(v.number(), async (ids) => {
  const rows = await db.select().from(postStats).where(inArray(postStats.postId, ids));
  const byId = new Map(rows.map(({ postId, views, likes }) => [postId, { views, likes }]));
  return (id): ReadingStats => byId.get(id) ?? { views: 0, likes: 0 };
});

/** Counts a visit of the post page. */
export const countView = command(v.number(), async (id) => {
  await db
    .insert(postStats)
    .values({ postId: id, views: 1 })
    .onConflictDoUpdate({ target: postStats.postId, set: { views: sql`${postStats.views} + 1` } });
  await getReadingStats(id).refresh();
});

export const publishPost = form(v.object(postFields), async (post, issue) => {
  if (await titleTaken(post.title)) invalid(issue.title('A post with this title exists'));
  const publishedAt = post.published ? new Date() : null;
  const [{ id }] = (await db
    .insert(posts)
    .values({ ...post, publishedAt })
    .returning({ id: posts.id })) as [{ id: number }];
  await db.insert(postStats).values({ postId: id });
  redirect(303, `/posts/${id}`);
});

export const editPost = form(
  v.object({ id: v.number(), ...postFields }),
  async ({ id, ...post }, issue) => {
    if (await titleTaken(post.title, id)) invalid(issue.title('A post with this title exists'));
    const updated = await db
      .update(posts)
      .set({
        ...post,
        updatedAt: new Date(),
        // A draft that gets published counts as new; an edit of a published post does not.
        publishedAt: post.published ? sql`coalesce(${posts.publishedAt}, ${new Date()})` : null,
      })
      .where(eq(posts.id, id))
      .returning({ id: posts.id });
    if (updated.length === 0) error(404, 'This post does not exist, or it was deleted.');
    redirect(303, `/posts/${id}`);
  }
);

export const removePost = command(v.number(), async (id) => {
  const deleted = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
  if (deleted.length === 0) error(404, 'This post does not exist, or it was deleted.');
});

/**
 * How many posts were published after `since` (ms since 1970), sent again when the number changes.
 * It counts publications, not new rows: a draft written earlier and published now counts too.
 */
export const watchNewPosts = query.live(v.number(), async function* (since) {
  const { signal } = getRequestEvent().request;
  let last = -1;
  while (!signal.aborted) {
    const [{ value } = { value: 0 }] = await db
      .select({ value: count() })
      .from(posts)
      .where(
        and(
          eq(posts.published, true),
          // Postgres keeps microseconds, `since` has milliseconds.
          gt(sql`date_trunc('milliseconds', ${posts.publishedAt})`, new Date(since))
        )
      );
    if (value !== last) {
      last = value;
      yield value;
    }
    await sleep(LIVE_POLL_MS, signal);
  }
});

/** `text` for an `ILIKE` pattern: its `%`, `_` and backslashes match only themselves. */
function like(text: string): string {
  return text.replace(/[%_\\]/g, '\\$&');
}

async function titleTaken(title: string, except?: number): Promise<boolean> {
  const [match] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(ilike(posts.title, like(title)));
  return match !== undefined && match.id !== except;
}

async function tagCounts(): Promise<TagCount[]> {
  const rows = await db
    .select({ name: sql<string>`unnest(${posts.tags})`.as('name'), count: count() })
    .from(posts)
    .where(eq(posts.published, true))
    .groupBy(sql`name`)
    .orderBy(desc(count()), asc(sql`name`));
  return rows;
}
