import { redirect } from '@sveltejs/kit';

import { STORYBOOK_URL } from '#lib/short-links.ts';

// `/storybook` is a short link to this app's Storybook on Chromatic, the build of `main`.
// A temporary redirect: browsers do not cache it, so the address can change.
export function GET(): never {
  // SvelteKit refuses a redirect to another origin unless that origin is allowed here.
  redirect(307, STORYBOOK_URL, { external: [new URL(STORYBOOK_URL).origin] });
}
