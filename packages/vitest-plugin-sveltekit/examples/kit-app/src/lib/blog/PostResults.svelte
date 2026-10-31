<script lang="ts">
  import Button from '#lib/ui/Button.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';
  import Pagination from '#lib/ui/Pagination.svelte';

  import { listPosts } from './blog.remote.ts';
  import PostCard from './PostCard.svelte';
  import PostFilters from './PostFilters.svelte';
  import { defaultListParams, listHref, type ListParams } from './posts.ts';

  let {
    params,
    onfilter,
    onsince,
  }: {
    params: ListParams;
    onfilter: (next: Partial<ListParams>) => void;
    /** When the newest post was published, once these results are on screen. */
    onsince?: (lastPublishedAt: number) => void;
  } = $props();

  const query = $derived(listPosts(params));
  // While new filters load, the old results stay on screen (the boundary shows `pending` once).
  const data = $derived(await query);
  const filtered = $derived(params.q !== '' || params.tag !== '' || params.status !== 'published');

  $effect(() => onsince?.(data.lastPublishedAt));
</script>

<PostFilters {params} tags={data.tags} {onfilter} />

<p class="summary" aria-live="polite">
  {data.total === 1 ? '1 post' : `${data.total} posts`}
  {#if params.tag}tagged <strong>#{params.tag}</strong>{/if}
  {#if params.q}matching <strong>“{params.q}”</strong>{/if}
  {#if filtered}
    <a href={listHref({})} onclick={(event) => (event.preventDefault(), onfilter(defaultListParams))}>
      Clear filters
    </a>
  {/if}
</p>

{#if data.posts.length === 0}
  <EmptyState
    title={filtered ? 'No posts match' : 'No posts yet'}
    description={filtered
      ? 'Try another search or tag.'
      : 'Write the first one: it shows up here for everyone.'}
  >
    {#snippet action()}
      {#if filtered}
        <Button variant="secondary" onclick={() => onfilter(defaultListParams)}>Clear filters</Button>
      {:else}
        <Button href="/posts/new">Write a post</Button>
      {/if}
    {/snippet}
  </EmptyState>
{:else}
  <ol class="posts">
    {#each data.posts as post (post.id)}
      <li><PostCard {post} activeTag={params.tag} /></li>
    {/each}
  </ol>
{/if}

<Pagination
  page={data.page}
  pageCount={data.pageCount}
  href={(page) => listHref({ ...params, page })}
/>

<style>
  .summary {
    color: var(--color-text-muted);
    margin: 0;
  }
  .summary a {
    color: var(--color-accent);
    margin-left: var(--space-2);
  }
  .posts {
    display: grid;
    gap: var(--space-5);
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
