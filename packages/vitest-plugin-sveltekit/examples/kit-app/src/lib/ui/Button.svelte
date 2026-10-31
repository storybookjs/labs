<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

  type SharedAttributes = Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'type' | 'children'>;

  interface Props extends SharedAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md';
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    href,
    type = 'button',
    disabled = false,
    loading = false,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const inactive = $derived(disabled || loading);
  const classes = $derived(['button', variant, size, { loading }, className]);
</script>

{#snippet content()}
  {#if loading}
    <span class="spinner" aria-hidden="true"></span>
  {/if}
  <span class="label">{@render children()}</span>
{/snippet}

{#if href !== undefined}
  <!-- A link has no disabled state: without `href` it is no longer focusable or clickable. -->
  <a
    {...rest}
    href={inactive ? undefined : href}
    role={inactive ? 'link' : rest.role}
    aria-disabled={inactive ? 'true' : undefined}
    aria-busy={loading ? 'true' : undefined}
    class={classes}
  >
    {@render content()}
  </a>
{:else}
  <button
    {...rest}
    {type}
    disabled={inactive}
    aria-busy={loading ? 'true' : undefined}
    class={classes}
  >
    {@render content()}
  </button>
{/if}

<style>
  .button {
    --button-bg: var(--color-accent);
    --button-bg-hover: var(--color-accent-hover);
    --button-fg: var(--color-accent-contrast);
    --button-border: transparent;

    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--button-border);
    border-radius: var(--radius-md);
    background: var(--button-bg);
    color: var(--button-fg);
    font: inherit;
    font-size: var(--text-md);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-tight);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--easing-standard),
      border-color var(--duration-fast) var(--easing-standard),
      color var(--duration-fast) var(--easing-standard),
      transform var(--duration-fast) var(--easing-standard);
  }

  .button:hover:not(:disabled, [aria-disabled='true']) {
    background: var(--button-bg-hover);
  }

  .button:active:not(:disabled, [aria-disabled='true']) {
    transform: translateY(1px);
  }

  .button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .button:disabled,
  .button[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Loading is busy, not unavailable: it keeps its colour. */
  .button.loading {
    cursor: progress;
    opacity: 1;
  }

  .secondary {
    --button-bg: var(--color-surface-raised);
    --button-bg-hover: var(--color-surface-sunken);
    --button-fg: var(--color-text);
    --button-border: var(--color-border-strong);
  }

  .ghost {
    --button-bg: transparent;
    --button-bg-hover: var(--color-accent-subtle);
    --button-fg: var(--color-accent);
  }

  .danger {
    --button-bg: var(--color-danger);
    --button-bg-hover: var(--color-danger-hover);
    --button-fg: var(--color-danger-contrast);
  }

  .sm {
    min-height: 2.25rem;
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  .label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spinner {
    flex: none;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: var(--radius-full);
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
