import { describe, expect, it } from 'vite-plus/test';

import { rebaseDevtoolsLoader } from './devtools.ts';

const LOADER = `const s = document.createElement('script'); s.type = 'module'; s.src = "/__devtools/embedded.js"; document.body.appendChild(s);`;

describe('rebaseDevtoolsLoader', () => {
  it.each([
    {
      name: 'embedded preview base',
      input: { code: LOADER, base: '/__storybook/' },
      expected: `const s = document.createElement('script'); s.type = 'module'; s.src = "/__storybook/__devtools/embedded.js"; document.body.appendChild(s);`,
    },
    {
      name: 'preview base nested under the host base',
      input: { code: LOADER, base: '/app/__storybook/' },
      expected: `const s = document.createElement('script'); s.type = 'module'; s.src = "/app/__storybook/__devtools/embedded.js"; document.body.appendChild(s);`,
    },
    {
      name: 'root base (Storybook mode) is left alone',
      input: { code: LOADER, base: '/' },
      expected: undefined,
    },
    {
      name: 'unrelated inline script is left alone',
      input: { code: `console.log("/__devtools/")`, base: '/__storybook/' },
      expected: undefined,
    },
  ])('$name', ({ input, expected }) => {
    expect(rebaseDevtoolsLoader(input.code, input.base)).toBe(expected);
  });
});
