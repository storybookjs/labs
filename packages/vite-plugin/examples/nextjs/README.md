# Next.js + embedded Storybook

A real Next.js 16.3.5 App Router application using React 19.3.0. Next.js compiles
and serves the application; Vite compiles only the Storybook preview. In development,
both share one Node HTTP listener at **http://127.0.0.1:5193**.

- App: http://127.0.0.1:5193/
- Real Next route: http://127.0.0.1:5193/about
- Embedded Storybook: http://127.0.0.1:5193/__storybook/

## Setup and scripts

Use Node.js **22.19.0+**. Install dependencies once from the repository root with
`pnpm install`. Do not install separately inside this workspace. The framework and Storybook core both use the
matching `5170f92` canary, and Vite resolves to the root workspace's `^7.3.1`.

Run workspace scripts from the root using
`pnpm --filter @storybookjs/vite-plugin-nextjs-example run <script>`:

| Script      | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| `dev`       | Custom development server: Next + embedded Storybook on 5193         |
| `build`     | Normal Next.js production build; no Storybook integration            |
| `start`     | Normal Next.js production server on 5193                             |
| `typecheck` | Generate Next types, then check app and Storybook/tooling separately |
| `test:e2e`  | Run the embedded Chromium tests                                      |

`PORT` can override the custom development server's port. Do not run the development
and production application servers simultaneously on 5193.

This example covers the **embedded mount only**; there is no Vite config and no
`vite`-driven Storybook command here. The plugin's dedicated mode and static build are
demonstrated by the React, Vue, and Angular examples.

The [Counter](src/components/Counter.tsx) is a client component using `useState`
and `usePathname`. It lives in the shared layout, so incrementing and following the
Next Link to About preserves client state. The same component has default,
mocked-route, and interaction [stories](src/components/Counter.stories.tsx).
Styles use system fonts and do not fetch fonts from a network service.

## Development adapter

[storybook-middleware.mjs](storybook-middleware.mjs) owns the Storybook Vite dev server.
It creates it with `configFile: false` and passes the listening HTTP server through
`server.hmr.server`, so the mount is defined in one place instead of a Vite config.
[server.mjs](server.mjs) only owns the listener, the upgrade routing, and shutdown: it
hands every request to that middleware, which claims `/__storybook` and `/__storybook/…`
and calls `next()` for everything else, so other routes reach Next without URL rewriting.
The Storybook link is an ordinary development-only anchor, not a prefetched Next Link.

The Vite server starts on the first request to the mount, so `next dev` start-up does not
wait for Storybook and a failed start-up is retried rather than cached.

WebSocket ownership is deliberately separate:

| Upgrade path                   | Owner                              |
| ------------------------------ | ---------------------------------- |
| `/_next/hmr`                   | Next's real development router     |
| `/__storybook/__storybook-hmr` | Storybook preview's Vite server    |
| `/storybook-server-channel`    | Storybook manager/server channel   |
| `/__host-vite-hmr`             | Outer Vite server; normally unused |

[server.mjs](server.mjs) routes `/_next/…` upgrades and rejects anything neither side
claims, but it does not know the Storybook paths: it asks the middleware through
`ownsUpgrade()`, so the three Storybook sockets are declared once, next to the server
that serves them.

Next receives a second **non-listening** Node HTTP server as its `httpServer`
option. Its first request automatically attaches the real router-level HMR listener
there. Only `/_next/…` upgrades are forwarded to that target. Vite and Storybook
attach their own listeners to the actual server and never receive a forwarded socket
twice. The adapter does not use `getUpgradeHandler()`, whose underlying implementation
does not provide custom-server development HMR in this pinned Next version.

The outer Vite watcher is disabled and dependency discovery is off. Next watches
the application; Storybook's separate preview server watches stories and components.
The framework supplies its own React/Next Vite plugins: do not add another instance.

There is no `vite.config.ts`. The middleware creates the Vite server with
`configFile: false` and owns every setting the mount needs, so the whole Storybook
integration for this example is one file that `server.mjs` imports.

**Restart the Node process after editing Next, Vite, Storybook, TypeScript, or host
server configuration.** Automatic outer-Vite restarts are not supported here and can
accumulate Storybook channel listeners. Source-component and story edits use HMR.
SIGINT/SIGTERM shutdown is idempotent, destroys tracked connections including upgraded
sockets, closes both toolchains, and has a bounded exit deadline.

## Scope and limitations

- This adapter is **development-only**, not a general Next.js/Vite integration.
- Production uses `next build` and `next start`, not the custom server. Application
  code and Next configuration do not import Vite or Storybook.
  Embedded Storybook is absent in production; build and deploy it separately.
- This is not a recipe for `output: 'standalone'`, a production custom host, or running
  the custom server on Vercel. Normal Next deployment is a separate concern.
- Keep the default Next `basePath` and `assetPrefix`. Changing those, the Storybook
  mount, or HMR paths requires updating the explicit HTTP/upgrade routing together.
- The upgrade isolation is derived from Next 16.3.5 behavior, not an officially
  documented Next/Vite adapter contract. Recheck it when upgrading Next or Storybook.
- Stories mock App Router navigation via `nextjs.appDirectory: true`; the host app
  uses the real router. This example does not demonstrate RSC stories, Server Actions,
  authentication, proxy rewrites, or remote development access. It binds to loopback.

## Type checks and browser coverage

[tsconfig.json](tsconfig.json) includes only application source and generated Next
types, excluding stories. [tsconfig.storybook.json](tsconfig.storybook.json) checks
stories, Storybook configuration, the custom server, and E2E tooling separately.
`next typegen` creates the generated environment declarations; do not author or commit
them. Dependencies, generated Next output/types, TypeScript build info, test output,
and temporary fixture caches should be ignored by the repository tooling.

Browser tests use the root Playwright 1.58.2 installation and its Chromium browser
(`pnpm exec playwright install chromium` from the root). Leave port 5193 free. Tests start and stop their own servers; they never reuse an
unrelated running server.

The embedded suite runs a copied app inside this example's temporary cache, restores
every source mutation in `finally`, and removes the copy after stopping the server.
It covers Next HTML/hydration/client navigation, manager/index/standalone iframe,
prefix redirects, simultaneous Next/Storybook sockets in both browser load orders,
story-only HMR preserving host state, shared-component HMR, and shutdown/rebinding
the same port. Production validation is separate from this development suite.

References: [Next custom servers](https://nextjs.org/docs/app/guides/custom-server),
[Next TypeScript](https://nextjs.org/docs/app/api-reference/config/typescript), and
[Storybook's Next/Vite framework](https://storybook.js.org/docs/get-started/frameworks/nextjs-vite).
