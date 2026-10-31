import { expect, test } from '@playwright/test';

import { createPost, uniqueTitle } from './helpers.ts';

test('the form shows what is missing and keeps the input', async ({ page }) => {
  await page.goto('/posts/new');
  await page.getByLabel('Title').fill('Hi');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Use at least 3 characters')).toBeVisible();
  await expect(page.getByText('Write something first')).toBeVisible();
  await expect(page.getByText('Say who wrote this')).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Hi');
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');
  await expect(page).toHaveURL(/\/posts\/new$/);
});

test('tags must be simple words', async ({ page }) => {
  await page.goto('/posts/new');
  await page.getByLabel('Title').fill(uniqueTitle('Bad tags'));
  await page.getByLabel('Body').fill('Body');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByLabel('Tags').fill('fine, Not OK!');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText(/Tags use lowercase letters/)).toBeVisible();
});

test('two posts cannot share a title', async ({ page }) => {
  const title = uniqueTitle('Taken');
  await createPost(page, { title });
  await page.goto('/posts/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Body').fill('Again');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('A post with this title exists')).toBeVisible();
});
