import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from '@storybookjs/vitest-plugin-sveltekit/storybook';
import { sb } from 'storybook/test';

// The real remote functions read this module; stories get `__mocks__/db.ts` (PGlite in memory).
sb.mock(import('../src/lib/server/db.ts'));

export default definePreview({
  addons: [remoteFunctions()],
});
