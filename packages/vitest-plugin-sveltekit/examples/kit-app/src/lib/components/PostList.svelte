<script lang="ts">
  import { deletePost, getPosts } from '#lib/posts.remote.ts';

  import { errorMessage } from './error-message.ts';
  import PostStats from './PostStats.svelte';

  let { order = 'newest' }: { order?: 'newest' | 'oldest' } = $props();
</script>

<section aria-label="Posts">
  <svelte:boundary>
    <ul>
      {#each await getPosts(order) as post (post.id)}
        <li>
          <a href="/posts/{post.id}">{post.title}</a>
          <PostStats id={post.id} />
          <button onclick={() => deletePost(post.id).updates(getPosts(order))}>
            Delete {post.title}
          </button>
        </li>
      {:else}
        <li>No posts yet</li>
      {/each}
    </ul>

    {#snippet pending()}
      <p>Loading posts…</p>
    {/snippet}

    {#snippet failed(error)}
      <p role="alert">Could not load posts: {errorMessage(error)}</p>
    {/snippet}
  </svelte:boundary>
</section>
