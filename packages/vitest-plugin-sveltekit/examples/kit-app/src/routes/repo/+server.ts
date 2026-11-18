import { redirect } from '@sveltejs/kit';

import { REPO_URL } from '#lib/short-links.ts';

// `/repo` is a short link to the source of `vitest-plugin-sveltekit` on GitHub.
export function GET(): never {
  // SvelteKit refuses a redirect to another origin unless that origin is allowed here.
  redirect(307, REPO_URL, { external: [new URL(REPO_URL).origin] });
}
