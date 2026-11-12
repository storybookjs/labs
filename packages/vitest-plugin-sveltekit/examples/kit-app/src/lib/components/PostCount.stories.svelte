<script module lang="ts">
  import { httpError, mockRemote, type RemoteStream } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import { getPostCount } from '#lib/posts.remote.ts';

  import PostCount from './PostCount.svelte';

  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Remote functions/PostCount',
    component: PostCount,
  });

  let feed: RemoteStream<number>;
</script>

<Story
  name="Live generator"
  beforeEach={() => {
    mockRemote(getPostCount).mockImplementation(async function* () {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield 2;
    });
  }}
  play={async ({ canvas, step }) => {
    await step('The generator yields 1', async () => {
      await expect(await canvas.findByText('1')).toBeVisible();
    });
    await step('200 ms later it yields 2 and returns: the stream is done', async () => {
      await expect(await canvas.findByText('2')).toBeVisible();
      await expect(await canvas.findByText('done')).toBeVisible();
    });
  }}
/>

<Story
  name="Live array"
  beforeEach={() => {
    mockRemote(getPostCount).mockReturnValue([3, 4]);
  }}
  play={async ({ canvas, step }) => {
    await step('The array sends 3, then 4, then the stream is done', async () => {
      await expect(await canvas.findByText('4')).toBeVisible();
      await expect(await canvas.findByText('done')).toBeVisible();
    });
  }}
/>

<Story
  name="Live stream"
  beforeEach={() => {
    feed = mockRemote(getPostCount).mockStream(5);
  }}
  play={async ({ canvas, step }) => {
    await expect(await canvas.findByText('5')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    await step('The stream sends 6', async () => {
      feed.emit(6);
      await expect(await canvas.findByText('6')).toBeVisible();
    });

    await step('The stream fails with a 503', async () => {
      feed.error(httpError(503, 'Feed down'));
      await expect(await canvas.findByRole('alert')).toHaveTextContent('Feed down');
    });
  }}
/>

<!-- Ends with the stream still open. -->
<Story
  name="Live stream open"
  beforeEach={() => {
    mockRemote(getPostCount).mockStream(7);
  }}
  play={async ({ canvas }) => {
    await expect(await canvas.findByText('7')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();
  }}
/>
