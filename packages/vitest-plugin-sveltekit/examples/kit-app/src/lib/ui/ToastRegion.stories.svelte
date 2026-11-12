<script module lang="ts">
  import { expect, waitFor } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Button from './Button.svelte';
  import ToastRegion from './ToastRegion.svelte';
  import { clearToasts, toast } from './toasts.svelte.ts';

  const { Story } = preview.meta({
    title: 'UI/ToastRegion',
    component: ToastRegion,
    parameters: { layout: 'fullscreen' },
    beforeEach: () => {
      clearToasts();
      return clearToasts;
    },
  });
</script>

<Story
  name="Show and dismiss"
  asChild
  play={async ({ canvas, userEvent, step }) => {
    const status = canvas.getByRole('status');
    await step('Publish: a toast says so', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
      await expect(status).toHaveTextContent('Post published');
    });
    await step('Dismiss the toast', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notification' }));
      await expect(status).not.toHaveTextContent('Post published');
    });
  }}
>
  {@render triggers()}
</Story>

<Story
  name="Error"
  asChild
  play={async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Fail' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent('Could not publish');
    await expect(canvas.getByRole('status').textContent?.trim()).toBe('');
  }}
>
  {@render triggers()}
</Story>

<Story
  name="Timeout"
  asChild
  play={async ({ canvas, step }) => {
    const status = canvas.getByRole('status');
    await step('The app shows a toast that goes away after 300 ms', async () => {
      toast('Gone in a moment', { timeout: 300 });
      await waitFor(() => expect(status).toHaveTextContent('Gone in a moment'));
    });
    await step('300 ms later it is gone', async () => {
      await waitFor(() => expect(status).not.toHaveTextContent('Gone in a moment'));
    });
  }}
>
  {@render triggers()}
</Story>

<Story
  name="Stack"
  asChild
  beforeEach={() => {
    toast('Draft saved', { timeout: 0 });
    toast('Post published', { tone: 'success', timeout: 0 });
    toast('Could not upload the image: it is larger than 5 MB', { tone: 'error', timeout: 0 });
  }}
>
  {@render triggers()}
</Story>

<Story
  name="Dark"
  asChild
  globals={{ theme: 'dark' }}
  beforeEach={() => {
    toast('Post published', { tone: 'success', timeout: 0 });
    toast('Could not delete the post', { tone: 'error', timeout: 0 });
  }}
>
  {@render triggers()}
</Story>

{#snippet triggers()}
  <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-5)">
    <Button onclick={() => toast('Post published', { tone: 'success' })}>Publish</Button>
    <Button variant="secondary" onclick={() => toast('Draft saved')}>Save draft</Button>
    <Button
      variant="danger"
      onclick={() => toast('Could not publish: the server did not answer', { tone: 'error' })}
      >Fail</Button
    >
  </div>
  <ToastRegion />
{/snippet}
