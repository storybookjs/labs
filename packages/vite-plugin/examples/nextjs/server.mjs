import { createServer as createHttpServer } from 'node:http';

import next from 'next';

import { STORYBOOK_BASE, createStorybookMiddleware } from './storybook-middleware.mjs';

const ROOT = import.meta.dirname;
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT ?? 5193);
const ORIGIN = `http://${HOST}:${PORT}`;
const HTTP_SERVER = createHttpServer();
// Next attaches its router-level HMR listener here on the first Next request; never listen.
const NEXT_UPGRADES = createHttpServer();
/** @type {Set<import('node:net').Socket>} */
const SOCKETS = new Set();

// Next's generated types mark NODE_ENV read-only; a custom server still has to set it.
Reflect.set(process.env, 'NODE_ENV', process.env.NODE_ENV ?? 'development');
if (process.env.NODE_ENV !== 'development') {
  throw new Error('This custom server is development-only. Use next build and next start.');
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer from 1 to 65535.');
}

const APP = next({
  dev: true,
  dir: ROOT,
  hostname: HOST,
  port: PORT,
  turbopack: true,
  httpServer: NEXT_UPGRADES,
});
const STORYBOOK = createStorybookMiddleware({ httpServer: HTTP_SERVER });
/** @type {Promise<void> | undefined} */
let shutdownPromise;

HTTP_SERVER.on('connection', (socket) => {
  SOCKETS.add(socket);
  socket.once('close', () => SOCKETS.delete(socket));
  if (shutdownPromise) socket.destroy();
});

HTTP_SERVER.on('upgrade', (req, socket, head) => {
  try {
    const pathname = new URL(req.url ?? '/', ORIGIN).pathname;
    if (pathname.startsWith('/_next/')) {
      if (!NEXT_UPGRADES.emit('upgrade', req, socket, head)) socket.destroy();
    } else if (!STORYBOOK.ownsUpgrade(pathname)) {
      socket.destroy();
    }
  } catch (error) {
    console.error(error);
    socket.destroy();
  }
});

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

try {
  await start();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await shutdown();
}

/** @returns {Promise<void>} */
async function start() {
  await APP.prepare();
  const handleNext = APP.getRequestHandler();

  // Storybook claims its own mount and hands every other route straight to Next.
  HTTP_SERVER.on('request', (req, res) => {
    try {
      STORYBOOK.middleware(req, res, (error) => {
        if (error) {
          failResponse(res, error);
          return;
        }
        void handleNext(req, res).catch((nextError) => failResponse(res, nextError));
      });
    } catch (error) {
      failResponse(res, error);
    }
  });

  await new Promise((resolve, reject) => {
    HTTP_SERVER.once('error', reject);
    HTTP_SERVER.listen(PORT, HOST, () => {
      HTTP_SERVER.off('error', reject);
      resolve(undefined);
    });
  });
  HTTP_SERVER.on('error', (error) => {
    console.error(error);
    process.exitCode = 1;
    void shutdown();
  });
  console.log(`Next.js: ${ORIGIN}\nStorybook: ${ORIGIN}${STORYBOOK_BASE}/`);
}

/** @param {import('node:http').ServerResponse} res @param {unknown} error @returns {void} */
function failResponse(res, error) {
  console.error(error);
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.statusCode = 500;
  res.end('Development server error');
}

/** @returns {Promise<void>} */
function shutdown() {
  return (shutdownPromise ??= (async () => {
    const deadline = setTimeout(() => process.exit(1), 10_000).unref();
    const closed = new Promise((resolve) => HTTP_SERVER.close(() => resolve(undefined)));
    // HTTP close alone does not close upgraded sockets.
    for (const socket of SOCKETS) socket.destroy();
    const results = await Promise.allSettled([closed, APP.close(), STORYBOOK.close()]);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(result.reason);
        process.exitCode = 1;
      }
    }
    NEXT_UPGRADES.removeAllListeners();
    clearTimeout(deadline);
    process.exit(process.exitCode ?? 0);
  })());
}
