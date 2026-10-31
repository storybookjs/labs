import { expect, type Page } from '@playwright/test';

/** A title no other test uses. */
export const uniqueTitle = (prefix: string) => `${prefix} ${Date.now().toString(36)}`;

/** Writes a post through the real form and waits for its page. Returns the post URL. */
export async function createPost(
  page: Page,
  {
    title,
    body = 'Written by the **e2e** tests.',
    tags = 'testing',
    author = 'Playwright',
  }: {
    title: string;
    body?: string;
    tags?: string;
    author?: string;
  }
): Promise<string> {
  await page.goto('/posts/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Body').fill(body);
  await page.getByLabel('Tags').fill(tags);
  await page.getByLabel('Author').fill(author);
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  return new URL(page.url()).pathname;
}
