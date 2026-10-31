<script lang="ts">
  interface Props {
    width?: string;
    height?: string;
    lines?: number;
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
