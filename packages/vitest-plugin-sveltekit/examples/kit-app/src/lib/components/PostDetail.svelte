<script lang="ts">
  import { getPost } from '#lib/posts.remote';

  import { errorMessage } from './error-message.ts';

  let { id }: { id: number } = $props();
</script>

<svelte:boundary>
  {@const post = await getPost(id)}
  <article>
    <h1>{post.title}</h1>
    <p>{post.body}</p>
  </article>

  {#snippet pending()}
    <p>Loading post…</p>
  {/snippet}

  {#snippet failed(error)}
    <p role="alert">{errorMessage(error)}</p>
  {/snippet}
</svelte:boundary>
