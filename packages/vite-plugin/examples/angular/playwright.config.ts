import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  outputDir: './test-results',
  timeout: (process.env.CI ? 120 : 90) * 1000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'middleware-host',
      testMatch: /middleware-host\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5203' },
    },
    {
      name: 'storybook-mode',
      testMatch: /storybook-mode\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5205' },
    },
  ],
  webServer: [
    {
      command: 'pnpm run dev',
      cwd: import.meta.dirname,
      env: { STORYBOOK_DISABLE_TELEMETRY: '1' },
      url: 'http://127.0.0.1:5203/__storybook/index.json',
      reuseExistingServer: false,
      timeout: 180_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm run storybook',
      cwd: import.meta.dirname,
      env: { STORYBOOK_DISABLE_TELEMETRY: '1' },
      url: 'http://127.0.0.1:5205/index.json',
      reuseExistingServer: false,
      timeout: 180_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
  ],
});
