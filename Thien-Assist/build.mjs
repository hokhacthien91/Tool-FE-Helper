import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const isWatch = process.argv.includes('--watch');

// Plugin output folder name
const PLUGIN_FOLDER = 'desktop-to-mobile-breakpoint-converter';

// Build configuration for code.ts
// Target ES6 for broader Figma plugin sandbox compatibility
const buildOptions = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: path.join(PLUGIN_FOLDER, 'code.js'),
  format: 'iife',
  target: 'es6',
  platform: 'neutral',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
};

async function build() {
  try {
    // Create plugin folder if not exists
    if (!fs.existsSync(PLUGIN_FOLDER)) {
      fs.mkdirSync(PLUGIN_FOLDER, { recursive: true });
    }

    if (isWatch) {
      // Watch mode - also copy files initially
      copyPluginFiles();
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      // Single build
      await esbuild.build(buildOptions);

      // Copy manifest.json and ui.html to plugin folder
      copyPluginFiles();

      console.log(`✅ Build complete: ${PLUGIN_FOLDER}/`);

      // Check file sizes
      const codeSize = fs.statSync(path.join(PLUGIN_FOLDER, 'code.js')).size;
      const uiSize = fs.statSync(path.join(PLUGIN_FOLDER, 'ui.html')).size;
      const manifestSize = fs.statSync(path.join(PLUGIN_FOLDER, 'manifest.json')).size;

      console.log(`📦 code.js: ${(codeSize / 1024).toFixed(2)} KB`);
      console.log(`📦 ui.html: ${(uiSize / 1024).toFixed(2)} KB`);
      console.log(`📦 manifest.json: ${(manifestSize / 1024).toFixed(2)} KB`);
      console.log(`\n📂 Plugin folder ready: ./${PLUGIN_FOLDER}/`);
      console.log(`   Import manifest.json into Figma to use the plugin.`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function copyPluginFiles() {
  // Copy manifest.json
  fs.copyFileSync('manifest.json', path.join(PLUGIN_FOLDER, 'manifest.json'));

  // Copy ui.html
  fs.copyFileSync('ui.html', path.join(PLUGIN_FOLDER, 'ui.html'));
}

build();
