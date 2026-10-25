# Angular CLI + Vite + Storybook on one HTTP server

A standalone Angular 21 application served by **Angular CLI**. `ng serve` owns the single
HTTP listener and compiles the app with `@angular/build`; a Vite dev server carrying the
Storybook plugin is mounted inside it as development-server middleware. There is no reverse
proxy, no second port, and no hand-written Node HTTP server.

The app uses `bootstrapApplication`, zoneless change detection, signal inputs, and a working
click counter. The app and the stories share `ButtonComponent`.

## Development

Use Node.js >=22.19.0. Install dependencies from the repository root, not from this workspace:

```sh
pnpm install
pnpm --filter @storybookjs/vite-plugin-angular-example run dev
```

| URL                                                                                     | Content                           |
| --------------------------------------------------------------------------------------- | --------------------------------- |
| http://127.0.0.1:5203/                                                                  | Angular host and reactive counter |
| http://127.0.0.1:5203/__storybook/                                                      | Embedded Storybook manager        |
| http://127.0.0.1:5203/__storybook/iframe.html?id=example-button--primary&viewMode=story | Standalone Angular story          |
| http://127.0.0.1:5203/__storybook/index.json                                            | Story index                       |

`/__storybook` redirects to `/__storybook/`, preserving the query string. Other routes are
left to Angular. `ng serve --port <n>` overrides the port.

## How the middleware is mounted

Angular CLI has no configuration flag for extra middleware, so this example ships a local
builder in [tools/builders](tools/builders) and points the workspace's `serve` target at it
in [angular.json](angular.json). The builder wraps `executeDevServerBuilder` from
`@angular/build` and passes the Storybook handler through its `middleware` extension, which
Angular installs in its own Vite server ahead of the application's HTML fallback.

Its [schema](tools/builders/dev-server-schema.json) mirrors the `@angular/build:dev-server`
options, so `ng serve` flags such as `--port`, `--watch`, and `--hmr` behave normally. Two
optional options are added, `storybookConfigDir` and `storybookBase`; without them the
mount comes from the constants the middleware exports.

The plugin needs the listening HTTP server in order to attach its WebSockets, and the
Angular dev-server builder never hands one out. The middleware therefore takes the server
from the socket of the first request addressed to the Storybook mount, and **Storybook boots
on first use**: the first request to `/__storybook/…` waits for that start-up, later ones do
not. A failed start-up is not cached, so the next request retries it.

WebSocket ownership is separated by path on the one listener:

| Upgrade path                   | Owner                                  |
| ------------------------------ | -------------------------------------- |
| `/` (Vite default)             | Angular CLI's own dev-server HMR       |
| `/__storybook/__storybook-hmr` | Storybook preview's Vite server        |
| `/storybook-server-channel`    | Storybook manager/server channel       |
| `/__host-vite-hmr`             | Storybook's host Vite; normally unused |

[tools/builders/storybook-middleware.js](tools/builders/storybook-middleware.js) creates
the Storybook Vite dev server itself rather than loading a Vite config, so the mount is
defined in one place. The host Vite server runs with no watcher and no dependency discovery:
Angular CLI compiles and watches the application, and Storybook's preview server watches
stories and components. The host applies `@angular/build`'s template HMR; the preview uses
Storybook's own Vite HMR (see the note on component edits below).

**Restart `ng serve` after editing `angular.json`, the local builder, Storybook, or
TypeScript configuration.**

## Commands

Run these from the repository root:

| Command                                                                      | Purpose                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run dev`             | `ng serve` with embedded Storybook, port 5203                         |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run storybook`       | Dedicated Storybook at http://127.0.0.1:5205/                         |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run typecheck`       | Angular app/template and story checks, then tooling TypeScript checks |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run build`           | Typecheck and production `ng build`                                   |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run storybook:build` | Static Storybook build                                                |
| `pnpm --filter @storybookjs/vite-plugin-angular-example run test:e2e`        | Chromium Angular-CLI-host and dedicated-mode tests                    |

Install the shared Playwright Chromium browser with `pnpm exec playwright install chromium` before
E2E tests. Tests use one worker, disable telemetry, refuse to reuse existing servers, and
start independent processes on ports 5203 and 5205. Stop manually started servers before
running them. Tests temporarily edit the story and component template and restore their
original contents in `finally`; avoid editing those files concurrently.

The tests cover the reactive app, embedded redirect/manager/iframe/index, stable same-port
server-channel sockets for both the manager and the preview, story-only HMR preserving host
state, a shared component template edit reaching both views, and dedicated Storybook root
routes.

Story edits hot-update the preview, and Angular CLI applies its own template update to the
host without a reload. Editing an Angular **component** does not currently update a running
preview: the `bd420ab3b60` canary's Angular preview picks the change up on the next iframe load,
not through an HMR push. That is the same in dedicated `vite --mode storybook`, so it is a
framework behavior rather than something the embedding causes. Arbitrary class changes are
not guaranteed to preserve component state.

## One mount, two entry points

[vite.config.ts](vite.config.ts) is not used by `ng serve` at all. It exists only for the
Vite-driven modes, `vite --mode storybook` and `vite build --mode storybook`, where Angular
CLI is not involved and the Storybook framework supplies the Angular compilation for the
preview. Both entry points import `STORYBOOK_BASE` and `STORYBOOK_CONFIG_DIR` from the
middleware, so there is a single source of truth for the mount.

[tsconfig.app.json](tsconfig.app.json) excludes stories from the host compiler;
[.storybook/tsconfig.json](.storybook/tsconfig.json) includes them in a separate preview
program. [.storybook/main.ts](.storybook/main.ts) uses the canary's typed AOT and
component-HMR options. Its renderer is zoneless by default. Compodoc is disabled; no
generated documentation file is required.

## Scope and limitations

- `executeDevServerBuilder` is marked experimental by Angular, and the `middleware`
  extension is documented as unsupported for direct use. Recheck this example when
  upgrading Angular.
- Taking the HTTP server from a request socket is a workaround for the missing hook, not a
  documented Angular contract.
- The framework is `@storybook/angular-vite`, not the webpack-based `@storybook/angular`.
  Both framework and Storybook runtime use canary `bd420ab3b60`. Angular runtime/compiler are
  pinned to 21.2.23 and Angular build/CLI/devkit to 21.2.24, whose exact Vite dependency
  (7.3.6) matches the Vite this workspace resolves; Analog is pinned to 2.7.2 and TypeScript
  to 5.9.3.
- This example does not demonstrate SSR, i18n, a proxy configuration, or remote development
  access. It binds to loopback.
