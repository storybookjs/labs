import { definePreview } from '@storybook/sveltekit';
import remoteFunctions from '@storybookjs/vitest-plugin-sveltekit/storybook';

export default definePreview({
  addons: [remoteFunctions()],
});
