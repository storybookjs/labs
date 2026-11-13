// The app's database, through drizzle:
// - on Netlify, the site's Netlify Database (Postgres), with `pg` (`postgres.ts`);
// - everywhere else, PGlite in a folder on disk (`DATABASE_DIR`, default `.pglite`).
// Both get the same schema and seed, and both can `LISTEN` for the live queries (`changes.ts`).
// Stories and tests replace this module with `__mocks__/db.ts` (`sb.mock` in
// `.storybook/preview.ts`, `vi.mock` in `src/vitest-server.setup.ts`).
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type pg from 'pg';

import { building } from '$app/env';
import { DATABASE_DIR } from '$app/env/private';

import { directUrl, netlifyDatabaseUrl, openPool, prepareDatabase } from './postgres.ts';
import * as schema from './schema.ts';
import { seedIfEmpty } from './seed.ts';

export type { NewPost, Post, PostStats } from './schema.ts';

/** Calls `callback` on each `NOTIFY` on `channel`, until the returned function runs. */
type Listen = (channel: string, callback: () => void) => Promise<() => Promise<void>>;

type Database = PgDatabase<PgQueryResultHKT, typeof schema> & { $client: { listen: Listen } };

const url = netlifyDatabaseUrl();
// `vp build` prerenders `getPost` (`posts.remote.ts`) from the seed, in memory. Netlify builds have
// `NETLIFY_DB_URL` too, and a build must not write to a real database.
export const db: Database = building
  ? await openPGlite()
  : url
    ? await openPostgres(url)
    : await openPGlite(DATABASE_DIR);

/** PGlite in `dir`, or in memory without one. */
async function openPGlite(dir?: string): Promise<Database> {
  const client = new PGlite(dir);
  await client.exec(schema.createTables);
  const db = drizzlePglite(client, { schema });
  await seedIfEmpty(db);
  return db;
}

async function openPostgres(url: string): Promise<Database> {
  const pool = openPool(url);
  // Each new function instance runs the schema, and seeds an empty database.
  await prepareDatabase(pool);

  // TEMP: is the runtime URL pooled? Host names only.
  console.info('db hosts', new URL(url).hostname, new URL(directUrl(url)).hostname);
  // PGlite's `listen`, on a client of its own: a `LISTEN` belongs to one connection, past the pooler.
  const listeners = openPool(directUrl(url));
  const listen: Listen = async (channel, callback) => {
    const client = await listeners.connect();
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
