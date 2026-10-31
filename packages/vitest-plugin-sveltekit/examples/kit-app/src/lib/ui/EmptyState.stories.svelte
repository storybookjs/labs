<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';

  import Button from './Button.svelte';
  import EmptyState from './EmptyState.svelte';

  const { Story } = defineMeta({
    title: 'UI/EmptyState',
    component: EmptyState,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Title only" args={{ title: 'No posts yet' }} />

<Story
  name="With description"
  args={{ title: 'No posts yet', description: 'Posts you write show up here.' }}
/>

<Story name="With icon and action" asChild>
  {@render full()}
</Story>

<Story name="Long content" asChild>
  <div style="max-width: 22rem">
    <EmptyState
      title="Nothing matches “a-search-term-that-is-unusually-long-and-specific”"
      description="Try fewer words, check the spelling, or clear the tag filter to see every post in the blog again."
    />
  </div>
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render full()}
</Story>

{#snippet full()}
  <EmptyState title="No drafts" description="Start a post and save it as a draft to finish later.">
    {#snippet icon()}
      <svg viewBox="0 0 24 24" width="28" height="28">
        <path
          d="M5 3.5h10.5L19 7v13.5H5Z M15.5 3.5V7H19 M8.5 11h7M8.5 14.5h7"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
      </svg>
    {/snippet}
    {#snippet action()}
      <Button href="/posts/new">Write a post</Button>
    {/snippet}
  </EmptyState>
{/snippet}
