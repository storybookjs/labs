<script lang="ts">
  import { pageItems } from './pagination.ts';

  interface Props {
    page: number;
    pageCount: number;
    href: (page: number) => string;
    label?: string;
  }

  let { page, pageCount, href, label = 'Pagination' }: Props = $props();

  const current = $derived(Math.min(Math.max(1, page), pageCount));
  const items = $derived(pageItems(current, pageCount));
</script>

{#if pageCount > 1}
  <nav class="pagination" aria-label={label}>
    {#if current > 1}
      <a class="step" href={href(current - 1)} rel="prev">
        <span aria-hidden="true">←</span> Previous
      </a>
    {:else}
      <span class="step disabled"><span aria-hidden="true">←</span> Previous</span>
    {/if}

    <ol class="pages">
      {#each items as item, index (index)}
        <li>
          {#if item === 'gap'}
            <span class="gap" aria-hidden="true">…</span>
          {:else}
            <a
              class="page"
              href={href(item)}
              aria-label="Page {item}"
              aria-current={item === current ? 'page' : undefined}>{item}</a
            >
          {/if}
        </li>
      {/each}
    </ol>
    <p class="summary">Page {current} of {pageCount}</p>

    {#if current < pageCount}
      <a class="step" href={href(current + 1)} rel="next">
        Next <span aria-hidden="true">→</span>
      </a>
    {:else}
      <span class="step disabled">Next <span aria-hidden="true">→</span></span>
    {/if}
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .pages {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .step,
  .page,
  .gap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text);
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }

  a.step,
  .page {
    border: 1px solid transparent;
    transition:
      background-color var(--duration-fast) var(--easing-standard),
      border-color var(--duration-fast) var(--easing-standard);
  }

  a.step:hover,
  .page:hover {
    border-color: var(--color-border-strong);
    background: var(--color-surface-raised);
  }

  a:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .page[aria-current='page'] {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-contrast);
    font-weight: var(--weight-semibold);
  }

  .disabled {
    color: var(--color-text-muted);
    opacity: 0.6;
    cursor: not-allowed;
  }

  .gap {
    min-width: 1.5rem;
    padding: 0;
    color: var(--color-text-muted);
  }

  .summary {
    display: none;
    margin: 0 var(--space-2);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Too narrow for the page numbers: previous, "Page 3 of 10", next. */
  @media (max-width: 40rem) {
    .pages {
      display: none;
    }

    .summary {
      display: block;
    }

    .pagination {
      justify-content: space-between;
    }
  }
</style>
