<script lang="ts">
  import type { Snippet } from 'svelte';

  import ToastRegion from './ToastRegion.svelte';

  interface Props {
    header?: Snippet;
    footer?: Snippet;
    children: Snippet;
    width?: 'narrow' | 'wide';
  }

  let { header, footer, children, width = 'wide' }: Props = $props();
</script>

<a class="skip-link" href="#main">Skip to content</a>
<div class="shell">
  {@render header?.()}
  <!-- `tabindex="-1"` lets the skip link move focus, not only the scroll position. -->
  <main id="main" class={['main', width]} tabindex="-1">
    {@render children()}
  </main>
  {@render footer?.()}
</div>
<ToastRegion />

<style>
  .skip-link {
    position: fixed;
    top: var(--space-2);
    left: var(--space-2);
    z-index: 200;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    font-weight: var(--weight-semibold);
    text-decoration: none;
    transform: translateY(-200%);
  }

  .skip-link:focus {
    transform: none;
  }

  .shell {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  .main {
    flex: 1;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5) var(--space-8);
  }

  .main:focus {
    outline: none;
  }

  .wide {
    max-width: var(--width-wide);
  }

  .narrow {
    max-width: var(--width-narrow);
  }

  @media (max-width: 40rem) {
    .main {
      padding: var(--space-5) var(--space-4) var(--space-7);
    }
  }
</style>
