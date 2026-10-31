<script module lang="ts">
  // The theme is `<html data-theme>`. `src/app.html` reads this key before the first paint and
  // cannot import it, and `.storybook/preview.ts` sets the same attribute: keep them in step.
  export const THEME_STORAGE_KEY = 'field-notes-theme';

  type Theme = 'light' | 'dark';

  const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';
</script>

<script lang="ts">
  import { onMount } from 'svelte';

  let theme = $state<Theme>('light');

  onMount(() => {
    const root = document.documentElement;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const stored = readStoredTheme();

    // A theme already on the page wins: an inline script in `app.html`, or Storybook's toolbar.
    if (isTheme(root.dataset.theme)) {
      theme = root.dataset.theme;
    } else if (stored) {
      theme = stored;
      root.dataset.theme = stored;
    } else {
      theme = query.matches ? 'dark' : 'light';
    }

    // Without a choice of its own, the page follows the system.
    const followSystem = () => {
      if (!isTheme(root.dataset.theme)) theme = query.matches ? 'dark' : 'light';
    };
    query.addEventListener('change', followSystem);
    return () => query.removeEventListener('change', followSystem);
  });

  function readStoredTheme(): Theme | null {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(value) ? value : null;
    } catch {
      return null;
    }
  }

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be off (private mode); the choice then lasts until the page reloads.
    }
  }
</script>

<button
  type="button"
  class="toggle"
  aria-pressed={theme === 'dark'}
  title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
  onclick={toggle}
>
  <span class="visually-hidden">Dark theme</span>
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {#if theme === 'dark'}
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linejoin="round"
      />
    {:else}
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.75" />
      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    {/if}
  </svg>
</button>

<style>
  .toggle {
    display: inline-grid;
    place-items: center;
    flex: none;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--easing-standard),
      border-color var(--duration-fast) var(--easing-standard);
  }

  .toggle:hover {
    border-color: var(--color-border-strong);
    background: var(--color-surface-sunken);
  }

  .toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
