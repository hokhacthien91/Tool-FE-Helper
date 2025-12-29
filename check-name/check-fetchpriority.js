import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

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

// Generate report folder name with format: report-HHMM-day-month-year
function getReportFolderName() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}${minutes}`;
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `report-${timeStr}-${day}-${month}-${year}`;
}

// Get page name from URL
function getPageNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length > 0) {
      // Use the last part of the path as page name
      return pathParts[pathParts.length - 1];
    } else {
      // If no path, use hostname
      return urlObj.hostname.replace(/^www\./, '');
    }
  } catch (e) {
    // Fallback if URL parsing fails
    const pathMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    return 'Unknown';
  }
}

// Scan a single page for fetchpriority
async function scanPage(page, url) {
  console.log(`\n🔍 Scanning: ${url}`);

  try {
    // Try to navigate with retry
    let navigationSuccess = false;
    let retries = 3;
    
    while (!navigationSuccess && retries > 0) {
      try {
        console.log(`  → Navigating to page... (${retries} retries left)`);
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 120000,
        });
        navigationSuccess = true;
        console.log(`  → Page loaded successfully`);
      } catch (navError) {
        retries--;
        if (retries === 0) {
          console.error(`  ❌ Navigation failed after all retries:`, navError.message);
          throw navError;
        }
        console.log(`  ⚠️  Navigation failed, retrying... (${retries} retries left)`);
        await page.waitForTimeout(2000);
      }
    }

    // Wait a bit for dynamic content
    console.log(`  → Waiting for dynamic content...`);
    await page.waitForTimeout(3000);

    console.log(`  → Checking source for fetchpriority...`);
    
    // Get page source
    const pageSource = await page.content();
    
    // Count occurrences of fetchpriority="high" and fetchpriority="hight" (typo)
    // Check for both single and double quotes: fetchpriority="high" or fetchpriority='high'
    // Also check without quotes: fetchpriority=high
    // Use a single comprehensive pattern to avoid double counting
    const fetchPriorityPattern = /fetchpriority\s*=\s*["']?(high|hight)["']?/gi;
    
    const matches = pageSource.match(fetchPriorityPattern);
    const totalCount = matches ? matches.length : 0;
    
    console.log(`  → Found ${totalCount} occurrence(s) of fetchpriority`);
    
    // Determine error message
    let error = '';
    if (totalCount > 1) {
      error = `Found ${totalCount} fetchpriority attributes (should be max 1)`;
    }
    
    return {
      url: url,
      pageName: getPageNameFromUrl(url),
      count: totalCount,
      error: error,
    };
  } catch (error) {
    console.error(`❌ Error scanning ${url}:`, error.message);
    return {
      url: url,
      pageName: getPageNameFromUrl(url),
      count: 0,
      error: `Error: ${error.message}`,
    };
  }
}

// Main function
(async () => {
  try {
    const reportsFolderName = getReportFolderName();
    const reportsPath = path.join(__dirname, reportsFolderName);

    if (!fs.existsSync(reportsPath)) {
      fs.mkdirSync(reportsPath, { recursive: true });
      console.log(`📁 Created reports folder: ${reportsFolderName}`);
    }

    console.log(`\n🚀 Starting fetchpriority scan for ${urls.length} URL(s)...\n`);

    let browser;
    try {
      console.log('  → Launching browser...');
      
      // Try to find Chrome/Chromium
      const launchOptions = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
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
          console.log(`  → Using Chrome at: ${chromePath}`);
          break;
        }
      }
      
      browser = await puppeteer.launch(launchOptions);
      console.log('  → Browser launched successfully');
    } catch (browserError) {
      console.error('❌ Failed to launch browser:', browserError.message);
      console.error('   Make sure Chrome/Chromium is installed or run: npm install puppeteer');
      throw browserError;
    }

    const allResults = [];

    for (const url of urls) {
      let page = null;
      try {
        console.log(`\n📄 Processing URL: ${url}`);
        page = await browser.newPage();
        
        // Handle page errors
        page.on('error', (error) => {
          console.error(`  ⚠️  Page error:`, error.message);
        });
        
        page.on('pageerror', (error) => {
          console.error(`  ⚠️  Page script error:`, error.message);
        });

        await page.setViewport({ width: 1920, height: 1080 });

        const result = await scanPage(page, url);
        allResults.push({
          'URLs': result.url,
          'Page Name': result.pageName,
          'Count': result.count,
          'Error': result.error,
        });
      } catch (error) {
        console.error(`❌ Error processing ${url}:`, error.message);
        allResults.push({
          'URLs': url,
          'Page Name': getPageNameFromUrl(url),
          'Count': 0,
          'Error': `Error: ${error.message}`,
        });
      } finally {
        if (page) {
          try {
            if (!page.isClosed()) {
              await page.close();
            }
          } catch (closeError) {
            // Ignore close errors
            console.log(`  ⚠️  Error closing page (ignored):`, closeError.message);
          }
        }
      }
    }

    try {
      await browser.close();
    } catch (closeError) {
      console.log(`⚠️  Error closing browser (ignored):`, closeError.message);
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    const worksheet = XLSX.utils.json_to_sheet(allResults);
    worksheet['!cols'] = [
      { wch: 100 }, // URLs
      { wch: 50 },  // Page Name
      { wch: 10 },  // Count
      { wch: 80 },  // Error
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'FetchPriority Check');

    // Generate timestamp for Excel filename: YYYYMMDD-HHMMSS
    function getTimestampString() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    // Write Excel file with timestamp
    const timestamp = getTimestampString();
    const outputPath = path.join(reportsPath, `fetchpriority-check-${timestamp}.xlsx`);
    XLSX.writeFile(workbook, outputPath);

    console.log(`\n✅ Successfully exported ${allResults.length} results to: ${outputPath}`);
    console.log(`📁 Reports directory: ${reportsFolderName}`);
    
    // Summary
    const totalWithErrors = allResults.filter(r => r.Error && r.Error.length > 0).length;
    const totalWithFetchPriority = allResults.filter(r => r.Count > 0).length;
    console.log(`\n📊 Summary:`);
    console.log(`  - Total pages scanned: ${allResults.length}`);
    console.log(`  - Pages with fetchpriority: ${totalWithFetchPriority}`);
    console.log(`  - Pages with errors (count > 1): ${totalWithErrors}`);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

