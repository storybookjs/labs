import { expect } from 'storybook/test';

import { resetDb } from '#lib/server/mocked-db.ts';

import preview from '../../../../.storybook/preview';
import PostDetail from '../PostDetail.svelte';

const meta = preview.meta({
  title: 'Server/PostDetail',
  component: PostDetail,
  args: { id: 1 },
  beforeEach: async () => {
    await resetDb([{ title: 'Prerendered from the database', body: 'Real `getPost`.' }]);
  },
});

export const RealPrerender = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Prerendered from the database' })
    ).toBeVisible();
  },
});

export const NotFound = meta.story({
  args: { id: 42 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Post 42 not found');
  },
});
