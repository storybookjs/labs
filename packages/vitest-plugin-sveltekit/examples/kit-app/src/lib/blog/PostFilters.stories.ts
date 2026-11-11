import { expect, fn, userEvent, waitFor } from 'storybook/test';

import preview from '../../../.storybook/preview';
import { tagCounts } from './fixtures.ts';
import PostFilters from './PostFilters.svelte';
import { defaultListParams } from './posts.ts';

const meta = preview.meta({
  title: 'Posts/PostFilters',
  component: PostFilters,
  parameters: { layout: 'padded' },
  args: { params: defaultListParams, tags: tagCounts, onfilter: fn() },
});

export const Default = meta.story({});

export const Filtered = meta.story({
  args: { params: { ...defaultListParams, q: 'colour', tag: 'design', sort: 'title' } },
});

export const NoTags = meta.story({ args: { tags: [] } });

export const ChangesFilters = meta.story({
  play: async ({ canvas, args, step }) => {
    await step('Pick a tag: the filter goes back to page 1', async () => {
      await userEvent.selectOptions(canvas.getByLabelText('Tag'), 'design');
      await expect(args.onfilter).toHaveBeenCalledWith({ tag: 'design', page: 1 });
    });

    await step('Type a search: the filter follows after a short pause', async () => {
      await userEvent.type(canvas.getByLabelText('Search'), 'palette');
      await waitFor(() => expect(args.onfilter).toHaveBeenCalledWith({ q: 'palette', page: 1 }));
    });
  },
});

export const Mobile = meta.story({ globals: { viewport: { value: 'mobile1' } } });
