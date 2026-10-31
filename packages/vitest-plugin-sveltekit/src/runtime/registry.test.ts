import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  getRemoteEntries,
  getRemoteEntry,
  hasRemoteModule,
  onRegister,
  registerRemoteFunction,
  resetGeneration,
  resetRemoteFunctions,
  setSpyFactory,
} from './registry.ts';

setSpyFactory(() => vi.fn<(...args: unknown[]) => unknown>());

const getPosts = () => {};
const createPost = {};
const getCount = () => {};

registerRemoteFunction(getPosts, 'h1/getPosts', 'query');
registerRemoteFunction(createPost, 'h1/createPost', 'form');
registerRemoteFunction(getCount, 'h2/getCount', 'query_live');

beforeEach(() => {
  resetRemoteFunctions();
});

/** Kit's `HttpError` is not an `Error`; its message is in `body`. */
function thrownBody(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return (error as { body?: unknown }).body;
  }
  throw new Error('Expected a throw');
}

async function collect<T>(iterable: AsyncIterable<T>, count: number): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
    if (values.length === count) break;
  }
  return values;
}

describe('registry', () => {
  it('maps a client function to its id, kind and spy', () => {
    const entry = getRemoteEntry(getPosts);
    expect(entry).toMatchObject({ id: 'h1/getPosts', hash: 'h1', name: 'getPosts', kind: 'query' });
    expect(entry.spy.getMockName()).toBe('getPosts');
    expect(getRemoteEntries('h1').map((e) => e.name)).toEqual(['getPosts', 'createPost']);
    expect(hasRemoteModule('h2')).toBe(true);
    expect(hasRemoteModule('nope')).toBe(false);
  });

  it('explains what remote() expects', () => {
    expect(() => getRemoteEntry(() => {})).toThrow(/remote\(\) expects a remote function/);
    expect(() => getRemoteEntry(undefined)).toThrow(/remote\(\) expects a remote function/);
  });

  it('keeps the spy when a module registers again (HMR)', () => {
    const before = getRemoteEntry(getPosts).spy;
    const updated = () => {};
    const hashes: string[] = [];
    onRegister((hash) => hashes.push(hash));

    registerRemoteFunction(updated, 'h1/getPosts', 'query');

    expect(getRemoteEntry(updated).spy).toBe(before);
    expect(hashes).toEqual(['h1']);
  });

  it('fails unmocked queries with a hint, and resolves unmocked forms', () => {
    expect(thrownBody(() => getRemoteEntry(getPosts).spy('x'))).toEqual({
      status: 500,
      message:
        '`getPosts` has no mock. Call `remote(getPosts).mockResolvedValue(...)` in `beforeEach`.',
    });
    expect(getRemoteEntry(createPost).spy({})).toBeUndefined();
  });

  it('resets mocks and calls to the defaults', () => {
    const { spy } = getRemoteEntry(getPosts);
    spy.mockReturnValue([]);
    spy('x');
    resetRemoteFunctions();

    expect(spy.mock.calls).toEqual([]);
    expect(thrownBody(() => spy('x'))).toMatchObject({ message: expect.stringMatching(/no mock/) });
  });

  it('counts resets, so a request can tell that its story or test ended', () => {
    const before = resetGeneration();
    resetRemoteFunctions();
    expect(resetGeneration()).toBe(before + 1);
  });

  it('mockPending never settles', async () => {
    const { spy } = getRemoteEntry(getPosts);
    expect(spy.mockPending()).toBe(spy);
    const result = spy('x') as Promise<unknown>;
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 20));
    const winner = await Promise.race([result, timeout]);
    expect(winner).toBe('timeout');
  });

  it('mockStream is only for live queries', () => {
    expect(() => getRemoteEntry(getPosts).spy.mockStream(1)).toThrow(
      /mockStream\(\) only works for `query.live` functions, and `getPosts` is a query/
    );
  });

  it('mockStream starts each connection with the latest value', async () => {
    const { spy } = getRemoteEntry(getCount);
    const feed = spy.mockStream(1);

    const first = spy() as AsyncGenerator<number>;
    const firstValues = collect(first, 3);
    await Promise.resolve();
    feed.emit(2);
    feed.emit(3);
    expect(await firstValues).toEqual([1, 2, 3]);

    // A reconnect gets the latest value first.
    expect(await collect(spy() as AsyncGenerator<number>, 1)).toEqual([3]);
  });

  it('mockStream ends and fails every connection', async () => {
    const { spy } = getRemoteEntry(getCount);
    const feed = spy.mockStream<number>();

    const ended = collect(spy() as AsyncGenerator<number>, 10);
    await Promise.resolve();
    feed.emit(1);
    feed.end();
    expect(await ended).toEqual([1]);

    const failing = spy.mockStream<number>(0);
    const failed = collect(spy() as AsyncGenerator<number>, 10);
    await Promise.resolve();
    failing.error(new Error('Feed down'));
    await expect(failed).rejects.toThrow('Feed down');
  });
});
