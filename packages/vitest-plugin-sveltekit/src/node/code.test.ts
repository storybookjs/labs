import { expect, it } from 'vite-plus/test';

import { literal } from './code.ts';

it('writes a literal that evaluates to the value, without `<`, `>`, `/` or line separators', () => {
  const value = { path: '/app/src/</script>.ts', note: 'a\u2028b\u2029c', n: 1 };
  const code = literal(value);

  expect(code).not.toMatch(/[<>/\u2028\u2029]/);
  expect(code).toBe(
    String.raw`{"path":"\u002Fapp\u002Fsrc\u002F\u003C\u002Fscript\u003E.ts","note":"a\u2028b\u2029c","n":1}`
  );
  // The escapes are JSON too: the literal reads back as the same value.
  expect(JSON.parse(code)).toEqual(value);
});
