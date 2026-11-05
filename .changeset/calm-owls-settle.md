---
'@storybook/vite-plugin': patch
---

Start Storybook's change detection when the embedded Storybook starts, so `storybook tools stories changed` no longer hangs waiting for change-detection readiness against a host Vite server.
