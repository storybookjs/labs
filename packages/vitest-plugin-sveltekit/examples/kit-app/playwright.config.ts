import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const env = { STORYBOOK_DISABLE_TELEMETRY: '1' };

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
      name: 'storybook-dev',
      testMatch: /(storybook|live-panel)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:6106' },
    },
    {
      name: 'storybook-static',
      testMatch: /(storybook|live-panel)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:6107' },
    },
    {
      name: 'vitest',
      testMatch: /vitest\.spec\.ts/,
    },
  ],
  webServer: [
    {
      command: 'pnpm exec storybook dev --port 6106 --host 127.0.0.1 --ci',
      cwd: import.meta.dirname,
      env,
      url: 'http://127.0.0.1:6106/index.json',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm exec storybook build --quiet && node e2e-tests/serve-static.mjs',
      cwd: import.meta.dirname,
      // A shell value that `.env` copies into an undeclared key: the build must leave it out.
      env: { ...env, PORT: '6107', E2E_SHELL_CANARY: 'shell-canary-8b3f' },
      url: 'http://127.0.0.1:6107/index.json',
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
