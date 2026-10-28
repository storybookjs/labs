import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page, type WebSocket } from '@playwright/test';

import { startDevServer, type DevServer } from './helpers/dev-server.ts';

type ObservedSocket = {
  socket: WebSocket;
  pathname: string;
  received: boolean;
};

const EXAMPLE = path.resolve(import.meta.dirname, '..');
const ORIGIN = 'http://127.0.0.1:5193';
const STORY_URL = '/__storybook/?path=/story/example-counter--default';
// The Storybook manager and its preview iframe each open their own server channel.
const EXPECTED_SOCKETS: Record<string, number> = {
  '/_next/hmr': 1,
  '/__storybook/__storybook-hmr': 1,
  '/storybook-server-channel': 2,
};
const SOCKET_PATHS = Object.keys(EXPECTED_SOCKETS);

let fixture: string;
let devServer: DevServer | undefined;

test.beforeAll(async () => {
  test.setTimeout(180_000);
  await mkdir(path.join(EXAMPLE, '.cache'), { recursive: true });
  fixture = await mkdtemp(path.join(EXAMPLE, '.cache/next-e2e-'));
  for (const entry of [
    'src',
    '.storybook',
    'package.json',
    'next.config.mjs',
    'server.mjs',
    'storybook-middleware.mjs',
    'tsconfig.json',
  ]) {
    await cp(path.join(EXAMPLE, entry), path.join(fixture, entry), { recursive: true });
  }
  devServer = await startDevServer(fixture, ['server.mjs'], `${ORIGIN}/__storybook/index.json`, {
    PORT: '5193',
  });
});

test.afterAll(async () => {
  try {
    await devServer?.stop();
  } finally {
    if (fixture) await rm(fixture, { recursive: true, force: true });
  }
});

test('Next renders HTML, hydrates the counter, and navigates without losing client state', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('Two workbenches.');
  expect(html).toContain('/_next/');
  expect(html).not.toContain('/@vite/client');
  expect(html).toMatch(/data-testid="count"[^>]*>0</);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Two workbenches/ })).toBeVisible();
  await page.getByRole('button', { name: 'Increment' }).click();
  await page.getByRole('button', { name: 'Increment' }).click();
  await expect(page.getByTestId('count')).toHaveText('2');
  await page.evaluate(() => Reflect.set(window, '__documentMarker', 'client-navigation'));

  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL('/about');
  await expect(page.getByRole('heading', { name: /Different route/ })).toBeVisible();
  await expect(page.getByTestId('pathname')).toHaveText('/about');
  await expect(page.getByTestId('count')).toHaveText('2');
  expect(await page.evaluate(() => Reflect.get(window, '__documentMarker'))).toBe(
    'client-navigation'
  );

  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('pathname')).toHaveText('/');
  await expect(page.getByTestId('count')).toHaveText('2');
});

test('the mount redirects with its query and leaves non-Storybook routes to Next', async ({
  request,
}) => {
  const response = await request.get('/__storybook?path=/story/example-counter--default', {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe(STORY_URL);

  const about = await request.get('/about');
  expect(about.ok()).toBeTruthy();
  expect(await about.text()).toContain('Different route.');
  const missing = await request.get('/__storybook-not-a-route');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).not.toContain('/@vite/client');
});

test('serves the embedded manager, story index, and standalone App Router preview', async ({
  page,
  request,
}) => {
  const index = await request.get('/__storybook/index.json');
  expect(index.ok()).toBeTruthy();
  expect((await index.json()).entries['example-counter--default']).toMatchObject({
    id: 'example-counter--default',
    type: 'story',
  });
  await page.goto(STORY_URL);
  const preview = page.frameLocator('#storybook-preview-iframe');
  await expect(preview.getByRole('heading', { name: 'Story counter' })).toBeVisible();
  await preview.getByRole('button', { name: 'Increment' }).click();
  await expect(preview.getByTestId('count')).toHaveText('1');

  await page.goto('/__storybook/iframe.html?id=example-counter--on-about&viewMode=story');
  await expect(page.getByTestId('pathname')).toHaveText('/about');
  await expect(page.getByTestId('count')).toHaveText('7');
});

test('a story-only edit refreshes Storybook without resetting the Next document or counter', async ({
  page,
  context,
}) => {
  const storyFile = path.join(fixture, 'src/components/Counter.stories.tsx');
  const original = await readFile(storyFile, 'utf8');
  const storybook = await context.newPage();
  const preview = storybook.frameLocator('#storybook-preview-iframe');

  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Increment' }).click();
    await page.getByRole('button', { name: 'Increment' }).click();
    await page.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page.getByTestId('pathname')).toHaveText('/about');
    await page.evaluate(() => Reflect.set(window, '__documentMarker', 'story-only-hmr'));
    await storybook.goto(STORY_URL);
    await expect(preview.getByRole('heading', { name: 'Story counter' })).toBeVisible();

    expect(original).toContain("label: 'Story counter'");
    await writeFile(
      storyFile,
      original.replace("label: 'Story counter'", "label: 'Story updated'")
    );
    await expect(preview.getByRole('heading', { name: 'Story updated' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Shared counter' })).toBeVisible();
    await expect(page.getByTestId('count')).toHaveText('2');
    await expect(page.getByTestId('pathname')).toHaveText('/about');
    expect(await page.evaluate(() => Reflect.get(window, '__documentMarker'))).toBe(
      'story-only-hmr'
    );
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('3');
  } finally {
    await writeFile(storyFile, original);
    await expect(preview.getByRole('heading', { name: 'Story counter' })).toBeVisible({
      timeout: 60_000,
    });
    await storybook.close();
  }
});

test('a shared client component edit reaches both Next and the Storybook preview', async ({
  page,
  context,
}) => {
  const componentFile = path.join(fixture, 'src/components/Counter.tsx');
  const original = await readFile(componentFile, 'utf8');
  const storybook = await context.newPage();
  const preview = storybook.frameLocator('#storybook-preview-iframe');

  try {
    await page.goto('/');
    await storybook.goto(STORY_URL);
    await expect(page.getByText('One component, two compilers.')).toBeVisible();
    await expect(preview.getByText('One component, two compilers.')).toBeVisible();

    expect(original).toContain('One component, two compilers.');
    await writeFile(
      componentFile,
      original.replace('One component, two compilers.', 'Updated in both runtimes.')
    );
    await expect(page.getByText('Updated in both runtimes.')).toBeVisible({ timeout: 60_000 });
    await expect(preview.getByText('Updated in both runtimes.')).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('1');
    await preview.getByRole('button', { name: 'Increment' }).click();
    await expect(preview.getByTestId('count')).toHaveText('1');
  } finally {
    await writeFile(componentFile, original);
    await expect(page.getByText('One component, two compilers.')).toBeVisible({ timeout: 60_000 });
    await expect(preview.getByText('One component, two compilers.')).toBeVisible({
      timeout: 60_000,
    });
    await storybook.close();
  }
});

for (const first of ['Next', 'Storybook'] as const) {
  test(`both HMR sockets and the manager channel share one port with ${first} loaded first`, async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await devServer?.stop();
    devServer = await startDevServer(fixture, ['server.mjs'], `${ORIGIN}/__storybook/index.json`, {
      PORT: '5193',
    });
    const storybook = await context.newPage();
    const nextSockets = observeSockets(page);
    const storybookSockets = observeSockets(storybook);
    const preview = storybook.frameLocator('#storybook-preview-iframe');

    if (first === 'Next') {
      await page.goto('/');
      await expect(page.getByTestId('count')).toHaveText('0');
      await storybook.goto(STORY_URL);
    } else {
      await storybook.goto(STORY_URL);
      await expect(preview.getByRole('heading', { name: 'Story counter' })).toBeVisible();
      await page.goto('/');
    }
    await expect(preview.getByRole('heading', { name: 'Story counter' })).toBeVisible();
    await expect(page.getByTestId('count')).toHaveText('0');
    for (const pathname of SOCKET_PATHS) {
      await expect
        .poll(
          () =>
            [...nextSockets, ...storybookSockets].filter(
              (entry) => entry.pathname === pathname && entry.received && !entry.socket.isClosed()
            ).length
        )
        .toBe(EXPECTED_SOCKETS[pathname]);
    }
    const connected = [...nextSockets, ...storybookSockets].filter((entry) =>
      SOCKET_PATHS.includes(entry.pathname)
    );
    const expectedTotal = Object.values(EXPECTED_SOCKETS).reduce((sum, count) => sum + count, 0);
    expect(connected.map(({ socket }) => new URL(socket.url()).port)).toEqual(
      Array.from({ length: expectedTotal }, () => '5193')
    );

    await page.getByRole('button', { name: 'Increment' }).click();
    await page.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page.getByTestId('pathname')).toHaveText('/about');
    await expect(page.getByTestId('count')).toHaveText('1');
    await preview.getByRole('button', { name: 'Increment' }).click();
    await expect(preview.getByTestId('count')).toHaveText('1');
    expect(connected.every(({ socket }) => !socket.isClosed())).toBe(true);

    await devServer.stop();
    await expect.poll(() => connected.every(({ socket }) => socket.isClosed())).toBe(true);
    await storybook.close();
  });
}

function observeSockets(page: Page): ObservedSocket[] {
  const sockets: ObservedSocket[] = [];
  page.on('websocket', (socket) => {
    const entry = { socket, pathname: new URL(socket.url()).pathname, received: false };
    sockets.push(entry);
    socket.on('framereceived', () => {
      entry.received = true;
    });
  });
  return sockets;
}
