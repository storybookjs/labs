import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { getReadingStats, listPosts, watchNewPosts } from './blog.remote.ts';
import { postPage } from './fixtures.ts';
import PostFeed from './PostFeed.svelte';
import { defaultListParams } from './posts.ts';

test('after “Show”, the banner is gone and never says “0 new posts”', async () => {
  const before = postPage();
  const after = { ...before, lastPublishedAt: before.lastPublishedAt + 60_000 };
  let shown = false;
  remote(listPosts).mockImplementation(async () => (shown ? after : before));
  remote(getReadingStats).mockResolvedValue({ views: 1, likes: 0 });
  // One new post after the first watermark, none after the second.
  remote(watchNewPosts).mockImplementation(async function* (since) {
    yield since === before.lastPublishedAt ? 1 : 0;
    await new Promise(() => {});
  });

  const screen = await render(PostFeed, {
    params: defaultListParams,
    onfilter: vi.fn<(next: object) => void>(),
  });
  await expect.element(screen.getByText(/1 new post since/)).toBeVisible();

  shown = true;
  await screen.getByRole('button', { name: 'Show' }).click();

  await expect.element(screen.getByRole('button', { name: 'Show' })).not.toBeInTheDocument();
  expect(screen.getByText(/new posts? since/).query()).toBeNull();
});
