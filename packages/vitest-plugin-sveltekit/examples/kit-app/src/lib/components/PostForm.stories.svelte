<script module lang="ts">
  import { remote } from '@storybookjs/vitest-plugin-sveltekit/remote.mock';
  import { defineMeta } from '@storybook/sveltekit';
  import { invalid } from '@sveltejs/kit';
  import { expect, waitFor } from 'storybook/test';

  import { createPost } from '#lib/posts.remote.ts';

  import PostForm from './PostForm.svelte';

  const { Story } = defineMeta({
    parameters: { demo: true },
    title: 'Remote functions/PostForm',
    component: PostForm,
    beforeEach: () => {
      remote(createPost).mockImplementation(async (data, issue) => {
        if (data.title.length < 3) invalid(issue.title('Title must be at least 3 characters'));
        return { id: 3, title: data.title, body: data.body ?? '' };
      });
    },
  });
</script>

<Story
  name="Validation issue"
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Hi');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Title must be at least 3 characters'
    );
    await expect(remote(createPost)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Hi' }),
      expect.anything()
    );
  }}
/>

<Story
  name="Created"
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'A real title');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Created “A real title”');
  }}
/>

<Story
  name="Submitting"
  beforeEach={() => {
    remote(createPost).mockPending();
  }}
  play={async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Title'), 'Slow');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Create' })).toBeDisabled());
  }}
/>
