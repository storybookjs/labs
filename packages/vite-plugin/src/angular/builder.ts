import { createBuilder, type Builder, type BuilderContext } from '@angular-devkit/architect';
import type { JsonObject } from '@angular-devkit/core';
import { executeDevServerBuilder, type DevServerBuilderOptions } from '@angular/build';
import { join } from 'pathe';

import { normalizeBase, trimTrailingSlashes } from '../base-path.ts';
import { DEFAULT_STORYBOOK_BASE, createStorybookMiddleware } from '../storybook-middleware.ts';

export type StorybookDevServerOptions = JsonObject & {
  /** Storybook configuration directory, relative to the project root. */
  storybookConfigDir?: string;
  /** Path the embedded Storybook is mounted under. */
  storybookBase?: string;
};

/**
 * `@angular/build:dev-server` with the Storybook Vite dev server mounted as middleware.
 *
 * Angular CLI keeps the single HTTP listener and its own Vite server; Storybook is served under
 * `storybookBase` through the builder's `middleware` extension, so there is no proxy and no
 * second port.
 */
const devServer: Builder<StorybookDevServerOptions> = createBuilder<StorybookDevServerOptions>(
  async function* (options, context) {
    const { storybookConfigDir, storybookBase, ...devServerOptions } = options;
    const base = normalizeBase(storybookBase ?? DEFAULT_STORYBOOK_BASE);
    const storybook = createStorybookMiddleware({
      root: await resolveProjectRoot(context),
      configDir: storybookConfigDir,
      base,
      onError: (error) =>
        context.logger.error(
          error instanceof Error ? (error.stack ?? error.message) : String(error)
        ),
    });

    context.addTeardown(() => storybook.close());

    let announced = false;
    for await (const result of executeDevServerBuilder(
      devServerOptions as unknown as DevServerBuilderOptions,
      context,
      { middleware: [storybook.middleware] }
    )) {
      if (!announced && result.success && result.baseUrl) {
        announced = true;
        context.logger.info(
          `Embedded Storybook: ${trimTrailingSlashes(result.baseUrl)}${base === '/' ? '' : base}/`
        );
      }
      yield result;
    }
  }
);

export default devServer;

async function resolveProjectRoot(context: BuilderContext): Promise<string> {
  if (!context.target) {
    return context.workspaceRoot;
  }
  const metadata = await context.getProjectMetadata(context.target.project);
  return join(context.workspaceRoot, typeof metadata.root === 'string' ? metadata.root : '');
}
