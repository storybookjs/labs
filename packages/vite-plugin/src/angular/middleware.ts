import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

import { resolve } from 'pathe';
import type { ViteDevServer } from 'vite';

/** Default mount path of the embedded Storybook. */
export const DEFAULT_STORYBOOK_BASE = '/__storybook';
/** Default Storybook configuration directory, relative to the project root. */
export const DEFAULT_STORYBOOK_CONFIG_DIR = '.storybook';

const HOST_HMR_PATH = '/__host-vite-hmr';

export type StorybookMiddlewareOptions = {
  /** Vite project root, normally the Angular project root. */
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
  /** Closes the Storybook Vite dev server, if it was started. */
  close: () => Promise<void>;
};

/**
 * Serves Storybook from inside a dev server that does not expose its Vite configuration, such
 * as Angular CLI's `ng serve`.
 *
 * A dedicated Vite dev server carrying the Storybook plugin runs in middleware mode. It needs the
 * listening HTTP server to attach its WebSockets, and hosts like Angular CLI never hand one out,
 * so the first request under `base` donates the server its own socket belongs to. Storybook
 * therefore boots on first use; a failed boot is not cached and the next request retries it.
 */
export function createStorybookMiddleware(
  options: StorybookMiddlewareOptions
): StorybookMiddleware {
  const prefix = normalizeBase(options.base ?? DEFAULT_STORYBOOK_BASE);
  const configDir = resolve(options.root, options.configDir ?? DEFAULT_STORYBOOK_CONFIG_DIR);
  const onError = options.onError ?? ((error: unknown) => console.error(error));
  let serverPromise: Promise<ViteDevServer> | undefined;

  return {
    middleware(req, res, next) {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (prefix !== '/' && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        next();
        return;
      }

      // Node sets `server` on every server-side socket; for an HTTP request it is the HTTP server.
      const httpServer = (req.socket as { server?: unknown }).server as
        | HttpServer
        | null
        | undefined;
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
    import('../index.ts'),
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

function normalizeBase(base: string): string {
  const trimmed = base.trim();
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}
