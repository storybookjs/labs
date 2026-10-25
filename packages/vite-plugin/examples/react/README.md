# React example

A React 19 + TypeScript app using `experimental_vitePlugin` from `@storybook/react-vite/node`.
There are no source aliases or links to a Storybook checkout.

Install dependencies from the repository root first. Vite,
TypeScript, Node types, and Playwright are provided by the root workspace.

Run these commands from the repository root:

| Command                                                                    | Result                                                                     |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm --filter @storybookjs/vite-plugin-react-example run dev`             | App at `http://localhost:5173/`, Storybook at `/__storybook/`              |
| `pnpm --filter @storybookjs/vite-plugin-react-example run dev:middleware`  | Custom HTTP host on `http://127.0.0.1:5176/`, Storybook at `/__storybook/` |
| `pnpm --filter @storybookjs/vite-plugin-react-example run storybook`       | Storybook at the Vite server root                                          |
| `pnpm --filter @storybookjs/vite-plugin-react-example run build`           | Typecheck the app, configuration, and tests; build the app                 |
| `pnpm --filter @storybookjs/vite-plugin-react-example run storybook:build` | Static Storybook build                                                     |
| `pnpm --filter @storybookjs/vite-plugin-react-example run test:e2e`        | All 18 Playwright tests                                                    |

The tests require Playwright's Chromium browser and free ports 5173, 5175, and 5176. They run one worker across embedded Storybook, Storybook-only mode, and a
custom middleware host. Coverage includes preview rendering, indexing, HMR
isolation, syntax-error overlays, sourcemaps, unknown-module 404s, WebSockets,
and host-server restart recovery. HMR tests temporarily edit only this example
and restore files in `finally`; do not edit the fixture during a run. Storybook
telemetry is disabled for all test servers.

Both Storybook dependencies use the `bd420ab3b60` canary. Keep them aligned: the
published React framework supplies its matching builder and renderer. The
restart regression must retain a working server channel and preview HMR after
Vite reloads its configuration; do not skip it to work around canary mismatches.
