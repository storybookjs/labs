# SvelteKit example

A SvelteKit 3.1 app with remote functions (`src/lib/posts.remote.ts`): a `query` with a valibot
schema, a `form` with validation and `invalid()`, a `command`, a `prerender`, a `query.batch` and a
`query.live`. The components in `src/lib/components` use them, and each component has stories (CSF
and Svelte CSF) and Vitest browser tests that mock the remote functions with `remote()`.

Build the package first, from the repository root:

```sh
pnpm --filter @storybookjs/vitest-plugin-sveltekit build
```

Then, from this folder:

| Command                | Result                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| `pnpm dev`             | The real app with the real remote functions, on `localhost:5173`    |
| `pnpm storybook`       | Storybook on `localhost:6006`                                       |
| `pnpm storybook:build` | Static Storybook in `storybook-static`                              |
| `pnpm test`            | Vitest browser mode: the component tests and the stories            |
| `pnpm test:e2e`        | Playwright: `storybook dev`, the static build, and both Vitest runs |

The tests need Playwright's Chromium (`pnpm exec playwright install chromium` from the repository
root) and free ports 6106 and 6107.
