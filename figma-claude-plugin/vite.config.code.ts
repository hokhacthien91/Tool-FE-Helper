import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2015',
    lib: {
      entry: path.resolve(__dirname, 'src/code/index.ts'),
      formats: ['iife'],
      name: 'code',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
    sourcemap: false,
    minify: false,
  },
});
