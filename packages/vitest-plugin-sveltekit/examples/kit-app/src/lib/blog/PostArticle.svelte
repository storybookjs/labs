<script lang="ts">
  import { untrack } from 'svelte';

  import Button from '#lib/ui/Button.svelte';

  import { countView, readPost } from './blog.remote.ts';
  import DeletePostButton from './DeletePostButton.svelte';
  import Markdown from './Markdown.svelte';
  import PostMeta from './PostMeta.svelte';
  import ReadingStats from './ReadingStats.svelte';
  import TagList from './TagList.svelte';

  let { id }: { id: number } = $props();

  const post = $derived(await readPost(id));

  // One view per visit of the page. Untracked: a command reads its own `pending` state, which
  // would run this effect again after each call.
  $effect(() => {
    const visited = id;
    untrack(() => void countView(visited));
  });
</script>

<article class="article">
  <header class="header">
    <h1 class="title">{post.title}</h1>
    <PostMeta {post} />
    <TagList tags={post.tags} />
  </header>

  <Markdown source={post.body} />

  <footer class="footer">
    <ReadingStats {id} />
    <div class="actions">
      <Button variant="secondary" href="/posts/{post.id}/edit">Edit</Button>
      <DeletePostButton id={post.id} title={post.title} />
    </div>
  </footer>
</article>

<style>
  .article {
    display: grid;
    gap: var(--space-8);
    /* Lets the column shrink below its widest content (a long code line) on a phone. */
    grid-template-columns: minmax(0, 1fr);
  }
  .header {
    display: grid;
    gap: var(--space-4);
  }
  .title {
    font-family: var(--font-serif);
    font-size: clamp(var(--text-3xl), 5vw, var(--text-4xl));
    letter-spacing: -0.02em;
    line-height: var(--leading-tight);
    margin: 0;
  }
  .footer {
    align-items: center;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    justify-content: space-between;
    padding-top: var(--space-5);
  }
  .actions {
    display: flex;
    gap: var(--space-3);
  }
</style>
