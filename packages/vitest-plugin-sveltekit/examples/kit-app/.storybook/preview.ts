import addonA11y from '@storybook/addon-a11y';
import addonDocs from '@storybook/addon-docs';
import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from 'vitest-plugin-sveltekit/storybook';
import { sb } from 'storybook/test';

import '../src/lib/ui/tokens.css';
import '../src/lib/ui/demo.css';

// The real remote functions read this module; stories get `__mocks__/db.ts` (PGlite in memory).
sb.mock(import('../src/lib/server/db.ts'));

export default definePreview({
  addons: [addonA11y(), addonDocs(), remoteFunctions()],
  // Story tests fail on accessibility violations, in both themes.
  parameters: { a11y: { test: 'error' } },
  globalTypes: {
    theme: {
      description: 'Colour theme of the Field Notes UI',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, { globals }) => {
      // The attribute `ThemeToggle.svelte` and `src/app.html` set in the app.
      document.documentElement.dataset.theme = globals.theme === 'dark' ? 'dark' : 'light';
      return Story();
    },
    (Story, { parameters, canvasElement }) => {
      // The remote function demos: plain elements in the design system's look (`demo.css`).
      canvasElement.classList.toggle('demo', parameters.demo === true);
      return Story();
    },
  ],
});
