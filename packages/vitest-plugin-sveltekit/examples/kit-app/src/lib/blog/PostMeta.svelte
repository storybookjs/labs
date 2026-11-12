<script lang="ts">
  import Avatar from '#lib/ui/Avatar.svelte';
  import Badge from '#lib/ui/Badge.svelte';

  import { formatDate, formatRelative, type PostSummary } from './posts.ts';

  let {
    post,
  }: { post: Pick<PostSummary, 'author' | 'createdAt' | 'updatedAt' | 'readingMinutes' | 'published'> } =
    $props();

  // Edited at least a minute after it was written.
  const edited = $derived(post.updatedAt.getTime() - post.createdAt.getTime() > 60_000);
</script>

<p class="meta">
  <span class="item">
    <Avatar name={post.author} size="sm" />
    <span class="author">{post.author}</span>
  </span>
  <span class="item">
    <time datetime={post.createdAt.toISOString()}>{formatDate(post.createdAt)}</time>
  </span>
  <span class="item">{post.readingMinutes} min read</span>
  {#if edited}
    <span class="item">
      edited <time datetime={post.updatedAt.toISOString()}>{formatRelative(post.updatedAt)}</time>
    </span>
  {/if}
  {#if !post.published}
    <Badge tone="warning">Draft</Badge>
  {/if}
</p>

<style>
  .meta {
    align-items: center;
    color: var(--color-text-muted);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    gap: var(--space-1) var(--space-2);
    margin: 0;
  }
  .item {
    align-items: center;
    display: inline-flex;
    gap: var(--space-2);
    white-space: nowrap;
  }
  /* The separator starts the next item, so a wrapped line never ends on a lone dot. */
  .item + .item::before {
    content: '·' / '';
  }
  .author {
    color: var(--color-text);
    font-weight: var(--weight-semibold);
  }
</style>
