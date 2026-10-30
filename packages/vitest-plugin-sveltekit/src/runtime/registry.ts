import { error } from '@sveltejs/kit';
import type { fn } from 'storybook/test';

import type { RemoteKind } from '../node/analyze.ts';

type Handler = (...args: any[]) => any;
type Spy = ReturnType<typeof fn<Handler>>;

/** Controls for a mocked `query.live` stream, returned by `mockStream()`. */
export interface RemoteStream<T> {
  /** Sends a value to every open connection. */
  emit(value: T): void;
  /** Fails every open connection with `error`. Later connections fail too. */
  error(error: unknown): void;
  /** Completes every open connection. Later connections complete after the last value. */
  end(): void;
}

export type RemoteSpy = Spy & {
  mockPending(): RemoteSpy;
  mockStream<T>(initial?: T): RemoteStream<T>;
};

export interface RemoteEntry {
  /** `<file hash>/<export name>`, as in SvelteKit. */
  id: string;
  hash: string;
  name: string;
  kind: RemoteKind;
  /** Created on first use, with the host's spy factory. */
  readonly spy: RemoteSpy;
}

/**
 * Makes an empty spy. Each host sets its own: Storybook `fn()` from `storybook/test` (calls show in
 * the Actions panel), Vitest `vi.fn()`. Importing `storybook/test` in Vitest would load a second
 * `expect` and break `expect.requireAssertions`.
 */
let spyFactory: (() => unknown) | undefined;

/** `factory` returns a Vitest-style mock function (`fn()`, `vi.fn()`); the types differ per host. */
export function setSpyFactory(factory: () => unknown): void {
  spyFactory = factory;
}

const entries = new Map<string, RemoteEntry>();
const byClient = new WeakMap<object, RemoteEntry>();
const listeners = new Set<(hash: string) => void>();

/**
 * Called by the client stub of each remote file, once per export. Re-registration (after HMR)
 * keeps the spy, so mocks that a story or test set up stay in place.
 */
export function registerRemoteFunction(client: object, id: string, kind: RemoteKind): void {
  let entry = entries.get(id);

  if (entry) {
    entry.kind = kind;
  } else {
    const slash = id.indexOf('/');
    const name = id.slice(slash + 1);
    let spy: RemoteSpy | undefined;
    entry = {
      id,
      hash: id.slice(0, slash),
      name,
      kind,
      get spy() {
        return (spy ??= createSpy(this.name, this.kind));
      },
    };
    entries.set(id, entry);
  }

  byClient.set(client, entry);
  for (const listener of listeners) listener(entry.hash);
}

/** Returns the registry entry behind a remote function, as imported from a `.remote.ts` file. */
export function getRemoteEntry(client: unknown): RemoteEntry {
  const entry =
    (typeof client === 'function' || (typeof client === 'object' && client !== null)) &&
    byClient.get(client);

  if (!entry) {
    throw new Error(
      '[vitest-plugin-sveltekit] remote() expects a remote function imported from a `.remote.ts` or `.remote.js` file. Check that `vitestPluginSvelteKit()` is in the Vite config and that the value comes straight from the remote file (not from `.for(id)`).'
    );
  }

  return entry;
}

export function getRemoteEntries(hash: string): RemoteEntry[] {
  return [...entries.values()].filter((entry) => entry.hash === hash);
}

export function registeredHashes(): Set<string> {
  return new Set(Array.from(entries.values(), (entry) => entry.hash));
}

export function hasRemoteModule(hash: string): boolean {
  for (const entry of entries.values()) if (entry.hash === hash) return true;
  return false;
}

/** Calls `listener` with the file hash whenever a remote file registers its exports. */
export function onRegister(listener: (hash: string) => void): void {
  listeners.add(listener);
}

/** Resets every spy to its default: unmocked queries fail, unmocked forms and commands resolve. */
let generation = 0;

/**
 * Counts the resets. A request reads it when it starts: another value later means that the story
 * or test that sent the request is over, and the spies now belong to the next one.
 */
export function resetGeneration(): number {
  return generation;
}

export function resetRemoteFunctions(): void {
  generation++;
  for (const entry of entries.values()) {
    entry.spy.mockReset();
    applyDefaults(entry.spy, entry.name, entry.kind);
  }
}

function createSpy(name: string, kind: RemoteKind): RemoteSpy {
  if (!spyFactory) {
    throw new Error(
      '[vitest-plugin-sveltekit] remote functions have no spies yet. Add `@storybookjs/vitest-plugin-sveltekit/vitest` to `test.setupFiles` (Vitest), or the preview annotations from `@storybookjs/vitest-plugin-sveltekit/storybook` (Storybook).'
    );
  }
  const spy = spyFactory() as RemoteSpy;

  spy.mockPending = () => {
    const never = () => new Promise<never>(() => {});
    spy.mockImplementation(
      kind === 'query_live'
        ? async function* () {
            yield await never();
          }
        : never
    );
    return spy;
  };

  spy.mockStream = <T>(...args: [initial?: T]) => {
    if (kind !== 'query_live') {
      throw new Error(
        `[vitest-plugin-sveltekit] mockStream() only works for \`query.live\` functions, and \`${name}\` is a ${kind.replace('_', '.')}.`
      );
    }
    const stream = createStream<T>(args);
    spy.mockImplementation(stream.connect);
    return stream.controls;
  };

  applyDefaults(spy, name, kind);
  return spy;
}

function applyDefaults(spy: RemoteSpy, name: string, kind: RemoteKind): void {
  spy.mockName(name);

  switch (kind) {
    case 'query':
    case 'query_batch':
    case 'query_live':
    case 'prerender':
      spy.mockImplementation(() => {
        error(
          500,
          `\`${name}\` has no mock. Call \`remote(${name}).mockResolvedValue(...)\` in \`beforeEach\`.`
        );
      });
      break;
    case 'form':
    case 'command':
      spy.mockImplementation(() => undefined);
      break;
    default: {
      const unknownKind: never = kind;
      throw new Error(`Unknown remote function kind: ${String(unknownKind)}`);
    }
  }
}

type StreamEvent<T> =
  | { type: 'value'; value: T }
  | { type: 'error'; error: unknown }
  | { type: 'end' };

/**
 * A push-based stream for `mockStream()`. Each connection (each call of the spy) is an async
 * generator that reads from its own queue. New connections start with the latest value.
 */
function createStream<T>(initialValue: [value?: T]) {
  const connections = new Set<(event: StreamEvent<T>) => void>();
  let latest: { value: T } | undefined =
    initialValue.length > 0 ? { value: initialValue[0] as T } : undefined;
  let final: StreamEvent<T> | undefined;

  const broadcast = (event: StreamEvent<T>) => {
    for (const push of connections) push(event);
  };

  async function* connect(): AsyncGenerator<T> {
    const queue: StreamEvent<T>[] = [];
    let wake: (() => void) | undefined;
    const push = (event: StreamEvent<T>) => {
      queue.push(event);
      wake?.();
    };

    connections.add(push);
    if (latest) queue.push({ type: 'value', value: latest.value });
    if (final) queue.push(final);

    try {
      while (true) {
        if (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve));
        wake = undefined;
        const event = queue.shift()!;
        if (event.type === 'end') return;
        if (event.type === 'error') throw event.error;
        yield event.value;
      }
    } finally {
      connections.delete(push);
    }
  }

  const controls: RemoteStream<T> = {
    emit(value) {
      latest = { value };
      broadcast({ type: 'value', value });
    },
    error(error) {
      final = { type: 'error', error };
      broadcast(final);
    },
    end() {
      final = { type: 'end' };
      broadcast(final);
    },
  };

  return { connect, controls };
}
