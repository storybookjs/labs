import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    // `index` loads `./preset.mjs` at runtime, so it must stay a separate entry.
    entry: ['src/index.ts', 'src/preset.ts'],
    dts: true,
    exports: { devExports: true },
  },
  test: {
    environment: 'node',
    // Keeps Vitest away from the examples' Playwright specs.
    include: ['src/**/*.test.ts'],
  },
});
