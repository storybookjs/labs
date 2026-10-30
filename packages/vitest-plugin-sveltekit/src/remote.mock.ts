/// <reference types="@sveltejs/kit" />
import type {
  RemoteCommand,
  RemoteForm,
  RemoteFormInput,
  RemoteFormInvalidField,
  RemoteLiveQuery,
  RemoteQuery,
  RemoteResource,
} from '$app/server';
import { error } from '@sveltejs/kit';
import type { fn } from 'storybook/test';

import { getRemoteEntry, type RemoteStream } from './runtime/registry.ts';

export type { RemoteStream };

type MaybePromise<T> = T | Promise<T>;
type Mock<T extends (...args: any[]) => any> = ReturnType<typeof fn<T>>;

/** The argument a remote function is called with, `undefined` when it takes none. */
type Arg<F> = F extends (arg: infer A) => any ? OrUndefined<Exclude<A, void>> : never;
type OrUndefined<T> = [T] extends [never] ? undefined : T;

export type QueryHandler<Input, Output> = (arg: Input) => MaybePromise<Output>;
export type LiveQueryHandler<Input, Output> = (
  arg: Input
) => MaybePromise<AsyncIterable<Output> | Iterable<Output>>;
export type FormHandler<Input, Output> = (
  data: Input,
  issue: RemoteFormInvalidField<Input>
) => MaybePromise<Output>;

interface PendingControls<Self> {
  /** Never settles, so the component stays in its pending state. */
  mockPending(): Self;
}

/** `query`, `query.batch` (called once per argument) and `prerender`. */
export type RemoteQueryMock<Input, Output> = Mock<QueryHandler<Input, Output>> &
  PendingControls<RemoteQueryMock<Input, Output>>;

export type RemoteLiveQueryMock<Input, Output> = Mock<LiveQueryHandler<Input, Output>> &
  PendingControls<RemoteLiveQueryMock<Input, Output>> & {
    /**
     * Replaces the stream with one that `play` functions and tests drive: each connection
     * starts with `initial` (when given) and then gets every value passed to `emit`.
     */
    mockStream(initial?: Output): RemoteStream<Output>;
  };

export type RemoteFormMock<Input, Output> = Mock<FormHandler<Input, Output>> &
  PendingControls<RemoteFormMock<Input, Output>>;

export type RemoteCommandMock<Input, Output> = Mock<QueryHandler<Input, Output>> &
  PendingControls<RemoteCommandMock<Input, Output>>;

/** The mock type for a remote function, picked from its client-side type. */
export type RemoteMock<T> =
  T extends RemoteForm<infer Input, infer Output>
    ? RemoteFormMock<Input extends RemoteFormInput ? Input : undefined, Output>
    : T extends RemoteCommand<infer Input, infer Output>
      ? RemoteCommandMock<OrUndefined<Exclude<Input, void>>, Output>
      : T extends (arg: any) => RemoteLiveQuery<infer Output>
        ? RemoteLiveQueryMock<Arg<T>, Output>
        : T extends (arg: any) => RemoteQuery<infer Output>
          ? RemoteQueryMock<Arg<T>, Output>
          : T extends (arg: any) => RemoteResource<infer Output>
            ? RemoteQueryMock<Arg<T>, Output>
            : never;

/**
 * Returns the spy that answers a remote function's requests in Storybook and in Vitest. It takes
 * the arguments the server handler would get, and its result goes back to the component through
 * SvelteKit's own runtime:
 *
 * ```ts
 * remote(getPosts).mockResolvedValue([{ id: 1, title: 'Hello' }]);
 * remote(getPosts).mockImplementation(() => error(404, 'Not found'));
 * remote(getPosts).mockRejectedValue(httpError(404, 'Not found'));
 * remote(createPost).mockImplementation(async (data, issue) => invalid(issue.title('Too short')));
 * remote(getPosts).mockPending();
 * const feed = remote(getPostCount).mockStream(1);
 * ```
 *
 * The spy is reset before each story and test. It is an `fn()` from `storybook/test`, so its calls
 * show in the Actions panel and work with `expect(...).toHaveBeenCalledWith(...)`.
 */
export function remote<T>(remoteFunction: T): RemoteMock<T> {
  return getRemoteEntry(remoteFunction).spy as unknown as RemoteMock<T>;
}

/**
 * Returns the error that SvelteKit's `error(status, message)` throws, for
 * `mockRejectedValue(httpError(404, 'Not found'))`. (`error()` itself throws right away.)
 */
export function httpError(status: number, message?: string): Error {
  try {
    error(status, message);
  } catch (thrown) {
    return thrown as Error;
  }
}
