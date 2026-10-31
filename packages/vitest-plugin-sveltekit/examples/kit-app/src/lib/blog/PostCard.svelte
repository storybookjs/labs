<script lang="ts">
  import Card from '#lib/ui/Card.svelte';

  import PostMeta from './PostMeta.svelte';
  import type { PostSummary } from './posts.ts';
  import ReadingStats from './ReadingStats.svelte';
  import TagList from './TagList.svelte';

  let { post, activeTag }: { post: PostSummary; activeTag?: string } = $props();
</script>

<Card as="article" interactive>
  <div class="card">
    <h2 class="title"><a href="/posts/{post.id}">{post.title}</a></h2>
    <PostMeta {post} />
    {#if post.excerpt}
      <p class="excerpt">{post.excerpt}</p>
    {/if}
    <div class="footer">
      <TagList tags={post.tags} active={activeTag} />
      <ReadingStats id={post.id} />
    </div>
  </div>
</Card>

<style>
  .card {
    display: grid;
    gap: var(--space-3);
  }
  .title {
    font-size: var(--text-xl);
    line-height: var(--leading-tight);
    margin: 0;
  }
  .title a {
    color: inherit;
    text-decoration: none;
  }
  .title a:hover {
    color: var(--color-accent);
  }
  /* The whole card is the link's click target; the tags stay clickable above it. */
  .title a::after {
    content: '';
    inset: 0;
    position: absolute;
  }
  .excerpt {
    color: var(--color-text-muted);
    margin: 0;
  }
  .footer {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }
</style>
