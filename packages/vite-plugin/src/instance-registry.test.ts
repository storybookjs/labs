import { mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('storybook/internal/common', () => ({
  findStorybookPackageRoot: () => '/repo/node_modules/storybook',
  normalizeAddonName: (addon: string | { name: string }) =>
    typeof addon === 'string' ? addon : addon.name,
  versions: { storybook: '11.0.0-test' },
}));
vi.mock('storybook/internal/telemetry', () => ({
  detectAgent: () => ({ name: 'claude' }),
}));

const {
  createRuntimeInstanceRecord,
  getCleanupDecision,
  getInstanceRegistryDir,
  getMcpMetadataFromMainConfig,
  getStorybookBaseUrl,
  registerRuntimeInstance,
} = await import('./instance-registry.ts');

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getInstanceRegistryDir', () => {
  it('prefers an absolute XDG_STATE_HOME', () => {
    expect(getInstanceRegistryDir({ XDG_STATE_HOME: '/state' })).toBe('/state/storybook/instances');
  });

  it('falls back to ~/.storybook for a relative or missing XDG_STATE_HOME', () => {
    expect(getInstanceRegistryDir({ XDG_STATE_HOME: 'state' })).toMatch(/\.storybook\/instances$/);
    expect(getInstanceRegistryDir({})).toMatch(/\.storybook\/instances$/);
  });
});

describe('getStorybookBaseUrl', () => {
  it('keeps the mount path without a trailing slash', () => {
    expect(getStorybookBaseUrl('http://127.0.0.1:5173/__storybook/')).toBe(
      'http://127.0.0.1:5173/__storybook'
    );
    expect(getStorybookBaseUrl('http://127.0.0.1:5173/')).toBe('http://127.0.0.1:5173');
  });
});

describe('getMcpMetadataFromMainConfig', () => {
  it('reports the addon endpoint', () => {
    expect(getMcpMetadataFromMainConfig({ addons: [] })).toEqual({ status: 'not-installed' });
    expect(getMcpMetadataFromMainConfig({ addons: ['@storybook/addon-mcp'] })).toEqual({
      status: 'ready',
      endpoint: '/mcp',
    });
    expect(
      getMcpMetadataFromMainConfig({
        addons: [{ name: '@storybook/addon-mcp', options: { endpoint: '/sb-mcp' } }],
      })
    ).toEqual({ status: 'ready', endpoint: '/sb-mcp' });
  });
});

describe('createRuntimeInstanceRecord', () => {
  it('matches the registry schema the CLI reads', () => {
    const record = createRuntimeInstanceRecord({
      address: 'http://127.0.0.1:5173/__storybook/',
      configDir: '.storybook',
      cwd: '/repo',
      instanceId: 'id',
      now: new Date('2026-01-01T00:00:00.000Z'),
      pid: 42,
      port: 5173,
      token: 'secret',
    });
    expect(record).toEqual({
      schemaVersion: 1,
      instanceId: 'id',
      pid: 42,
      cwd: '/repo',
      configDir: '/repo/.storybook',
      url: 'http://127.0.0.1:5173/__storybook',
      port: 5173,
      token: 'secret',
      agent: 'claude',
      storybookVersion: '11.0.0-test',
      storybookPath: '/repo/node_modules/storybook',
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mcp: { status: 'not-installed' },
    });
  });
});

describe('getCleanupDecision', () => {
  const nowMs = Date.parse('2026-01-10T00:00:00.000Z');
  const decide = (name: string, content: string, ageMs: number) =>
    getCleanupDecision({ name, content, fileModifiedAtMs: nowMs - ageMs, nowMs });

  it('removes temp files after a day and malformed records after a week', () => {
    expect(decide('a.tmp', '', DAY_MS / 2)).toBe('keep');
    expect(decide('a.tmp', '', 2 * DAY_MS)).toBe('remove');
    expect(decide('a.json', '{', 6 * DAY_MS)).toBe('keep');
    expect(decide('a.json', '{', 8 * DAY_MS)).toBe('remove');
  });

  it('checks the pid of records between one day and a week old', () => {
    const at = (ageMs: number) => JSON.stringify({ pid: 7, updatedAt: new Date(nowMs - ageMs) });
    expect(decide('a.json', at(DAY_MS / 2), 0)).toBe('keep');
    expect(decide('a.json', at(2 * DAY_MS), 0)).toEqual({ checkPid: 7 });
    expect(decide('a.json', at(8 * DAY_MS), 0)).toBe('remove');
    expect(decide('a.json', JSON.stringify({}), 2 * DAY_MS)).toBe('keep');
  });
});

describe('registerRuntimeInstance', () => {
  let registryDir: string;

  beforeEach(async () => {
    registryDir = await mkdtemp(join(tmpdir(), 'sb-instances-'));
  });
  afterEach(async () => {
    await rm(registryDir, { recursive: true, force: true });
  });

  const record = () =>
    createRuntimeInstanceRecord({
      address: 'http://127.0.0.1:5173/__storybook',
      configDir: '.storybook',
      instanceId: 'instance',
      port: 5173,
      token: 'secret',
    });

  it('writes an owner-only record and removes it on cleanup', async () => {
    const registration = await registerRuntimeInstance(record(), registryDir);
    expect(registration.recordPath).toBe(join(registryDir, 'instance.json'));
    expect(JSON.parse(await readFile(registration.recordPath, 'utf-8')).instanceId).toBe(
      'instance'
    );
    if (process.platform !== 'win32') {
      expect((await stat(registryDir)).mode & 0o777).toBe(0o700);
      expect((await stat(registration.recordPath)).mode & 0o777).toBe(0o600);
    }
    expect(await readdir(registryDir)).toEqual(['instance.json']);

    await registration.cleanup();
    await registration.cleanup();
    expect(await readdir(registryDir)).toEqual([]);
  });

  it('sweeps stale leftovers from other processes', async () => {
    const stale = join(registryDir, 'stale.json');
    const fresh = join(registryDir, 'fresh.json');
    const temp = join(registryDir, 'old.tmp');
    await writeFile(
      stale,
      JSON.stringify({ pid: 1, updatedAt: new Date(Date.now() - 8 * DAY_MS) })
    );
    await writeFile(fresh, JSON.stringify({ pid: process.pid, updatedAt: new Date() }));
    await writeFile(temp, '');
    const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
    await utimes(temp, twoDaysAgo, twoDaysAgo);

    const registration = await registerRuntimeInstance(record(), registryDir);
    expect((await readdir(registryDir)).sort()).toEqual(['fresh.json', 'instance.json']);
    await registration.cleanup();
  });
});
