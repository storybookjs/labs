# Vue example

A small Vue 3 + TypeScript app using `experimental_vitePlugin` from `@storybook/vue3-vite/node`.
The same typed button powers the reactive counter and two Storybook stories.

## Run from the repository root

Requires Node.js **22.19.0 or newer**. Install all workspaces together with `pnpm install`. The plugin package supplies Vite and
Playwright, the repository root supplies TypeScript and Node types; this workspace adds the Vue-specific tools.

| Root command                                                             | Result                                                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run dev`             | App at <http://localhost:5183/> and embedded Storybook at <http://localhost:5183/__storybook/>. |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run storybook`       | Dedicated Storybook at <http://localhost:5185/>; no host app.                                   |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run typecheck`       | Check TypeScript, Vue templates, stories, configurations, and browser tests with `vue-tsc`.     |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run build`           | Typecheck and build the host app only.                                                          |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run storybook:build` | Build static Storybook only.                                                                    |
| `pnpm --filter @storybookjs/vite-plugin-vue-example run test:e2e`        | Run the Chromium integration tests.                                                             |

Both Storybook dependencies use the **bd420ab3b60** canary: `storybook` and `@storybook/vue3-vite`.
The framework pulls the matching builder and Vue renderer. Do not substitute a stable release,
an arbitrary `11.0.0-alpha.0`, or the `create-storybook` scaffolder.

## Configuration and paths

The [Vite configuration](vite.config.ts) registers the host's Vue plugin alongside
`experimental_vitePlugin`, with options checked by `experimental_VitePluginUserOptions`.

| Option      | Example value        | Resolution                                                                                                                                 |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `configDir` | `.storybook`         | Relative to **`process.cwd()`**, not the Vite configuration file. pnpm workspace scripts run with this example as their working directory. |
| `base`      | `/__storybook`       | Embedded dev mount. Dedicated `--mode storybook` always serves at `/`.                                                                     |
| `outputDir` | `./storybook-static` | Relative to **Vite's project root**, which is this example when using its workspace scripts.                                               |

Do not run Vite from the repository root with only a configuration-file override: that does not
change its working directory or the meaning of `configDir`. Use the workspace commands above,
or change into this example before running its scripts.

The [Storybook configuration](.storybook/main.ts) selects `vue-component-meta`, supported by the
pinned canary, rather than relying on the deprecated docgen default. It also sets
`features: { docgenServer: false }` to work around an upstream race between the canary's
server-side docgen and the preview's HMR re-render, so the builder-docgen deprecation warning
on start is expected. The
[preview configuration](.storybook/preview.ts) centers stories. App-wide styling stays in
[App.vue](src/App.vue); the [button's scoped styles](src/Button.vue) work independently in the
preview. No wildcard Vue module shim is used: `vue-tsc` checks actual component props, events,
and templates.

## Browser coverage

Install Chromium once from the root with `pnpm exec playwright install chromium`, then build the
plugin and run `pnpm --filter @storybookjs/vite-plugin-vue-example run test:e2e`.

The suite starts fresh embedded and dedicated Vite processes on **5183** and **5185**. Stop
manual servers on those ports first: server reuse is disabled. Storybook telemetry is disabled
in the test processes. One worker serializes tests so a story edit cannot race another test.

Coverage includes the host's reactive count and reset button, the embedded mount redirect,
manager and standalone iframe rendering, both story indexes, story-edit HMR without losing
host state, and dedicated mode at the root. The HMR test reads the original story from this
example and restores those exact contents in `finally`; do not edit the fixture concurrently.

### Static build check

Static output is a separate validation step, not part of the dev-server browser suite. From
the repository root, run `STORYBOOK_DISABLE_TELEMETRY=1 pnpm --filter @storybookjs/vite-plugin-vue-example run storybook:build`,
then serve the output explicitly with
`pnpm --filter @storybookjs/vite-plugin-vue-example exec vite preview --outDir storybook-static --host 127.0.0.1 --port 5187 --strictPort`.

Check the manager at <http://127.0.0.1:5187/?path=/story/example-button--primary>, the index at
<http://127.0.0.1:5187/index.json>, and the standalone story at
<http://127.0.0.1:5187/iframe.html?id=example-button--secondary&viewMode=story>.
`vite preview` does not activate the plugin or choose Storybook output automatically; the
explicit `--outDir storybook-static` selects the previously built files. A normal app build
contains no embedded Storybook, so its Storybook link is for development only.
