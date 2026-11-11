---
'vitest-plugin-sveltekit': minor
---

Server mode: with `vitestPluginSvelteKit({ server: true })`, remote functions without a `mockRemote(fn)` mock run their real handlers in stories and tests, against the data layer you mock. Private env values come only from the plugin's `env` option; real `.env` values never reach the browser.
