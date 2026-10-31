// Replaces `../db.ts` in stories and tests: the same drizzle API on PGlite in memory, in the
// browser. Seed it in `beforeEach` with `resetDb()`.
// Storybook loads this file under the path of `../db.ts`, so imports use `#lib/...`, not `../`.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '#lib/server/schema.ts';

export type { NewPost, Post, PostStats } from '#lib/server/schema.ts';

const client = new PGlite();
await client.exec(schema.createTables);

let queries = 0;
let down = false;

export const db = drizzle(client, {
  schema,
  logger: {
    logQuery() {
      queries++;
      // drizzle logs a query before it runs it, so this stops the query.
      if (down) throw new Error('connect ECONNREFUSED (mocked outage)');
    },
  },
});

/** Makes every query fail until it is turned off again, like a database that is down. */
export function setDatabaseDown(value: boolean): void {
  down = value;
}

/** How many queries ran, to check that nothing keeps polling after a story or test. */
export function queryCount(): number {
  return queries;
}

/** Empties the database and inserts `posts`, with stats when given. Ends a mocked outage. */
export async function resetDb(
  posts: Array<schema.NewPost & { views?: number; likes?: number }> = []
): Promise<schema.Post[]> {
  down = false;
  await client.exec('TRUNCATE posts, post_stats RESTART IDENTITY CASCADE');
  if (posts.length === 0) return [];

  const inserted = await db
    .insert(schema.posts)
    .values(posts.map(({ title, body }) => ({ title, body })))
    .returning();
  await db.insert(schema.postStats).values(
    inserted.map((post, index) => ({
      postId: post.id,
      views: posts[index]?.views ?? 0,
      likes: posts[index]?.likes ?? 0,
    }))
  );
  return inserted;
}
