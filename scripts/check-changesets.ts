import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import semver from 'semver';

/**
 * Checks the pending changesets against the labs release rules:
 * - with `--since <ref>`, every published package changed since that ref must be covered by a
 *   changeset (`changeset status` enforces this; use `pnpm changeset --empty` to opt out);
 * - no release may be a `major` bump or leave `0.x`, since labs packages are experimental.
 *
 * Usage: node scripts/check-changesets.ts [--since <ref>]
 */

type Release = { name: string; type: 'major' | 'minor' | 'patch' | 'none'; newVersion: string };
type ReleasePlan = { releases: Release[] };

const ROOT_DIR = join(import.meta.dirname, '..');

const args = process.argv.slice(2);
const sinceIndex = args.indexOf('--since');
const since = sinceIndex === -1 ? undefined : args[sinceIndex + 1];
if (sinceIndex !== -1 && !since) fail('Usage: node scripts/check-changesets.ts [--since <ref>]');

// `--output` writes the release plan as JSON instead of printing it.
const outDir = mkdtempSync(join(tmpdir(), 'changeset-status-'));
const outFile = join(outDir, 'plan.json');
try {
  const statusArgs = ['changeset', 'status', '--output', outFile];
  if (since) statusArgs.push('--since', since);
  const status = spawnSync('pnpm', statusArgs, { cwd: ROOT_DIR, encoding: 'utf8' });
  if (status.status !== 0) {
    fail(`changeset status failed:\n${status.stderr || status.stdout}`);
  }

  const plan = JSON.parse(readFileSync(outFile, 'utf8')) as ReleasePlan;
  const errors = plan.releases.flatMap((release) => {
    if (release.type === 'none') return [];
    const problems: string[] = [];
    if (release.type === 'major') {
      problems.push(`${release.name} has a major changeset; use minor for breaking changes on 0.x.`);
    }
    if (semver.major(release.newVersion) !== 0) {
      problems.push(
        `${release.name} would be released as ${release.newVersion}, but labs packages must stay on 0.x.`
      );
    }
    return problems;
  });

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(process.env.GITHUB_ACTIONS ? `::error::${error}` : error);
    }
    process.exit(1);
  }

  const releasing = plan.releases.filter((release) => release.type !== 'none');
  console.log(
    releasing.length === 0
      ? 'No pending releases.'
      : `Pending releases:\n${releasing.map((r) => `- ${r.name}@${r.newVersion} (${r.type})`).join('\n')}`
  );
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

/** Reports the error as a GitHub Actions annotation and exits. */
function fail(message: string): never {
  console.error(process.env.GITHUB_ACTIONS ? `::error::${message}` : message);
  process.exit(1);
}
