import { parseAst } from 'vite';

export type Program = ReturnType<typeof parseAst>;

/**
 * Parses a module with Vite's own parser (Rolldown's build of oxc), so the package needs no parser
 * of its own. The language comes from the file name: `parseAst` does not read it from there, and
 * parses TypeScript as JavaScript (and fails) without it.
 */
export function parseModule(code: string, file: string): Program {
  return parseAst(code, { lang: langFor(file), sourceType: 'module' }, file);
}

function langFor(file: string): 'ts' | 'js' | 'tsx' | 'jsx' {
  if (/\.[cm]?tsx$/.test(file)) return 'tsx';
  if (/\.[cm]?ts$/.test(file)) return 'ts';
  if (/\.[cm]?jsx$/.test(file)) return 'jsx';
  return 'js';
}
