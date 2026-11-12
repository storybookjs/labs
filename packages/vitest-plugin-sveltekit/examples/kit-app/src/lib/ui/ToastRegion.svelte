<script lang="ts">
  import Toast from './Toast.svelte';
  import { dismissToast, pauseToasts, resumeToasts, toasts } from './toasts.svelte.ts';

  const errors = $derived(toasts.filter((item) => item.tone === 'error'));
  const updates = $derived(toasts.filter((item) => item.tone !== 'error'));

  function handleFocusOut(event: FocusEvent) {
    const region = event.currentTarget as HTMLElement;
    if (!region.contains(event.relatedTarget as Node | null)) resumeToasts();
  }
</script>

<!-- Both live regions stay in the page even when empty: screen readers only announce changes
     to a live region that was already there. -->
<section
  class="region"
  aria-label="Notifications"
  onmouseenter={pauseToasts}
  onmouseleave={resumeToasts}
  onfocusin={pauseToasts}
  onfocusout={handleFocusOut}
>
  <div class="stack" role="alert">
    {#each errors as item (item.id)}
      <div class="item">
        <Toast message={item.message} tone={item.tone} ondismiss={() => dismissToast(item.id)} />
      </div>
    {/each}
  </div>
  <div class="stack" role="status" aria-live="polite">
    {#each updates as item (item.id)}
      <div class="item">
        <Toast message={item.message} tone={item.tone} ondismiss={() => dismissToast(item.id)} />
      </div>
    {/each}
  </div>
</section>

<style>
  .region {
    position: fixed;
    right: var(--space-4);
    bottom: var(--space-4);
    z-index: 100;
    display: grid;
    gap: var(--space-2);
    width: min(24rem, calc(100vw - 2 * var(--space-4)));
    pointer-events: none;
  }

  .stack {
    display: grid;
    gap: var(--space-2);
  }

  .item {
    pointer-events: auto;
    animation: enter var(--duration-slow) var(--easing-standard);
  }

  @media (max-width: 30rem) {
    .region {
      right: var(--space-3);
      bottom: var(--space-3);
      width: calc(100vw - 2 * var(--space-3));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .item {
      animation: none;
    }
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(0.75rem);
    }
  }
</style>
