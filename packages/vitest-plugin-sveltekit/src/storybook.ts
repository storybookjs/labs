import { goto, refreshAll } from '$app/navigation';
import { navigating, page } from '$app/state';
import { definePreviewAddon } from 'storybook/internal/csf';
import { fn } from 'storybook/test';

import { installRemoteEnv, resetRemoteState } from './runtime/env.ts';
import { setSpyFactory } from './runtime/registry.ts';

// `storybook/test` spies, so the calls show in the Actions panel.
setSpyFactory(() => fn());

/**
 * Resets every remote function mock and connects SvelteKit's remote function runtime to
 * Storybook's `$app/state` and `$app/navigation` mocks. Runs before each story.
 */
export async function beforeEach(): Promise<void> {
  await resetRemoteState();
  installRemoteEnv({ page, navigating, goto, refreshAll });
}

/**
 * Preview annotations for `definePreview({ addons: [remoteFunctions()] })`. With a classic
 * `preview.ts`, export `beforeEach` from this module instead.
 */
export default function remoteFunctions(): ReturnType<typeof definePreviewAddon> {
  return definePreviewAddon({ beforeEach });
}
