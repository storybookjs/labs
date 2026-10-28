import { SERVER_CHANNEL_PATH } from 'storybook/internal/channels';

import { join, relative } from 'pathe';

/** Upgrade paths of the server channel and the preview HMR socket on the host HTTP server. */
export type SocketPaths = {
  /** Pathname the browser connects the server channel to. */
  channelPath: string;
  /** Preview `server.hmr.path`, which Vite joins onto the preview base. */
  hmrPath: string;
};

export const HMR_PATH = '/__storybook-hmr';

/**
 * A middleware-mode host only routes upgrades under its own `base` to Vite, so sockets that would
 * fall outside it move under it.
 */
export function getSocketPaths({
  middlewareMode,
  hostBase,
  previewBase,
}: {
  middlewareMode: boolean;
  hostBase: string;
  previewBase: string;
}): SocketPaths {
  const socketBase = hostBase.endsWith('/') ? hostBase : `${hostBase}/`;
  const isRouted = (path: string): boolean => !middlewareMode || path.startsWith(socketBase);

  return {
    channelPath: isRouted(SERVER_CHANNEL_PATH)
      ? SERVER_CHANNEL_PATH
      : join(socketBase, SERVER_CHANNEL_PATH),
    hmrPath: isRouted(join(previewBase, HMR_PATH))
      ? HMR_PATH
      : relative(previewBase, join(socketBase, HMR_PATH)),
  };
}
