---
'vitest-plugin-sveltekit': minor
---

Server mode: with `vitestPluginSvelteKit({ server: true })`, remote functions without a `mockRemote(fn)` mock run their real handlers in stories and tests, against the data layer you mock. `mockRequestEvent({ locals, cookies, ... })` from `./server.mock` sets up the request they run in and returns the live event. Private env values come only from the plugin's `env` option; real `.env` values never reach the browser.
