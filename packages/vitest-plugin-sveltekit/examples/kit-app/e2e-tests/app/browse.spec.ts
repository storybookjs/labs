import { expect, test } from '@playwright/test';

test('the home page lists the published posts, newest first', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Field Notes' })).toBeVisible();
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(6);
  await expect(cards.first().getByRole('heading')).toContainText('Notes from a quiet refactor');
  await expect(page.getByText(/^\d+ posts/)).toBeVisible();
  // Drafts are not listed by default.
  await expect(page.getByText('Draft: a checklist for releases')).toHaveCount(0);
});

test('search, tag filter and sorting update the list and the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search').fill('typography');
  await expect(page).toHaveURL(/q=typography/);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(
    'Typography for long reads'
  );

  await page.getByRole('link', { name: 'Clear filters' }).first().click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByLabel('Tag', { exact: true }).selectOption('design');
  await expect(page).toHaveURL(/tag=design/);
  // The old list stays on screen until the new one has loaded.
  await expect(page.getByText(/tagged #design/)).toBeVisible();
  for (const card of await page.getByRole('article').all()) {
    await expect(card.getByRole('link', { name: 'design', exact: true })).toBeVisible();
  }

  await page.getByLabel('Sort').selectOption('title');
  await expect(page).toHaveURL(/sort=title/);
  await expect(page.getByRole('article').first().getByRole('heading')).toHaveText(
    'A calmer colour palette'
  );
  const titles = await page.getByRole('article').getByRole('heading').allTextContents();
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
});

test('a tag on a card filters the list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'svelte', exact: true }).first().click();
  await expect(page).toHaveURL(/tag=svelte/);
  await expect(page.getByText(/tagged #svelte/)).toBeVisible();
});

test('pagination moves through the posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(6);
  const firstPage = await page.getByRole('article').getByRole('heading').allTextContents();
  await page
    .getByRole('navigation', { name: 'Pagination' })
    .getByRole('link', { name: '2' })
    .click();
  await expect(page).toHaveURL(/page=2/);
  // The page 1 results stay on screen until page 2 has loaded.
  await expect(
    page.getByRole('navigation', { name: 'Pagination' }).locator('[aria-current="page"]')
  ).toHaveText('2');
  await expect(page.getByRole('article').first().getByRole('heading')).not.toHaveText(
    firstPage[0]!
  );
  const secondPage = await page.getByRole('article').getByRole('heading').allTextContents();
  expect(secondPage.length).toBeGreaterThan(0);
  expect(secondPage.some((title) => firstPage.includes(title))).toBe(false);
});

test('drafts are listed under “Show: Drafts”', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Show').selectOption('drafts');
  await expect(page.getByText('Draft: a checklist for releases')).toBeVisible();
  await expect(page.getByText('Draft', { exact: true }).first()).toBeVisible();
});

test('a search for % finds only posts that contain a %', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search').fill('%');
  await expect(page).toHaveURL(/q=%25/);
  await expect(page.getByText('No posts match')).toBeVisible();
});
