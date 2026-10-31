// The app's database: PGlite in a folder on disk (`DATABASE_DIR`, default `.pglite`), through
// drizzle. Stories and tests replace this module with `__mocks__/db.ts` (`sb.mock` in
// `.storybook/preview.ts`, `vi.mock` in `src/vitest-server.setup.ts`).
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { DATABASE_DIR } from '$app/env/private';

import * as schema from './schema.ts';
import { postRows, seedPosts, statsRows } from './seed.ts';

export type { NewPost, Post, PostStats } from './schema.ts';

const client = new PGlite(DATABASE_DIR);
await client.exec(schema.createTables);

export const db = drizzle(client, { schema });

// A new database starts with the example posts.
if ((await db.$count(schema.posts)) === 0) {
  const inserted = await db
    .insert(schema.posts)
    .values(postRows(seedPosts))
    .returning({ id: schema.posts.id });
  await db.insert(schema.postStats).values(
    statsRows(
      inserted.map(({ id }) => id),
      seedPosts
    )
  );
}
