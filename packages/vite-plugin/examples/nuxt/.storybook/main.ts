import type { StorybookConfig } from '@storybook/vue3-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.ts'],
  addons: [],
  // Server docgen blocks the first story teardown and races the preview's HMR re-render upstream.
  features: { docgenServer: false },
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      docgen: 'vue-component-meta',
    },
  },
  // Nuxt rewrites its build output on every change; the preview must not react to it.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, { server: { watch: { ignored: ['**/.nuxt/**', '**/.output/**'] } } }),
};

export default config;
