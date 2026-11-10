import { describe, expect, it } from 'vite-plus/test';

import { normalizeBase, trimTrailingSlashes } from './base-path.ts';

describe('trimTrailingSlashes', () => {
  it('removes every trailing slash', () => {
    expect(trimTrailingSlashes('http://127.0.0.1:4200///')).toBe('http://127.0.0.1:4200');
    expect(trimTrailingSlashes('/a/b')).toBe('/a/b');
    expect(trimTrailingSlashes('///')).toBe('');
  });

  it('stays linear on long runs of slashes', () => {
    const input = `/${'/'.repeat(100_000)}x${'/'.repeat(100_000)}`;
    expect(trimTrailingSlashes(input)).toBe(`/${'/'.repeat(100_000)}x`);
  });
});

describe('normalizeBase', () => {
  it.each([
    ['/__storybook', '/__storybook'],
    ['storybook/', '/storybook'],
    ['  /storybook//  ', '/storybook'],
    ['/', '/'],
    ['', '/'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeBase(input)).toBe(expected);
  });
});
