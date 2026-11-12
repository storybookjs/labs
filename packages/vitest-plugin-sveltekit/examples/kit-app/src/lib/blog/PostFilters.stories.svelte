<script module lang="ts">
  import { expect, fn, userEvent, waitFor } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import { tagCounts } from './fixtures.ts';
  import PostFilters from './PostFilters.svelte';
  import { defaultListParams } from './posts.ts';

  const { Story } = preview.meta({
    title: 'Posts/PostFilters',
    component: PostFilters,
    parameters: { layout: 'padded' },
    args: { params: defaultListParams, tags: tagCounts, onfilter: fn() },
  });
</script>

<Story name="Default" />

<Story
  name="Filtered"
  args={{ params: { ...defaultListParams, q: 'colour', tag: 'design', sort: 'title' } }}
/>

<Story name="No tags" args={{ tags: [] }} />

<Story
  name="Changes filters"
  play={async ({ canvas, args, step }) => {
    await step('Pick a tag: the filter goes back to page 1', async () => {
      await userEvent.selectOptions(canvas.getByLabelText('Tag'), 'design');
      await expect(args.onfilter).toHaveBeenCalledWith({ tag: 'design', page: 1 });
    });

    await step('Type a search: the filter follows after a short pause', async () => {
      await userEvent.type(canvas.getByLabelText('Search'), 'palette');
      await waitFor(() => expect(args.onfilter).toHaveBeenCalledWith({ q: 'palette', page: 1 }));
    });
  }}
/>

<Story name="Mobile" globals={{ viewport: { value: 'mobile1' } }} />
