import { expect } from 'storybook/test';

import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import preview from '../../../../.storybook/preview';
import PostCount from '../PostCount.svelte';

const meta = preview.meta({
  title: 'Server/PostCount',
  component: PostCount,
  beforeEach: async () => {
    await resetDb([{ title: 'One' }, { title: 'Two' }]);
  },
});

export const LivePolling = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    // The real `getPostCount` polls the database (every `LIVE_POLL_MS` from `.env`).
    await db.insert(posts).values({ title: 'Three' });
    await expect(await canvas.findByText('3')).toBeVisible();
  },
});
