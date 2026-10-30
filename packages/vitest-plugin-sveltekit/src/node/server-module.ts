import path from 'pathe';

import { hash } from './hash.ts';

/** The query that marks the server copy of a remote module (server mode). */
export const SERVER_QUERY = '?server';

/**
 * The server copy of a remote module: the source, plus the call SvelteKit's own plugin appends on
 * the server, which gives each export its id.
 */
export function createServerModule(code: string, source: string, file: string, kitDir: string): string {
  const internal = path.join(kitDir, 'src/exports/internal/server/index.js');
  return [
    code,
    '',
    `import * as $$_self_$$ from ${JSON.stringify(source + SERVER_QUERY)};`,
    `import { init_remote_functions as $$_init_$$ } from ${JSON.stringify(internal)};`,
    `$$_init_$$($$_self_$$, ${JSON.stringify(file)}, ${JSON.stringify(hash(file))});`,
    '',
  ].join('\n');
}
