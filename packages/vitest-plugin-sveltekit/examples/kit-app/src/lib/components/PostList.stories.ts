import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { error, redirect } from '@sveltejs/kit';
import { expect, waitFor } from 'storybook/test';

import { deletePost, getPosts, getStats } from '#lib/posts.remote.ts';

import preview from '../../../.storybook/preview';
import PostList from './PostList.svelte';

const posts = [
  { id: 1, title: 'First post', body: '' },
  { id: 2, title: 'Second post', body: '' },
];

const meta = preview.meta({
  title: 'PostList',
  component: PostList,
  beforeEach: () => {
    remote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
  },
});

export const Data = meta.story({
  beforeEach: () => {
    remote(getPosts).mockResolvedValue(posts);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Second post' })).toBeVisible();
    await expect(remote(getPosts)).toHaveBeenCalledWith('newest');
  },
});

export const Pending = meta.story({
  beforeEach: () => {
    remote(getPosts).mockPending();
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Loading posts…')).toBeVisible();
  },
});

export const HttpError = meta.story({
  beforeEach: () => {
    remote(getPosts).mockImplementation(() => error(503, 'The database is asleep'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The database is asleep');
  },
});

export const RejectedValue = meta.story({
  beforeEach: () => {
    remote(getPosts).mockRejectedValue(httpError(404, 'No posts here'));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('No posts here');
  },
});

export const Batch = meta.story({
  beforeEach: () => {
    remote(getPosts).mockResolvedValue(posts);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByTestId('stats-2')).toHaveTextContent('200 views, 2 likes');
    // One mock call per argument, although SvelteKit sent a single batched request.
    await expect(remote(getStats)).toHaveBeenCalledTimes(2);
    await expect(remote(getStats)).toHaveBeenCalledWith(1);
    await expect(remote(getStats)).toHaveBeenCalledWith(2);
  },
});

export const DeleteWithCommand = meta.story({
  beforeEach: () => {
    let current = [...posts];
    remote(getPosts).mockImplementation(async () => current);
    remote(deletePost).mockImplementation(async (id) => {
      current = current.filter((post) => post.id !== id);
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete First post' }));
    await waitFor(() => expect(canvas.queryByText('First post')).toBeNull());
    await expect(remote(deletePost)).toHaveBeenCalledWith(1);
    await expect(remote(getPosts)).toHaveBeenCalledTimes(2);
  },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TwoCommandsInFlight = meta.story({
  beforeEach: () => {
    let current = [...posts, { id: 3, title: 'Third post', body: '' }];
    remote(getPosts).mockImplementation(async () => current);
    remote(deletePost).mockImplementation(async (id) => {
      await delay(id === 1 ? 400 : 50);
      current = current.filter((post) => post.id !== id);
    });
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Delete First post' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Second post' }));
    await waitFor(() => expect(canvas.queryByText('Second post')).toBeNull());
    await waitFor(() => expect(canvas.queryByText('First post')).toBeNull(), { timeout: 2000 });
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByRole('link', { name: 'Third post' })).toBeVisible();
  },
});

export const QueryRedirect = meta.story({
  beforeEach: () => {
    remote(getPosts).mockImplementation(() => redirect(303, '/elsewhere'));
  },
  play: async () => {
    // `goto` from Storybook's `$app/navigation` mock dispatches this event.
    const seen: unknown[] = [];
    const listener = (event: Event) => seen.push((event as CustomEvent).detail);
    window.addEventListener('storybook:goto', listener);
    try {
      await getPosts();
      await waitFor(() => expect(seen).toContainEqual(['/elsewhere', undefined]));
    } finally {
      window.removeEventListener('storybook:goto', listener);
    }
  },
});
