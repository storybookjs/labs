<!--
  @component
  A text field for more than one line, with its label, hint and error messages, connected for
  screen readers. Bind `value`, or spread the props of a SvelteKit remote form field. Set `mono`
  for Markdown or code. For one line, use `Input`.

  @summary a labelled multi-line text field, with a hint and error messages
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  import Field from './Field.svelte';
  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLTextareaAttributes, 'children'> {
    /** The visible label. It is also the accessible name. */
    label: string;
    /** Help text under the label, such as the syntax to use. */
    hint?: string;
    /** One or more error messages. With an error, the field gets `aria-invalid`. */
    error?: string | string[];
    /** Uses the mono font, for Markdown or code. */
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
