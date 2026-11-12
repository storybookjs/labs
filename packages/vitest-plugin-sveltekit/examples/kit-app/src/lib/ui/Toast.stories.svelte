<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect, fn } from 'storybook/test';

  import Toast from './Toast.svelte';

  const { Story } = defineMeta({
    title: 'UI/Toast',
    component: Toast,
    parameters: { layout: 'padded' },
    args: { message: 'Post published', ondismiss: fn() },
    argTypes: { tone: { control: 'inline-radio', options: ['success', 'error', 'info'] } },
  });
</script>

<Story name="Info" args={{ message: 'Draft saved a minute ago' }} />

<Story
  name="Success"
  args={{ tone: 'success' }}
  play={async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notification' }));
    await expect(args.ondismiss).toHaveBeenCalledOnce();
  }}
/>

<Story
  name="Error message"
  args={{ tone: 'error', message: 'Could not publish: the server did not answer' }}
/>

<Story name="Without dismiss" args={{ ondismiss: undefined }} />

<Story
  name="Long content"
  args={{
    tone: 'error',
    message:
      'Could not save the post because the title is already used by another post: “Notes on testing remote functions in SvelteKit”',
  }}
/>

<Story name="Dark" args={{ tone: 'success' }} globals={{ theme: 'dark' }} />
