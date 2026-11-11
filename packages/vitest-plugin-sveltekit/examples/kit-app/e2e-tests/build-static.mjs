// Builds the static Storybook for the e2e tests with a fake secret in `.env.local` too (`.env` has
// one already), so `storybook.spec.ts` can check that neither reaches the build. An existing
// `.env.local` is moved aside for the build and put back after.
import { execFileSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const local = path.join(root, '.env.local');
const backup = `${local}.e2e-backup`;

if (existsSync(local)) renameSync(local, backup);
writeFileSync(local, 'API_TOKEN=dot-env-local-secret-4c9e\n');
try {
  execFileSync('pnpm', ['exec', 'storybook', 'build', '--quiet'], { cwd: root, stdio: 'inherit' });
} finally {
  rmSync(local, { force: true });
  if (existsSync(backup)) renameSync(backup, local);
}
