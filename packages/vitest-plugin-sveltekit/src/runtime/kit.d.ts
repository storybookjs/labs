// The SvelteKit entries that `vitestPluginSvelteKit()` serves from the project (sveltejs/kit PR A,
// and PR B's `withRequestEvent`). Only the parts the runtime uses are typed.
declare module 'virtual:vitest-plugin-sveltekit/kit' {
  import type { RequestEvent } from '@sveltejs/kit';
  import type { HandleServerError, Transport } from '@sveltejs/kit/hooks';

  /** From sveltejs/kit PR A (SB-2442): `@sveltejs/kit/internal/client`. */
  export interface RemoteEnv {
    fetch: (input: string, init?: RequestInit) => Promise<Response>;
    decoders: Record<string, (data: any) => any>;
    encoders: Record<string, (data: any) => any>;
    page: { url: { pathname: string; search: string } };
    navigating: { to: { url: { pathname: string; search: string } } | null } | null;
    goto: (url: string | URL, options?: { refreshAll?: boolean }) => Promise<void>;
    refresh_all: () => Promise<void>;
    handle_error: (
      error: unknown,
      event: { params: Record<string, string>; route: { id: string | null }; url: URL }
    ) => Promise<App.Error>;
    notify_version: (version: string | null) => void;
  }

  export function set_remote_env(env: Partial<RemoteEnv>): void;
  /** From sveltejs/kit PR A: clears cached results and form state between tests. */
  export function reset_remote_state(): Promise<void>;

  /** From PR A: SvelteKit's `refreshAll()` for remote queries, the default `refresh_all`. */
  export function refresh_remote_queries(): Promise<void>;

  /** From PR A (`@sveltejs/kit/internal/remote-server`): SvelteKit's server runtime, outside an app. */
  export function init_remote_server(options: {
    remotes: Record<string, () => Promise<{ default: Record<string, unknown> }>>;
    handleError?: HandleServerError;
    transport?: Transport;
  }): void;
  /** Answers a remote request inside the request store of `event`. */
  export function handle_remote_request(event: RequestEvent): Promise<Response>;
  /** The remote function id in a `/_app/remote/...` URL, or `false`. */
  export function get_remote_id(url: URL): string | false;

  /** From sveltejs/kit PR B (SB-2443), `$app/server`. */
  export function withRequestEvent<T>(
    init: {
      request?: Request;
      url?: string | URL;
      locals?: App.Locals;
      cookies?: Record<string, string>;
      params?: Record<string, string>;
      route?: { id: string | null };
      platform?: App.Platform;
      signal?: AbortSignal;
    },
    fn: (event: RequestEvent) => T
  ): T;

  export type RequestState = Record<string, any>;
  /** `@sveltejs/kit/internal/server`: the event and state of the running request. */
  export function get_request_store(): { event: RequestEvent; state: RequestState };

  type Factory = (validate: 'unchecked', fn: (...args: any[]) => any, options?: object) => any;
  export const query: Factory & { batch: Factory; live: Factory };
  export const form: Factory;
  export const command: Factory;
  export const prerender: Factory;

  interface RequestedResult extends Iterable<{
    query: { refresh(): Promise<void>; reconnect(): Promise<void> };
  }> {
    refreshAll: () => Promise<void>;
    reconnectAll: () => Promise<void>;
  }
  export function requested(query: unknown, limit: number): RequestedResult;
}

// App files that `vitestPluginSvelteKit()` finds: the hooks.
declare module 'virtual:vitest-plugin-sveltekit/app' {
  import type { Handle, HandleServerError, ServerInit, Transport } from '@sveltejs/kit/hooks';

  export const serverMode: boolean;
  /** The app's `src/hooks.ts`, or `{}`. */
  export const universalHooks: { transport?: Transport };
  /** The app's `src/hooks.server.ts`, or `{}` (and always `{}` outside server mode). */
  export function loadServerHooks(): Promise<{
    handle?: Handle;
    handleError?: HandleServerError;
    init?: ServerInit;
  }>;
}
