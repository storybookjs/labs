import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import type { Socket } from 'node:net';

import { resolve } from 'pathe';

import { normalizeBase } from '../base-path.ts';

import {
  DEFAULT_STORYBOOK_BASE,
  createStorybookMiddleware,
  type StorybookMiddleware,
} from '../storybook-middleware.ts';

/**
 * The part of Next's custom-server API this adapter uses. Next's own types augment `process.env`
 * globally, so they are kept out of this package's declarations.
 */
type NextApp = {
  prepare: () => Promise<void>;
  getRequestHandler: () => (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  close: () => Promise<void>;
};
type CreateNextApp = (options: Record<string, unknown>) => NextApp;

const NEXT_MODULE = 'next';

export type NextDevServerOptions = {
  /**
   * Next.js project directory.
   *
   * @default process.cwd()
   */
  dir?: string;
  /**
   * Host name to listen on.
   *
   * @default process.env.HOSTNAME ?? 'localhost'
   */
  hostname?: string;
  /**
   * Port to listen on.
   *
   * @default Number(process.env.PORT ?? 3000)
   */
  port?: number;
  /**
   * Bundle the application with Turbopack; `false` uses webpack.
   *
   * @default true
   */
  turbopack?: boolean;
  /** Embedded Storybook settings. */
  storybook?: {
    /**
     * Storybook configuration directory, resolved against `dir`.
     *
     * @default '.storybook'
     */
    configDir?: string;
    /**
     * Path the embedded Storybook is mounted under.
     *
     * @default '/__storybook'
     */
    base?: string;
  };
  /**
   * Additional options passed to `next()`, such as `conf` or `quiet`. `dev`, `dir`, `hostname`,
   * `port`, `turbopack` and `httpServer` are set by this adapter.
   */
  next?: Record<string, unknown>;
  /**
   * Shut down and exit on `SIGINT` and `SIGTERM`.
   *
   * @default true
   */
  handleSignals?: boolean;
};

export type NextDevServer = {
  /** Origin the application is served on. */
  url: string;
  /** URL of the embedded Storybook. */
  storybookUrl: string;
  /** The listening HTTP server shared by Next.js and Storybook. */
  httpServer: HttpServer;
  /** Closes Next.js, Storybook and the HTTP server, including upgraded sockets. Idempotent. */
  close: () => Promise<void>;
};

/**
 * Starts `next dev` as a custom server with Storybook embedded on the same port.
 *
 * Next.js has no dev-server plugin API, so this replaces `next dev`: one Node HTTP listener
 * hands requests under the Storybook mount to the Storybook Vite server and everything else to
 * Next. Storybook boots on its first request, so Next start-up does not wait for it.
 *
 * Development only. Keep `next build` and `next start` for production.
 *
 * @example
 *   // server.mjs, run with `node server.mjs` instead of `next dev`
 *   import { startNextDevServer } from '@storybook/vite-plugin/nextjs';
 *
 *   await startNextDevServer();
 */
export async function startNextDevServer(
  options: NextDevServerOptions = {}
): Promise<NextDevServer> {
  const dir = resolve(options.dir ?? process.cwd());
  const hostname = options.hostname ?? process.env.HOSTNAME ?? 'localhost';
  const port = options.port ?? Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('The Next.js dev server port must be an integer from 0 to 65535.');
  }

  // Next reads NODE_ENV while loading, so it is set before `next` is imported.
  Reflect.set(process.env, 'NODE_ENV', process.env.NODE_ENV ?? 'development');
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      `startNextDevServer is development-only, but NODE_ENV is "${process.env.NODE_ENV}". Use next build and next start for production.`
    );
  }

  const httpServer = createServer();
  // Next attaches its router-level HMR listener here on its first request; it never listens.
  // Only `/_next/…` upgrades are forwarded, so no socket reaches two owners.
  const nextUpgrades = createServer();
  const sockets = new Set<Socket>();
  const base = normalizeBase(options.storybook?.base ?? DEFAULT_STORYBOOK_BASE);
  const storybook = createStorybookMiddleware({
    root: dir,
    configDir: options.storybook?.configDir,
    base,
    httpServer,
  });
  const { default: next } = (await import(NEXT_MODULE)) as { default: CreateNextApp };
  const app = next({
    ...options.next,
    dev: true,
    dir,
    hostname,
    port,
    turbopack: options.turbopack ?? true,
    httpServer: nextUpgrades,
  });

  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> =>
    (closePromise ??= closeAll(httpServer, nextUpgrades, sockets, app, storybook));

  httpServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    if (closePromise) socket.destroy();
  });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (pathname.startsWith('/_next/')) {
        if (!nextUpgrades.emit('upgrade', req, socket, head)) socket.destroy();
      } else if (!storybook.ownsUpgrade(pathname)) {
        // Storybook's own listeners handle its sockets; anything nobody claims is rejected.
        socket.destroy();
      }
    } catch (error) {
      console.error(error);
      socket.destroy();
    }
  });

  try {
    await app.prepare();
    const handleNext = app.getRequestHandler();

    httpServer.on('request', (req, res) => {
      try {
        storybook.middleware(req, res, (error) => {
          if (error) {
            failResponse(res, error);
            return;
          }
          handleNext(req, res).catch((nextError: unknown) => failResponse(res, nextError));
        });
      } catch (error) {
        failResponse(res, error);
      }
    });

    await new Promise<void>((resolvePromise, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, hostname, () => {
        httpServer.off('error', reject);
        resolvePromise();
      });
    });
  } catch (error) {
    await close().catch(() => undefined);
    throw error;
  }

  const address = httpServer.address();
  const listeningPort = address && typeof address === 'object' ? address.port : port;
  const url = `http://${hostname.includes(':') ? `[${hostname}]` : hostname}:${listeningPort}`;
  const storybookUrl = base === '/' ? `${url}/` : `${url}${base}/`;

  if (options.handleSignals ?? true) {
    const onSignal = (): void => {
      const deadline = setTimeout(() => process.exit(1), 10_000).unref();
      close().then(
        () => {
          clearTimeout(deadline);
          process.exit(process.exitCode ?? 0);
        },
        (error: unknown) => {
          console.error(error);
          process.exit(1);
        }
      );
    };
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
  }

  console.log(`  ▲ Next.js:   ${url}\n  ◆ Storybook: ${storybookUrl}`);

  return { url, storybookUrl, httpServer, close };
}

async function closeAll(
  httpServer: HttpServer,
  nextUpgrades: HttpServer,
  sockets: Set<Socket>,
  app: NextApp,
  storybook: StorybookMiddleware
): Promise<void> {
  const closed = httpServer.listening
    ? new Promise<void>((resolvePromise) => httpServer.close(() => resolvePromise()))
    : Promise.resolve();
  // Closing the HTTP server alone does not close upgraded sockets.
  for (const socket of sockets) socket.destroy();
  const results = await Promise.allSettled([closed, app.close(), storybook.close()]);
  nextUpgrades.removeAllListeners();
  const failures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : []
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, 'The Next.js dev server did not shut down cleanly.');
  }
}

function failResponse(res: ServerResponse, error: unknown): void {
  console.error(error);
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.statusCode = 500;
  res.end('Development server error');
}
