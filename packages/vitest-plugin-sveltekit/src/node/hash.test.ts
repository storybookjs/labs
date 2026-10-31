import { expect, it } from 'vite-plus/test';

import { hash } from './hash.ts';

// Reference values from `hash()` in `@sveltejs/kit/src/utils/hash.js` 3.1.1.
it.each([
  ['src/lib/posts.remote.ts', '1rlm6aw'],
  ['src/routes/remote/data.remote.js', '1q2uc4r'],
  ['ä/ü.remote.ts', 'd13w41'],
])('hashes %s like SvelteKit', (file, expected) => {
  expect(hash(file)).toBe(expected);
});
