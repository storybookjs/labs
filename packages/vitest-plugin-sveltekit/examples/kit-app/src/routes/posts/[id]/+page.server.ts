import { error } from '@sveltejs/kit';

import { readPost } from '#lib/blog/blog.remote.ts';

// Loads the post on the server first, so a missing post is a real 404 (status and error page).
export async function load({ params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) error(404, 'This post does not exist, or it was deleted.');
  await readPost(id);
  return { id };
}
