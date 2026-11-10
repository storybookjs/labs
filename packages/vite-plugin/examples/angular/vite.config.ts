import { join } from 'node:path';

import { experimental_vitePlugin } from '@storybook/vite-plugin';
import { defineConfig } from 'vite';

// `ng serve` mounts Storybook through the `@storybook/vite-plugin:dev-server` builder; this
// config only serves the Vite-driven modes, `vite --mode storybook` and `vite build --mode storybook`.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [experimental_vitePlugin({ configDir: join(import.meta.dirname, '.storybook') })],
});
