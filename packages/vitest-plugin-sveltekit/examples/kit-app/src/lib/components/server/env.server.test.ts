import { expect, test } from 'vitest';

import { API_TOKEN, DATABASE_DIR } from '$app/env/private';

test('server code gets private values from the plugin’s `env`, never from `.env`', () => {
  // `.env` has `API_TOKEN=dot-env-secret-91f0`; `vite.config.ts` passes `test-token`.
  expect(API_TOKEN).toBe('test-token');
});

test('a private variable without a value gets its schema’s default', () => {
  expect(DATABASE_DIR).toBe('.pglite');
});
