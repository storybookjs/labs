import { experimental_vitePlugin } from '@storybook/angular-vite/node';
import { defineConfig } from 'vite';

import { STORYBOOK_BASE, STORYBOOK_CONFIG_DIR } from './tools/builders/storybook-middleware.js';

// `ng serve` mounts Storybook through the builder's middleware; this config only serves the
// Vite-driven modes, `vite --mode storybook` and `vite build --mode storybook`.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [experimental_vitePlugin({ configDir: STORYBOOK_CONFIG_DIR, base: STORYBOOK_BASE })],
});
