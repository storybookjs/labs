import { expect, fn } from 'storybook/test';

import preview from '../../../.storybook/preview';
import Toast from './Toast.svelte';

const meta = preview.meta({
  title: 'UI/Toast',
  component: Toast,
  parameters: { layout: 'padded' },
  args: { message: 'Post published', ondismiss: fn() },
  argTypes: { tone: { control: 'inline-radio', options: ['success', 'error', 'info'] } },
});

export const Info = meta.story({ args: { message: 'Draft saved a minute ago' } });

export const Success = meta.story({
  args: { tone: 'success' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notification' }));
    await expect(args.ondismiss).toHaveBeenCalledOnce();
  },
});

export const ErrorMessage = meta.story({
  args: { tone: 'error', message: 'Could not publish: the server did not answer' },
});

export const WithoutDismiss = meta.story({ args: { ondismiss: undefined } });

export const LongContent = meta.story({
  args: {
    tone: 'error',
    message:
      'Could not save the post because the title is already used by another post: “Notes on testing remote functions in SvelteKit”',
  },
});

export const Dark = meta.story({ args: { tone: 'success' }, globals: { theme: 'dark' } });
