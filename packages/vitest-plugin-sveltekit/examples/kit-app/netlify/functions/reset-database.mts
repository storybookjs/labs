// Puts the posts, their stats and the view counts back to the seed every night, so what visitors
// changed on the public demo does not stay. Netlify runs scheduled functions on the published
// production deploy only, never on deploy previews.
import { netlifyDatabaseUrl, openPool, prepareDatabase } from '../../src/lib/server/postgres.ts';

export default async function resetDatabase(): Promise<void> {
  const url = netlifyDatabaseUrl();
  if (!url) throw new Error('This site has no Netlify Database');
  const pool = openPool(url);
  try {
    await prepareDatabase(pool, { reset: true });
  } finally {
    await pool.end();
  }
}

/** Every day at 03:00 UTC. */
export const config = { schedule: '0 3 * * *' };
