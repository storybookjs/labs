import { readFile, writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

const STORY_FILE = new URL('../src/Button.stories.ts', import.meta.url);

test('the host renders a reactive Vue component at the root', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Vue + Vite + Storybook' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: 'Add one', exact: true }).click();
  await page.getByRole('button', { name: 'Add one', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('2');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Open Storybook' })).toHaveAttribute(
    'href',
    '/__storybook/?path=/story/example-button--primary'
  );
});

test('the embedded mount redirects and renders the manager with a Vue story', async ({ page }) => {
  await page.goto('/__storybook?path=/story/example-button--primary');

  await expect(page).toHaveURL(/\/__storybook\/\?path=\/story\/example-button--primary/);
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('button', { name: 'Primary button', exact: true })).toBeVisible();
});

test('the embedded iframe renders a standalone secondary story', async ({ page }) => {
  await page.goto('/__storybook/iframe.html?id=example-button--secondary&viewMode=story');

  await expect(page.getByRole('button', { name: 'Secondary button', exact: true })).toBeVisible();
});

test('the embedded story index contains both Vue stories', async ({ request }) => {
  const response = await request.get('/__storybook/index.json');

  expect(response.ok()).toBe(true);
  const index = await response.json();
  expect(index.entries).toMatchObject({
    'example-button--primary': { id: 'example-button--primary', type: 'story' },
    'example-button--secondary': { id: 'example-button--secondary', type: 'story' },
  });
});

test('editing a story updates its preview without resetting the host app', async ({ context }) => {
  const originalStory = await readFile(STORY_FILE, 'utf8');
  const appPage = await context.newPage();
  const managerPage = await context.newPage();
  const preview = managerPage.frameLocator('#storybook-preview-iframe');

  try {
    await appPage.goto('/');
    await appPage.getByRole('button', { name: 'Add one', exact: true }).click();
    await expect(appPage.getByRole('status', { name: 'Click count' })).toHaveText('1');

    await managerPage.goto('/__storybook/?path=/story/example-button--primary');
    await expect(
      preview.getByRole('button', { name: 'Primary button', exact: true })
    ).toBeVisible();

    expect(originalStory).toContain("label: 'Primary button',");
    await writeFile(
      STORY_FILE,
      originalStory.replace("label: 'Primary button',", "label: 'Primary button updated',")
    );

    await expect(
      preview.getByRole('button', { name: 'Primary button updated', exact: true })
    ).toBeVisible();
    await expect(appPage.getByRole('status', { name: 'Click count' })).toHaveText('1');
    await appPage.getByRole('button', { name: 'Add one', exact: true }).click();
    await expect(appPage.getByRole('status', { name: 'Click count' })).toHaveText('2');
  } finally {
    await writeFile(STORY_FILE, originalStory);
    await expect(
      preview.getByRole('button', { name: 'Primary button', exact: true })
    ).toBeVisible();
  }
});
