/**
 * Stands in for `node:async_hooks` in the browser. Browsers have no async context, so `run()`
 * keeps its store after the callback returns ("sticky"). SvelteKit's `getRequestEvent()` then
 * works after an `await` too, as long as only one request runs at a time.
 */
const instances = new Set<AsyncLocalStorage<unknown>>();

/** Clears every store, so a story or test does not see the previous one's request. */
export function resetAsyncLocalStorage(): void {
  for (const instance of instances) instance.disable();
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
    this.#store = store;
    return callback(...args);
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
