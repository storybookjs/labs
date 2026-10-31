<script lang="ts">
  import PostPage from '#lib/pages/PostPage.svelte';

  let { data } = $props();
</script>

<PostPage id={data.id} />
