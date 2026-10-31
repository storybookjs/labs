<script lang="ts">
  import { goto } from '$app/navigation';
  import Button from '#lib/ui/Button.svelte';
  import Dialog from '#lib/ui/Dialog.svelte';
  import { toast } from '#lib/ui/toasts.svelte.ts';

  import { removePost } from './blog.remote.ts';

  let { id, title }: { id: number; title: string } = $props();

  let open = $state(false);
  let deleting = $state(false);

  async function confirm() {
    deleting = true;
    try {
      await removePost(id);
      open = false;
      toast(`Deleted “${title}”`, { tone: 'success' });
      await goto('/');
    } catch (error) {
      toast((error as { body?: { message?: string } })?.body?.message ?? 'The post was not deleted', {
        tone: 'error',
      });
    } finally {
      deleting = false;
    }
  }
</script>

<Button variant="danger" onclick={() => (open = true)}>Delete</Button>

<Dialog bind:open title="Delete this post?" description="“{title}” will be gone for everyone. This cannot be undone.">
  {#snippet actions()}
    <!-- The dialog starts on the safe action. -->
    <!-- svelte-ignore a11y_autofocus -->
    <Button variant="ghost" autofocus onclick={() => (open = false)}>Cancel</Button>
    <Button variant="danger" loading={deleting} onclick={confirm}>Delete post</Button>
  {/snippet}
</Dialog>
