import { describe, expect, it } from 'vite-plus/test';

import { appModule } from './app.ts';

describe('appModule', () => {
  it('loads the server hooks lazily, and only in server mode', () => {
    const files = {
      serverHooks: '/app/src/hooks.server.ts',
      universalHooks: null,
      envEntry: null,
      envDir: '/app',
      outDir: '/app/.svelte-kit',
    };
    expect(appModule(files, true)).toContain(
      'export const loadServerHooks = () => import("/app/src/hooks.server.ts");'
    );
    expect(appModule({ ...files, serverHooks: null }, false)).toContain(
      'export const loadServerHooks = async () => ({});'
    );
  });
});
