<!--
@component
The tags of a post, as a row of `Tag` links to the posts with that tag. It marks the tag that
filters the list now. With no tags, it shows nothing.

@summary the tags of a post, as links to the posts with each tag
-->
<script lang="ts">
  import Tag from '#lib/ui/Tag.svelte';

  import { listHref } from './posts.ts';

  let {
    tags,
    active,
  }: {
    /** The tag names, without `#`. */
    tags: string[];
    /** The tag that filters the list now. */
    active?: string;
  } = $props();
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
