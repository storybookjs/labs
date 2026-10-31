<script lang="ts">
  import Button from '#lib/ui/Button.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';
  import Skeleton from '#lib/ui/Skeleton.svelte';

  import PostArticle from './PostArticle.svelte';

  let { id }: { id: number } = $props();
</script>

<svelte:boundary>
  <PostArticle {id} />

  {#snippet pending()}
    <div class="loading" role="status" aria-busy="true" aria-label="Loading post">
      <Skeleton height="3rem" width="70%" />
      <Skeleton height="1rem" width="40%" />
      <Skeleton lines={8} />
    </div>
  {/snippet}

  {#snippet failed(error, reset)}
    {@const status = (error as { status?: number })?.status}
    <EmptyState
      title={status === 404 ? 'Post not found' : 'The post did not load'}
      description={(error as { body?: { message?: string } })?.body?.message ??
        'Something went wrong on our side.'}
    >
      {#snippet action()}
        {#if status === 404}
          <Button variant="secondary" href="/">Back to all posts</Button>
        {:else}
          <Button variant="secondary" onclick={reset}>Try again</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {/snippet}
</svelte:boundary>

<style>
  .loading {
    display: grid;
    gap: var(--space-4);
  }
</style>
