<!--
  @component
  A one-line text field with its label, hint and error messages, connected for screen readers.
  Do not add a `<label>` of your own. Bind `value`, or spread the props of a SvelteKit remote
  form field: `<Input label="Title" {...fields.title.as('text')} error={...} />`. Other
  attributes, such as `type`, `name` and `autocomplete`, go to the `<input>`. For more than one
  line, use `Textarea`.

  @summary a labelled one-line text field, with a hint and error messages
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  import Field from './Field.svelte';
  import { fieldIds, joinIds } from './field.ts';

  interface Props extends Omit<HTMLInputAttributes, 'children'> {
    /** The visible label. It is also the accessible name. */
    label: string;
    /** Help text under the label, such as the format to use. */
    hint?: string;
    /**
     * One or more error messages, such as the messages of a remote form field's `issues()`. With an
     * error, the field gets `aria-invalid`.
     */
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
