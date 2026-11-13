<!-- Signs in with `signIn` (`account.remote.ts`). Only the public deploy needs it: there, writing a
post takes the demo user and `DEMO_PASSWORD`. -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { signIn } from '#lib/account.remote.ts';
  import Button from '#lib/ui/Button.svelte';
  import Input from '#lib/ui/Input.svelte';

  let name = $state('demo');
  let password = $state('');
  let failure = $state<string>();
  let pending = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    pending = true;
    failure = undefined;
    try {
      await signIn({ name, password });
      await goto('/');
    } catch (error) {
      failure = (error as { body?: { message?: string } })?.body?.message ?? 'Sign-in failed';
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head><title>Sign in · Field Notes</title></svelte:head>

<form class="page" onsubmit={submit} aria-label="Sign in">
  <h1>Sign in</h1>
  <p>On the public demo, writing posts needs the demo password.</p>
  <Input label="Name" autocomplete="username" required bind:value={name} />
  <Input
    label="Password"
    type="password"
    autocomplete="current-password"
    required
    bind:value={password}
    error={failure}
  />
  <div>
    <Button type="submit" loading={pending}>Sign in</Button>
  </div>
</form>

<style>
  .page {
    display: grid;
    gap: var(--space-4);
  }
  h1,
  p {
    margin: 0;
  }
</style>
