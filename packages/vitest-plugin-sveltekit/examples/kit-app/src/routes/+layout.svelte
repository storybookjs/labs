<script lang="ts">
  import '#lib/ui/tokens.css';

  import { page } from '$app/state';
  import AppShell from '#lib/blog/AppShell.svelte';

  let { children } = $props();

  // Reading and writing pages (a post, the editor, sign-in, an error) use the narrow column, the
  // list the wide one; the `Pages/…` stories pass the same widths.
  const width = $derived(
    page.error || page.route.id?.startsWith('/posts') || page.route.id === '/sign-in'
      ? 'narrow'
      : 'wide'
  );
</script>

<AppShell {width}>
  {@render children()}
</AppShell>
