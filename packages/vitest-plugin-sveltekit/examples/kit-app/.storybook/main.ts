import { defineMain } from '@storybook/sveltekit/node';

export default defineMain({
  framework: '@storybook/sveltekit',
  stories: ['../src/**/*.stories.@(ts|svelte)'],
  addons: ['@storybook/addon-vitest'],
  core: { disableTelemetry: true },
});
