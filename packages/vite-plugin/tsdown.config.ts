import { defineConfig } from 'tsdown';

export default defineConfig({
  // `index` loads `./preset.mjs` at runtime, so it must stay a separate entry.
  entry: ['src/index.ts', 'src/preset.ts'],
  dts: true,
  exports: { devExports: true },
});
