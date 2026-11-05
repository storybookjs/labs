import { defineConfig } from 'vite-plus';

import pkg from './package.json' with { type: 'json' };

const define = {
  __STORYBOOK_VITE_PLUGIN_VERSION__: JSON.stringify(pkg.version),
};

export default defineConfig({
  define,
  pack: {
    entry: ['src/index.ts', 'src/preset.ts'],
    dts: true,
    exports: true,
    define,
  },
  test: {
    environment: 'node',
    // Keeps Vitest away from the examples' Playwright specs.
    include: ['src/**/*.test.ts'],
  },
});
