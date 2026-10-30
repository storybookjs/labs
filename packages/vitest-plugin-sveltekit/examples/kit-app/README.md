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
