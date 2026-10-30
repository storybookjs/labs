import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { errors } from '#lib/server/error-log.ts';
import { resetDb } from '#lib/server/mocked-db.ts';

import { open, resetGates } from '#lib/probes/gate.ts';
import { faulty, notFound, rejects, throwsSync } from '#lib/probes/probes.remote.ts';
import LoginForm from '#lib/probes/LoginForm.svelte';

beforeEach(async () => {
  errors.length = 0;
  await resetDb([{ title: 'seed' }]);
});
afterEach(() => resetGates());

test('F1: handleError sees a sync throw, a rejection and error() from queries, and a live failure', async () => {
  await expect(throwsSync()).rejects.toMatchObject({ body: { message: 'Internal Error' } });
  await expect(rejects()).rejects.toMatchObject({ body: { message: 'Internal Error' } });
  await expect(notFound()).rejects.toMatchObject({ status: 404, body: { message: 'nope' } });
  const live = faulty();
  await expect.poll(() => live.current).toBe('ok');
  open('fault');
  await expect.poll(() => live.error?.message).toBe('Internal Error');
  expect(errors).toEqual([
    'handleError unknown: sync boom',
    'handleError unknown: async boom',
    'handleError app: nope',
    'handleError unknown: feed broke',
  ]);
});

test('F2: handle wraps a form post, and the cookie the form sets reaches the jar', async () => {
  requestEvent.cookies.set('session', 'old');
  open('login');
  const screen = await render(LoginForm);
  await screen.getByLabelText('Name').fill('ada');
  await screen.getByRole('button', { name: 'Sign in' }).click();
  await expect.element(screen.getByRole('status')).toHaveTextContent('signed in as ada, was old');
  expect(requestEvent.cookies.get('session')).toBe('ada');
});
