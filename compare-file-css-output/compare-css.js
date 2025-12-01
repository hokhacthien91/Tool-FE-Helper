const fs = require('fs');
const path = require('path');

/**
 * CSS Comparison Script
 * So sánh CSS trước và sau khi migration để verify không có thay đổi về styling
 */

// Config các file cần compare
const CSS_COMPARISON_CONFIG = [
  {
    name: 'Infracapital Main CSS',
    before: path.join(__dirname, 'coverage/css-origin-before/clientlib-site-infracapital/css/site-infracapital.css'),
    after: path.join(__dirname, 'dist/clientlib-site-infracapital/css/site-infracapital.css'),
  },
  {
    name: 'Infracapital Print CSS',
    before: path.join(
      __dirname,
      'coverage/css-origin-before/clientlib-site-infracapital/css/site-infracapital-print.css',
    ),
    after: path.join(__dirname, 'dist/clientlib-site-infracapital/css/site-infracapital-print.css'),
  },
  {
    name: 'Investments Main CSS',
    before: path.join(
      __dirname,
      'coverage/css-origin-before/clientlib-site-mg-investments/css/site-mg-investments.css',
    ),
    after: path.join(__dirname, 'dist/clientlib-site-mg-investments/css/site-mg-investments.css'),
  },
  {
    name: 'Investments Print CSS',
    before: path.join(
      __dirname,
      'coverage/css-origin-before/clientlib-site-mg-investments/css/site-mg-investments-print.css',
    ),
    after: path.join(__dirname, 'dist/clientlib-site-mg-investments/css/site-mg-investments-print.css'),
  },
];

/**
 * Parse CSS thành object với selector và properties
 * Xử lý cả minified và formatted CSS
 */
function parseCSS(cssContent) {
  const rules = {};

  // Remove comments
  cssContent = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove @charset, @import
  cssContent = cssContent.replace(/@charset[^;]+;?/gi, '');
  cssContent = cssContent.replace(/@import[^;]+;?/gi, '');

  // Handle @media queries - extract content from media queries and preserve context
  // We'll prefix selectors with media query info to avoid conflicts
  const mediaQueryRegex = /@media[^{]*\{([^{}]*\{[^{}]*\}[^{}]*)*\}/g;
  const mediaMatches = cssContent.match(mediaQueryRegex) || [];
  mediaMatches.forEach((mediaBlock) => {
    // Extract media query condition
    const mediaMatch = mediaBlock.match(/@media([^{]*)\{/);
    if (mediaMatch) {
      const mediaCondition = mediaMatch[1].trim();
      // Extract rules inside media query
      const innerContent = mediaBlock.replace(/@media[^{]*\{/, '').replace(/\}$/, '');
      // Prefix all selectors in media query with media condition to preserve context
      // This way we can compare base rules vs media query rules separately
      const prefixedContent = innerContent.replace(/([^{}]+)\{/g, (match, selector) => {
        // Remove parentheses if already present in mediaCondition
        const cleanCondition = mediaCondition.replace(/^\(|\)$/g, '');
        return `@media(${cleanCondition}) ${selector.trim()}{`;
      });
      cssContent = cssContent.replace(mediaBlock, prefixedContent);
    }
  });

  // Handle @page rules
  cssContent = cssContent.replace(/@page[^{]*\{[^{}]*\}/g, '');

  // Parse rules - handle nested rules và minified CSS
  let pos = 0;

  while (pos < cssContent.length) {
    // Find next {
    const openBrace = cssContent.indexOf('{', pos);
    if (openBrace === -1) break;

    const selector = cssContent.substring(pos, openBrace).trim();
    if (!selector) {
      pos = openBrace + 1;
      continue;
    }

    // Find matching }
    let depth = 1;
    let closeBrace = openBrace + 1;
    let inString = false;
    let stringChar = '';

    while (closeBrace < cssContent.length && depth > 0) {
      const char = cssContent[closeBrace];

      if ((char === '"' || char === "'") && cssContent[closeBrace - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      } else if (!inString) {
        if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
        }
      }

      if (depth > 0) {
        closeBrace++;
      }
    }

    if (depth === 0) {
      const propertiesStr = cssContent.substring(openBrace + 1, closeBrace);
      const properties = parseProperties(propertiesStr);

      if (Object.keys(properties).length > 0) {
        const normalizedSelector = normalizeSelector(selector);
        // Merge với existing rules nếu selector trùng
        if (rules[normalizedSelector]) {
          rules[normalizedSelector] = { ...rules[normalizedSelector], ...properties };
        } else {
          rules[normalizedSelector] = properties;
        }
      }
    }

    pos = closeBrace + 1;
  }

  return rules;
}

/**
 * Parse properties string thành object
 */
function parseProperties(propertiesStr) {
  const properties = {};
  propertiesStr = propertiesStr.trim();

  if (!propertiesStr) return properties;

  // Split by semicolon, nhưng phải cẩn thận với calc(), url(), etc.
  const propPairs = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < propertiesStr.length; i++) {
    const char = propertiesStr[i];

    if ((char === '"' || char === "'") && propertiesStr[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      current += char;
    } else if (!inString) {
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ';' && depth === 0) {
        propPairs.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    propPairs.push(current.trim());
  }

  propPairs.forEach((prop) => {
    const propMatch = prop.trim().match(/^([^:]+):(.+)$/);
    if (propMatch) {
      const propName = propMatch[1].trim();
      const propValue = propMatch[2].trim();
      if (propName && propValue) {
        properties[propName] = propValue;
      }
    }
  });

  return properties;
}

/**
 * Normalize selector (remove extra whitespace)
 */
function normalizeSelector(selector) {
  return selector.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize CSS value để so sánh (remove whitespace, normalize colors, etc.)
 */
function normalizeValue(value) {
  if (!value) return '';

  // Remove whitespace
  value = value.replace(/\s+/g, ' ').trim();

  // Normalize color values (rgb, rgba, hex)
  value = value.replace(/rgba?\(([^)]+)\)/g, (match, content) => {
    const parts = content.split(',').map((p) => p.trim());
    if (parts.length === 4) {
      // rgba
      return `rgba(${parts.join(',')})`;
    }
    if (parts.length === 3) {
      // rgb
      return `rgb(${parts.join(',')})`;
    }
    return match;
  });

  // Normalize hex colors to lowercase
  value = value.replace(/#([A-Fa-f0-9]{3,6})\b/g, (match, hex) => {
    return `#${hex.toLowerCase()}`;
  });

  return value;
}

/**
 * So sánh hai CSS objects
 */
function compareCSS(beforeRules, afterRules) {
  const differences = [];
  const allSelectors = new Set([...Object.keys(beforeRules), ...Object.keys(afterRules)]);

  allSelectors.forEach((selector) => {
    const beforeProps = beforeRules[selector] || {};
    const afterProps = afterRules[selector] || {};
    const allProps = new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)]);

    allProps.forEach((propName) => {
      const beforeValue = normalizeValue(beforeProps[propName] || '');
      const afterValue = normalizeValue(afterProps[propName] || '');

      if (beforeValue !== afterValue) {
        differences.push({
          selector,
          property: propName,
          before: beforeValue || '(missing)',
          after: afterValue || '(missing)',
        });
      }
    });
  });

  return differences;
}

/**
 * Main function để compare các file CSS
 */
function compareCSSFiles() {
  console.log('='.repeat(80));
  console.log('CSS Comparison Report');
  console.log('='.repeat(80));
  console.log('');

  let totalDifferences = 0;
  let filesWithDifferences = 0;

  CSS_COMPARISON_CONFIG.forEach((config, index) => {
    console.log(`\n[${index + 1}/${CSS_COMPARISON_CONFIG.length}] Comparing: ${config.name}`);
    console.log('-'.repeat(80));

    // Check if files exist
    if (!fs.existsSync(config.before)) {
      console.log(`❌ ERROR: Before file not found: ${config.before}`);
      return;
    }

    if (!fs.existsSync(config.after)) {
      console.log(`❌ ERROR: After file not found: ${config.after}`);
      return;
    }

    // Read files
    const beforeContent = fs.readFileSync(config.before, 'utf8');
    const afterContent = fs.readFileSync(config.after, 'utf8');

    // Parse CSS
    const beforeRules = parseCSS(beforeContent);
    const afterRules = parseCSS(afterContent);

    console.log(`📊 Before: ${Object.keys(beforeRules).length} selectors`);
    console.log(`📊 After:  ${Object.keys(afterRules).length} selectors`);

    // Compare
    const differences = compareCSS(beforeRules, afterRules);

    if (differences.length === 0) {
      console.log('✅ No differences found!');
    } else {
      filesWithDifferences++;
      totalDifferences += differences.length;
      console.log(`⚠️  Found ${differences.length} difference(s):`);
      console.log('');

      // Group by selector for better readability
      const differencesBySelector = {};
      differences.forEach((diff) => {
        if (!differencesBySelector[diff.selector]) {
          differencesBySelector[diff.selector] = [];
        }
        differencesBySelector[diff.selector].push(diff);
      });

      Object.keys(differencesBySelector).forEach((selector) => {
        console.log(`  Selector: ${selector}`);
        differencesBySelector[selector].forEach((diff) => {
          console.log(`    Property: ${diff.property}`);
          console.log(`      Before: ${diff.before}`);
          console.log(`      After:  ${diff.after}`);
        });
        console.log('');
      });
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`Total files compared: ${CSS_COMPARISON_CONFIG.length}`);
  console.log(`Files with differences: ${filesWithDifferences}`);
  console.log(`Total differences found: ${totalDifferences}`);

  if (totalDifferences === 0) {
    console.log('\n✅ All CSS files are identical! Migration successful!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Differences found. Please review the changes above.');
    process.exit(1);
  }
}

// Run comparison
if (require.main === module) {
  compareCSSFiles();
}

module.exports = {
  compareCSSFiles,
  parseCSS,
  compareCSS,
  normalizeValue,
};
