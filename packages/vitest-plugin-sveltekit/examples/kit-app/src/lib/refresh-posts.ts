import { getPosts } from '#lib/posts.remote.ts';

/** Refreshes the post list, for the remote functions in other files that change posts. */
export function refreshPosts(): Promise<void> {
  return getPosts('newest').refresh();
}
