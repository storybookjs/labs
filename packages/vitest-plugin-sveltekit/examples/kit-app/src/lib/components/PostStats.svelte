<script lang="ts">
  import { getStats } from '#lib/posts.remote';

  let { id }: { id: number } = $props();

  // One request per macrotask for all rows: `getStats` is a `query.batch`.
  const stats = $derived(await getStats(id));
</script>

<small data-testid="stats-{id}">{stats.views} views, {stats.likes} likes</small>
