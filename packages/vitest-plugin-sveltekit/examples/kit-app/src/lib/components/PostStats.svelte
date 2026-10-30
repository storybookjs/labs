<script lang="ts">
  import { getStats } from '#lib/posts.remote.ts';

  let { id }: { id: number } = $props();

  // One request per macrotask for all rows: `getStats` is a `query.batch`.
  const stats = $derived(getStats(id));
</script>

<small data-testid="stats-{id}">{(await stats).views} views, {(await stats).likes} likes</small>
