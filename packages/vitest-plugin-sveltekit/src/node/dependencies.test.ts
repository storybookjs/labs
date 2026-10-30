import path from 'pathe';
import { expect, it } from 'vite-plus/test';

import { findRemoteFiles, findServerDependencies } from './dependencies.ts';

const root = path.resolve(import.meta.dirname, '../../test/fixtures/server-deps');

it('finds the files SvelteKit treats as remote', () => {
  expect(findRemoteFiles(path.join(root, 'src')).sort()).toEqual([
    path.join(root, 'src/lib/count.remote.svelte.js'),
    path.join(root, 'src/lib/posts.remote.js'),
  ]);
});

it('follows relative and subpath imports to the packages, skipping types, node: and Kit', () => {
  const entries = [
    ...findRemoteFiles(path.join(root, 'src')),
    path.join(root, 'src/hooks.server.js'),
  ];
  expect(findServerDependencies(root, entries)).toEqual([
    '@scope/pkg-c',
    'pkg-a',
    'pkg-b/sub',
    'pkg-d/count',
    'pkg-e',
    'pkg-hooks',
  ]);
});
