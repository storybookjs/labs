import { expect, test } from '@playwright/test';

test('opens a post from the list and renders its Markdown', async ({ page }) => {
  // Through the search: posts that other tests write push the seed off the first page.
  await page.goto('/?q=typography');
  await page.getByRole('link', { name: 'Typography for long reads' }).click();
  await expect(page).toHaveURL(/\/posts\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Typography for long reads');
  await expect(page.getByText('Sanna Virtanen').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'The settings we use' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('link', { name: 'design', exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ views/)).toBeVisible();
  await expect(page).toHaveTitle(/Field Notes/);
});

test('raw HTML in a post is shown as text, not run', async ({ page }) => {
  await page.goto('/posts/new');
  const title = `HTML is escaped ${Date.now().toString(36)}`;
  await page.getByLabel('Title').fill(title);
  await page
    .getByLabel('Body')
    .fill('<img src=x onerror="window.pwned=1"> and [a link](javascript:alert(1))');
  await page.getByLabel('Author').fill('Playwright');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  // Shown as text (the typographer makes the quotes curly).
  await expect(page.getByText(/<img src=x onerror=/)).toBeVisible();
  expect(await page.evaluate(() => 'pwned' in window)).toBe(false);
  await expect(page.locator('article a[href^="javascript:"]')).toHaveCount(0);
});

test('each visit counts a view', async ({ page }) => {
  await page.goto('/?q=calmer');
  await page.getByRole('link', { name: 'A calmer colour palette' }).click();
  const stats = page.getByText(/^\d+ views?$/);
  // The page shows the count from before this visit, then the visit's own `countView` adds one.
  const before = Number((await stats.textContent())?.match(/\d+/)?.[0]);
  await expect(stats).toHaveText(`${before + 1} views`);
  await page.reload();
  await expect(stats).toHaveText(`${before + 2} views`);
});

test('a post with a long code line does not widen the page on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?q=remote+functions');
  await page.getByRole('link', { name: 'Remote functions, one month in' }).click();
  await expect(page.locator('pre')).toBeVisible();
  const widths = await page.evaluate(() => ({
    page: document.scrollingElement!.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.page).toBe(widths.viewport);
});
