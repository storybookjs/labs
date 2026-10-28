import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/preset.ts'],
    dts: true,
    exports: true,
  },
  test: {
    environment: 'node',
    // Keeps Vitest away from the examples' Playwright specs.
    include: ['src/**/*.test.ts'],
  },
});
