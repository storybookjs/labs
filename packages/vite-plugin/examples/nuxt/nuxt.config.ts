import path from 'node:path';

import { experimental_vitePlugin } from '@storybookjs/vite-plugin';

const STORYBOOK_BASE = '/__storybook';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  telemetry: false,
  // Stories belong to Storybook; keep them out of Nuxt's component and page scanning.
  ignore: ['**/*.stories.ts'],
  modules: [
    (_options, nuxt): void => {
      if (!nuxt.options.dev) {
        return;
      }

      nuxt.hook('vite:extendConfig', (config: { plugins?: unknown[] }, { isClient }) => {
        if (isClient) {
          config.plugins?.push(
            experimental_vitePlugin({
              configDir: path.join(nuxt.options.rootDir, '.storybook'),
              base: STORYBOOK_BASE,
            })
          );
        }
      });
    },
  ],
});
