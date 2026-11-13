// The Netlify Database (Postgres) side of `db.ts`, shared with the nightly reset
// (`netlify/functions/reset-database.mts`). No `$app` imports: the reset runs outside SvelteKit.
import { getConnectionString, MissingDatabaseConnectionError } from '@netlify/database';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.ts';
import { seedIfEmpty } from './seed.ts';

/** The site's Netlify Database. Netlify sets `NETLIFY_DB_URL` in its builds and functions. */
export function netlifyDatabaseUrl(): string | undefined {
  try {
    return getConnectionString();
  } catch (error) {
    if (error instanceof MissingDatabaseConnectionError) return undefined;
    throw error;
  }
}

/**
 * The same database without Neon's connection pooler (the `-pooler` host). A `LISTEN` needs a
 * connection of its own: through the pooler, it hears no `NOTIFY`.
 */
export function directUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hostname = parsed.hostname.replace(/-pooler\./, '.');
  return parsed.toString();
}

export function openPool(url: string): pg.Pool {
  // `pg` reads `sslmode=require` as `verify-full` and warns; say so, as `@netlify/database` does.
  const pool = new pg.Pool({
    connectionString: url.replace('sslmode=require', 'sslmode=verify-full'),
  });
  // An idle client that the server closes (Netlify Database sleeps when idle) must not crash the
  // function. The pool drops it and connects again on the next query.
  pool.on('error', () => {});
  return pool;
}

/**
 * Runs the schema, empties the tables when `reset` is set, and seeds an empty database. In one
 * transaction, under a lock: two functions that start together don't both seed.
 */
export async function prepareDatabase(pool: pg.Pool, { reset = false } = {}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [schema.POSTS_CHANGED]);
    await client.query(schema.createTables);
    if (reset) await client.query('TRUNCATE posts, post_stats RESTART IDENTITY CASCADE');
    await seedIfEmpty(drizzle(client, { schema }));
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
