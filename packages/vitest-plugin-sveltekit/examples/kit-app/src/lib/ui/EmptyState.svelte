<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: Snippet;
    action?: Snippet;
  }

  let { title, description, icon, action }: Props = $props();
</script>

<div class="empty">
  {#if icon}
    <div class="icon" aria-hidden="true">{@render icon()}</div>
  {/if}
  <h2>{title}</h2>
  {#if description}
    <p>{description}</p>
  {/if}
  {#if action}
    <div class="action">{@render action()}</div>
  {/if}
</div>

<style>
  .empty {
    display: grid;
    justify-items: center;
    gap: var(--space-2);
    padding: var(--space-7) var(--space-4);
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-lg);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    margin-bottom: var(--space-2);
    border-radius: var(--radius-full);
    background: var(--color-accent-subtle);
    color: var(--color-accent);
  }

  h2 {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
  }

  p {
    max-width: 32rem;
    margin: 0;
    color: var(--color-text-muted);
  }

  .action {
    margin-top: var(--space-3);
  }
</style>
