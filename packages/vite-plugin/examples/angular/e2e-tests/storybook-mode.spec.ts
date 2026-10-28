import { expect, test } from '@playwright/test';

test('dedicated mode replaces the host app with the manager at the root', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#storybook-preview-iframe')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Angular CLI + Vite + Storybook' })).toHaveCount(
    0
  );
});

test('dedicated mode renders an Angular story in the manager iframe', async ({ page }) => {
  await page.goto('/?path=/story/example-button--primary');

  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('button', { name: 'Primary button', exact: true })).toBeVisible();
});

test('dedicated mode serves the standalone Angular preview at the root', async ({ page }) => {
  await page.goto('/iframe.html?id=example-button--secondary&viewMode=story');

  await expect(page.getByRole('button', { name: 'Secondary button', exact: true })).toBeVisible();
});

test('dedicated mode serves both stories in the root index', async ({ request }) => {
  const response = await request.get('/index.json');

  expect(response.ok()).toBe(true);
  const index = await response.json();
  expect(index.entries).toMatchObject({
    'example-button--primary': { id: 'example-button--primary', type: 'story' },
    'example-button--secondary': { id: 'example-button--secondary', type: 'story' },
  });
});
