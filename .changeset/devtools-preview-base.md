---
'@storybook/vite-plugin': patch
---

Load the Vite DevTools dock in the Storybook preview from the preview server's own hub instead of the host's, so a Storybook docked into the host's DevTools no longer nests itself.
