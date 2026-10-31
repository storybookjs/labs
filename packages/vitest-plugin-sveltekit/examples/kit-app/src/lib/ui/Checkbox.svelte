<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLInputAttributes, 'children' | 'type'> {
    label: string;
    type?: 'checkbox';
    checked?: boolean;
    hint?: string;
    error?: string | string[];
  }

  let {
    label,
    checked = $bindable(false),
    hint,
    error,
    id,
    class: className,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const { inputId, hintId, errorId, errors } = $derived(fieldIds(id, uid, error));
</script>

<div class={['checkbox', className]}>
  <input
    {...rest}
    id={inputId}
    type="checkbox"
    bind:checked
    aria-invalid={errors.length > 0 ? 'true' : ariaInvalid}
    aria-describedby={joinIds(hint && hintId, errors.length > 0 && errorId, ariaDescribedBy)}
  />
  <div class="text">
    <label for={inputId}>{label}</label>
    {#if hint}
      <p class="hint" id={hintId}>{hint}</p>
    {/if}
    {#if errors.length > 0}
      <div class="errors" id={errorId}>
        {#each errors as message, index (index)}
          <p>{message}</p>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  input {
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    margin: 0.125rem 0 0;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  input:disabled {
    cursor: not-allowed;
  }

  input[aria-invalid='true'] {
    outline: 2px solid var(--color-danger);
    outline-offset: 1px;
  }

  input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .text {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  label {
    font-weight: var(--weight-medium);
    cursor: pointer;
  }

  input:disabled + .text label {
    color: var(--color-text-muted);
    cursor: not-allowed;
  }

  p {
    margin: 0;
    font-size: var(--text-sm);
  }

  .hint {
    color: var(--color-text-muted);
  }

  .errors {
    color: var(--color-danger);
  }
</style>
