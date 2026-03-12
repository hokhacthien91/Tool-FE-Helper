import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Post-build: construct a clean single HTML file with CSS in head, JS after #root
function figmaInlinePlugin() {
  return {
    name: 'figma-inline',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const assetsDir = path.resolve(distDir, 'assets');

      if (!fs.existsSync(assetsDir)) {
        console.error('[figma-inline] No assets directory found');
        return;
      }

      const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
      const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));

      let cssContent = '';
      for (const cssFile of cssFiles) {
        cssContent += fs.readFileSync(path.resolve(assetsDir, cssFile), 'utf-8');
      }

      let jsContent = '';
      for (const jsFile of jsFiles) {
        jsContent += fs.readFileSync(path.resolve(assetsDir, jsFile), 'utf-8');
      }

      // Build clean HTML with correct order: CSS in head, root div, then JS
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>${cssContent}</style>
</head>
<body>
<div id="root"></div>
<script>${jsContent}</script>
</body>
</html>`;

      fs.writeFileSync(path.resolve(distDir, 'ui.html'), html, 'utf-8');

      // Clean up intermediate files
      try {
        fs.rmSync(path.resolve(distDir, 'src'), { recursive: true, force: true });
        fs.rmSync(assetsDir, { recursive: true, force: true });
      } catch {
        // ignore
      }

      const size = (Buffer.byteLength(html) / 1024).toFixed(1);
      console.log(`[figma-inline] Generated dist/ui.html (${size} KB)`);
    },
  };
}

export default defineConfig({
  plugins: [react(), figmaInlinePlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2015',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/ui/index.html'),
      output: {
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
    modulePreload: false,
  },
});
