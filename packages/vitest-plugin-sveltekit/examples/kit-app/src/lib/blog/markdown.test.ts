import { expect, test } from 'vitest';

import { seedPosts } from '#lib/server/seed.ts';

import { excerpt, renderMarkdown } from './markdown.ts';

const body = (title: string) => seedPosts.find((post) => post.title === title)!.body!;

test('an excerpt is the paragraphs only, without headings and tables', () => {
  expect(excerpt(body('Typography for long reads'))).toBe(
    'Long text wants a serif, a line length of 60 to 75 characters, and generous line height. And no justified text on the web.'
  );
});

test('an excerpt keeps inline code and link text, and drops lists and code blocks', () => {
  expect(
    excerpt('Use `query.live` and [the docs](https://svelte.dev).\n\n- a list\n\n```ts\ncode\n```')
  ).toBe('Use query.live and the docs.');
});

test('a long excerpt ends at a sentence, or else at a word with an ellipsis', () => {
  const sentences =
    'A short first sentence here. ' + 'Then a much longer second sentence that goes on '.repeat(5);
  expect(excerpt(sentences, 50)).toBe('A short first sentence here.');
  const words = 'word '.repeat(60);
  expect(excerpt(words, 50)).toMatch(/^(word ){9}word…$/);
});

test('a post with no paragraph has an empty excerpt', () => {
  expect(excerpt('- [ ] Changelog\n- [ ] Version bump')).toBe('');
});

test('raw HTML is text in the rendered body', () => {
  expect(renderMarkdown('<script>alert(1)</script>')).not.toContain('<script>');
});
