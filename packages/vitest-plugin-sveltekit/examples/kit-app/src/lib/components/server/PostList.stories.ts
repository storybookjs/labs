import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { expect, waitFor } from 'storybook/test';

import { getStats } from '#lib/posts.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import preview from '../../../../.storybook/preview';
import PostList from '../PostList.svelte';

// No `remote()` mocks here: `getPosts`, `getStats` and `deletePost` run the code in
// `posts.remote.ts`, on the in-memory database from `__mocks__/db.ts`.
const meta = preview.meta({
  parameters: { demo: true },
  title: 'Server/PostList',
  component: PostList,
  beforeEach: async () => {
    await resetDb([
      { title: 'From the database', body: '', views: 7, likes: 3 },
      { title: 'Also from the database', body: '', views: 1, likes: 0 },
    ]);
  },
});

export const RealQuery = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'From the database' })).toBeVisible();
    await expect(await canvas.findByTestId('stats-1')).toHaveTextContent('7 views, 3 likes');
  },
});

export const MixedWithMock = meta.story({
  beforeEach: () => {
    // Mocked: `getStats`. Real: `getPosts`.
    remote(getStats).mockResolvedValue({ views: 99, likes: 9 });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'From the database' })).toBeVisible();
    await expect(await canvas.findByTestId('stats-1')).toHaveTextContent('99 views, 9 likes');
    await expect(remote(getStats)).toHaveBeenCalledWith(1);
  },
});

export const DeleteSignedIn = meta.story({
  beforeEach: () => {
    // `hooks.server.ts` reads the session cookie into `locals.user`.
    requestEvent.cookies.set('session', 'ada');
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete From the database' }));
    await waitFor(() => expect(canvas.queryByText('From the database')).toBeNull());
    await expect(await db.$count(posts)).toBe(1);
  },
});

export const DeleteForbidden = meta.story({
  beforeEach: () => {
    requestEvent.locals.user = null;
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete From the database' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Sign in to delete posts');
    await expect(await db.$count(posts)).toBe(2);
  },
});
