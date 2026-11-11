// Vitest in Node (`environment: 'node'`) against the app in `test/fixtures/node-app`, with the
// built plugin (`dist`, from `pnpm build`).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createServer } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

const fixture = path.resolve(import.meta.dirname, '../test/fixtures/node-app');
const vitest = path.join(
  path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
  'vitest.mjs'
);

describe('Vitest in Node mode', () => {
  it('runs the remote functions for real, in the mock request event', () => {
    const output = path.join(mkdtempSync(path.join(tmpdir(), 'node-mode-')), 'results.json');
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith('VITEST'))
    );
    const run = spawnSync(
      process.execPath,
      [vitest, 'run', '--reporter=json', `--outputFile=${output}`],
      { cwd: fixture, env, encoding: 'utf8' }
    );

    const results = JSON.parse(readFileSync(output, 'utf8')) as {
      testResults: Array<{ assertionResults: Array<{ title: string; status: string }> }>;
    };
    const statuses = Object.fromEntries(
      results.testResults
        .flatMap((file) => file.assertionResults)
        .map(({ title, status }) => [title, status])
    );
    if (Object.keys(statuses).length === 0) console.error(run.stdout, run.stderr);
    expect(statuses).toEqual({
      'remote modules are the real server functions, with SvelteKit’s init': 'passed',
      'a direct call runs in the mock request event, and getRequestEvent() survives await':
        'passed',
      'cookies a handler sets show in mockRequestEvent().cookies, and go with the next call':
        'passed',
      'the next test starts with a fresh mock request event': 'passed',
      'error() comes out as SvelteKit’s HttpError': 'passed',
      'invalid() becomes issues, redirect() comes out as SvelteKit’s Redirect': 'passed',
      'calls in one runInRequest() share a query.batch run': 'passed',
      'a command that refreshes a query.batch': 'passed',
    });
  }, 120_000);

  it('gives the browser the client stub and Node the server module, in one config', async () => {
    const server = await createServer({
      root: fixture,
      configFile: path.join(fixture, 'vite.config.ts'),
      logLevel: 'silent',
      server: { middlewareMode: true, ws: false },
    });
    try {
      const client = await server.environments.client!.transformRequest('/src/lib/probe.remote.ts');
      const ssr = await server.environments.ssr!.transformRequest('/src/lib/probe.remote.ts');

      expect(client?.code).toContain('registerRemoteFunction');
      expect(client?.code).not.toContain('init_remote_functions');
      expect(ssr?.code).toContain('init_remote_functions');
      expect(ssr?.code).not.toContain('registerRemoteFunction');
    } finally {
      await server.close();
    }
  }, 120_000);
});
