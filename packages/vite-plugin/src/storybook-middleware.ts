import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

import { SERVER_CHANNEL_PATH } from 'storybook/internal/channels';

import { resolve } from 'pathe';
import type { ViteDevServer } from 'vite';

import { normalizeBase } from './base-path.ts';
import { HMR_PATH } from './socket-paths.ts';

/** Default mount path of the embedded Storybook. */
export const DEFAULT_STORYBOOK_BASE = '/__storybook';
/** Default Storybook configuration directory, relative to the project root. */
export const DEFAULT_STORYBOOK_CONFIG_DIR = '.storybook';

const HOST_HMR_PATH = '/__host-vite-hmr';

export type StorybookMiddlewareOptions = {
  /** Vite project root, normally the host framework's project root. */
  root: string;
  /**
   * Storybook configuration directory, resolved against `root`. Absolute paths are accepted.
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
  /**
   * The listening HTTP server Storybook attaches its WebSockets to. Defaults to the server the
   * first request under `base` arrived on, for hosts that never hand theirs out.
   */
  httpServer?: HttpServer;
  /** Receives Storybook start-up failures. Defaults to `console.error`. */
  onError?: (error: unknown) => void;
};

export type StorybookMiddlewareHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void
) => void;

export type StorybookMiddleware = {
  /** Connect-style handler for the host dev server's middleware stack. */
  middleware: StorybookMiddlewareHandler;
  /**
   * Whether an upgrade request for `pathname` belongs to Storybook. Storybook attaches its own
   * `upgrade` listeners; hosts that reject unclaimed upgrades must leave these sockets alone.
   */
  ownsUpgrade: (pathname: string) => boolean;
  /** Closes the Storybook Vite dev server, if it was started. */
  close: () => Promise<void>;
};

/**
 * Serves Storybook from inside a dev server that does not expose its Vite configuration, such
 * as Angular CLI's `ng serve` or a Next.js custom server.
 *
 * A dedicated Vite dev server carrying the Storybook plugin runs in middleware mode. It needs the
 * listening HTTP server to attach its WebSockets; unless `httpServer` is given (hosts like Angular
 * CLI never hand one out), the first request under `base` donates the server its own socket
 * belongs to. Storybook
 * therefore boots on first use; a failed boot is not cached and the next request retries it.
 */
export function createStorybookMiddleware(
  options: StorybookMiddlewareOptions
): StorybookMiddleware {
  const prefix = normalizeBase(options.base ?? DEFAULT_STORYBOOK_BASE);
  const configDir = resolve(options.root, options.configDir ?? DEFAULT_STORYBOOK_CONFIG_DIR);
  const onError = options.onError ?? ((error: unknown) => console.error(error));
  // The plugin mounts the preview's HMR socket under its base and the server channel at the root.
  const upgradePaths = new Set([HOST_HMR_PATH, `${prefix}${HMR_PATH}`, SERVER_CHANNEL_PATH]);
  let serverPromise: Promise<ViteDevServer> | undefined;

  return {
    middleware(req, res, next) {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (prefix !== '/' && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        next();
        return;
      }

      // Node sets `server` on every server-side socket; for an HTTP request it is the HTTP server.
      const httpServer =
        options.httpServer ??
        ((req.socket as { server?: unknown }).server as HttpServer | null | undefined);
      if (!httpServer) {
        next(new Error('The host development server did not expose its HTTP server.'));
        return;
      }

      (serverPromise ??= start(options.root, configDir, prefix, httpServer)).then(
        (vite) =>
          vite.middlewares(req, res, (error?: unknown) => {
            if (error) {
              next(error);
              return;
            }
            res.statusCode = 404;
            res.end('Storybook resource not found');
          }),
        (error: unknown) => {
          // A failed boot must not be cached; the next request retries it.
          serverPromise = undefined;
          onError(error);
          next(error);
        }
      );
    },

    ownsUpgrade(pathname) {
      return upgradePaths.has(pathname);
    },

    async close() {
      const pending = serverPromise;
      serverPromise = undefined;
      await pending?.then(
        (vite) => vite.close(),
        () => undefined
      );
    },
  };
}

async function start(
  root: string,
  configDir: string,
  base: string,
  httpServer: HttpServer
): Promise<ViteDevServer> {
  const [{ createServer }, { experimental_vitePlugin }] = await Promise.all([
    import('vite'),
    import('./index.ts'),
  ]);

  return createServer({
    root,
    // The host owns the application; this server exists only to serve Storybook.
    configFile: false,
    appType: 'custom',
    publicDir: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [experimental_vitePlugin({ configDir, base })],
    server: {
      middlewareMode: true,
      watch: null,
      hmr: { server: httpServer, path: HOST_HMR_PATH },
    },
  });
}
