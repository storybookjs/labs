<script lang="ts">
  import type { Snippet } from 'svelte';

  import ThemeToggle from './ThemeToggle.svelte';

  interface Props {
    title?: string;
    nav?: Snippet;
    actions?: Snippet;
  }

  let { title = 'Field Notes', nav, actions }: Props = $props();
</script>

<header class="header">
  <div class="inner">
    <a class="brand" href="/">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M5 3.5h10.5L19 7v13.5H5Z M15.5 3.5V7H19 M8.5 11h7M8.5 14.5h7M8.5 18h4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
      </svg>
      <span>{title}</span>
    </a>
    {#if nav}
      <nav class="nav" aria-label="Main">{@render nav()}</nav>
    {/if}
    <div class="actions">
      {@render actions?.()}
      <ThemeToggle />
    </div>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-background) 88%, transparent);
    backdrop-filter: blur(10px);
  }

  .inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2) var(--space-5);
    max-width: var(--width-wide);
    min-height: 4rem;
    margin: 0 auto;
    padding: var(--space-2) var(--space-5);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    color: var(--color-text);
    font-family: var(--font-serif);
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    letter-spacing: -0.01em;
    text-decoration: none;
  }

  .brand svg {
    flex: none;
    color: var(--color-accent);
  }

  .brand span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand:focus-visible {
    border-radius: var(--radius-sm);
  }

  .nav {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .nav :global(a) {
    display: inline-flex;
    align-items: center;
    min-height: 2.5rem;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-weight: var(--weight-medium);
    text-decoration: none;
    white-space: nowrap;
    transition: color var(--duration-fast) var(--easing-standard);
  }

  .nav :global(a:hover) {
    color: var(--color-text);
  }

  .nav :global(a[aria-current='page']) {
    color: var(--color-text);
    text-decoration: underline 2px var(--color-accent);
    text-underline-offset: 0.4em;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
  }

  /* On a phone the nav takes its own row and scrolls sideways instead of wrapping. */
  @media (max-width: 40rem) {
    .inner {
      padding: var(--space-2) var(--space-4);
      column-gap: var(--space-3);
    }

    .brand {
      flex: 1;
      font-size: var(--text-lg);
    }

    .nav {
      order: 3;
      flex-basis: 100%;
      margin: 0 calc(-1 * var(--space-4));
      padding: 0 var(--space-2);
      overflow-x: auto;
      scrollbar-width: none;
    }
  }
</style>
