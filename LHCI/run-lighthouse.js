import fs from 'fs';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filename);

// disable eslint
/* eslint-disable */
/* eslint-disable no-underscore-dangle */

const urls = fs
  .readFileSync('urls.txt', 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

// Generate report folder name with format: report-HHMM-day-month-year
// Example: report-1430-28-11-2025 (14:30, 28th November 2025)
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

(async () => {
  const reportsFolderName = getReportFolderName();
  const reportsPath = path.join(__dirname, reportsFolderName);

  if (!fs.existsSync(reportsPath)) {
    fs.mkdirSync(reportsPath, { recursive: true });
    console.log(`📁 Created reports folder: ${reportsFolderName}`);
  }

  for (const url of urls) {
    const fileNameSafe = url.replace(/https?:\/\//, '').replace(/[\/?&]/g, '_');

    // Run mobile preset (default)
    console.log(`📱 Running mobile audit for ${url}...`);
    const chromeMobile = await launch({ chromeFlags: ['--headless'] });
    const mobileOptions = {
      logLevel: 'info',
      output: ['html', 'json'],
      port: chromeMobile.port,
      onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
      // onlyCategories: ['performance'],
    };

    const mobileResult = await lighthouse(url, mobileOptions);
    const mobileHtmlReport = mobileResult.report[0];
    // const mobileJsonReport = mobileResult.report[1];

    fs.writeFileSync(path.join(reportsPath, `${fileNameSafe}-mobile.html`), mobileHtmlReport);
    // fs.writeFileSync(path.join(reportsPath, `${fileNameSafe}-mobile.json`), mobileJsonReport);
    await chromeMobile.kill();
    console.log(`✅ Mobile report generated for ${url}`);

    // Run desktop preset
    console.log(`🖥️  Running desktop audit for ${url}...`);
    const chromeDesktop = await launch({ chromeFlags: ['--headless'] });
    const desktopOptions = {
      logLevel: 'info',
      output: ['html', 'json'],
      port: chromeDesktop.port,
      onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'],
      // onlyCategories: ['performance'],
      formFactor: 'desktop', // 👈 thiết lập form factor
      preset: 'desktop',
      screenEmulation: {
        // 👈 có thể override chi tiết
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        // 👈 Custom throttling cho desktop: 40ms TCP RTT, 10,240 kb/s throughput
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 10240,
        uploadThroughputKbps: 10240,
      },
    };

    const desktopResult = await lighthouse(url, desktopOptions);
    const desktopHtmlReport = desktopResult.report[0];
    // const desktopJsonReport = desktopResult.report[1];

    fs.writeFileSync(path.join(reportsPath, `${fileNameSafe}-desktop.html`), desktopHtmlReport);
    // fs.writeFileSync(path.join(reportsPath, `${fileNameSafe}-desktop.json`), desktopJsonReport);
    await chromeDesktop.kill();
    console.log(`✅ Desktop report generated for ${url}`);
  }

  // Automatically export metrics to Excel after all reports are generated
  console.log(`\n📊 Exporting metrics to Excel...`);
  try {
    const extractScriptPath = path.join(__dirname, 'extract-metrics-to-excel.cjs');
    execSync(`node "${extractScriptPath}" "${reportsPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log(`\n✅ Excel export completed!`);
    console.log(`📁 Reports saved in: ${reportsFolderName}`);
  } catch (error) {
    console.error(`\n❌ Error exporting to Excel:`, error.message);
  }
})();
