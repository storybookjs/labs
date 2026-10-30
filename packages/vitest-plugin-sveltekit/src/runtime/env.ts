import * as kit from 'virtual:@storybookjs/vitest-plugin-sveltekit/kit';

import { resetRequestEvent } from './request-event.ts';
import { resetAsyncLocalStorage } from './async-local-storage.ts';
import { resetGeneration, resetRemoteFunctions } from './registry.ts';
import {
  handleRemoteRequest,
  isRemoteRequest,
  prepareServer,
  runsAlone,
  transport,
} from './server.ts';

/** What the host (Storybook or Vitest) provides in place of SvelteKit's router. */
export interface RemoteHost extends Pick<kit.RemoteEnv, 'page' | 'navigating'> {
  goto: (url: string, options?: { refreshAll?: boolean }) => unknown;
  /** Called after the remote queries refreshed, for example to log the call. */
  refreshAll?: () => unknown;
}

/**
 * Points SvelteKit's client runtime for remote functions at the host: requests to
 * `/_app/remote/*` are answered in the page, and navigation goes to the host's `goto`.
 */
export function installRemoteEnv(host: RemoteHost): void {
  kit.set_remote_env({
    fetch: remoteFetch,
    // The custom types of the app's `transport` hook (`src/hooks.ts`).
    decoders: transportFunctions('decode'),
    encoders: transportFunctions('encode'),
    // Mutable objects from the host: SvelteKit reads `url` from them on each request.
    page: host.page,
    navigating: host.navigating,
    goto: async (url, options) => {
      await host.goto(String(url), options);
    },
    refresh_all: async () => {
      await refreshAllQueries();
      await host.refreshAll?.();
    },
    handle_error: handleError,
    notify_version: () => {},
  });
}

/** The requests that run one at a time (see `runsAlone`). Each story or test starts a new one. */
let queue: Promise<unknown> = Promise.resolve();

/** Forgets cached query results and form state, and resets every remote function spy. */
export async function resetRemoteState(): Promise<void> {
  resetRemoteFunctions();
  queue = Promise.resolve();
  resetRequestEvent();
  // Ends the open `query.live` connections: their real generators stop through `request.signal`.
  await kit.reset_remote_state();
  resetAsyncLocalStorage();
  await prepareServer();
}

function transportFunctions(kind: 'encode' | 'decode'): Record<string, (data: any) => any> {
  return Object.fromEntries(
    Object.entries(transport).map(([name, transporter]) => [name, transporter[kind]])
  );
}

async function remoteFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // `init.signal` goes onto the request, so a stopped `query.live` ends its stream.
  const request = new Request(
    input instanceof Request ? input : new URL(String(input), location.href),
    init
  );
  if (!isRemoteRequest(new URL(request.url))) return globalThis.fetch(input, init);
  const generation = resetGeneration();
  // A real request leaves the page's event loop; this one would not. Without the hop, a loop of
  // requests with no await in between (SvelteKit reconnects a `query.live` at once when its
  // stream redirects) runs on microtasks alone and freezes the page.
  await new Promise<void>((resolve) => setTimeout(resolve));
  // Sent by a story or test that has ended. SvelteKit's client drops the answer (PR A), and
  // answering would call the spies of the next story or test. So it never gets an answer.
  if (resetGeneration() !== generation) return new Promise<never>(() => {});
  if (!runsAlone(request)) return handleRemoteRequest(request);

  const turn = queue.then(() =>
    resetGeneration() === generation
      ? handleRemoteRequest(request, true)
      : new Promise<never>(() => {})
  );
  queue = turn.catch(() => {});
  return turn;
}

/** SvelteKit's `refreshAll()`, limited to remote functions: there are no `load` functions here. */
async function refreshAllQueries(): Promise<void> {
  const pending: Promise<void>[] = [];
  for (const entries of kit.query_map.values()) {
    for (const { resource } of entries.values()) pending.push(resource.refresh());
  }
  for (const entries of kit.live_query_map.values()) {
    for (const { resource } of entries.values()) pending.push(resource.reconnect());
  }
  await Promise.all(pending);
}

/** SvelteKit's client `handle_error`, without the app's `handleError` hook. */
async function handleError(error: unknown): Promise<App.Error> {
  if (error instanceof kit.HttpError) return error.body;
  if (error instanceof kit.SvelteKitError) {
    return { status: error.status, message: error.text } as App.Error;
  }
  console.error(error);
  return { status: 500, message: 'Internal Error' } as App.Error;
}
