# Nuxt + Vite + Storybook on one HTTP server

A Nuxt 4.6.2 application served by **`nuxt dev`**, Nuxt's own development server (Nitro
2.13.4, Vite 8.3.5, Vue 3.5.44). Nuxt owns the single HTTP listener and compiles the app
with its own Vite servers; [nuxt.config.ts](nuxt.config.ts) adds the Storybook plugin to
Nuxt's client Vite server in development. There is no Vite config file, no reverse proxy, no
second port, and no hand-written Node HTTP server.

The page is server-rendered and hydrated, with a working click counter. The page and the
stories share [CounterButton.vue](app/components/CounterButton.vue). Storybook uses the
[`@storybook-vue/nuxt`](https://github.com/nuxt-modules/storybook) framework, so the preview
takes its Vue plugin, auto-imports, and Nuxt app context from [nuxt.config.ts](nuxt.config.ts).

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

## How the plugin is mounted

[nuxt.config.ts](nuxt.config.ts) declares an inline module that does nothing outside
`nuxt dev`. Its `vite:extendConfig` hook adds `experimental_vitePlugin` to the client Vite
config only.

Nuxt's client Vite server runs in middleware mode, and Nitro's development app passes every
request through its middleware stack before the application renderer. The plugin's handler
claims `/__storybook` and `/__storybook/…` and calls `next()` for everything else, so other
routes reach Nuxt without URL rewriting. Nuxt sets the client server's `server.hmr.server` to
its listener, which the plugin uses for its WebSockets. The SSR Vite server never receives the
plugin, and `nuxt build` and `nuxt typecheck` never register it.

The plugin starts Storybook while Nuxt creates its client Vite server, so `nuxt dev` reports
ready only once the manager and the preview have started.

WebSocket ownership is separated by path on the one listener:

| Upgrade path                      | Owner                                 |
| --------------------------------- | ------------------------------------- |
| `/_nuxt/storybook-server-channel` | Storybook manager/server channel      |
| `/_nuxt/__storybook-hmr`          | Storybook preview's Vite server       |
| `/_nuxt/…` otherwise              | Nuxt's client Vite HMR                |
| anything else                     | Nitro, which proxies it to its worker |

`nuxt dev` hands only upgrades under the client `base`, `/_nuxt/`, to Vite and forwards every
other upgrade to Nitro. Because the client server runs in middleware mode under that base,
the plugin moves both Storybook sockets under it, so Nitro never proxies them alongside
Storybook's own handler. Storybook's default root paths would make the first preview HMR
connection fail `nuxt dev` with `ERR_STREAM_WRITE_AFTER_END` and restart it in a loop.

### No proxy in front of `nuxt dev`

`@nuxt/cli` 4.0.1 serves the first Nuxt instance from the CLI process itself, so the
`listen` hook receives the public listener. When a configuration change needs a hard
restart, the CLI starts a forked child that binds the same port, taking it over with
`SO_REUSEPORT` where supported and otherwise after the old server closes. Neither path puts an HTTP proxy in front of
Nuxt, so the WebSockets above connect directly to the process that owns the port. The E2E
suite asserts that the manager and the preview each hold one server-channel socket on
port 5213 and that both stay open.

A restarted process registers the plugin again and boots Storybook again with its client Vite
server. The suite does not cover restarts; see the root README's canary restart note.
**Restart `nuxt dev` after editing `nuxt.config.ts` or Storybook configuration.**

## Commands

Run these from the repository root:

| Command                                                                   | Purpose                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run dev`             | `nuxt dev` with embedded Storybook, port 5213           |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run storybook`       | `storybook dev` at http://127.0.0.1:5215/               |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run typecheck`       | `nuxt typecheck`: app, server, Nuxt config, and tooling |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run build`           | Typecheck and production `nuxt build`                   |
| `pnpm --filter @storybookjs/vite-plugin-nuxt-example run storybook:build` | `storybook build`: static Storybook                     |
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
The Storybook preview applies story and component edits through Vite HMR as well; the first
component edit after start-up may reload the preview iframe once.
[.storybook/main.ts](.storybook/main.ts) sets `features: { docgenServer: false }`: the
`5170f92` canary's server-side docgen, now the default for Vue, makes the first story
teardown block on the cold docgen extraction and races the preview's HMR re-render, which
leaves the story stuck and logs `cannot render when not prepared` in the iframe. The
builder-docgen path therefore logs a deprecation warning on start. The same file keeps
`.nuxt/` and `.output/` out of the preview watcher, so Nuxt's own rebuilds do not reload the
preview as well.

## Dedicated mode

Without a Vite config there is no `vite --mode storybook`: Nuxt drives its own Vite servers,
not the `vite` command. Dedicated mode is the Storybook CLI, `storybook dev` and
`storybook build`, which is `@storybook-vue/nuxt`'s usual path. There Nuxt is only loaded by
the framework, with `dev: false`, so the plugin is never registered. The framework already
supplies the whole Vite config, so [.storybook/main.ts](.storybook/main.ts) sets the
builder's `viteConfigPath` to `null` instead of letting Storybook look for one in a parent
directory.

## Preview configuration from Nuxt

When the preview's Vite server starts, `@storybook-vue/nuxt` loads this Nuxt app a second
time, in the same process, with `loadNuxt({ dev: false })` and `buildNuxt`. It stops the build
once Nuxt has resolved its client Vite config, and merges that config, plugins included, into
the preview. The nested instance does not disturb the running `nuxt dev`:

- Outside development, `@nuxt/kit` moves the build directory to
  `node_modules/.cache/nuxt/.nuxt` whenever `.nuxt/` already exists, which `nuxt prepare`
  and `nuxt dev` guarantee. `.nuxt/` is unchanged while the embedded preview boots.
- The module in [nuxt.config.ts](nuxt.config.ts) returns early when `dev` is false, so the
  nested instance copies no Storybook plugin into the preview and mounts no second Storybook.

Because the copied config is a production one, [.storybook/main.ts](.storybook/main.ts)
restores development behavior for `storybook dev`: it sets `mode` and `process.env.NODE_ENV`
back to `development`, so Vue's runtime supports HMR. It drops `nuxt:dev-server`, which turns
HMR off. It discards the `base: './'` that `nuxt:environments` returns, which would replace
the `/__storybook/` mount. The static build keeps Nuxt's production settings.

The copied plugins were built for Nuxt's Vite 8, so this workspace declares `vite ^8.3.4`, the
range `@nuxt/vite-builder` 4.6.2 uses, and Nuxt and Storybook share 8.3.5.
With the Vite 7 used by the other examples, the preview fails on Rolldown-only plugins
(`builtin:replace`). The Nuxt app and Storybook still never share a server: Nuxt's Vite servers
build the app, and Storybook's preview Vite server builds only the stories.

[nuxt.config.ts](nuxt.config.ts) adds `**/*.stories.ts` to Nuxt's `ignore` list so stories
are never registered as components or pages, and turns off Nuxt DevTools and telemetry.
[tsconfig.json](tsconfig.json) references Nuxt's generated app, server, shared, and node
projects plus [tsconfig.tooling.json](tsconfig.tooling.json) for the Storybook and Playwright
files; `nuxt typecheck` builds all of them with `vue-tsc`. In this workspace Nuxt's types
resolve the hoisted Vite+ `vite`, so the `vite:extendConfig` hook takes a structural config
type rather than comparing two copies of Vite's plugin types.

## Scope and limitations

- The framework is `@storybook-vue/nuxt`, so stories run inside a Nuxt app context:
  auto-imports, composables (`useNuxtApp`, `useFetch`, …), `NuxtLink`, plugins, and runtime
  config are available. The published release requires `storybook ^10.6`, so this example
  uses the Storybook 11 build of nuxt-storybook `abd2784` from pkg.pr.new.
- Storybook and `@storybook/vue3-vite` use canary `5170f92`; Nuxt is pinned to 4.6.2.
  nuxt-storybook asks for `^11.0.0-alpha.5` of `@storybook/builder-vite`, `@storybook/vue3`,
  and `@storybook/vue3-vite`, which npm would satisfy with a second Storybook. The root
  [pnpm-workspace.yaml](../../../../pnpm-workspace.yaml) overrides those three, for
  `@storybook-vue/nuxt` only, to the same canary.
- The plugin is the workspace's `@storybookjs/vite-plugin`, consumed as a build. Run
  `pnpm --filter @storybookjs/vite-plugin run dev` while editing it; see the plugin README.
- The preview corrections in `.storybook/main.ts` match plugins by name and depend on
  `@nuxt/vite-builder` 4.6.2 behavior. Recheck them when upgrading Nuxt or nuxt-storybook.
- `vite:extendConfig` is a public Nuxt hook. The plugin relies on Nuxt's client Vite server
  running in middleware mode with `server.hmr.server` set to the listener, and on Nitro
  passing every request through it, which is `@nuxt/vite-builder` 4.6.2 behavior. It also
  relies on the default `experimental.viteEnvironmentApi: false`, which keeps a separate
  client Vite config, and on `@nuxt/cli` 4.0.1 routing upgrades under `/_nuxt/` to Vite.
  Recheck these when upgrading.
- The registration is development-only. `nuxt build` output contains no Storybook; build and
  deploy the static Storybook separately.
- This example does not demonstrate SSR of stories, Nuxt layers, a proxy configuration, or
  remote development access. It binds to loopback.
