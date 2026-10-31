# @storybookjs/vitest-plugin-sveltekit

Render components that use [SvelteKit remote functions](https://svelte.dev/docs/kit/remote-functions)
in Storybook and in Vitest browser mode, with each remote function mocked per story or test.

```ts
remote(getPosts).mockResolvedValue([{ id: 1, title: 'Hello' }]);
```

The component runs SvelteKit's own client code for remote functions. Its requests go to SvelteKit's
own server code for remote functions, which runs in the same page and calls your mock instead of
the handler in your `.remote.ts` file. So `invalid()` issues, `error()`, `redirect()`, form state,
refreshes and `query.live` streams behave as they do in your app. Your schemas do not run (see
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
- **Your schemas do not run.** A mock gets the input as sent, before validation, defaults and
  transforms (see [What the spy gets](#what-the-spy-gets)).
- **Your handlers do not run.** This package mocks remote functions. Running the real handlers
  against a mocked database is planned.
- **`getRequestEvent()` after an `await` sees the latest request.** Browsers have no async context,
  so the request store is kept until the next request starts. A mock that reads the event after an
  `await` while other requests run (two commands in flight, a live stream emitting) can get another
  request's event. The package itself reads the store only before the mock's first `await`.
- **No custom `transport` types.** Values are serialised with devalue's built-in types only.
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
