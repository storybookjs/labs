---
'vitest-plugin-sveltekit': patch
---

First release: a Vite plugin that lets Storybook stories and Vitest browser tests use SvelteKit remote functions (`query`, `query.batch`, `query.live`, `form`, `command`, `prerender`) and mock them per story or test. Needs `@sveltejs/kit` 3.2.0 with the patch from the repository, until SvelteKit releases the entries the package uses.
