import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const cwd = path.resolve(import.meta.dirname, '..');

function vitest(project: string) {
  const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', project], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
    timeout: 240_000,
  });
  // oxlint-disable-next-line no-control-regex
  const output = `${result.stdout}\n${result.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  const summary = output.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  return {
    status: result.status,
    output,
    failed: Number(summary?.[1] ?? 0),
    passed: Number(summary?.[2] ?? 0),
  };
}

/**
 * How often `pattern` occurs in the files under `src` whose names match `name`. A lower bound:
 * tests made in a loop count once.
 */
function count(name: RegExp, pattern: RegExp): number {
  return readdirSync(path.join(cwd, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((file) => name.test(file))
    .reduce(
      (total, file) =>
        total + (readFileSync(path.join(cwd, 'src', file), 'utf8').match(pattern)?.length ?? 0),
      0
    );
}

test('runs the component tests in Vitest browser mode', () => {
  const { status, output, failed, passed } = vitest('components');
  expect(failed, output).toBe(0);
  expect(passed, output).toBeGreaterThanOrEqual(
    count(/(?<!\.server)\.test\.ts$/, /^test(\.fails)?\(/gm)
  );
  expect(status, output).toBe(0);
});

test('runs the server mode tests in Vitest browser mode', () => {
  const { status, output, failed, passed } = vitest('server');
  expect(failed, output).toBe(0);
  expect(passed, output).toBeGreaterThanOrEqual(count(/\.server\.test\.ts$/, /^test\(/gm));
  expect(status, output).toBe(0);
});

test('runs the stories (mocked and server mode) through @storybook/addon-vitest', () => {
  const { status, output, failed, passed } = vitest('storybook');
  const stories =
    count(/\.stories\.ts$/, /^export const \w+ = meta\.story\(/gm) +
    count(/\.stories\.svelte$/, /^<Story\b/gm);
  expect(failed, output).toBe(0);
  expect(passed, output).toBeGreaterThanOrEqual(stories);
  expect(status, output).toBe(0);
});
