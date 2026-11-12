// Remote functions for the server mode probes: each pauses at a named gate (`gate.ts`) that the
// test opens, so a test can hold one request while others run.
import { command, form, getRequestEvent, query, requested } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

import { db } from '#lib/server/db.ts';
import { posts } from '#lib/server/schema.ts';

import { gate } from './gate.ts';

export interface AfterAwait {
  name: string;
  sameRequest: boolean;
  user: App.Locals['user'];
  url?: string;
  urlError?: string;
  cookieSet?: boolean;
  cookieError?: string;
}

/** A command that pauses at `gate(name)`, then does what real commands do after an `await`. */
export const probeCommand = command(v.string(), async (name): Promise<AfterAwait> => {
  const before = getRequestEvent();
  await gate(name);
  const after = getRequestEvent();
  const result: AfterAwait = {
    name,
    sameRequest: before.request === after.request,
    user: after.locals.user,
  };
  try {
    result.url = after.url.pathname;
  } catch (e) {
    result.urlError = (e as Error).message;
  }
  try {
    after.cookies.set('seen-by', name, { path: '/' });
    result.cookieSet = true;
  } catch (e) {
    result.cookieError = (e as Error).message;
  }
  return result;
});

export const getTitles = query(async () => (await db.select().from(posts)).map((p) => p.title));

/** Like the example's `deletePost`: a mutation that refreshes the requested query after awaits. */
export const addTitle = command(v.string(), async (title) => {
  await gate(title);
  await db.insert(posts).values({ title });
  await requested(getTitles, 5).refreshAll();
});

/** A query that pauses at `gate('slow')`, like a slow database read. */
export const slowTitles = query(async () => {
  await gate('slow');
  return (await db.select().from(posts)).map((p) => p.title);
});

/** A login command: sets the session cookie after an await, as a real one does after a lookup. */
export const signIn = command(v.string(), async (name) => {
  await gate('signIn');
  getRequestEvent().cookies.set('session', name, { path: '/' });
});

export const whoAmI = query(() => {
  const { locals, cookies } = getRequestEvent();
  return { user: locals.user ?? null, session: cookies.get('session') ?? null };
});

/** A live query driven by the test: yields `n` each time `open('tick')` is called. */
export const ticker = query.live(async function* () {
  const { request, locals } = getRequestEvent();
  let n = 0;
  yield { n, user: locals.user?.name ?? null };
  while (!request.signal.aborted) {
    await gate('tick');
    if (request.signal.aborted) break;
    yield { n: ++n, user: locals.user?.name ?? null };
  }
});

/** A live query that fails after its first value, when the test opens `fault`. */
export const faulty = query.live(async function* () {
  yield 'ok';
  await gate('fault');
  throw new Error('feed broke');
});

export const throwsSync = query(() => {
  throw new Error('sync boom');
});
export const rejects = query(async () => {
  await Promise.resolve();
  throw new Error('async boom');
});
export const notFound = query(() => error(404, 'nope'));

export const login = form(
  v.object({ name: v.pipe(v.string(), v.nonEmpty()) }),
  async ({ name }) => {
    await gate('login');
    const event = getRequestEvent();
    // `handle` ran before the form handler: it filled `locals.user` from the session cookie.
    const before = event.locals.user?.name ?? null;
    event.cookies.set('session', name, { path: '/' });
    return { name, before };
  }
);
