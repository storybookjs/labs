<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    as?: 'article' | 'div' | 'section';
    interactive?: boolean;
    children: Snippet;
    header?: Snippet;
    footer?: Snippet;
  }

  let { as = 'div', interactive = false, children, header, footer }: Props = $props();
</script>

<svelte:element this={as} class={['card', { interactive }]}>
  {#if header}
    <header class="header">{@render header()}</header>
  {/if}
  <div class="body">{@render children()}</div>
  {#if footer}
    <footer class="footer">{@render footer()}</footer>
  {/if}
</svelte:element>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    overflow-wrap: anywhere;
  }

  .header,
  .body,
  .footer {
    padding: var(--space-4) var(--space-5);
  }

  .header {
    border-bottom: 1px solid var(--color-border);
  }

  .body {
    flex: 1;
  }

  .footer {
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .interactive {
    transition:
      transform var(--duration-normal) var(--easing-standard),
      box-shadow var(--duration-normal) var(--easing-standard),
      border-color var(--duration-normal) var(--easing-standard);
  }

  .interactive:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .interactive:focus-within {
    border-color: var(--color-focus);
  }

  @media (max-width: 30rem) {
    .header,
    .body,
    .footer {
      padding-inline: var(--space-4);
    }
  }
</style>
