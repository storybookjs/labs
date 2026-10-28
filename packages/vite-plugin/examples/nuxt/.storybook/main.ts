import type { StorybookConfig } from '@storybook-vue/nuxt';
import { mergeConfig, type PluginOption } from 'vite';

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.ts'],
  addons: [],
  // Server docgen blocks the first story teardown and races the preview's HMR re-render upstream.
  features: { docgenServer: false },
  framework: {
    name: '@storybook-vue/nuxt',
    options: {
      // Nuxt supplies the Vite config; don't discover one in a parent directory.
      builder: { viteConfigPath: null },
      docgen: 'vue-component-meta',
    },
  },
  viteFinal: (viteConfig, { configType }) => {
    const development = configType !== 'PRODUCTION';
    return mergeConfig(
      { ...viteConfig, plugins: viteConfig.plugins?.flatMap(withoutNuxtBuildDefaults) },
      {
        // The framework loads Nuxt with `dev: false`, whose `NODE_ENV` selects Vue's runtime without HMR.
        ...(development && {
          mode: 'development',
          define: { 'process.env.NODE_ENV': JSON.stringify('development') },
        }),
        // Nuxt rewrites its build output on every change; the preview must not react to it.
        server: { watch: { ignored: ['**/.nuxt/**', '**/.output/**'] } },
      }
    );
  },
};

export default config;

/**
 * Undoes the production defaults of the Nuxt plugins the framework copies into the preview,
 * since it loads Nuxt with `dev: false`: `nuxt:dev-server` turns HMR off and
 * `nuxt:environments` replaces the preview's mount path with `base: './'`.
 */
function withoutNuxtBuildDefaults(plugin: PluginOption): PluginOption[] {
  if (!plugin || !('name' in plugin)) {
    return [plugin];
  }
  if (plugin.name === 'nuxt:dev-server') {
    return [];
  }
  if (
    plugin.name === 'nuxt:environments' &&
    'config' in plugin &&
    typeof plugin.config === 'function'
  ) {
    const { config } = plugin;
    return [
      {
        ...plugin,
        config(...args) {
          // Keep the hook's side effects, drop the returned `base`.
          void config.apply(this, args);
        },
      },
    ];
  }
  return [plugin];
}
