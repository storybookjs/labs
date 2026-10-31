import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const env = { STORYBOOK_DISABLE_TELEMETRY: '1' };

// Ports from the environment, or free ones picked once here. Playwright's workers inherit the
// environment of this process, so they see the same ports.
const portNames = ['E2E_APP_PORT', 'E2E_STORYBOOK_PORT', 'E2E_STORYBOOK_STATIC_PORT'] as const;
if (portNames.some((name) => !process.env[name])) {
  const free = freePorts(portNames.length);
  portNames.forEach((name, index) => (process.env[name] ??= String(free[index])));
}
const [appPort, storybookPort, staticPort] = portNames.map((name) => process.env[name]!);

// Only the servers of the projects on the command line (`--project app`), or all of them.
const selected = process.argv.flatMap((arg, index, args) =>
  arg === '--project' ? [args[index + 1]] : arg.startsWith('--project=') ? [arg.slice(10)] : []
);
const wants = (project: string) => selected.length === 0 || selected.includes(project);

/** Ports the system has free right now. */
function freePorts(count: number): number[] {
  const script = `
    const net = require('node:net');
    const servers = Array.from({ length: ${count} }, () => net.createServer());
    Promise.all(servers.map((server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))))
      .then(() => {
        console.log(servers.map((server) => server.address().port).join(' '));
        servers.forEach((server) => server.close());
      });
  `;
  return execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
    .trim()
    .split(' ')
    .map(Number);
}

export default defineConfig({
  testDir: './e2e-tests',
  outputDir: './test-results',
  timeout: (process.env.CI ? 300 : 240) * 1000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['line'],
    ...(process.env.CI
      ? ([
          ['junit', { outputFile: path.join(import.meta.dirname, 'test-results', 'e2e.xml') }],
        ] as const)
      : []),
  ],
  // The first server mode story compiles the server code (drizzle, PGlite) in `storybook dev`.
  expect: { timeout: 15_000 },
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'app',
      testDir: './e2e-tests/app',
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${appPort}` },
    },
    {
      name: 'storybook-dev',
      testMatch: /(storybook|live-panel)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${storybookPort}` },
    },
    {
      name: 'storybook-static',
      testMatch: /(storybook|live-panel)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${staticPort}` },
    },
    {
      name: 'vitest',
      testMatch: /vitest\.spec\.ts/,
    },
  ],
  webServer: [
    ...(wants('app')
      ? [
          {
            // A production build on a fresh database (`serve-app.mjs`).
            command: 'pnpm exec vp build && node e2e-tests/app/serve-app.mjs',
            cwd: import.meta.dirname,
            env: { PORT: appPort },
            url: `http://127.0.0.1:${appPort}/`,
            timeout: 180_000,
            reuseExistingServer: false,
            // SIGTERM, not SIGKILL: `serve-app.mjs` deletes its temporary database folder.
            gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5_000 },
          },
        ]
      : []),
    ...(wants('storybook-dev')
      ? [
          {
            command: `pnpm exec storybook dev --port ${storybookPort} --host 127.0.0.1 --ci`,
            cwd: import.meta.dirname,
            env,
            url: `http://127.0.0.1:${storybookPort}/index.json`,
            timeout: 120_000,
            reuseExistingServer: false,
          },
        ]
      : []),
    ...(wants('storybook-static')
      ? [
          {
            command: 'pnpm exec storybook build --quiet && node e2e-tests/serve-static.mjs',
            cwd: import.meta.dirname,
            // A shell value that `.env` copies into an undeclared key: the build must leave it out.
            env: { ...env, PORT: staticPort, E2E_SHELL_CANARY: 'shell-canary-8b3f' },
            url: `http://127.0.0.1:${staticPort}/index.json`,
            timeout: 300_000,
            reuseExistingServer: false,
          },
        ]
      : []),
  ],
});
