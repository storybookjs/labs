# @storybook/vite-plugin

An experimental vite plugin to run Storybook and expose it through your vite server.

## Installation

```
pnpm i @storybook/vite-plugin
```

## Usage

Add the plugin alongside your existing application plugins in the Vite configuration:

```ts
import { defineConfig } from 'vite';
import {
  experimental_vitePlugin,
  type experimental_VitePluginUserOptions,
} from '@storybook/vite-plugin';

// default values
const storybookOptions: experimental_VitePluginUserOptions = {
  configDir: '.storybook',
  base: '/__storybook',
};

export default defineConfig({
  plugins: [experimental_vitePlugin(storybookOptions)],
});
```

### Modes

| Application command           | Behavior                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| `vite`                        | Host app at `/`, Storybook at `/__storybook/` by default, on the same port. |
| `vite --mode storybook`       | Storybook at `/`; the configured embedded `base` is ignored.                |
| `vite build --mode storybook` | Static Storybook build only; skips the host app build.                      |
| `vite build`                  | Normal host app build; the plugin does not activate.                        |
| `vite preview`                | Normal Vite preview; the plugin does not activate.                          |

### Middleware mode

Vite middleware mode has no `httpServer` of its own. Supply the actual HTTP server through
`server.hmr.server` so Storybook can attach its WebSockets. This loads the application's
existing Vite configuration containing the plugin:

```ts
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'vite';

const httpServer = createHttpServer();
const vite = await createServer({
  server: {
    middlewareMode: true,
    hmr: { server: httpServer },
  },
});

httpServer.on('request', vite.middlewares);
httpServer.listen(5173, '127.0.0.1');
```

When integrating an existing middleware host, mount `vite.middlewares` in that host instead.
For `appType: 'custom'`, the host remains responsible for its application HTML and fallback
routes. Close both Vite and the custom HTTP server during shutdown. Omitting the HTTP server
in middleware mode produces an explicit error rather than silently breaking HMR.

### Angular CLI

`ng serve` runs its own Vite server without loading a Vite configuration, so the plugin cannot be
added to it. Instead, point the `serve` target in `angular.json` at the builder this package
ships:

```json
"serve": {
  "builder": "@storybook/vite-plugin/angular:dev-server"
}
```

It accepts every `@angular/build:dev-server` option, plus `storybookConfigDir` (default
`.storybook`, relative to the project root) and `storybookBase` (default `/__storybook`). The app
and Storybook share one port; Storybook starts on the first request under its mount. Use
`@storybook/angular-vite` as the Storybook framework. Requires `@angular/build` 21.

For a custom builder, `createStorybookMiddleware` from `@storybook/vite-plugin/angular` returns
the same handler to pass through `executeDevServerBuilder`'s `middleware` extension.

### Next.js

Next.js has no dev-server plugin API, so Storybook is embedded through a custom development
server that replaces `next dev`. Use `@storybook/nextjs-vite` as the Storybook framework, then add
a `server.mjs` next to `next.config.*`:

```js
import { startNextDevServer } from '@storybook/vite-plugin/nextjs';

await startNextDevServer();
```

```json
"scripts": {
  "dev": "node server.mjs",
  "build": "next build",
  "start": "next start"
}
```

If you already run a Next.js custom server, use `createStorybookMiddleware({ root })` from the
same entry instead: call its `middleware` before Next's request handler, leave upgrade requests
for which `ownsUpgrade(pathname)` is true to Storybook, and `close()` it on shutdown.

### Options

| Option      | Default              | Meaning                                                                                                                                                                                                                  |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `configDir` | `.storybook`         | Storybook configuration directory, resolved against `process.cwd()`, **not** the Vite configuration file's directory. Absolute paths are accepted.                                                                       |
| `outputDir` | `./storybook-static` | Static output from `vite build --mode storybook`, resolved against Vite's project root. Absolute paths are accepted.                                                                                                     |
| `base`      | `/__storybook`       | Embedded dev mount path. Whitespace is trimmed, a leading slash is added, and trailing slashes are removed; `storybook/` becomes `/storybook`. `/` or an empty value mounts at the root. Dedicated mode always uses `/`. |

Storybook's configuration, static assets, addons, manager, story index, and preview continue
to be handled by its own builders and presets. Dev addon bundles use Storybook's cache, not
the static output directory. Existing Storybook telemetry behavior is preserved; set
`STORYBOOK_DISABLE_TELEMETRY=1` to disable it. The plugin avoids recursive activation and
does not activate under Vitest or when the Storybook CLI drives Vite.

## Development

Install dependencies once at the labs repository root with `pnpm install`; do not install each
workspace separately. The examples are pnpm workspace packages under `examples/*`:

| Example            | Host                                                                | Embedded Storybook                 |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------- |
| `examples/react`   | Vite (`vite`, plus a middleware-mode variant)                       | http://localhost:5173/__storybook/ |
| `examples/vue`     | Vite                                                                | http://localhost:5183/__storybook/ |
| `examples/nextjs`  | Next.js with Turbopack, `startNextDevServer`                        | http://127.0.0.1:5193/__storybook/ |
| `examples/angular` | Angular CLI `ng serve`, `@storybook/vite-plugin/angular:dev-server` | http://127.0.0.1:5203/__storybook/ |
| `examples/nuxt`    | Nuxt 4 `nuxt dev`, local Nuxt module                                | http://127.0.0.1:5213/__storybook/ |

The Next.js, Angular, and Nuxt examples keep Vite in middleware mode behind the framework's own
development server, so the application toolchain, not Vite, compiles and serves the app.

Lint, formatting, typechecking, and unit tests run from the labs repository root (`pnpm lint`,
`pnpm fmt`, `pnpm typecheck`, `pnpm test`). Run these from `packages/vite-plugin`:

| Package command                | Purpose                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `pnpm build`                   | Bundle the entries and private preset with tsdown; write the Angular builder manifest. |
| `pnpm dev`                     | Rebuild `dist` on change; the examples pick up each rebuild.                           |
| `pnpm typecheck`               | Check package source with TypeScript.                                                  |
| `pnpm example:dev`             | Start the embedded React example.                                                      |
| `pnpm example:storybook`       | Start the example in dedicated mode.                                                   |
| `pnpm example:build`           | Build the normal example app.                                                          |
| `pnpm example:storybook:build` | Build the example's static Storybook.                                                  |
| `pnpm test:e2e`                | Run every example's Playwright suite.                                                  |
| `pnpm test:e2e:react`          | Run only the React suite (`:vue`, `:nextjs`, `:angular`, `:nuxt` likewise).            |

The example commands above target React; `example:vue:*`, `example:nextjs:*`,
`example:angular:*`, and `example:nuxt:*` are the equivalents for the other workspaces. The Next.js example
demonstrates the embedded mount only, so it has no `:storybook` aliases.
