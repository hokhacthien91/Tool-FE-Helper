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

// Get accessible name of an element
async function getAccessibleName(page, element) {
  try {
    // Try to get accessible name using multiple methods
    const name = await page.evaluate((el) => {
      // Priority order:
      // 1. aria-label
      // 2. aria-labelledby (resolve the referenced element)
      // 3. title attribute
      // 4. textContent (for text elements)
      // 5. alt (for images)
      // 6. value (for inputs)
      // 7. placeholder (for inputs)
      // 8. label associated with input

      if (el.getAttribute('aria-label')) {
        return el.getAttribute('aria-label');
      }

      if (el.getAttribute('aria-labelledby')) {
        const labelledById = el.getAttribute('aria-labelledby');
        const labelledByEl = document.getElementById(labelledById);
        if (labelledByEl) {
          return labelledByEl.textContent?.trim() || labelledByEl.innerText?.trim() || '';
        }
      }

      if (el.getAttribute('title')) {
        return el.getAttribute('title');
      }

      // For text elements, get text content
      if (el.textContent) {
        const text = el.textContent.trim();
        if (text) return text;
      }

      // For images
      if (el.tagName === 'IMG' && el.getAttribute('alt')) {
        return el.getAttribute('alt');
      }

      // For inputs
      if (el.tagName === 'INPUT') {
        if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') {
          return el.value || '';
        }
        if (el.placeholder) {
          return el.placeholder;
        }
        // Try to find associated label
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) {
            return label.textContent?.trim() || label.innerText?.trim() || '';
          }
        }
        // Try to find parent label
        const parentLabel = el.closest('label');
        if (parentLabel) {
          const labelText = parentLabel.textContent?.trim() || parentLabel.innerText?.trim() || '';
          // Remove the input value from label text if present
          return labelText.replace(el.value || '', '').trim();
        }
      }

      // For buttons, try to get text content
      if (el.tagName === 'BUTTON') {
        return el.textContent?.trim() || el.innerText?.trim() || '';
      }

      return '';
    }, element);

    return name || '';
  } catch (error) {
    console.warn('Error getting accessible name:', error.message);
    return '';
  }
}

// Get element type
function getElementType(tagName, role, type) {
  if (role) {
    if (role === 'link') return 'Link';
    if (role === 'button') return 'Button';
    if (role === 'checkbox') return 'Checkbox';
    if (role === 'radio') return 'Radio';
  }

  if (tagName === 'A') return 'Link';
  if (tagName === 'BUTTON') return 'Button';
  if (tagName === 'INPUT') {
    if (type === 'checkbox') return 'Checkbox';
    if (type === 'radio') return 'Radio';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'Button';
    return 'Text';
  }
  if (tagName === 'TEXTAREA') return 'Text';
  if (['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'].includes(tagName)) {
    return 'Text';
  }

  return 'Text';
}

// Scan a single page
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

    console.log(`  → Extracting elements...`);
    const elements = await page.evaluate(() => {
      try {
      const results = [];

      // Get all interactive elements (exclude text elements)
      const selectors = [
        // Standard HTML interactive elements
        'a[href]',
        'button',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        'input[type="text"]',
        'input[type="email"]',
        'input[type="password"]',
        'input[type="search"]',
        'input[type="tel"]',
        'input[type="url"]',
        'input[type="number"]',
        'input[type="date"]',
        'input[type="time"]',
        'input[type="datetime-local"]',
        'input[type="month"]',
        'input[type="week"]',
        'input[type="color"]',
        'input[type="range"]',
        'input[type="file"]',
        'textarea',
        'select',
        'option',
        'details',
        'summary',
        // ARIA roles for interactive elements
        '[role="link"]',
        '[role="button"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="menuitemradio"]',
        '[role="tab"]',
        '[role="option"]',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="switch"]',
        '[role="slider"]',
        '[role="spinbutton"]',
        '[role="textbox"]',
        '[role="searchbox"]',
        '[role="treeitem"]',
        '[role="gridcell"]',
        '[role="columnheader"]',
        '[role="rowheader"]',
        // Elements with accessibility attributes (focusable/interactive)
        '[tabindex]:not([tabindex="-1"])',
        '[aria-label]',
        '[aria-labelledby]',
        '[aria-describedby]',
        '[aria-controls]',
        '[aria-owns]',
        '[aria-expanded]',
        '[aria-selected]',
        '[aria-checked]',
        '[aria-pressed]',
        '[aria-current]',
        '[aria-haspopup]',
      ];

      const allElements = document.querySelectorAll(selectors.join(', '));

      // Helper function to get CSS selector path for an element
      function getSelectorPath(element) {
        if (element.id) {
          return `#${element.id}`;
        }
        
        const path = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let selector = current.tagName.toLowerCase();
          
          // Add class names if available
          if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).filter(c => c.length > 0);
            if (classes.length > 0) {
              selector += '.' + classes.join('.');
            }
          }
          
          // Add nth-child if needed for uniqueness
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              child => child.tagName === current.tagName
            );
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += `:nth-of-type(${index})`;
            }
          }
          
          path.unshift(selector);
          
          // Stop if we have an ID or reached body/html
          if (current.id || current.tagName === 'BODY' || current.tagName === 'HTML') {
            break;
          }
          
          current = current.parentElement;
        }
        
        return path.join(' > ');
      }

      allElements.forEach((el, index) => {
        // Note: We now include hidden elements (display: none, visibility: hidden, etc.)
        // to check accessibility even for hidden elements
        
        // Skip if element has zero size (likely not a real element)
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          // But allow if it's an input/textarea/button that might be intentionally hidden
          const tagName = el.tagName;
          if (!['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(tagName)) {
            return;
          }
        }

        const tagName = el.tagName;
        const role = el.getAttribute('role');
        const type = el.getAttribute('type');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledby = el.getAttribute('aria-labelledby');
        const ariaControls = el.getAttribute('aria-controls');
        const title = el.getAttribute('title');
        const textContent = el.textContent?.trim() || '';
        const innerText = el.innerText?.trim() || '';
        const alt = el.getAttribute('alt');
        const value = el.value || '';
        const placeholder = el.getAttribute('placeholder');
        const href = el.getAttribute('href');

        // Determine element type
        let elementType = null;
        
        // Links
        if (tagName === 'A' || role === 'link') {
          elementType = 'Link';
        }
        // Buttons
        else if (tagName === 'BUTTON' || role === 'button' || (tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(type))) {
          elementType = 'Button';
        }
        // Checkboxes
        else if ((tagName === 'INPUT' && type === 'checkbox') || role === 'checkbox' || role === 'menuitemcheckbox') {
          elementType = 'Checkbox';
        }
        // Radio buttons
        else if ((tagName === 'INPUT' && type === 'radio') || role === 'radio' || role === 'menuitemradio') {
          elementType = 'Radio';
        }
        // Textboxes (input/textarea)
        else if (['INPUT', 'TEXTAREA'].includes(tagName)) {
          // Textbox: input/textarea (exclude button, submit, reset, checkbox, radio)
          if (!['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type)) {
            elementType = 'Textbox';
          }
        }
        // Select dropdowns
        else if (tagName === 'SELECT' || role === 'listbox' || role === 'combobox') {
          elementType = 'Select';
        }
        // Options
        else if (tagName === 'OPTION') {
          elementType = 'Option';
        }
        // Details/Summary
        else if (tagName === 'DETAILS' || tagName === 'SUMMARY') {
          elementType = 'Details';
        }
        // Switch
        else if (role === 'switch') {
          elementType = 'Switch';
        }
        // Slider
        else if (role === 'slider' || (tagName === 'INPUT' && type === 'range')) {
          elementType = 'Slider';
        }
        // Tab
        else if (role === 'tab') {
          elementType = 'Tab';
        }
        // Menu items
        else if (role === 'menuitem') {
          elementType = 'MenuItem';
        }
        // Elements with ARIA roles or attributes that make them interactive
        else if (role === 'textbox' || role === 'searchbox') {
          elementType = 'Textbox';
        }
        // Elements with tabindex (focusable) or aria attributes
        else if (el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1') {
          // Check if it has interactive aria attributes
          if (ariaLabel || ariaLabelledby || ariaControls || el.hasAttribute('aria-expanded') || 
              el.hasAttribute('aria-selected') || el.hasAttribute('aria-pressed') ||
              el.hasAttribute('aria-current') || el.hasAttribute('aria-haspopup')) {
            elementType = 'Interactive';
          }
        }
        // Skip if no type determined (not an interactive element)
        if (!elementType) {
          return;
        }

        // Get accessible name
        let name = '';
        if (ariaLabel) {
          name = ariaLabel;
        } else if (ariaLabelledby) {
          const labelledByEl = document.getElementById(ariaLabelledby);
          if (labelledByEl) {
            name = labelledByEl.textContent?.trim() || labelledByEl.innerText?.trim() || '';
          }
        } else if (title) {
          name = title;
        } else if (tagName === 'IMG' && alt) {
          name = alt;
        } else if (['INPUT', 'TEXTAREA'].includes(tagName)) {
          if (['button', 'submit', 'reset'].includes(type)) {
            name = value;
          } else {
            // For textbox: prioritize label, then placeholder, then value
            let hasLabel = false;
            // Try to find associated label first
            if (el.id) {
              const label = document.querySelector(`label[for="${el.id}"]`);
              if (label) {
                name = label.textContent?.trim() || label.innerText?.trim() || '';
                hasLabel = true;
              }
            }
            // Try to find parent label
            if (!name) {
              const parentLabel = el.closest('label');
              if (parentLabel) {
                const labelText = parentLabel.textContent?.trim() || parentLabel.innerText?.trim() || '';
                name = labelText.replace(value || '', '').trim();
                hasLabel = true;
              }
            }
            // Use placeholder if no label found
            if (!name && placeholder) {
              name = placeholder;
            }
            // Use value as last resort (but only if it's meaningful and no label)
            if (!name && value && value.length < 100 && !hasLabel) {
              name = value;
            }
            
            // Store hasLabel flag for filtering later
            // We'll check this after name is determined
          }
        } else if (tagName === 'BUTTON') {
          name = textContent || innerText || '';
        } else if (tagName === 'A') {
          name = textContent || innerText || '';
          // If link has no text but has aria-label or title, use that
          if (!name && ariaLabel) name = ariaLabel;
          if (!name && title) name = title;
        } else if (tagName === 'SELECT') {
          // For select, try to get label or use selected option text
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) {
              name = label.textContent?.trim() || label.innerText?.trim() || '';
            }
          }
          if (!name) {
            const selectedOption = el.options[el.selectedIndex];
            if (selectedOption) {
              name = selectedOption.textContent?.trim() || selectedOption.innerText?.trim() || '';
            }
          }
          if (!name) {
            name = textContent || innerText || '';
          }
        } else if (tagName === 'OPTION') {
          name = textContent || innerText || value || '';
        } else if (tagName === 'DETAILS' || tagName === 'SUMMARY') {
          name = textContent || innerText || '';
        } else if (elementType === 'Switch' || elementType === 'Slider' || elementType === 'Tab' || 
                   elementType === 'MenuItem' || elementType === 'Interactive') {
          // For these types, try to get name from various sources
          name = textContent || innerText || '';
          if (!name && placeholder) {
            name = placeholder;
          }
        }
        // Skip text elements - not included in report

        // Only include elements with names
        if (name && name.length > 0) {
          // Clean up name (remove extra whitespace, newlines)
          name = name.replace(/\s+/g, ' ').trim();

          // For Textbox: only include if has label or placeholder (not just value)
          if (elementType === 'Textbox') {
            // Re-check if has label (we need to check again here)
            let hasLabel = false;
            if (el.id) {
              const label = document.querySelector(`label[for="${el.id}"]`);
              if (label) hasLabel = true;
            }
            if (!hasLabel) {
              const parentLabel = el.closest('label');
              if (parentLabel) hasLabel = true;
            }
            const hasPlaceholder = placeholder && placeholder.length > 0;
            const hasAriaLabel = ariaLabel && ariaLabel.length > 0;
            const hasProperLabel = hasLabel || hasPlaceholder || hasAriaLabel;
            
            // Only include if has proper label/placeholder/aria-label, not just value
            if (!hasProperLabel && name === value) {
              return; // Skip if only has value but no label
            }
          }

          // Get selector path
          const selectorPath = getSelectorPath(el);

          results.push({
            index: index + 1,
            type: elementType,
            name: name,
            selector: selectorPath,
            tagName: tagName,
            role: role || '',
            href: href || '',
          });
        }
      });

      return results;
      } catch (e) {
        console.error('Error in page.evaluate:', e);
        return [];
      }
    }).catch((error) => {
      console.error('Error evaluating page:', error.message);
      return [];
    });

    if (!elements || elements.length === 0) {
      console.log(`  ⚠️  No elements found`);
      return [];
    }

    console.log(`  → Found ${elements.length} elements`);

    // Re-number elements (keep all, including duplicates)
    elements.forEach((el, index) => {
      el.index = index + 1;
    });

    console.log(`✅ Found ${elements.length} elements`);
    return elements;
  } catch (error) {
    console.error(`❌ Error scanning ${url}:`, error.message);
    return [];
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

  console.log(`\n🚀 Starting scan for ${urls.length} URL(s)...\n`);

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

      const elements = await scanPage(page, url);

      // Add URL to each element
      elements.forEach((el) => {
        allResults.push({
          '#': el.index,
          'Type': el.type,
          'Name': el.name,
          'Selector': el.selector,
          'URL': url,
        });
      });
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message);
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

  // Group results by URL
  const resultsByUrl = {};
  allResults.forEach((result) => {
    if (!resultsByUrl[result.URL]) {
      resultsByUrl[result.URL] = [];
    }
    resultsByUrl[result.URL].push(result);
  });

  // Create a combined sheet with all results (remove duplicates based on Selector, Type, and Name)
  const uniqueCombinedResults = [];
  const seenCombined = new Set();
  let combinedIndex = 1;
  
  allResults.forEach((result) => {
    const key = `${result.Selector}:${result.Type}:${result.Name}`;
    if (!seenCombined.has(key)) {
      seenCombined.add(key);
      uniqueCombinedResults.push({
        '#': combinedIndex++,
        'Type': result.Type,
        'Name': result.Name,
        'Selector': result.Selector,
        'URL': result.URL,
      });
    }
  });

  const combinedWorksheet = XLSX.utils.json_to_sheet(uniqueCombinedResults);
  combinedWorksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 15 }, // Type
    { wch: 80 }, // Name
    { wch: 100 }, // Selector
    { wch: 100 }, // URL
  ];
  XLSX.utils.book_append_sheet(workbook, combinedWorksheet, 'All Elements');

  // Helper function to get page name from URL
  function getPageNameFromUrl(url, urlIndex) {
    let sheetName = '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length > 0) {
        // Use the last part of the path as page name
        sheetName = pathParts[pathParts.length - 1];
      } else {
        // If no path, use hostname
        sheetName = urlObj.hostname.replace(/^www\./, '');
      }
      
      // Clean up: remove query params, hash, and invalid characters for Excel sheet names
      sheetName = sheetName
        .replace(/[?&#].*$/, '') // Remove query params and hash
        .replace(/[\/\\?*\[\]:]/g, '_') // Replace invalid Excel characters
        .replace(/\s+/g, '_') // Replace spaces
        .substring(0, 31); // Excel sheet name limit is 31 characters
      
      // If empty or too short, use a fallback
      if (!sheetName || sheetName.length < 2) {
        sheetName = `Page_${urlIndex + 1}`;
      }
    } catch (e) {
      // Fallback if URL parsing fails
      const pathMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
      if (pathMatch) {
        sheetName = pathMatch[1].substring(0, 31);
      } else {
        sheetName = `Page_${urlIndex + 1}`;
      }
    }
    return sheetName;
  }

  // Create separate sheets for each URL
  const usedSheetNames = new Set();
  const sheetNamesMap = {}; // Map URL to sheet name for logging
  Object.keys(resultsByUrl).forEach((url, urlIndex) => {
    const urlResults = resultsByUrl[url];
    // Renumber elements for this URL
    urlResults.forEach((result, index) => {
      result['#'] = index + 1;
    });

    const worksheet = XLSX.utils.json_to_sheet(urlResults);
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 15 }, // Type
      { wch: 80 }, // Name
      { wch: 100 }, // Selector
      { wch: 100 }, // URL
    ];

    // Create safe sheet name from page name (last part of URL path)
    let sheetName = getPageNameFromUrl(url, urlIndex);
    
    // Ensure unique sheet name
    let finalSheetName = sheetName;
    let counter = 1;
    while (usedSheetNames.has(finalSheetName)) {
      const suffix = `_${counter}`;
      finalSheetName = sheetName.substring(0, 31 - suffix.length) + suffix;
      counter++;
    }
    usedSheetNames.add(finalSheetName);
    sheetNamesMap[url] = finalSheetName; // Store for logging

    XLSX.utils.book_append_sheet(workbook, worksheet, finalSheetName);
  });

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
  const outputPath = path.join(reportsPath, `element-names-${timestamp}.xlsx`);
  XLSX.writeFile(workbook, outputPath);

  console.log(`\n✅ Successfully exported ${allResults.length} elements to: ${outputPath}`);
  console.log(`📁 Reports directory: ${reportsFolderName}`);
  console.log(`\n📊 Sheets created:`);
  console.log(`  1. All Elements - Combined results from all URLs`);
  Object.keys(resultsByUrl).forEach((url, index) => {
    const sheetName = sheetNamesMap[url] || `Page_${index + 1}`;
    console.log(`  ${index + 2}. ${sheetName} - ${resultsByUrl[url].length} elements`);
  });
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();


