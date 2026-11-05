import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { createServer, type ViteDevServer } from 'vite';

import { experimental_getChangeDetectionReadiness } from 'storybook/internal/core-server';

// The example's own `vite.config.ts` imports the built plugin, so the nested preview server must
// see the same module copy as this test for the self-guard to disable it. `prepare` builds `dist`.
const { experimental_vitePlugin } = await import('../dist/index.mjs').catch((error: unknown) => {
  throw new Error('Build the plugin first (`vp pack`) so dist/index.mjs exists.', { cause: error });
});

const EXAMPLE_ROOT = resolve(import.meta.dirname, '../examples/react');
const READINESS_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} did not settle within ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

describe('change detection readiness', () => {
  let server: ViteDevServer | undefined;
  let stateDir: string;
  const previousEnv = { ...process.env };

  beforeAll(async () => {
    stateDir = await mkdtemp(join(tmpdir(), 'sb-vite-plugin-'));
    process.env.XDG_STATE_HOME = stateDir;
    process.env.STORYBOOK_DISABLE_TELEMETRY = '1';
    // The plugin refuses to start a nested Storybook under Vitest; this test is that server.
    delete process.env.VITEST;
    const cwd = process.cwd();
    process.chdir(EXAMPLE_ROOT);
    try {
      server = await createServer({
        root: EXAMPLE_ROOT,
        configFile: false,
        logLevel: 'silent',
        server: { port: 0, host: '127.0.0.1', strictPort: false },
        plugins: [experimental_vitePlugin({ configDir: join(EXAMPLE_ROOT, '.storybook') })],
      });
      await server.listen();
    } finally {
      process.chdir(cwd);
    }
  }, 120_000);

  afterAll(async () => {
    await server?.close();
    process.env = previousEnv;
    await rm(stateDir, { recursive: true, force: true });
  });

  it(
    'settles once the embedded Storybook server is up',
    async () => {
      const readiness = await withTimeout(
        experimental_getChangeDetectionReadiness(),
        READINESS_TIMEOUT_MS,
        'change detection readiness'
      );
      expect(['ready', 'unavailable', 'error']).toContain(readiness.status);
    },
    READINESS_TIMEOUT_MS + 5_000
  );
});
