import {
  experimental_vitePlugin,
  type experimental_VitePluginUserOptions,
} from '@storybook/vue3-vite/node';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  telemetry: false,
  // Stories belong to Storybook; keep them out of Nuxt's component and page scanning.
  ignore: ['**/*.stories.ts'],
  hooks: {
    'vite:serverCreated'(server) {
      server.config.plugins?.push(
        experimental_vitePlugin({
          base: '/__storybook/',
          hmrPath: '/__storybook_hmr',
        } as experimental_VitePluginUserOptions)
      );
    },
  },
});
