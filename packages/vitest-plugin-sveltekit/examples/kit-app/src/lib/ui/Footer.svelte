<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<footer class="footer">
  <div class="inner">
    {#if children}
      {@render children()}
    {:else}
      <p><strong>Field Notes</strong> · Short notes, written down before they are forgotten.</p>
    {/if}
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3) var(--space-5);
    max-width: var(--width-wide);
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
  }

  .inner :global(p) {
    margin: 0;
  }

  .inner :global(a) {
    color: inherit;
    text-underline-offset: 0.2em;
  }

  .inner :global(a:hover) {
    color: var(--color-text);
  }

  strong {
    color: var(--color-text);
    font-family: var(--font-serif);
  }

  @media (max-width: 40rem) {
    .inner {
      padding: var(--space-5) var(--space-4);
    }
  }
</style>
