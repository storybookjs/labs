<script lang="ts">
  import PostDetail from '#lib/components/PostDetail.svelte';
  import { page } from '$app/state';
</script>

<PostDetail id={Number(page.params.id)} />
