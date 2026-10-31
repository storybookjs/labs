<script lang="ts">
  import { readPost } from '#lib/blog/blog.remote.ts';
  import PostEditor from '#lib/blog/PostEditor.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';
  import Skeleton from '#lib/ui/Skeleton.svelte';

  let { id }: { id: number } = $props();
</script>

<svelte:head><title>Edit post · Field Notes</title></svelte:head>

<div class="page">
  <svelte:boundary>
    {@const post = await readPost(id)}
    <a class="back" href="/posts/{id}">← Back to the post</a>
    <h1>Edit post</h1>
    <PostEditor {post} />

    {#snippet pending()}
      <Skeleton height="2.5rem" width="40%" />
      <Skeleton lines={10} />
    {/snippet}

    {#snippet failed(error)}
      <EmptyState
        title="This post cannot be edited"
        description={(error as { body?: { message?: string } })?.body?.message ?? 'Something went wrong.'}
      />
    {/snippet}
  </svelte:boundary>
</div>

<style>
  .page {
    display: grid;
    gap: var(--space-6);
  }
  h1 {
    margin: 0;
  }
  .back {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-decoration: none;
  }
</style>
