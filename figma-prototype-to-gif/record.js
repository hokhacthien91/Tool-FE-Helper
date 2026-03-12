import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import GIFEncoder from 'gif-encoder-2';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIG — edit these or pass via CLI args
// ============================================================
const DEFAULT_CONFIG = {
  fps: 15,                    // Capture frames per second (15 is smooth enough for GIF)
  duration: 20,               // Total recording duration in seconds
  width: 600,                 // Viewport width (match your Figma frame)
  height: 600,                // Viewport height (match your Figma frame)
  scale: 1,                   // Device scale factor (1 or 2 for retina)
  waitBeforeRecord: 8,        // Seconds to wait for prototype to fully load
  outputName: 'prototype',    // Output filename (without extension)
  quality: 10,                // GIF quality (1=best, 20=worst)
  keepFrames: false,          // Keep captured PNG frames for debugging
};

// ============================================================
// Parse CLI arguments
// ============================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  let url = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('http')) {
      url = arg;
    } else if (arg === '--fps' && args[i + 1]) {
      config.fps = parseInt(args[++i], 10);
    } else if (arg === '--duration' && args[i + 1]) {
      config.duration = parseFloat(args[++i]);
    } else if (arg === '--width' && args[i + 1]) {
      config.width = parseInt(args[++i], 10);
    } else if (arg === '--height' && args[i + 1]) {
      config.height = parseInt(args[++i], 10);
    } else if (arg === '--scale' && args[i + 1]) {
      config.scale = parseFloat(args[++i]);
    } else if (arg === '--wait' && args[i + 1]) {
      config.waitBeforeRecord = parseFloat(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      config.outputName = args[++i];
    } else if (arg === '--quality' && args[i + 1]) {
      config.quality = parseInt(args[++i], 10);
    } else if (arg === '--keep-frames') {
      config.keepFrames = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { url, config };
}

function printHelp() {
  console.log(`
Usage: node record.js <prototype-url> [options]

Options:
  --fps <number>        Frames per second (default: 15)
  --duration <seconds>  Recording duration (default: 20)
  --width <px>          Viewport width (default: 600)
  --height <px>         Viewport height (default: 600)
  --scale <factor>      Device scale factor, 2 for retina (default: 1)
  --wait <seconds>      Wait before recording starts (default: 8)
  --output <name>       Output filename without extension (default: prototype)
  --quality <1-20>      GIF quality, 1=best (default: 10)
  --keep-frames         Keep captured PNG frames in frames/ folder
  --help, -h            Show this help

Example:
  node record.js "https://www.figma.com/proto/abc123/MyFile?node-id=1-2&starting-point-node-id=1-2" --duration 15 --width 600 --height 600
`);
}

// ============================================================
// Prepare Figma prototype URL
// ============================================================
function preparePrototypeUrl(url) {
  const urlObj = new URL(url);

  // Convert /design/ URLs to /proto/ URLs
  if (urlObj.pathname.includes('/design/')) {
    urlObj.pathname = urlObj.pathname.replace('/design/', '/proto/');
  }

  // Add params to hide Figma UI and show clean prototype
  urlObj.searchParams.set('hotspot-hints', '0');
  urlObj.searchParams.set('hide-ui', '1');
  urlObj.searchParams.set('scaling', 'scale-down');
  urlObj.searchParams.set('content-scaling', 'fixed');

  return urlObj.toString();
}

// ============================================================
// Find Chrome browser
// ============================================================
function findChromePath() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ============================================================
// Capture frames using page.screenshot (reliable for Figma)
// ============================================================
async function captureFrames(page, config, clipRegion) {
  const framesDir = path.join(__dirname, 'frames');

  // Clean up previous frames
  if (fs.existsSync(framesDir)) {
    for (const f of fs.readdirSync(framesDir)) {
      if (f.endsWith('.png') || f.endsWith('.jpg')) fs.unlinkSync(path.join(framesDir, f));
    }
  } else {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const intervalMs = Math.round(1000 / config.fps);
  const totalFrames = Math.round(config.duration * config.fps);
  console.log(`📹 Recording ${totalFrames} frames at ${config.fps} FPS (${config.duration}s)...`);

  const framePaths = [];

  for (let i = 0; i < totalFrames; i++) {
    const start = Date.now();

    try {
      const screenshotOptions = { type: 'jpeg', quality: 90 };
      if (clipRegion) screenshotOptions.clip = clipRegion;
      const buffer = await page.screenshot(screenshotOptions);
      const framePath = path.join(framesDir, `frame_${String(i).padStart(5, '0')}.jpg`);
      fs.writeFileSync(framePath, buffer);
      framePaths.push(framePath);
    } catch (e) {
      console.warn(`   Frame ${i} failed: ${e.message}`);
      // Skip this frame but keep going
    }

    // Progress every second
    if (i % config.fps === 0 && i > 0) {
      const sec = Math.round(i / config.fps);
      process.stdout.write(`   ${sec}s / ${config.duration}s (${framePaths.length} frames)\r`);
    }

    // Wait for next frame timing
    const elapsed = Date.now() - start;
    const waitTime = Math.max(0, intervalMs - elapsed);
    if (waitTime > 0) {
      await new Promise(r => setTimeout(r, waitTime));
    }
  }

  console.log(`\n📷 Captured ${framePaths.length} frames`);
  return framePaths;
}

// ============================================================
// Encode frames to GIF
// ============================================================
async function encodeGIF(framePaths, config) {
  console.log(`🎬 Encoding GIF from ${framePaths.length} frames...`);

  // Read first frame to get actual dimensions
  const firstImg = await loadImage(framePaths[0]);
  const actualWidth = firstImg.width;
  const actualHeight = firstImg.height;
  console.log(`   Frame size: ${actualWidth}×${actualHeight}`);

  const encoder = new GIFEncoder(actualWidth, actualHeight, 'neuquant', true);
  const delay = Math.round(1000 / config.fps);
  console.log(`   FPS: ${config.fps}, frame delay: ${delay}ms`);

  encoder.setDelay(delay);
  encoder.setRepeat(0); // Loop forever
  encoder.setQuality(config.quality);
  encoder.start();

  const canvas = createCanvas(actualWidth, actualHeight);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < framePaths.length; i++) {
    const img = await loadImage(framePaths[i]);
    ctx.clearRect(0, 0, actualWidth, actualHeight);
    ctx.drawImage(img, 0, 0, actualWidth, actualHeight);
    encoder.addFrame(ctx);

    if (i % 10 === 0) {
      process.stdout.write(`   ${Math.round((i / framePaths.length) * 100)}%\r`);
    }
  }

  encoder.finish();
  console.log(`   100%`);

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${config.outputName}.gif`);
  const buffer = encoder.out.getData();
  fs.writeFileSync(outputPath, buffer);

  const sizeKB = (buffer.length / 1024).toFixed(1);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`✅ GIF saved: ${outputPath}`);
  console.log(`📦 Size: ${sizeKB} KB (${sizeMB} MB)`);

  return outputPath;
}

// ============================================================
// Cleanup frames
// ============================================================
function cleanupFrames(framePaths) {
  for (const fp of framePaths) {
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  console.log(`🧹 Cleaned up ${framePaths.length} temporary frames`);
}

// ============================================================
// Main
// ============================================================
(async () => {
  const { url, config } = parseArgs();

  if (!url) {
    console.error('❌ Please provide a Figma prototype URL');
    console.error('   Usage: node record.js <prototype-url> [options]');
    console.error('   Run with --help for all options');
    process.exit(1);
  }

  const chromePath = findChromePath();
  if (!chromePath) {
    console.error('❌ Chrome not found. Please install Google Chrome.');
    process.exit(1);
  }

  const protoUrl = preparePrototypeUrl(url);
  console.log(`\n🎯 Figma Prototype to GIF`);
  console.log(`   URL: ${url}`);
  console.log(`   Size: ${config.width}×${config.height} @ ${config.scale}x`);
  console.log(`   FPS: ${config.fps}, Duration: ${config.duration}s`);
  console.log(`   Wait: ${config.waitBeforeRecord}s`);
  console.log(`   Output: output/${config.outputName}.gif\n`);

  let browser;
  try {
    // Use persistent Chrome profile so Figma login is remembered
    const profileDir = path.join(__dirname, '.chrome-profile');
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    console.log('🌐 Launching browser (with saved profile)...');
    browser = await puppeteer.launch({
      headless: false,  // Figma needs visible browser to render
      protocolTimeout: 300000,
      userDataDir: profileDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-infobars',
        `--window-size=${config.width + 50},${config.height + 150}`,
      ],
      ignoreDefaultArgs: ['--enable-automation'],  // Hide "controlled by automation" banner
      executablePath: chromePath,
      ignoreHTTPSErrors: true,
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: config.scale,
    });

    console.log('📄 Loading prototype...');
    await page.goto(protoUrl, {
      waitUntil: 'networkidle2',
      timeout: 120000,
    });

    // Always wait for user confirmation before recording
    console.log('\n👀 Check the browser window:');
    console.log('   - If you see a login page → login first');
    console.log('   - Wait until the prototype is fully loaded and playing');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question('\n   Press ENTER to start recording... ', () => {
        rl.close();
        resolve();
      });
    });

    // Find the prototype frame element to crop screenshots
    console.log('🔍 Finding prototype frame...');
    let clipRegion = null;
    try {
      clipRegion = await page.evaluate(() => {
        // Figma prototype renders inside a specific frame/container
        // Try multiple selectors to find the content area
        const selectors = [
          '[data-testid="prototype-frame"]',
          '#prototype-container iframe',
          'iframe[src*="figma"]',
          'canvas',
          '[class*="frame"]',
        ];

        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 100) {
              return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
            }
          }
        }

        // Fallback: find the largest non-body element (likely the prototype)
        let largest = null;
        let largestArea = 0;
        document.querySelectorAll('div, iframe, canvas').forEach(el => {
          const rect = el.getBoundingClientRect();
          const area = rect.width * rect.height;
          // Must be smaller than viewport (not the full page) and reasonably large
          if (area > largestArea && rect.width < window.innerWidth && rect.height < window.innerHeight && area > 10000) {
            largestArea = area;
            largest = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
          }
        });
        return largest;
      });

      if (clipRegion) {
        console.log(`   Found: ${clipRegion.width}×${clipRegion.height} at (${clipRegion.x}, ${clipRegion.y})`);
      } else {
        console.log('   Could not detect frame, will capture full viewport');
      }
    } catch (e) {
      console.log('   Frame detection failed, will capture full viewport');
    }

    // Capture frames
    const framePaths = await captureFrames(page, config, clipRegion);

    if (framePaths.length === 0) {
      console.error('❌ No frames captured');
      process.exit(1);
    }

    // Encode to GIF
    const outputPath = await encodeGIF(framePaths, config);

    // Cleanup
    if (!config.keepFrames) {
      cleanupFrames(framePaths);
    } else {
      console.log(`📁 Frames kept in: frames/`);
    }

    console.log(`\n🎉 Done! GIF saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
})();
