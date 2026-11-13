// The app's database, through drizzle:
// - on Netlify, the site's Netlify Database (Postgres), with `pg`;
// - everywhere else, PGlite in a folder on disk (`DATABASE_DIR`, default `.pglite`).
// Both get the same schema and seed, and both can `LISTEN` for the live queries (`changes.ts`).
// Stories and tests replace this module with `__mocks__/db.ts` (`sb.mock` in
// `.storybook/preview.ts`, `vi.mock` in `src/vitest-server.setup.ts`).
import { PGlite } from '@electric-sql/pglite';
import { getConnectionString, MissingDatabaseConnectionError } from '@netlify/database';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import pg from 'pg';

import { building } from '$app/env';
import { DATABASE_DIR } from '$app/env/private';

import * as schema from './schema.ts';
import { postRows, seedPosts, statsRows } from './seed.ts';

export type { NewPost, Post, PostStats } from './schema.ts';

/** Calls `callback` on each `NOTIFY` on `channel`, until the returned function runs. */
type Listen = (channel: string, callback: () => void) => Promise<() => Promise<void>>;

type Database = PgDatabase<PgQueryResultHKT, typeof schema> & { $client: { listen: Listen } };

/** Netlify sets `NETLIFY_DB_URL` in builds and functions of a site with a Netlify Database. */
function netlifyDatabaseUrl(): string | undefined {
  try {
    return getConnectionString();
  } catch (error) {
    if (error instanceof MissingDatabaseConnectionError) return undefined;
    throw error;
  }
}

const url = netlifyDatabaseUrl();
// `vp build` imports the server code to analyse it, but runs no query. Netlify builds have
// `NETLIFY_DB_URL` too, and a build must not write to a database.
export const db: Database = building
  ? (undefined as never)
  : url
    ? await openPostgres(url)
    : await openPGlite(DATABASE_DIR);

async function openPGlite(dir: string): Promise<Database> {
  const client = new PGlite(dir);
  await client.exec(schema.createTables);
  const db = drizzlePglite(client, { schema });
  await seed(db);
  return db;
}

async function openPostgres(url: string): Promise<Database> {
  // `pg` reads `sslmode=require` as `verify-full` and warns; say so, as `@netlify/database` does.
  const pool = new pg.Pool({
    connectionString: url.replace('sslmode=require', 'sslmode=verify-full'),
  });
  // An idle client that the server closes (Netlify Database sleeps when idle) must not crash the
  // function. The pool drops it and connects again on the next query.
  pool.on('error', () => {});

  // Each new function instance runs the schema and the seed. A lock keeps two instances that start
  // together from both seeding.
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [schema.POSTS_CHANGED]);
    await client.query(schema.createTables);
    await seed(drizzlePg(client, { schema }));
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [schema.POSTS_CHANGED]);
    client.release();
  }

  // PGlite's `listen`, on a client of its own: a `LISTEN` belongs to one connection.
  const listen: Listen = async (channel, callback) => {
    const client = await pool.connect();
    const notify = (message: pg.Notification) => {
      if (message.channel === channel) callback();
    };
    // A lost connection hears nothing more. Wake the reader, so it reads (and fails) at once.
    const lost = () => callback();
    client.on('notification', notify);
    client.on('error', lost);
    await client.query(`LISTEN ${client.escapeIdentifier(channel)}`);
    return async () => {
      client.off('notification', notify);
      try {
        await client.query(`UNLISTEN ${client.escapeIdentifier(channel)}`);
        client.release();
      } catch (error) {
        client.release(error as Error);
      } finally {
        client.off('error', lost);
      }
    };
  };

  return Object.assign(drizzlePg(pool, { schema }), { $client: Object.assign(pool, { listen }) });
}

/** A new database starts with the example posts. */
async function seed(db: PgDatabase<PgQueryResultHKT, typeof schema>): Promise<void> {
  if ((await db.$count(schema.posts)) > 0) return;
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
