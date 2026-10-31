<script lang="ts">
  import EditPostPage from '#lib/pages/EditPostPage.svelte';

  let { data } = $props();
</script>

<EditPostPage id={data.id} />
