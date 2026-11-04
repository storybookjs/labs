/**
 * Writer for Storybook's runtime instance registry, so `storybook tools` and the skills commands
 * can find the Storybook embedded in a host Vite server. Storybook core keeps its own writer
 * private (`core-server/utils/runtime-instance-registry.ts`), so this mirrors it.
 */

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { chmod, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';

import { findStorybookPackageRoot, normalizeAddonName, versions } from 'storybook/internal/common';
import { detectAgent } from 'storybook/internal/telemetry';
import type { StorybookConfig } from 'storybook/internal/types';

import { isAbsolute, join, resolve } from 'pathe';

/** Record of a running Storybook (schema v1, spec: storybookjs/storybook#34826). */
export type RuntimeInstanceRecord = {
  schemaVersion: 1;
  instanceId: string;
  pid: number;
  cwd: string;
  configDir: string;
  url: string;
  port: number;
  /** Token authenticating clients against this instance's WebSocket channel. */
  token: string;
  agent?: string;
  storybookVersion: string;
  /** Realpathed root of the `storybook` package in use; the CLI attaches only when it matches. */
  storybookPath?: string;
  startedAt: string;
  updatedAt: string;
  mcp: { status: 'not-installed' } | { status: 'ready'; endpoint: string };
};

export type RuntimeInstanceRegistration = {
  record: RuntimeInstanceRecord;
  recordPath: string;
  /** Remove the record and the process exit handlers. Safe to call more than once. */
  cleanup: () => Promise<void>;
};

const STORYBOOK_MCP_ADDON = '@storybook/addon-mcp';
const DEFAULT_MCP_ENDPOINT = '/mcp';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const REGISTRY_DIR_MODE = 0o700;
const RECORD_FILE_MODE = 0o600;

/** `$XDG_STATE_HOME/storybook/instances`, or `~/.storybook/instances` when unset. */
export function getInstanceRegistryDir(env: NodeJS.ProcessEnv = process.env): string {
  const xdgStateHome = env.XDG_STATE_HOME?.trim();
  const stateDir =
    xdgStateHome && isAbsolute(xdgStateHome)
      ? join(xdgStateHome, 'storybook')
      : join(homedir(), '.storybook');
  return join(stateDir, 'instances');
}

/** Origin plus pathname without a trailing slash, e.g. `http://localhost:5173/__storybook`. */
export function getStorybookBaseUrl(address: string): string {
  const url = new URL(address);
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
}

export function getMcpMetadataFromMainConfig(
  mainConfig: Pick<StorybookConfig, 'addons'>
): RuntimeInstanceRecord['mcp'] {
  const addon = mainConfig.addons?.find(
    (entry) => normalizeAddonName(entry) === STORYBOOK_MCP_ADDON
  );
  if (!addon) {
    return { status: 'not-installed' };
  }
  const endpoint =
    typeof addon === 'object' && typeof addon.options?.endpoint === 'string'
      ? addon.options.endpoint
      : DEFAULT_MCP_ENDPOINT;
  return { status: 'ready', endpoint };
}

export function createRuntimeInstanceRecord({
  address,
  agent = detectAgent()?.name,
  configDir,
  cwd = process.cwd(),
  instanceId = randomUUID(),
  mcp = { status: 'not-installed' },
  now = new Date(),
  pid = process.pid,
  port,
  storybookPath = findStorybookPackageRoot(),
  storybookVersion = versions.storybook,
  token,
}: {
  address: string;
  agent?: string;
  configDir: string;
  cwd?: string;
  instanceId?: string;
  mcp?: RuntimeInstanceRecord['mcp'];
  now?: Date;
  pid?: number;
  port: number;
  storybookPath?: string;
  storybookVersion?: string;
  token: string;
}): RuntimeInstanceRecord {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    instanceId,
    pid,
    cwd: resolve(cwd),
    configDir: resolve(cwd, configDir),
    url: getStorybookBaseUrl(address),
    port,
    token,
    ...(agent ? { agent } : {}),
    storybookVersion,
    ...(storybookPath ? { storybookPath } : {}),
    startedAt: timestamp,
    updatedAt: timestamp,
    mcp,
  };
}

/** Write `record` atomically into `registryDir` and remove it again when the process exits. */
export async function registerRuntimeInstance(
  record: RuntimeInstanceRecord,
  registryDir: string = getInstanceRegistryDir()
): Promise<RuntimeInstanceRegistration> {
  const recordPath = await writeRuntimeInstanceRecord(record, registryDir);
  const unregisterProcessCleanup = registerProcessCleanup(recordPath);
  return {
    record,
    recordPath,
    cleanup: async () => {
      unregisterProcessCleanup();
      await rm(recordPath, { force: true });
    },
  };
}

export async function writeRuntimeInstanceRecord(
  record: RuntimeInstanceRecord,
  registryDir: string
): Promise<string> {
  await mkdir(registryDir, { recursive: true, mode: REGISTRY_DIR_MODE });
  // `mkdir` ignores `mode` for an existing dir and umask can clear bits, so modes are enforced.
  await restrictOwnerAccess(registryDir, REGISTRY_DIR_MODE);
  await cleanupRegistry(registryDir);

  const recordPath = join(registryDir, `${record.instanceId}.json`);
  const tempPath = join(
    registryDir,
    `${record.instanceId}.${record.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );
  try {
    await writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: 'utf-8',
      mode: RECORD_FILE_MODE,
    });
    await restrictOwnerAccess(tempPath, RECORD_FILE_MODE);
    await rename(tempPath, recordPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
  return recordPath;
}

async function restrictOwnerAccess(targetPath: string, mode: number): Promise<void> {
  await chmod(targetPath, mode);
  if (process.platform !== 'win32') {
    return;
  }
  // chmod on Windows only toggles the writable bit; it does not create an owner-only ACL.
  const { username } = userInfo();
  await new Promise<void>((resolveExec, rejectExec) => {
    execFile('icacls', [targetPath, '/inheritance:r', '/grant:r', `${username}:(F)`], (error) =>
      error ? rejectExec(error) : resolveExec()
    );
  }).catch((error: unknown) => {
    throw new Error(
      `Could not restrict ${targetPath} to the current Windows user. ` +
        'The instance record would be readable by other accounts.',
      { cause: error }
    );
  });
}

type CleanupDecision = 'keep' | 'remove' | { checkPid: number };

/** Opportunistic removal of leftovers from crashed processes; mirrors Storybook core's policy. */
export function getCleanupDecision({
  name,
  content,
  fileModifiedAtMs,
  nowMs,
}: {
  name: string;
  content: string;
  fileModifiedAtMs: number;
  nowMs: number;
}): CleanupDecision {
  const fileAgeMs = nowMs - fileModifiedAtMs;
  if (name.endsWith('.tmp')) {
    return fileAgeMs > ONE_DAY_MS ? 'remove' : 'keep';
  }
  let record: unknown;
  try {
    record = JSON.parse(content);
  } catch {
    return fileAgeMs > SEVEN_DAYS_MS ? 'remove' : 'keep';
  }
  const fields =
    typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : {};
  const recordTimestampMs = parseTimestamp(fields.updatedAt) ?? parseTimestamp(fields.startedAt);
  const recordAgeMs = nowMs - (recordTimestampMs ?? fileModifiedAtMs);
  if (recordAgeMs > SEVEN_DAYS_MS) {
    return 'remove';
  }
  if (recordAgeMs < ONE_DAY_MS) {
    return 'keep';
  }
  const pid = fields.pid;
  return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? { checkPid: pid } : 'keep';
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function isPidInactive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH';
  }
}

async function cleanupRegistry(registryDir: string): Promise<void> {
  const nowMs = Date.now();
  const entries = await readdir(registryDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    entries.map(async (entry) => {
      const isRecordFile = entry.name.endsWith('.json') || entry.name.endsWith('.tmp');
      if (!entry.isFile() || !isRecordFile) {
        return;
      }
      const recordPath = join(registryDir, entry.name);
      try {
        const { mtimeMs } = await stat(recordPath);
        const content = entry.name.endsWith('.tmp') ? '' : await readFile(recordPath, 'utf-8');
        const decision = getCleanupDecision({
          name: entry.name,
          content,
          fileModifiedAtMs: mtimeMs,
          nowMs,
        });
        if (
          decision === 'remove' ||
          (typeof decision === 'object' && isPidInactive(decision.checkPid))
        ) {
          await rm(recordPath, { force: true });
        }
      } catch {}
    })
  );
}

function registerProcessCleanup(recordPath: string): () => void {
  const cleanupSync = (): void => {
    if (existsSync(recordPath)) {
      rmSync(recordPath, { force: true });
    }
  };
  // The host process (Vite CLI, a custom server) owns signal handling; a listener here must not
  // keep it alive, so the default exit is restored once nobody else handles the signal.
  const onSignal = (signal: NodeJS.Signals): void => {
    cleanupSync();
    if (process.listenerCount(signal) === 0) {
      process.kill(process.pid, signal);
    }
  };
  const onSigint = (): void => onSignal('SIGINT');
  const onSigterm = (): void => onSignal('SIGTERM');
  process.once('exit', cleanupSync);
  process.prependOnceListener('SIGINT', onSigint);
  process.prependOnceListener('SIGTERM', onSigterm);
  return () => {
    process.off('exit', cleanupSync);
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
  };
}
