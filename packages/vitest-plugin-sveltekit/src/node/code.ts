const UNSAFE = /[<>/\u2028\u2029]/g;
const ESCAPES: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * `value` as a JavaScript literal, for code this package generates (file paths, export names,
 * env values). `JSON.stringify`, with `<`, `>`, `/`, U+2028 and U+2029 written as `\u` escapes,
 * so the literal stays a literal wherever the code ends up, also inline in HTML. Those characters
 * only appear inside JSON strings, where the escapes mean the same character.
 */
export function literal(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE, (char) => ESCAPES[char]!);
}
