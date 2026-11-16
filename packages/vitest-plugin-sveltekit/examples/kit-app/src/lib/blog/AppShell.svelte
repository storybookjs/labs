<!--
@component
The frame of every page of Field Notes: `Layout` with the site `Header`, its Posts link and
New post button, and the `Footer`. Use it as the outer element of a new page, and put the
content of the page in it. The Posts link is marked as the current page on the home page and
on the post pages.

@summary the frame of every page: header, navigation, main content and footer
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  import { page } from '$app/state';
  import Button from '#lib/ui/Button.svelte';
  import Footer from '#lib/ui/Footer.svelte';
  import Header from '#lib/ui/Header.svelte';
  import Layout from '#lib/ui/Layout.svelte';

  let {
    children,
    width = 'wide',
  }: {
    /** The content of the page. */
    children: Snippet;
    /** `narrow` (42rem) for a post or a form, `wide` (72rem) for a list. */
    width?: 'narrow' | 'wide';
  } = $props();

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
        Field Notes is an example app for <code>vitest-plugin-sveltekit</code>. Its posts
        live in a Postgres database.
      </p>
    </Footer>
  {/snippet}
</Layout>
