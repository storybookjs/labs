import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';

import { errors } from '#lib/server/error-log.ts';

/** Signs in whoever the `session` cookie names. A real app would look the session up. */
export const handle: Handle = async ({ event, resolve }) => {
  if (!('user' in event.locals)) {
    const session = event.cookies.get('session');
    event.locals.user = session ? { name: session } : null;
  }
  return resolve(event);
};

/** Records what reaches the hook. Returns nothing, so SvelteKit's default error body applies. */
export const handleError: HandleServerError = ({ kind, error }) => {
  errors.push(`handleError ${kind}: ${(error as { message?: string })?.message ?? String(error)}`);
};
