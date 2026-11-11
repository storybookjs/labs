// Remote functions for the Node mode tests in `src/node-mode.test.ts`.
import { command, form, getRequestEvent, query } from '$app/server';
import { error, invalid, redirect } from '@sveltejs/kit';

import { batchRuns } from './runs.ts';

/** Reads the event after an `await`: only real `AsyncLocalStorage` keeps it there. */
export const whoAmI = query(async () => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  const { locals, cookies } = getRequestEvent();
  return {
    user: (locals as { user?: string }).user ?? null,
    session: cookies.get('session') ?? null,
  };
});

export const signIn = command('unchecked', async (name: string) => {
  getRequestEvent().cookies.set('session', name, { path: '/' });
});

export const fail = command('unchecked', async (status: number) => {
  error(status, 'Nope');
});

export const save = form('unchecked', async (data: { title?: string }, issue) => {
  if (!data.title) invalid(issue.title('Required'));
  if (data.title === 'go') redirect(303, '/saved');
  return { saved: data.title };
});

export const stats = query.batch('unchecked', async (ids: number[]) => {
  batchRuns.push(ids);
  return (id: number) => id * 10;
});

export const bump = command(async () => {
  await stats(1).refresh();
});
