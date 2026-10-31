<script lang="ts">
  import type { ToastTone } from './toasts.svelte.ts';

  interface Props {
    message: string;
    tone?: ToastTone;
    ondismiss?: () => void;
  }

  let { message, tone = 'info', ondismiss }: Props = $props();
</script>

<div class={['toast', tone]}>
  <svg class="icon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" stroke-width="1.5" />
    {#if tone === 'success'}
      <path d="M6.5 10.25l2.25 2.25 4.75-5" fill="none" stroke="currentColor" stroke-width="1.75" />
    {:else if tone === 'error'}
      <path d="M10 5.75v5M10 13.25v1" stroke="currentColor" stroke-width="1.75" />
    {:else}
      <path d="M10 9v5.25M10 5.75v1" stroke="currentColor" stroke-width="1.75" />
    {/if}
  </svg>
  <p class="message">{message}</p>
  {#if ondismiss}
    <button type="button" class="dismiss" aria-label="Dismiss notification" onclick={ondismiss}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.75" />
      </svg>
    </button>
  {/if}
</div>

<style>
  .toast {
    --toast-tone: var(--color-accent);

    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-left: 4px solid var(--toast-tone);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-lg);
  }

  .success {
    --toast-tone: var(--color-success);
  }

  .error {
    --toast-tone: var(--color-danger);
  }

  .icon {
    flex: none;
    margin-top: 0.125rem;
    color: var(--toast-tone);
  }

  .message {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding-block: 0.125rem;
    overflow-wrap: anywhere;
  }

  .dismiss {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .dismiss:hover {
    background: var(--color-surface-sunken);
    color: var(--color-text);
  }

  .dismiss:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 0;
  }
</style>
