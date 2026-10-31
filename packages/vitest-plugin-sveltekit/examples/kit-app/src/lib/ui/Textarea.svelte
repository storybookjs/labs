<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  import Field from './Field.svelte';
  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLTextareaAttributes, 'children'> {
    label: string;
    hint?: string;
    error?: string | string[];
    mono?: boolean;
  }

  let {
    label,
    hint,
    error,
    mono = false,
    id,
    rows = 8,
    value = $bindable(),
    class: className,
    'aria-invalid': ariaInvalid,
    'aria-describedby': ariaDescribedBy,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const { inputId, hintId, errorId, errors } = $derived(fieldIds(id, uid, error));
</script>

<Field id={inputId} {label} {hint} {hintId} {errors} {errorId}>
  <textarea
    {...rest}
    id={inputId}
    {rows}
    bind:value
    class={['control', { mono }, className]}
    aria-invalid={errors.length > 0 ? 'true' : ariaInvalid}
    aria-describedby={joinIds(hint && hintId, errors.length > 0 && errorId, ariaDescribedBy)}
  ></textarea>
</Field>

<style>
  textarea {
    resize: vertical;
    line-height: var(--leading-relaxed);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    tab-size: 2;
  }
</style>
