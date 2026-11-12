<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';

  import { postSummaries, published } from './fixtures.ts';
  import PostMeta from './PostMeta.svelte';

  const { Story } = defineMeta({
    title: 'Posts/PostMeta',
    component: PostMeta,
    parameters: { layout: 'padded' },
    args: { post: published[0]! },
  });
</script>

<Story name="Default" />

<Story
  name="Edited"
  args={{ post: { ...published[0]!, updatedAt: new Date(Date.now() - 3 * 3600_000) } }}
/>

<Story name="Draft" args={{ post: postSummaries.find((post) => !post.published)! }} />

<Story
  name="Long name"
  args={{
    post: { ...published[0]!, author: 'Professor Hydration von Rehydrate-Smithington the Third' },
  }}
/>
