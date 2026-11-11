# vitest-plugin-sveltekit

Render components that use [SvelteKit remote functions](https://svelte.dev/docs/kit/remote-functions)
in Storybook and in Vitest browser mode, with each remote function mocked per story or test.

```ts
mockRemote(getPosts).mockResolvedValue([{ id: 1, title: 'Hello' }]);
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

- `@sveltejs/kit` 3.2.0 exactly, with the patch from this repository (see
  [SvelteKit patch](#sveltekit-patch)), and
  `experimental.remoteFunctions`, and Svelte 5.57+ with
  `compilerOptions.experimental.async`
- Vite 8
- Storybook 11 (`@storybook/sveltekit`), Vitest 5 browser mode, or both

## Setup

Install the package:

```sh
pnpm add -D vitest-plugin-sveltekit
```

Add the plugin to `vite.config.ts`, after `sveltekit()`:

```ts
import { vitestPluginSvelteKit } from 'vitest-plugin-sveltekit/vite';
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
import remoteFunctions from 'vitest-plugin-sveltekit/storybook';

export default definePreview({
  addons: [remoteFunctions()],
});
```

With a classic `preview.ts` (no `definePreview`), export the hook instead:

```ts
export { beforeEach } from 'vitest-plugin-sveltekit/storybook';
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
    setupFiles: ['vitest-plugin-sveltekit/vitest'],
  },
});
```

Plain Vitest has no `$app/*` mocks, so the setup file has small stand-ins of its own. Import them
from `vitest-plugin-sveltekit/vitest` when a test needs them:

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
  from `vitest-plugin-sveltekit/vitest` only goes to the remote-function requests; a
  component that imports `page` from `$app/state` gets SvelteKit's real, empty one. Mock the module
  in the test or a setup file:

  ```ts
  vi.mock('$app/state', () => ({
    page: { url: new URL('http://localhost/'), params: {}, data: { user: { name: 'Svelty' } } },
    navigating: null,
    updated: { current: false },
  }));
  ```

- **`$app/state` in Storybook.** `@storybook/sveltekit` mocks it. Set the page per story with
  `parameters: { sveltekit_experimental: { state: { page: { data: { ... } } } } }`.

- **Environment variables.** SvelteKit 3 checks the variables your `src/env.ts` declares, also in
  Storybook. If some are required, `storybook dev` and `storybook build` fail with `env_invalid`
  until they are set, for example in a `.env` file. In the page, private variables get only the
  values you pass to the plugin (see [Environment variables](#environment-variables)).

- **Submissions take time.** A form submission or a command goes through a request, so the spy is
  not called yet right after the click. Wait for the UI to change, or wait for the call:

  ```ts
  await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
  await waitFor(() => expect(mockRemote(createPost)).toHaveBeenCalled());
  ```

## Mock a remote function

`mockRemote(fn)` returns the spy behind a remote function. Import the remote function from your
`.remote.ts` file, the same import the component uses. The spy is typed from the remote function.

```ts
import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
import { getPosts } from '#lib/posts.remote';
```

In Storybook the spy is an `fn()` from `storybook/test`, so its calls show in the Actions panel; in
Vitest it is a `vi.fn()`. Use it in `beforeEach` (or at the start of a test), and assert on
it with `expect(mockRemote(getPosts)).toHaveBeenCalledWith('newest')`.

| You want                          | Write                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Data                              | `mockRemote(getPosts).mockResolvedValue(posts)`                              |
| Data that depends on the argument | `mockRemote(getPost).mockImplementation(async (id) => posts[id])`            |
| The pending state                 | `mockRemote(getPosts).mockPending()` (never settles)                         |
| An HTTP error                     | `mockRemote(getPosts).mockImplementation(() => error(404, 'Not found'))`     |
| The same, as a value              | `mockRemote(getPosts).mockRejectedValue(httpError(404, 'Not found'))`        |
| A redirect                        | `mockRemote(createPost).mockImplementation(() => redirect(303, '/posts/1'))` |
| A form validation issue           | see below                                                                    |

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
`mockRemote(getStats).mock.calls` has one entry per argument.
SvelteKit still sends one request for the whole batch.

**`form`**: the spy gets `(data, issue)`: `data` is the submitted form data as an object (schema
input), and `issue` reports issues with `invalid()`, as in the server handler:

```ts
mockRemote(createPost).mockImplementation(async (data, issue) => {
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
mockRemote(getPrices).mockImplementation(async function* () {
  yield 1;
  await new Promise((resolve) => setTimeout(resolve, 500));
  yield 2;
});

// A finite array: emits each value, then the stream is done
mockRemote(getPrices).mockReturnValue([1, 2]);

// A stream that the story or test drives
let feed: RemoteStream<number>;

export const Live = meta.story({
  beforeEach: () => {
    feed = mockRemote(getPrices).mockStream(1);
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
`mockRemote(fn)` mock run the code in your `.remote.ts` file, in the page: its validation schema, its
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
import { vitestPluginSvelteKit } from 'vitest-plugin-sveltekit/vite';
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

### Mock mode or server mode?

Mock mode, the default, loads no server module of a `.remote.ts` file: no database driver, no
private env and no server code in the browser. Every remote function is a `mockRemote(fn)` spy.
Use it for:

- components in each state (data, loading, empty, errors), set per story or test;
- a published Storybook that must not contain server code;
- fast tests that need nothing but the mocks.

Server mode (`server: true`) runs the real handlers in the browser, against what you mock, such as
the database with `sb.mock` or `vi.mock`. Use it for:

- validation as in the app: the schema, its defaults and transforms, and `invalid()` in your
  `.remote.ts` file;
- auth branches through `locals` (see [The request](#the-request-servermock));
- a published Storybook whose forms really work, on a mocked database.

What server mode costs:

- **Server code in the browser.** The handlers and the modules they import load in the page, and
  `storybook build` puts them into the static Storybook. Server packages, such as a database
  driver, must run in the browser or be mocked.
- **Env values only from the plugin.** See [Environment variables](#environment-variables).
- **One request at a time.** The browser has no `AsyncLocalStorage`, so real requests run one
  after the other (see [Server mode limitations](#server-mode-limitations)).

You can mix both: a function mocked with `mockRemote(fn)` stays a mock in server mode.

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

A function that a story or test mocks with `mockRemote(fn)` skips the real handler; the others run.
Both can be used in one story:

```ts
beforeEach: async () => {
  await resetDb([{ title: 'From the database' }]); // getPosts runs for real
  mockRemote(getStats).mockResolvedValue({ views: 99, likes: 9 }); // getStats is mocked
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

`getRequestEvent()` in your server code gets an event built from the request event that
`mockRequestEvent()` sets up. It is reset before each story and test:

```ts
import { mockRequestEvent } from 'vitest-plugin-sveltekit/server.mock';

beforeEach(() => {
  mockRequestEvent({
    cookies: { session: 'svelty' }, // sent with each request; `set-cookie` updates it
    locals: { user: { name: 'Svelty' } }, // copied into `event.locals`
    params: { id: '1' },
    url: new URL('http://localhost/posts/1'), // default: the page URL
  });
});
```

Each field you pass replaces the current value: `locals` is not merged, and `cookies` replaces the
contents of the jar. Fields you leave out keep their value. The fields are `locals`, `cookies`,
`params`, `route`, `url` and `platform`.

`mockRequestEvent()` returns the live event, like `mockRemote(fn)` returns the spy. Use it to check
what your server code wrote, or to change the event in a later step. Without arguments, it only
returns the event:

```ts
await signIn({ name: 'svelty', password: 'secret' });
expect(mockRequestEvent().cookies.get('session')).toBe('svelty');
```

Your `handle` hook runs around each request, as on a server, so it can read the cookies and fill
`locals`. The cookies work like a browser's: each request sends the cookies of the jar, and when it
answers, only what its handler set or deleted changes the jar. So a slower request does not undo a
login that finished first.

### Environment variables

Real `.env` values never reach the browser. In `storybook dev`, `storybook build` and Vitest,
`$app/env/private` (and the older `$env/static/private` and `$env/dynamic/private`) gives server
code only the values you pass to the plugin:

```ts
vitestPluginSvelteKit({ server: true, env: { API_URL: 'https://api.example.test' } });
```

A private variable without a value gets the default of its schema, or no value, and the plugin
prints a warning that names it. Public variables (`public: true`) keep the values the app gets,
from the `.env` files and the shell: SvelteKit sends them to the browser in the app too.

The plugin reads the names, and which variables are public, from `export const variables =
defineEnvVars({ ... })` in `src/env.ts`. If it cannot (a spread, a computed key), stories and
tests get no env values, and the plugin prints a warning.

To keep the values in a file, read it in the config:

```ts
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

vitestPluginSvelteKit({ server: true, env: parseEnv(readFileSync('.env.storybook', 'utf8')) });
```

> [!CAUTION]
> In server mode, a built Storybook contains the server code of your remote functions, the modules
> they import, and the values you pass in `env`, for everybody who can open it to read. Pass only
> values that may be public, and mock the modules that must stay private.

### Live queries and isolation

The request's `signal` is the signal of the client's `fetch`, so a real `query.live` generator that
watches `getRequestEvent().request.signal` stops when SvelteKit closes the stream: on `reconnect()`,
when the query's proxy is garbage collected (SvelteKit does not close it at unmount), and before
each story and test, when the package resets SvelteKit's caches. The example checks that no
generator still waits for changes between tests.

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
- **Mocks skip your schemas.** A mock gets the input as sent, before validation, defaults and
  transforms (see [What the spy gets](#what-the-spy-gets)). In server mode, the real handlers run
  with their schemas.
- **`getRequestEvent()` after an `await` sees the latest request.** Browsers have no async context,
  so the request store is kept until the next request starts. A mock that reads the event after an
  `await` while other requests run (two commands in flight, a live stream emitting) can get another
  request's event. The package itself reads the store only before the mock's first `await`.
- **`.for(id)` forms.** `mockRemote()` takes the form itself, not an instance from `.for(id)`. Both
  instances use the same mock.

## SvelteKit patch

SvelteKit's runtime for remote functions expects a SvelteKit app around it: the client calls the
router, and the server code runs inside SvelteKit's server. The package uses entries that a
proposed change to SvelteKit adds for tools like this one, and imports no SvelteKit file by path
except the two below:

- `@sveltejs/kit/internal/client`: `set_remote_env` (a different `fetch`, `page` and `goto`),
  `reset_remote_state` (clears the caches and form state between tests) and
  `refresh_remote_queries`.
- `@sveltejs/kit/internal/remote-client`: the client remote functions the stubs are built from.
- `@sveltejs/kit/internal/remote-server`: `init_remote_server`, `handle_remote_request`,
  `get_remote_id` and the server remote functions, to answer each request in the page.

Each request runs in `withRequestEvent` from `$app/server`, a second proposed change. The page cannot
import `$app/server`, so the package imports that one file by path until an entry the page can
import exports it. The package also points SvelteKit's `#app/env/server` at its server module in
the page, because SvelteKit maps it to a module that throws in the browser, on purpose.

Until these are released, use the patch from this repository. It is for one SvelteKit version, so
pin that version exactly. A range such as `^3.2.0` can keep an older version in your lockfile, and
then pnpm applies no patch.

1. Pin SvelteKit in `package.json`:

   ```json
   "devDependencies": {
     "@sveltejs/kit": "3.2.0"
   }
   ```

2. Copy [`patches/@sveltejs__kit@3.2.0.patch`](../../patches/@sveltejs__kit@3.2.0.patch) to the
   `patches/` folder of your project.

3. Tell pnpm about it in `pnpm-workspace.yaml`:

   ```yaml
   patchedDependencies:
     '@sveltejs/kit@3.2.0': patches/@sveltejs__kit@3.2.0.patch
   ```

   If you set `minimumReleaseAge`, pnpm refuses a SvelteKit version younger than that age. Exclude
   it until it is old enough:

   ```yaml
   minimumReleaseAgeExclude:
     - '@sveltejs/kit@3.2.0'
   ```

4. Run `pnpm install`. With npm or yarn, apply the same file with `patch-package`.

## Development

From the repository root: `pnpm --filter vitest-plugin-sveltekit build`, then see
[`examples/kit-app`](./examples/kit-app/README.md) for the example app and its tests.
