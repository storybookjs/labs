import type { Shape } from 'pkg-types-only';
import { readFileSync } from 'node:fs';
export { format } from '@scope/pkg-c';

export const helper: Shape = readFileSync;
