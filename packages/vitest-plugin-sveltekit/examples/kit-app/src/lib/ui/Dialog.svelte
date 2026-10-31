<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    title: string;
    description?: string;
    children?: Snippet;
    actions?: Snippet;
    onclose?: () => void;
  }

  let { open = $bindable(), title, description, children, actions, onclose }: Props = $props();

  const uid = $props.id();
  let dialog: HTMLDialogElement;
  let opener: HTMLElement | null = null;
  let pressedBackdrop = false;

  $effect(() => {
    if (open && !dialog.open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // The browser focuses the first control, the close button. Start on the dialog itself (a
      // screen reader reads its title and description), or on an element with `autofocus`.
      if (!dialog.querySelector('[autofocus]')) dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  // Closes through `open`, at once: the native `close` event comes a task later, and a click on the
  // opener in between would otherwise find `open` still true and not open the dialog again.
  function close() {
    open = false;
  }

  // Fires however the dialog closes: Escape, the close button, the backdrop or `open = false`.
  function handleClose() {
    // A late event from an earlier close, after the dialog has opened again.
    if (dialog.open) return;
    open = false;
    onclose?.();
    if (opener?.isConnected) opener.focus();
    opener = null;
  }

  // Handled here as well as natively: a browser only runs its own Escape handling for real key
  // presses, not for synthetic ones such as a test's `userEvent.keyboard`.
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      keepFocusInside(event);
    }
  }

  // Tab and Shift+Tab go round the controls of the dialog, without a stop on the dialog itself.
  function keepFocusInside(event: KeyboardEvent) {
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  // The dialog element itself is only the target outside the panel, on the backdrop. Both ends of
  // the click must be there, so a text selection that ends outside does not close it.
  function handlePointerDown(event: PointerEvent) {
    pressedBackdrop = event.target === dialog;
  }

  function handleClick(event: MouseEvent) {
    if (pressedBackdrop && event.target === dialog) close();
    pressedBackdrop = false;
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class="dialog"
  tabindex="-1"
  aria-labelledby="{uid}-title"
  aria-describedby={description ? `${uid}-description` : undefined}
  onclose={handleClose}
  onkeydown={handleKeydown}
  onpointerdown={handlePointerDown}
  onclick={handleClick}
>
  <div class="panel">
    <header class="header">
      <h2 id="{uid}-title">{title}</h2>
      <button type="button" class="close" aria-label="Close" onclick={close}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.75" />
        </svg>
      </button>
    </header>
    {#if description}
      <p class="description" id="{uid}-description">{description}</p>
    {/if}
    {#if children}
      <div class="content">{@render children()}</div>
    {/if}
    {#if actions}
      <footer class="actions">{@render actions()}</footer>
    {/if}
  </div>
</dialog>

<style>
  .dialog {
    width: min(32rem, calc(100vw - 2 * var(--space-4)));
    max-height: calc(100dvh - 2 * var(--space-6));
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    color: var(--color-text);
    box-shadow: var(--shadow-lg);
    overflow: auto;
  }

  .dialog[open] {
    animation: enter var(--duration-normal) var(--easing-standard);
  }

  .dialog::backdrop {
    background: var(--color-backdrop);
  }

  .dialog[open]::backdrop {
    animation: fade var(--duration-normal) var(--easing-standard);
  }

  .panel {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: inherit;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
  }

  h2 {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
    overflow-wrap: anywhere;
  }

  .close {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 2.25rem;
    height: 2.25rem;
    margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-2)) 0 0;
    padding: 0;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .close:hover {
    background: var(--color-surface-sunken);
    color: var(--color-text);
  }

  .close:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 0;
  }

  .description {
    margin: calc(-1 * var(--space-2)) 0 0;
    color: var(--color-text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap-reverse;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  @media (max-width: 30rem) {
    .panel {
      padding: var(--space-4);
    }

    .actions > :global(*) {
      flex: 1 1 auto;
    }
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(0.5rem) scale(0.98);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
