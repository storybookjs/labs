import { describe, expect, it } from 'vite-plus/test';

import { formatServerBuildReport, serverBuildReport } from './report.ts';

const root = '/app';
const options = {
  root,
  serverHooks: '/app/src/hooks.server.ts',
  isEnvConfig: (file: string) => file === '/app/.svelte-kit/generated/build/env/config.js',
  privateEnvKeys: ['API_TOKEN'],
};

describe('serverBuildReport', () => {
  it('lists the remote server copies, the hooks, server-only modules and private env keys', () => {
    const report = serverBuildReport(
      [
        '/app/src/lib/posts.remote.ts?server',
        '/app/src/lib/posts.remote.ts',
        '/app/src/lib/blog/blog.remote.ts?server',
        '/app/src/lib/admin.remote.ts',
        '/app/src/hooks.server.ts',
        '/app/src/lib/server/db.ts',
        '/app/src/lib/auth.server.ts',
        '/app/src/lib/blog/posts.ts',
        '/app/node_modules/drizzle-orm/index.js',
        '/app/.svelte-kit/generated/build/env/config.js',
        '\0virtual:vitest-plugin-sveltekit/app',
      ],
      options
    );

    expect(report).toEqual({
      remoteFiles: ['src/lib/blog/blog.remote.ts', 'src/lib/posts.remote.ts'],
      serverHooks: 'src/hooks.server.ts',
      serverModules: ['src/lib/auth.server.ts', 'src/lib/server/db.ts'],
      privateEnvKeys: ['API_TOKEN'],
    });
  });

  it('lists no env keys when the env config is not in the build', () => {
    expect(serverBuildReport(['/app/src/lib/posts.remote.ts'], options)).toEqual({
      remoteFiles: [],
      serverHooks: null,
      serverModules: [],
      privateEnvKeys: [],
    });
  });
});

describe('formatServerBuildReport', () => {
  it('prints one scannable block, with names only', () => {
    expect(
      formatServerBuildReport({
        remoteFiles: ['src/lib/posts.remote.ts'],
        serverHooks: null,
        serverModules: ['src/lib/server/db.ts'],
        privateEnvKeys: [],
      })
    ).toBe(
      [
        '',
        '[vitest-plugin-sveltekit] Server code in this build (server mode):',
        '  Remote files with their server code (1):',
        '    src/lib/posts.remote.ts',
        '  Server hooks: none',
        '  Other server-only modules (1):',
        '    src/lib/server/db.ts',
        '  Private env keys with a value: none',
        '',
      ].join('\n')
    );
  });
});
