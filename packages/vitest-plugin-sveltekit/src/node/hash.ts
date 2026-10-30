/**
 * The djb2 hash SvelteKit uses for remote module ids, copied from `packages/kit/src/utils/hash.js`
 * (string inputs only). The client stub and the request URLs must use the same hash as SvelteKit.
 */
export function hash(value: string): string {
  let result = 5381;
  let i = value.length;
  while (i) result = (result * 33) ^ value.charCodeAt(--i);
  return (result >>> 0).toString(36);
}
