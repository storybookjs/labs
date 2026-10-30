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

  it('in Storybook, only replaces the remote plugin', () => {
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
});
