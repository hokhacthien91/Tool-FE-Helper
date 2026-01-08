import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filename);

// Read URLs from urls.txt
const urlsPath = path.join(__dirname, 'urls.txt');
let urls = [];

if (fs.existsSync(urlsPath)) {
  urls = fs
    .readFileSync(urlsPath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
} else {
  console.error('❌ urls.txt not found. Please create a urls.txt file with one URL per line.');
  process.exit(1);
}

// Get page name from URL for screenshot filename
function getPageNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

    if (pathParts.length > 0) {
      // Get the last part and remove extension if present
      let pageName = pathParts[pathParts.length - 1];
      // Remove .html, .htm, .php extensions
      pageName = pageName.replace(/\.(html?|php)$/i, '');
      return pageName;
    } else {
      // If no path, use hostname
      return urlObj.hostname.replace(/^www\./, '');
    }
  } catch (e) {
    // Fallback if URL parsing fails
    const pathMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
    if (pathMatch) {
      return pathMatch[1].replace(/\.(html?|php)$/i, '');
    }
    return 'Unknown';
  }
}

// Screenshot a single page
async function screenshotPage(page, url, outputFolder) {
  const pageName = getPageNameFromUrl(url);
  console.log(`\n📸 Capturing: ${url}`);
  console.log(`   → Page name: ${pageName}`);

  try {
    // Navigate with retry
    let navigationSuccess = false;
    let retries = 1;

    while (!navigationSuccess && retries > 0) {
      try {
        console.log(`   → Navigating to page... (${retries} retries left)`);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 220000,
        });
        navigationSuccess = true;
        console.log(`   → Page loaded successfully`);
      } catch (navError) {
        retries--;
        if (retries === 0) {
          console.error(`   ❌ Navigation failed after all retries:`, navError.message);
          throw navError;
        }
        console.log(`   ⚠️  Navigation failed, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Wait for dynamic content
    console.log(`   → Waiting for dynamic content...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take full page screenshot
    const screenshotPath = path.join(outputFolder, `${pageName}.png`);
    console.log(`   → Taking screenshot...`);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    console.log(`   ✅ Saved: ${pageName}.png`);
    return { url, pageName, success: true, error: '' };
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return { url, pageName, success: false, error: error.message };
  }
}

// Main function
(async () => {
  try {
    // Create screenshots output folder
    const outputFolder = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      console.log(`📁 Created output folder: screenshots`);
    }

    console.log(`\n🚀 Starting screenshot capture for ${urls.length} URL(s)...`);
    console.log(`📐 Viewport width: 600px\n`);

    let browser;
    try {
      console.log('→ Launching browser...');

      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        ignoreHTTPSErrors: true,
      };

      // Try macOS Chrome path
      const chromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ];

      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          launchOptions.executablePath = chromePath;
          console.log(`→ Using Chrome at: ${chromePath}`);
          break;
        }
      }

      browser = await puppeteer.launch(launchOptions);
      console.log('→ Browser launched successfully');
    } catch (browserError) {
      console.error('❌ Failed to launch browser:', browserError.message);
      throw browserError;
    }

    const results = [];

    for (const url of urls) {
      let page = null;
      try {
        page = await browser.newPage();

        // Set viewport to 600px width
        await page.setViewport({ width: 600, height: 800 });

        const result = await screenshotPage(page, url, outputFolder);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error processing ${url}:`, error.message);
        results.push({
          url,
          pageName: getPageNameFromUrl(url),
          success: false,
          error: error.message,
        });
      } finally {
        if (page) {
          try {
            if (!page.isClosed()) {
              await page.close();
            }
          } catch (closeError) {
            // Ignore close errors
          }
        }
      }
    }

    try {
      await browser.close();
    } catch (closeError) {
      console.log(`⚠️  Error closing browser (ignored):`, closeError.message);
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Summary:`);
    console.log(`   - Total pages: ${results.length}`);
    console.log(`   - Successful: ${successful}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`\n📁 Screenshots saved to: ${outputFolder}`);

    if (failed > 0) {
      console.log(`\n❌ Failed pages:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.url}: ${r.error}`);
      });
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
