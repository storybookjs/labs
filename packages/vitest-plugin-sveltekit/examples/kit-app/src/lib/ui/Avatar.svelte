<script lang="ts">
  interface Props {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    src?: string;
  }

  let { name, size = 'md', src }: Props = $props();

  const initials = $derived(
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => Array.from(word)[0]!)
      .filter((_, index, letters) => index === 0 || index === letters.length - 1)
      .join('')
      .toUpperCase()
  );

  // A stable hue per name. OKLCH keeps the lightness, and with it the contrast of the white
  // initials, the same for every hue.
  const hue = $derived.by(() => {
    let hash = 0;
    for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
    return hash % 360;
  });
</script>

{#if src}
  <img class={['avatar', size]} {src} alt={name} />
{:else}
  <span class={['avatar', size]} role="img" aria-label={name} style:--avatar-hue={hue}>
    <span aria-hidden="true">{initials || '?'}</span>
  </span>
{/if}

<style>
  .avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: var(--radius-full);
    background: oklch(0.5 0.09 var(--avatar-hue, 40));
    color: #fff;
    font-size: calc(var(--avatar-size) * 0.4);
    font-weight: var(--weight-semibold);
    line-height: 1;
    letter-spacing: 0.02em;
    object-fit: cover;
    user-select: none;
  }

  .sm {
    --avatar-size: 1.75rem;
  }

  .md {
    --avatar-size: 2.5rem;
  }

  .lg {
    --avatar-size: 3.5rem;
  }
</style>
