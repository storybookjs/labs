import { getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';

import { LIVE_POLL_MS } from '$app/env/private';
import { checkFeed, type Feed } from '#lib/feed.ts';
import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';

/** The post count and the latest three posts, sent again whenever they change. */
export const getFeed = query.live(async function* () {
  const { signal } = getRequestEvent().request;
  let last = '';
  while (!signal.aborted) {
    const feed = await readFeed();
    const json = JSON.stringify(feed);
    if (json !== last) {
      last = json;
      yield feed;
    }
    await sleep(LIVE_POLL_MS, signal);
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
