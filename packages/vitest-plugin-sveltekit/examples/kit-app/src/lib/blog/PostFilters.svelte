<script lang="ts">
  import Input from '#lib/ui/Input.svelte';
  import Select from '#lib/ui/Select.svelte';

  import { type ListParams, sortOptions, statusOptions, type TagCount } from './posts.ts';

  let {
    params,
    tags,
    onfilter,
  }: {
    params: ListParams;
    tags: TagCount[];
    /** A filter changed; the list goes back to its first page. */
    onfilter: (next: Partial<ListParams>) => void;
  } = $props();

  const tagOptions = $derived([
    { value: '', label: 'All tags' },
    ...tags.map(({ name, count }) => ({ value: name, label: `#${name} (${count})` })),
  ]);

  // Search as the reader types, a moment after the last key.
  let timer: ReturnType<typeof setTimeout> | undefined;
  function search(value: string) {
    clearTimeout(timer);
    timer = setTimeout(() => onfilter({ q: value, page: 1 }), 300);
  }
</script>

<form class="filters" role="search" aria-label="Filter posts" onsubmit={(event) => event.preventDefault()}>
  <div class="search">
    <Input
      label="Search"
      type="search"
      placeholder="Title or text"
      value={params.q}
      oninput={(event: Event) => search((event.currentTarget as HTMLInputElement).value)}
    />
  </div>
  <Select
    label="Tag"
    options={tagOptions}
    value={params.tag}
    onchange={(event: Event) => onfilter({ tag: (event.currentTarget as HTMLSelectElement).value, page: 1 })}
  />
  <Select
    label="Sort"
    options={[...sortOptions]}
    value={params.sort}
    onchange={(event: Event) =>
      onfilter({ sort: (event.currentTarget as HTMLSelectElement).value as ListParams['sort'], page: 1 })}
  />
  <Select
    label="Show"
    options={[...statusOptions]}
    value={params.status}
    onchange={(event: Event) =>
      onfilter({
        status: (event.currentTarget as HTMLSelectElement).value as ListParams['status'],
        page: 1,
      })}
  />
</form>

<style>
  .filters {
    display: grid;
    gap: var(--space-3);
    grid-template-columns: minmax(12rem, 2fr) repeat(3, minmax(8rem, 1fr));
  }
  @media (max-width: 48rem) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }
    .search {
      grid-column: 1 / -1;
    }
  }
</style>
