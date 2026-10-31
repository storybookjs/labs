<script lang="ts">
  import Tag from '#lib/ui/Tag.svelte';

  import { listHref } from './posts.ts';

  let { tags, active }: { tags: string[]; active?: string } = $props();
</script>

{#if tags.length > 0}
  <ul class="tags" aria-label="Tags">
    {#each tags as tag (tag)}
      <li><Tag href={listHref({ tag })} active={tag === active}>{tag}</Tag></li>
    {/each}
  </ul>
{/if}

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
