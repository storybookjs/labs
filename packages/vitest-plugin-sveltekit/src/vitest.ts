import { fn } from 'storybook/test';
import { beforeEach } from 'vitest';

import { installRemoteEnv, resetRemoteState } from './runtime/env.ts';

/**
 * The page that remote function requests come from. Plain Vitest has no `$app/state`, so this
 * small stand-in feeds the `x-sveltekit-pathname` and `x-sveltekit-search` headers (and so
 * `getRequestEvent().url` on the server side). Set `page.url` in a test to change it.
 */
export const page: { url: URL } = { url: defaultUrl() };

/** Always `null`: there is no navigation in a component test. */
export const navigating: { to: { url: URL } | null } | null = null;

/**
 * Stands in for SvelteKit's `goto` when a remote function redirects. A spy, so tests can assert
 * on it: `expect(goto).toHaveBeenCalledWith('/posts/1', expect.anything())`.
 */
export const goto: ReturnType<typeof fn<(url: string, options?: object) => Promise<void>>> =
  fn(async (_url: string, _options?: object) => {}).mockName('goto');

beforeEach(async () => {
  page.url = defaultUrl();
  goto.mockClear();
  await resetRemoteState();
  installRemoteEnv({ page, navigating, goto });
});

function defaultUrl(): URL {
  return new URL('/', location.origin);
}
