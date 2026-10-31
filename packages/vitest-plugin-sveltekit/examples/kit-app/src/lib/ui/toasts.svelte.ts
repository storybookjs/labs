export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds before the toast goes away; `0` keeps it until it is dismissed. */
  timeout?: number;
}

interface Timer {
  handle?: ReturnType<typeof setTimeout>;
  remaining: number;
  startedAt: number;
}

export const toasts: ToastMessage[] = $state([]);

const timers = new Map<number, Timer>();
let nextId = 1;
let paused = false;

function startTimer(id: number, timer: Timer) {
  timer.startedAt = Date.now();
  timer.handle = setTimeout(() => dismissToast(id), timer.remaining);
}

export function toast(message: string, { tone = 'info', timeout = 5000 }: ToastOptions = {}) {
  const id = nextId++;
  // On the server this module is shared by every request, so a toast there would leak.
  if (typeof window === 'undefined') return id;

  toasts.push({ id, message, tone });
  if (timeout > 0) {
    const timer: Timer = { remaining: timeout, startedAt: 0 };
    timers.set(id, timer);
    if (!paused) startTimer(id, timer);
  }
  return id;
}

export function dismissToast(id: number) {
  clearTimeout(timers.get(id)?.handle);
  timers.delete(id);
  const index = toasts.findIndex((item) => item.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

export function clearToasts() {
  for (const timer of timers.values()) clearTimeout(timer.handle);
  timers.clear();
  toasts.length = 0;
}

/** Stops the timeouts while the reader hovers or focuses the toasts (WCAG 2.2.1). */
export function pauseToasts() {
  if (paused) return;
  paused = true;
  for (const timer of timers.values()) {
    if (timer.handle === undefined) continue;
    clearTimeout(timer.handle);
    timer.handle = undefined;
    timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
  }
}

export function resumeToasts() {
  if (!paused) return;
  paused = false;
  for (const [id, timer] of timers) startTimer(id, timer);
}
