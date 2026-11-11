import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
  /** Where PGlite keeps the app's database. Not read in stories and tests (the db is mocked). */
  DATABASE_DIR: {
    schema: v.optional(v.string(), '.pglite'),
  },
});
