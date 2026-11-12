<script lang="ts">
  import Button from '#lib/ui/Button.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';

  let { status, message }: { status: number; message?: string } = $props();
</script>

<svelte:head><title>Error · Field Notes</title></svelte:head>

<div class="page">
  <EmptyState
    title="{status}: something went wrong"
    description={message ?? 'The page could not be shown. Try again in a moment.'}
  >
    {#snippet action()}
      <Button href="/">Back to all posts</Button>
    {/snippet}
  </EmptyState>
</div>

<style>
  .page {
    padding-block: var(--space-8);
  }
</style>
