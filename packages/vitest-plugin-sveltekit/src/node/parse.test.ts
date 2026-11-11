import { describe, expect, it } from 'vite-plus/test';

import { parseModule } from './parse.ts';

describe('parseModule', () => {
  it('reads TypeScript in `.ts` files, with type-only imports marked', () => {
    const program = parseModule(
      `import type { A } from 'a';\nexport const b: number = 1;`,
      'src/lib/x.remote.ts'
    );
    expect(program.body[0]).toMatchObject({ type: 'ImportDeclaration', importKind: 'type' });
  });

  it('reads JSX in `.tsx` and `.jsx` files', () => {
    expect(() => parseModule(`export const a = <b />;`, 'a.tsx')).not.toThrow();
    expect(() => parseModule(`export const a = <b />;`, 'a.jsx')).not.toThrow();
  });

  it('reads `.js` files as JavaScript', () => {
    expect(() => parseModule(`export const a: number = 1;`, 'a.js')).toThrow(/Parse failed/);
  });
});
