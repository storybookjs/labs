import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export type DevServer = {
  stop(): Promise<void>;
};

export async function startDevServer(
  cwd: string,
  args: string[],
  readyUrl: string,
  env: Record<string, string> = {}
): Promise<DevServer> {
  const child = spawn(process.execPath, args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      STORYBOOK_DISABLE_TELEMETRY: '1',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  let output = '';
  let exited = false;
  let stopPromise: Promise<void> | undefined;
  const exitPromise = new Promise<void>((resolve) => {
    child.once('exit', (code, signal) => {
      exited = true;
      output += `\nExit: ${code ?? signal}`;
      resolve();
    });
    child.once('error', (error) => {
      exited = true;
      output += `\n${error.message}`;
      resolve();
    });
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-24_000);
    });
  }

  const server: DevServer = {
    stop(): Promise<void> {
      return (stopPromise ??= (async () => {
        const deadline = setTimeout(() => signal('SIGKILL'), 15_000).unref();
        try {
          signal('SIGTERM');
          await exitPromise;
          signal('SIGKILL');
        } finally {
          clearTimeout(deadline);
        }
      })());
    },
  };

  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (exited) throw new Error('Server exited during startup.');
      try {
        const response = await fetch(readyUrl, { signal: AbortSignal.timeout(2_000) });
        await response.body?.cancel();
        if (response.ok) return server;
      } catch {
        // Compilation can exceed the readiness request timeout.
      }
      await delay(250);
    }
    throw new Error('Server startup timed out.');
  } catch (error) {
    await server.stop();
    throw new Error(`Unable to start ${readyUrl}.\n${output}`, { cause: error });
  }

  function signal(value: NodeJS.Signals): void {
    if (!child.pid) return;
    try {
      if (process.platform === 'win32') {
        if (!exited) child.kill(value);
      } else {
        process.kill(-child.pid, value);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }
}
