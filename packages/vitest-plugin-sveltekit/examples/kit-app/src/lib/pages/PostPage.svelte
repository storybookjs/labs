<script lang="ts">
  import PostView from '#lib/blog/PostView.svelte';

  let { id }: { id: number } = $props();
</script>

<div class="page">
  <a class="back" href="/">← All posts</a>
  <PostView {id} />
</div>

<style>
  .page {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: minmax(0, 1fr);
  }
  .back {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-decoration: none;
  }
  .back:hover {
    color: var(--color-accent);
  }
</style>
