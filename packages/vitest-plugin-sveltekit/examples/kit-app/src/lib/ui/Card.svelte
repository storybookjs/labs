<!--
@component
A surface that groups related content, with an optional header and footer. Set `as` to give it
the right element: `article` for one item of a list, such as a post, and `section` for a group
with a title.

Set `interactive` when the card holds the link to a page of its own: the card then lifts on
hover. The card itself is not a link, so put the link in its content.

@summary a surface that groups content, with an optional header and footer
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * The element: `article` for one item of a list, `section` for a group with a title, `div` for
     * other content.
     */
    as?: 'article' | 'div' | 'section';
    /**
     * Lifts the card on hover. Use it when the card holds the link to a page of its own, as
     * `PostCard` does.
     */
    interactive?: boolean;
    /** The main content. */
    children: Snippet;
    /** Content above the main content, such as a title or a badge. Rendered in a `<header>`. */
    header?: Snippet;
    /** Content below the main content, such as tags or links. Rendered in a `<footer>`. */
    footer?: Snippet;
  }

  let { as = 'div', interactive = false, children, header, footer }: Props = $props();
</script>

<svelte:element this={as} class={['card', { interactive }]}>
  {#if header}
    <header class="header">{@render header()}</header>
  {/if}
  <div class="body">{@render children()}</div>
  {#if footer}
    <footer class="footer">{@render footer()}</footer>
  {/if}
</svelte:element>

<style>
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    overflow-wrap: anywhere;
  }

  .header,
  .body,
  .footer {
    padding: var(--space-4) var(--space-5);
  }

  .header {
    border-bottom: 1px solid var(--color-border);
  }

  .body {
    flex: 1;
  }

  .footer {
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .interactive {
    transition:
      transform var(--duration-normal) var(--easing-standard),
      box-shadow var(--duration-normal) var(--easing-standard),
      border-color var(--duration-normal) var(--easing-standard);
  }

  .interactive:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .interactive:focus-within {
    border-color: var(--color-focus);
  }

  @media (max-width: 30rem) {
    .header,
    .body,
    .footer {
      padding-inline: var(--space-4);
    }
  }
</style>
