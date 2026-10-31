import { vitestPluginSvelteKit } from '@storybookjs/vitest-plugin-sveltekit/vite';
import { defineMain } from '@storybook/sveltekit/node';

// The live stories poll faster than the app (`.env`), so their changes show at once. The shell wins.
process.env.LIVE_POLL_MS ??= '250';

export default defineMain({
  framework: '@storybook/sveltekit',
  stories: ['../src/**/*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-vitest'],
  core: { disableTelemetry: true },
  // Server mode: remote functions without a `remote(fn)` mock run the real handlers.
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), vitestPluginSvelteKit({ server: true })],
  }),
});
