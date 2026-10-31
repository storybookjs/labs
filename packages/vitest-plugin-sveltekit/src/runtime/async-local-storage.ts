/**
 * Stands in for `node:async_hooks` in the browser. Browsers have no async context, so `run()`
 * keeps its store after the callback returns ("sticky"). SvelteKit's `getRequestEvent()` then
 * works after an `await` too, as long as only one request runs at a time.
 */
export class AsyncLocalStorage<T> {
  #store: T | undefined;

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
