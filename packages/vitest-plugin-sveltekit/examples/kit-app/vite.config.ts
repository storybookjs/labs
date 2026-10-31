import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { vitestPluginSvelteKit } from '@storybookjs/vitest-plugin-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// A function: Vitest writes the project name into the instances, so projects cannot share them.
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const }],
});

export default defineConfig({
  plugins: [
    sveltekit({
      experimental: { remoteFunctions: true },
      compilerOptions: { experimental: { async: true } },
    }),
    // Only active in Vitest and Storybook, so `vite dev` keeps the real remote functions.
    vitestPluginSvelteKit(),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'components',
          // Catches a second copy of `expect` (for example `storybook/test`'s) in the test page.
          expect: { requireAssertions: true },
          include: ['src/**/*.test.ts'],
          browser: browser(),
          setupFiles: ['@storybookjs/vitest-plugin-sveltekit/vitest'],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: { name: 'storybook', browser: browser() },
      },
    ],
  },
});
