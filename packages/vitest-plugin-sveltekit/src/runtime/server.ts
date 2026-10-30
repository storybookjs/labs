import type { RequestEvent } from '@sveltejs/kit';
import type { Handle, Transport } from '@sveltejs/kit/hooks';
import * as app from 'virtual:@storybookjs/vitest-plugin-sveltekit/app';
import * as kit from 'virtual:@storybookjs/vitest-plugin-sveltekit/kit';

import type { RemoteKind } from '../node/analyze.ts';
import { requestEvent } from './request-event.ts';
import {
  getRemoteEntries,
  getServerModuleLoader,
  getServerModuleLoaders,
  hasRemoteModule,
  isMocked,
  onRegister,
  type RemoteEntry,
  resetGeneration,
} from './registry.ts';

type RemoteModule = Record<string, unknown>;
type RemoteFunction = { __: { type: string } };

/** What a request needs from the app's server hooks, with SvelteKit's defaults filled in. */
interface ServerHooks {
  handle: Handle;
}

/** The fake (mock-backed) module of each remote file. */
const fakes = new Map<string, RemoteModule>();
/** The module each remote file served last, real or fake, for `refreshingRequested`. */
const served = new Map<string, RemoteModule>();
onRegister((hash) => {
  fakes.delete(hash);
  served.delete(hash);
});

let setupPromise: Promise<ServerHooks> | undefined;

/** The transport from the app's `src/hooks.ts`, for the client side of the runtime. */
export const transport: Transport = app.universalHooks.transport ?? {};

/**
 * Answers a request for `/_app/remote/<hash>/<name>` in the page, with SvelteKit's own server
 * runtime: `handle_remote_call` runs the remote function and builds the same `Response` a
 * SvelteKit server sends. The app's `handle` hook runs around it, as on a server.
 */
export async function handleRemoteRequest(input: Request): Promise<Response> {
  const { handle } = await (setupPromise ??= setup());

  const request = input;
  const id = new URL(request.url).pathname.slice(remotePrefix().length);
  const state = kit.create_request_state({ getClientAddress: () => '127.0.0.1' });
  const { event, newCookies } = createEvent(request);

  // TODO: switch to `withRequestEvent` from `$app/server` when sveltekit/kit PR B lands.
  const response = await kit.with_request_store({ event, state }, () =>
    handle({ event, resolve: (event) => kit.handle_remote_call(event, state, id) })
  );

  storeCookies(newCookies);
  return response;
}

/**
 * Server mode: loads the server hooks and the server copy of every remote file the story or test
 * imports, so the first request does not pay for it (and time out a `findBy`).
 */
export async function prepareServer(): Promise<void> {
  await (setupPromise ??= setup());
  if (app.serverMode) await Promise.all(getServerModuleLoaders().map((load) => load()));
}

export function isRemoteRequest(url: URL): boolean {
  return url.origin === location.origin && url.pathname.startsWith(remotePrefix());
}

function remotePrefix(): string {
  return `${kit.base}/${kit.app_dir}/remote/`;
}

async function setup(): Promise<ServerHooks> {
  kit.init_transport(transport);

  // Before the server hooks load: they may import `$app/env/private`.
  app.initEnv();
  const hooks = await app.loadServerHooks();
  const handle: Handle = hooks.handle ?? (({ event, resolve }) => resolve(event));

  kit.set_hooks({
    handle,
    handleError:
      hooks.handleError ??
      (({ kind, error }: { kind: string; error: unknown }) => {
        // Same as SvelteKit's default: expected errors (`error(404)`) are not logged.
        if (kind === 'unknown') console.error(error);
      }),
    handleFetch: ({ request, fetch }: { request: Request; fetch: typeof globalThis.fetch }) =>
      fetch(request),
    reroute: () => {},
  });

  const loader = (hash: string) => async () => ({ default: await loadRemoteModule(hash) });
  kit.set_manifest({
    // A proxy, so remote files registered later (lazy imports, HMR) are found too.
    remotes: new Proxy({} as Record<string, () => Promise<{ default: RemoteModule }>>, {
      getOwnPropertyDescriptor: (_, hash) =>
        typeof hash === 'string' && hasRemoteModule(hash)
          ? { value: loader(hash), configurable: true, enumerable: true, writable: false }
          : undefined,
      has: (_, hash) => typeof hash === 'string' && hasRemoteModule(hash),
      get: (_, hash) =>
        typeof hash === 'string' && hasRemoteModule(hash) ? loader(hash) : undefined,
    }),
  });

  await hooks.init?.();
  return { handle };
}

/**
 * The server module behind a remote file, per request. Functions mocked with `remote(fn)` are
 * fakes built from their spies. In server mode, the others are the real functions from the
 * remote file; otherwise they are fakes too, which fail with a hint.
 */
async function loadRemoteModule(hash: string): Promise<RemoteModule> {
  const fake = getFakeModule(hash);
  const load = app.serverMode ? getServerModuleLoader(hash) : undefined;

  let module = fake;
  if (load) {
    module = { ...(await load()) };
    for (const entry of getRemoteEntries(hash)) {
      if (isMocked(entry)) module[entry.name] = fake[entry.name];
    }
  }

  served.set(hash, module);
  return module;
}

function getFakeModule(hash: string): RemoteModule {
  let module = fakes.get(hash);
  if (!module) {
    module = Object.fromEntries(
      getRemoteEntries(hash).map((entry) => [entry.name, fakeServerExport(entry)])
    );
    fakes.set(hash, module);
  }
  return module;
}

/**
 * The server export behind a mocked remote function: its spy wrapped in SvelteKit's server factory
 * for its kind, as the remote file would.
 */
function fakeServerExport(entry: RemoteEntry): unknown {
  const handler = (...args: unknown[]) => entry.spy(...args);
  const fn = createServerFunction(entry.kind, handler);
  // What SvelteKit's `init_remote_functions` does for each export.
  fn.__.id = entry.id;
  fn.__.name = entry.name;
  return fn;
}

/** Calls SvelteKit's server factory for `kind` (`query`, `form`, ...) with an `'unchecked'` handler. */
function createServerFunction(kind: RemoteKind, handler: (...args: unknown[]) => unknown) {
  switch (kind) {
    case 'query':
      return kit.query('unchecked', handler);
    case 'query_batch':
      return kit.query.batch('unchecked', (args: unknown[]) => perArgument(handler, args));
    case 'query_live':
      return kit.query.live('unchecked', handler);
    case 'form':
      return kit.form('unchecked', refreshingRequested(handler));
    case 'command':
      return kit.command('unchecked', refreshingRequested(handler));
    case 'prerender':
      // `dynamic`, so SvelteKit answers at runtime instead of expecting a prerendered file.
      return kit.prerender('unchecked', handler, { dynamic: true });
    default: {
      const unknownKind: never = kind;
      throw new Error(`Unknown remote function kind: ${String(unknownKind)}`);
    }
  }
}

/**
 * Calls the spy once per argument of the batch, so a `query.batch` mock is written like a `query`
 * mock: `(arg) => result`. SvelteKit still sends one request per batch.
 */
async function perArgument(handler: (...args: unknown[]) => unknown, args: unknown[]) {
  const results = await Promise.allSettled(args.map(async (arg) => handler(arg)));
  return (_arg: unknown, index: number) => {
    const result = results[index]!;
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  };
}

/**
 * A real form or command handler refreshes the queries the client passed to `.updates(...)`
 * (with `getPosts().refresh()` or `requested(...)`), or SvelteKit fails them. A mock cannot do
 * that, so after it resolves, every requested query is refreshed: its mock or its real handler
 * runs again and the new value goes back in the same response.
 */
function refreshingRequested(handler: (...args: unknown[]) => unknown) {
  return async (...args: unknown[]) => {
    const generation = resetGeneration();
    // The request store is sticky in the browser (see `async-local-storage.ts`), so it is only
    // this request's before the first `await`: any other request that starts in the meantime (a
    // second mutation, a live stream pulling its next value, a query, an error being serialised)
    // replaces it. So every requested query is bound and marked for refresh synchronously, here,
    // not after the handler. SvelteKit runs the marked refreshes at the end of the request, after
    // the handler, so they see what the handler changed.
    for (const hash of new Set([...fakes.keys(), ...served.keys()])) {
      const module = served.get(hash) ?? getFakeModule(hash);
      for (const fn of Object.values(module) as RemoteFunction[]) {
        const type = fn?.__?.type;
        if (type === 'query' || type === 'query_batch') {
          for (const { query } of kit.requested(fn, Infinity)) void query.refresh();
        } else if (type === 'query_live') {
          for (const { query } of kit.requested(fn, Infinity)) void query.reconnect();
        }
      }
    }

    // When the story or test ended while the mock ran, SvelteKit's client drops the answer
    // (PR A), and the marked refreshes would call the spies of the next one. Never answer.
    const ended = () => resetGeneration() !== generation;
    try {
      const result = await handler(...args);
      return ended() ? new Promise<never>(() => {}) : result;
    } catch (error) {
      if (ended()) return new Promise<never>(() => {});
      throw error;
    }
  };
}

/**
 * The `cookie` header for `requestEvent.cookies`, like a browser sends its cookies. Browsers drop
 * a `cookie` header on a `Request` they construct, so it goes straight to SvelteKit's cookie
 * parser instead.
 */
function cookieHeader(): string {
  return requestEvent.cookies
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
}

type NewCookies = Map<string, { name: string; value: string; options: { maxAge?: number } }>;

/** Keeps the cookies a remote function set, like a browser stores `set-cookie`. */
function storeCookies(newCookies: NewCookies): void {
  for (const { name, value, options } of newCookies.values()) {
    if (value === '' || options.maxAge === 0) requestEvent.cookies.delete(name);
    else requestEvent.cookies.set(name, value);
  }
}

function createEvent(request: Request): { event: RequestEvent; newCookies: NewCookies } {
  let url = new URL(request.url);

  // Like SvelteKit: `event.url` is the page URL the client sends, not the endpoint URL.
  const pathname = request.headers.get('x-sveltekit-pathname');
  if (pathname !== null) {
    url.pathname = pathname;
    url.search = request.headers.get('x-sveltekit-search') ?? '';
  }
  if (requestEvent.url) url = new URL(requestEvent.url);

  const header = cookieHeader();
  const withCookies = {
    headers: { get: (name: string) => (name === 'cookie' ? header : request.headers.get(name)) },
  } as Request;
  const { cookies, new_cookies, set_trailing_slash } = kit.get_cookies(withCookies, url);
  // SvelteKit queues `cookies.set()` until the route's trailing slash option is known.
  set_trailing_slash('never');

  const event = {
    cookies,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
    getClientAddress: () => '127.0.0.1',
    locals: { ...requestEvent.locals },
    params: { ...requestEvent.params },
    platform: requestEvent.platform,
    request,
    route: { ...requestEvent.route },
    setHeaders: () => {},
    url,
    isDataRequest: false,
    isSubRequest: false,
    isRemoteRequest: true,
    tracing: { enabled: false, root: kit.noop_span, current: kit.noop_span },
  } as unknown as RequestEvent;

  return { event, newCookies: new_cookies as NewCookies };
}
