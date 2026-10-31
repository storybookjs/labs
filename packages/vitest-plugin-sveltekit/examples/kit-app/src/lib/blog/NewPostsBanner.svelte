<script lang="ts">
  import Button from '#lib/ui/Button.svelte';

  import { watchNewPosts } from './blog.remote.ts';

  let {
    since,
    onshow,
  }: {
    /** When the newest post the reader already sees was published (ms since 1970). */
    since: number;
    onshow: () => void;
  } = $props();

  // A `query.live`: the server sends the number again whenever it changes.
  const fresh = $derived(watchNewPosts(since));
</script>

<div class="region" aria-live="polite">
  {#if fresh.current}
    <div class="banner">
      <span>
        {fresh.current === 1 ? '1 new post' : `${fresh.current} new posts`} since you opened this page
      </span>
      <Button size="sm" onclick={onshow}>Show</Button>
    </div>
  {/if}
</div>

<style>
  .banner {
    align-items: center;
    background: var(--color-surface-raised);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-full, 999px);
    box-shadow: var(--shadow-md);
    display: flex;
    gap: var(--space-3);
    justify-content: space-between;
    margin-inline: auto;
    max-width: 32rem;
    padding: var(--space-2) var(--space-2) var(--space-2) var(--space-5);
  }
</style>
