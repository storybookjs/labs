import MarkdownIt, { type Token } from 'markdown-it';

// `html: false`: raw HTML in a post is escaped, never rendered. markdown-it also refuses
// `javascript:`, `vbscript:`, `file:` and most `data:` links, so the output is safe for `{@html}`.
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

// Links to other sites do not get access to the page that opened them.
const renderLink = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = String(tokens[index]!.attrGet('href') ?? '');
  if (/^https?:\/\//.test(href)) tokens[index]!.attrSet('rel', 'noopener noreferrer');
  return renderLink
    ? renderLink(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};

/** HTML for a post body written in Markdown. */
export function renderMarkdown(source: string): string {
  return markdown.render(source);
}

/**
 * Plain text for a card: the post's top-level paragraphs, without its headings, lists, tables,
 * quotes and code. Cut at the last sentence that fits, or else at a word, with an ellipsis.
 */
export function excerpt(source: string, length = 180): string {
  const tokens = markdown.parse(source, {});
  const paragraphs = tokens.flatMap((token, index) => {
    const inline = tokens[index + 1];
    return token.type === 'paragraph_open' && token.level === 0 && inline?.type === 'inline'
      ? [plainText(inline.children ?? [])]
      : [];
  });
  const text = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;

  const cut = text.slice(0, length + 1);
  const sentence = Math.max(...['. ', '! ', '? '].map((end) => cut.lastIndexOf(end)));
  if (sentence > length / 2) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, length).replace(/\s+\S*$/, '')}…`;
}

function plainText(children: Token[]): string {
  return children
    .map((token) =>
      token.type === 'text' || token.type === 'code_inline'
        ? token.content
        : token.type === 'softbreak' || token.type === 'hardbreak'
          ? ' '
          : ''
    )
    .join('');
}
