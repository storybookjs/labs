import { httpError, remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { count, desc, eq } from 'drizzle-orm';
import { expect } from 'storybook/test';

import { checkFeed, type Feed } from '#lib/feed.ts';
import { getFeed } from '#lib/feed.remote.ts';
import { db } from '#lib/server/db.ts';
import { resetDb, setDatabaseDown } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import { connectLivePanel } from '../../../.storybook/live-panel/preview.ts';
import preview from '../../../.storybook/preview';
import LiveFeed from './LiveFeed.svelte';

// Drive these two from the "Live feed" panel (`.storybook/manager.ts`).
const meta = preview.meta({ title: 'Live', component: LiveFeed });

const seed: Feed = {
  count: 2,
  latest: [
    { id: 2, title: 'Second post' },
    { id: 1, title: 'First post' },
  ],
};

/** `getFeed` is a `mockStream`: the panel's values go through SvelteKit's live query runtime. */
export const Mocked = meta.story({
  beforeEach: () => {
    const feed = remote(getFeed).mockStream(seed);
    return connectLivePanel('mocked', (action, payload) => {
      switch (action) {
        case 'emit': {
          let value: Feed;
          try {
            // The real handler checks its feed before sending it; so does the mock.
            value = checkFeed(payload);
          } catch (error) {
            feed.error(error);
            return 'Failed the feed check: sent as an error';
          }
          feed.emit(value);
          return 'Emitted';
        }
        case 'error': {
          const { status, message } = payload as { status: number; message: string };
          feed.error(httpError(status, message));
          return `Failed the stream with ${status}`;
        }
        case 'end':
          feed.end();
          return 'Ended the stream';
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Second post')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();
  },
});

/** The real `getFeed` polls the mocked database; the panel changes the database. */
export const Server = meta.story({
  beforeEach: async () => {
    await resetDb([{ title: 'First post' }, { title: 'Second post' }]);
    return connectLivePanel('server', async (action, payload) => {
      switch (action) {
        case 'insert': {
          const { title } = payload as { title: string };
          await db.insert(posts).values({ title });
          return `Inserted “${title}”`;
        }
        case 'delete-latest': {
          const [latest] = await db.select().from(posts).orderBy(desc(posts.id)).limit(1);
          if (!latest) return 'No post to delete';
          await db.delete(posts).where(eq(posts.id, latest.id));
          return `Deleted “${latest.title}”`;
        }
        case 'set-count':
          return setCount((payload as { count: number }).count);
        case 'database': {
          const { down } = payload as { down: boolean };
          setDatabaseDown(down);
          return down ? 'The database is down' : 'The database is up (press Reconnect)';
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Second post')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();
  },
});

/** Inserts or deletes posts until there are `target`. */
async function setCount(target: number): Promise<string> {
  const [row] = await db.select({ value: count() }).from(posts);
  const current = row?.value ?? 0;
  if (target > current) {
    const titles = Array.from({ length: target - current }, (_, i) => `Post ${current + i + 1}`);
    await db.insert(posts).values(titles.map((title) => ({ title })));
  } else if (target < current) {
    const extra = await db
      .select({ id: posts.id })
      .from(posts)
      .orderBy(desc(posts.id))
      .limit(current - target);
    for (const { id } of extra) await db.delete(posts).where(eq(posts.id, id));
  }
  return `${current} → ${target} posts`;
}
