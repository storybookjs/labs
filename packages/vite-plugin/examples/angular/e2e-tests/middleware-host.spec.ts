import { readFile, writeFile } from 'node:fs/promises';

import { expect, test, type WebSocket } from '@playwright/test';

const STORY_FILE = new URL('../src/Button.stories.ts', import.meta.url);
const COMPONENT_FILE = new URL('../src/ButtonComponent.ts', import.meta.url);

test('the Angular CLI development server renders a reactive Angular app', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Angular CLI + Vite + Storybook' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: 'Add one', exact: true }).click();
  await page.getByRole('button', { name: 'Add one', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('2');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Click count' })).toHaveText('0');
  await expect(page.getByRole('link', { name: 'Open Storybook' })).toHaveAttribute(
    'href',
    '/__storybook/?path=/story/example-button--primary'
  );
});

test('the embedded mount redirects and renders the Angular story on the host port', async ({
  page,
}) => {
  await page.goto('/__storybook?path=/story/example-button--primary');

  await expect(page).toHaveURL(
    'http://127.0.0.1:5203/__storybook/?path=/story/example-button--primary'
  );
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('button', { name: 'Primary button', exact: true })).toBeVisible();
  const previewFrame = page.frames().find((frame) => frame.url().includes('/iframe.html'));
  expect(previewFrame).toBeDefined();
  expect(new URL(previewFrame!.url()).origin).toBe('http://127.0.0.1:5203');
});

test('the embedded iframe renders the standalone secondary story', async ({ page }) => {
  await page.goto('/__storybook/iframe.html?id=example-button--secondary&viewMode=story');

  await expect(page.getByRole('button', { name: 'Secondary button', exact: true })).toBeVisible();
});

test('the Angular CLI development server serves both stories and the preview HMR client', async ({
  request,
}) => {
  const response = await request.get('/__storybook/index.json');

  expect(response.ok()).toBe(true);
  const index = await response.json();
  expect(index.entries).toMatchObject({
    'example-button--primary': { id: 'example-button--primary', type: 'story' },
    'example-button--secondary': { id: 'example-button--secondary', type: 'story' },
  });

  const client = await request.get('/__storybook/@vite/client');
  expect(client.ok()).toBe(true);
  expect(await client.text()).toContain('/__storybook-hmr');
});

test('the Storybook server channel stays connected on the Angular CLI port', async ({ page }) => {
  const sockets: WebSocket[] = [];
  page.on('websocket', (socket) => {
    if (socket.url().includes('storybook-server-channel')) {
      sockets.push(socket);
    }
  });

  await page.goto('/__storybook/?path=/story/example-button--primary');
  await expect(
    page.frameLocator('#storybook-preview-iframe').getByRole('button', { name: 'Primary button' })
  ).toBeVisible();
  // The manager and the preview iframe each open one channel; neither may reconnect.
  await expect.poll(() => sockets.length).toBe(2);
  await page.waitForTimeout(2_000);

  expect(sockets).toHaveLength(2);
  expect(sockets.map((socket) => new URL(socket.url()).host)).toEqual([
    '127.0.0.1:5203',
    '127.0.0.1:5203',
  ]);
  expect(sockets.map((socket) => socket.isClosed())).toEqual([false, false]);
});

test('a story-only edit updates the preview without resetting Angular host state', async ({
  context,
}) => {
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
    await expect(appPage.getByRole('status', { name: 'Click count' })).toHaveText('2');
  }
});

test('an Angular component template edit reaches both the host and the story', async ({
  context,
}) => {
  const originalComponent = await readFile(COMPONENT_FILE, 'utf8');
  const appPage = await context.newPage();
  const managerPage = await context.newPage();
  const preview = managerPage.frameLocator('#storybook-preview-iframe');

  try {
    await appPage.goto('/');
    await expect(appPage.getByRole('button', { name: 'Add one', exact: true })).toBeVisible();
    await managerPage.goto('/__storybook/?path=/story/example-button--primary');
    await expect(
      preview.getByRole('button', { name: 'Primary button', exact: true })
    ).toBeVisible();

    expect(originalComponent).toContain('{{ label() }}');
    await writeFile(
      COMPONENT_FILE,
      originalComponent.replace('{{ label() }}', '{{ label() }} updated')
    );

    // Angular CLI applies its own template update to the host without a reload.
    await expect(
      appPage.getByRole('button', { name: 'Add one updated', exact: true })
    ).toBeVisible();
    await appPage.getByRole('button', { name: 'Add one updated', exact: true }).click();
    await expect(appPage.getByRole('status', { name: 'Click count' })).toHaveText('1');

    // The canary does not push Angular component sources to a running preview; see README.
    await managerPage.reload();
    await expect(
      preview.getByRole('button', { name: 'Primary button updated', exact: true })
    ).toBeVisible();
  } finally {
    await writeFile(COMPONENT_FILE, originalComponent);
    await expect(appPage.getByRole('button', { name: 'Add one', exact: true })).toBeVisible();
    await managerPage.reload();
    await expect(
      preview.getByRole('button', { name: 'Primary button', exact: true })
    ).toBeVisible();
  }
});
