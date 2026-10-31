import preview from '../../../.storybook/preview';
import { postSummaries, published } from './fixtures.ts';
import PostMeta from './PostMeta.svelte';

const meta = preview.meta({
  title: 'Posts/PostMeta',
  component: PostMeta,
  parameters: { layout: 'padded' },
  args: { post: published[0]! },
});

export const Default = meta.story({});

export const Edited = meta.story({
  args: { post: { ...published[0]!, updatedAt: new Date(Date.now() - 3 * 3600_000) } },
});

export const Draft = meta.story({ args: { post: postSummaries.find((post) => !post.published)! } });

export const LongName = meta.story({
  args: { post: { ...published[0]!, author: 'Maria Antonia Fernández de la Torre y Villalobos' } },
});
