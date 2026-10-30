// SvelteKit internals that `vitestPluginSvelteKit()` serves by absolute path. Only the parts the
// runtime uses are typed.
declare module 'virtual:@storybookjs/vitest-plugin-sveltekit/kit' {
  import type { RequestEvent } from '@sveltejs/kit';

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

  interface CacheEntry {
    resource: { refresh(): Promise<void> } & { reconnect(): Promise<void> };
  }
  export const query_map: Map<string, Map<string, CacheEntry>>;
  export const live_query_map: Map<string, Map<string, CacheEntry>>;

  /** `HandledHttpError` extends it. */
  export class HttpError {
    status: number;
    body: App.Error;
  }
  export class SvelteKitError extends Error {
    status: number;
    text: string;
  }

  export const app_dir: string;
  export const base: string;

  export type RequestState = Record<string, any>;

  export function handle_remote_call(
    event: RequestEvent,
    state: RequestState,
    id: string
  ): Promise<Response>;
  export function set_manifest(manifest: {
    remotes: Record<string, () => Promise<{ default: Record<string, unknown> }>>;
  }): void;
  export function set_hooks(hooks: Record<string, unknown>): void;
  export function init_transport(transport: Record<string, unknown>): void;
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
