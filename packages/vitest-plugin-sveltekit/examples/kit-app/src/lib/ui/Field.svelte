<!-- The label, hint and errors around a form control. Not exported: the controls use it. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;
    label: string;
    hint?: string;
    hintId: string;
    errors: string[];
    errorId: string;
    children: Snippet;
  }

  let { id, label, hint, hintId, errors, errorId, children }: Props = $props();
</script>

<div class="field">
  <label for={id}>{label}</label>
  {#if hint}
    <p class="hint" id={hintId}>{hint}</p>
  {/if}
  {@render children()}
  {#if errors.length > 0}
    <div class="errors" id={errorId}>
      {#each errors as message, index (index)}
        <p>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 4.5v4.25M8 10.75v.75" stroke="currentColor" stroke-width="1.5" />
          </svg>
          {message}
        </p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .field {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  label {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text);
  }

  .hint {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .errors p {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-danger);
  }

  .errors svg {
    flex: none;
    align-self: center;
  }

  .field :global(.control) {
    width: 100%;
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text);
    font: inherit;
    line-height: var(--leading-normal);
    transition:
      border-color var(--duration-fast) var(--easing-standard),
      box-shadow var(--duration-fast) var(--easing-standard);
  }

  .field :global(.control::placeholder) {
    color: var(--color-text-muted);
    opacity: 1;
  }

  .field :global(.control:hover:not(:disabled)) {
    border-color: var(--color-text-muted);
  }

  .field :global(.control:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
    border-color: var(--color-focus);
  }

  .field :global(.control[aria-invalid='true']) {
    border-color: var(--color-danger);
    box-shadow: inset 3px 0 0 var(--color-danger);
  }

  .field :global(.control:disabled) {
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    cursor: not-allowed;
  }
</style>
