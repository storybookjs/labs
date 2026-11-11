import type { Plugin, Rolldown } from 'vite';

import { SERVER_QUERY } from './server-module.ts';

/** The `filter` of a hook in its object form (`{ filter, handler }`). */
type HookFilter<T> = T extends { handler: unknown; filter?: infer F } ? NonNullable<F> : never;
/** `{ id }`: all that Vite's types allow, and all that Vite's dev server reads. */
type ViteResolveIdFilter = HookFilter<Plugin['resolveId']>;
/** `{ id }`, or filter expressions (`rolldown/filter`), which Rolldown runs natively. */
type RolldownResolveIdFilter = HookFilter<Rolldown.Plugin['resolveId']>;

/** The ids the plugin resolves itself, or resolves again from the project. */
const OWN_IDS =
  /^(virtual:vitest-plugin-sveltekit\/(kit|app)|node:async_hooks|#app\/env\/server|@storybook\/sveltekit\/.*)$/;
/** Node: imports of remote files (`$lib/posts.remote`, `./a.remote.ts`, ...). */
const REMOTE_IMPORT = /remote/;
/** Any import in the server copy of a module (`a.remote.ts?server`). */
const SERVER_IMPORTER = new RegExp(`${SERVER_QUERY.replace('?', '\\?')}$`);

/**
 * The `resolveId` filter: which imports reach the handler.
 *
 * In server mode, the handler also looks at every import in the server copy of a module, and only
 * the importer tells those apart. Rolldown filters by importer (`importerId`), so builds
 * (`storybook build`) call the handler only for those imports and the ids below. Vite's dev
 * server reads only `filter.id`, which a list of expressions does not have: in dev, server mode
 * calls the handler for every import.
 *
 * The expressions are the plain objects that `include`, `or`, `id` and `importerId` from
 * `rolldown/filter` return; `rolldown` is Vite's dependency, not this package's.
 */
export function resolveIdFilter(server: boolean): ViteResolveIdFilter {
  if (!server) return { id: [OWN_IDS, REMOTE_IMPORT] };
  const expressions: RolldownResolveIdFilter = [
    {
      kind: 'include',
      expr: {
        kind: 'or',
        args: [
          { kind: 'id', pattern: OWN_IDS, params: {} },
          { kind: 'id', pattern: REMOTE_IMPORT, params: {} },
          { kind: 'importerId', pattern: SERVER_IMPORTER, params: {} },
        ],
      },
    },
  ];
  // Vite passes the hook to Rolldown as it is, filter included.
  return expressions as ViteResolveIdFilter;
}
