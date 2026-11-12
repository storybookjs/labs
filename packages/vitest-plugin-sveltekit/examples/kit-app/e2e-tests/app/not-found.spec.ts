import { expect, test } from '@playwright/test';

test('a post that does not exist is a 404', async ({ page }) => {
  const response = await page.goto('/posts/999999');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404: not found' })).toBeVisible();
  await expect(page.getByText('This post does not exist, or it was deleted.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to all posts' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('an unknown address is a 404', async ({ page }) => {
  const response = await page.goto('/no/such/page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404: not found' })).toBeVisible();
  await expect(page.getByText('There is no page at this address.')).toBeVisible();
});

test('a post id that is not a number is a 404', async ({ page }) => {
  const response = await page.goto('/posts/abc');
  expect(response?.status()).toBe(404);
});
