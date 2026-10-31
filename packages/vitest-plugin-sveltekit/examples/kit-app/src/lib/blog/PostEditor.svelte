<script lang="ts">
  import { tick } from 'svelte';
  import * as v from 'valibot';

  import Button from '#lib/ui/Button.svelte';
  import Checkbox from '#lib/ui/Checkbox.svelte';
  import Input from '#lib/ui/Input.svelte';
  import Textarea from '#lib/ui/Textarea.svelte';
  import { toast } from '#lib/ui/toasts.svelte.ts';

  import { editPost, publishPost } from './blog.remote.ts';
  import Markdown from './Markdown.svelte';
  import { type PostDetail, postFields } from './posts.ts';

  let { post }: { post?: PostDetail } = $props();

  // One form for new posts, one instance per post for edits.
  // svelte-ignore state_referenced_locally
  const edit = post ? editPost.for(post.id) : undefined;
  const form = edit ?? publishPost;
  // svelte-ignore state_referenced_locally
  if (edit && post) {
    edit.fields.set({
      id: post.id,
      title: post.title,
      body: post.body,
      tags: post.tags.join(', '),
      author: post.author,
      published: post.published,
    });
  }

  // New posts are published unless the author unticks the box.
  // svelte-ignore state_referenced_locally
  if (!post) publishPost.fields.published.set(true);

  // The server's schema runs in the browser first (a preflight): issues show without a request, and
  // `validate` below clears each one as soon as the author fixes the field.
  if (edit) edit.preflight(v.object({ id: v.number(), ...postFields }));
  else publishPost.preflight(v.object(postFields));

  let element: HTMLFormElement;

  // After a submit that found issues, in the browser or on the server, the first field with an
  // issue gets the focus: it scrolls into view and a screen reader reads its message. `pending` goes
  // back to 0 once the preflight or the server has answered, even when the issues are the same as
  // after the previous submit.
  let submitting = false;
  $effect(() => {
    if (form.pending > 0 || !submitting) return;
    submitting = false;
    if (fields.allIssues()?.length) void focusFirstIssue();
  });

  async function focusFirstIssue() {
    await tick();
    element.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }

  let preview = $state(false);
  const fields = $derived(form.fields as typeof publishPost.fields);

  // The body's issues are in the Write view: show it when the server reports one.
  $effect(() => {
    if (fields.body.issues()?.length) preview = false;
  });
  const messages = (issues: Array<{ message: string }> | undefined) =>
    issues?.map((issue) => issue.message);
</script>

<form
  class="editor"
  aria-label={post ? 'Edit post' : 'New post'}
  bind:this={element}
  onsubmit={() => (submitting = true)}
  oninput={() => form.validate({ preflightOnly: true })}
  {...form.enhance(async ({ submit }) => {
    if (await submit()) toast(post ? 'Changes saved' : 'Post published', { tone: 'success' });
  })}
>
  {#if edit && post}
    <input {...edit.fields.id.as('hidden', post.id)} />
  {/if}

  <Input label="Title" {...fields.title.as('text')} error={messages(fields.title.issues())} />

  <div class="body">
    <div class="tabs" role="group" aria-label="Write or preview">
      <Button size="sm" variant={preview ? 'ghost' : 'secondary'} aria-pressed={!preview} onclick={() => (preview = false)}>
        Write
      </Button>
      <Button size="sm" variant={preview ? 'secondary' : 'ghost'} aria-pressed={preview} onclick={() => (preview = true)}>
        Preview
      </Button>
    </div>
    <div hidden={preview}>
      <Textarea
        label="Body"
        hint="Markdown: **bold**, _italic_, lists, links, `code`, ## headings."
        mono
        rows={14}
        {...fields.body.as('text')}
        error={messages(fields.body.issues())}
      />
    </div>
    {#if preview}
      <div class="preview" role="region" aria-label="Preview">
        {#if fields.body.value()}
          <Markdown source={fields.body.value() ?? ''} />
        {:else}
          <p class="empty">Nothing to preview yet.</p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="row">
    <Input
      label="Tags"
      hint="Comma-separated, up to 5: design, notes"
      {...fields.tags.as('text')}
      error={messages(fields.tags.issues())}
    />
    <Input label="Author" autocomplete="name" {...fields.author.as('text')} error={messages(fields.author.issues())} />
  </div>

  <Checkbox label="Published" hint="Drafts are only listed under “Show: Drafts”." {...fields.published.as('checkbox')} />

  <div class="actions">
    <Button type="submit" loading={form.pending > 0}>{post ? 'Save changes' : 'Publish'}</Button>
    <Button variant="ghost" href={post ? `/posts/${post.id}` : '/'}>Cancel</Button>
  </div>
</form>

<style>
  .editor {
    display: grid;
    gap: var(--space-5);
  }
  .body {
    display: grid;
    gap: var(--space-2);
  }
  .tabs {
    display: flex;
    gap: var(--space-2);
  }
  .preview {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 12rem;
    padding: var(--space-5);
  }
  .empty {
    color: var(--color-text-muted);
  }
  .row {
    display: grid;
    gap: var(--space-5);
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 40rem) {
    .row {
      grid-template-columns: 1fr;
    }
  }
  .actions {
    display: flex;
    gap: var(--space-3);
  }
</style>
