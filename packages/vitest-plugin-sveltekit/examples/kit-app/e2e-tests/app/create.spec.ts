import { expect, test } from '@playwright/test';

import { createPost, uniqueTitle } from './helpers.ts';

test('writes a post, which opens and is listed on the home page', async ({ page }) => {
  const title = uniqueTitle('A new post');
  await createPost(page, {
    title,
    body: '## Hello\n\nA list:\n\n- one\n- two',
    tags: 'notes, testing',
  });
  await expect(page.getByRole('status').filter({ hasText: 'Post published' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Hello' })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'two' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'notes', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'All posts' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('article').first().getByRole('heading', { level: 2 })).toHaveText(
    title
  );
});

test('the Markdown preview shows the body before publishing', async ({ page }) => {
  await page.goto('/posts/new');
  await page.getByLabel('Body').fill('# Big\n\nSome *emphasis*.');
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(
    page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'Big' })
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Preview' }).locator('em')).toHaveText('emphasis');
});

test('an unticked “Published” box saves a draft', async ({ page }) => {
  const title = uniqueTitle('A draft');
  await page.goto('/posts/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Body').fill('Not ready yet.');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByLabel('Published').uncheck();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
});
