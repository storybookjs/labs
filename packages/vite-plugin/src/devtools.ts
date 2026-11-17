import type { Plugin } from 'vite';

const DEVTOOLS_EMBEDDED_SRC = '"/__devtools/embedded.js"';

export function rebaseDevtoolsLoader(code: string, base: string): string | undefined {
  if (base === '/' || !code.includes(DEVTOOLS_EMBEDDED_SRC)) return undefined;
  return code.replace(DEVTOOLS_EMBEDDED_SRC, JSON.stringify(`${base}__devtools/embedded.js`));
}

export function devtoolsBasePlugin(base: string): Plugin {
  return {
    name: 'storybook:devtools-base',
    apply: 'serve',
    transform(code, id) {
      if (!id.includes('?html-proxy')) return undefined;
      return rebaseDevtoolsLoader(code, base);
    },
  };
}
