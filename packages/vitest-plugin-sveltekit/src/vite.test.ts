import path from 'node:path';

import type { Plugin, ResolvedConfig } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { vitestPluginSvelteKit } from './vite.ts';
import { literal } from './node/code.ts';

const root = path.resolve(import.meta.dirname, '../examples/kit-app');
const named = (name: string) => ({ name }) as Plugin;

function setup(plugins: Plugin[], options?: Parameters<typeof vitestPluginSvelteKit>[0]) {
  const plugin = vitestPluginSvelteKit(options);
  const config = { root, plugins: [...plugins, plugin] } as unknown as ResolvedConfig;
  (plugin.configResolved as (config: ResolvedConfig) => void)(config);
  return { plugin, names: config.plugins.map((p) => p.name) };
}

function transform(plugin: Plugin, code: string, id: string, consumer = 'client') {
  const { handler } = plugin.transform as { handler: (code: string, id: string) => unknown };
  return handler.call({ environment: { config: { consumer }, mode: 'build' } }, code, id) as
    | { code: string }
    | undefined;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('vitestPluginSvelteKit', () => {
  it('does nothing outside Vitest and Storybook', () => {
    vi.stubEnv('VITEST', '');
    vi.stubEnv('STORYBOOK', '');
    const { plugin, names } = setup([named('vite-plugin-sveltekit-remote')]);

    expect(names).toContain('vite-plugin-sveltekit-remote');
    expect(transform(plugin, 'export const a = 1;', `${root}/src/a.remote.ts`)).toBeUndefined();
  });

  it('in Vitest, keeps the remote plugin out of the browser and removes the app plugins', () => {
    vi.stubEnv('VITEST', 'true');
    const remote = named('vite-plugin-sveltekit-remote');
    const { names } = setup([
      named('vite-plugin-sveltekit-setup'),
      named('vite-plugin-sveltekit-compile'),
      named('vite-plugin-sveltekit-guard'),
      remote,
    ]);

    expect(names).toEqual([
      'vite-plugin-sveltekit-setup',
      'vite-plugin-sveltekit-remote',
      'vitest-plugin-sveltekit',
    ]);
    // The browser gets this plugin's stubs; Node (and SSR) keeps SvelteKit's server modules.
    const applies = (consumer: string) =>
      (remote.applyToEnvironment as (environment: object) => boolean)({ config: { consumer } });
    expect(applies('client')).toBe(false);
    expect(applies('server')).toBe(true);
  });

  it('in Storybook (the CLI sets STORYBOOK=true), turns on', () => {
    vi.stubEnv('VITEST', '');
    vi.stubEnv('STORYBOOK', 'true');
    const { plugin, names } = setup([
      named('vite-plugin-sveltekit-setup'),
      named('vite-plugin-sveltekit-remote'),
    ]);

    expect(names).toEqual([
      'vite-plugin-sveltekit-setup',
      'vite-plugin-sveltekit-remote',
      'vitest-plugin-sveltekit',
    ]);
    const code = `import { query } from '$app/server';\nexport const a = query(() => 1);`;
    expect(transform(plugin, code, `${root}/src/a.remote.ts`)?.code).toContain('__remote.query(');
  });

  it('in Storybook started without the CLI, a storybook:* plugin turns it on; Storybook’s guard stays by default', () => {
    vi.stubEnv('VITEST', '');
    vi.stubEnv('STORYBOOK', '');
    const { names } = setup([
      named('storybook:sveltekit-mock-modules'),
      named('storybook:sveltekit-guard-server-modules'),
      named('vite-plugin-sveltekit-remote'),
    ]);

    expect(names).toEqual([
      'storybook:sveltekit-mock-modules',
      'storybook:sveltekit-guard-server-modules',
      'vite-plugin-sveltekit-remote',
      'vitest-plugin-sveltekit',
    ]);
  });

  it('turns a remote file into SvelteKit’s client stub', () => {
    const { plugin } = setup([], { enabled: true });
    const code = `import { query } from '$app/server';\nexport const getPosts = query(() => []);`;

    const result = transform(plugin, code, `${root}/src/lib/posts.remote.ts?v=1`);

    expect(result?.code).toContain(
      `export const getPosts = __remote.query(${literal('1rlm6aw/getPosts')});`
    );
    expect(result?.code).toContain(
      `import * as __remote from ${literal('@sveltejs/kit/internal/remote-client')};`
    );
    expect(result?.code).toContain(
      `__register(getPosts, ${literal('1rlm6aw/getPosts')}, "query");`
    );
  });

  it('handles every file SvelteKit treats as remote, like `.remote.svelte.ts`', () => {
    const { plugin } = setup([], { enabled: true });
    const code = `import { query } from '$app/server';\nexport const count = query(() => 1);`;

    expect(transform(plugin, code, `${root}/src/lib/count.remote.svelte.ts`)?.code).toContain(
      '__remote.query('
    );
    expect(transform(plugin, code, `${root}/src/lib/remote.js`)?.code).toContain('__remote.query(');
    expect(transform(plugin, code, `${root}/node_modules/lib/x.remote.js`)).toBeUndefined();
    expect(transform(plugin, code, `${root}/src/lib/remote-utils.ts`)).toBeUndefined();
    // The package's own `remote.mock` entry, next to the plugin (in `dist` when built).
    const own = path.resolve(import.meta.dirname, 'remote.mock.mjs');
    expect(transform(plugin, code, own)).toBeUndefined();
  });

  it('leaves server environments alone', () => {
    const { plugin } = setup([], { enabled: true });
    expect(
      transform(plugin, 'export const a = 1;', `${root}/src/a.remote.ts`, 'server')
    ).toBeUndefined();
  });

  describe('server mode', () => {
    const remoteCode = [
      `import { query, form } from '$app/server';`,
      `export const getPosts = query(() => []);`,
      `const create = form(() => 1);`,
      `export { create as createPost };`,
    ].join('\n');
    const remoteFile = `${root}/src/lib/posts.remote.ts`;

    it('removes Storybook’s server module guard', () => {
      const { names } = setup(
        [named('storybook:sveltekit-guard-server-modules'), named('vite-plugin-sveltekit-remote')],
        { enabled: true, server: true }
      );
      expect(names).toEqual(['vite-plugin-sveltekit-remote', 'vitest-plugin-sveltekit']);
    });

    it('keeps the source for the server copy and gives each export its id', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const result = transform(plugin, remoteCode, `${remoteFile}?server`);

      expect(result?.code.startsWith(remoteCode)).toBe(true);
      expect(result?.code).toContain('$$_exports_$$["getPosts"] = getPosts;');
      expect(result?.code).toContain('$$_exports_$$["createPost"] = create;');
      expect(result?.code).toContain(
        `$$_init_$$($$_exports_$$, ${literal('src/lib/posts.remote.ts')}, "1rlm6aw");`
      );
      expect(result?.code).not.toContain('?server";');
    });

    it('registers a loader for the server copy in the client stub', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const result = transform(plugin, remoteCode, remoteFile);

      expect(result?.code).toContain(
        `__registerModule("1rlm6aw", () => import(${literal(`${remoteFile}?server`)}));`
      );
    });

    it('leaves `?server` ids alone without server mode', () => {
      const { plugin } = setup([], { enabled: true });
      expect(transform(plugin, remoteCode, `${remoteFile}?server`)).toBeUndefined();
      expect(transform(plugin, remoteCode, remoteFile)?.code).not.toContain('__registerModule');
    });

    it('gives a server copy the server copies of the remote modules it imports', async () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const { handler } = plugin.resolveId as {
        handler: (id: string, importer?: string, options?: object) => Promise<unknown>;
      };
      const context = {
        environment: { config: { consumer: 'client' } },
        resolve: async () => ({ id: `${root}/src/lib/other.remote.ts` }),
      };

      await expect(
        handler.call(context, './other.remote.ts', `${remoteFile}?server`, {})
      ).resolves.toEqual({ id: `${root}/src/lib/other.remote.ts?server` });
      await expect(handler.call(context, './other.remote.ts', remoteFile, {})).resolves.toBe(
        undefined
      );
    });

    it('gives server code the client stub of a remote file that the filter leaves out', async () => {
      const { plugin } = setup([], {
        enabled: true,
        server: { include: ['src/lib/posts.remote.ts'] },
      });
      const { handler } = plugin.resolveId as {
        handler: (id: string, importer?: string, options?: object) => Promise<unknown>;
      };
      const context = {
        environment: { config: { consumer: 'client' } },
        resolve: async () => ({ id: `${root}/src/lib/other.remote.ts` }),
      };

      await expect(
        handler.call(context, './other.remote.ts', `${root}/src/lib/posts.remote.ts?server`, {})
      ).resolves.toEqual({ id: `${root}/src/lib/other.remote.ts` });
      // An excluded file's stub names it, for the error when a function has no mock.
      const stub = transform(plugin, remoteCode, `${root}/src/lib/other.remote.ts`)?.code;
      expect(stub).toContain(literal('src/lib/other.remote.ts'));
      expect(stub).not.toContain('?server');
    });

    it('gives server code a server copy of a helper that imports a remote module', async () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const { handler } = plugin.resolveId as {
        handler: (id: string, importer?: string, options?: object) => Promise<unknown>;
      };
      const dir = path.resolve(import.meta.dirname, '../test/fixtures/server-context/src');
      const context = {
        environment: { config: { consumer: 'client' } },
        resolve: async (id: string, importer: string) =>
          id.startsWith('.') ? { id: path.resolve(path.dirname(importer), id) } : null,
      };
      const resolveFrom = (id: string, importer: string) =>
        handler.call(context, id, path.join(dir, importer), {});

      // a.remote.ts → helper.ts → b.remote.ts
      await expect(resolveFrom('./helper.ts', 'a.remote.ts?server')).resolves.toEqual({
        id: `${dir}/helper.ts?server`,
      });
      await expect(resolveFrom('./b.remote.ts', 'helper.ts?server')).resolves.toEqual({
        id: `${dir}/b.remote.ts?server`,
      });
      // The data layer stays one module, so mocks still replace it.
      await expect(resolveFrom('./data.ts', 'a.remote.ts?server')).resolves.toEqual({
        id: `${dir}/data.ts`,
      });
      // Client code keeps the client stubs.
      await expect(resolveFrom('./helper.ts', 'Component.svelte')).resolves.toBe(undefined);
    });

    it('loads the app’s server hooks lazily', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const { handler } = plugin.load as { handler: (id: string) => string | undefined };
      const code = handler('\0virtual:vitest-plugin-sveltekit/app');

      expect(code).toContain('export const serverMode = true;');
      expect(code).toContain(
        `export const loadServerHooks = () => import(${literal(`${root}/src/hooks.server.ts`)});`
      );
    });

    it('serves its own env modules to the browser, with private values from `env` only', () => {
      vi.stubEnv('DATABASE_DIR', 'shell-value');
      const { plugin } = setup([], {
        enabled: true,
        server: true,
        env: { DATABASE_DIR: '/tmp/x' },
      });
      const { handler } = plugin.load as {
        handler: (this: unknown, id: string) => string | undefined;
      };
      const warn = vi.fn<(message: string) => void>();
      const context = { environment: { config: { consumer: 'client' } }, warn };
      const generated = `${root}/.svelte-kit/generated/dev/env`;

      const config = handler.call(context, `${generated}/config.js`);
      expect(config).toContain(`set_env(${literal({ DATABASE_DIR: '/tmp/x' })});`);
      expect(config).not.toContain('shell-value');
      expect(handler.call(context, `${generated}/private/server.js?v=1`)).toContain(
        'export const DATABASE_DIR = env.DATABASE_DIR;'
      );
      // The example also declares `API_TOKEN`, which `env` leaves out: one warning, at the first load.
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/no value for API_TOKEN in stories and tests/);
      handler.call(context, `${generated}/private/server.js`);
      expect(warn).toHaveBeenCalledOnce();
      // SvelteKit's own modules on the server side.
      const ssr = { environment: { config: { consumer: 'server' } }, warn };
      expect(handler.call(ssr, `${generated}/config.js`)).toBeUndefined();
    });

    const fixture = path.resolve(import.meta.dirname, '../test/fixtures/server-deps');
    type ConfigHook = (config: object) => { optimizeDeps: { include: string[] } };

    it('pre-bundles the packages the server code imports', () => {
      const plugin = vitestPluginSvelteKit({ server: true });
      const config = (plugin.config as ConfigHook)({
        root: fixture,
        optimizeDeps: { exclude: ['pkg-e'] },
      });

      expect(config.optimizeDeps.include).toEqual(
        expect.arrayContaining(['pkg-a', 'pkg-b/sub', 'pkg-d/count', 'pkg-hooks'])
      );
      expect(config.optimizeDeps.include).not.toContain('pkg-e');
    });

    it('does not walk the server code when the plugin is off', () => {
      vi.stubEnv('VITEST', '');
      const plugin = vitestPluginSvelteKit({ server: true });
      const config = (plugin.config as ConfigHook)({ root: fixture, plugins: [named('vite:x')] });

      expect(config.optimizeDeps.include).not.toContain('pkg-a');
    });

    it('detects Storybook from the plugins in the config', () => {
      vi.stubEnv('VITEST', '');
      const plugin = vitestPluginSvelteKit({ server: true });
      const config = (plugin.config as ConfigHook)({
        root: fixture,
        plugins: [[named('storybook:sveltekit-mock-modules')], false],
      });

      expect(config.optimizeDeps.include).toContain('pkg-a');
    });
  });
});
