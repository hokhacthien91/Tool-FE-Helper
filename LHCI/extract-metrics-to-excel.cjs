const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Get reports directory from command line argument or use default
const reportsDirArg = process.argv[2];
const reportsDir = reportsDirArg ? path.resolve(reportsDirArg) : path.join(__dirname, 'reports-28-desktop');

// Read URLs from urls.txt
const urlsPath = path.join(__dirname, 'urls.txt');
const urls = fs
  .readFileSync(urlsPath, 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

// Convert URL to filename pattern
// Match the logic used in run-lighthouse.js: replace /, ?, & with _
function urlToFilename(url) {
  return url.replace(/https?:\/\//, '').replace(/[\/?&]/g, '_');
}

// Extract __LIGHTHOUSE_JSON__ from HTML file
function extractLighthouseJson(htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    console.warn(`File not found: ${htmlPath}`);
    return null;
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');
  const match = html.match(/window\.__LIGHTHOUSE_JSON__\s*=\s*({[\s\S]*?});/);

  if (!match) {
    console.warn(`No __LIGHTHOUSE_JSON__ found in: ${htmlPath}`);
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.warn(`Failed to parse JSON from: ${htmlPath}`, e.message);
    return null;
  }
}

// Extract metrics from Lighthouse JSON
function extractMetrics(lighthouseJson) {
  if (!lighthouseJson || !lighthouseJson.audits) {
    return null;
  }

  const { audits } = lighthouseJson;
  const { categories } = lighthouseJson;

  // Get performance score
  const score = categories?.performance?.score;
  const scoreValue = score !== null && score !== undefined ? Math.round(score * 100) : null;

  // Extract metrics
  const fcp = audits['first-contentful-paint']?.numericValue;
  const lcp = audits['largest-contentful-paint']?.numericValue;
  const tbt = audits['total-blocking-time']?.numericValue;
  const cls = audits['cumulative-layout-shift']?.numericValue;
  const speedIndex = audits['speed-index']?.numericValue;

  // Extract category scores
  const performanceScore = categories?.performance?.score;
  const accessibilityScore = categories?.accessibility?.score;
  const bestPracticesScore = categories?.['best-practices']?.score;
  const seoScore = categories?.seo?.score;

  return {
    fcp: fcp !== null && fcp !== undefined ? `${(fcp / 1000).toFixed(1)}s` : null,
    lcp: lcp !== null && lcp !== undefined ? `${(lcp / 1000).toFixed(1)}s` : null,
    tbt: tbt !== null && tbt !== undefined ? `${Math.round(tbt)}ms` : null,
    cls: cls !== null && cls !== undefined ? cls.toFixed(3) : null,
    speedIndex: speedIndex !== null && speedIndex !== undefined ? `${(speedIndex / 1000).toFixed(1)}s` : null,
    score: scoreValue,
    performanceScore:
      performanceScore !== null && performanceScore !== undefined ? Math.round(performanceScore * 100) : null,
    accessibilityScore:
      accessibilityScore !== null && accessibilityScore !== undefined ? Math.round(accessibilityScore * 100) : null,
    bestPracticesScore:
      bestPracticesScore !== null && bestPracticesScore !== undefined ? Math.round(bestPracticesScore * 100) : null,
    seoScore: seoScore !== null && seoScore !== undefined ? Math.round(seoScore * 100) : null,
  };
}

// Format as "Mobile/Desktop"
const formatMetric = (mobile, desktop) => {
  const m = mobile !== null && mobile !== undefined ? mobile : 'N/A';
  const d = desktop !== null && desktop !== undefined ? desktop : 'N/A';
  return `${m}/${d}`;
};

// Process all URLs
const performanceResults = [];
const accessibilityResults = [];
const bestPracticesResults = [];
const seoResults = [];

for (const url of urls) {
  const baseFilename = urlToFilename(url);
  let mobilePath = path.join(reportsDir, `${baseFilename}-mobile.html`);
  let desktopPath = path.join(reportsDir, `${baseFilename}-desktop.html`);

  // If file not found with run-lighthouse.js pattern, try alternative pattern
  // (for compatibility with existing reports that might have # or = in filenames)
  if (!fs.existsSync(mobilePath)) {
    const altFilename = url
      .replace(/https?:\/\//, '')
      .replace(/\//g, '_')
      .replace(/\?/g, '_');
    // Keep # and = as-is for compatibility
    const altMobilePath = path.join(reportsDir, `${altFilename}-mobile.html`);
    const altDesktopPath = path.join(reportsDir, `${altFilename}-desktop.html`);
    if (fs.existsSync(altMobilePath)) {
      mobilePath = altMobilePath;
      desktopPath = altDesktopPath;
    }
  }

  // Extract metrics from mobile and desktop
  const mobileJson = extractLighthouseJson(mobilePath);
  const desktopJson = extractLighthouseJson(desktopPath);

  const mobileMetrics = extractMetrics(mobileJson);
  const desktopMetrics = extractMetrics(desktopJson);

  // Get page name from URL
  const pageName = url.split('/').pop() || url.split('/').slice(-2).join('/');

  // Performance metrics sheet (detailed)
  performanceResults.push({
    Link: url,
    Page: pageName,
    'FCP (First Contentful Paint) Mobile/Desktop': formatMetric(mobileMetrics?.fcp, desktopMetrics?.fcp),
    'LCP (Largest Contentful Paint) Mobile/Desktop': formatMetric(mobileMetrics?.lcp, desktopMetrics?.lcp),
    'TBT (Total Blocking Time) Mobile/Desktop': formatMetric(mobileMetrics?.tbt, desktopMetrics?.tbt),
    'CLS (Cumulative Layout Shift) Mobile/Desktop': formatMetric(mobileMetrics?.cls, desktopMetrics?.cls),
    'Speed Index Mobile/Desktop': formatMetric(mobileMetrics?.speedIndex, desktopMetrics?.speedIndex),
    'Score Mobile/Desktop': formatMetric(mobileMetrics?.performanceScore, desktopMetrics?.performanceScore),
  });

  // Category scores sheets
  accessibilityResults.push({
    Link: url,
    Page: pageName,
    'Score Mobile/Desktop': formatMetric(mobileMetrics?.accessibilityScore, desktopMetrics?.accessibilityScore),
  });

  bestPracticesResults.push({
    Link: url,
    Page: pageName,
    'Score Mobile/Desktop': formatMetric(mobileMetrics?.bestPracticesScore, desktopMetrics?.bestPracticesScore),
  });

  seoResults.push({
    Link: url,
    Page: pageName,
    'Score Mobile/Desktop': formatMetric(mobileMetrics?.seoScore, desktopMetrics?.seoScore),
  });
}

// Create Excel workbook
const workbook = XLSX.utils.book_new();

// Performance sheet (detailed metrics)
const performanceWorksheet = XLSX.utils.json_to_sheet(performanceResults);
performanceWorksheet['!cols'] = [
  { wch: 100 }, // Link
  { wch: 30 }, // Page
  { wch: 35 }, // FCP Mobile/Desktop
  { wch: 35 }, // LCP Mobile/Desktop
  { wch: 30 }, // TBT Mobile/Desktop
  { wch: 35 }, // CLS Mobile/Desktop
  { wch: 25 }, // Speed Index Mobile/Desktop
  { wch: 20 }, // Score Mobile/Desktop
];
XLSX.utils.book_append_sheet(workbook, performanceWorksheet, 'Performance');

// Accessibility sheet
const accessibilityWorksheet = XLSX.utils.json_to_sheet(accessibilityResults);
accessibilityWorksheet['!cols'] = [
  { wch: 100 }, // Link
  { wch: 30 }, // Page
  { wch: 20 }, // Score Mobile/Desktop
];
XLSX.utils.book_append_sheet(workbook, accessibilityWorksheet, 'Accessibility');

// Best Practices sheet
const bestPracticesWorksheet = XLSX.utils.json_to_sheet(bestPracticesResults);
bestPracticesWorksheet['!cols'] = [
  { wch: 100 }, // Link
  { wch: 30 }, // Page
  { wch: 20 }, // Score Mobile/Desktop
];
XLSX.utils.book_append_sheet(workbook, bestPracticesWorksheet, 'Best Practices');

// SEO sheet
const seoWorksheet = XLSX.utils.json_to_sheet(seoResults);
seoWorksheet['!cols'] = [
  { wch: 100 }, // Link
  { wch: 30 }, // Page
  { wch: 20 }, // Score Mobile/Desktop
];
XLSX.utils.book_append_sheet(workbook, seoWorksheet, 'SEO');

// Write Excel file to reports directory
const outputPath = path.join(reportsDir, 'lighthouse-metrics.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`\n✅ Successfully exported ${performanceResults.length} rows to: ${outputPath}`);
console.log(`📁 Reports directory: ${reportsDir}`);
console.log(`\n📊 Sheets created:`);
console.log(`  1. Performance - Detailed performance metrics (FCP, LCP, TBT, CLS, Speed Index, Score)`);
console.log(`  2. Accessibility - Accessibility scores (Mobile/Desktop)`);
console.log(`  3. Best Practices - Best practices scores (Mobile/Desktop)`);
console.log(`  4. SEO - SEO scores (Mobile/Desktop)`);
