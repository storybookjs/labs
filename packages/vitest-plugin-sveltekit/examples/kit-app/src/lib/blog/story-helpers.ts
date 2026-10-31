// Shared by the blog's stories: default mocks and the server mode seed.
import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';

import { resetDb } from '#lib/server/mocked-db.ts';
import { seedPosts } from '#lib/server/seed.ts';

import { countView, getReadingStats, watchNewPosts } from './blog.remote.ts';

/**
 * Stats for every post, no new posts, and a view count that goes nowhere: what most mocked stories
 * need besides their data. (Storybook runs in server mode, so an unmocked function runs for real.)
 */
export function mockQuietFeed(): void {
  remote(getReadingStats).mockImplementation(async (id) => ({ views: id * 137, likes: id * 9 }));
  remote(watchNewPosts).mockStream(0);
  remote(countView).mockResolvedValue(undefined);
}

/** Server mode: the real remote functions on the in-memory database with the seed posts. */
export async function seedDatabase(): Promise<void> {
  await resetDb(seedPosts);
}
