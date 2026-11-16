<!--
@component
A topic label with a `#`, such as #svelte. With `href` it is a link, usually to the posts with
this tag. For a status, such as Draft, use `Badge`. For the tags of a post, use `TagList`.

@summary a #topic label that can link to the posts with this tag
@import import Tag from '#lib/ui/Tag.svelte';
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Makes the tag a link. */
    href?: string;
    /** Marks the tag that filters the list now. A link also gets `aria-current`. */
    active?: boolean;
    /** The tag name, without the `#`. */
    children: Snippet;
  }

  let { href, active = false, children }: Props = $props();
</script>

{#if href !== undefined}
  <a {href} class={['tag', { active }]} aria-current={active ? 'true' : undefined}>
    <span aria-hidden="true">#</span><span class="text">{@render children()}</span>
  </a>
{:else}
  <span class={['tag', { active }]}
    ><span aria-hidden="true">#</span><span class="text">{@render children()}</span></span
  >
{/if}

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    max-width: 100%;
    min-height: 1.75rem;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-tight);
    text-decoration: none;
    white-space: nowrap;
    transition:
      background-color var(--duration-fast) var(--easing-standard),
      border-color var(--duration-fast) var(--easing-standard),
      color var(--duration-fast) var(--easing-standard);
  }

  /* `text-overflow` needs a block box; the tag itself is a flex box. */
  .text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  a.tag:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  a.tag:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .active,
  a.active:hover {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-contrast);
  }
</style>
