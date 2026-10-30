import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import path from 'pathe';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { appModule, declaredEnvKeys, readEnv } from './app.ts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const tempDir = () => mkdtempSync(path.join(tmpdir(), 'vitest-plugin-sveltekit-env-'));

describe('readEnv', () => {
  it('reads the declared keys the .env files name, expanded and overridden like Vite does', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, '.env'), 'HOST=localhost\nURL=http://${HOST}:5173\nPORT=1\n');
    writeFileSync(path.join(dir, '.env.production'), 'PORT=2\n');
    vi.stubEnv('PORT', '3');
    vi.stubEnv('NOT_IN_A_FILE', 'secret');

    expect(readEnv(dir, 'production', new Set(['HOST', 'URL', 'PORT', 'NOT_IN_A_FILE']))).toEqual({
      HOST: 'localhost',
      URL: 'http://localhost:5173',
      PORT: '3',
    });
  });

  it('leaves out undeclared keys before anything is written into the page', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, '.env'), 'POLL_MS=500\nALIAS=${CI_SECRET}\nUNUSED=x\n');
    vi.stubEnv('CI_SECRET', 'canary-7d1f');

    const env = readEnv(dir, 'production', new Set(['POLL_MS']));
    const code = appModule({ serverHooks: null, universalHooks: null, env }, true);

    expect(env).toEqual({ POLL_MS: '500' });
    expect(code).not.toContain('canary-7d1f');
    expect(code).not.toContain('UNUSED');
  });

  it('copies a shell value into a declared key that interpolates it', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, '.env'), 'ALIAS=${CI_SECRET}\n');
    vi.stubEnv('CI_SECRET', 'canary-7d1f');

    // The README's caution: interpolation and the shell can put shell values into declared keys.
    expect(readEnv(dir, 'production', new Set(['ALIAS']))).toEqual({ ALIAS: 'canary-7d1f' });
  });
});

describe('declaredEnvKeys', () => {
  it('reads the keys of `variables` in src/env.ts', () => {
    const file = path.join(tempDir(), 'env.ts');
    writeFileSync(
      file,
      [
        `import { defineEnvVars } from '@sveltejs/kit/env';`,
        `export const variables = defineEnvVars({ POLL_MS: {}, 'API_URL': { schema: s } });`,
      ].join('\n')
    );
    expect(declaredEnvKeys(file)).toEqual(new Set(['POLL_MS', 'API_URL']));
  });

  it('returns no keys, with a warning, when it cannot read them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = path.join(tempDir(), 'env.ts');
    writeFileSync(file, `export const variables = defineEnvVars({ ...shared, OWN: {} });`);

    expect(declaredEnvKeys(file)).toEqual(new Set());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot read the variable names'));
    expect(declaredEnvKeys(null)).toEqual(new Set());
  });
});
