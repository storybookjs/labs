/** Removes every trailing `/`. A loop rather than `/\/+$/`, which backtracks on long runs of `/`. */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end--;
  }
  return value.slice(0, end);
}

/**
 * Normalizes a mount path: whitespace is trimmed, a leading slash is added, and trailing slashes
 * are removed. An empty result mounts at the root, `/`.
 */
export function normalizeBase(base: string): string {
  const trimmed = base.trim();
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return trimTrailingSlashes(withLeadingSlash) || '/';
}
