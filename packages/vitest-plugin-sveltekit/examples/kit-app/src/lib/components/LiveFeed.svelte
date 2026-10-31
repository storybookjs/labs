<script lang="ts">
  import { getFeed } from '#lib/feed.remote.ts';
  import Button from '#lib/ui/Button.svelte';

  import { errorMessage } from './error-message.ts';

  const feed = getFeed();

  // When the last value arrived, so each change is easy to see.
  let updatedAt = $state<string>();
  $effect(() => {
    if (feed.current !== undefined || feed.error !== undefined) {
      updatedAt = new Date().toISOString().slice(11, 23);
    }
  });
</script>

<section class="feed" aria-label="Live feed">
  {#if feed.error}
    <p class="failed" role="alert">Feed failed: {errorMessage(feed.error)}</p>
  {:else if feed.current === undefined}
    <p class="muted">Connecting…</p>
  {:else}
    <p class="count"><output data-testid="feed-count">{feed.current.count}</output> posts</p>
    <ul class="latest">
      {#each feed.current.latest as post (post.id)}
        <li>{post.title}</li>
      {:else}
        <li class="muted">No posts yet</li>
      {/each}
    </ul>
  {/if}

  <div class="footer">
    <p class="muted">
      <small class="status" data-testid="feed-status"
        >{feed.done ? 'ended' : feed.connected ? 'live' : 'offline'}</small
      >
      · last update <time data-testid="feed-updated">{updatedAt ?? '–'}</time>
    </p>
    <Button size="sm" variant="secondary" onclick={() => feed.reconnect()}>Reconnect</Button>
  </div>
</section>

<style>
  .feed {
    display: grid;
    gap: var(--space-4);
    max-width: 28rem;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }
  p {
    margin: 0;
  }
  .count {
    font-size: var(--text-lg);
  }
  output {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    margin-right: var(--space-1);
  }
  .latest {
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .latest li {
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }
  .footer {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: space-between;
  }
  .muted {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
  .status {
    color: var(--color-accent);
    font-weight: var(--weight-semibold);
  }
  .failed {
    color: var(--color-danger);
  }
</style>
