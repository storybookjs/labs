import { expect, test } from '@playwright/test';

import { createPost, uniqueTitle } from './helpers.ts';

test('edits a post: the form starts filled in, and the changes show', async ({ page }) => {
  const title = uniqueTitle('Before');
  const url = await createPost(page, { title, body: 'First version.' });

  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(`${url}/edit`);
  await expect(page.getByLabel('Title')).toHaveValue(title);
  await expect(page.getByLabel('Body')).toHaveValue('First version.');

  const changed = uniqueTitle('After');
  await page.getByLabel('Title').fill(changed);
  await page.getByLabel('Body').fill('Second version, with **bold** text.');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL(url);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(changed);
  await expect(page.locator('article strong')).toHaveText('bold');
  await expect(page.getByRole('status').filter({ hasText: 'Changes saved' })).toBeVisible();
});

test('an edit is validated too', async ({ page }) => {
  const url = await createPost(page, { title: uniqueTitle('Valid') });
  await page.goto(`${url}/edit`);
  await page.getByLabel('Body').fill('');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Write something first')).toBeVisible();
  await expect(page).toHaveURL(`${url}/edit`);
});
