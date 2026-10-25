# @storybookjs/vite-plugin

An experimental, ESM-only extraction of Storybook's Vite plugin. It embeds Storybook in an
existing Vite dev server and adds a dedicated Storybook dev/build mode.

## Installation

This package starts at version `0.0.0`; publication to npm is not assumed. Run `pnpm install`
at the labs repository root, then `pnpm pack` in `packages/vite-plugin`, and install the
resulting archive in your application. `pnpm pack` runs the package build automatically; use
pnpm rather than npm, because only pnpm applies the `publishConfig.exports` that point at `dist`.

Replace the archive path below with the actual local path. Install the matching canary core
and a Vite-based Storybook framework together:

```sh
npm install --save-dev /path/to/storybookjs-vite-plugin-0.0.0.tgz \
  vite@^7.3.1 \
  https://pkg.pr.new/storybook@bd420ab3b60 \
  https://pkg.pr.new/@storybook/react-vite@bd420ab3b60
```

After publication, `@storybookjs/vite-plugin` can replace the archive specifier.

- The required core canary is `https://pkg.pr.new/storybook@bd420ab3b60`.
- For React, use `https://pkg.pr.new/@storybook/react-vite@bd420ab3b60` and your application's
  React dependencies. Other frameworks must use a compatible Vite-based Storybook framework.
- The canary reports version `11.0.0-alpha.0`, which is the package's exact Storybook peer
  requirement. That version number alone does **not** identify the required canary contents;
  installing an arbitrary alpha or stable release is not equivalent.
- A `create-storybook` canary URL is a **scaffolder**, not the `storybook` runtime dependency.
  It cannot replace the core URL above.
- The inherited Vite peer range is `^6.3.0 || ^7.0.0 || ^8.0.0`; local development uses
  `^7.3.1`. Compatibility across the full range needs integration testing.

## Usage

Add the plugin alongside your existing application plugins in the Vite configuration:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  experimental_vitePlugin,
  type experimental_VitePluginUserOptions,
} from '@storybookjs/vite-plugin';

const storybookOptions = {
  configDir: '.storybook',
  base: '/__storybook',
} satisfies experimental_VitePluginUserOptions;

export default defineConfig({
  plugins: [react(), experimental_vitePlugin(storybookOptions)],
});
```

The React Vite plugin in this example belongs to the host application; install it there if
the application does not already use it. Keep your normal Storybook configuration, stories,
and compatible addons. For example, the Storybook main configuration can contain:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
};

export default config;
```

The package root exports only `experimental_vitePlugin` and the
`experimental_VitePluginUserOptions` type. The bundled preset is an internal entry and must
not be manually registered in Storybook.

### Modes

| Application command           | Behavior                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| `vite`                        | Host app at `/`, Storybook at `/__storybook/` by default, on the same port. |
| `vite --mode storybook`       | Storybook at `/`; the configured embedded `base` is ignored.                |
| `vite build --mode storybook` | Static Storybook build only; skips the host app build.                      |
| `vite build`                  | Normal host app build; the plugin does not activate.                        |
| `vite preview`                | Normal Vite preview; the plugin does not activate.                          |

For the usual port, visit `http://localhost:5173/__storybook/` in embedded mode or
`http://localhost:5173/` in dedicated mode. A bare embedded mount redirects to its
trailing-slash form, preserving the query string. Other host routes are left alone.

The preview uses a separate HMR path, `/__storybook-hmr`, on the shared HTTP server.
Storybook's server-channel upgrades are also forwarded through that server. Keep these
WebSocket routes available when placing the dev server behind a proxy. The plugin forwards
Vite's `server.allowedHosts`; keep an explicit allowlist when exposing a dev server.

Static output defaults to `storybook-static` beneath Vite's project root. Serve that output
with a static HTTP server; `vite preview` does not start Storybook or automatically select
its output directory.

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

| Example            | Host                                          | Embedded Storybook                 |
| ------------------ | --------------------------------------------- | ---------------------------------- |
| `examples/react`   | Vite (`vite`, plus a middleware-mode variant) | http://localhost:5173/__storybook/ |
| `examples/vue`     | Vite                                          | http://localhost:5183/__storybook/ |
| `examples/nextjs`  | Next.js with Turbopack, custom Node server    | http://127.0.0.1:5193/__storybook/ |
| `examples/angular` | Angular CLI `ng serve`, local `serve` builder | http://127.0.0.1:5203/__storybook/ |
| `examples/nuxt`    | Nuxt 4 `nuxt dev`, local Nuxt module          | http://127.0.0.1:5213/__storybook/ |

The Next.js, Angular, and Nuxt examples keep Vite in middleware mode behind the framework's own
development server, so the application toolchain, not Vite, compiles and serves the app.

Lint, formatting, typechecking, and unit tests run from the labs repository root (`pnpm lint`,
`pnpm fmt`, `pnpm typecheck`, `pnpm test`). Run these from `packages/vite-plugin`:

| Package command                | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `pnpm build`                   | Bundle the public entry and private preset with tsdown.                     |
| `pnpm dev`                     | Rebuild `dist` on change, for linking the package outside this repository.  |
| `pnpm typecheck`               | Check package source with TypeScript.                                       |
| `pnpm example:dev`             | Start the embedded React example.                                           |
| `pnpm example:storybook`       | Start the example in dedicated mode.                                        |
| `pnpm example:build`           | Build the normal example app.                                               |
| `pnpm example:storybook:build` | Build the example's static Storybook.                                       |
| `pnpm test:e2e`                | Run every example's Playwright suite.                                       |
| `pnpm test:e2e:react`          | Run only the React suite (`:vue`, `:nextjs`, `:angular`, `:nuxt` likewise). |

The example commands above target React; `example:vue:*`, `example:nextjs:*`,
`example:angular:*`, and `example:nuxt:*` are the equivalents for the other workspaces. The Next.js example
demonstrates the embedded mount only, so it has no `:storybook` aliases.

Install the browser used by the examples with `pnpm exec playwright install chromium` before E2E
tests. The workspace suites are responsible for browser-level embedded, dedicated, middleware,
HMR, restart, and static-output validation; unit tests alone do not establish those behaviors.

tsdown emits ESM `.mjs` entries and `.d.mts` declarations. It keeps package dependencies and
peers external, including Storybook's internal subpaths. Only `pathe` and `polka` are runtime
dependencies; Storybook and Vite remain peers. Playwright, Storybook, and Vite are package
development dependencies; Node types, TypeScript, Vitest, and tsdown come from the repository root.

Inside the workspace, `exports` point at `src`, so consumers load the TypeScript sources
directly; `publishConfig.exports` switches them to `dist` when packing. The preset resolves to
the sibling TypeScript entry from source and to the sibling `.mjs` entry in a built package.
Node 22.19+ can load the TypeScript sources. The `prepack` script runs the build.

 
