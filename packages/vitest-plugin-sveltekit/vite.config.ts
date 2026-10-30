import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: {
      vite: 'src/vite.ts',
      storybook: 'src/storybook.ts',
      vitest: 'src/vitest.ts',
      'remote.mock': 'src/remote.mock.ts',
      'server.mock': 'src/server.mock.ts',
      // Imported by absolute path from the generated client stubs and by SvelteKit's runtime.
      'internal/registry': 'src/runtime/registry.ts',
      'internal/async-local-storage': 'src/runtime/async-local-storage.ts',
    },
    dts: true,
    // Resolved by SvelteKit, Storybook or this package's Vite plugin in the user's project.
    deps: { neverBundle: [/^\$app\//, /^virtual:/] },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
