import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin, ResolvedConfig } from 'vite';

import { analyzeRemoteModule } from './node/analyze.ts';
import { hash } from './node/hash.ts';
import { createClientStub } from './node/stub.ts';

export interface VitestPluginSvelteKitOptions {
  /**
   * Turns the plugin on or off. By default it is on in Vitest and Storybook, and off otherwise,
   * so the plugin can stay in `vite.config.ts` without changing `vite dev` and `vite build`.
   */
  enabled?: boolean;
}

const PACKAGE_NAME = '@storybookjs/vitest-plugin-sveltekit';
const KIT_VIRTUAL_ID = `virtual:${PACKAGE_NAME}/kit`;
const RESOLVED_KIT_VIRTUAL_ID = `\0${KIT_VIRTUAL_ID}`;

/** SvelteKit's remote plugin, replaced by this plugin. */
const KIT_REMOTE_PLUGIN = 'vite-plugin-sveltekit-remote';
/** SvelteKit plugins that `@storybook/sveltekit` removes, and that this plugin removes in Vitest. */
const KIT_APP_PLUGINS = ['vite-plugin-sveltekit-compile', 'vite-plugin-sveltekit-guard'];

// The same pattern as SvelteKit's `remote_module_pattern`, limited to script files.
const REMOTE_MODULE = /[/.]remote\.[cm]?[jt]s$/;

const distDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeFile = (name: string) => path.join(distDir, 'internal', `${name}.mjs`);

/**
 * Lets components that use SvelteKit remote functions render in Storybook and in Vitest browser
 * mode. Remote modules become SvelteKit's client stubs, and their requests are answered in the
 * page by spies that stories and tests control with `remote()` from
 * `@storybookjs/vitest-plugin-sveltekit/remote.mock`.
 */
export function vitestPluginSvelteKit(options: VitestPluginSvelteKitOptions = {}): Plugin {
  let enabled = false;
  let root = '';
  let kitDir = '';

  return {
    name: 'vitest-plugin-sveltekit',
    enforce: 'pre',

    config() {
      return {
        optimizeDeps: {
          // The runtime imports a virtual module, which the dependency optimizer cannot resolve.
          exclude: [PACKAGE_NAME],
          // So the optimizer does not find these in the middle of a run and reload the page.
          include: [`${PACKAGE_NAME} > storybook/test`, `${PACKAGE_NAME} > storybook/internal/csf`],
        },
      };
    },

    configResolved(config) {
      const inStorybook = config.plugins.some((plugin) => plugin.name.startsWith('storybook:'));
      enabled = options.enabled ?? (inStorybook || !!process.env.VITEST);
      if (!enabled) return;

      root = config.root;
      kitDir = resolveKitDir(root);

      removePlugins(config, inStorybook ? [KIT_REMOTE_PLUGIN] : [KIT_REMOTE_PLUGIN, ...KIT_APP_PLUGINS]);
    },

    resolveId: {
      filter: { id: /^(virtual:@storybookjs\/vitest-plugin-sveltekit\/kit|node:async_hooks|#app\/env\/server)$/ },
      handler(id, importer) {
        if (!enabled || this.environment.config.consumer !== 'client') return;

        if (id === KIT_VIRTUAL_ID) return RESOLVED_KIT_VIRTUAL_ID;

        // SvelteKit's request store reads `AsyncLocalStorage`. The browser has none, so it gets a
        // shim that keeps the last store.
        if (id === 'node:async_hooks') return runtimeFile('async-local-storage');

        // SvelteKit's server runtime reads `prerendering` from here, and the `browser` condition
        // maps it to a module that throws.
        if (id === '#app/env/server' && importer && isInside(importer, kitDir)) {
          return path.join(kitDir, 'src/runtime/app/env/server.js');
        }
      },
    },

    load: {
      filter: { id: /^\0virtual:@storybookjs\/vitest-plugin-sveltekit\/kit$/ },
      handler(id) {
        if (id === RESOLVED_KIT_VIRTUAL_ID) return kitModule(kitDir);
      },
    },

    transform: {
      filter: { id: REMOTE_MODULE },
      handler(code, id) {
        if (!enabled || this.environment.config.consumer !== 'client') return;

        const file = posixify(path.relative(root, cleanId(id)));
        if (!REMOTE_MODULE.test(file)) return;

        const exports = analyzeRemoteModule(code, file);
        let stub = createClientStub(exports, {
          hash: hash(file),
          kitClientRuntime: path.join(kitDir, 'src/runtime/client/remote-functions/index.js'),
          registry: runtimeFile('registry'),
        });
        if (this.environment.mode === 'dev') stub += '\nimport.meta.hot?.accept();\n';

        return { code: stub, map: null };
      },
    },
  };
}

/**
 * The SvelteKit internals the runtime needs, by absolute path, because SvelteKit does not export
 * them. They resolve to the same files SvelteKit's own runtime imports, so module state is shared.
 */
function kitModule(kitDir: string): string {
  const file = (relative: string) => JSON.stringify(path.join(kitDir, 'src', relative));
  return [
    `export { set_remote_env, reset_remote_state } from ${file('runtime/client/remote-functions/env.js')};`,
    `export { query_map, live_query_map } from ${file('runtime/client/client.js')};`,
    `export { app_dir, base } from ${file('runtime/app/paths/client.js')};`,
    `export { handle_remote_call } from ${file('runtime/server/remote-functions.js')};`,
    `export { set_manifest, set_hooks } from ${file('runtime/server/internal.js')};`,
    `export { init_transport } from ${file('runtime/app/internal/transport.js')};`,
    `export { query, form, command, prerender, requested } from ${file('runtime/app/server/remote/index.js')};`,
    `export { create_request_state } from ${file('runtime/server/state.js')};`,
    `export { get_cookies } from ${file('runtime/server/cookie.js')};`,
    `export { noop_span } from ${file('telemetry.js')};`,
    '',
  ].join('\n');
}

function resolveKitDir(root: string): string {
  const require = createRequire(path.join(root, 'package.json'));
  try {
    return path.dirname(require.resolve('@sveltejs/kit/package.json'));
  } catch {
    throw new Error(
      `[vitest-plugin-sveltekit] cannot find @sveltejs/kit from ${root}. Install it in the project.`
    );
  }
}

function removePlugins(config: ResolvedConfig, names: string[]): void {
  const plugins = config.plugins as Plugin[];
  for (let i = plugins.length - 1; i >= 0; i--) {
    if (names.includes(plugins[i].name)) plugins.splice(i, 1);
  }
}

function cleanId(id: string): string {
  return id.replace(/[?#].*$/, '');
}

function isInside(file: string, dir: string): boolean {
  const relative = path.relative(dir, cleanId(file));
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function posixify(file: string): string {
  return file.replaceAll('\\', '/');
}
