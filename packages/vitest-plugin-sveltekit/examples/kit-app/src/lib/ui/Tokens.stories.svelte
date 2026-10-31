<script module lang="ts">
  import { defineMeta } from '@storybook/sveltekit';

  const { Story } = defineMeta({
    title: 'UI/Tokens',
    parameters: { layout: 'padded' },
  });

  const colors = [
    'background',
    'surface',
    'surface-raised',
    'surface-sunken',
    'text',
    'text-muted',
    'border',
    'border-strong',
    'accent',
    'accent-subtle',
    'success',
    'warning',
    'danger',
    'focus',
  ];
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const spaces = [1, 2, 3, 4, 5, 6, 7, 8];
</script>

<Story name="Overview" asChild>
  {@render overview()}
</Story>

<Story name="Dark" asChild globals={{ theme: 'dark' }}>
  {@render overview()}
</Story>

{#snippet overview()}
  <div class="tokens">
    <section>
      <h2>Colour</h2>
      <ul class="swatches">
        {#each colors as name (name)}
          <li>
            <span class="swatch" style:background="var(--color-{name})"></span>
            <code>--color-{name}</code>
          </li>
        {/each}
      </ul>
    </section>
    <section>
      <h2>Type</h2>
      <p style="font-family: var(--font-sans)">Sans: interface text, labels and buttons.</p>
      <p style="font-family: var(--font-serif)">Serif: the words of a post, set for reading.</p>
      <p style="font-family: var(--font-mono)">Mono: code and Markdown source.</p>
      {#each sizes as size (size)}
        <p style:font-size="var(--text-{size})" style="line-height: var(--leading-tight)">
          <code>--text-{size}</code> Field Notes
        </p>
      {/each}
    </section>
    <section>
      <h2>Space</h2>
      {#each spaces as space (space)}
        <div class="space">
          <code>--space-{space}</code>
          <span style:width="var(--space-{space})"></span>
        </div>
      {/each}
    </section>
  </div>
{/snippet}

<style>
  .tokens {
    display: grid;
    gap: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-family: var(--font-serif);
  }

  p {
    margin: 0 0 var(--space-2);
  }

  .swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .swatches li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
  }

  .swatch {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
  }

  .space {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-1);
    font-size: var(--text-xs);
  }

  .space code {
    width: 6rem;
  }

  .space span {
    height: 0.75rem;
    background: var(--color-accent);
  }
</style>
