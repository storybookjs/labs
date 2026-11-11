/**
 * Gives `request` a `body` stream in browsers that have no `Request.prototype.body` (Firefox).
 *
 * SvelteKit's server runtime reads form submissions from `request.body`
 * (`deserialize_binary_form`). In an app that code runs in Node, which has it. Here it runs in
 * the page, so without the stream every form submission fails before it reaches the handler.
 */
export async function ensureBodyStream(request: Request): Promise<void> {
  if ('body' in Request.prototype) return;
  // A copy: the request itself stays unread, for SvelteKit's `request.formData()`.
  const blob = await request.clone().blob();
  // Like `body` in other browsers: `null` without a body, the same stream on each read.
  let stream: ReadableStream<Uint8Array> | null = null;
  Object.defineProperty(request, 'body', {
    configurable: true,
    get: () => (blob.size === 0 ? null : (stream ??= blob.stream())),
  });
}
