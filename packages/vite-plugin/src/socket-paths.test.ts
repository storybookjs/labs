import { posix } from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { getSocketPaths } from './socket-paths.ts';

describe('getSocketPaths', () => {
  it.each([
    {
      name: 'host owns the HTTP server',
      input: { middlewareMode: false, hostBase: '/_nuxt/', previewBase: '/__storybook/' },
      expected: { channel: '/storybook-server-channel', hmr: '/__storybook/__storybook-hmr' },
    },
    {
      name: 'middleware mode with a root base',
      input: { middlewareMode: true, hostBase: '/', previewBase: '/__storybook/' },
      expected: { channel: '/storybook-server-channel', hmr: '/__storybook/__storybook-hmr' },
    },
    {
      name: 'middleware mode under a nested base',
      input: { middlewareMode: true, hostBase: '/_nuxt/', previewBase: '/__storybook/' },
      expected: { channel: '/_nuxt/storybook-server-channel', hmr: '/_nuxt/__storybook-hmr' },
    },
    {
      name: 'middleware mode under a base without a trailing slash',
      input: { middlewareMode: true, hostBase: '/_nuxt', previewBase: '/__storybook/' },
      expected: { channel: '/_nuxt/storybook-server-channel', hmr: '/_nuxt/__storybook-hmr' },
    },
    {
      name: 'middleware mode with Storybook mounted under the host base',
      input: { middlewareMode: true, hostBase: '/app/', previewBase: '/app/__storybook/' },
      expected: {
        channel: '/app/storybook-server-channel',
        hmr: '/app/__storybook/__storybook-hmr',
      },
    },
  ])('$name', ({ input, expected }) => {
    const { channelPath, hmrPath } = getSocketPaths(input);

    // Vite resolves the HMR socket as `posix.join(base, hmr.path)` on client and server.
    expect({ channel: channelPath, hmr: posix.join(input.previewBase, hmrPath) }).toEqual(expected);
  });
});
