import vue from '@vitejs/plugin-vue';
import {
  experimental_vitePlugin,
  type experimental_VitePluginUserOptions,
} from '@storybook/vue3-vite/node';
import { defineConfig } from 'vite';

const STORYBOOK_OPTIONS = {
  configDir: '.storybook',
  base: '/__storybook',
  outputDir: './storybook-static',
} satisfies experimental_VitePluginUserOptions;

export default defineConfig({
  plugins: [vue(), experimental_vitePlugin(STORYBOOK_OPTIONS)],
});
