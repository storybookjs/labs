<script lang="ts">
  import PostFeed from '#lib/blog/PostFeed.svelte';
  import type { ListParams } from '#lib/blog/posts.ts';

  let {
    params,
    onfilter,
  }: { params: ListParams; onfilter: (next: Partial<ListParams>) => void } = $props();
</script>

<svelte:head>
  <title>Field Notes</title>
  <meta name="description" content="Short notes on building, testing and writing software." />
</svelte:head>

<div class="home">
  <header class="intro">
    <h1>Field Notes</h1>
    <p>Short notes on building, testing and writing software, from a small team.</p>
  </header>
  <PostFeed {params} {onfilter} />
</div>

<style>
  .home {
    display: grid;
    gap: var(--space-8);
  }
  .intro h1 {
    font-size: clamp(var(--text-3xl), 6vw, var(--text-4xl));
    letter-spacing: -0.02em;
    margin: 0 0 var(--space-2);
  }
  .intro p {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
    margin: 0;
    max-width: 48ch;
  }
</style>
