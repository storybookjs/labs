import { expect, test, vi } from 'vitest';

import { sleep } from './sleep.ts';

/** Watches the listeners on `signal`: how many were added, and how many are still there. */
function watchListeners(signal: AbortSignal) {
  const added = vi.spyOn(signal, 'addEventListener');
  const removed = vi.spyOn(signal, 'removeEventListener');
  return {
    added: () => added.mock.calls.length,
    remaining: () => added.mock.calls.length - removed.mock.calls.length,
  };
}

test('sleeps that run to the end leave no listener behind', async () => {
  const { signal } = new AbortController();
  const listeners = watchListeners(signal);
  for (let i = 0; i < 25; i++) await sleep(1, signal);
  expect(listeners.added()).toBe(25);
  expect(listeners.remaining()).toBe(0);
});

test('an abort ends the sleep early and removes the listener', async () => {
  const controller = new AbortController();
  const listeners = watchListeners(controller.signal);
  const start = performance.now();
  const sleeping = sleep(60_000, controller.signal);
  controller.abort();
  await sleeping;
  expect(performance.now() - start).toBeLessThan(1000);
  expect(listeners.remaining()).toBe(0);
});

test('an already aborted signal returns at once, without a listener', async () => {
  const controller = new AbortController();
  controller.abort();
  const listeners = watchListeners(controller.signal);
  await sleep(60_000, controller.signal);
  expect(listeners.added()).toBe(0);
});
