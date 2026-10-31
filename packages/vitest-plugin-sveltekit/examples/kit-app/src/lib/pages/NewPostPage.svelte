<script lang="ts">
  import PostEditor from '#lib/blog/PostEditor.svelte';
</script>

<svelte:head><title>New post · Field Notes</title></svelte:head>

<div class="page">
  <h1>New post</h1>
  <PostEditor />
</div>

<style>
  .page {
    display: grid;
    gap: var(--space-6);
  }
  h1 {
    margin: 0;
  }
</style>
