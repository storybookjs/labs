import { expect } from 'storybook/test';

import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import preview from '../../../../.storybook/preview';
import PostCount from '../PostCount.svelte';

const meta = preview.meta({
  parameters: { demo: true },
  title: 'Server/PostCount',
  component: PostCount,
  beforeEach: async () => {
    await resetDb([{ title: 'One' }, { title: 'Two' }]);
  },
});

export const LivePolling = meta.story({
  play: async ({ canvas, step }) => {
    await expect(await canvas.findByText('2')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    await step('A third post lands in the database', async () => {
      await db.insert(posts).values({ title: 'Three' });
    });
    // The real `getPostCount` polls the database (every `LIVE_POLL_MS` from `.env`).
    await expect(await canvas.findByText('3')).toBeVisible();
  },
});
