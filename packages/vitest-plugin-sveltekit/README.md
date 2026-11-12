# vitest-plugin-sveltekit

Test [SvelteKit remote functions](https://svelte.dev/docs/kit/remote-functions) and the components
that use them, in Vitest and in Storybook. You can unit test a remote function in Node, mock it per
story or test, or run the real one behind a component on a mocked database.

Components use SvelteKit's own client runtime, and their requests go to SvelteKit's own server
code in the same page. So form issues, `error()`, `redirect()`, refreshes and `query.live` streams
behave as they do in your app.

> [!WARNING]
> Experimental. Remote functions are experimental in SvelteKit, and this package needs a change to
> SvelteKit that is not released yet. Until then, apply the [SvelteKit patch](#sveltekit-patch).

## Getting started

Requirements:

- Node 22.19 or later
- `@sveltejs/kit` 3.2.0 exactly, with the [patch](#sveltekit-patch)
- Svelte 5.57 or later
- Vite 8
- `storybook` 11 (alpha). It is a required peer dependency, also when you use only Vitest.
- Vitest 5 with `@vitest/browser-playwright` and `vitest-browser-svelte`, Storybook with
  `@storybook/sveltekit`, or both

Install the package:

```sh
pnpm add -D vitest-plugin-sveltekit
```

Add `vitestPluginSvelteKit()` to `vite.config.ts`, after `sveltekit()`. Remote functions also need
the two experimental flags:

```ts
// vite.config.ts
import { vitestPluginSvelteKit } from 'vitest-plugin-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit({
      experimental: { remoteFunctions: true },
      compilerOptions: { experimental: { async: true } },
    }),
    vitestPluginSvelteKit(),
  ],
});
```

The plugin is active only in Vitest and Storybook. `vite dev` and `vite build` keep your real
remote functions.

### Vitest

Add the setup file to each Vitest project. Component tests run in
[browser mode](https://vitest.dev/guide/browser/), and unit tests of remote functions run in Node
mode:

```ts
// vite.config.ts
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [/* sveltekit() and vitestPluginSvelteKit(), as above */],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'components',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.unit.test.ts'],
          browser: { enabled: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
          setupFiles: ['vitest-plugin-sveltekit/vitest'],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.unit.test.ts'],
          setupFiles: ['vitest-plugin-sveltekit/vitest', './src/vitest-server.setup.ts'],
        },
      },
    ],
  },
});
```

The second setup file mocks the database (see [Unit tests](#unit-test-a-remote-function)).

### Storybook

Add the preview annotations to `.storybook/preview.ts`:

```ts
// .storybook/preview.ts
import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from 'vitest-plugin-sveltekit/storybook';

export default definePreview({
  addons: [remoteFunctions()],
});
```

Without `definePreview`, use `export { beforeEach } from 'vitest-plugin-sveltekit/storybook'`.
Storybook reads the plugin from `vite.config.ts`.

### Variant: one plugin per project

The plugin's options apply to the whole Vite config. To use
[server mode](#run-the-real-remote-functions) in one project only, add the plugin to each Vitest
project instead of the top level:

```ts
// vite.config.ts, in `test.projects`
{ extends: true, plugins: [vitestPluginSvelteKit()], test: { name: 'components' /* ... */ } },
{ extends: true, plugins: [vitestPluginSvelteKit({ server: true })], test: { name: 'server' /* ... */ } },
```

Storybook does not read `test.projects`. Add its plugin in `.storybook/main.ts`:

```ts
// .storybook/main.ts
viteFinal: (config) => ({
  ...config,
  plugins: [...(config.plugins ?? []), vitestPluginSvelteKit({ server: true })],
}),
```

The example app uses this setup: see
[`examples/kit-app/vite.config.ts`](./examples/kit-app/vite.config.ts).

## Usage

There are three ways to test remote functions:

| Test                                                    | What runs                                       | Where                          |
| ------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| [Unit tests](#unit-test-a-remote-function)              | The real remote function, called directly       | Vitest, Node mode              |
| [Mocked remote functions](#mock-remote-functions)       | A spy for each remote function                  | Vitest browser mode, Storybook |
| [Real remote functions](#run-the-real-remote-functions) | The real remote functions, on a mocked database | Vitest browser mode, Storybook |

Use unit tests for validation, auth and database effects. Use mocks to show a component in each
state: data, loading, empty and errors. Use real remote functions to test a component and its
remote functions together.

In the browser, the plugin has two modes. In **mock mode**, the default, every remote function is a
spy. In **server mode**, remote functions without a mock run their real code.

The examples test this form from the [example app](./examples/kit-app).
[`PostForm.svelte`](./examples/kit-app/src/lib/components/PostForm.svelte) renders it, and
[`Posts.svelte`](./examples/kit-app/src/lib/components/Posts.svelte) shows it below the list of
posts:

```ts
// src/lib/posts.remote.ts
export const createPost = form(
  v.object({
    title: v.pipe(v.string(), v.trim(), v.nonEmpty('Title is required')),
    body: v.optional(v.string(), ''),
  }),
  async ({ title, body }, issue) => {
    if (title.length < 3) invalid(issue.title('Title must be at least 3 characters'));

    const [duplicate] = await db.select().from(posts).where(eq(posts.title, title));
    if (duplicate) invalid(issue.title('A post with this title exists'));

    const [post] = await db.insert(posts).values({ title, body }).returning(summary);
    return post!;
  }
);
```

### Unit test a remote function

In Node mode, a remote function is the real server function. Call it and check what it returns or
throws. Each call runs in a request that [`mockRequestEvent()`](#mockrequesteventinit) sets up, so
`getRequestEvent()`, `locals`, cookies, `error()`, `redirect()` and `invalid()` work.

First, mock the database in the project's setup file. The example's mock is
[PGlite](https://pglite.dev) in memory, so the real queries run:

```ts
// src/vitest-server.setup.ts
import { vi } from 'vitest';

vi.mock('#lib/server/db.ts'); // uses src/lib/server/__mocks__/db.ts
```

Then call the remote functions. Submit a form with [`submitForm()`](#submitformform-data):

```ts
import { mockRequestEvent, submitForm } from 'vitest-plugin-sveltekit/server.mock';
import { beforeEach, expect, test } from 'vitest';

import { createPost, deletePost } from '#lib/posts.remote.ts';
import { resetDb } from '#lib/server/mocked-db.ts';

beforeEach(async () => {
  await resetDb([{ title: 'First post' }]);
});

test('the handler reports a short title', async () => {
  const { issues } = await submitForm(createPost, { title: 'Hi' });
  expect(issues).toEqual([
    { name: 'title', path: ['title'], message: 'Title must be at least 3 characters' },
  ]);
});

test('only a signed-in user can delete a post', async () => {
  await expect(deletePost(1)).rejects.toMatchObject({ status: 403 });

  mockRequestEvent({ locals: { user: { name: 'svelty' } } });
  await deletePost(1);
});
```

A call throws what SvelteKit's server code throws:

- `error()` throws an `HttpError` (`status`, `body`).
- `redirect()` throws a `Redirect` (`status`, `location`).
- A schema that rejects an argument throws a `ValidationError` (`issues`).

Await a `query.live` function for its first value, or iterate it for all values. To batch the calls
of a `query.batch`, run them in one request with [`runInRequest()`](#runinrequestfn):

```ts
import { runInRequest } from 'vitest-plugin-sveltekit/server.mock';

import { getStats } from '#lib/posts.remote.ts';

const [first, second] = await runInRequest(() => Promise.all([getStats(1), getStats(2)]));
```

Your `hooks.server` file does not run in Node mode, so set `locals` in the test. SvelteKit's rules
apply: for example, a query cannot read `event.url`, and the `inputs` of a `prerender` function do
not run.

For every kind of remote function, see
[`blog.unit.test.ts`](./examples/kit-app/src/lib/blog/blog.unit.test.ts) and
[`account.unit.test.ts`](./examples/kit-app/src/lib/account.unit.test.ts).

### Mock remote functions

[`mockRemote(fn)`](#mockremotefn) returns the spy that answers a remote function's requests.
Import the remote function from its `.remote.ts` file, as the component does, and give the spy a
behavior in `beforeEach`:

```ts
// src/lib/components/PostForm.test.ts
import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { createPost } from '#lib/posts.remote.ts';

import PostForm from './PostForm.svelte';

beforeEach(() => {
  mockRemote(createPost).mockImplementation(async (data, issue) => {
    if (data.title.length < 3) invalid(issue.title('Title must be at least 3 characters'));
    return { id: 3, title: data.title, body: data.body ?? '' };
  });
});

test('shows the issue the form handler reports', async () => {
  const screen = await render(PostForm);

  await screen.getByLabelText('Title').fill('Hi');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Title must be at least 3 characters');
  expect(mockRemote(createPost)).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Hi' }),
    expect.anything()
  );
});
```

In a story, put the mock in `beforeEach` too. A story's `beforeEach` runs after the one in
`defineMeta`, so it can replace the mock:

```svelte
<!-- src/lib/components/PostForm.stories.svelte -->
<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { invalid } from '@sveltejs/kit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost } from '#lib/posts.remote.ts';

  import PostForm from './PostForm.svelte';

  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Remote functions/PostForm',
    component: PostForm,
    beforeEach: () => {
      mockRemote(createPost).mockImplementation(async (data, issue) => {
        if (data.title.length < 3) invalid(issue.title('Title must be at least 3 characters'));
        return { id: 3, title: data.title, body: data.body ?? '' };
      });
    },
  });
</script>

<!-- … -->

<Story
  name="Created"
  play={async ({ canvas, userEvent, step }) => {
    await step('Create: the (mocked) handler accepts the title', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'A real title');
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    });
    await expect(await canvas.findByRole('status')).toHaveTextContent('Created “A real title”');
  }}
/>

<Story
  name="Submitting"
  beforeEach={() => {
    mockRemote(createPost).mockPending();
  }}
  play={async ({ canvas, userEvent, step }) => {
    await step('Create: the (mocked) handler never answers', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'Slow');
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled());
  }}
/>
```

A mock gets the input before your schema runs (see [Caveats](#caveats)).

In Storybook, the spy's calls show in the Actions panel. For data, errors, redirects and live
streams, see [`mockRemote(fn)`](#mockremotefn). More examples:
[`Posts.test.ts`](./examples/kit-app/src/lib/components/Posts.test.ts) and
[`Posts.stories.svelte`](./examples/kit-app/src/lib/components/Posts.stories.svelte) (a refresh and
a redirect), and [`PostCount.test.ts`](./examples/kit-app/src/lib/components/PostCount.test.ts) and
[`PostCount.stories.svelte`](./examples/kit-app/src/lib/components/PostCount.stories.svelte) (a
`query.live` stream).

### Run the real remote functions

In server mode, remote functions run the code in your `.remote.ts` files, in the browser: the
schema, the handler, `getRequestEvent()`, and the `handle` and `handleError` hooks of
`hooks.server`. You mock the database instead of the remote functions.

Turn on server mode with the [`server`](#server) option:

```ts
vitestPluginSvelteKit({ server: true });
```

At the top level, `server: true` applies to every browser project and to Storybook. The server code
loads before each test, so each of these projects must mock the database, also for tests that mock
every remote function. To keep a project in mock mode, use
[one plugin per project](#variant-one-plugin-per-project).

Mock the database. In Vitest, add the setup file from [Unit tests](#unit-test-a-remote-function) to
each server mode project. In Storybook, use
[`sb.mock`](https://storybook.js.org/docs/writing-stories/mocking-data-and-modules/mocking-modules)
with the same `__mocks__` file:

```ts
// .storybook/preview.ts
import { sb } from 'storybook/test';

sb.mock(import('../src/lib/server/db.ts'));
```

Then seed the database in `beforeEach`, and test the component with the real `createPost`:

```ts
// src/lib/components/server/Posts.server.test.ts
import { beforeEach, expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';

import { db } from '#lib/server/db.ts';
import { resetDb } from '#lib/server/mocked-db.ts';
import { posts } from '#lib/server/schema.ts';

import Posts from '../Posts.svelte';

beforeEach(async () => {
  await resetDb([{ title: 'First post', body: '' }]);
});

test('shows the issue the real handler reports with invalid()', async () => {
  const screen = await render(Posts);

  await screen.getByLabelText('Title').fill('First post');
  await screen.getByRole('button', { name: 'Create' }).click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('A post with this title exists');
  expect(await db.$count(posts)).toBe(1);
});
```

The story checks the same issue:

```svelte
<!-- src/lib/components/server/Posts.stories.svelte -->
<script module lang="ts">
  import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost } from '#lib/posts.remote.ts';

  import { db } from '#lib/server/db.ts';
  import { resetDb } from '#lib/server/mocked-db.ts';
  import { posts } from '#lib/server/schema.ts';

  import Posts from '../Posts.svelte';

  // The real `createPost`: its valibot schema, its `invalid()` calls, its insert.
  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Server/Posts',
    component: Posts,
    beforeEach: async () => {
      await resetDb([{ title: 'First post', body: '' }]);
    },
  });
</script>

<!-- … -->

<Story
  name="Handler issue"
  play={async ({ canvas, userEvent, step }) => {
    await step('Create a post with the title of the seeded post', async () => {
      await userEvent.type(await canvas.findByLabelText('Title'), 'First post');
      await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    });
    await step('The real handler finds the title and calls invalid(): no insert', async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        'A post with this title exists'
      );
      await expect(await db.$count(posts)).toBe(1);
    });
  }}
/>

<!-- … -->
```

Import the mocked module (`#lib/server/db.ts`), not the `__mocks__` file. In Storybook, a direct
import of the mock file is a second module with a second database. The example's
[`mocked-db.ts`](./examples/kit-app/src/lib/server/mocked-db.ts) gives typed access to helpers such
as `resetDb()`.

To sign a user in, call `mockRequestEvent({ cookies: { session: 'svelty' } })` from
`vitest-plugin-sveltekit/server.mock` in `beforeEach`.
Your `handle` hook runs for each request and can read the cookie. A function that you mock with
`mockRemote(fn)` skips its real handler, and the others run.

More tests and stories are in [`components/server`](./examples/kit-app/src/lib/components/server).
[`blog.server.test.ts`](./examples/kit-app/src/lib/blog/blog.server.test.ts) calls remote functions
in the browser without a component. Before you publish a Storybook in server mode, read
[Server mode caveats](#server-mode-caveats).

## How it works

In the browser, the plugin replaces each `.remote.ts` file with SvelteKit's client stubs. Their
requests go to SvelteKit's own server code for remote functions, which runs in the same page. That
code calls the `mockRemote(fn)` spy. In server mode, it calls the real handler when the function
has no mock. In mock mode, no server module of a `.remote.ts` file loads.

In Node mode, the plugin leaves each `.remote.ts` file to SvelteKit's own plugin. A call from a test
runs in a request built from `mockRequestEvent()`, through SvelteKit's `withRequestEvent`.

Before each story and test, the plugin resets every mock, the request event, and SvelteKit's caches
and form state. This also closes open `query.live` streams.

Custom types in arguments and results work as in your app: the plugin uses the `transport` export
of your `src/hooks.ts`.

## Caveats

- **Mocks skip your schemas.** A mock gets the input as the client sent it, before validation,
  defaults and transforms. For `getPosts()` with the schema
  `v.optional(v.picklist(['newest', 'oldest']), 'newest')`, the real handler gets `'newest'`, and
  the spy gets `undefined`. The spy's types use the schema's input type. To test a schema, use unit
  tests or server mode.
- **Submissions take time.** A form or command goes through a request, so the spy is not called
  yet right after the click. Wait for the UI, or use
  `await waitFor(() => expect(mockRemote(createPost)).toHaveBeenCalled())`.
- **`$app/state` in Vitest.** Plain Vitest has no mocks for `$app/state` and `$app/paths`. Mock
  them with `vi.mock('$app/state', () => ({ page: { ... }, navigating: null, ... }))`. In
  Storybook, `@storybook/sveltekit` mocks them: set the page with
  `parameters: { sveltekit_experimental: { state: { page: { ... } } } }`.
- **Static analysis.** The plugin reads the kind of each remote function from the source. Write
  `export const x = query(...)` (or `query.batch`, `form`, ...) with the functions from
  `$app/server`, or `const x = ...` with `export { x }`. Wrappers, default exports, `export *` and
  re-exports cause an error that names the file. `.remote.ts` files in `node_modules` are not
  supported.
- **`.for(id)` forms.** `mockRemote()` takes the form itself. All `.for(id)` instances share its
  mock.
- **`getRequestEvent()` after an `await`.** The browser has no async context. A mock that reads the
  event after an `await` can get the event of another request. So can a real `query.live`
  generator in server mode. Read the event before the first `await`.
- **Unmount live components.** The Vitest setup file resets the caches before
  `vitest-browser-svelte` unmounts the previous test's components. Unmount a component that still
  updates after its test, such as a `query.live` that reconnects.

### Server mode caveats

> [!CAUTION]
> The handlers and the modules they import load in the page, and `storybook build` puts them in
> the static Storybook, with the values of the `env` option. Everybody who can open it can read
> them. Mock the modules that must stay private, and use
> [`server: { include, exclude }`](#server) to keep `.remote.ts` files out. `storybook build`
> prints the server code and the private env keys that went into the output.

- **Server packages.** Server packages and Node built-ins must run in the browser or be mocked.
- **Real functions do not record calls.** The spy of a function without a mock gets no calls. A
  once-mock, such as `mockResolvedValueOnce()`, answers one call. After that, the real handler runs
  again.
- **One real request at a time.** Without `AsyncLocalStorage`, real requests run one after the
  other. Mocks do not wait. A real handler that never answers holds the next real requests until
  the next story or test.
- **Module state lives for the page.** All stories share one page. In Vitest, each test file has
  its own. Reset module state, such as the database, in `beforeEach`.
- **`__mocks__` files.** Storybook loads a `__mocks__` file under the path of the module it
  replaces. Use `#lib/...` imports in it, not `../`.
- **Import cycles.** In `storybook build`, a cycle between a helper and a `.remote.ts` file, with a
  top-level `await`, can keep the stories from loading.
- **Pre-bundling.** If Vite reloads the page for a server package, add it to
  `optimizeDeps.include`.
- **Not run:** `reroute`, `handleFetch`, CSRF checks and form posts without JavaScript.
  `event.fetch` is the browser's `fetch`.

## Environment variables

Real `.env` values never reach the browser. In Storybook and in Vitest browser mode,
`$app/env/private` gives server code only the values of the [`env`](#options) option. Pass only values that may be public:

```ts
vitestPluginSvelteKit({ server: true, env: { API_URL: 'https://api.example.test' } });
```

A private variable without a value gets the default of its schema, or no value, with a warning.
Public variables keep the app's values. The plugin reads the variables from
`export const variables = defineEnvVars({ ... })` in `src/env.ts`.

SvelteKit checks these variables in Storybook too. If one is required, `storybook dev` and
`storybook build` fail with `env_invalid` until it has a value, for example in `.env`.

In Node mode, the `env` option does not apply. `$app/env/private` gets its values as in SvelteKit:
from `.env`, `.env.test` and the shell.

## Options

`vitestPluginSvelteKit(options)` from `vitest-plugin-sveltekit/vite`:

| Option    | Type                                  | Default                        | Description                                    |
| --------- | ------------------------------------- | ------------------------------ | ---------------------------------------------- |
| `enabled` | `boolean`                             | `true` in Vitest and Storybook | Turns the plugin on or off.                    |
| `server`  | `boolean \| { include?, exclude? }`   | `false`                        | Runs the real remote functions in the browser. |
| `env`     | `Record<string, string \| undefined>` | `{}`                           | The private env values for server mode.        |

### `server`

`true` takes every `.remote.ts` file. To pick files, pass `include` and `exclude`: picomatch globs
relative to the project root, or regular expressions.

```ts
vitestPluginSvelteKit({
  server: { include: ['src/lib/blog/**'], exclude: ['src/lib/blog/admin.remote.ts'] },
});
```

A file that the filter leaves out stays a client stub: its server code never reaches the bundle.
Mock its functions with `mockRemote(fn)`.

## API reference

### `mockRemote(fn)`

From `vitest-plugin-sveltekit/remote.mock`. Returns the spy behind a remote function, typed from the
remote function: a `vi.fn()` in Vitest, an `fn()` from `storybook/test` in Storybook.

| To get                            | Write                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Data                              | `mockRemote(getPosts).mockResolvedValue(posts)`                              |
| Data that depends on the argument | `mockRemote(getPost).mockImplementation(async (id) => posts[id])`            |
| The pending state                 | `mockRemote(getPosts).mockPending()`                                         |
| An HTTP error                     | `mockRemote(getPosts).mockImplementation(() => error(404, 'Not found'))`     |
| The same, as a value              | `mockRemote(getPosts).mockRejectedValue(httpError(404, 'Not found'))`        |
| A redirect                        | `mockRemote(createPost).mockImplementation(() => redirect(303, '/posts/1'))` |
| A form issue                      | `invalid(issue.title('Too short'))` in `mockImplementation`                  |
| Live values                       | `mockRemote(getPostCount).mockReturnValue([1, 2])`, or an async generator    |

`error`, `redirect` and `invalid` come from `@sveltejs/kit`. `httpError(status, message?)` comes
from `vitest-plugin-sveltekit/remote.mock`, and returns the error instead of throwing it.

The spy gets the argument of a `query`, `prerender` or `command`. A `query.batch` spy is called
once per argument. A `form` spy gets `(data, issue)`, as the real handler does.

After a mocked `form` or `command`, the queries in `.updates(...)` run again, and the new values
go back in the same response. A form without `.updates(...)` refreshes all queries.

Without a mock, a `query`, `query.batch`, `query.live` or `prerender` fails with an error that
says how to mock it. A `form` or `command` returns `undefined`.

#### `mockStream(initial?)`

On a `query.live` spy. Returns a stream that the story or test drives, with `emit(value)`,
`error(error)` and `end()`. Each connection starts with the latest value. Call it in `beforeEach`,
because the component connects when it renders:

```svelte
<!-- src/lib/components/PostCount.stories.svelte -->
<script module lang="ts">
  import { httpError, mockRemote, type RemoteStream } from 'vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import { getPostCount } from '#lib/posts.remote.ts';

  import PostCount from './PostCount.svelte';

  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Remote functions/PostCount',
    component: PostCount,
  });

  let feed: RemoteStream<number>;
</script>

<!-- … -->

<Story
  name="Live stream"
  beforeEach={() => {
    feed = mockRemote(getPostCount).mockStream(5);
  }}
  play={async ({ canvas, step }) => {
    await expect(await canvas.findByText('5')).toBeVisible();
    await expect(await canvas.findByText('live')).toBeVisible();

    await step('The stream sends 6', async () => {
      feed.emit(6);
      await expect(await canvas.findByText('6')).toBeVisible();
    });

    await step('The stream fails with a 503', async () => {
      feed.error(httpError(503, 'Feed down'));
      await expect(await canvas.findByRole('alert')).toHaveTextContent('Feed down');
    });
  }}
/>

<!-- … -->
```

### `mockRequestEvent(init?)`

From `vitest-plugin-sveltekit/server.mock`. Sets up the request that real remote functions run in,
and returns it:

```ts
mockRequestEvent({
  cookies: { session: 'svelty' }, // sent with each request; `set-cookie` updates it
  locals: { user: { name: 'Svelty' } },
  params: { id: '1' },
  url: new URL('http://localhost/posts/1'), // default: the page URL
});
```

The fields are `locals`, `cookies`, `params`, `route`, `url` and `platform`. A field you pass
replaces its value (`locals` is not merged), and the others keep theirs. The event resets before
each story and test.

The result is the live event. Without arguments, `mockRequestEvent()` only returns it, for example
to check a cookie: `expect(mockRequestEvent().cookies.get('session')).toBe('svelty')`.

### `submitForm(form, data)`

From `vitest-plugin-sveltekit/server.mock`, for Node mode. Submits `data` to a `form` as
SvelteKit's server does. Returns `{ result }`, or `{ issues }` with the `name`, `path` and
`message` of each issue. A `redirect()` or `error()` rejects the promise.

### `runInRequest(fn)`

From `vitest-plugin-sveltekit/server.mock`, for Node mode. Runs `fn` in one request built from
`mockRequestEvent()`. Use it when calls must share a request, such as the calls of a `query.batch`.

### `vitest-plugin-sveltekit/vitest`

The setup file. It also exports stand-ins for what plain Vitest does not have:

- `page`: `{ url }`, the page that remote function requests come from. Set `page.url` to change it.
- `navigating`: always `null`.
- `goto`: a spy that SvelteKit calls when a remote function redirects.

### `vitest-plugin-sveltekit/storybook`

The preview annotations (see [Storybook](#storybook)). They connect SvelteKit's client runtime to
the `$app/state` and `$app/navigation` mocks of `@storybook/sveltekit`.

## SvelteKit patch

The plugin uses entries that a proposed change to SvelteKit adds for tools like this one. Until
SvelteKit releases them, use the patch from this repository. The patch is for one SvelteKit
version, so pin that version exactly. With a range such as `^3.2.0`, your lockfile can keep
another version, and then pnpm applies no patch.

1. Pin `"@sveltejs/kit": "3.2.0"` in the `devDependencies` of `package.json`.
2. Copy
   [`patches/@sveltejs__kit@3.2.0.patch`](https://github.com/storybookjs/labs/blob/main/patches/@sveltejs__kit@3.2.0.patch)
   to the `patches/` folder of your project.
3. Add it to `pnpm-workspace.yaml`. If you set `minimumReleaseAge`, also exclude SvelteKit until
   the version is old enough:

   ```yaml
   patchedDependencies:
     '@sveltejs/kit@3.2.0': patches/@sveltejs__kit@3.2.0.patch
   minimumReleaseAgeExclude:
     - '@sveltejs/kit@3.2.0'
   ```

4. Run `pnpm install`. With npm or yarn, apply the same file with `patch-package`.

## Development

From the repository root, run `pnpm --filter vitest-plugin-sveltekit build`. Then see
[`examples/kit-app`](./examples/kit-app/README.md) for the example app and its tests.
