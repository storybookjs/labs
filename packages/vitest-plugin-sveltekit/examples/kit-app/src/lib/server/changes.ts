// The live queries follow the posts here instead of polling: a trigger in `schema.ts` sends a
// Postgres `NOTIFY posts_changed` after every write to `posts` (commands, forms, the seed, and
// the Live panel's changes in `Live/Server`).
import { db } from '#lib/server/db.ts';
import { POSTS_CHANGED } from '#lib/server/schema.ts';

let open = 0;

/**
 * Yields once at the start, then after every change to the posts, until `signal` aborts (the
 * `query.live` stream closed). Changes that come while the caller reads count once.
 */
export async function* postsChanges(signal: AbortSignal): AsyncGenerator<void> {
  let changed = true;
  let wake: (() => void) | undefined;
  const unlisten = await db.$client.listen(POSTS_CHANGED, () => {
    changed = true;
    wake?.();
  });
  const stop = () => wake?.();
  signal.addEventListener('abort', stop);
  open++;
  try {
    while (!signal.aborted) {
      if (!changed) await new Promise<void>((resolve) => (wake = resolve));
      wake = undefined;
      if (signal.aborted) return;
      changed = false;
      yield;
    }
  } finally {
    open--;
    signal.removeEventListener('abort', stop);
    await unlisten();
  }
}

/** How many live queries wait for changes, to check that none outlives its stream. */
export function openSubscriptions(): number {
  return open;
}
