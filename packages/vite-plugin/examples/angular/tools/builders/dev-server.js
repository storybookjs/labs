import path from 'node:path';

import { createBuilder } from '@angular-devkit/architect';
import { executeDevServerBuilder } from '@angular/build';

import {
  STORYBOOK_BASE,
  STORYBOOK_CONFIG_DIR,
  createStorybookMiddleware,
} from './storybook-middleware.js';

/**
 * @typedef {import('@angular/build').DevServerBuilderOptions & {
 *   storybookConfigDir?: string;
 *   storybookBase?: string;
 * }} StorybookDevServerOptions
 */

/**
 * Angular CLI development server that also serves the embedded Storybook.
 *
 * Angular CLI owns the single HTTP listener and its own Vite server. The Storybook
 * Vite dev server runs in middleware mode and is mounted through the dev-server
 * builder's `middleware` extension, so there is no proxy and no second port.
 */
export default createBuilder(async function* (options, context) {
  const { storybookConfigDir, storybookBase, ...devServerOptions } =
    /** @type {StorybookDevServerOptions} */ (options);
  const base = storybookBase ?? STORYBOOK_BASE;
  const storybook = createStorybookMiddleware({
    root: await resolveProjectRoot(context),
    configDir: storybookConfigDir ?? STORYBOOK_CONFIG_DIR,
    base,
    logger: context.logger,
  });

  context.addTeardown(() => storybook.close());

  let announced = false;
  for await (const result of executeDevServerBuilder(devServerOptions, context, {
    middleware: [storybook.middleware],
  })) {
    if (!announced && result.success && result.baseUrl) {
      announced = true;
      context.logger.info(`Embedded Storybook: ${trimSlash(result.baseUrl)}${base}/`);
    }
    yield result;
  }
});

/**
 * @param {import('@angular-devkit/architect').BuilderContext} context
 * @returns {Promise<string>}
 */
async function resolveProjectRoot(context) {
  if (!context.target) {
    return context.workspaceRoot;
  }
  const metadata = await context.getProjectMetadata(context.target.project);
  return path.join(context.workspaceRoot, typeof metadata.root === 'string' ? metadata.root : '');
}

/** @param {string} url @returns {string} */
function trimSlash(url) {
  return url.replace(/\/+$/, '');
}
