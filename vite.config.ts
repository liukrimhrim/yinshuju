import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // GitHub Pages 项目页路径；本地 dev 不受影响
  base: process.env.CI ? '/yinshuju/' : '/',
  plugins: [svelte()],
  server: { port: 8614 },
});
