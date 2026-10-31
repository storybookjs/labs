# Field Notes: the SvelteKit example

Field Notes is a small blog, built to show `@storybookjs/vitest-plugin-sveltekit` on an app that
feels real. Readers browse posts (search, tag filter, sorting, pages), read a post (Markdown,
reading stats, a view count) and see a "N new posts" banner when someone publishes. Writers create,
edit and delete posts, with validation and drafts.

It uses every kind of SvelteKit remote function (`src/lib/blog/blog.remote.ts`):

| Function          | Kind          | Used for                                                    |
| ----------------- | ------------- | ----------------------------------------------------------- |
| `listPosts`       | `query`       | The post list with its filters, one page at a time          |
| `readPost`        | `query`       | A whole post                                                |
| `getReadingStats` | `query.batch` | Views and likes, one request for every card on the page     |
| `watchNewPosts`   | `query.live`  | The "N new posts" banner                                    |
| `publishPost`     | `form`        | New posts, with a valibot schema and `invalid()`            |
| `editPost`        | `form`        | Edits, one form instance per post (`editPost.for(id)`)      |
| `removePost`      | `command`     | Delete                                                      |
| `countView`       | `command`     | A view per visit, which refreshes the stats in its response |

## Run the app

Build the package first, from the repository root:

```sh
pnpm --filter @storybookjs/vitest-plugin-sveltekit build
```

Then, from this folder:

| Command        | Result                                                            |
| -------------- | ----------------------------------------------------------------- |
| `pnpm dev`     | The app with hot reload on `localhost:5173`                       |
| `pnpm build`   | A production build in `.svelte-kit/output`                        |
| `pnpm preview` | The production build on `localhost:4173` (run `pnpm build` first) |

No service, no Docker and no network: the database runs in the Node process. The build prints
"No adapter specified"; `pnpm preview` does not need one. To deploy the app somewhere, add a
SvelteKit adapter.

## The data

The app keeps its posts in [PGlite](https://pglite.dev) (Postgres in WebAssembly) through drizzle,
in the folder `.pglite` next to this README (`src/lib/server/db.ts`). Set `DATABASE_DIR` (in `.env`
or the shell) to keep it elsewhere. A new database gets the twelve posts in
`src/lib/server/seed.ts`, two of them drafts.

The live queries (the "new posts" banner, the live count) poll the database every 3 seconds
(`LIVE_POLL_MS` in `.env`). Vitest polls every 100 ms (`.env.test`) and Storybook every 250 ms
(`.storybook/main.ts`), so tests and stories do not wait.

To start over, stop the server and delete the folder:

```sh
rm -rf .pglite
```

Stories and tests never touch that folder: they replace `src/lib/server/db.ts` with
`src/lib/server/__mocks__/db.ts`, PGlite in memory, seeded in `beforeEach`.

## Where things are

| Folder               | What                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| `src/lib/ui`         | The design system: tokens (`tokens.css`, light and dark) and components  |
| `src/lib/blog`       | The product: remote functions, types, Markdown, and the post components  |
| `src/lib/pages`      | The pages the routes render, so stories can show them                    |
| `src/routes`         | The routes: `/`, `/posts/[id]`, `/posts/new`, `/posts/[id]/edit`, errors |
| `src/lib/components` | Small demos of each remote function kind (`src/lib/posts.remote.ts`)     |
| `src/lib/probes`     | Remote functions that pause at a gate, for the server mode overlap tests |

## Stories

Storybook runs in server mode (`.storybook/main.ts`): a remote function without a `remote(fn)` mock
runs its real handler on the in-memory database. The sidebar:

- `UI/…`: every design system component and its states. The toolbar's theme switch shows any story
  in dark mode.
- `Posts/…`: the product components, mocked (data, loading, empty, error, validation, long
  content), with `play` functions for the interactions, and one "Server mode" story each.
- `Pages/…`: Home, Post, Editor and the status pages inside the app shell, mocked and in server
  mode, with mobile and dark variants.
- `Remote functions/…`, `Server/…` and `Live/…`: the remote function demos, mocked and in server
  mode, and the "Live feed" panel (below).

Mocked stories also mock the commands they use: in server mode, an unmocked command runs for real.

## Tests

| Command         | What runs                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`     | Vitest browser mode, three projects: `components` (mocked tests), `server` (server mode tests), `storybook` (every story) |
| `pnpm test:app` | Playwright against the app: a production build on a fresh database in a temporary folder                                  |
| `pnpm test:e2e` | Playwright: the app, `storybook dev`, the static Storybook, the live panel and the Vitest runs                            |
| `pnpm test:ci`  | `svelte-check`, `pnpm test`, then the app and Storybook Playwright projects (for a CI job)                                |
| `pnpm check`    | `svelte-check`                                                                                                            |

The `storybook` project (`@storybook/addon-vitest`) runs every story in `src/**/*.stories.*`, with
its `play` function; no story is excluded. The app tests (`e2e-tests/app`) cover one flow per spec:
browse, read, create, edit, delete, validation, the live banner and the 404s.

`pnpm test:ci` is the script for the example's CI job, which is not in this repository yet: the
workflow that calls it waits in a separate commit, and the repository's `ci-checks.yml` leaves the
examples out.

The tests need Playwright's Chromium: run `pnpm exec playwright install chromium` in this folder
(the repository root has no Playwright). The Playwright servers use free ports, picked at the start
of a run; set `E2E_APP_PORT`, `E2E_STORYBOOK_PORT` or `E2E_STORYBOOK_STATIC_PORT` to choose them.
`--project` starts only that project's server (`pnpm test:app` is `--project app`). From the package
folder, `pnpm test:ci` and `pnpm example:test:app` run the same.

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
