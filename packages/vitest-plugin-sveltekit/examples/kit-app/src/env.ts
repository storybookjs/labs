import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
  /** Where PGlite keeps the app's database. Not read in stories and tests (the db is mocked). */
  DATABASE_DIR: {
    schema: v.optional(v.string(), '.pglite'),
  },
  /** How often `getPostCount` polls the database, in milliseconds. */
  LIVE_POLL_MS: {
    schema: v.pipe(v.optional(v.string(), '1000'), v.transform(Number), v.integer()),
  },
});
