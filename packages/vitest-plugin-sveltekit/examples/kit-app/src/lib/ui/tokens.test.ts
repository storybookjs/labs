// Every design token a component reads exists, and every media query uses the breakpoint scale.
import { expect, test } from 'vitest';

import tokens from './tokens.css?raw';

const sources = import.meta.glob<string>('/src/**/*.{svelte,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const defined = new Set(Array.from(tokens.matchAll(/(--[a-z0-9-]+)\s*:/g), ([, name]) => name));

/** The breakpoints in `tokens.css`. */
const breakpoints = ['30rem', '40rem', '48rem'];

test('reads its sources', () => {
  expect(Object.keys(sources).length).toBeGreaterThan(40);
});

test('every var(--…) is a token, or a custom property the same file declares', () => {
  const missing: string[] = [];
  for (const [file, source] of Object.entries(sources)) {
    // Component-local properties: `--x: …` in a style block or `style:--x={…}` in markup.
    const local = new Set(
      Array.from(source.matchAll(/(--[a-z0-9-]+)\s*[:=]/g), ([, name]) => name)
    );
    for (const [, name] of source.matchAll(/var\((--[a-z0-9-]+)/g)) {
      // A name built in a template (`var(--color-${tone})`) ends with a dash; skip it.
      if (name!.endsWith('-')) continue;
      if (!defined.has(name!) && !local.has(name!)) missing.push(`${file}: ${name}`);
    }
  }
  expect(missing).toEqual([]);
});

test('every max-width media query uses a breakpoint from tokens.css', () => {
  const others: string[] = [];
  for (const [file, source] of Object.entries(sources)) {
    for (const [, width] of source.matchAll(/@media[^{]*max-width:\s*([0-9][^)\s]*)/g)) {
      if (!breakpoints.includes(width!)) others.push(`${file}: ${width}`);
    }
  }
  expect(others).toEqual([]);
});
