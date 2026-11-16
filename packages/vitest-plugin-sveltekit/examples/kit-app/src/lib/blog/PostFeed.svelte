<!--
@component
The list of posts, with its filters, pagination and the banner for new posts. It loads the
posts itself with `listPosts(params)`. While they load, it shows skeletons. It also has empty
states, and an error with a Try again button.

The parent owns the filters: it gives `params` and changes them in `onfilter`, for example in
the URL, as `HomePage` does.

@summary the list of posts, with filters and pagination, that loads its own data
-->
<script lang="ts">
  import Button from '#lib/ui/Button.svelte';
  import Card from '#lib/ui/Card.svelte';
  import EmptyState from '#lib/ui/EmptyState.svelte';
  import Skeleton from '#lib/ui/Skeleton.svelte';

  import { listPosts } from './blog.remote.ts';
  import NewPostsBanner from './NewPostsBanner.svelte';
  import PostResults from './PostResults.svelte';
  import type { ListParams } from './posts.ts';

  let {
    params,
    onfilter,
  }: {
    /** The search, tag, status, sort and page to show. */
    params: ListParams;
    /** Called when the reader changes a filter or the page, with the values that changed. */
    onfilter: (next: Partial<ListParams>) => void;
  } = $props();

  // The newest publication the reader sees, from the results once they are on screen. The banner
  // lives outside the boundary: inside, its live query joined the list's async update, and the old
  // banner stayed on screen with "0 new posts" after Show.
  let since = $state<number>();

  // "Show": the first page of the same filters and sort, loaded again (it may be cached from an
  // earlier visit). Sorted newest first, the new posts are at the top of it; another sort puts them
  // where it sorts them, and a filter they do not match leaves them out. Either way, the banner
  // then counts from the newest publication again.
  async function showNewPosts() {
    await listPosts({ ...params, page: 1 }).refresh();
    if (params.page !== 1) onfilter({ page: 1 });
  }
</script>

<section class="feed" aria-label="Posts">
  {#if since !== undefined}
    <NewPostsBanner {since} onshow={showNewPosts} />
  {/if}

  <svelte:boundary>
    <PostResults {params} {onfilter} onsince={(value) => (since = value)} />

    {#snippet pending()}
      <div class="loading" role="status" aria-busy="true" aria-label="Loading posts">
        <Skeleton height="2.75rem" />
        {#each [1, 2, 3] as item (item)}
          <Card><Skeleton lines={4} /></Card>
        {/each}
      </div>
    {/snippet}

    {#snippet failed(error, reset)}
      <EmptyState
        title="The posts did not load"
        description={(error as { body?: { message?: string } })?.body?.message ??
          'Something went wrong on our side.'}
      >
        {#snippet action()}
          <Button variant="secondary" onclick={reset}>Try again</Button>
        {/snippet}
      </EmptyState>
    {/snippet}
  </svelte:boundary>
</section>

<style>
  .feed,
  .loading {
    display: grid;
    gap: var(--space-5);
  }
</style>
