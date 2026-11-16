<!--
  @component
  A drop-down list with its label, hint and error messages, connected for screen readers. It
  uses the native `<select>`. Use it for one choice from a known list, such as a sort order.
  Bind `value`, or spread the props of a SvelteKit remote form field.

  @summary a labelled drop-down list for one choice from a known list
-->
<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  import Field from './Field.svelte';
  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLSelectAttributes, 'children' | 'value'> {
    /** The visible label. It is also the accessible name. */
    label: string;
    /** The choices, in order. `value` is what the form sends, `label` is what the reader sees. */
    options: Array<{ value: string; label: string }>;
    /** The `value` of the chosen option. Bindable. */
    value?: string;
    /** Help text under the label. */
    hint?: string;
    /** One or more error messages. With an error, the list gets `aria-invalid`. */
    error?: string | string[];
  }

  let {
    label,
    options,
    value = $bindable(),
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

<Field id={inputId} {label} {hint} {hintId} {errors} {errorId}>
  <div class="select">
    <select
      {...rest}
      id={inputId}
      bind:value
      class={['control', className]}
      aria-invalid={errors.length > 0 ? 'true' : ariaInvalid}
      aria-describedby={joinIds(hint && hintId, errors.length > 0 && errorId, ariaDescribedBy)}
    >
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</Field>

<style>
  .select {
    position: relative;
  }

  .select::after {
    content: '';
    position: absolute;
    top: 50%;
    right: var(--space-4);
    width: 0.5rem;
    height: 0.5rem;
    border-right: 2px solid var(--color-text-muted);
    border-bottom: 2px solid var(--color-text-muted);
    transform: translateY(-70%) rotate(45deg);
    pointer-events: none;
  }

  select {
    appearance: none;
    padding-right: var(--space-7);
    cursor: pointer;
  }
</style>
