<script lang="ts">
  import type { Snippet } from 'svelte';

  import { page } from '$app/state';
  import Button from '#lib/ui/Button.svelte';
  import Footer from '#lib/ui/Footer.svelte';
  import Header from '#lib/ui/Header.svelte';
  import Layout from '#lib/ui/Layout.svelte';

  let { children, width = 'wide' }: { children: Snippet; width?: 'narrow' | 'wide' } = $props();

  const onPosts = $derived(page.url.pathname === '/' || page.url.pathname.startsWith('/posts/'));
</script>

<Layout {width}>
  {#snippet header()}
    <Header>
      {#snippet nav()}
        <a href="/" aria-current={onPosts ? 'page' : undefined}>Posts</a>
      {/snippet}
      {#snippet actions()}
        <Button size="sm" href="/posts/new">New post</Button>
      {/snippet}
    </Header>
  {/snippet}

  {@render children()}

  {#snippet footer()}
    <Footer>
      <p>
        Field Notes is an example app for <code>@storybookjs/vitest-plugin-sveltekit</code>. Its posts
        live in a PGlite database on this machine.
      </p>
    </Footer>
  {/snippet}
</Layout>
