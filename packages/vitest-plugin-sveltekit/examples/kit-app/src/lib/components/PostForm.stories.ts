import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { expect } from 'storybook/test';

import { createPost } from '#lib/posts.remote';

import preview from '../../../.storybook/preview';
import PostForm from './PostForm.svelte';

const meta = preview.meta({ title: 'PostForm', component: PostForm });

export const ValidationIssue = meta.story({
  beforeEach: () => {
    remote(createPost).mockImplementation(async (data, issue) => {
      if (data.title.length < 3) invalid(issue.title('Title must be at least 3 characters'));
      return { id: 3, title: data.title, body: data.body };
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Hi');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Title must be at least 3 characters'
    );
    await expect(remote(createPost)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Hi' }),
      expect.anything()
    );
  },
});
