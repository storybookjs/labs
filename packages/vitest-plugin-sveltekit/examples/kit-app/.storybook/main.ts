import { vitestPluginSvelteKit } from 'vitest-plugin-sveltekit/vite';
import { defineMain } from '@storybook/sveltekit/node';
import remarkGfm from 'remark-gfm';

export default defineMain({
  framework: '@storybook/sveltekit',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.svelte'],
  addons: [
    {
      name: '@storybook/addon-docs',
      // GitHub Flavored Markdown, for the tables in the MDX docs pages.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-vitest',
  ],
  core: { disableTelemetry: true },
  // Server mode: remote functions without a `mockRemote(fn)` mock run the real handlers.
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), vitestPluginSvelteKit({ server: true })],
  }),
});
