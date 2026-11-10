# @storybook/vite-plugin

## 0.2.0

### Minor Changes

- [#17](https://github.com/storybookjs/labs/pull/17) [`a9e0ac4`](https://github.com/storybookjs/labs/commit/a9e0ac4879ee61c6329844f583f95099a3b1ea79) Thanks [@huang-julien](https://github.com/huang-julien)! - Add an Angular CLI `dev-server` builder (`"builder": "@storybook/vite-plugin/angular:dev-server"`) and a `@storybook/vite-plugin/angular` entry exporting `createStorybookMiddleware`, so `ng serve` hosts Storybook on the same port.

- [#19](https://github.com/storybookjs/labs/pull/19) [`d43d431`](https://github.com/storybookjs/labs/commit/d43d43188e0e610ae992f17a9d8d4e58cd8343ef) Thanks [@huang-julien](https://github.com/huang-julien)! - Add a `@storybook/vite-plugin/nextjs` entry exporting `startNextDevServer`, which replaces `next dev` with a custom server that hosts Storybook on the same port, and `createStorybookMiddleware` for existing Next.js custom servers. The middleware from `@storybook/vite-plugin/angular` now also exposes `ownsUpgrade` and accepts an explicit `httpServer`.

## 0.1.0

### Minor Changes

- [#1](https://github.com/storybookjs/labs/pull/1) [`a506284`](https://github.com/storybookjs/labs/commit/a506284a822a9b9050d916ce5b8d46cfdd1801c1) Thanks [@huang-julien](https://github.com/huang-julien)! - Add the Vite plugin: run Storybook inside your app’s Vite dev server and serve it under a configurable base path (/__storybook by default), instead of starting a separate storybook dev process.

- [#11](https://github.com/storybookjs/labs/pull/11) [`0fdc873`](https://github.com/storybookjs/labs/commit/0fdc8737283ec7599647b7c51f25a983a5cf2ccf) Thanks [@huang-julien](https://github.com/huang-julien)! - Register the embedded Storybook in Storybook's runtime instance registry so `storybook tools` and the skills commands can find and attach to it while the host Vite server runs.

- [#16](https://github.com/storybookjs/labs/pull/16) [`0a322da`](https://github.com/storybookjs/labs/commit/0a322da8c78552cf4a0dd44a5384beca3d77e7f7) Thanks [@huang-julien](https://github.com/huang-julien)! - Require Storybook `11.0.0-beta.1` or later (including later 11.x prereleases) as a peer dependency.

### Patch Changes

- [#14](https://github.com/storybookjs/labs/pull/14) [`f150952`](https://github.com/storybookjs/labs/commit/f15095202444686d7a8f487db01d39383b32c0e6) Thanks [@huang-julien](https://github.com/huang-julien)! - Tag Storybook telemetry events with the plugin version and mode (embedded or dedicated), so `dev` and `build` runs through the Vite plugin can be told apart from the Storybook CLI.

- [#13](https://github.com/storybookjs/labs/pull/13) [`0654763`](https://github.com/storybookjs/labs/commit/0654763e62477eb21594e7a72a10158f7ace6cac) Thanks [@huang-julien](https://github.com/huang-julien)! - Start Storybook's change detection when the embedded Storybook starts, so `storybook tools stories changed` no longer hangs waiting for change-detection readiness against a host Vite server.
