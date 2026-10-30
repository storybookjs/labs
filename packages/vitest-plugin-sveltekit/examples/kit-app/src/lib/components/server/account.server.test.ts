import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { clearPosts, signIn } from '#lib/account.remote.ts';
import { getPosts } from '#lib/posts.remote.ts';
import { checkPassword } from '#lib/server/auth.ts';
import { resetDb } from '#lib/server/mocked-db.ts';

import PostList from '../PostList.svelte';

vi.mock('#lib/server/auth.ts', () => ({
  checkPassword: vi.fn<(name: string, password: string) => Promise<boolean>>(),
}));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  await resetDb([{ title: 'From the database', body: '' }]);
});

test('a real command sets a cookie in requestEvent.cookies', async () => {
  vi.mocked(checkPassword).mockResolvedValue(true);
  await signIn({ name: 'ada', password: 'ada-secret' });
  expect(requestEvent.cookies.get('session')).toBe('ada');
});

test('a real command refreshes a query through a helper module, in its own response', async () => {
  // Counts the requests: each one copies `requestEvent.locals`, which reads this getter.
  let requests = 0;
  Object.defineProperty(requestEvent.locals, 'user', {
    enumerable: true,
    get: () => (requests++, { name: 'ada' }),
  });
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'From the database' })).toBeVisible();
  requests = 0;

  vi.mocked(checkPassword).mockResolvedValue(true);
  await clearPosts('ada-secret');

  // One request: the new list came with the command's response, as on SvelteKit's server. With
  // the client stub in the helper, the list would come from a second request.
  await expect.element(screen.getByText('No posts yet')).toBeVisible();
  expect(requests).toBe(1);
});

test('a query that runs while a real command waits does not take its refresh', async () => {
  let allowClear!: (allowed: boolean) => void;
  vi.mocked(checkPassword).mockImplementation(
    () => new Promise<boolean>((resolve) => (allowClear = resolve))
  );
  requestEvent.cookies.set('session', 'ada');
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'From the database' })).toBeVisible();

  const cleared = clearPosts('ada-secret');
  await expect.poll(() => vi.mocked(checkPassword).mock.calls.length).toBe(1);
  // A query while the command waits. The command's refresh afterwards must still go into the
  // command's own response.
  // `then` sends the request; a query object alone waits until something reads it.
  const query = getPosts('oldest').then((posts) => posts);
  await delay(50);
  allowClear(true);
  await Promise.all([cleared, query]);

  await expect.element(screen.getByText('No posts yet')).toBeVisible();
});

let allowSignIn: (allowed: boolean) => void;
let signedIn: Promise<unknown>;

test('a slow sign-in, 1/2: the password check is still running when the test ends', async () => {
  vi.mocked(checkPassword).mockImplementation(
    () => new Promise<boolean>((resolve) => (allowSignIn = resolve))
  );
  signedIn = signIn({ name: 'ada', password: 'ada-secret' }).catch(() => {});
  await expect.poll(() => vi.mocked(checkPassword).mock.calls.length).toBe(1);
});

test('a slow sign-in, 2/2: its cookie does not land in the next test', async () => {
  requestEvent.cookies.set('theme', 'dark');
  // The sign-in still holds the previous test's request queue; this test has its own.
  expect(await getPosts('oldest')).toHaveLength(1);

  allowSignIn(true);
  await delay(100);

  expect(requestEvent.cookies.getAll()).toEqual([{ name: 'theme', value: 'dark' }]);
  void signedIn;
});
