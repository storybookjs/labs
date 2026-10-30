// Shared by the probe remote functions and the tests that drive them: in server mode both run in
// one page, so a test can hold a handler at a named gate and release it when it wants. That gives
// exact overlap orderings (`overlap.server.test.ts`, `Server/Overlap` stories).
const gates = new Map<string, { promise: Promise<void>; resolve: () => void }>();
/** Gates opened before anyone waited at them: the next `gate(name)` passes at once. */
const opened = new Set<string>();

function entry(name: string) {
  let gate = gates.get(name);
  if (!gate) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    gate = { promise, resolve };
    gates.set(name, gate);
  }
  return gate;
}

/** Waits until `open(name)` is called. */
export function gate(name: string): Promise<void> {
  if (opened.delete(name)) return Promise.resolve();
  return entry(name).promise;
}

/** Releases everyone waiting at `name`; the next `gate(name)` waits again. */
export function open(name: string): void {
  const gate = gates.get(name);
  if (!gate) {
    opened.add(name);
    return;
  }
  gates.delete(name);
  gate.resolve();
}

export function resetGates(): void {
  for (const gate of gates.values()) gate.resolve();
  gates.clear();
  opened.clear();
}
