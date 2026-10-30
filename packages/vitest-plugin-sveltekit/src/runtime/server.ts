import type { Handle, Transport } from '@sveltejs/kit/hooks';
import * as app from 'virtual:@storybookjs/vitest-plugin-sveltekit/app';
import * as kit from 'virtual:@storybookjs/vitest-plugin-sveltekit/kit';

import type { RemoteKind } from '../node/analyze.ts';
import { pinRequest, unpinRequest } from './async-local-storage.ts';
import { requestEvent } from './request-event.ts';
import {
  getRemoteEntries,
  getRemoteEntryById,
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
export async function handleRemoteRequest(request: Request, alone = false): Promise<Response> {
  // The cookie jar of the story or test that sends the request (`resetRequestEvent` replaces it).
  const generation = resetGeneration();
  const jar = requestEvent.cookies;
  const { handle } = await (setupPromise ??= setup());
  const id = new URL(request.url).pathname.slice(remotePrefix().length);

  return kit.withRequestEvent(
    {
      request,
      // Without `url`, `withRequestEvent` takes `event.url` from the `x-sveltekit-pathname` header,
      // like SvelteKit's server.
      url: requestEvent.url,
      locals: { ...requestEvent.locals },
      params: { ...requestEvent.params },
      route: { ...requestEvent.route },
      platform: requestEvent.platform,
    },
    async (event) => {
      // `handle_remote_call` needs the state that `withRequestEvent` made for this request.
      const { state } = kit.get_request_store();
      // A mock or a `query.live` pull may run in between: this request keeps its store.
      if (alone) pinRequest(state.remote);

      try {
        // Not `withRequestEvent({ cookies })`: that puts them on a `cookie` header, which browsers
        // drop from a `Request` they construct.
        const sent = cookieMap(jar.getAll());
        for (const [name, value] of sent) event.cookies.set(name, value, { path: '/' });

        const response = await handle({
          event,
          resolve: (event) => kit.handle_remote_call(event, state, id),
        });

        // Apply what the remote function (or `handle`) set or deleted, as a browser applies
        // `set-cookie`: not the whole jar, another request may have changed it in the meantime.
        // Not at all when the story or test ended meanwhile: it would land in the next one.
        if (resetGeneration() === generation) {
          const received = cookieMap(event.cookies.getAll());
          for (const name of sent.keys()) if (!received.has(name)) jar.delete(name);
          for (const [name, value] of received) if (sent.get(name) !== value) jar.set(name, value);
        }

        return response;
      } finally {
        if (alone) unpinRequest(state.remote);
      }
    }
  );
}

/** Name to value, without deleted cookies (SvelteKit reports those with an empty value). */
function cookieMap(cookies: Array<{ name: string; value: string }>): Map<string, string> {
  return new Map(
    cookies.filter(({ value }) => value !== '').map(({ name, value }) => [name, value])
  );
}

/**
 * Server mode: loads the server hooks and the server copy of every remote file the story or test
 * imports, so the first request does not pay for it (and time out a `findBy`).
 */
export async function prepareServer(): Promise<void> {
  await (setupPromise ??= setup());
  if (app.serverMode) await Promise.all(getServerModuleLoaders().map((load) => load()));
}

/**
 * Server mode runs real remote functions one at a time, as SvelteKit's server does in a
 * webcontainer (`serialise` in `runtime/server/instance.js`). Browsers have no async context, so a
 * request that resumes after an `await` would see the request store of the request that started
 * last (see `async-local-storage.ts`), and its refreshes would go into that request's response.
 * Mocks are not queued: they read the store before their first `await`, and may stay pending on
 * purpose. `query.live` streams stay open, so they do not wait either; the running request is
 * pinned instead, so their pulls do not take its store.
 */
export function runsAlone(request: Request): boolean {
  if (!app.serverMode || request.headers.get('accept')?.includes('text/event-stream')) return false;
  const entry = getRemoteEntryById(new URL(request.url).pathname.slice(remotePrefix().length));
  return entry !== undefined && !isMocked(entry);
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
