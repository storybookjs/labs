import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { ensureBodyStream } from './request-body.ts';

const nativeBody = Object.getOwnPropertyDescriptor(Request.prototype, 'body')!;

function post(body?: BodyInit) {
  return new Request('http://localhost/_app/remote/h1/createPost', { method: 'POST', body });
}

describe('in a browser with Request.prototype.body', () => {
  it('leaves the request as it is', async () => {
    const request = post('title=First');
    await ensureBodyStream(request);
    expect(Object.getOwnPropertyDescriptor(request, 'body')).toBeUndefined();
  });
});

describe('in a browser without Request.prototype.body (Firefox)', () => {
  beforeEach(() => {
    delete (Request.prototype as { body?: unknown }).body;
  });
  afterEach(() => {
    Object.defineProperty(Request.prototype, 'body', nativeBody);
  });

  it('gives the request a stream of its body', async () => {
    const request = post(new Blob(['binary form']));
    await ensureBodyStream(request);
    expect(await new Response(request.body).text()).toBe('binary form');
  });

  it('returns the same stream on each read', async () => {
    const request = post('title=First');
    await ensureBodyStream(request);
    expect(request.body).toBe(request.body);
  });

  it('keeps the request readable for formData()', async () => {
    const form = new FormData();
    form.set('title', 'First');
    const request = post(form);
    await ensureBodyStream(request);
    expect((await request.formData()).get('title')).toBe('First');
  });

  it('gives null for a request without a body', async () => {
    const request = post();
    await ensureBodyStream(request);
    expect(request.body).toBeNull();
  });
});
