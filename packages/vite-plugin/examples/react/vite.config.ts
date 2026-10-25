import react from '@vitejs/plugin-react';
import { experimental_vitePlugin } from '@storybook/react-vite/node';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), experimental_vitePlugin()],
});
