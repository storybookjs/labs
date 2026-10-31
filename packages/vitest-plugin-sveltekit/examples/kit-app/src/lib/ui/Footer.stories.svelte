<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';
  import { expect } from 'storybook/test';

  import Footer from './Footer.svelte';

  const { Story } = defineMeta({
    title: 'UI/Footer',
    component: Footer,
    parameters: { layout: 'fullscreen' },
  });
</script>

<Story
  name="Default"
  play={async ({ canvas }) => {
    await expect(canvas.getByRole('contentinfo')).toHaveTextContent('Field Notes');
  }}
/>

<Story name="With links" asChild>
  {@render links()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render links()}
</Story>

{#snippet links()}
  <Footer>
    <p>Field Notes, a SvelteKit example.</p>
    <p><a href="/about">About</a> · <a href="/feed.xml">RSS feed</a> · <a href="/tags">Tags</a></p>
  </Footer>
{/snippet}
