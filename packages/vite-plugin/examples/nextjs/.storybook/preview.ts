import type { Preview } from '@storybook/nextjs-vite';

import '../src/app/globals.css';

const PREVIEW: Preview = {
  parameters: {
    layout: 'centered',
    nextjs: { appDirectory: true },
  },
};

export default PREVIEW;
