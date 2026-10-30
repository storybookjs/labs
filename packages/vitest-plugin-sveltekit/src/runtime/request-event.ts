/**
 * The request that remote function requests run in, for `getRequestEvent()` in your server code.
 * Change it in `beforeEach` (or at the start of a test); it is reset before each story and test.
 */
export interface MockRequestEvent {
  /** Copied into `event.locals` of each request. A `handle` hook can still add to it. */
  locals: App.Locals;
  /** Sent with each request, and updated by the cookies a remote function sets. */
  cookies: MockCookies;
  /** `event.params`. */
  params: Record<string, string>;
  /** `event.route`. */
  route: { id: string | null };
  /**
   * `event.url`. When `undefined`, the URL of the page is used, as in SvelteKit: `page.url` from
   * `$app/state` in Storybook, `page.url` from `@storybookjs/vitest-plugin-sveltekit/vitest` in
   * Vitest.
   */
  url: URL | undefined;
  /** `event.platform`. */
  platform: App.Platform | undefined;
}

/** A cookie jar for the page. Names only: paths and domains are not tracked. */
export interface MockCookies {
  get(name: string): string | undefined;
  getAll(): Array<{ name: string; value: string }>;
  set(name: string, value: string): void;
  delete(name: string): void;
}

function createCookies(): MockCookies {
  const jar = new Map<string, string>();
  return {
    get: (name) => jar.get(name),
    getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name),
  };
}

function initialRequestEvent(): MockRequestEvent {
  return {
    locals: {} as App.Locals,
    cookies: createCookies(),
    params: {},
    route: { id: null },
    url: undefined,
    platform: undefined,
  };
}

/**
 * ```ts
 * import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
 *
 * beforeEach(() => {
 *   requestEvent.locals.user = { id: 1, name: 'Ada' };
 *   requestEvent.cookies.set('session', 'abc');
 * });
 * ```
 */
export const requestEvent: MockRequestEvent = initialRequestEvent();

/** Restores the defaults. Called before each story and test. */
export function resetRequestEvent(): void {
  Object.assign(requestEvent, initialRequestEvent());
}
