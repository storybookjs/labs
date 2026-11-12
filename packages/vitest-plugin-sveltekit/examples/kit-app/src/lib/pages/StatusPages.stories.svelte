<!-- No server mode story: these pages call no remote function, so the real handlers change nothing. -->
<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import AppShell from '#lib/blog/AppShell.svelte';

  import ErrorPage from './ErrorPage.svelte';
  import NotFoundPage from './NotFoundPage.svelte';

  const { Story } = defineMeta({
    title: 'Pages/Status',
    parameters: {
      layout: 'fullscreen',
      sveltekit_experimental: { state: { page: { url: new URL('http://localhost/nowhere') } } },
    },
  });
</script>

{#snippet notFound()}
  <AppShell width="narrow"><NotFoundPage /></AppShell>
{/snippet}

{#snippet missingPost()}
  <AppShell width="narrow"><NotFoundPage message="This post does not exist, or it was deleted." /></AppShell>
{/snippet}

{#snippet serverError()}
  <AppShell width="narrow"><ErrorPage status={500} message="Internal Error" /></AppShell>
{/snippet}

<Story
  name="Not found"
  template={notFound}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '404: not found' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Back to all posts' })).toHaveAttribute('href', '/');
  }}
/>

<Story name="Missing post" template={missingPost} />

<Story
  name="Error"
  template={serverError}
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '500: something went wrong' })).toBeVisible();
  }}
/>
