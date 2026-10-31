import { expect, test } from '@playwright/test';

import { createPost, uniqueTitle } from './helpers.ts';

test('the home page announces posts published elsewhere, and shows them', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('article').first()).toBeVisible();

  // Another reader publishes a post.
  const other = await context.newPage();
  const title = uniqueTitle('Fresh off the press');
  await createPost(other, { title });
  await other.close();

  const banner = page.getByText(/1 new post since you opened this page/);
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.getByRole('article').first().getByRole('heading')).toHaveText(title);
  // The whole banner goes, and it never says "0 new posts".
  await expect(page.getByRole('button', { name: 'Show' })).toBeHidden();
  await expect(page.getByText(/new posts? since you opened this page/)).toHaveCount(0);
});

test('a draft written earlier and published now is announced too', async ({ page, context }) => {
  // The draft is older than the post the reader sees first.
  const draftTitle = uniqueTitle('Written earlier');
  const writer = await context.newPage();
  await writer.goto('/posts/new');
  await writer.getByLabel('Title').fill(draftTitle);
  await writer.getByLabel('Body').fill('Not ready yet.');
  await writer.getByLabel('Author').fill('Playwright');
  await writer.getByLabel('Published').uncheck();
  await writer.getByRole('button', { name: 'Publish' }).click();
  await expect(writer.getByRole('heading', { level: 1, name: draftTitle })).toBeVisible();
  const draftUrl = writer.url();
  await createPost(writer, { title: uniqueTitle('Published first') });

  await page.goto('/');
  await expect(page.getByRole('article').first()).toBeVisible();

  // The writer publishes the draft.
  await writer.goto(`${draftUrl}/edit`);
  await writer.getByLabel('Published').check();
  await writer.getByRole('button', { name: 'Save changes' }).click();
  await expect(writer.getByRole('status').filter({ hasText: 'Changes saved' })).toBeVisible();
  await writer.close();

  await expect(page.getByText(/1 new post since you opened this page/)).toBeVisible();
});

test('“Show” on a later page goes to the first page, where the new post is', async ({
  page,
  context,
}) => {
  await page.goto('/?page=2');
  await expect(
    page.getByRole('navigation', { name: 'Pagination' }).locator('[aria-current="page"]')
  ).toHaveText('2');

  const other = await context.newPage();
  const title = uniqueTitle('While you were on page 2');
  await createPost(other, { title });
  await other.close();

  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('article').first().getByRole('heading', { level: 2 })).toHaveText(
    title
  );
  await expect(page.getByRole('button', { name: 'Show' })).toBeHidden();
  await expect(page.getByText(/new posts? since you opened this page/)).toHaveCount(0);
});
