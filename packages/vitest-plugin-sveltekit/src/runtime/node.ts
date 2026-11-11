// Vitest in Node (`environment: 'node'`): remote functions are the real server functions, and a
// call outside a request runs inside one built from `mockRequestEvent()`, through SvelteKit's
// `withRequestEvent` (`$app/server`).
import type { RemoteForm } from '$app/server';

import { onMockRequestEventRead, requestEvent, resetRequestEvent } from './request-event.ts';

interface KitCookies {
  getAll(): Array<{ name: string; value: string }>;
}

interface KitRequestEvent {
  cookies: KitCookies;
}

interface WithRequestEventInit {
  locals?: App.Locals;
  cookies?: Record<string, string>;
  params?: Record<string, string>;
  route?: { id: string | null };
  url?: URL;
  platform?: App.Platform;
  signal?: AbortSignal;
}

type WithRequestEvent = <T>(init: WithRequestEventInit, fn: (event: KitRequestEvent) => T) => T;

interface Kit {
  withRequestEvent: WithRequestEvent;
  getRequestEvent: () => unknown;
}

/** A request this module started, and the cookies its handler has written into the jar so far. */
interface TrackedRequest {
  cookies: KitCookies;
  jar: typeof requestEvent.cookies;
  seen: Map<string, string>;
}

let kit: Kit | undefined;
let controller = new AbortController();
const requests = new Set<TrackedRequest>();

onMockRequestEventRead(syncCookies);

/**
 * Wraps an export of a remote file (the plugin's module in front of each remote file calls it). A
 * call outside a request runs inside one; a call inside one (from other server code) is left as it
 * is. Everything else (`fn.__`, `.for()`, ...) is the function itself.
 */
export function wrapRemoteExport<T>(
  value: T,
  withRequestEvent: WithRequestEvent,
  getRequestEvent: () => unknown
): T {
  kit ??= { withRequestEvent, getRequestEvent };
  if (typeof value !== 'function') return value;
  return new Proxy(value, {
    apply(target, thisArg, args) {
      if (insideRequest()) return Reflect.apply(target, thisArg, args);
      return runInRequest(() => Reflect.apply(target, thisArg, args));
    },
  });
}

/**
 * Runs `fn` inside one request built from `mockRequestEvent()`, as the plugin does for each direct
 * call of a remote function in Vitest's Node mode. Use it when calls must share a request, such
 * as the calls of a `query.batch` that should be batched. The cookies the handlers set end up in
 * `mockRequestEvent().cookies`.
 */
export function runInRequest<T>(fn: () => T): T {
  if (!kit) {
    throw new Error(
      '[vitest-plugin-sveltekit] runInRequest() runs in Vitest’s Node mode, after a remote file is imported. In the browser (server mode), each request already runs in the mock request event.'
    );
  }
  const jar = requestEvent.cookies;
  const cookies = Object.fromEntries(jar.getAll().map(({ name, value }) => [name, value]));
  const result = kit.withRequestEvent(
    {
      locals: { ...requestEvent.locals },
      cookies,
      params: { ...requestEvent.params },
      route: { ...requestEvent.route },
      url: requestEvent.url,
      platform: requestEvent.platform,
      // Aborted before the next test, so a `query.live` generator stops with the test.
      signal: controller.signal,
    },
    (event) => {
      requests.add({ cookies: event.cookies, jar, seen: new Map(Object.entries(cookies)) });
      const value = fn();
      // A query does its work when it is awaited, and a `query.batch` looks the request up then.
      // Start it here, inside the request; the query keeps the promise for the test's `await`.
      // A live query stays lazy: iterating it starts its own generator.
      if (isQueryResource(value)) value.then(noop, noop);
      return value;
    }
  );
  if (result instanceof Promise) {
    return result.finally(syncCookies) as T;
  }
  return result;
}

/** What `submitForm()` returns: SvelteKit's output for the submission. */
export interface FormSubmission<Output> {
  /** What the handler returned, when the data was valid and the handler did not call `invalid()`. */
  result?: Output;
  /** The issues from the schema or from `invalid()`, with the field's name and path. */
  issues?: Array<{ name: string; path: Array<string | number>; message: string }>;
}

/**
 * Submits `data` to a `form` (or `form.for(id)`) as SvelteKit's server does for a request: the
 * schema validates it, the handler runs, and `invalid()` becomes issues.
 *
 * ```ts
 * const { issues } = await submitForm(createPost, { title: '' });
 * ```
 */
export function submitForm<Output>(
  form: RemoteForm<any, Output>,
  data: Record<string, unknown>
): Promise<FormSubmission<Output>> {
  const internals = (form as { __?: { type?: string; fn?: Function } }).__;
  if (internals?.type !== 'form' || typeof internals.fn !== 'function') {
    throw new Error('[vitest-plugin-sveltekit] submitForm() expects a `form` from a remote file.');
  }
  const submit = internals.fn;
  return runInRequest(async () => {
    const output = (await submit(data, {}, null)) as FormSubmission<Output> & {
      issues?: Array<{ name: string; path: Array<string | number>; message: string }>;
    };
    return {
      ...(output.issues === undefined ? { result: output.result } : {}),
      ...(output.issues && {
        issues: output.issues.map(({ name, path, message }) => ({ name, path, message })),
      }),
    };
  });
}

/** Before each test: a new mock request event, and the end of the live queries of the last test. */
export function resetNodeRequests(): void {
  controller.abort();
  controller = new AbortController();
  requests.clear();
  resetRequestEvent();
}

function noop(): void {}

function isQueryResource(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof (value as PromiseLike<unknown> | null)?.then === 'function' &&
    (value as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] === 'QueryResource'
  );
}

function insideRequest(): boolean {
  try {
    kit!.getRequestEvent();
    return true;
  } catch {
    return false;
  }
}

/** Copies what the handlers set or deleted, since the last look, into the jar their request used. */
function syncCookies(): void {
  for (const request of requests) {
    const now = new Map(
      request.cookies
        .getAll()
        .filter(({ value }) => value !== '')
        .map(({ name, value }) => [name, value])
    );
    for (const [name, value] of now) {
      if (request.seen.get(name) !== value) request.jar.set(name, value);
    }
    for (const name of request.seen.keys()) {
      if (!now.has(name)) request.jar.delete(name);
    }
    request.seen = now;
  }
}
