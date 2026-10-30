// The app's database: PGlite on disk, through drizzle. Stories and tests replace this module with
// `__mocks__/db.ts` (`sb.mock` in `.storybook/preview.ts`, `vi.mock` in `src/vitest-server.setup.ts`).
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { DATABASE_DIR } from '$app/env/private';

import * as schema from './schema.ts';

export type { NewPost, Post, PostStats } from './schema.ts';

const client = new PGlite(DATABASE_DIR);
await client.exec(schema.createTables);

export const db = drizzle(client, { schema });

if ((await db.$count(schema.posts)) === 0) {
  const inserted = await db
    .insert(schema.posts)
    .values([
      { title: 'Hello SvelteKit', body: 'Remote functions are typed RPC.' },
      { title: 'Stories for everything', body: 'Mock the data, keep the component.' },
    ])
    .returning();
  await db
    .insert(schema.postStats)
    .values(inserted.map((post) => ({ postId: post.id, views: post.id * 10, likes: post.id })));
}
