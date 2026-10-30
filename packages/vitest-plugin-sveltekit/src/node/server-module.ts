import path from 'pathe';

import type { RemoteExport } from './analyze.ts';
import { hash } from './hash.ts';

/** The query that marks the server copy of a remote module (server mode). */
export const SERVER_QUERY = '?server';

/**
 * The server copy of a remote module: the source, plus the call SvelteKit's own plugin appends on
 * the server, which gives each export its id. SvelteKit passes the module's own namespace (a
 * self-import); that deadlocks in a build when the module graph has a top-level `await`, so the
 * exports are listed instead.
 */
export function createServerModule(
  code: string,
  exports: RemoteExport[],
  file: string,
  kitDir: string
): string {
  const internal = path.join(kitDir, 'src/exports/internal/server/index.js');
  const members = exports.map(({ name, local }) => `${JSON.stringify(name)}: ${local}`);
  return [
    code,
    '',
    `import { init_remote_functions as $$_init_$$ } from ${JSON.stringify(internal)};`,
    `$$_init_$$({ ${members.join(', ')} }, ${JSON.stringify(file)}, ${JSON.stringify(hash(file))});`,
    '',
  ].join('\n');
}
