<!--
@component
The views and likes of a post, such as "1.3K views" and "96 likes". It loads them itself with
`getReadingStats(id)`: one request for all the stats on the page. While they load, it shows a
skeleton, and when they fail, "Stats unavailable".

@summary the views and likes of a post, which load on their own
-->
<script lang="ts">
  import Skeleton from '#lib/ui/Skeleton.svelte';

  import { getReadingStats } from './blog.remote.ts';
  import { countOf } from './posts.ts';

  let {
    id,
  }: {
    /** The id of the post. */
    id: number;
  } = $props();

</script>

<!-- One request for every card on the page: `getReadingStats` is a `query.batch`. -->
<svelte:boundary>
  {@const stats = await getReadingStats(id)}
  <p class="stats" data-testid="reading-stats-{id}">
    <span class="item">{countOf(stats.views, 'view')}</span>
    <span class="item">{countOf(stats.likes, 'like')}</span>
  </p>

  {#snippet pending()}
    <Skeleton width="9rem" height="1rem" />
  {/snippet}

  {#snippet failed()}
    <p class="stats">Stats unavailable</p>
  {/snippet}
</svelte:boundary>

<style>
  .stats {
    color: var(--color-text-muted);
    display: flex;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    margin: 0;
  }
  .item {
    white-space: nowrap;
  }
  /* The separator starts the next item, so a wrapped line never ends on a lone dot. */
  .item + .item::before {
    content: '·' / '';
    margin-inline: var(--space-2);
  }
</style>
