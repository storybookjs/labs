// Serves the static Storybook build for the e2e tests.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../storybook-static');
const port = Number(process.env.PORT ?? 6107);
/** @type {Record<string, string>} */
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

http
  .createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    let file = path.join(root, pathname);
    if (!file.startsWith(root)) return response.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      await stat(file);
    } catch {
      return response.writeHead(404).end();
    }
    response.writeHead(200, {
      'content-type': types[path.extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  })
  .listen(port, '127.0.0.1', () => console.log(`static Storybook on http://127.0.0.1:${port}`));
