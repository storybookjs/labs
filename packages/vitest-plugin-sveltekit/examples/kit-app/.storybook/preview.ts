import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from 'vitest-plugin-sveltekit/storybook';

export default definePreview({
  addons: [remoteFunctions()],
});
