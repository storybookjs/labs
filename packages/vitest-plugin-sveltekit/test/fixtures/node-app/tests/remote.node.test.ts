import { getRequestEvent } from '$app/server';
import { expect, test } from 'vitest';

import { mockRequestEvent, runInRequest, submitForm } from '../../../../dist/server.mock.mjs';
import { bump, fail, save, signIn, stats, whoAmI } from '../src/lib/probe.remote.ts';
import { batchRuns } from '../src/lib/runs.ts';

test('remote modules are the real server functions, with SvelteKit’s init', () => {
  expect((whoAmI as unknown as { __: object }).__).toMatchObject({
    type: 'query',
    name: 'whoAmI',
    id: expect.stringMatching(/\/whoAmI$/),
  });
});

test('a direct call runs in the mock request event, and getRequestEvent() survives await', async () => {
  mockRequestEvent({ locals: { user: 'svelty' } as App.Locals });
  expect(await whoAmI()).toEqual({ user: 'svelty', session: null });
  // Only the call runs in a request.
  expect(() => getRequestEvent()).toThrow(/current request event/);
});

test('cookies a handler sets show in mockRequestEvent().cookies, and go with the next call', async () => {
  await signIn('svelty');
  expect(mockRequestEvent().cookies.get('session')).toBe('svelty');
  expect(await whoAmI()).toMatchObject({ session: 'svelty' });
});

test('the next test starts with a fresh mock request event', async () => {
  expect(mockRequestEvent().cookies.getAll()).toEqual([]);
  expect(await whoAmI()).toEqual({ user: null, session: null });
});

test('error() comes out as SvelteKit’s HttpError', async () => {
  await expect(fail(418)).rejects.toMatchObject({ status: 418, body: { message: 'Nope' } });
});

test('invalid() becomes issues, redirect() comes out as SvelteKit’s Redirect', async () => {
  expect(await submitForm(save, {})).toEqual({
    issues: [{ name: 'title', path: ['title'], message: 'Required' }],
  });
  expect(await submitForm(save, { title: 'x' })).toEqual({ result: { saved: 'x' } });
  await expect(submitForm(save, { title: 'go' })).rejects.toMatchObject({
    status: 303,
    location: '/saved',
  });
});

test('calls in one runInRequest() share a query.batch run', async () => {
  batchRuns.length = 0;
  expect(await runInRequest(() => Promise.all([stats(1), stats(2)]))).toEqual([10, 20]);
  expect(batchRuns).toEqual([[1, 2]]);
});

// SvelteKit PR B: `withRequestEvent` runs the deferred refreshes after the request store has ended,
// and a `query.batch` needs it. Passes once PR B runs them inside the store.
test.fails('a command that refreshes a query.batch', async () => {
  await expect(bump()).resolves.toBeUndefined();
});
