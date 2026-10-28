import path from 'node:path';

/** Path the embedded Storybook is mounted under. */
export const STORYBOOK_BASE = '/__storybook';
/** Storybook configuration directory, shared with the Vite-driven Storybook modes. */
export const STORYBOOK_CONFIG_DIR = path.resolve(import.meta.dirname, '../../.storybook');

const HOST_HMR_PATH = '/__host-vite-hmr';

/**
 * @typedef {object} StorybookMiddlewareOptions
 * @property {string} root Vite project root, which is also the Angular project root.
 * @property {string} configDir Storybook configuration directory, relative to `root` or absolute.
 * @property {string} base Path the embedded Storybook is mounted under.
 * @property {{ error: (message: string) => void }} logger Angular CLI builder logger.
 */

/**
 * @typedef {object} StorybookMiddleware
 * @property {import('vite').Connect.NextHandleFunction} middleware
 * @property {() => Promise<void>} close
 */

/**
 * Serves the embedded Storybook from inside the Angular CLI development server.
 *
 * The plugin needs the listening HTTP server to attach its WebSockets, and the Angular
 * dev-server builder never hands one out, so the first matching request donates the
 * server its own socket belongs to. Storybook therefore boots on first use.
 *
 * @param {StorybookMiddlewareOptions} options
 * @returns {StorybookMiddleware}
 */
export function createStorybookMiddleware({ root, configDir, base, logger }) {
  const prefix = base.trim().replace(/\/+$/, '') || '/';
  /** @type {Promise<import('vite').ViteDevServer> | undefined} */
  let serverPromise;

  return {
    middleware(req, res, next) {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (prefix !== '/' && pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        next();
        return;
      }

      // Node sets `server` on every server-side socket; it is not part of the public typings.
      const httpServer = /** @type {{ server?: import('node:http').Server }} */ (req.socket).server;
      if (!httpServer) {
        next(new Error('The Angular development server did not expose its HTTP server.'));
        return;
      }

      (serverPromise ??= start({ root, configDir, base: prefix, httpServer })).then(
        (vite) =>
          vite.middlewares(req, res, (/** @type {unknown} */ error) => {
            if (error) {
              next(error);
              return;
            }
            res.statusCode = 404;
            res.end('Storybook resource not found');
          }),
        (error) => {
          // A failed boot must not be cached; the next request retries it.
          serverPromise = undefined;
          logger.error(String(error instanceof Error ? (error.stack ?? error.message) : error));
          next(error);
        }
      );
    },

    async close() {
      const pending = serverPromise;
      serverPromise = undefined;
      await pending?.then((vite) => vite.close(), noop);
    },
  };
}

/**
 * @param {{ root: string; configDir: string; base: string; httpServer: import('node:http').Server }} options
 * @returns {Promise<import('vite').ViteDevServer>}
 */
async function start({ root, configDir, base, httpServer }) {
  const [{ createServer }, { experimental_vitePlugin }] = await Promise.all([
    import('vite'),
    import('@storybookjs/vite-plugin'),
  ]);

  return createServer({
    root,
    // `ng serve` owns the application; this server exists only to host Storybook.
    configFile: false,
    appType: 'custom',
    publicDir: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [experimental_vitePlugin({ configDir: path.resolve(root, configDir), base })],
    server: {
      middlewareMode: true,
      watch: null,
      hmr: { server: httpServer, path: HOST_HMR_PATH },
    },
  });
}

/** @returns {void} */
function noop() {}
