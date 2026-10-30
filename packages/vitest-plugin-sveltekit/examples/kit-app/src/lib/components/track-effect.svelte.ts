/** Runs `fn` in an effect inside its own root, so `$state` reads are tracked. Returns a stop function. */
export function track(fn: () => void): () => void {
  return $effect.root(() => {
    $effect(() => fn());
  });
}
