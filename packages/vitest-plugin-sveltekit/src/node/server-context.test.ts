import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { isProjectScript, reachesRemoteModule, type Resolve } from './server-context.ts';

const dir = path.resolve(import.meta.dirname, '../../test/fixtures/server-context/src');
const file = (name: string) => path.join(dir, name);
const resolve: Resolve = async (specifier, importer) =>
  specifier.startsWith('.') ? path.resolve(path.dirname(importer), specifier) : null;

describe('reachesRemoteModule', () => {
  it('finds a remote module behind a helper module', async () => {
    await expect(reachesRemoteModule(file('helper.ts'), resolve)).resolves.toBe(true);
  });

  it('follows re-exports through more than one module', async () => {
    await expect(reachesRemoteModule(file('deep.ts'), resolve)).resolves.toBe(true);
  });

  it('ignores type-only imports and modules without remote imports', async () => {
    await expect(reachesRemoteModule(file('types-only.ts'), resolve)).resolves.toBe(false);
    await expect(reachesRemoteModule(file('data.ts'), resolve)).resolves.toBe(false);
  });
});

describe('isProjectScript', () => {
  it('is false for packages and virtual modules', () => {
    expect(isProjectScript(file('helper.ts'))).toBe(true);
    expect(isProjectScript('/app/node_modules/x/index.js')).toBe(false);
    expect(isProjectScript('\0virtual:x')).toBe(false);
    expect(isProjectScript(file('Component.svelte'))).toBe(false);
  });
});
