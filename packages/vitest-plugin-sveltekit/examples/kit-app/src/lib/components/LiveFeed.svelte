<script lang="ts">
  import { getFeed } from '#lib/feed.remote.ts';

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

<section aria-label="Live feed">
  {#if feed.error}
    <p role="alert">Feed failed: {errorMessage(feed.error)}</p>
  {:else if feed.current === undefined}
    <p>Connecting…</p>
  {:else}
    <p><output data-testid="feed-count">{feed.current.count}</output> posts</p>
    <ul>
      {#each feed.current.latest as post (post.id)}
        <li>{post.title}</li>
      {:else}
        <li>No posts yet</li>
      {/each}
    </ul>
  {/if}

  <p>
    <small data-testid="feed-status">{feed.done ? 'ended' : feed.connected ? 'live' : 'offline'}</small>
    · last update <time data-testid="feed-updated">{updatedAt ?? '–'}</time>
  </p>
  <button onclick={() => feed.reconnect()}>Reconnect</button>
</section>
