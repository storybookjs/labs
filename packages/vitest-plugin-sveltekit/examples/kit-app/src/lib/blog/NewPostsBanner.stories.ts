import { mockRemote, type RemoteStream } from 'vitest-plugin-sveltekit/remote.mock';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';

import preview from '../../../.storybook/preview';
import { watchNewPosts } from './blog.remote.ts';
import NewPostsBanner from './NewPostsBanner.svelte';
import { seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/NewPostsBanner',
  component: NewPostsBanner,
  parameters: { layout: 'padded' },
  args: { since: 12, onshow: fn() },
});

export const NoNewPosts = meta.story({
  beforeEach: () => {
    mockRemote(watchNewPosts).mockStream(0);
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Show' })).toBeNull();
  },
});

export const NewPosts = meta.story({
  beforeEach: () => {
    mockRemote(watchNewPosts).mockStream(3);
  },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByText(/3 new posts/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show' }));
    await expect(args.onshow).toHaveBeenCalled();
  },
});

let feed: RemoteStream<number>;

/** The banner appears when the live query sends a number. */
export const PostArrives = meta.story({
  beforeEach: () => {
    feed = mockRemote(watchNewPosts).mockStream(0);
  },
  play: async ({ canvas, step }) => {
    await step('The live query sends 1', async () => {
      feed.emit(1);
    });
    await expect(await canvas.findByText(/1 new post since/)).toBeVisible();
  },
});

/** Shown: the count goes back to 0, and the banner goes away (it never says "0 new posts"). */
export const PostShown = meta.story({
  beforeEach: () => {
    feed = mockRemote(watchNewPosts).mockStream(1);
  },
  play: async ({ canvas, step }) => {
    await expect(await canvas.findByText(/1 new post since/)).toBeVisible();
    await step('The live query sends 0', async () => {
      feed.emit(0);
    });
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Show' })).toBeNull());
    await expect(canvas.queryByText(/new posts? since/)).toBeNull();
  },
});

export const ServerMode = meta.story({
  name: 'Server mode',
  // After the newest seed post.
  args: { since: Date.parse('2026-10-15T00:00:00Z') },
  beforeEach: seedDatabase,
  play: async ({ canvas, step }) => {
    await step('Someone else publishes a post: a new row in the database', async () => {
      await db
        .insert(posts)
        .values({ title: 'Published elsewhere', body: 'Hello', publishedAt: new Date() });
    });
    // The real `watchNewPosts` polls the database and sees the new row.
    await expect(await canvas.findByText(/1 new post since/, {}, { timeout: 5000 })).toBeVisible();
  },
});
