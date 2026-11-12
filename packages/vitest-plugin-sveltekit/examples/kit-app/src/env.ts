import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
  /** Where PGlite keeps the app's database. Not read in stories and tests (the db is mocked). */
  DATABASE_DIR: {
    schema: v.optional(v.string(), '.pglite'),
  },
  /**
   * Stands in for a real secret, such as the key of an API the posts could come from. The app does
   * not read it. Stories and tests get the value from the plugin's `env` option, never from `.env`.
   */
  API_TOKEN: {
    schema: v.optional(v.string()),
  },
});
