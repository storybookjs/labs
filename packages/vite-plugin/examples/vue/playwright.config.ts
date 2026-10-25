import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests',
  outputDir: './test-results',
  timeout: (process.env.CI ? 90 : 45) * 1000,
  expect: { timeout: 15_000 },
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
      name: 'embedded',
      testMatch: /embedded\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5183' },
    },
    {
      name: 'storybook-mode',
      testMatch: /storybook-mode\.spec\.ts/,
      use: { baseURL: 'http://127.0.0.1:5185' },
    },
  ],
  webServer: [
    {
      command: 'pnpm run dev --host 127.0.0.1 --strictPort',
      cwd: import.meta.dirname,
      env: { STORYBOOK_DISABLE_TELEMETRY: '1' },
      url: 'http://127.0.0.1:5183/__storybook/index.json',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm run storybook --host 127.0.0.1 --strictPort',
      cwd: import.meta.dirname,
      env: { STORYBOOK_DISABLE_TELEMETRY: '1' },
      url: 'http://127.0.0.1:5185/index.json',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
