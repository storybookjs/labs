---
'@storybook/vite-plugin': minor
---

Add an Angular CLI `dev-server` builder (`"builder": "@storybook/vite-plugin/angular:dev-server"`) and a `@storybook/vite-plugin/angular` entry exporting `createStorybookMiddleware`, so `ng serve` hosts Storybook on the same port.
