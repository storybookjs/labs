<script lang="ts">
  import { renderMarkdown } from './markdown.ts';

  let { source }: { source: string } = $props();

  const html = $derived(renderMarkdown(source));
</script>

<div class="prose">
  <!-- Safe: markdown-it runs with `html: false` and validates links (see `markdown.ts`). -->
  {@html html}
</div>

<style>
  .prose {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    line-height: var(--leading-relaxed);
    max-width: 68ch;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .prose :global(:is(h2, h3)) {
    line-height: var(--leading-tight);
    margin: var(--space-8) 0 var(--space-3);
  }
  .prose :global(h2) {
    font-size: var(--text-2xl);
  }
  .prose :global(h3) {
    font-size: var(--text-xl);
  }
  .prose :global(p),
  .prose :global(ul),
  .prose :global(ol),
  .prose :global(blockquote),
  .prose :global(pre),
  .prose :global(table) {
    margin: 0 0 var(--space-5);
  }
  .prose :global(a) {
    color: var(--color-accent);
    text-underline-offset: 0.2em;
  }
  .prose :global(blockquote) {
    border-left: 3px solid var(--color-accent);
    color: var(--color-text-muted);
    font-style: italic;
    padding-left: var(--space-4);
  }
  .prose :global(code) {
    background: var(--color-surface-raised);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.85em;
    padding: 0.1em 0.35em;
  }
  .prose :global(pre) {
    background: var(--color-surface-raised);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
    max-width: 100%;
    overflow-x: auto;
    padding: var(--space-4);
    /* Long lines wrap: a scrolled code block looked cut off, and widened the page on phones. */
    white-space: pre-wrap;
  }
  .prose :global(pre code) {
    background: none;
    font-size: var(--text-sm);
    padding: 0;
  }
  .prose :global(table) {
    /* A wide table scrolls inside the post instead of widening the page. */
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    font-family: var(--font-sans);
    font-size: var(--text-md);
  }
  .prose :global(:is(th, td)) {
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-4) var(--space-2) 0;
    text-align: left;
  }
</style>
