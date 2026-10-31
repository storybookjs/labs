// Serves the production build (`vp preview`) on a fresh database in a temporary folder, for the
// app e2e tests. The app seeds the database on its first request; the folder is deleted on exit.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'field-notes-e2e-'));
const port = process.env.PORT ?? '6108';

const preview = spawn(
  'pnpm',
  ['exec', 'vp', 'preview', '--host', '127.0.0.1', '--port', port, '--strictPort'],
  {
    cwd: path.resolve(import.meta.dirname, '../..'),
    env: { ...process.env, DATABASE_DIR: path.join(dir, 'db'), LIVE_POLL_MS: '250' },
    // Same process group: Playwright stops a web server by signalling its whole group, the
    // preview included. In a group of its own, the preview outlived the run and kept it open.
    stdio: 'inherit',
  }
);

function stop() {
  preview.kill('SIGTERM');
  rmSync(dir, { recursive: true, force: true });
}

process.on('SIGINT', () => (stop(), process.exit(0)));
process.on('SIGTERM', () => (stop(), process.exit(0)));
preview.on('exit', (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
