import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

import { refreshPosts } from '#lib/refresh-posts.ts';
import { checkPassword } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';

export const signIn = command(
  v.object({ name: v.string(), password: v.string() }),
  async ({ name, password }) => {
    // Before the first `await`: the request store is only this request's until then.
    const { cookies } = getRequestEvent();
    if (!(await checkPassword(name, password))) error(401, 'Wrong name or password');
    cookies.set('session', name, { path: '/' });
  }
);

export const clearPosts = command(v.string(), async (password) => {
  const { locals } = getRequestEvent();
  if (!locals.user) error(403, 'Sign in to clear posts');
  if (!(await checkPassword(locals.user.name, password))) error(401, 'Wrong password');

  await db.delete(posts);
  // Through a helper in another file: the refresh still goes back in this response.
  await refreshPosts();
});
