import { expect, it } from 'vitest';
import { hello } from './index.ts';

it.each([
  { input: 'Storybook', expected: 'Hello, Storybook!' },
  { input: '', expected: 'Hello, !' },
])('hello($input)', ({ input, expected }) => {
  expect(hello(input)).toBe(expected);
});
