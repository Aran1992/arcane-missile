import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        config: resolve(__dirname, 'config-panel/index.html'),
      },
      external: ['pixi.js'],
    },
  },
  resolve: {
    alias: {
      'pixi.js': resolve(__dirname, 'node_modules/pixi.js/lib/index.js'),
    },
  },
  server: {
    port: 8888,
    host: '0.0.0.0',
  },
});