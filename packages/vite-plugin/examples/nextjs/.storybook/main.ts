import path from 'node:path';

import type { StorybookConfig } from '@storybook/nextjs-vite';

const CONFIG: StorybookConfig = {
  stories: ['../src/components/**/*.stories.tsx'],
  addons: [],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {
      nextConfigPath: path.resolve(import.meta.dirname, '../next.config.mjs'),
    },
  },
};

export default CONFIG;
