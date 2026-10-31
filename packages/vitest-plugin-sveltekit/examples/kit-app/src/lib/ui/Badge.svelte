<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
    children: Snippet;
  }

  let { tone = 'neutral', children }: Props = $props();
</script>

<span class={['badge', tone]}><span class="text">{@render children()}</span></span>

<style>
  .badge {
    --badge-bg: var(--color-surface-sunken);
    --badge-fg: var(--color-text-muted);

    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    max-width: 100%;
    padding: 0.125rem var(--space-2);
    border: 1px solid color-mix(in srgb, var(--badge-fg) 25%, transparent);
    border-radius: var(--radius-sm);
    background: var(--badge-bg);
    color: var(--badge-fg);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-normal);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* `text-overflow` needs a block box; the badge itself is a flex box. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .accent {
    --badge-bg: var(--color-accent-subtle);
    --badge-fg: var(--color-accent);
  }

  .success {
    --badge-bg: var(--color-success-subtle);
    --badge-fg: var(--color-success);
  }

  .warning {
    --badge-bg: var(--color-warning-subtle);
    --badge-fg: var(--color-warning);
  }

  .danger {
    --badge-bg: var(--color-danger-subtle);
    --badge-fg: var(--color-danger);
  }
</style>
