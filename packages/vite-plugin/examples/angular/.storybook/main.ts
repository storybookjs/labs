import type { StorybookConfig } from '@storybook/angular-vite';

const CONFIG: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: [],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      tsconfig: './.storybook/tsconfig.json',
      jit: false,
      liveReload: true,
      compodoc: false,
    },
  },
};

export default CONFIG;
