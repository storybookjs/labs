import path from 'node:path';

import type { Plugin, ResolvedConfig } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { vitestPluginSvelteKit } from './vite.ts';

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
    const { plugin, names } = setup([named('vite-plugin-sveltekit-remote')]);

    expect(names).toContain('vite-plugin-sveltekit-remote');
    expect(transform(plugin, 'export const a = 1;', `${root}/src/a.remote.ts`)).toBeUndefined();
  });

  it('in Vitest, replaces the remote plugin and removes the app plugins', () => {
    vi.stubEnv('VITEST', 'true');
    const { names } = setup([
      named('vite-plugin-sveltekit-setup'),
      named('vite-plugin-sveltekit-compile'),
      named('vite-plugin-sveltekit-guard'),
      named('vite-plugin-sveltekit-remote'),
    ]);

    expect(names).toEqual(['vite-plugin-sveltekit-setup', 'vitest-plugin-sveltekit']);
  });

  it('in Storybook, replaces the remote plugin and keeps Storybook’s guard by default', () => {
    vi.stubEnv('VITEST', '');
    const { names } = setup([
      named('storybook:sveltekit-mock-modules'),
      named('vite-plugin-sveltekit-remote'),
    ]);

    expect(names).toEqual(['storybook:sveltekit-mock-modules', 'vitest-plugin-sveltekit']);
  });

  it('turns a remote file into SvelteKit’s client stub', () => {
    const { plugin } = setup([], { enabled: true });
    const code = `import { query } from '$app/server';\nexport const getPosts = query(() => []);`;

    const result = transform(plugin, code, `${root}/src/lib/posts.remote.ts?v=1`);

    expect(result?.code).toContain(`export const getPosts = __remote.query("1rlm6aw/getPosts");`);
    expect(result?.code).toMatch(
      /import \* as __remote from ".*\/@sveltejs\/kit\/src\/runtime\/client\/remote-functions\/index\.js";/
    );
    expect(result?.code).toContain('__register(getPosts, "1rlm6aw/getPosts", "query");');
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
      expect(names).toEqual(['vitest-plugin-sveltekit']);
    });

    it('keeps the source for the server copy and gives each export its id', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const result = transform(plugin, remoteCode, `${remoteFile}?server`);

      expect(result?.code.startsWith(remoteCode)).toBe(true);
      expect(result?.code).toContain(
        '$$_init_$$({ "getPosts": getPosts, "createPost": create }, "src/lib/posts.remote.ts", "1rlm6aw");'
      );
      expect(result?.code).not.toContain('?server";');
    });

    it('registers a loader for the server copy in the client stub', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const result = transform(plugin, remoteCode, remoteFile);

      expect(result?.code).toContain(
        `__registerModule("1rlm6aw", () => import(${JSON.stringify(`${remoteFile}?server`)}));`
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

    it('loads the app’s server hooks lazily', () => {
      const { plugin } = setup([], { enabled: true, server: true });
      const { handler } = plugin.load as { handler: (id: string) => string | undefined };
      const code = handler('\0virtual:@storybookjs/vitest-plugin-sveltekit/app');

      expect(code).toContain('export const serverMode = true;');
      expect(code).toContain(
        `export const loadServerHooks = () => import(${JSON.stringify(`${root}/src/hooks.server.ts`)});`
      );
      // `vite dev`: SvelteKit's generated env module already has the values.
      expect(code).toContain('export function initEnv() {}');
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
