# @storybookjs/vitest-plugin-sveltekit

Render components that use [SvelteKit remote functions](https://svelte.dev/docs/kit/remote-functions)
in Storybook and in Vitest browser mode, with each remote function mocked per story or test.

```ts
remote(getPosts).mockResolvedValue([{ id: 1, title: 'Hello' }]);
```

The component runs SvelteKit's own client code for remote functions. Its requests go to SvelteKit's
own server code for remote functions, which runs in the same page and calls your mock instead of
the handler in your `.remote.ts` file. So `invalid()` issues, `error()`, `redirect()`, form state,
refreshes and `query.live` streams behave as they do in your app. Mocks skip your schemas (see
[What the spy gets](#what-the-spy-gets)).

> [!WARNING]
> Experimental. Remote functions are experimental in SvelteKit, and this package needs a change
> in SvelteKit's client runtime that is not released yet. Until then, apply the patch from this
> repository (see [SvelteKit patch](#sveltekit-patch)).

## Requirements

- `@sveltejs/kit` 3.1.1 exactly (see [SvelteKit patch](#sveltekit-patch)) with
  `experimental.remoteFunctions`, and Svelte 5.57+ with
  `compilerOptions.experimental.async`
- Vite 8
- Storybook 11 (`@storybook/sveltekit`), Vitest 5 browser mode, or both

## Setup

Install the package:

```sh
pnpm add -D @storybookjs/vitest-plugin-sveltekit
```

Add the plugin to `vite.config.ts`, after `sveltekit()`:

```ts
import { vitestPluginSvelteKit } from '@storybookjs/vitest-plugin-sveltekit/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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

The plugin is only active in Vitest and in Storybook. `vite dev` and `vite build` keep your real
remote functions. To force it on or off, pass `vitestPluginSvelteKit({ enabled: true })`.

### Storybook

Add the preview annotations to `.storybook/preview.ts`:

```ts
import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from '@storybookjs/vitest-plugin-sveltekit/storybook';

export default definePreview({
  addons: [remoteFunctions()],
});
```

With a classic `preview.ts` (no `definePreview`), export the hook instead:

```ts
export { beforeEach } from '@storybookjs/vitest-plugin-sveltekit/storybook';
```

Before each story, this resets every mock, clears the cached results of remote functions, and
connects SvelteKit's client runtime to Storybook's `$app/state` and `$app/navigation` mocks. The same
setup works for stories that run in Vitest through `@storybook/addon-vitest`.

### Vitest browser mode

Add the setup file to the project that renders components:

```ts
// vite.config.ts
export default defineConfig({
  // ...
  test: {
    browser: { enabled: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
    setupFiles: ['@storybookjs/vitest-plugin-sveltekit/vitest'],
  },
});
```

Plain Vitest has no `$app/*` mocks, so the setup file has small stand-ins of its own. Import them
from `@storybookjs/vitest-plugin-sveltekit/vitest` when a test needs them:

- `page`: `{ url }`, the page that requests come from. Set `page.url` to change it.
- `navigating`: always `null`.
- `goto`: a spy that SvelteKit calls when a remote function redirects.

The setup file resets every mock and SvelteKit's caches in its `beforeEach`. That hook runs before
the one in which `vitest-browser-svelte` unmounts the previous test's components. A component
that still updates after its test (a `query.live` that reconnects after a redirect) can then read
a query that the reset removed; unmount it at the end of the test.

In Vitest and Storybook the plugin removes SvelteKit's `vite-plugin-sveltekit-compile` and
`vite-plugin-sveltekit-guard` (the app build, the dev server middleware and the check against
server-only imports), as `@storybook/sveltekit` does. Neither is needed to render components, and
the guard would reject the files the package serves.

## What else your component needs

The package handles remote functions. A component often needs more from SvelteKit:

- **`$app/state` and `$app/paths` in plain Vitest.** Plain Vitest has no mocks for them. The `page`
  from `@storybookjs/vitest-plugin-sveltekit/vitest` only goes to the remote-function requests; a
  component that imports `page` from `$app/state` gets SvelteKit's real, empty one. Mock the module
  in the test or a setup file:

  ```ts
  vi.mock('$app/state', () => ({
    page: { url: new URL('http://localhost/'), params: {}, data: { user: { name: 'Ada' } } },
    navigating: null,
    updated: { current: false },
  }));
  ```

- **`$app/state` in Storybook.** `@storybook/sveltekit` mocks it. Set the page per story with
  `parameters: { sveltekit_experimental: { state: { page: { data: { ... } } } } }`.

- **Environment variables.** SvelteKit 3 checks the variables your `src/env.ts` declares, also in
  Storybook. If some are required, `storybook dev` and `storybook build` fail with `env_invalid`
  until they are set, for example in a `.env` file.

- **Submissions take time.** A form submission or a command goes through a request, so the spy is
  not called yet right after the click. Wait for the UI to change, or wait for the call:

  ```ts
  await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(remote(createPost)).toHaveBeenCalled());
  ```

## Mock a remote function

`remote(fn)` returns the spy behind a remote function. Import the remote function from your
`.remote.ts` file, the same import the component uses. The spy is typed from the remote function.

```ts
import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { getPosts } from '#lib/posts.remote';
```

In Storybook the spy is an `fn()` from `storybook/test`, so its calls show in the Actions panel; in
Vitest it is a `vi.fn()`. Use it in `beforeEach` (or at the start of a test), and assert on
it with `expect(remote(getPosts)).toHaveBeenCalledWith('newest')`.

| You want                          | Write                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| Data                              | `remote(getPosts).mockResolvedValue(posts)`                              |
| Data that depends on the argument | `remote(getPost).mockImplementation(async (id) => posts[id])`            |
| The pending state                 | `remote(getPosts).mockPending()` (never settles)                         |
| An HTTP error                     | `remote(getPosts).mockImplementation(() => error(404, 'Not found'))`     |
| The same, as a value              | `remote(getPosts).mockRejectedValue(httpError(404, 'Not found'))`        |
| A redirect                        | `remote(createPost).mockImplementation(() => redirect(303, '/posts/1'))` |
| A form validation issue           | see below                                                                |

`error`, `redirect` and `invalid` come from `@sveltejs/kit`. They throw at once, so use them inside
`mockImplementation`. `httpError(status, message)` from `./remote.mock` returns the error instead,
for `mockRejectedValue`.

### What the spy gets

The spy gets the input as the client sent it. SvelteKit decodes it (devalue for queries and
commands, its form data conversion for forms), but **schema validation, defaults and transforms do
not run in mocked mode**. Examples:

- `getPosts()` with the schema `v.optional(v.picklist(['newest', 'oldest']), 'newest')`: the real
  handler gets `'newest'`, the spy gets `undefined`.
- A form schema that transforms `{ title }` into `{ title, slug }`: the real handler reads
  `data.slug`, the spy gets `{ title }` only.
- Input that the schema rejects reaches the spy instead of failing with a 400.

The types say the same: for every kind, the spy's argument has the schema's input type, not its
output type.

### By kind

**`query` and `prerender`**: the spy gets the argument: `(arg) => result`.

**`query.batch`**: the spy is called once per argument, `(arg) => result`, like a `query`, so
`remote(getStats).mock.calls` has one entry per argument.
SvelteKit still sends one request for the whole batch.

**`form`**: the spy gets `(data, issue)`: `data` is the submitted form data as an object (schema
input), and `issue` reports issues with `invalid()`, as in the server handler:

```ts
remote(createPost).mockImplementation(async (data, issue) => {
  if (data.title.length < 3) invalid(issue.title('Too short'));
  return { id: 2, title: data.title };
});
```

**`command`**: the spy gets the argument.

After a mocked `form` or `command` resolves, every query that the client passed to
`.updates(...)` is refreshed: its mock runs again and the new value goes back in the same response.
(A real handler has to do this itself, with `getPosts().refresh()` or `requested()`.) A form
submission without `.updates(...)` refreshes all queries, as in SvelteKit.

### `query.live`

The spy returns what your server handler returns. Three ways:

```ts
// An async generator
remote(getPrices).mockImplementation(async function* () {
  yield 1;
  await new Promise((resolve) => setTimeout(resolve, 500));
  yield 2;
});

// A finite array: emits each value, then the stream is done
remote(getPrices).mockReturnValue([1, 2]);

// A stream that the story or test drives
let feed: RemoteStream<number>;

export const Live = meta.story({
  beforeEach: () => {
    feed = remote(getPrices).mockStream(1);
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1')).toBeVisible();
    feed.emit(2);
    await expect(await canvas.findByText('2')).toBeVisible();
    feed.error(httpError(503, 'Feed down')); // or feed.end()
  },
});
```

`mockStream(initial?)` returns `{ emit(value), error(error), end() }`. Every connection starts with
the latest value. Set it up in `beforeEach`, because the component connects when it renders.

### Without a mock

A `query`, `query.batch`, `query.live` or `prerender` without a mock fails with an error that says
how to mock it, so the component shows its `failed` state. A `form` or `command` without a mock
resolves `undefined`.

### Custom types

Arguments and results with custom types work as in your app: the package reads the `transport`
export of your `src/hooks.ts` and uses it on both sides. Other universal hooks are not used.

## Server mode: run the real remote functions

By default every remote function is a mock. With `server: true`, remote functions without a
`remote(fn)` mock run the code in your `.remote.ts` file, in the page: its validation schema, its
`error()`, `redirect()` and `invalid()` calls, `getRequestEvent()`, and your `hooks.server` `handle`
and `handleError`. You replace the data layer instead of the remote functions.

```ts
vitestPluginSvelteKit({ server: true });
```

The option is per Vite config, so a project can have both: for example mocked component tests and
server mode stories. In Storybook, add the plugin in `.storybook/main.ts` if the server mode is
only for Storybook:

```ts
// .storybook/main.ts
import { vitestPluginSvelteKit } from '@storybookjs/vitest-plugin-sveltekit/vite';
import { defineMain } from '@storybook/sveltekit/node';

export default defineMain({
  framework: '@storybook/sveltekit',
  stories: ['../src/**/*.stories.@(ts|svelte)'],
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), vitestPluginSvelteKit({ server: true })],
  }),
});
```

The Storybook and Vitest entries need no change: they detect the mode.

### Replace the data layer

Your server code now runs in the browser, so replace the modules that talk to a database or to
Node with browser versions. In Storybook, use `sb.mock` in `.storybook/preview.ts` with a file in
`__mocks__`; in Vitest, use `vi.mock` in a setup file:

```ts
// .storybook/preview.ts
import { sb } from 'storybook/test';
sb.mock(import('../src/lib/server/db.ts')); // src/lib/server/__mocks__/db.ts

// src/vitest-server.setup.ts (in `test.setupFiles`)
import { vi } from 'vitest';
vi.mock('#lib/server/db.ts');
```

A database that runs in WebAssembly keeps the real queries. The example uses drizzle with PGlite
in memory, and seeds it in `beforeEach`. Two details:

- Storybook loads a `__mocks__` file under the path of the module it replaces. Use `#lib/...`
  imports in it, not `../`.
- Import from the mocked module (`#lib/server/db.ts`), not from the `__mocks__` file: in Storybook a
  direct import of the mock file is a second module with a second database. The example's
  `src/lib/server/mocked-db.ts` gives typed access to the mock's helpers.

Node built-ins that your server code uses (`node:fs`, `node:crypto`, ...) do not exist in the
browser either. Mock the module that uses them in the same way.

### Mix mocks and real functions

A function that a story or test mocks with `remote(fn)` skips the real handler; the others run.
Both can be used in one story:

```ts
beforeEach: async () => {
  await resetDb([{ title: 'From the database' }]); // getPosts runs for real
  remote(getStats).mockResolvedValue({ views: 99, likes: 9 }); // getStats is mocked
},
```

A function counts as mocked as soon as its spy has a behaviour of its own (`mockResolvedValue`,
`mockImplementation`, `mockPending`, ...). A once-mock (`mockResolvedValueOnce`) answers the next
call; after it is used up, the real handler runs again. Calls between remote functions on the
server side (a command that calls `getPosts().refresh()`) use the real functions. The spy of a
function that runs for real does not record calls.

This also works through helper modules (`a.remote.ts → helper.ts → b.remote.ts`): server code
gets its own copy of each project module that leads to a remote file, so a refresh in the helper
goes into the current response. Modules that lead to no remote file (the data layer) stay one
module, so `vi.mock` and `sb.mock` replace them for client and server code alike.

### The request: `./server.mock`

`getRequestEvent()` in your server code gets an event built from `requestEvent`, which is reset
before each story and test:

```ts
import { requestEvent } from '@storybookjs/vitest-plugin-sveltekit/server.mock';

beforeEach(() => {
  requestEvent.cookies.set('session', 'ada'); // sent with each request; `set-cookie` updates it
  requestEvent.locals.user = { name: 'Ada' }; // copied into `event.locals`
  requestEvent.params = { id: '1' };
  requestEvent.url = new URL('http://localhost/posts/1'); // default: the page URL
});
```

Your `handle` hook runs around each request, as on a server, so it can read the cookies and fill
`locals`. The cookies work like a browser's: each request sends the cookies of
`requestEvent.cookies`, and when it answers, only what its handler set or deleted changes the jar.
So a slower request does not undo a login that finished first.

### Environment variables

`$app/env/private` (and the older `$env/static/private` and `$env/dynamic/private`) work in server
mode. In `storybook dev` and Vitest, they have the values SvelteKit loads (`.env`, `.env.local`,
the shell). In `storybook build`, they come from the `.env` files (`.env`, `.env.local`,
`.env.<mode>`, `.env.<mode>.local`), with the shell's value for a variable that a file names.

Only the variables that `src/env.ts` declares go into the build. The plugin reads their names from
`export const variables = defineEnvVars({ ... })`; if it cannot (a spread, a computed key), the
build gets no values and the plugin prints a warning.

> [!CAUTION]
> In server mode, `storybook build` writes the values of the declared variables into the
> JavaScript of the static Storybook, for everybody who can open it to read. A value can come from
> the shell: the shell overrides a file, and `${VAR}` in a file copies a shell variable
> (`ALIAS=${CI_SECRET}` puts `CI_SECRET` into `ALIAS`). Never build a Storybook in server mode
> where a declared variable holds a secret, from a file or from the shell. Build it where they hold
> harmless values, or mock the module that reads the secret.

### Live queries and isolation

The request's `signal` is the signal of the client's `fetch`, so a real `query.live` generator that
watches `getRequestEvent().request.signal` stops when SvelteKit closes the stream: on `reconnect()`,
when the query's proxy is garbage collected (SvelteKit does not close it at unmount), and before
each story and test, when the package resets SvelteKit's caches. The example checks that nothing
keeps polling between tests.

Before each story and test, the package also clears the request store and loads the server code of
the remote files the story imports, so the first request does not time out a `findBy`.

### Server mode limitations

- **One real request at a time.** The browser has no async context, so real remote functions run
  one after the other, as on SvelteKit's server in a webcontainer: a real request waits until the
  one before it has answered. `getRequestEvent()`, `requested()` and `refresh()` after an `await`
  then use the running request, also while a mock or a `query.live` stream answers in between.
  Mocks do not wait, so a `mockPending()` mock holds nothing up. A real handler that never answers
  holds the real requests after it until the next story or test.
- **Live generators read the event first.** The other way round does not hold: a `query.live`
  generator that calls `getRequestEvent()` after an `await` while a command or form runs sees that
  request's event. Read the event once at the start of the generator, as the example does.
- **Import cycles in a build.** A helper that imports a remote function from the remote file that
  imports the helper is an import cycle in the server code. In `storybook build`, such a cycle
  together with a top-level `await` (a database setup) can keep the stories from loading. Put the
  remote functions that the helper calls in another remote file.
- **Module state lives for the page.** In Storybook all stories share one page, in Vitest each test
  file has its own. Reset module-level state of your server code in `beforeEach`, as the example
  does for the database.
- **Pre-bundling.** The plugin follows the imports of your remote files and `hooks.server` to find
  the packages to pre-bundle. A package that is only reached in other ways may make Vite reload the
  page once; add it to `optimizeDeps.include`.
- **Not run:** `reroute`, `handleFetch`, CSRF checks and non-JavaScript form posts. `event.fetch` is
  the browser's `fetch`.

## Limitations

- **Static analysis.** The plugin reads which kind of remote function each export is from the
  source, without running it. Write `export const x = query(...)` (or `query.batch`, `query.live`,
  `form`, `command`, `prerender`) with the functions imported from `$app/server`, or `const x = ...`
  plus `export { x }`. Wrappers such as `export const x = guardedQuery(...)`, default exports,
  `export *` and re-exports from other files cause an error that names the file.
- **Which files are remote.** The same files as in SvelteKit: a name that contains `.remote.` or
  starts with `remote.` (`posts.remote.ts`, `count.remote.svelte.ts`). Remote files inside
  `node_modules` are not handled yet.
- **No `parameters`.** Mocks are set in `beforeEach` (or in the test), not with
  `parameters.sveltekit`.
- **Mocks skip your schemas.** A mock gets the input as sent, before validation, defaults and
  transforms (see [What the spy gets](#what-the-spy-gets)). In server mode, the real handlers run
  with their schemas.
- **`getRequestEvent()` after an `await` sees the latest request.** Browsers have no async context,
  so the request store is kept until the next request starts. A mock that reads the event after an
  `await` while other requests run (two commands in flight, a live stream emitting) can get another
  request's event. The package itself reads the store only before the mock's first `await`.
- **`.for(id)` forms.** `remote()` takes the form itself, not an instance from `.for(id)`. Both
  instances use the same mock.

## SvelteKit patch

SvelteKit's client runtime for remote functions calls the router directly. This package needs a way
to give it a different `fetch`, `page` and `goto`, and a way to reset its caches and form state
between tests: `set_remote_env` and `reset_remote_state` from `@sveltejs/kit/internal/client`,
proposed to SvelteKit. Each request runs in `withRequestEvent` from `$app/server`, also proposed.

Until these are released, use the patch from this repository. It is for one SvelteKit version, so
pin that version exactly. A range such as `^3.1.0` can keep an older version in your lockfile, and
then pnpm applies no patch.

1. Pin SvelteKit in `package.json`:

   ```json
   "devDependencies": {
     "@sveltejs/kit": "3.1.1"
   }
   ```

2. Copy [`patches/@sveltejs__kit@3.1.1.patch`](../../patches/@sveltejs__kit@3.1.1.patch) to the
   `patches/` folder of your project.

3. Tell pnpm about it in `pnpm-workspace.yaml`:

   ```yaml
   patchedDependencies:
     '@sveltejs/kit@3.1.1': patches/@sveltejs__kit@3.1.1.patch
   ```

   If you set `minimumReleaseAge`, pnpm refuses a SvelteKit version younger than that age. Exclude
   it until it is old enough:

   ```yaml
   minimumReleaseAgeExclude:
     - '@sveltejs/kit@3.1.1'
   ```

4. Run `pnpm install`. With npm or yarn, apply the same file with `patch-package`.

## Development

From the repository root: `pnpm --filter @storybookjs/vitest-plugin-sveltekit build`, then see
[`examples/kit-app`](./examples/kit-app/README.md) for the example app and its tests.
