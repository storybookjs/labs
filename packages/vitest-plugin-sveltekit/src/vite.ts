import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import path from 'pathe';

import type { Plugin, ResolvedConfig } from 'vite';

import { analyzeRemoteModule } from './node/analyze.ts';
import { appModule, findAppFiles, type AppFiles } from './node/app.ts';
import { findRemoteFiles, findServerDependencies } from './node/dependencies.ts';
import { REMOTE_MODULE, resolveModule } from './node/files.ts';
import { hash } from './node/hash.ts';
import { createServerModule, SERVER_QUERY } from './node/server-module.ts';
import { createClientStub } from './node/stub.ts';

export interface VitestPluginSvelteKitOptions {
  /**
   * Turns the plugin on or off. By default it is on in Vitest and Storybook, and off otherwise,
   * so the plugin can stay in `vite.config.ts` without changing `vite dev` and `vite build`.
   */
  enabled?: boolean;
  /**
   * Runs the real `.remote.ts` handlers in the page ("server mode"). Remote functions without a
   * `remote(fn)` mock call your server code, with its `$app/server`, `#lib/server/*` and
   * `$app/env/private` imports. Replace the data layer with `sb.mock` (Storybook) or `vi.mock`
   * (Vitest). Off by default: every remote function is a mock.
   */
  server?: boolean;
}

const PACKAGE_NAME = '@storybookjs/vitest-plugin-sveltekit';
const KIT_VIRTUAL_ID = `virtual:${PACKAGE_NAME}/kit`;
const RESOLVED_KIT_VIRTUAL_ID = `\0${KIT_VIRTUAL_ID}`;
const APP_VIRTUAL_ID = `virtual:${PACKAGE_NAME}/app`;
const RESOLVED_APP_VIRTUAL_ID = `\0${APP_VIRTUAL_ID}`;

/** SvelteKit's remote plugin, replaced by this plugin. */
const KIT_REMOTE_PLUGIN = 'vite-plugin-sveltekit-remote';
/** SvelteKit plugins that `@storybook/sveltekit` removes too. */
const KIT_APP_PLUGINS = ['vite-plugin-sveltekit-compile', 'vite-plugin-sveltekit-guard'];
/** Blocks `$app/server` and `$app/env/private` in the preview; server mode needs them there. */
const STORYBOOK_SERVER_GUARD = 'storybook:sveltekit-guard-server-modules';

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
  const server = options.server ?? false;
  let app: AppFiles = { serverHooks: null, universalHooks: null, env: null };

  return {
    name: 'vitest-plugin-sveltekit',
    enforce: 'pre',

    config(userConfig) {
      // `configResolved` decides again, from the resolved plugin list.
      enabled = isEnabled(options, userConfig.plugins ?? []);
      const include = [
        `${PACKAGE_NAME} > storybook/test`,
        `${PACKAGE_NAME} > storybook/internal/csf`,
      ];

      if (server && enabled) {
        // The server code loads on the first request; pre-bundle its packages up front.
        const projectRoot = path.resolve(userConfig.root ?? process.cwd());
        const src = path.join(projectRoot, 'src');
        const hooks = resolveModule(path.join(src, 'hooks.server'));
        const exclude = new Set(userConfig.optimizeDeps?.exclude ?? []);
        include.push(
          ...findServerDependencies(projectRoot, [
            ...findRemoteFiles(src),
            ...(hooks ? [hooks] : []),
          ]).filter((dependency) => !exclude.has(packageName(dependency)))
        );
      }

      return {
        optimizeDeps: {
          // The runtime imports a virtual module, which the dependency optimizer cannot resolve.
          exclude: [PACKAGE_NAME],
          // So the optimizer does not find these in the middle of a run and reload the page.
          include,
        },
      };
    },

    configResolved(config) {
      enabled = isEnabled(options, config.plugins);
      if (!enabled) return;

      root = config.root;
      kitDir = resolveKitDir(root);
      app = findAppFiles(config, server);

      removePlugins(config, [
        KIT_REMOTE_PLUGIN,
        ...KIT_APP_PLUGINS,
        ...(server ? [STORYBOOK_SERVER_GUARD] : []),
      ]);
    },

    resolveId: {
      filter: {
        id: [
          /^(virtual:@storybookjs\/vitest-plugin-sveltekit\/(kit|app)|node:async_hooks|#app\/env\/server|@storybook\/sveltekit\/.*)$/,
          REMOTE_MODULE,
        ],
      },
      async handler(id, importer, resolveOptions) {
        if (!enabled || this.environment.config.consumer !== 'client') return;

        // A remote module imported by the server copy of another one gets its server copy too,
        // as it would on SvelteKit's server.
        if (REMOTE_MODULE.test(id)) {
          if (!server || !importer?.endsWith(SERVER_QUERY) || id.endsWith(SERVER_QUERY)) return;
          const resolved = await this.resolve(id, importer, { ...resolveOptions, skipSelf: true });
          return resolved && { ...resolved, id: cleanId(resolved.id) + SERVER_QUERY };
        }

        // `@storybook/sveltekit` aliases `$app/state` and `$app/navigation` to bare specifiers.
        // This package does not depend on `@storybook/sveltekit`, so resolve them from the project.
        if (id.startsWith('@storybook/sveltekit/') && importer && isInside(importer, distDir)) {
          return this.resolve(id, path.join(root, 'package.json'), {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        if (id === KIT_VIRTUAL_ID) return RESOLVED_KIT_VIRTUAL_ID;
        if (id === APP_VIRTUAL_ID) return RESOLVED_APP_VIRTUAL_ID;

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
      filter: { id: /^\0virtual:@storybookjs\/vitest-plugin-sveltekit\/(kit|app)$/ },
      handler(id) {
        if (id === RESOLVED_KIT_VIRTUAL_ID) return kitModule(kitDir);
        if (id === RESOLVED_APP_VIRTUAL_ID) return appModule(app, server);
      },
    },

    transform: {
      filter: { id: REMOTE_MODULE },
      handler(code, id) {
        if (!enabled || this.environment.config.consumer !== 'client') return;

        // This package's own `remote.mock` matches the pattern too.
        if (isInside(id, distDir)) return;
        const source = cleanId(id);
        const file = path.relative(root, source);
        // Remote files in packages need SvelteKit's per-package opt-in check; not supported yet.
        if (!REMOTE_MODULE.test(file) || file.includes('node_modules')) return;

        if (id.endsWith(SERVER_QUERY)) {
          if (!server) return;
          return { code: createServerModule(code, source, file, kitDir), map: null };
        }

        const exports = analyzeRemoteModule(code, file);
        let stub = createClientStub(exports, {
          hash: hash(file),
          kitClientRuntime: path.join(kitDir, 'src/runtime/client/remote-functions/index.js'),
          registry: runtimeFile('registry'),
          serverModule: server ? source + SERVER_QUERY : undefined,
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
    // PR A's public entry, `@sveltejs/kit/internal/client`.
    `export { set_remote_env, reset_remote_state } from ${file('exports/internal/client.js')};`,
    `export { query_map, live_query_map } from ${file('runtime/client/client.js')};`,
    `export { HttpError, SvelteKitError } from ${file('exports/internal/shared.js')};`,
    `export { app_dir, base } from ${file('runtime/app/paths/client.js')};`,
    `export { handle_remote_call } from ${file('runtime/server/remote-functions.js')};`,
    `export { set_manifest, set_hooks } from ${file('runtime/server/internal.js')};`,
    `export { init_transport } from ${file('runtime/app/internal/transport.js')};`,
    `export { query, form, command, prerender, requested } from ${file('runtime/app/server/remote/index.js')};`,
    `export { create_request_state } from ${file('runtime/server/state.js')};`,
    `export { get_cookies } from ${file('runtime/server/cookie.js')};`,
    `export { noop_span } from ${file('telemetry.js')};`,
    `export { with_request_store } from ${file('exports/internal/server/index.js')};`,
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

/** On in Vitest and Storybook (a `storybook:*` plugin in the config), unless set explicitly. */
function isEnabled(options: VitestPluginSvelteKitOptions, plugins: readonly unknown[]): boolean {
  return (
    options.enabled ??
    (!!process.env.VITEST || pluginNames(plugins).some((name) => name.startsWith('storybook:')))
  );
}

/** The names in a Vite `plugins` option, which may nest arrays and contain falsy entries. */
function pluginNames(plugins: readonly unknown[]): string[] {
  return plugins.flatMap((plugin) =>
    Array.isArray(plugin)
      ? pluginNames(plugin)
      : typeof (plugin as { name?: unknown } | null)?.name === 'string'
        ? [(plugin as { name: string }).name]
        : []
  );
}

function removePlugins(config: ResolvedConfig, names: string[]): void {
  const plugins = config.plugins as Plugin[];
  const kept = plugins.filter((plugin) => !names.includes(plugin.name));
  plugins.splice(0, plugins.length, ...kept);
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

function cleanId(id: string): string {
  return id.replace(/[?#].*$/, '');
}

function isInside(file: string, dir: string): boolean {
  const relative = path.relative(dir, cleanId(file));
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}
