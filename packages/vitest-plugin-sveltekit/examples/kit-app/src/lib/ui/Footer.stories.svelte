<script module lang="ts">
  import { expect } from 'storybook/test';

  import preview from '../../../.storybook/preview';
  import Footer from './Footer.svelte';

  const { Story } = preview.meta({
    title: 'UI/Footer',
    component: Footer,
    // The footer's only prop is its content, a snippet: Controls has nothing to change.
    parameters: { layout: 'fullscreen', controls: { disable: true } },
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
