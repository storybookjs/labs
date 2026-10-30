/**
 * Stands in for `node:async_hooks` in the browser. Browsers have no async context, so `run()`
 * keeps its store after the callback returns ("sticky"). SvelteKit's `getRequestEvent()` then
 * works after an `await` too, as long as only one request runs at a time.
 *
 * `pinRequest` keeps one request's store in place while that request runs: the store of another
 * request (a `query.live` stream pulling its next value, a mocked function answering) is only in
 * place for the synchronous part of its callback, so the pinned request finds its own store after
 * an `await`.
 */
const instances = new Set<AsyncLocalStorage<unknown>>();

/** The request (its `state.remote`, one object per request in SvelteKit) whose store stays. */
let pinned: unknown;

export function pinRequest(request: unknown): void {
  pinned = request;
}

export function unpinRequest(request: unknown): void {
  if (pinned === request) pinned = undefined;
}

/** Clears every store, so a story or test does not see the previous one's request. */
export function resetAsyncLocalStorage(): void {
  pinned = undefined;
  for (const instance of instances) instance.disable();
}

/** SvelteKit's store is `{ event, state }`; derived stores spread `state` and keep `remote`. */
function requestOf(store: unknown): unknown {
  return (store as { state?: { remote?: unknown } } | null | undefined)?.state?.remote;
}

export class AsyncLocalStorage<T> {
  #store: T | undefined;

  constructor() {
    instances.add(this as AsyncLocalStorage<unknown>);
  }

  getStore(): T | undefined {
    return this.#store;
  }

  run<R, A extends unknown[]>(store: T, callback: (...args: A) => R, ...args: A): R {
    if (pinned === undefined || requestOf(store) === pinned) {
      this.#store = store;
      return callback(...args);
    }

    const previous = this.#store;
    this.#store = store;
    try {
      return callback(...args);
    } finally {
      this.#store = previous;
    }
  }

  enterWith(store: T): void {
    this.#store = store;
  }

  exit<R, A extends unknown[]>(callback: (...args: A) => R, ...args: A): R {
    return callback(...args);
  }

  disable(): void {
    this.#store = undefined;
  }
}
