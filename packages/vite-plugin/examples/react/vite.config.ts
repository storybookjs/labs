import react from '@vitejs/plugin-react';
import { experimental_vitePlugin } from '@storybookjs/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), experimental_vitePlugin()],
});
