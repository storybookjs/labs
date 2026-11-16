<script module lang="ts">
  import preview from '../../../.storybook/preview';

  // The same title as `DesignTokens.mdx`, so the page and these stories share one sidebar entry.
  const { Story } = preview.meta({
    title: 'UI/Design tokens',
    tags: ['!manifest'],
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
    'accent-hover',
    'accent-contrast',
    'accent-subtle',
    'success',
    'success-subtle',
    'warning',
    'warning-subtle',
    'danger',
    'danger-hover',
    'danger-contrast',
    'danger-subtle',
    'focus',
    'backdrop',
    'skeleton',
    'skeleton-shine',
  ];
  const fonts = [
    ['sans', 'The interface'],
    ['serif', 'The words of a post'],
    ['mono', 'Code and Markdown source'],
  ];
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const leadings = ['tight', 'normal', 'relaxed'];
  const weights = ['normal', 'medium', 'semibold', 'bold'];
  const spaces = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const radii = ['sm', 'md', 'lg', 'full'];
  const shadows = ['sm', 'md', 'lg'];
  const durations = ['fast', 'normal', 'slow'];
  const widths = ['narrow', 'wide'];
  /** Media queries cannot read custom properties; these are the values `tokens.test.ts` allows. */
  const breakpoints = ['30rem', '40rem', '48rem'];

  /** The value of a token, as `tokens.css` sets it. */
  function token(name: string) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /** The SVG path of `--easing-standard`, in a 100 × 100 box. */
  function easingPath() {
    const [x1, y1, x2, y2] = token('--easing-standard').match(/-?[\d.]+/g)!.map(Number);
    return `M 0 100 C ${x1! * 100} ${100 - y1! * 100}, ${x2! * 100} ${100 - y2! * 100}, 100 0`;
  }
</script>

<!-- Every token, in the light theme. -->
<Story name="Overview" asChild>
  {@render overview()}
</Story>

<!-- Every token, in the dark theme. -->
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
      <h3>Font</h3>
      {#each fonts as [name, use] (name)}
        <div class="row">
          <code>--font-{name}</code>
          <span style:font-family="var(--font-{name})">{use}</span>
        </div>
      {/each}
      <h3>Size</h3>
      {#each sizes as size (size)}
        <div class="row">
          <code>--text-{size}</code>
          <span class="value">{token(`--text-${size}`)}</span>
          <span style:font-size="var(--text-{size})" style:line-height="var(--leading-tight)">
            Field Notes
          </span>
        </div>
      {/each}
      <h3>Line height</h3>
      {#each leadings as leading (leading)}
        <div class="row">
          <code>--leading-{leading}</code>
          <span class="value">{token(`--leading-${leading}`)}</span>
          <p class="leading" style:line-height="var(--leading-{leading})">
            A field note is short. It says what you saw, where, and what it made you think.
          </p>
        </div>
      {/each}
      <h3>Weight</h3>
      {#each weights as weight (weight)}
        <div class="row">
          <code>--weight-{weight}</code>
          <span class="value">{token(`--weight-${weight}`)}</span>
          <span style:font-weight="var(--weight-{weight})">Field Notes</span>
        </div>
      {/each}
    </section>

    <section>
      <h2>Space</h2>
      {#each spaces as space (space)}
        <div class="row">
          <code>--space-{space}</code>
          <span class="value">{token(`--space-${space}`)}</span>
          <span class="bar" style:width="var(--space-{space})"></span>
        </div>
      {/each}
    </section>

    <section>
      <h2>Radius</h2>
      <ul class="samples">
        {#each radii as radius (radius)}
          <li>
            <span class="box" style:border-radius="var(--radius-{radius})"></span>
            <code>--radius-{radius}</code>
            <span class="value">{token(`--radius-${radius}`)}</span>
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h2>Shadow</h2>
      <ul class="samples">
        {#each shadows as shadow (shadow)}
          <li>
            <span class="box raised" style:box-shadow="var(--shadow-{shadow})"></span>
            <code>--shadow-{shadow}</code>
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h2>Motion</h2>
      {#each durations as duration (duration)}
        <div class="row">
          <code>--duration-{duration}</code>
          <span class="value">{token(`--duration-${duration}`)}</span>
          <span class="bar" style:width="calc({parseFloat(token(`--duration-${duration}`))}px / 2)"
          ></span>
        </div>
      {/each}
      <div class="row">
        <code>--easing-standard</code>
        <span class="value">{token('--easing-standard')}</span>
      </div>
      <svg class="curve" role="img" viewBox="-4 -4 108 108" aria-label="The --easing-standard curve">
        <path class="axis" d="M 0 0 V 100 H 100" />
        <path class="ease" d={easingPath()} />
      </svg>
    </section>

    <section>
      <h2>Width and breakpoints</h2>
      <p class="note">At a quarter of the real size.</p>
      {#each widths as width (width)}
        <div class="row">
          <code>--width-{width}</code>
          <span class="value">{token(`--width-${width}`)}</span>
          <span class="bar" style:width="calc(var(--width-{width}) / 4)"></span>
        </div>
      {/each}
      {#each breakpoints as breakpoint (breakpoint)}
        <div class="row">
          <code>max-width</code>
          <span class="value">{breakpoint}</span>
          <span class="bar muted" style:width="calc({breakpoint} / 4)"></span>
        </div>
      {/each}
    </section>
  </div>
{/snippet}

<style>
  .tokens {
    display: grid;
    gap: var(--space-7);
  }

  h2 {
    margin: 0 0 var(--space-3);
    font-family: var(--font-serif);
  }

  h3 {
    margin: var(--space-5) 0 var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
  }

  code,
  .value,
  .note {
    font-size: var(--text-xs);
  }

  .value,
  .note {
    color: var(--color-text-muted);
  }

  .note {
    margin: 0 0 var(--space-2);
  }

  .swatches,
  .samples {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .swatches {
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  }

  .swatches li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .swatch {
    flex: none;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-sm);
  }

  .samples {
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: var(--space-5);
  }

  .samples li {
    display: grid;
    gap: var(--space-1);
    justify-items: start;
  }

  .box {
    width: 4rem;
    height: 4rem;
    margin-bottom: var(--space-2);
    border: 1px solid var(--color-border-strong);
    background: var(--color-surface-sunken);
  }

  .box.raised {
    border-color: var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .row {
    display: grid;
    grid-template-columns: 9.5rem 5rem 1fr;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .row > :last-child:nth-child(2) {
    grid-column: 2 / -1;
  }

  .leading {
    max-width: 22rem;
    margin: 0;
    background: var(--color-surface-sunken);
    font-size: var(--text-sm);
  }

  .bar {
    height: 0.75rem;
    background: var(--color-accent);
  }

  .bar.muted {
    background: var(--color-border-strong);
  }

  .curve {
    width: 8rem;
    height: 8rem;
    margin-left: calc(9.5rem + var(--space-3));
    overflow: visible;
  }

  .curve path {
    fill: none;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  .axis {
    stroke: var(--color-border-strong);
  }

  .ease {
    stroke: var(--color-accent);
  }
</style>
