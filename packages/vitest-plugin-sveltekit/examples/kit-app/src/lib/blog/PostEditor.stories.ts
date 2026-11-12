import { mockRemote } from 'vitest-plugin-sveltekit/remote.mock';
import { invalid } from '@sveltejs/kit';
import { expect, userEvent, waitFor } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { editPost, publishPost } from './blog.remote.ts';
import { postDetails } from './fixtures.ts';
import PostEditor from './PostEditor.svelte';
import { seedDatabase } from './story-helpers.ts';

const meta = preview.meta({
  title: 'Posts/PostEditor',
  component: PostEditor,
  parameters: { layout: 'padded' },
});

export const NewPost = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Title')).toHaveValue('');
    await expect(canvas.getByLabelText('Published')).toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Publish' })).toBeEnabled();
  },
});

export const EditPost = meta.story({
  args: { post: postDetails[3]! },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByLabelText('Title')).toHaveValue(args.post!.title);
    await expect(canvas.getByLabelText('Tags')).toHaveValue(args.post!.tags.join(', '));
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeVisible();
  },
});

/** The schema runs in the browser first: an incomplete form shows its issues without a request. */
export const ValidationIssues = meta.story({
  play: async ({ canvas, step }) => {
    await step('Publish with a short title and no body', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'Hi');
      await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
    });
    await step('The schema reports both issues, and no request goes out', async () => {
      await expect(await canvas.findByText('Use at least 3 characters')).toBeVisible();
      await expect(canvas.getByText('Write something first')).toBeVisible();
      await expect(canvas.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
      await expect(mockRemote(publishPost)).not.toHaveBeenCalled();
    });
  },
});

/** An issue only the handler can find: a title that another post has. */
export const HandlerIssue = meta.story({
  beforeEach: () => {
    mockRemote(publishPost).mockImplementation(async (_data, issue) =>
      invalid(issue.title('A post with this title exists'))
    );
  },
  play: async ({ canvas, step }) => {
    await step('Fill in a form that passes the schema', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'A calmer colour palette');
      await userEvent.type(canvas.getByLabelText('Body'), 'Fewer colours.');
      await userEvent.type(canvas.getByLabelText('Author'), 'Hydra');
    });
    await step('Publish: the (mocked) handler says the title is taken', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
      await expect(await canvas.findByText('A post with this title exists')).toBeVisible();
    });
    await step('The focus goes to the field with the issue', async () => {
      await waitFor(() => expect(canvas.getByLabelText('Title')).toHaveFocus());
    });
  },
});

/** A body issue that arrives while the Preview is shown brings back the Write view with it. */
export const BodyIssueFromPreview = meta.story({
  beforeEach: () => {
    mockRemote(publishPost).mockImplementation(async (_data, issue) =>
      invalid(issue.body('Write something first'))
    );
  },
  play: async ({ canvas, step }) => {
    await step('Switch to the Preview', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    });
    await step('Publish: the (mocked) handler reports a body issue', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
      await expect(await canvas.findByText('Write something first')).toBeVisible();
    });
    await step('The Write view comes back, with the body field', async () => {
      await expect(canvas.getByLabelText('Body')).toBeVisible();
    });
  },
});

export const Submitting = meta.story({
  args: { post: postDetails[3]! },
  beforeEach: () => {
    mockRemote(editPost).mockPending();
  },
  play: async ({ canvas, step }) => {
    await step('Save: the (mocked) handler never answers', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    });
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /Save changes/ })).toBeDisabled()
    );
  },
});

export const MarkdownPreview = meta.story({
  args: { post: postDetails[3]! },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Preview' }));
    await expect(canvas.getByRole('region', { name: 'Preview' })).toBeVisible();
  },
});

/** The real `publishPost` and its valibot schema, which also runs in the browser first. */
export const ServerMode = meta.story({
  name: 'Server mode',
  beforeEach: seedDatabase,
  play: async ({ canvas, step }) => {
    await step('Publish a short title, bad tags and no body', async () => {
      await userEvent.type(canvas.getByLabelText('Title'), 'Hi');
      await userEvent.type(canvas.getByLabelText('Tags'), 'Not OK!');
      await userEvent.click(canvas.getByRole('button', { name: 'Publish' }));
    });
    await step('The real schema reports every issue', async () => {
      await expect(
        await canvas.findByText('Use at least 3 characters', {}, { timeout: 5000 })
      ).toBeVisible();
      await expect(canvas.getByText('Write something first')).toBeVisible();
      await expect(canvas.getByText(/Tags use lowercase letters/)).toBeVisible();
    });
  },
});
