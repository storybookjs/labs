import type { RequestEvent } from '@sveltejs/kit';
import * as kit from 'virtual:@storybookjs/vitest-plugin-sveltekit/kit';

import type { RemoteKind } from '../node/analyze.ts';
import {
  getRemoteEntries,
  hasRemoteModule,
  onRegister,
  registeredHashes,
  type RemoteEntry,
  resetGeneration,
} from './registry.ts';

type RemoteModule = Record<string, unknown>;

const modules = new Map<string, RemoteModule>();
onRegister((hash) => modules.delete(hash));

let ready = false;

/**
 * Answers a request for `/_app/remote/<hash>/<name>` in the page, with SvelteKit's own server
 * runtime: `handle_remote_call` runs the remote function and builds the same `Response` a
 * SvelteKit server sends.
 */
export function handleRemoteRequest(request: Request): Promise<Response> {
  setup();
  const id = new URL(request.url).pathname.slice(remotePrefix().length);

  // `withRequestEvent` (sveltejs/kit PR B) builds the event and state as SvelteKit's server does.
  // It takes `event.url` from the `x-sveltekit-pathname` header, like SvelteKit's server.
  return kit.withRequestEvent({ request }, (event) =>
    // `handle_remote_call` needs the state that `withRequestEvent` made for this request.
    kit.handle_remote_call(event, kit.get_request_store().state, id)
  );
}

export function isRemoteRequest(url: URL): boolean {
  return url.origin === location.origin && url.pathname.startsWith(remotePrefix());
}

function remotePrefix(): string {
  return `${kit.base}/${kit.app_dir}/remote/`;
}

function setup(): void {
  if (ready) return;
  ready = true;

  kit.init_transport({});
  kit.set_hooks({
    handle: ({
      event,
      resolve,
    }: {
      event: RequestEvent;
      resolve: (event: RequestEvent) => unknown;
    }) => resolve(event),
    handleError: ({ kind, error }: { kind: string; error: unknown }) => {
      // Same as SvelteKit's default: expected errors (`error(404)`) are not logged.
      if (kind === 'unknown') console.error(error);
    },
    handleFetch: ({ request, fetch }: { request: Request; fetch: typeof globalThis.fetch }) =>
      fetch(request),
    reroute: () => {},
  });

  const loader = (hash: string) => () => Promise.resolve({ default: getRemoteModule(hash) });
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
}

/**
 * The server module behind a remote file. Today every export is a fake built from its spy; the
 * real module (tier 2) can be returned from here instead.
 */
function getRemoteModule(hash: string): RemoteModule {
  let module = modules.get(hash);
  if (!module) {
    module = Object.fromEntries(
      getRemoteEntries(hash).map((entry) => [entry.name, fakeServerExport(entry)])
    );
    modules.set(hash, module);
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
 * (with `getPosts().refresh()` or `requested(...)`), or SvelteKit fails them. A mock cannot reach
 * the server-side queries, so after it resolves, every requested query is refreshed: its mock
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
    for (const hash of registeredHashes()) {
      for (const fn of Object.values(getRemoteModule(hash)) as Array<{ __: { type: string } }>) {
        const { type } = fn.__;
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
