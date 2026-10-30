<script lang="ts">
  import { getPostCount } from '#lib/posts.remote';

  import { errorMessage } from './error-message.ts';

  const count = getPostCount();
</script>

<p aria-live="polite">
  {#if count.error}
    <span role="alert">Live count failed: {errorMessage(count.error)}</span>
  {:else if count.current === undefined}
    Counting posts…
  {:else}
    <output>{count.current}</output> posts
  {/if}
  <small data-testid="live-status">{count.done ? 'done' : count.connected ? 'live' : 'offline'}</small>
</p>
