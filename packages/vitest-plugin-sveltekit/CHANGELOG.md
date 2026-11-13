# vitest-plugin-sveltekit

## 0.0.1

### Patch Changes

- [#24](https://github.com/storybookjs/labs/pull/24) [`0ae3df2`](https://github.com/storybookjs/labs/commit/0ae3df2337a96021e1fd477639fa677d24534ae3) Thanks [@JReinhold](https://github.com/JReinhold)! - Link the README to the published Storybook of the example app.

- [#22](https://github.com/storybookjs/labs/pull/22) [`2e4d943`](https://github.com/storybookjs/labs/commit/2e4d9435f6a96eadd00c95509304e3b48b6a3c87) Thanks [@JReinhold](https://github.com/JReinhold)! - Rewrite the README: a shorter setup, then a complete example for unit tests, mocked remote functions and server mode, in Vitest and Storybook.

- [#6](https://github.com/storybookjs/labs/pull/6) [`f92556d`](https://github.com/storybookjs/labs/commit/f92556d80d3238806cbfb3586196dcd5d2963b65) Thanks [@JReinhold](https://github.com/JReinhold)! - Server mode: with `vitestPluginSvelteKit({ server: true })`, remote functions without a `mockRemote(fn)` mock run their real handlers in stories and tests, against the data layer you mock. `server: { include, exclude }` picks the remote files that bring their server code along, and `storybook build` prints what server code went into the output. `mockRequestEvent({ locals, cookies, ... })` from `./server.mock` sets up the request they run in and returns the live event. Private env values come only from the plugin's `env` option; real `.env` values never reach the browser. In Vitest's Node mode, remote functions are the real server modules, and a direct call in a test runs in the mock request event; `submitForm()` and `runInRequest()` help with forms and batched queries.

- [#23](https://github.com/storybookjs/labs/pull/23) [`0b5d362`](https://github.com/storybookjs/labs/commit/0b5d3622048f591087c8b78dc42d94fd570b9b15) Thanks [@JReinhold](https://github.com/JReinhold)! - Write the README's story snippets in Svelte CSF 4 (`preview.meta`), as exact copies of the example stories.

- [#5](https://github.com/storybookjs/labs/pull/5) [`8c8fab7`](https://github.com/storybookjs/labs/commit/8c8fab7840f6f9fb8057f60b456f14f00f805fed) Thanks [@JReinhold](https://github.com/JReinhold)! - First release: a Vite plugin that lets Storybook stories and Vitest browser tests use SvelteKit remote functions (`query`, `query.batch`, `query.live`, `form`, `command`, `prerender`) and mock them per story or test. Needs `@sveltejs/kit` 3.2.0 with the patch from the repository, until SvelteKit releases the entries the package uses.
