<script lang="ts">
  import { createPost } from '#lib/posts.remote';
</script>

<form {...createPost} aria-label="New post">
  <label>
    Title
    <input {...createPost.fields.title.as('text')} />
  </label>
  {#each createPost.fields.title.issues() ?? [] as issue (issue.message)}
    <p role="alert">{issue.message}</p>
  {/each}

  <label>
    Body
    <textarea {...createPost.fields.body.as('text')}></textarea>
  </label>

  <button disabled={createPost.pending > 0}>Create</button>

  {#if createPost.result}
    <p role="status">Created “{createPost.result.title}”</p>
  {/if}
</form>
