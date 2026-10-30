import { command, form, getRequestEvent, prerender, query } from '$app/server';
import { error, invalid } from '@sveltejs/kit';
import * as v from 'valibot';

import * as db from '#lib/server/db';

export const getPosts = query(v.optional(v.picklist(['newest', 'oldest']), 'newest'), (order) =>
  db.listPosts(order)
);

export const createPost = form(
  v.object({
    title: v.pipe(v.string(), v.nonEmpty('Title is required')),
    body: v.optional(v.string(), ''),
  }),
  async ({ title, body }, issue) => {
    if (title.trim().length < 3) invalid(issue.title('Title must be at least 3 characters'));
    return db.createPost(title, body);
  }
);

export const deletePost = command(v.number(), async (id) => {
  db.deletePost(id);
  await getPosts().refresh();
});

export const getPost = prerender(
  v.number(),
  (id) => db.getPost(id) ?? error(404, `Post ${id} not found`),
  { inputs: () => db.listPosts('oldest').map((post) => post.id), dynamic: true }
);

export const getStats = query.batch(v.number(), (ids) => {
  const stats = db.statsFor(ids);
  return (id) => stats.get(id) ?? { views: 0, likes: 0 };
});

export const getPostCount = query.live(async function* () {
  const { signal } = getRequestEvent().request;
  while (!signal.aborted) {
    yield db.countPosts();
    await db.nextChange(signal);
  }
});
