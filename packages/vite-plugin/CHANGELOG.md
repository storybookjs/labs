# @storybook/vite-plugin

## 0.1.0

### Minor Changes

- [#1](https://github.com/storybookjs/labs/pull/1) [`a506284`](https://github.com/storybookjs/labs/commit/a506284a822a9b9050d916ce5b8d46cfdd1801c1) Thanks [@huang-julien](https://github.com/huang-julien)! - Add the Vite plugin: run Storybook inside your app’s Vite dev server and serve it under a configurable base path (/__storybook by default), instead of starting a separate storybook dev process.

- [#11](https://github.com/storybookjs/labs/pull/11) [`0fdc873`](https://github.com/storybookjs/labs/commit/0fdc8737283ec7599647b7c51f25a983a5cf2ccf) Thanks [@huang-julien](https://github.com/huang-julien)! - Register the embedded Storybook in Storybook's runtime instance registry so `storybook tools` and the skills commands can find and attach to it while the host Vite server runs.

### Patch Changes

- [#14](https://github.com/storybookjs/labs/pull/14) [`f150952`](https://github.com/storybookjs/labs/commit/f15095202444686d7a8f487db01d39383b32c0e6) Thanks [@huang-julien](https://github.com/huang-julien)! - Tag Storybook telemetry events with the plugin version and mode (embedded or dedicated), so `dev` and `build` runs through the Vite plugin can be told apart from the Storybook CLI.

- [#13](https://github.com/storybookjs/labs/pull/13) [`0654763`](https://github.com/storybookjs/labs/commit/0654763e62477eb21594e7a72a10158f7ace6cac) Thanks [@huang-julien](https://github.com/huang-julien)! - Start Storybook's change detection when the embedded Storybook starts, so `storybook tools stories changed` no longer hangs waiting for change-detection readiness against a host Vite server.
