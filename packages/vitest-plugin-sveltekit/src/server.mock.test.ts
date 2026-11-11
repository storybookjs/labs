import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { requestEvent, resetRequestEvent } from './runtime/request-event.ts';
import { mockRequestEvent } from './server.mock.ts';

const locals = (value: object) => value as unknown as App.Locals;

beforeEach(() => resetRequestEvent());

describe('mockRequestEvent', () => {
  it('returns the live event, the one the runtime reads for each request', () => {
    expect(mockRequestEvent()).toBe(requestEvent);
    expect(mockRequestEvent({ params: { id: '1' } })).toBe(requestEvent);
  });

  it('replaces `locals`, without a merge', () => {
    mockRequestEvent({ locals: locals({ user: 'svelty', theme: 'dark' }) });
    mockRequestEvent({ locals: locals({ user: null }) });

    expect(requestEvent.locals).toEqual({ user: null });
  });

  it('replaces the contents of the cookie jar, and keeps the jar', () => {
    const jar = mockRequestEvent().cookies;
    jar.set('theme', 'dark');

    const event = mockRequestEvent({ cookies: { session: 'svelty', lang: 'en' } });

    expect(event.cookies).toBe(jar);
    expect(event.cookies.getAll()).toEqual([
      { name: 'session', value: 'svelty' },
      { name: 'lang', value: 'en' },
    ]);
    expect(event.cookies.get('theme')).toBeUndefined();
  });

  it('leaves the fields out of `partial` as they are', () => {
    const url = new URL('http://localhost/posts/1');
    mockRequestEvent({
      locals: locals({ user: 'svelty' }),
      cookies: { session: 'abc' },
      params: { id: '1' },
      route: { id: '/posts/[id]' },
      url,
    });

    mockRequestEvent({ params: { id: '2' } });

    expect(requestEvent).toMatchObject({
      locals: { user: 'svelty' },
      params: { id: '2' },
      route: { id: '/posts/[id]' },
      url,
      platform: undefined,
    });
    expect(requestEvent.cookies.get('session')).toBe('abc');
  });

  it('restores a default for a field passed as `undefined`', () => {
    mockRequestEvent({ url: new URL('http://localhost/a'), locals: locals({ user: 'svelty' }) });
    mockRequestEvent({ url: undefined, locals: undefined });

    expect(requestEvent.url).toBeUndefined();
    expect(requestEvent.locals).toEqual({});
  });

  it('is reset before each story and test, with a new jar', () => {
    const event = mockRequestEvent({
      locals: locals({ user: 'svelty' }),
      cookies: { session: 'a' },
    });
    const jar = event.cookies;

    resetRequestEvent();

    expect(mockRequestEvent()).toBe(event);
    expect(event).toMatchObject({ locals: {}, params: {}, route: { id: null }, url: undefined });
    expect(event.cookies.getAll()).toEqual([]);
    // A request still in flight from the previous story writes into the old jar.
    expect(jar.get('session')).toBe('a');
  });
});
