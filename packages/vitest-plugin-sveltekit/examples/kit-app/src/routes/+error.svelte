<script lang="ts">
  import { page } from '$app/state';
  import ErrorPage from '#lib/pages/ErrorPage.svelte';
  import NotFoundPage from '#lib/pages/NotFoundPage.svelte';
</script>

{#if page.status === 404}
  <NotFoundPage message={page.error?.message === 'Not Found' ? undefined : page.error?.message} />
{:else}
  <ErrorPage status={page.status} message={page.error?.message} />
{/if}
