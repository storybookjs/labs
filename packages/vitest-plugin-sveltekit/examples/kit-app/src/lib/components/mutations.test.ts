// Mutations that overlap, and state that must not leak from one test to the next.
import { type RemoteMock, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
  createPost,
  deletePost,
  getPost,
  getPostCount,
  getPosts,
  getStats,
} from '#lib/posts.remote.ts';

import PostCount from './PostCount.svelte';
import PostDetail from './PostDetail.svelte';
import PostForm from './PostForm.svelte';
import PostList from './PostList.svelte';

const posts = [
  { id: 1, title: 'First post', body: '' },
  { id: 2, title: 'Second post', body: '' },
  { id: 3, title: 'Third post', body: '' },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

beforeEach(() => {
  remote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
});

test('two commands in flight both refresh the query they update', async () => {
  let current = [...posts];
  remote(getPosts).mockImplementation(async () => current);
  remote(deletePost).mockImplementation(async (id) => {
    await delay(id === 1 ? 400 : 50);
    current = current.filter((post) => post.id !== id);
  });
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'First post' })).toBeVisible();

  await screen.getByRole('button', { name: 'Delete First post' }).click();
  await screen.getByRole('button', { name: 'Delete Second post' }).click();

  await expect.element(screen.getByText('Second post')).not.toBeInTheDocument();
  await expect.element(screen.getByText('First post'), { timeout: 2000 }).not.toBeInTheDocument();
  expect(screen.getByRole('alert').query()).toBeNull();
  await expect.element(screen.getByRole('link', { name: 'Third post' })).toBeVisible();
});

test('a live stream emitting during a slow mutation does not break the refresh', async () => {
  let current = [...posts];
  remote(getPosts).mockImplementation(async () => current);
  const feed = remote(getPostCount).mockStream(3);
  remote(deletePost).mockImplementation(async (id) => {
    await delay(200);
    current = current.filter((post) => post.id !== id);
    feed.emit(current.length);
    await delay(100);
  });
  const count = await render(PostCount);
  const list = await render(PostList);
  await expect.element(count.getByText('3', { exact: true })).toBeVisible();
  await expect.element(list.getByRole('link', { name: 'First post' })).toBeVisible();

  await list.getByRole('button', { name: 'Delete First post' }).click();

  await expect.element(count.getByText('2', { exact: true })).toBeVisible();
  await expect.element(list.getByText('First post'), { timeout: 2000 }).not.toBeInTheDocument();
  expect(list.getByRole('alert').query()).toBeNull();
});

test('a form submission that never settles', async () => {
  remote(createPost).mockPending();
  const screen = await render(PostForm);
  await screen.getByLabelText('Title').fill('Slow');
  await screen.getByRole('button', { name: 'Create' }).click();
  await expect.element(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  expect(createPost.pending).toBe(1);
});

test('the next test starts with an idle form', async () => {
  expect(createPost.pending).toBe(0);
  const screen = await render(PostForm);
  await expect.element(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
});

test('a command that never settles', async () => {
  remote(getPosts).mockResolvedValue(posts);
  remote(deletePost).mockPending();
  const screen = await render(PostList);
  await screen.getByRole('button', { name: 'Delete First post' }).click();
  expect(deletePost.pending).toBe(1);
});

test('the next test starts with an idle command', async () => {
  expect(deletePost.pending).toBe(0);
});

// The prerender result is written to the Cache API after the data is returned; the next test's
// reset must not race with that write.
for (let i = 0; i < 8; i++) {
  test(`prerender pair ${i}: first test`, async () => {
    remote(getPost).mockImplementation(async (id) => ({ id, title: `A${i}`, body: '' }));
    const screen = await render(PostDetail, { id: 7 });
    await expect.element(screen.getByRole('heading', { name: `A${i}` })).toBeVisible();
  });
  test(`prerender pair ${i}: second test does not see the first`, async () => {
    remote(getPost).mockImplementation(async (id) => ({ id, title: `B${i}`, body: '' }));
    const screen = await render(PostDetail, { id: 7 });
    await expect.element(screen.getByRole('heading', { name: `B${i}` })).toBeVisible();
    expect(remote(getPost)).toHaveBeenCalledTimes(1);
  });
}

// A request from one test that answers in the next test must not change the next test's state:
// form result and issues, pending counts, query data, and refreshes the response carries.
type FormMock = RemoteMock<typeof createPost>;
type IssueBuilder = Parameters<Parameters<FormMock['mockImplementation']>[0]>[1];
const lateForm = deferred<(issue: IssueBuilder) => { id: number; title: string; body: string }>();
const lateInvalid = deferred<(issue: IssueBuilder) => never>();
const lateCommand = deferred<void>();
const lateQuery = deferred<typeof posts>();
/** Resolves after the late request's mock has returned in the next test. */
const answered = { form: deferred<void>(), invalid: deferred<void>(), command: deferred<void>() };

async function submitLate(answer: typeof lateForm | typeof lateInvalid, done: () => void) {
  remote(createPost).mockImplementation(async (_data, issue) => {
    try {
      return (await answer.promise)(issue);
    } finally {
      done();
    }
  });
  const screen = await render(PostForm);
  await screen.getByLabelText('Title').fill('Late');
  await screen.getByRole('button', { name: 'Create' }).click();
  await expect.element(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
}

/** Renders a list and a form, then waits until `late` answered and the page had time to react. */
async function renderNextTest(answer: () => void, done: Promise<void>) {
  remote(getPosts).mockResolvedValue(posts);
  const list = await render(PostList);
  const form = await render(PostForm);
  await expect.element(list.getByRole('link', { name: 'First post' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);

  answer();
  await done;
  await delay(100);
  return { list, form };
}

async function expectUntouched({ list, form }: Awaited<ReturnType<typeof renderNextTest>>) {
  await expect.element(form.getByRole('button', { name: 'Create' })).toBeEnabled();
  expect(form.getByRole('status').query()).toBeNull();
  expect(form.getByRole('alert').query()).toBeNull();
  expect(createPost.pending).toBe(0);
  await expect.element(list.getByRole('link', { name: 'First post' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
  expect(remote(createPost)).not.toHaveBeenCalled();
  expect(remote(deletePost)).not.toHaveBeenCalled();
}

test('late form result, 1/2: the submission is still in flight when the test ends', async () => {
  await submitLate(lateForm, () => answered.form.resolve());
  // The request reaches the mock while this test runs, so this mock answers it.
  await expect.poll(() => remote(createPost).mock.calls.length).toBe(1);
});

test('late form result, 2/2: the next test keeps its form and queries', async () => {
  const screens = await renderNextTest(
    () => lateForm.resolve(() => ({ id: 9, title: 'Late', body: '' })),
    answered.form.promise
  );
  await expectUntouched(screens);
  expect(createPost.result).toBeUndefined();
});

test('late form issues, 1/2: the submission is still in flight when the test ends', async () => {
  await submitLate(lateInvalid, () => answered.invalid.resolve());
  await expect.poll(() => remote(createPost).mock.calls.length).toBe(1);
});

test('late form issues, 2/2: the next test keeps its form and queries', async () => {
  const screens = await renderNextTest(
    () => lateInvalid.resolve((issue) => invalid(issue.title('Late issue'))),
    answered.invalid.promise
  );
  await expectUntouched(screens);
  expect(createPost.fields.title.issues()).toBeUndefined();
});

test('late command refreshes, 1/2: the command is still in flight when the test ends', async () => {
  remote(getPosts).mockResolvedValue(posts);
  remote(deletePost).mockImplementation(async () => {
    await lateCommand.promise;
    answered.command.resolve();
  });
  const screen = await render(PostList);
  // The click sends `getPosts` along as a query to refresh (`.updates(getPosts(order))`).
  await screen.getByRole('button', { name: 'Delete First post' }).click();
  expect(deletePost.pending).toBe(1);
  await expect.poll(() => remote(deletePost).mock.calls.length).toBe(1);
});

test('late command refreshes, 2/2: the queries of the next test do not refresh', async () => {
  const screens = await renderNextTest(() => lateCommand.resolve(), answered.command.promise);
  await expectUntouched(screens);
  expect(deletePost.pending).toBe(0);
});

test('late query, 1/2: the query is still loading when the test ends', async () => {
  remote(getPosts).mockImplementation(() => lateQuery.promise);
  const screen = await render(PostList);
  await expect.element(screen.getByText('Loading posts…')).toBeVisible();
  await expect.poll(() => remote(getPosts).mock.calls.length).toBe(1);
});

test('late query, 2/2: the next test does not see its data', async () => {
  remote(getPosts).mockResolvedValue([{ id: 5, title: 'Fresh post', body: '' }]);
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'Fresh post' })).toBeVisible();

  lateQuery.resolve([{ id: 6, title: 'Stale post', body: '' }]);
  await delay(100);
  expect(screen.getByText('Stale post').query()).toBeNull();
  await expect.element(screen.getByRole('link', { name: 'Fresh post' })).toBeVisible();
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
});

test('request sent as the test ends, 1/2: the query has not reached its mock yet', async () => {
  remote(getPosts).mockResolvedValue(posts);
  await render(PostList);
  expect(remote(getPosts)).not.toHaveBeenCalled();
});

test('request sent as the test ends, 2/2: the spies of the next test do not answer it', async () => {
  remote(getPosts).mockResolvedValue([{ id: 5, title: 'Fresh post', body: '' }]);
  const screen = await render(PostList);
  await expect.element(screen.getByRole('link', { name: 'Fresh post' })).toBeVisible();
  await delay(100);
  expect(remote(getPosts)).toHaveBeenCalledTimes(1);
});
