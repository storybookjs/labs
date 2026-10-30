import { HandledHttpError, HttpError, SvelteKitError } from '@sveltejs/kit/internal';
import * as kit from 'virtual:@storybookjs/vitest-plugin-sveltekit/kit';

import { resetRemoteFunctions } from './registry.ts';
import { handleRemoteRequest, isRemoteRequest } from './server.ts';

/** What the host (Storybook or Vitest) provides in place of SvelteKit's router. */
export interface RemoteHost {
  page: { url: URL };
  navigating: { to: { url: URL } | null } | null;
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
    // Custom types from the `transport` hook are not supported yet.
    decoders: {},
    encoders: {},
    get page() {
      return host.page;
    },
    get navigating() {
      return host.navigating;
    },
    goto: async (url, options) => {
      await host.goto(String(url), options);
    },
    refreshAll: async () => {
      await refreshAllQueries();
      await host.refreshAll?.();
    },
    handleError,
    notifyVersion: () => {},
  });
}

/** Forgets cached query results and resets every remote function spy. */
export function resetRemoteState(): void {
  kit.reset_remote_state();
  resetRemoteFunctions();
}

async function remoteFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // `init.signal` goes onto the request, so a stopped `query.live` ends its stream.
  const request = new Request(
    input instanceof Request ? input : new URL(String(input), location.href),
    init
  );
  if (!isRemoteRequest(new URL(request.url))) return globalThis.fetch(input, init);
  return handleRemoteRequest(request);
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
  if (error instanceof HandledHttpError || error instanceof HttpError) return error.body;
  if (error instanceof SvelteKitError) return { status: error.status, message: error.text } as App.Error;
  console.error(error);
  return { status: 500, message: 'Internal Error' } as App.Error;
}
