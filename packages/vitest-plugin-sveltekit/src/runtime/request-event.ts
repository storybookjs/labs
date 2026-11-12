/**
 * The request that remote function requests run in, for `getRequestEvent()` in your server code.
 * `mockRequestEvent()` returns it; it is reset before each story and test.
 */
export interface MockRequestEvent {
  /** Copied into `event.locals` of each request. A `handle` hook can still add to it. */
  locals: App.Locals;
  /** Sent with each request, and updated by the cookies a remote function sets or deletes. */
  cookies: MockCookies;
  /** `event.params`. */
  params: Record<string, string>;
  /** `event.route`. */
  route: { id: string | null };
  /**
   * `event.url`. When `undefined`, the URL of the page is used, as in SvelteKit: `page.url` from
   * `$app/state` in Storybook, `page.url` from `vitest-plugin-sveltekit/vitest` in
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

/** What `mockRequestEvent()` takes. Each field you pass replaces the current value. */
export interface MockRequestEventInit {
  /** Replaces `locals` (no merge). */
  locals?: App.Locals;
  /** Replaces the contents of the cookie jar: `{ session: 'svelty' }`. */
  cookies?: Record<string, string>;
  params?: Record<string, string>;
  route?: { id: string | null };
  /** `undefined` uses the URL of the page again. */
  url?: URL;
  platform?: App.Platform;
}

/** The event of the running story or test. The runtime reads it for each request. */
export const requestEvent: MockRequestEvent = initialRequestEvent();

/**
 * Sets up the request that remote functions run in, for `getRequestEvent()` in your server code
 * (server mode in the browser, and direct calls in Vitest's Node mode), and returns it. Each field you pass replaces the current value; fields you leave
 * out keep theirs. It is reset before each story and test.
 *
 * The result is the live event, with the cookie jar, for assertions on what your server code
 * wrote, or for changes in a later step. Without arguments, `mockRequestEvent()` only returns it.
 *
 * ```ts
 * import { mockRequestEvent } from 'vitest-plugin-sveltekit/server.mock';
 *
 * beforeEach(() => {
 *   mockRequestEvent({ locals: { user: { id: 1, name: 'Svelty' } }, cookies: { session: 'abc' } });
 * });
 *
 * // After a sign-in:
 * expect(mockRequestEvent().cookies.get('session')).toBe('svelty');
 * ```
 */
export function mockRequestEvent(partial: MockRequestEventInit = {}): MockRequestEvent {
  for (const hook of readHooks) hook();
  const has = (key: keyof MockRequestEventInit) => Object.hasOwn(partial, key);
  if (has('locals')) requestEvent.locals = partial.locals ?? ({} as App.Locals);
  if (has('cookies')) {
    // The same jar: a request in flight keeps the jar it started with (see `server.ts`).
    for (const { name } of requestEvent.cookies.getAll()) requestEvent.cookies.delete(name);
    for (const [name, value] of Object.entries(partial.cookies ?? {})) {
      requestEvent.cookies.set(name, value);
    }
  }
  if (has('params')) requestEvent.params = partial.params ?? {};
  if (has('route')) requestEvent.route = partial.route ?? { id: null };
  if (has('url')) requestEvent.url = partial.url;
  if (has('platform')) requestEvent.platform = partial.platform;
  return requestEvent;
}

const readHooks: Array<() => void> = [];

/** Runs `hook` each time `mockRequestEvent()` is called, before it applies `partial`. */
export function onMockRequestEventRead(hook: () => void): void {
  readHooks.push(hook);
}

/** Restores the defaults, with a new cookie jar. Called before each story and test. */
export function resetRequestEvent(): void {
  Object.assign(requestEvent, initialRequestEvent());
}
