<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { listHref, type ListParams, parseListParams } from '#lib/blog/posts.ts';
  import HomePage from '#lib/pages/HomePage.svelte';

  // The filters live in the URL, so a filtered list can be shared and survives a reload.
  const params = $derived(parseListParams(page.url.searchParams));

  function onfilter(next: Partial<ListParams>) {
    // `reset: false` keeps the scroll position and the focus in the search field.
    void goto(listHref({ ...params, ...next }), { reset: false });
  }
</script>

<HomePage {params} {onfilter} />
