# Nuxt + Vite + Storybook on one HTTP server

A Nuxt 4.6.2 application served by **`nuxt dev`**, Nuxt's own development server (Nitro
2.13.4, Vite 8.3.4, Vue 3.5.44). Nuxt owns the single HTTP listener and compiles the app
with its own Vite servers; a separate Vite dev server carrying the Storybook plugin is
mounted inside it as a development-only server handler. There is no reverse proxy, no
second port, and no hand-written Node HTTP server.

The page is server-rendered and hydrated, with a working click counter. The page and the
stories share [CounterButton.vue](app/components/CounterButton.vue).

## Development

Use Node.js >=22.19.0. Install dependencies from the repository root, not from this workspace:

```sh
pnpm install
pnpm --filter @storybookjs/vite-plugin-nuxt-example run dev
```

| URL                                                                                             | Content                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------ |
| http://127.0.0.1:5213/                                                                          | Nuxt page and reactive counter |
| http://127.0.0.1:5213/__storybook/                                                              | Embedded Storybook manager     |
| http://127.0.0.1:5213/__storybook/iframe.html?id=example-counter-button--primary&viewMode=story | Standalone story               |
| http://127.0.0.1:5213/__storybook/index.json                                                    | Story index                    |

`/__storybook` redirects to `/__storybook/`, preserving the query string. Other routes are
left to Nuxt. `nuxt dev --port <n>` overrides the port.

## How the middleware is mounted

A local Nuxt module, [modules/storybook.ts](modules/storybook.ts), is registered
automatically from `modules/`. It does nothing outside `nuxt dev`, and uses three Nuxt
hooks:

| Hook                                 | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `addDevServerHandler()` (`nuxt/kit`) | Mounts the Storybook handler, wrapped with h3's `fromNodeMiddleware`, in Nitro |
| `nuxt.hook('listen', (server) => …)` | Hands the listening Node HTTP server to the middleware                         |
| `nuxt.hook('close', …)`              | Closes the Storybook Vite server when Nuxt closes or reloads                   |

Development server handlers run in Nitro's development app ahead of the application
renderer, after Nuxt's own Vite middleware, which passes `/__storybook/…` through untouched.
The handler claims `/__storybook` and `/__storybook/…` and calls `next()` for everything
else, so other routes reach Nuxt without URL rewriting.

[storybook-middleware.ts](storybook-middleware.ts) creates the Storybook Vite dev server
itself, in middleware mode with `configFile: false`, and passes the server from the `listen`
hook through `server.hmr.server`. The server starts on the first request to the mount, so
`nuxt dev` start-up does not wait for Storybook and a failed start-up is retried rather than
cached. Nuxt's own Vite configuration is not modified.

WebSocket ownership is separated by path on the one listener:

| Upgrade path                   | Owner                                  |
| ------------------------------ | -------------------------------------- |
| `/_nuxt/`                      | Nuxt's client Vite HMR                 |
| `/__storybook/__storybook-hmr` | Storybook preview's Vite server        |
| `/storybook-server-channel`    | Storybook manager/server channel       |
| `/__host-vite-hmr`             | Storybook's host Vite; normally unused |
| anything else                  | Nitro, which proxies it to its worker  |

That last row is why the middleware also wraps the upgrade listeners Nuxt has registered
when `listen` fires. `nuxt dev` forwards every upgrade outside `/_nuxt/` to Nitro, which
proxies it to the Nitro worker; for Storybook's paths that proxy runs alongside Storybook's
own handler and tears the socket down. With the wrapper removed, the manager never renders
the story and the three socket-dependent E2E tests fail. The wrapper only skips the three
Storybook paths; Nuxt and Nitro still receive every other upgrade.

### No proxy in front of `nuxt dev`

`@nuxt/cli` 4.0.1 serves the first Nuxt instance from the CLI process itself, so the
`listen` hook receives the public listener. When a configuration change needs a hard
restart, the CLI starts a forked child that binds the same port, taking it over with
`SO_REUSEPORT` where supported and otherwise after the old server closes. Neither path puts an HTTP proxy in front of
Nuxt, so the WebSockets above connect directly to the process that owns the port. The E2E
suite asserts that the manager and the preview each hold one server-channel socket on
port 5213 and that both stay open.

A restarted process loads this module again and boots Storybook again on its first request.
The suite does not cover restarts; see the root README's canary restart note.
**Restart `nuxt dev` after editing the module, the middleware, or Storybook configuration.**

## Commands

Run these from the repository root:

| Command                                                                   | Purpose                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run dev`             | `nuxt dev` with embedded Storybook, port 5213           |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run storybook`       | Dedicated Storybook at http://127.0.0.1:5215/           |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run typecheck`       | `nuxt typecheck`: app, server, Nuxt config, and tooling |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run build`           | Typecheck and production `nuxt build`                   |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run storybook:build` | Static Storybook build                                  |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run test:e2e`        | Chromium `nuxt dev` and dedicated-mode tests            |

Install the shared Playwright Chromium browser with `pnpm exec playwright install chromium` before
E2E tests. Tests use one worker, disable telemetry, refuse to reuse existing servers, and
start independent processes on ports 5213 and 5215. Stop manually started servers before
running them. Tests temporarily edit the story and the shared component and restore their
original contents in `finally`; avoid editing those files concurrently.

The tests cover the server-rendered page and its hydrated counter, the embedded
redirect/manager/iframe/index, stable same-port server-channel sockets for both the manager
and the preview, story-only edits preserving host state, a shared component edit reaching
both views, and dedicated Storybook root routes. Clicks wait for the page's "Reactive" badge,
which only appears after hydration.

Nuxt applies Vue HMR to the page without a reload, so the counter survives a component edit.
The Storybook preview applies story and component edits through Vite HMR as well.
[.storybook/main.ts](.storybook/main.ts) sets `features: { docgenServer: false }`: the
`bd420ab3b60` canary's server-side docgen, now the default for Vue, makes the first story
teardown block on the cold docgen extraction and races the preview's HMR re-render, which
leaves the story stuck and logs `cannot render when not prepared` in the iframe. The
builder-docgen path therefore logs a deprecation warning on start. The same file keeps
`.nuxt/` and `.output/` out of the preview watcher, so Nuxt's own rebuilds do not reload the
preview as well.

## One mount, two entry points

[vite.config.ts](vite.config.ts) is not used by `nuxt dev` at all. It exists for the
Vite-driven modes, `vite --mode storybook` and `vite build --mode storybook`, and Storybook's
preview loads it for `@vitejs/plugin-vue`, which `@storybook/vue3-vite` does not add itself.
Both entry points import `STORYBOOK_BASE` and `STORYBOOK_CONFIG_DIR` from the middleware, so
there is a single source of truth for the mount. Nuxt notices the file and prints a
`NUXT_B5004` "external configuration files are not supported" warning; that is expected,
because Nuxt never loads it.

Nuxt brings its own Vite 8 through `@nuxt/vite-builder`. This workspace declares
`vite ^7.3.1`, the same as the repository root and the other examples, so Storybook, the
plugin, and the `vite` command resolve 7.3.6 while Nuxt keeps 8.3.4; pnpm installs both
side by side. The two never share a server: Nuxt's Vite builds the app, and the Storybook
Vite servers build only the manager and preview.

[nuxt.config.ts](nuxt.config.ts) adds `**/*.stories.ts` to Nuxt's `ignore` list so stories
are never registered as components or pages, and turns off Nuxt DevTools and telemetry.
[tsconfig.json](tsconfig.json) references Nuxt's generated app, server, shared, and node
projects plus [tsconfig.tooling.json](tsconfig.tooling.json) for the middleware, Vite,
Storybook, and Playwright files; `nuxt typecheck` builds all of them with `vue-tsc`.

## Scope and limitations

- The framework is `@storybook/vue3-vite` with Nuxt as the host only. Stories are plain Vue 3
  stories: Nuxt auto-imports, composables (`useNuxtApp`, `useFetch`, …), `NuxtLink`, plugins,
  and runtime config are **not** available in them. The shared component imports what it
  uses explicitly. `@storybook-vue/nuxt` would provide a Nuxt context, but it requires
  `storybook ^10.6`, while this repository uses the `11.0.0-alpha.0` canary.
- Both framework and Storybook runtime use canary `bd420ab3b60`; Nuxt is pinned to 4.6.2.
- Mounting a Node middleware through `addDevServerHandler` and taking the server from the
  `listen` hook are public Nuxt APIs. Re-wrapping the upgrade listeners `nuxt dev` registered
  is not: it depends on `@nuxt/cli` 4.0.1 and Nitro 2.13.4 behavior. Recheck it when upgrading.
- The module is development-only. `nuxt build` output contains no Storybook; build and deploy
  the static Storybook separately.
- This example does not demonstrate SSR of stories, Nuxt layers, a proxy configuration, or
  remote development access. It binds to loopback.
