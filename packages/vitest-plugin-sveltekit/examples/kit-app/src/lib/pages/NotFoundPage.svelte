<script lang="ts">
  import Button from '#lib/ui/Button.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';

  let { message = 'There is no page at this address.' }: { message?: string } = $props();
</script>

<svelte:head><title>Not found · Field Notes</title></svelte:head>

<div class="page">
  <EmptyState title="404: not found" description={message}>
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
