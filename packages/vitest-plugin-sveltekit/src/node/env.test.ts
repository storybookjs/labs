import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import path from 'pathe';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  browserEnv,
  declaredEnvVars,
  envConfigModule,
  generatedEnvModule,
  missingEnvWarning,
  privateEnvModule,
} from './env.ts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const tempDir = () => mkdtempSync(path.join(tmpdir(), 'vitest-plugin-sveltekit-env-'));

/** An app folder with `src/env.ts` and the given `.env` files. */
function app(files: Record<string, string>) {
  const dir = tempDir();
  const entry = path.join(dir, 'env.ts');
  writeFileSync(
    entry,
    [
      `import { defineEnvVars } from '@sveltejs/kit/env';`,
      `export const variables = defineEnvVars({`,
      `  API_KEY: {},`,
      `  'DATABASE_URL': { schema: s },`,
      `  PUBLIC_SITE: { public: true },`,
      `});`,
    ].join('\n')
  );
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
  return { dir, entry };
}

describe('declaredEnvVars', () => {
  it('reads the names in `variables` and which are public', () => {
    const { entry } = app({});
    expect(declaredEnvVars(entry)).toEqual([
      { name: 'API_KEY', public: false },
      { name: 'DATABASE_URL', public: false },
      { name: 'PUBLIC_SITE', public: true },
    ]);
  });

  it('counts a `public` that is not a literal `true` as private', () => {
    const file = path.join(tempDir(), 'env.ts');
    writeFileSync(
      file,
      `export const variables = { A: { public: isPublic }, B: { public: 'yes' } };`
    );
    expect(declaredEnvVars(file)).toEqual([
      { name: 'A', public: false },
      { name: 'B', public: false },
    ]);
  });

  it('returns no variables, with a warning, when it cannot read them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const file = path.join(tempDir(), 'env.ts');
    writeFileSync(file, `export const variables = defineEnvVars({ ...shared, OWN: {} });`);

    expect(declaredEnvVars(file)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('cannot read the variable names'));
    expect(declaredEnvVars(null)).toEqual([]);
  });
});

describe('browserEnv', () => {
  it('takes private values from the plugin only, never from .env files or the shell', () => {
    const { dir, entry } = app({
      '.env': 'API_KEY=dot-env-secret\nDATABASE_URL=postgres://real\nPUBLIC_SITE=example.com\n',
      '.env.local': 'API_KEY=dot-env-local-secret\n',
    });
    vi.stubEnv('DATABASE_URL', 'shell-secret');

    const env = browserEnv({
      entry,
      envDir: dir,
      mode: 'development',
      env: { API_KEY: 'storybook-key' },
    });

    expect(env.values).toEqual({ API_KEY: 'storybook-key', PUBLIC_SITE: 'example.com' });
    expect(env.missing).toEqual(['DATABASE_URL']);
    const code = envConfigModule(env) + privateEnvModule(env);
    for (const secret of [
      'dot-env-secret',
      'dot-env-local-secret',
      'postgres://real',
      'shell-secret',
    ]) {
      expect(code).not.toContain(secret);
    }
  });

  it('gives public variables the app’s values, like SvelteKit does', () => {
    const { dir, entry } = app({ '.env': 'PUBLIC_SITE=example.com\n' });
    vi.stubEnv('PUBLIC_SITE', 'from-the-shell.com');

    const env = browserEnv({ entry, envDir: dir, mode: 'development', env: {} });
    expect(env.values).toEqual({ PUBLIC_SITE: 'from-the-shell.com' });
  });
});

describe('the modules', () => {
  const { dir, entry } = app({});
  const env = browserEnv({ entry, envDir: dir, mode: 'development', env: { API_KEY: 'k' } });

  it('validates every value in the page, and leaves a missing one unset instead of failing', () => {
    const code = envConfigModule(env);
    expect(code).toContain(`import { variables } from ${JSON.stringify(entry)};`);
    expect(code).toContain(`import { validate, handle_issues } from '@sveltejs/kit/internal/env';`);
    expect(code).toContain('if (env[name] === undefined) continue;');
    expect(code).toContain('set_env({"API_KEY":"k"});');
  });

  it('exports each private variable from the config module', () => {
    expect(privateEnvModule(env)).toBe(
      [
        `import { dynamic_private_env as env } from '../config.js';`,
        '',
        'export const API_KEY = env.API_KEY;',
        'export const DATABASE_URL = env.DATABASE_URL;',
        '',
      ].join('\n')
    );
  });

  it('without `src/env.ts`, has no variables', () => {
    const none = browserEnv({ entry: null, envDir: dir, mode: 'development', env: {} });
    expect(envConfigModule(none)).toContain('export const variables = {};');
    expect(privateEnvModule(none)).not.toContain('export const');
  });

  it('names the missing variables in its warning', () => {
    expect(missingEnvWarning(['DATABASE_URL'])).toContain(
      "vitestPluginSvelteKit({ server: true, env: { DATABASE_URL: '...' } })"
    );
  });
});

describe('generatedEnvModule', () => {
  const outDir = '/app/.svelte-kit';
  it('finds the config and private modules, in dev and build', () => {
    expect(generatedEnvModule('/app/.svelte-kit/generated/dev/env/config.js', outDir)).toBe(
      'config'
    );
    expect(
      generatedEnvModule('/app/.svelte-kit/generated/build/env/private/server.js', outDir)
    ).toBe('private');
  });

  it('leaves other modules alone', () => {
    expect(generatedEnvModule('/app/.svelte-kit/generated/dev/env/public/server.js', outDir)).toBe(
      null
    );
    expect(generatedEnvModule('/elsewhere/generated/dev/env/config.js', outDir)).toBe(null);
  });
});
