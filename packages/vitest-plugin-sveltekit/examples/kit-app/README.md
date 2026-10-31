# SvelteKit example

A SvelteKit 3.1 app with remote functions (`src/lib/posts.remote.ts`): a `query` with a valibot
schema, a `form` with validation and `invalid()`, a `command`, a `prerender`, a `query.batch` and a
`query.live` that polls the database. The data layer is drizzle on PGlite (`src/lib/server/db.ts`),
and `src/hooks.server.ts` reads a session cookie into `locals.user`.

Each component in `src/lib/components` has:

- stories and Vitest browser tests that mock the remote functions with `remote()` (the default
  mode);
- in `server/`, stories and tests that run the real remote functions (server mode) on PGlite in
  memory (`src/lib/server/__mocks__/db.ts`), seeded in `beforeEach`.

Storybook runs in server mode (`.storybook/main.ts`), so it shows both kinds of stories. Vitest has
three projects in `vite.config.ts`: `components` (mocks), `server` (server mode) and `storybook`
(the stories).

Build the package first, from the repository root:

```sh
pnpm --filter @storybookjs/vitest-plugin-sveltekit build
```

Then, from this folder:

| Command                | Result                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `pnpm dev`             | The real app with the real remote functions, on `localhost:5173`   |
| `pnpm storybook`       | Storybook on `localhost:6006`                                      |
| `pnpm storybook:build` | Static Storybook in `storybook-static`                             |
| `pnpm test`            | Vitest browser mode: the three projects                            |
| `pnpm test:e2e`        | Playwright: `storybook dev`, the static build, and the Vitest runs |
| `pnpm check`           | `svelte-check`                                                     |

The tests need Playwright's Chromium (`pnpm exec playwright install chromium` from the repository
root) and free ports 6106 and 6107.

## The "Live feed" panel

Storybook has a "Live feed" addon panel that drives the `query.live` of two stories, `Live/Mocked`
and `Live/Server` (`src/lib/components/LiveFeed.stories.ts`). Both show `LiveFeed.svelte`: the
post count, the latest three posts, the stream's state and the time of the last update.

Open one of the stories, open the panel, pick a template, edit the JSON and press Send. The log
shows what was sent, what the story did, and what the component shows afterwards. The panel shows
which mode the story is in, and offers the templates of that mode:

| Story         | `getFeed`                                                                                        | Send                                            | Templates                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Live/Mocked` | `remote(getFeed).mockStream()`                                                                   | Emits the value to the open stream              | Good data; Invalid data (fails `checkFeed`, like the real handler, so the stream fails with 422); Error (`httpError(status, message)`); End stream                                   |
| `Live/Server` | The real generator in `src/lib/feed.remote.ts`, polling the mocked database every `LIVE_POLL_MS` | Changes the database; the next poll sends it on | Insert post; Delete latest post; Set count to N; Invalid data (a post without a title fails the handler's check: 422); Error (the mocked database goes down: 503); Database up again |

After an error or the end, the stream is closed. In `Live/Server`, fix the data (delete the post,
or bring the database up) and press Reconnect in the component. In `Live/Mocked`, `mockStream`
also fails or ends the later connections, so open another story and come back to start over. "End
stream" exists only in mocked mode: the real generator polls until the client disconnects.

The panel is built into `.storybook/`:

- `manager.ts`: the panel, plain React (Storybook's manager provides `react`).
- `live-panel/preview.ts`: `connectLivePanel(mode, handler)`, called in each story's `beforeEach`.
  Storybook runs its cleanup before the next story, so the panel starts over with each story.
- `live-panel/shared.ts`: the channel events and the templates.

`e2e-tests/live-panel.spec.ts` drives the panel in `storybook dev` and in the static build.
