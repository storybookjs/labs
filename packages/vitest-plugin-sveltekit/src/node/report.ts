import path from 'pathe';

import { SERVER_QUERY } from './server-module.ts';

/** What server mode put into a build. Paths are relative to the project root. */
export interface ServerBuildReport {
  /** The remote files bundled with their server code. */
  remoteFiles: string[];
  /** `hooks.server`, when it is in the build. */
  serverHooks: string | null;
  /** Other server-only modules of the project: `src/lib/server/**` and `*.server.*` files. */
  serverModules: string[];
  /** The private env variables whose values the build contains. Names only. */
  privateEnvKeys: string[];
}

/** Reads the report from the ids of the modules in the build's chunks. */
export function serverBuildReport(
  moduleIds: Iterable<string>,
  options: {
    root: string;
    serverHooks: string | null;
    /** Whether a module is SvelteKit's generated env config (see `generatedEnvModule`). */
    isEnvConfig: (file: string) => boolean;
    /** The private variables that have a value in the env config. */
    privateEnvKeys: string[];
  }
): ServerBuildReport {
  const remoteFiles = new Set<string>();
  const serverModules = new Set<string>();
  let serverHooks: string | null = null;
  let envConfig = false;
  const serverLib = path.join(options.root, 'src/lib/server') + '/';

  for (const id of moduleIds) {
    if (id.startsWith('\0')) continue;
    const file = id.replace(/[?#].*$/, '');
    if (options.isEnvConfig(file)) envConfig = true;
    if (!file.startsWith(`${options.root}/`) || file.includes('/node_modules/')) continue;
    const relative = path.relative(options.root, file);

    if (id.endsWith(SERVER_QUERY)) remoteFiles.add(relative);
    else if (file === options.serverHooks) serverHooks = relative;
    else if (file.startsWith(serverLib) || /\.server\.[^/]+$/.test(file)) {
      serverModules.add(relative);
    }
  }

  return {
    remoteFiles: [...remoteFiles].sort(),
    serverHooks,
    serverModules: [...serverModules].sort(),
    privateEnvKeys: envConfig ? [...options.privateEnvKeys].sort() : [],
  };
}

/** The report as a block for the build output. */
export function formatServerBuildReport(report: ServerBuildReport): string {
  const list = (title: string, items: string[]) =>
    items.length === 0
      ? [`  ${title}: none`]
      : [`  ${title} (${items.length}):`, ...items.map((item) => `    ${item}`)];
  return [
    '',
    '[vitest-plugin-sveltekit] Server code in this build (server mode):',
    ...list('Remote files with their server code', report.remoteFiles),
    `  Server hooks: ${report.serverHooks ?? 'none'}`,
    ...list('Other server-only modules', report.serverModules),
    ...list('Private env keys with a value', report.privateEnvKeys),
    '',
  ].join('\n');
}
