import { expect, it } from 'vite-plus/test';

import { requestEvent, resetRequestEvent } from './server.mock.ts';

it('resets the request event', () => {
  const cookies = requestEvent.cookies;
  requestEvent.locals = { user: 'ada' } as unknown as App.Locals;
  requestEvent.cookies.set('session', 'abc');
  requestEvent.params = { id: '1' };
  requestEvent.url = new URL('http://localhost/posts');

  expect(requestEvent.cookies.getAll()).toEqual([{ name: 'session', value: 'abc' }]);

  resetRequestEvent();

  expect(requestEvent).toMatchObject({ locals: {}, params: {}, url: undefined });
  expect(requestEvent.cookies.getAll()).toEqual([]);
  expect(cookies.get('session')).toBe('abc');
});
