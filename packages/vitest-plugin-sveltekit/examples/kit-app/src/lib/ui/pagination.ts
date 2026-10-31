export type PageItem = number | 'gap';

/** The page numbers to show: always the first, the last and the neighbours of the current page. */
export function pageItems(page: number, pageCount: number): PageItem[] {
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
  if (pageCount <= 7) return range(1, pageCount);

  let start = Math.max(2, Math.min(page - 1, pageCount - 4));
  let end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  // A gap that hides one page takes as much room as that page, so show the page.
  if (start === 3) start = 2;
  if (end === pageCount - 2) end = pageCount - 1;

  return [
    1,
    ...(start > 2 ? ['gap' as const] : []),
    ...range(start, end),
    ...(end < pageCount - 1 ? ['gap' as const] : []),
    pageCount,
  ];
}
