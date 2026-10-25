import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import path from 'node:path';

import type { Connect, ViteDevServer } from 'vite';

/** The embedded Storybook, mounted inside `nuxt dev`. */
export type StorybookMiddleware = {
  /** Serves the Storybook mount and passes every other request on. */
  middleware: Connect.NextHandleFunction;
  /** Hands over the listening server and keeps the host's upgrade handlers off Storybook's sockets. */
  attach: (httpServer: Server) => void;
  /** Stops the Storybook Vite server, if it was started. */
  close: () => Promise<void>;
};

type UpgradeListener = (req: IncomingMessage, socket: Duplex, head: Buffer) => void;

const ROOT = import.meta.dirname;
const HOST_HMR_PATH = '/__host-vite-hmr';

/** Path the embedded Storybook is mounted under. */
export const STORYBOOK_BASE = '/__storybook';
/** Storybook configuration directory, shared with the Vite-driven Storybook modes. */
export const STORYBOOK_CONFIG_DIR = path.join(ROOT, '.storybook');

// The plugin mounts the preview's HMR socket under its base and the manager channel at the root.
const UPGRADE_PATHS = new Set([
  HOST_HMR_PATH,
  `${STORYBOOK_BASE}/__storybook-hmr`,
  '/storybook-server-channel',
]);

/**
 * Serves the embedded Storybook from inside the Nuxt development server.
 *
 * Nuxt compiles and serves the application with its own Vite servers, so this Vite server
 * only ever hosts Storybook and is fully described here. It starts on the first request to
 * the mount, which keeps `nuxt dev` start-up independent of Storybook.
 */
export function createStorybookMiddleware(): StorybookMiddleware {
  let httpServer: Server | undefined;
  let serverPromise: Promise<ViteDevServer> | undefined;

  return {
    middleware(req, res, next) {
      const pathname = pathnameOf(req);
      if (pathname !== STORYBOOK_BASE && !pathname.startsWith(`${STORYBOOK_BASE}/`)) {
        next();
        return;
      }
      if (!httpServer) {
        next(new Error('Nuxt has not exposed its HTTP server through the `listen` hook yet.'));
        return;
      }

      (serverPromise ??= start(httpServer)).then(
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
          next(error);
        }
      );
    },

    attach(server) {
      httpServer = server;
      // Nuxt forwards every upgrade outside its asset path to Nitro, which would proxy
      // Storybook's sockets to the Nitro worker and tear them down.
      for (const listener of server.listeners('upgrade') as UpgradeListener[]) {
        server.off('upgrade', listener);
        server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
          if (!UPGRADE_PATHS.has(pathnameOf(req))) {
            listener.call(server, req, socket, head);
          }
        });
      }
    },

    async close() {
      const pending = serverPromise;
      serverPromise = undefined;
      await pending?.then((vite) => vite.close());
    },
  };
}

async function start(httpServer: Server): Promise<ViteDevServer> {
  const [{ createServer }, { experimental_vitePlugin }] = await Promise.all([
    import('vite'),
    import('@storybook/vue3-vite/node'),
  ]);

  return createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    publicDir: false,
    // Nuxt watches the application; Storybook's preview server watches stories.
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [experimental_vitePlugin({ configDir: STORYBOOK_CONFIG_DIR, base: STORYBOOK_BASE })],
    server: {
      middlewareMode: true,
      watch: null,
      hmr: { server: httpServer, path: HOST_HMR_PATH },
    },
  });
}

function pathnameOf(req: IncomingMessage): string {
  return new URL(req.url ?? '/', 'http://localhost').pathname;
}
