import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';

import { checkFeed, type Feed } from '#lib/feed.ts';
import { postsChanges } from '#lib/server/changes.ts';
import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';

/** The post count and the latest three posts, sent again whenever they change. */
export const getFeed = query.live(async function* () {
  let last = '';
  for await (const _ of postsChanges(getRequestEvent().request.signal)) {
    const feed = await readFeed();
    const json = JSON.stringify(feed);
    if (json !== last) {
      last = json;
      yield feed;
    }
  }
});

async function readFeed(): Promise<Feed> {
  let rows;
  try {
    rows = await db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .orderBy(desc(posts.id));
  } catch {
    error(503, 'The database is unavailable');
  }
  return checkFeed({ count: rows.length, latest: rows.slice(0, 3) });
}
