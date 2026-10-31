<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  import Field from './Field.svelte';
  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLInputAttributes, 'children'> {
    label: string;
    hint?: string;
    error?: string | string[];
  }

  let {
    label,
    hint,
    error,
    id,
    type = 'text',
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
  <input
    {...rest}
    id={inputId}
    {type}
    bind:value
    class={['control', className]}
    aria-invalid={errors.length > 0 ? 'true' : ariaInvalid}
    aria-describedby={joinIds(hint && hintId, errors.length > 0 && errorId, ariaDescribedBy)}
  />
</Field>
