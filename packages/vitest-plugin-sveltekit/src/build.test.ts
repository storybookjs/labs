// Real Vite builds of a small app: what the `server` option puts into the bundle.
import path from 'node:path';

import { build, type Rolldown } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import type { ServerOption } from './node/server-option.ts';
import { vitestPluginSvelteKit } from './vite.ts';

const fixture = path.resolve(import.meta.dirname, '../test/fixtures/server-filter');

afterEach(() => vi.restoreAllMocks());

/** Builds the fixture and returns its code and the report the plugin printed. */
async function buildWith(server: ServerOption) {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const output = (await build({
    root: fixture,
    configFile: false,
    logLevel: 'silent',
    plugins: [vitestPluginSvelteKit({ enabled: true, server })],
    build: {
      write: false,
      minify: false,
      rolldownOptions: {
        input: path.join(fixture, 'index.ts'),
        // SvelteKit's runtime and this package's: not under test, and not built in this fixture.
        external: (id) =>
          id.startsWith('$app/') || id.includes('/@sveltejs/kit/') || id.includes('/internal/'),
      },
    },
  })) as Rolldown.RolldownOutput;
  const code = output.output.map((file) => (file.type === 'chunk' ? file.code : '')).join('\n');
  const report = log.mock.calls.map((call) => String(call[0])).join('\n');
  return { code, report };
}

describe('the server option in a build', () => {
  it('`include: []` emits no server code and no server hooks, like mock mode', async () => {
    const { code, report } = await buildWith({ include: [] });

    // The client stubs are there, exactly as in mock mode.
    expect(code).toContain('registerRemoteFunction');
    expect(code).not.toContain('registerExcludedModule');
    expect(code).not.toMatch(/A-SERVER-CANARY|B-SERVER-CANARY|HOOKS-CANARY/);
    expect(code).not.toContain('?server');
    expect(report).toContain('Remote files with their server code: none');
    expect(report).toContain('Server hooks: none');
  });

  it('`true` emits every remote file with its server code, and the hooks', async () => {
    const { code, report } = await buildWith(true);

    expect(code).toContain('A-SERVER-CANARY');
    expect(code).toContain('B-SERVER-CANARY');
    expect(code).toContain('HOOKS-CANARY');
    expect(report).toContain(
      [
        '  Remote files with their server code (2):',
        '    src/lib/a.remote.ts',
        '    src/lib/b.remote.ts',
        '  Server hooks: src/hooks.server.ts',
        '  Other server-only modules (2):',
        '    src/lib/server/a-db.ts',
        '    src/lib/server/b-db.ts',
      ].join('\n')
    );
  });

  it('emits only the included files’ server code; the others stay stubs that name the file', async () => {
    const { code, report } = await buildWith({ include: ['src/lib/a.remote.ts'] });

    expect(code).toContain('A-SERVER-CANARY');
    expect(code).not.toContain('B-SERVER-CANARY');
    expect(code).toContain('"src/lib/b.remote.ts"');
    expect(report).toContain('Remote files with their server code (1):\n    src/lib/a.remote.ts');
    expect(report).toContain('Other server-only modules (1):\n    src/lib/server/a-db.ts');
  });

  it('applies `exclude` after `include`', async () => {
    const { code } = await buildWith({ exclude: ['**/b.remote.ts'] });

    expect(code).toContain('A-SERVER-CANARY');
    expect(code).not.toContain('B-SERVER-CANARY');
  });
});
