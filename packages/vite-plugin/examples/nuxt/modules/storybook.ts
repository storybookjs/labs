import { fromNodeMiddleware } from 'h3';
import { addDevServerHandler, defineNuxtModule, useLogger } from 'nuxt/kit';

import { STORYBOOK_BASE, createStorybookMiddleware } from '../storybook-middleware';

/**
 * Embeds Storybook in `nuxt dev` on the same port as the application.
 *
 * Nuxt's own Vite servers are left untouched: Storybook runs in a separate Vite server in
 * middleware mode, mounted as a development-only server handler.
 */
export default defineNuxtModule({
  meta: { name: 'storybook' },
  setup(_options, nuxt): void {
    if (!nuxt.options.dev) {
      return;
    }

    const storybook = createStorybookMiddleware();
    addDevServerHandler({ handler: fromNodeMiddleware(storybook.middleware) });

    nuxt.hook('listen', (server, listener: { url?: string }) => {
      storybook.attach(server);
      if (listener.url) {
        useLogger('storybook').info(
          `Embedded Storybook: ${listener.url.replace(/\/+$/, '')}${STORYBOOK_BASE}/`
        );
      }
    });
    nuxt.hook('close', () => storybook.close());
  },
});
