const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Load config
const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const baseDir = path.dirname(path.resolve(configPath));

// ============ DOCX PARSER ============
function extractTextFromDocx(docxPath) {
  const zip = new AdmZip(docxPath);
  const xmlContent = zip.readAsText('word/document.xml');

  // Split by paragraphs and extract text
  const paragraphs = xmlContent.split('</w:p>');
  const texts = [];

  paragraphs.forEach(p => {
    // Remove all XML tags
    let text = p.replace(/<[^>]*>/g, '').trim();
    if (text) {
      texts.push(text);
    }
  });

  return texts;
}

// ============ JSON PARSER ============
function extractTextsFromJson(node, texts = []) {
  if (node.type === 'TEXT' && node.characters) {
    texts.push({
      name: node.name || '',
      text: node.characters,
      fontSize: node.fontSize || 0
    });
  }
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      if (child) extractTextsFromJson(child, texts);
    });
  }
  return texts;
}

// ============ GENERIC CONTENT EXTRACTION ============
// Parse DOCX by structure labels (HEADLINE, BODY, CTA, etc.)
function parseDocxByStructure(docxTexts) {
  const content = {
    headline: null,
    subheadline: null,
    body: null,
    cta: null,
    featureTexts: [],
    legalFooter: [],
    allTexts: []
  };

  let currentSection = '';
  let nextField = null;
  const skipPatterns = [
    'COPY DECK', 'Client:', 'Project:', 'Date:', 'Writer:', 'Version:',
    'FROM NAME', 'TEMPLATE', 'SUBJECT', 'PREVIEW LINE', 'URL:', 'HYPERLINK',
    'LINKS', 'HONDA LOGO:', 'PRIVACY NOTICE:', 'MYGARAGE', 'righttop'
  ];

  docxTexts.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Skip metadata and URLs
    if (skipPatterns.some(p => trimmed.includes(p)) || trimmed.startsWith('http')) {
      return;
    }

    // Detect section markers
    if (trimmed.includes('MAIN MODULE #1') || trimmed.includes('MODULE #1')) {
      currentSection = 'main';
      return;
    }
    if (trimmed.includes('MAIN MODULE #2') || trimmed.includes('MODULE #2')) {
      currentSection = 'module2';
      return;
    }
    if (trimmed.includes('MAIN MODULE #3') || trimmed.includes('MODULE #3')) {
      currentSection = 'module3';
      return;
    }
    if (trimmed.includes('LEGAL FOOTER')) {
      currentSection = 'legal';
      return;
    }
    if (trimmed === 'LINKS') {
      currentSection = 'links';
      return;
    }

    // Detect field labels
    if (trimmed === 'HEADLINE:' || trimmed === 'HEADLINE') {
      nextField = 'headline';
      return;
    }
    if (trimmed === 'SUB-HEADLINE:' || trimmed === 'SUB-HEADLINE' || trimmed === 'SUBHEAD:') {
      nextField = 'subheadline';
      return;
    }
    if (trimmed === 'BODY:' || trimmed === 'BODY') {
      nextField = 'body';
      return;
    }
    if (trimmed === 'CTA:' || trimmed === 'CTA') {
      nextField = 'cta';
      return;
    }

    // Extract content after labels
    if (nextField && trimmed) {
      if (nextField === 'headline' && !content.headline) {
        content.headline = trimmed;
        nextField = null;
      } else if (nextField === 'subheadline' && !content.subheadline) {
        content.subheadline = trimmed;
        nextField = null;
      } else if (nextField === 'body') {
        // Body can be long text (>100 chars) or we're in module2 where BODY marks feature texts section
        if (currentSection === 'module2') {
          // In module2, BODY section contains feature bullet points
          if (trimmed.length < 100 && trimmed.match(/^[A-Z]/)) {
            content.featureTexts.push(trimmed);
          }
          // Don't reset nextField, keep collecting features
        } else if (!content.body && trimmed.length > 50) {
          content.body = trimmed;
          nextField = null;
        }
      } else if (nextField === 'cta' && !content.cta) {
        content.cta = trimmed;
        nextField = null;
      }
      return;
    }

    // Collect feature texts from module2 section (short bullet points) - fallback
    if (currentSection === 'module2' && trimmed.length < 100 && !trimmed.includes(':') && trimmed !== 'BODY') {
      if (trimmed.match(/^[A-Z]/) && (trimmed.includes('power') || trimmed.includes('quality') || trimmed.includes('comfort') || trimmed.match(/\.$/) )) {
        if (!content.featureTexts.includes(trimmed)) {
          content.featureTexts.push(trimmed);
        }
      }
    }

    // Collect legal footer
    if (currentSection === 'legal' && !trimmed.includes('LEGAL FOOTER')) {
      content.legalFooter.push(trimmed);
    }

    // Store all meaningful text for matching
    if (trimmed.length > 2 && !trimmed.endsWith(':')) {
      content.allTexts.push(trimmed);
    }
  });

  return content;
}

// Extract all text from Design JSON
function parseDesignTexts(jsonTexts) {
  const content = {
    headline: null,
    subheadline: null,
    body: null,
    cta: null,
    featureTexts: [],
    legalFooter: [],
    allTexts: []
  };

  // Collect texts by characteristics
  const allTexts = jsonTexts.map(item => item.text.trim()).filter(t => t.length > 0);
  content.allTexts = allTexts;

  // Find headline (usually first significant text, multi-line combined)
  const headlineParts = [];
  let foundBody = false;

  jsonTexts.forEach(item => {
    const text = item.text.trim();
    if (!text) return;

    // Skip UI elements
    if (['VIEW IN BROWSER', 'STAY CONNECTED', 'Reference:'].some(ui => text.includes(ui))) {
      return;
    }

    // Long text is likely body copy
    if (text.length > 200) {
      content.body = text;
      foundBody = true;
      return;
    }

    // Before body: headline parts (short texts at top)
    if (!foundBody && text.length < 50 && headlineParts.length < 4) {
      // Skip if it looks like a CTA or feature
      if (!text.includes('See the') && !text.includes('power') && !text.includes('quality') && !text.includes('comfort')) {
        headlineParts.push(text);
      }
    }

    // CTA detection (contains action words, short text)
    if (text.length < 50 && (text.includes('See the') || text.includes('Shop') || text.includes('Learn') || text.includes('Get'))) {
      if (!content.cta) content.cta = text;
    }

    // Feature texts (short descriptive texts)
    if (text.length < 50 && (text.includes('power') || text.includes('quality') || text.includes('comfort'))) {
      content.featureTexts.push(text);
    }

    // Legal footer (contains trademark, copyright, privacy)
    if (text.includes('trademark') || text.includes('©') || text.includes('Privacy') ||
        text.includes('American Honda') || text.includes('Unsubscribe')) {
      content.legalFooter.push(text);
    }
  });

  // Combine headline parts
  if (headlineParts.length > 0) {
    content.headline = headlineParts.join(' ').replace(/\s+/g, ' ').trim();
  }

  return content;
}

// ============ HELPER FUNCTIONS ============
// Find best matching text from array
function findBestMatch(target, candidates) {
  if (!target || !candidates || candidates.length === 0) return null;

  const targetNorm = target.toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim();

  // Try exact match first
  for (const candidate of candidates) {
    const candNorm = candidate.toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim();
    if (targetNorm === candNorm) return candidate;
  }

  // Try partial match (target contains candidate or vice versa)
  for (const candidate of candidates) {
    const candNorm = candidate.toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim();
    if (targetNorm.includes(candNorm) || candNorm.includes(targetNorm)) {
      return candidate;
    }
  }

  // Try word-based similarity
  const targetWords = targetNorm.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candNorm = candidate.toLowerCase().replace(/[.,;:!?]/g, '').replace(/\s+/g, ' ').trim();
    const candWords = candNorm.split(/\s+/);

    const commonWords = targetWords.filter(w => candWords.includes(w));
    const score = commonWords.length / Math.max(targetWords.length, candWords.length);

    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

// Compare Desktop vs Mobile for generic content
function compareDesktopMobileGeneric(desktopContent, mobileContent) {
  const results = [];

  // Compare main content fields
  const fields = [
    { key: 'headline', label: 'Headline' },
    { key: 'body', label: 'Body Copy' },
    { key: 'cta', label: 'CTA Button' }
  ];

  fields.forEach(({ key, label }) => {
    const dText = desktopContent[key] || '';
    const mText = mobileContent[key] || '';

    if (dText || mText) {
      results.push({
        contentType: label,
        desktop: dText || '-',
        mobile: mText || '-',
        status: dText === mText ? 'identical' : (dText && mText ? 'different' : 'missing')
      });
    }
  });

  // Compare feature texts
  const dFeatures = desktopContent.featureTexts || [];
  const mFeatures = mobileContent.featureTexts || [];
  const maxFeatures = Math.max(dFeatures.length, mFeatures.length);

  for (let i = 0; i < maxFeatures; i++) {
    const dText = dFeatures[i] || '';
    const mText = mFeatures[i] || '';

    if (dText || mText) {
      results.push({
        contentType: `Feature Text ${i + 1}`,
        desktop: dText || '-',
        mobile: mText || '-',
        status: dText === mText ? 'identical' : (dText && mText ? 'different' : 'missing')
      });
    }
  }

  // Compare legal footer
  const dLegal = (desktopContent.legalFooter || []).join(' ').replace(/\s{2,}/g, ' ').trim();
  const mLegal = (mobileContent.legalFooter || []).join(' ').replace(/\s{2,}/g, ' ').trim();

  if (dLegal || mLegal) {
    results.push({
      contentType: 'Legal Footer',
      desktop: dLegal || '-',
      mobile: mLegal || '-',
      status: dLegal === mLegal ? 'identical' : 'different'
    });
  }

  return results;
}

// ============ COMPARISON ============
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

function compareTexts(docxText, designText, rules) {
  const docxNorm = normalizeText(docxText);
  const designNorm = normalizeText(designText);

  if (!docxNorm && !designNorm) return { status: 'skip', issue: '' };
  if (!docxNorm) return { status: 'missing_docx', issue: 'Missing in DOCX' };
  if (!designNorm) return { status: 'missing_design', issue: 'Missing in Design' };

  // Exact match
  if (docxNorm === designNorm) {
    return { status: 'match', issue: '' };
  }

  // Case insensitive match
  if (rules.ignoreCaseDifference && docxNorm.toLowerCase() === designNorm.toLowerCase()) {
    return { status: 'match', issue: '' };
  }

  // Check acceptable variations
  let tempDocx = docxNorm.toLowerCase();
  let tempDesign = designNorm.toLowerCase();

  // Escape special regex characters
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  rules.acceptableVariations.forEach(v => {
    v.to.forEach(toVal => {
      tempDocx = tempDocx.replace(new RegExp(escapeRegex(v.from), 'gi'), toVal.toLowerCase());
      tempDesign = tempDesign.replace(new RegExp(escapeRegex(toVal), 'gi'), v.from.toLowerCase());
    });
  });

  // Check year addition (e.g., "CRF450R" vs "2026 CRF450R")
  if (rules.allowYearAddition) {
    const yearPattern = /^(20\d{2})\s*/;
    const designWithoutYear = designNorm.replace(yearPattern, '');
    if (docxNorm === designWithoutYear || docxNorm.toLowerCase() === designWithoutYear.toLowerCase()) {
      return { status: 'acceptable', issue: 'Year added (acceptable)' };
    }
  }

  // Check for specific issues
  const issues = detectIssues(docxNorm, designNorm);

  if (issues.length > 0) {
    return { status: 'mismatch', issue: issues.join('; ') };
  }

  return { status: 'mismatch', issue: 'Text mismatch' };
}

function detectIssues(docx, design) {
  const issues = [];

  // Check for extra numbers
  const docxNumbers = docx.match(/\d+/g) || [];
  const designNumbers = design.match(/\d+/g) || [];
  if (docxNumbers.length > designNumbers.length) {
    issues.push('DOCX Typo - Extra numbers');
  }

  // Check for missing spaces
  const docxNoSpace = docx.replace(/\s/g, '');
  const designNoSpace = design.replace(/\s/g, '');
  if (docxNoSpace === designNoSpace && docx !== design) {
    issues.push('DOCX Typo - Missing/extra spaces');
  }

  // Check for multiple consecutive spaces (e.g., ".  ©" vs ". ©")
  const docxHasMultipleSpaces = /\s{2,}/.test(docx);
  const designHasMultipleSpaces = /\s{2,}/.test(design);
  if (docxHasMultipleSpaces && !designHasMultipleSpaces) {
    issues.push('DOCX Typo - Extra consecutive spaces');
  }

  // Check for extra punctuation at end
  if (/[.,;:]$/.test(docx) && !/[.,;:]$/.test(design)) {
    issues.push('DOCX has extra punctuation at end');
  }

  // Check for extra punctuation at start
  if (/^[.,;:]/.test(docx) && !/^[.,;:]/.test(design)) {
    issues.push('DOCX has extra punctuation at start');
  }

  // Check for hyphen issues
  if (docx.includes('or-') && design.includes('or ')) {
    issues.push('DOCX Typo - Extra hyphen');
  }

  return issues;
}

// ============ COMPARE DESKTOP VS MOBILE ============
function compareDesktopMobile(desktopContent, mobileContent) {
  const results = [];
  const keys = Object.keys(desktopContent);

  keys.forEach(key => {
    if (key === 'legalFooter') {
      // Normalize: remove multiple consecutive spaces to single space
      const dText = (desktopContent[key] || []).join(' ').replace(/\s{2,}/g, ' ').trim();
      const mText = (mobileContent[key] || []).join(' ').replace(/\s{2,}/g, ' ').trim();
      results.push({
        contentType: 'Legal Footer',
        desktop: dText || '-',
        mobile: mText || '-',
        status: dText === mText ? 'identical' : 'different'
      });
    } else {
      const dText = desktopContent[key] || '';
      const mText = mobileContent[key] || '';

      if (!dText && !mText) return;

      results.push({
        contentType: formatKeyName(key),
        desktop: dText || '-',
        mobile: mText || '-',
        status: dText === mText ? 'identical' : (dText && mText ? 'different' : 'missing')
      });
    }
  });

  return results;
}

function formatKeyName(key) {
  const names = {
    headline: 'Headline',
    cta1: 'CTA #1',
    cta2: 'CTA #2',
    module2Headline: 'Module 2 Headline',
    module2Subhead: 'Module 2 Subhead',
    module3Headline: 'Module 3 Headline',
    module3Subhead: 'Module 3 Subhead',
    legalFooter: 'Legal Footer'
  };
  return names[key] || key;
}

// ============ HTML REPORT GENERATOR ============
function generateHtmlReport(docxVsDesign, desktopVsMobile, projectName, missingData = []) {
  const summary = {
    docxDesign: { total: 0, match: 0, acceptable: 0, mismatch: 0 },
    desktopMobile: { total: 0, identical: 0, different: 0 }
  };

  docxVsDesign.forEach(r => {
    if (r.status !== 'skip') {
      summary.docxDesign.total++;
      if (r.status === 'match') summary.docxDesign.match++;
      else if (r.status === 'acceptable') summary.docxDesign.acceptable++;
      else summary.docxDesign.mismatch++;
    }
  });

  desktopVsMobile.forEach(r => {
    summary.desktopMobile.total++;
    if (r.status === 'identical') summary.desktopMobile.identical++;
    else summary.desktopMobile.different++;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compare Report - ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      padding: 40px;
      line-height: 1.5;
    }
    h1 { font-size: 24px; margin-bottom: 30px; }
    h2 { font-size: 18px; margin: 30px 0 15px; color: #ccc; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 14px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    th {
      background: #2a2a2a;
      font-weight: 600;
      color: #999;
    }
    tr:hover { background: #252525; }
    .status-match, .status-identical { color: #4ade80; }
    .status-acceptable { color: #fbbf24; }
    .status-mismatch, .status-different, .status-missing { color: #f87171; }
    .highlight {
      background: #fbbf24;
      color: #000;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: bold;
    }
    .summary-table { max-width: 500px; }
    .summary-table td:first-child { font-weight: 500; }
    .conclusion {
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
    .conclusion h3 { margin-bottom: 15px; font-size: 16px; }
    .conclusion ul { margin-left: 20px; }
    .conclusion li { margin: 8px 0; }
    .conclusion code {
      background: #3a3a3a;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .icon { margin-right: 5px; }
    .warning-box {
      background: #3d2e00;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 30px;
    }
    .warning-box h3 { color: #fbbf24; margin-bottom: 10px; font-size: 16px; }
    .warning-box ul { margin-left: 20px; color: #fbbf24; }
    .warning-box li { margin: 5px 0; }
    .skip-note { color: #fbbf24; font-style: italic; margin: 15px 0; }
  </style>
</head>
<body>
  <h1>Compare Report - ${projectName}</h1>

  ${missingData.length > 0 ? `
  <div class="warning-box">
    <h3>⚠️ Missing Data</h3>
    <p>The following data sources were not found and skipped:</p>
    <ul>
      ${missingData.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${docxVsDesign.length > 0 ? `
  <h2>1. DOCX vs Design</h2>` : `
  <h2>1. DOCX vs Design</h2>
  <p class="skip-note">⚠️ Skipped - DOCX file not available</p>`}
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Content Type</th>
        <th>DOCX (Source)</th>
        <th>Desktop</th>
        <th>Mobile</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${docxVsDesign.filter(r => r.status !== 'skip').map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.contentType}</td>
        <td>${r.status === 'mismatch' ? highlightDifferences(r.docx, r.desktop) : escapeHtml(r.docx)}</td>
        <td>${escapeHtml(r.desktop)}</td>
        <td>${escapeHtml(r.mobile)}</td>
        <td class="status-${r.status}">
          ${getStatusIcon(r.status)} ${r.issue || formatStatus(r.status)}
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>2. Desktop vs Mobile</h2>
  ${desktopVsMobile.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Content Type</th>
        <th>Desktop</th>
        <th>Mobile</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${desktopVsMobile.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.contentType}</td>
        <td>${escapeHtml(r.desktop)}</td>
        <td>${escapeHtml(r.mobile)}</td>
        <td class="status-${r.status}">
          ${getStatusIcon(r.status)} ${formatStatus(r.status)}
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : `
  <p class="skip-note">⚠️ Skipped - Need both Desktop and Mobile JSON to compare</p>
  `}

  <h2>3. Summary</h2>
  <table class="summary-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th>DOCX vs Design</th>
        <th>Desktop vs Mobile</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total Items</td>
        <td>${summary.docxDesign.total}</td>
        <td>${summary.desktopMobile.total}</td>
      </tr>
      <tr>
        <td class="status-match">Match/Identical</td>
        <td>${summary.docxDesign.match}</td>
        <td>${summary.desktopMobile.identical}</td>
      </tr>
      <tr>
        <td class="status-acceptable">Acceptable Variation</td>
        <td>${summary.docxDesign.acceptable}</td>
        <td>0</td>
      </tr>
      <tr>
        <td class="status-mismatch">Mismatch/DOCX Typo</td>
        <td>${summary.docxDesign.mismatch}</td>
        <td>${summary.desktopMobile.different}</td>
      </tr>
    </tbody>
  </table>

  <div class="conclusion">
    <h3>Conclusion</h3>
    ${generateConclusion(docxVsDesign, summary)}
  </div>

  <p style="margin-top: 30px; color: #666; font-size: 12px;">
    Generated: ${new Date().toLocaleString()}
  </p>
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  if (!text) return '-';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightIssues(text) {
  if (!text) return '';
  // Don't highlight known product codes like CRF450R, CRF250R
  const knownPatterns = ['CRF450R', 'CRF250R', 'CRF450RX', 'CRF250RX'];
  for (const pattern of knownPatterns) {
    if (text.includes(pattern)) return text;
  }
  // Highlight numbers that might be typos (numbers adjacent to letters)
  return text.replace(/(\d+)(?=[A-Za-z])|(?<=[A-Za-z])(\d+)/g, '<span class="highlight">$1$2</span>');
}

// Highlight differences between DOCX and Design text
function highlightDifferences(docxText, designText) {
  if (!docxText || !designText) return escapeHtml(docxText || '');

  let result = escapeHtml(docxText);

  // Highlight extra punctuation at start
  if (/^[.,;:]/.test(docxText) && !/^[.,;:]/.test(designText)) {
    result = result.replace(/^([.,;:]+)/, '<span class="highlight">$1</span>');
  }

  // Highlight extra punctuation at end
  if (/[.,;:]$/.test(docxText) && !/[.,;:]$/.test(designText)) {
    result = result.replace(/([.,;:]+)$/, '<span class="highlight">$1</span>');
  }

  // Highlight extra numbers (numbers adjacent to letters, not product codes)
  const knownPatterns = ['CRF450R', 'CRF250R', 'CRF450RX', 'CRF250RX'];
  let hasKnownPattern = false;
  for (const pattern of knownPatterns) {
    if (docxText.includes(pattern)) {
      hasKnownPattern = true;
      break;
    }
  }
  if (!hasKnownPattern) {
    result = result.replace(/(\d+)(?=[A-Za-z])|(?<=[A-Za-z])(\d+)/g, '<span class="highlight">$1$2</span>');
  }

  // Highlight "or-" typo
  result = result.replace(/\bor-/g, '<span class="highlight">or-</span>');

  // Highlight double/multiple dots (..) - but not if already in highlight span
  result = result.replace(/(?<!<span class="highlight">)\.{2,}(?!<\/span>)/g, '<span class="highlight">$&</span>');

  // Highlight patterns like "etc.." or "word.." (word followed by double dots)
  result = result.replace(/(\w)(\.\.+)/g, '$1<span class="highlight">$2</span>');

  // Find text patterns in DOCX that differ from Design
  // Compare normalized versions to find specific differences
  const docxNorm = docxText.replace(/\s+/g, ' ').trim();
  const designNorm = designText.replace(/\s+/g, ' ').trim();

  // Find words/patterns in DOCX that are joined (missing space)
  const designWords = designText.split(/\s+/);
  designWords.forEach((word, i) => {
    if (i < designWords.length - 1) {
      const joined = word + designWords[i + 1];
      // Check if this joined pattern exists in DOCX but not in Design
      if (docxText.includes(joined) && !designText.includes(joined)) {
        const escapedJoined = escapeHtml(joined);
        // Only replace if not already highlighted
        if (!result.includes(`<span class="highlight">${escapedJoined}</span>`)) {
          result = result.replace(new RegExp(escapedJoined.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            `<span class="highlight">${escapedJoined}</span>`);
        }
      }
    }
  });

  // Highlight extra hyphens in wrong places
  if (docxText.includes('-') && !designText.includes('-')) {
    // Find hyphenated words in DOCX that shouldn't have hyphens
    result = result.replace(/(\w+)-(\s)/g, '<span class="highlight">$1-</span>$2');
  }

  // Highlight extra words at the end of DOCX that don't exist in Design
  const docxWords = docxText.trim().split(/\s+/);
  const designWordsClean = designText.trim().split(/\s+/);

  // If DOCX has more words than Design, highlight the extra words
  if (docxWords.length > designWordsClean.length) {
    const extraWords = docxWords.slice(designWordsClean.length);
    extraWords.forEach(word => {
      const escapedWord = escapeHtml(word);
      // Check if this word exists in design text
      if (!designText.toLowerCase().includes(word.toLowerCase())) {
        // Only highlight if not already highlighted
        if (!result.includes(`<span class="highlight">${escapedWord}</span>`)) {
          result = result.replace(new RegExp(`\\b${escapedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'),
            `<span class="highlight">${escapedWord}</span>`);
        }
      }
    });
  }

  // Highlight words in DOCX that don't exist in Design (extra words anywhere)
  docxWords.forEach(docxWord => {
    const cleanWord = docxWord.replace(/[.,;:!?]/g, '');
    if (cleanWord && !designText.toLowerCase().includes(cleanWord.toLowerCase())) {
      const escapedWord = escapeHtml(cleanWord);
      // Only highlight if not already highlighted and word is meaningful (not just punctuation/numbers)
      if (cleanWord.length > 1 && !result.includes(`<span class="highlight">${escapedWord}</span>`)) {
        result = result.replace(new RegExp(`\\b${escapedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
          `<span class="highlight">${escapedWord}</span>`);
      }
    }
  });

  return result;
}

function truncateText(text, maxLen) {
  if (!text) return '-';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

function getStatusIcon(status) {
  const icons = {
    match: '✅',
    identical: '✅',
    acceptable: '⚠️',
    mismatch: '❌',
    different: '❌',
    missing: '❌',
    missing_docx: '❌',
    missing_design: '❌'
  };
  return icons[status] || '';
}

function formatStatus(status) {
  const names = {
    match: 'Match',
    identical: 'Identical',
    acceptable: 'Acceptable',
    mismatch: 'Mismatch',
    different: 'Different',
    missing: 'Missing'
  };
  return names[status] || status;
}

function generateConclusion(docxVsDesign, summary) {
  const issues = docxVsDesign.filter(r => r.status === 'mismatch');

  if (issues.length === 0) {
    return '<p style="color: #4ade80;">All content matches! No issues found.</p>';
  }

  let html = '<p><strong>DOCX has issues that need to be fixed:</strong></p><ul>';

  issues.forEach((issue, i) => {
    html += `<li><code>${escapeHtml(issue.docx)}</code> - ${issue.issue}</li>`;
  });

  html += '</ul>';

  if (summary.desktopMobile.different === 0) {
    html += '<p style="margin-top: 15px; color: #4ade80;"><strong>Desktop vs Mobile:</strong> 100% Identical</p>';
  }

  return html;
}

// ============ MAIN ============
async function main() {
  console.log('Starting comparison...');
  console.log('Project:', config.project);

  // Resolve paths from config - paths are relative to project folder
  const projectDir = path.join(baseDir, config.project);

  // Track missing data
  const missingData = [];

  // Find DOCX file (optional)
  let docxTexts = [];
  let hasDocx = false;
  const docxDir = path.join(projectDir, config.input.docx);

  if (fs.existsSync(docxDir)) {
    const docxFiles = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$'));
    if (docxFiles.length > 0) {
      const docxPath = path.join(docxDir, docxFiles[0]);
      console.log('DOCX:', docxPath);
      console.log('Extracting text from DOCX...');
      docxTexts = extractTextFromDocx(docxPath);
      hasDocx = true;
    } else {
      console.log('⚠️ No DOCX file found - skipping DOCX comparison');
      missingData.push('DOCX');
    }
  } else {
    console.log('⚠️ DOCX directory not found - skipping DOCX comparison');
    missingData.push('DOCX');
  }

  // Load JSON files (optional)
  let desktopTexts = [];
  let mobileTexts = [];
  let hasDesktop = false;
  let hasMobile = false;

  const desktopJsonPath = path.join(projectDir, 'json', config.input.json.desktop);
  const mobileJsonPath = path.join(projectDir, 'json', config.input.json.mobile);

  if (fs.existsSync(desktopJsonPath)) {
    console.log('Desktop JSON:', desktopJsonPath);
    const desktopJson = JSON.parse(fs.readFileSync(desktopJsonPath, 'utf8'));
    const desktopRoot = Array.isArray(desktopJson) ? desktopJson[0] : desktopJson;
    desktopTexts = extractTextsFromJson(desktopRoot);
    hasDesktop = true;
  } else {
    console.log('⚠️ Desktop JSON not found - skipping Desktop comparison');
    missingData.push('Desktop JSON');
  }

  if (fs.existsSync(mobileJsonPath)) {
    console.log('Mobile JSON:', mobileJsonPath);
    const mobileJson = JSON.parse(fs.readFileSync(mobileJsonPath, 'utf8'));
    const mobileRoot = Array.isArray(mobileJson) ? mobileJson[0] : mobileJson;
    mobileTexts = extractTextsFromJson(mobileRoot);
    hasMobile = true;
  } else {
    console.log('⚠️ Mobile JSON not found - skipping Mobile comparison');
    missingData.push('Mobile JSON');
  }

  // Check if we have enough data to compare
  if (!hasDesktop && !hasMobile) {
    console.error('❌ No Design JSON files found. At least one (Desktop or Mobile) is required.');
    process.exit(1);
  }

  console.log('Extracting text from Design JSON...');

  // Parse content using generic parsers
  const docxContent = hasDocx ? parseDocxByStructure(docxTexts) : createEmptyContent();
  const desktopContent = hasDesktop ? parseDesignTexts(desktopTexts) : createEmptyContent();
  const mobileContent = hasMobile ? parseDesignTexts(mobileTexts) : createEmptyContent();

  // Compare DOCX vs Design (only if we have DOCX and at least one design)
  const docxVsDesign = [];

  if (hasDocx && (hasDesktop || hasMobile)) {
    // Compare structured content
    const contentPairs = [
      { key: 'headline', label: 'Headline' },
      { key: 'body', label: 'Body Copy' },
      { key: 'cta', label: 'CTA Button' }
    ];

    contentPairs.forEach(({ key, label }) => {
      const docxVal = docxContent[key] || '';
      const desktopVal = desktopContent[key] || '';
      const mobileVal = mobileContent[key] || '';

      if (docxVal || desktopVal || mobileVal) {
        const result = compareTexts(docxVal, hasDesktop ? desktopVal : mobileVal, config.rules);
        docxVsDesign.push({
          contentType: label,
          docx: docxVal || '-',
          desktop: hasDesktop ? (desktopVal || '-') : '-',
          mobile: hasMobile ? (mobileVal || '-') : '-',
          status: result.status,
          issue: result.issue
        });
      }
    });

    // Compare feature texts
    const docxFeatures = docxContent.featureTexts || [];
    const desktopFeatures = desktopContent.featureTexts || [];
    const mobileFeatures = mobileContent.featureTexts || [];

    docxFeatures.forEach((docxFeat, i) => {
      const desktopMatch = findBestMatch(docxFeat, desktopFeatures);
      const mobileMatch = findBestMatch(docxFeat, mobileFeatures);

      const result = compareTexts(docxFeat, desktopMatch || mobileMatch || '', config.rules);
      docxVsDesign.push({
        contentType: `Feature Text ${i + 1}`,
        docx: docxFeat,
        desktop: hasDesktop ? (desktopMatch || '-') : '-',
        mobile: hasMobile ? (mobileMatch || '-') : '-',
        status: result.status,
        issue: result.issue
      });
    });

    // Compare legal footer
    const docxLegal = (docxContent.legalFooter || []).join(' ').replace(/\s{2,}/g, ' ').trim();
    const desktopLegal = (desktopContent.legalFooter || []).join(' ').replace(/\s{2,}/g, ' ').trim();
    const mobileLegal = (mobileContent.legalFooter || []).join(' ').replace(/\s{2,}/g, ' ').trim();

    if (docxLegal || desktopLegal || mobileLegal) {
      const legalResult = compareTexts(docxLegal, hasDesktop ? desktopLegal : mobileLegal, config.rules);
      docxVsDesign.push({
        contentType: 'Legal Footer',
        docx: docxLegal || '-',
        desktop: hasDesktop ? (desktopLegal || '-') : '-',
        mobile: hasMobile ? (mobileLegal || '-') : '-',
        status: legalResult.status,
        issue: legalResult.issue
      });
    }
  }

  // Compare Desktop vs Mobile (only if we have both)
  let desktopVsMobile = [];
  if (hasDesktop && hasMobile) {
    desktopVsMobile = compareDesktopMobileGeneric(desktopContent, mobileContent);
  }

  // Generate HTML report
  console.log('Generating HTML report...');
  const html = generateHtmlReport(docxVsDesign, desktopVsMobile, config.project, missingData);

  // Write output - use project folder: output/{project}/compare-report.html
  const outputDir = path.join(baseDir, config.output.dir, config.project);
  const outputPath = path.join(outputDir, 'compare-report.html');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, html);
  console.log('Report generated:', outputPath);
}

// Helper to create empty content structure
function createEmptyContent() {
  return {
    headline: null,
    cta1: null,
    cta2: null,
    module2Headline: null,
    module2Subhead: null,
    module3Headline: null,
    module3Subhead: null,
    legalFooter: []
  };
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
