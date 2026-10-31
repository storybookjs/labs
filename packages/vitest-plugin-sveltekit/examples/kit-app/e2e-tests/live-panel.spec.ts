import { expect, type Page, test } from '@playwright/test';

// The "Live feed" panel (`.storybook/manager.ts`) against `storybook dev` and the static build.

async function openPanel(page: Page, story: string, mode: string) {
  await page.goto(`/?path=/story/${story}`);
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByTestId('feed-count')).toHaveText('2');
  await page.getByRole('tab', { name: 'Live feed' }).click();
  await expect(page.getByTestId('live-panel-mode')).toHaveText(mode);
  return preview;
}

async function send(page: Page, template: string, payload?: unknown) {
  await page.getByRole('combobox').filter({ hasText: template }).selectOption({ label: template });
  if (payload !== undefined) {
    await page.getByRole('textbox', { name: 'Payload' }).fill(JSON.stringify(payload));
  }
  await page.getByRole('button', { name: 'Send' }).click();
}

test('the panel sends values to the mocked live query', async ({ page }) => {
  const preview = await openPanel(page, 'live--mocked', 'Mocked');
  const log = page.getByRole('list', { name: 'Log' });

  await send(page, 'Good data', { count: 7, latest: [{ id: 7, title: 'Edited in the panel' }] });
  await expect(preview.getByTestId('feed-count')).toHaveText('7');
  await expect(preview.getByText('Edited in the panel')).toBeVisible();
  await expect(log).toContainText('component: 7 posts (live)');

  await send(page, 'Invalid data');
  await expect(preview.getByRole('alert')).toContainText('Invalid feed: latest.0.title');
});

test('the panel changes the database of the real live query', async ({ page }) => {
  const preview = await openPanel(page, 'live--server', 'Server');
  const log = page.getByRole('list', { name: 'Log' });

  await send(page, 'Insert post', { title: 'Inserted by the e2e' });
  await expect(preview.getByTestId('feed-count')).toHaveText('3');
  await expect(preview.getByText('Inserted by the e2e')).toBeVisible();
  await expect(log).toContainText('component: 3 posts (live)');

  await send(page, 'Delete latest post');
  await expect(preview.getByTestId('feed-count')).toHaveText('2');
  await expect(preview.getByText('Inserted by the e2e')).toHaveCount(0);
});
