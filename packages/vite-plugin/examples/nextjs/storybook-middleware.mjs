import path from 'node:path';

const ROOT = import.meta.dirname;
const HOST_HMR_PATH = '/__host-vite-hmr';
const CONFIG_DIR = path.join(ROOT, '.storybook');

/** Path the embedded Storybook is mounted under. */
export const STORYBOOK_BASE = '/__storybook';

// The plugin mounts the preview's HMR socket under its base and the manager channel at the root.
const UPGRADE_PATHS = new Set([
  HOST_HMR_PATH,
  `${STORYBOOK_BASE}/__storybook-hmr`,
  '/storybook-server-channel',
]);

/**
 * @typedef {object} StorybookMiddleware
 * @property {import('vite').Connect.NextHandleFunction} middleware
 * @property {(pathname: string) => boolean} ownsUpgrade
 * @property {() => Promise<void>} close
 */

/**
 * Serves the embedded Storybook from inside the custom development server.
 *
 * There is no Vite config file: Next compiles and serves the application, so this Vite
 * server only ever hosts Storybook and is fully described here. It starts on the first
 * request to the mount, which keeps `next dev` start-up independent of Storybook.
 *
 * @param {{ httpServer: import('node:http').Server }} options
 * @returns {StorybookMiddleware}
 */
export function createStorybookMiddleware({ httpServer }) {
  /** @type {Promise<import('vite').ViteDevServer> | undefined} */
  let serverPromise;

  return {
    middleware(req, res, next) {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (pathname !== STORYBOOK_BASE && !pathname.startsWith(`${STORYBOOK_BASE}/`)) {
        next();
        return;
      }

      (serverPromise ??= start(httpServer)).then(
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
          next(error);
        }
      );
    },

    // Vite and Storybook attach their own listeners; the host only decides who may upgrade.
    ownsUpgrade(pathname) {
      return UPGRADE_PATHS.has(pathname);
    },

    async close() {
      const pending = serverPromise;
      serverPromise = undefined;
      await pending?.then((vite) => vite.close());
    },
  };
}

/**
 * @param {import('node:http').Server} httpServer
 * @returns {Promise<import('vite').ViteDevServer>}
 */
async function start(httpServer) {
  const [{ createServer }, { experimental_vitePlugin }] = await Promise.all([
    import('vite'),
    import('@storybookjs/vite-plugin'),
  ]);

  return createServer({
    root: ROOT,
    configFile: false,
    appType: 'custom',
    publicDir: false,
    // Next watches the application; Storybook's preview server watches stories.
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [experimental_vitePlugin({ configDir: CONFIG_DIR, base: STORYBOOK_BASE })],
    server: {
      middlewareMode: true,
      watch: null,
      hmr: { server: httpServer, path: HOST_HMR_PATH },
    },
  });
}
