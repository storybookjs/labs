<!--
  @component
  A shimmering placeholder in the shape of content that is still loading: a line of text, a
  paragraph, a heading or an avatar. Screen readers skip it, so tell them what loads in another
  way, such as `aria-busy` and `aria-label` on the parent.

  @summary a placeholder in the shape of content that is still loading
-->
<script lang="ts">
  interface Props {
    /** Any CSS width. The default is the full width. */
    width?: string;
    /** Any CSS height, for one bar. The default is the height of a line of text. */
    height?: string;
    /** The number of bars, for a paragraph. The last bar is shorter. */
    lines?: number;
    /** The corner radius. Use `var(--radius-full)` for a circle, such as an avatar. */
    radius?: string;
  }

  let { width = '100%', height, lines = 1, radius = 'var(--radius-sm)' }: Props = $props();
</script>

<div
  class="skeleton"
  aria-hidden="true"
  style:--skeleton-width={width}
  style:--skeleton-height={height ?? (lines > 1 ? '0.875em' : '1em')}
  style:--skeleton-radius={radius}
>
  {#each { length: Math.max(1, lines) } as _, index (index)}
    <span class="bar" class:last={lines > 1 && index === lines - 1}></span>
  {/each}
</div>

<style>
  .skeleton {
    display: grid;
    gap: 0.625em;
    width: var(--skeleton-width);
    max-width: 100%;
  }

  .bar {
    display: block;
    height: var(--skeleton-height);
    border-radius: var(--skeleton-radius);
    background: linear-gradient(
        90deg,
        transparent 0%,
        var(--color-skeleton-shine) 50%,
        transparent 100%
      )
      no-repeat var(--color-skeleton);
    background-size: 50% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  .last {
    width: 60%;
  }

  @media (prefers-reduced-motion: reduce) {
    .bar {
      animation: none;
      background-image: none;
    }
  }

  @keyframes shimmer {
    from {
      background-position: -100% 0;
    }
    to {
      background-position: 200% 0;
    }
  }
</style>
