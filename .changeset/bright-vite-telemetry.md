---
'@storybook/vite-plugin': patch
---

Tag Storybook telemetry events with the plugin version and mode (embedded or dedicated), so `dev` and `build` runs through the Vite plugin can be told apart from the Storybook CLI.
