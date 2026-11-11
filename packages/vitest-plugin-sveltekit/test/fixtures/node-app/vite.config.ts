import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// The built package, as an app would install it.
import { vitestPluginSvelteKit } from '../../../dist/vite.mjs';

export default defineConfig({
  plugins: [sveltekit({ experimental: { remoteFunctions: true } }), vitestPluginSvelteKit()],
  test: {
    environment: 'node',
    include: ['tests/*.node.test.ts'],
    setupFiles: ['../../../dist/vitest.mjs'],
  },
});
