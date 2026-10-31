import { expect, test } from '@playwright/test';

import { createPost, uniqueTitle } from './helpers.ts';

test('deletes a post after confirming, and its page is gone', async ({ page }) => {
  const title = uniqueTitle('To delete');
  const url = await createPost(page, { title });

  await page.getByRole('button', { name: 'Delete' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this post?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Delete' }).click();
  await dialog.getByRole('button', { name: 'Delete post' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('status').filter({ hasText: `Deleted “${title}”` })).toBeVisible();
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);

  const response = await page.goto(url);
  expect(response?.status()).toBe(404);
});
