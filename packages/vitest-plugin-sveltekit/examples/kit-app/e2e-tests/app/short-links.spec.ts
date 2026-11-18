import { expect, test } from '@playwright/test';

// `request` does not follow the redirect, so the test needs no network.
test('/storybook redirects to the Storybook on Chromatic', async ({ request }) => {
  const response = await request.get('/storybook', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe('https://main--6af5c73fdc9bbd1d937f563a.chromatic.com');
});

test('/repo redirects to the package on GitHub', async ({ request }) => {
  const response = await request.get('/repo', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(
    'https://github.com/storybookjs/labs/tree/main/packages/vitest-plugin-sveltekit'
  );
});
