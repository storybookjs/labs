import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { resetDb } from '#lib/server/mocked-db.ts';

import PostDetail from '../PostDetail.svelte';

beforeEach(async () => {
  await resetDb([{ title: 'Prerendered from the database', body: '' }]);
});

test('runs the real prerender function', async () => {
  const screen = await render(PostDetail, { id: 1 });
  await expect
    .element(screen.getByRole('heading', { name: 'Prerendered from the database' }))
    .toBeVisible();
});

test('shows the real 404', async () => {
  const screen = await render(PostDetail, { id: 42 });
  await expect.element(screen.getByRole('alert')).toHaveTextContent('Post 42 not found');
});
