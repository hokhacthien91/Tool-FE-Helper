import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Parse CLI arguments
// ============================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    fps: 15,
    width: 600,
    scale: null,     // null = use width, if set ignore width
    quality: 'high', // high (2-pass palette) or low (simple)
    loop: 0,         // 0 = loop forever, -1 = no loop
    colors: 128,     // max colors for palette
  };
  let input = null;
  let output = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--fps' && args[i + 1]) {
      config.fps = parseInt(args[++i], 10);
    } else if (arg === '--width' && args[i + 1]) {
      config.width = parseInt(args[++i], 10);
    } else if (arg === '--scale' && args[i + 1]) {
      config.scale = parseFloat(args[++i]);
    } else if (arg === '--low') {
      config.quality = 'low';
    } else if (arg === '--colors' && args[i + 1]) {
      config.colors = parseInt(args[++i], 10);
    } else if (arg === '--no-loop') {
      config.loop = -1;
    } else if (arg === '-o' && args[i + 1]) {
      output = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!input) {
      input = arg;
    }
  }

  return { input, output, config };
}

function printHelp() {
  console.log(`
Usage: node convert.js <video-file> [options]

Options:
  --fps <number>     Frames per second (default: 15)
  --width <px>       Output width in pixels (default: 600)
  --scale <factor>   Scale factor instead of width (e.g. 0.5, 2)
  --colors <number>  Max colors for palette (default: 128)
  --low              Low quality (faster, larger file)
  --no-loop          Don't loop
  -o <file>          Output filename (default: <input>.gif)
  --help, -h         Show this help

Examples:
  node convert.js video.mov
  node convert.js video.mov --fps 20 --width 600
  node convert.js video.mov --scale 2 -o hero-2x.gif
  node convert.js video.mov --fps 10 --colors 64    # smaller file
`);
}

// ============================================================
// Main
// ============================================================
const { input, output, config } = parseArgs();

if (!input) {
  console.error('❌ Please provide a video file');
  console.error('   Usage: node convert.js <video-file> [options]');
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`❌ File not found: ${input}`);
  process.exit(1);
}

// Determine output path
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const outputFile = output || path.join(outputDir, path.basename(input, path.extname(input)) + '.gif');

// Build scale filter
let scaleFilter;
if (config.scale) {
  scaleFilter = `scale=iw*${config.scale}:ih*${config.scale}:flags=lanczos`;
} else {
  scaleFilter = `scale=${config.width}:-1:flags=lanczos`;
}

const loopFlag = config.loop === -1 ? '-loop -1' : '-loop 0';

console.log(`\n🎬 Video to GIF`);
console.log(`   Input:  ${input}`);
console.log(`   Output: ${outputFile}`);
console.log(`   FPS: ${config.fps}, ${config.scale ? `Scale: ${config.scale}x` : `Width: ${config.width}px`}`);
console.log(`   Quality: ${config.quality}, Colors: ${config.colors}\n`);

try {
  if (config.quality === 'high') {
    // 2-pass with optimized palette for best quality
    const palettePath = path.join(outputDir, '_palette.png');

    console.log('📊 Pass 1: Generating optimized palette...');
    execSync(
      `ffmpeg -y -i "${input}" -vf "fps=${config.fps},${scaleFilter},palettegen=max_colors=${config.colors}:stats_mode=diff" "${palettePath}"`,
      { stdio: 'pipe' }
    );

    console.log('🎨 Pass 2: Encoding GIF with palette...');
    execSync(
      `ffmpeg -y -i "${input}" -i "${palettePath}" -lavfi "fps=${config.fps},${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" ${loopFlag} "${outputFile}"`,
      { stdio: 'pipe' }
    );

    // Cleanup palette
    fs.unlinkSync(palettePath);
  } else {
    // Simple 1-pass
    console.log('🎨 Encoding GIF...');
    execSync(
      `ffmpeg -y -i "${input}" -vf "fps=${config.fps},${scaleFilter}" ${loopFlag} "${outputFile}"`,
      { stdio: 'pipe' }
    );
  }

  const stats = fs.statSync(outputFile);
  const sizeKB = (stats.size / 1024).toFixed(1);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n✅ GIF saved: ${outputFile}`);
  console.log(`📦 Size: ${sizeKB} KB (${sizeMB} MB)`);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
