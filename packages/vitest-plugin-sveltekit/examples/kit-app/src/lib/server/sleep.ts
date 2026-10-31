/**
 * Waits `ms`, or less when `signal` aborts (a closed `query.live` stream). Leaves no listener on the
 * signal either way: a live generator sleeps between polls for as long as the stream is open.
 */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done);
  });
}
