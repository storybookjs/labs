import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getPostCount } from '#lib/posts.remote';

import PostCount from './PostCount.svelte';

test('renders each value of an async generator', async () => {
  let release!: () => void;
  const second = new Promise<void>((resolve) => (release = resolve));
  remote(getPostCount).mockImplementation(async function* () {
    yield 1;
    await second;
    yield 2;
  });
  const screen = await render(PostCount);

  await expect.element(screen.getByText('1', { exact: true })).toBeVisible();
  release();
  await expect.element(screen.getByText('2', { exact: true })).toBeVisible();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('done');
});

test('replays a finite array and completes', async () => {
  remote(getPostCount).mockReturnValue([3, 4]);
  const screen = await render(PostCount);

  await expect.element(screen.getByText('4', { exact: true })).toBeVisible();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('done');
});

test('follows a stream driven by the test', async () => {
  const feed = remote(getPostCount).mockStream(5);
  const screen = await render(PostCount);

  await expect.element(screen.getByText('5', { exact: true })).toBeVisible();
  await expect.element(screen.getByTestId('live-status')).toHaveTextContent('live');

  feed.emit(6);
  await expect.element(screen.getByText('6', { exact: true })).toBeVisible();

  feed.error(httpError(503, 'Feed down'));
  await expect.element(screen.getByRole('alert')).toMatchTextContent(/Feed down/);
});
