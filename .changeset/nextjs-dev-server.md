---
'@storybook/vite-plugin': minor
---

Add a `@storybook/vite-plugin/nextjs` entry exporting `startNextDevServer`, which replaces `next dev` with a custom server that hosts Storybook on the same port, and `createStorybookMiddleware` for existing Next.js custom servers. The middleware from `@storybook/vite-plugin/angular` now also exposes `ownsUpgrade` and accepts an explicit `httpServer`.
