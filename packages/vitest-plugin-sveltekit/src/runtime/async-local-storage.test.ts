import { expect, it } from 'vite-plus/test';

import { AsyncLocalStorage } from './async-local-storage.ts';

it('keeps the store after an await', async () => {
  const storage = new AsyncLocalStorage<string>();

  const result = await storage.run(
    'request',
    async (suffix: string) => {
      await Promise.resolve();
      return `${storage.getStore()}${suffix}`;
    },
    '!'
  );

  expect(result).toBe('request!');
  expect(storage.getStore()).toBe('request');

  storage.disable();
  expect(storage.getStore()).toBeUndefined();
});
