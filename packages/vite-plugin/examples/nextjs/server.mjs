import { startNextDevServer } from '@storybook/vite-plugin/nextjs';

// Replaces `next dev`: Next serves the app, Storybook is mounted at /__storybook on the same port.
await startNextDevServer({
  dir: import.meta.dirname,
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 5193),
});
