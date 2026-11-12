<script module lang="ts">
  import { httpError, mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { error, redirect } from '@sveltejs/kit';
  import { expect, waitFor } from 'storybook/test';

  import { deletePost, getPosts, getStats } from '#lib/posts.remote.ts';

  import preview from '../../../.storybook/preview';
  import PostList from './PostList.svelte';

  const posts = [
    { id: 1, title: 'First post', body: '' },
    { id: 2, title: 'Second post', body: '' },
  ];

  const { Story } = preview.meta({
    parameters: { demo: true },
    title: 'Remote functions/PostList',
    component: PostList,
    beforeEach: () => {
      mockRemote(getStats).mockImplementation(async (id) => ({ views: id * 100, likes: id }));
    },
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
</script>

<Story
  name="Data"
  beforeEach={() => {
    mockRemote(getPosts).mockResolvedValue(posts);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Second post' })).toBeVisible();
    await expect(mockRemote(getPosts)).toHaveBeenCalledWith('newest');
  }}
/>

<Story
  name="Pending"
  beforeEach={() => {
    mockRemote(getPosts).mockPending();
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('Loading posts…')).toBeVisible();
  }}
/>

<Story
  name="HTTP error"
  beforeEach={() => {
    mockRemote(getPosts).mockImplementation(() => error(503, 'The database is asleep'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The database is asleep');
  }}
/>

<Story
  name="Rejected value"
  beforeEach={() => {
    mockRemote(getPosts).mockRejectedValue(httpError(404, 'No posts here'));
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent('No posts here');
  }}
/>

<Story
  name="Batch"
  beforeEach={() => {
    mockRemote(getPosts).mockResolvedValue(posts);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByTestId('stats-2')).toHaveTextContent('200 views, 2 likes');
    // One mock call per argument, although SvelteKit sent a single batched request.
    await expect(mockRemote(getStats)).toHaveBeenCalledTimes(2);
    await expect(mockRemote(getStats)).toHaveBeenCalledWith(1);
    await expect(mockRemote(getStats)).toHaveBeenCalledWith(2);
  }}
/>

<Story
  name="Delete with command"
  beforeEach={() => {
    let current = [...posts];
    mockRemote(getPosts).mockImplementation(async () => current);
    mockRemote(deletePost).mockImplementation(async (id) => {
      current = current.filter((post) => post.id !== id);
    });
  }}
  play={async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete First post' }));
    await waitFor(() => expect(canvas.queryByText('First post')).toBeNull());
    await expect(mockRemote(deletePost)).toHaveBeenCalledWith(1);
    await expect(mockRemote(getPosts)).toHaveBeenCalledTimes(2);
  }}
/>

<Story
  name="Two commands in flight"
  beforeEach={() => {
    let current = [...posts, { id: 3, title: 'Third post', body: '' }];
    mockRemote(getPosts).mockImplementation(async () => current);
    mockRemote(deletePost).mockImplementation(async (id) => {
      await delay(id === 1 ? 400 : 50);
      current = current.filter((post) => post.id !== id);
    });
  }}
  play={async ({ canvas, userEvent, step }) => {
    await expect(await canvas.findByRole('link', { name: 'First post' })).toBeVisible();
    await step(
      'Delete two posts at once: the first delete takes 400 ms, the second 50 ms',
      async () => {
        await userEvent.click(canvas.getByRole('button', { name: 'Delete First post' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Delete Second post' }));
      }
    );
    await step('The fast delete finishes first', async () => {
      await waitFor(() => expect(canvas.queryByText('Second post')).toBeNull());
    });
    await step('Then the slow one, with no error and the other post kept', async () => {
      await waitFor(() => expect(canvas.queryByText('First post')).toBeNull(), { timeout: 2000 });
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(canvas.getByRole('link', { name: 'Third post' })).toBeVisible();
    });
  }}
/>

<Story
  name="Query redirect"
  beforeEach={() => {
    mockRemote(getPosts).mockImplementation(() => redirect(303, '/elsewhere'));
  }}
  play={async ({ step }) => {
    // `goto` from Storybook's `$app/navigation` mock dispatches this event.
    const seen: unknown[] = [];
    const listener = (event: Event) => seen.push((event as CustomEvent).detail);
    window.addEventListener('storybook:goto', listener);
    try {
      await step('Call getPosts(): its mock redirects to /elsewhere', async () => {
        await getPosts();
      });
      await waitFor(() => expect(seen).toContainEqual(['/elsewhere', undefined]));
    } finally {
      window.removeEventListener('storybook:goto', listener);
    }
  }}
/>
