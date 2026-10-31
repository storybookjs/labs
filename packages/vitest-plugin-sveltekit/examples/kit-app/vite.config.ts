import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { vitestPluginSvelteKit } from '@storybookjs/vitest-plugin-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// A function: Vitest writes the project name into the instances, so projects cannot share them.
const browser = () => ({
  enabled: true,
  headless: true,
  // `gc()` lets a test check what happens when a remote function's proxy is collected.
  provider: playwright({ launchOptions: { args: ['--js-flags=--expose-gc'] } }),
  instances: [{ browser: 'chromium' as const }],
});

export default defineConfig({
  plugins: [
    sveltekit({
      experimental: { remoteFunctions: true },
      compilerOptions: { experimental: { async: true } },
    }),
  ],
  optimizeDeps: {
    // PGlite loads its WebAssembly next to its own module, which pre-bundling would move.
    exclude: ['@electric-sql/pglite'],
  },
  test: {
    projects: [
      {
        // Every remote function is a mock (the default).
        extends: true,
        plugins: [vitestPluginSvelteKit()],
        test: {
          name: 'components',
          // Catches a second copy of `expect` (for example `storybook/test`'s) in the test page.
          expect: { requireAssertions: true },
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.server.test.ts'],
          browser: browser(),
          setupFiles: ['@storybookjs/vitest-plugin-sveltekit/vitest'],
        },
      },
      {
        // Server mode: the real remote functions run, on the mocked database.
        extends: true,
        plugins: [vitestPluginSvelteKit({ server: true })],
        test: {
          name: 'server',
          expect: { requireAssertions: true },
          include: ['src/**/*.server.test.ts'],
          browser: browser(),
          setupFiles: [
            '@storybookjs/vitest-plugin-sveltekit/vitest',
            './src/vitest-server.setup.ts',
          ],
        },
      },
      {
        // The stories, with the server mode plugin from `.storybook/main.ts`.
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: { name: 'storybook', browser: browser() },
      },
    ],
  },
});
