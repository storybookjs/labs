// SvelteKit internals that `vitestPluginSvelteKit()` serves by absolute path. Only the parts the
// runtime uses are typed.
declare module 'virtual:@storybookjs/vitest-plugin-sveltekit/kit' {
  import type { RequestEvent } from '@sveltejs/kit';

  export interface RemoteEnv {
    fetch: typeof fetch;
    decoders: Record<string, (data: any) => any>;
    encoders: Record<string, (data: any) => any>;
    page: { url: URL };
    navigating: { to: { url: URL } | null } | null;
    goto: (url: string | URL, options?: { refreshAll?: boolean }) => Promise<void>;
    refreshAll: () => Promise<void>;
    handleError: (
      error: unknown,
      event: { params: Record<string, string>; route: { id: string | null }; url: URL }
    ) => Promise<App.Error>;
    notifyVersion: (version: string | null) => void;
  }

  export function set_remote_env(env: Partial<RemoteEnv> | null): void;
  export function reset_remote_state(): Promise<void>;

  interface CacheEntry {
    resource: { refresh(): Promise<void> } & { reconnect(): Promise<void> };
  }
  export const query_map: Map<string, Map<string, CacheEntry>>;
  export const live_query_map: Map<string, Map<string, CacheEntry>>;

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
  export function create_request_state(options: {
    getClientAddress: () => string;
    platform?: unknown;
  }): RequestState;
  export function get_cookies(
    request: Request,
    url: URL
  ): { cookies: RequestEvent['cookies'] };
  export const noop_span: RequestEvent['tracing']['current'];

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
