console.clear();

figma.showUI(__html__, { width: 600, height: 500 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'checkDuplicates') {
    // Check for duplicate names before creating variables
    const data = msg.data;
    if (!data || !data.length) {
      figma.ui.postMessage({ type: 'status', message: 'No data found in JSON.', error: true });
      return;
    }

    const globalStyle = data[0].values;
    const prefix = msg.prefix || '';
    const createVariables = msg.createVariables !== undefined ? msg.createVariables : true; // Default to true for checkDuplicates

    try {
      const duplicates = await checkForDuplicates(globalStyle, prefix);
      const hasDuplicates = duplicates.colors.length > 0 || duplicates.spacing.length > 0 || duplicates.textStyles.length > 0;

      if (hasDuplicates) {
        figma.ui.postMessage({ 
          type: 'duplicatesFound', 
          duplicates: duplicates,
          action: 'generate',
          json: data,
          createVariables: createVariables,
          prefix: prefix
        });
      } else {
        figma.ui.postMessage({ type: 'noDuplicates' });
      }
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error checking duplicates: ${error.message}`, error: true });
    }
  } else if (msg.type === 'generate') {
    const data = msg.data;
    if (!data || !data.length) {
      figma.ui.postMessage({ type: 'status', message: 'No data found in JSON.', error: true });
      return;
    }

    const globalStyle = data[0].values;
    const createVariables = msg.createVariables || false;
    const prefix = msg.prefix || '';
    const duplicateAction = msg.duplicateAction || 'skip'; // 'skip' or 'overwrite'

    try {
      // Create Variables and Text Styles if checkbox is checked
      if (createVariables) {
        await createVariablesAndStyles(globalStyle, prefix, duplicateAction);
      }

      await generateGlobalStyle(globalStyle, createVariables ? prefix : '');

      const successMsg = createVariables
        ? 'Global Style generated successfully! Variables & Text Styles created.'
        : 'Global Style generated successfully!';
      figma.ui.postMessage({ type: 'status', message: successMsg });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'generateFromFigma') {
    try {
      await generateFromFigmaVariablesAndStyles();
      figma.ui.postMessage({ type: 'status', message: 'Global Style from Figma generated successfully!' });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'importTokens') {
    try {
      const tokenFiles = msg.tokenFiles || {};
      const createVariables = msg.createVariables || false;
      const generateLayout = msg.generateLayout || false;
      const prefix = (msg.prefix || '').trim();
      const duplicateAction = msg.duplicateAction || 'skip';
      const selectedBreakpoints = msg.selectedBreakpoints || ['mobile', 'tablet', 'desktop'];

      // Parse tokens
      const parsedTokens = parseAllTokens(tokenFiles);

      // Filter typography by selected breakpoints
      if (parsedTokens.typography && selectedBreakpoints.length > 0) {
        const bpFilter = style => {
          const bp = (style.breakpoint || 'mobile').toLowerCase();
          return selectedBreakpoints.includes(bp);
        };
        parsedTokens.typography = parsedTokens.typography.filter(bpFilter);
        if (parsedTokens.typographyAll) {
          parsedTokens.typographyAll = parsedTokens.typographyAll.filter(bpFilter);
        }
      }

      // Check for duplicates if creating variables
      if (createVariables) {
        const duplicates = await checkForDuplicatesFromParsedTokens(parsedTokens, prefix);
        const totalDuplicates = (duplicates.colors && duplicates.colors.length ? duplicates.colors.length : 0) +
                                (duplicates.spacing && duplicates.spacing.length ? duplicates.spacing.length : 0) +
                                (duplicates.textStyles && duplicates.textStyles.length ? duplicates.textStyles.length : 0) +
                                (duplicates.borders && duplicates.borders.length ? duplicates.borders.length : 0) +
                                (duplicates.breakpoints && duplicates.breakpoints.length ? duplicates.breakpoints.length : 0);

        if (totalDuplicates > 0) {
          // Send duplicates to UI for user to choose
          figma.ui.postMessage({
            type: 'duplicatesFound',
            duplicates: duplicates,
            action: 'importTokens',
            tokenFiles: tokenFiles,
            createVariables: createVariables,
            generateLayout: generateLayout,
            prefix: prefix,
            selectedBreakpoints: selectedBreakpoints
          });
          return;
        }
      }

      // No duplicates or user already chose, proceed with import
      if (createVariables) {
        await createVariablesFromParsedTokens(parsedTokens, prefix, duplicateAction);
      }

      // Generate layout if requested
      if (generateLayout) {
        await generateLayoutFromParsedTokens(parsedTokens, prefix, createVariables);
      }

      const successMsg = createVariables && generateLayout
        ? 'Tokens imported successfully! Variables created and layout generated.'
        : createVariables
        ? 'Tokens imported successfully! Variables created.'
        : 'Tokens imported successfully! Layout generated.';
      figma.ui.postMessage({ type: 'status', message: successMsg });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'importTokensWithAction') {
    // Handle import after user chose action
    try {
      const tokenFiles = msg.tokenFiles || {};
      const createVariables = msg.createVariables || false;
      const generateLayout = msg.generateLayout || false;
      const prefix = (msg.prefix || '').trim();
      const duplicateAction = msg.duplicateAction || 'skip';
      const selectedBreakpoints = msg.selectedBreakpoints || ['mobile', 'tablet', 'desktop'];

      // Parse tokens
      const parsedTokens = parseAllTokens(tokenFiles);

      // Filter typography by selected breakpoints
      if (parsedTokens.typography && selectedBreakpoints.length > 0) {
        const bpFilter = style => {
          const bp = (style.breakpoint || 'mobile').toLowerCase();
          return selectedBreakpoints.includes(bp);
        };
        parsedTokens.typography = parsedTokens.typography.filter(bpFilter);
        if (parsedTokens.typographyAll) {
          parsedTokens.typographyAll = parsedTokens.typographyAll.filter(bpFilter);
        }
      }

      // Create variables if requested
      if (createVariables) {
        await createVariablesFromParsedTokens(parsedTokens, prefix, duplicateAction);
      }

      // Generate layout if requested
      if (generateLayout) {
        await generateLayoutFromParsedTokens(parsedTokens, prefix, createVariables);
      }

      const successMsg = createVariables && generateLayout
        ? 'Tokens imported successfully! Variables created and layout generated.'
        : createVariables
        ? 'Tokens imported successfully! Variables created.'
        : 'Tokens imported successfully! Layout generated.';
      figma.ui.postMessage({ type: 'status', message: successMsg });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'importTokensWithSelections') {
    // Handle import with individual selections
    try {
      const tokenFiles = msg.tokenFiles || {};
      const createVariables = msg.createVariables || false;
      const generateLayout = msg.generateLayout || false;
      const prefix = (msg.prefix || '').trim();
      const selections = msg.selections || {};
      const selectedBreakpoints = msg.selectedBreakpoints || ['mobile', 'tablet', 'desktop'];

      // Parse tokens
      const parsedTokens = parseAllTokens(tokenFiles);

      // Filter typography by selected breakpoints
      if (parsedTokens.typography && selectedBreakpoints.length > 0) {
        const bpFilter = style => {
          const bp = (style.breakpoint || 'mobile').toLowerCase();
          return selectedBreakpoints.includes(bp);
        };
        parsedTokens.typography = parsedTokens.typography.filter(bpFilter);
        if (parsedTokens.typographyAll) {
          parsedTokens.typographyAll = parsedTokens.typographyAll.filter(bpFilter);
        }
      }

      // Create variables if requested
      if (createVariables) {
        await createVariablesFromParsedTokens(parsedTokens, prefix, 'skip', selections);
      }

      // Generate layout if requested
      if (generateLayout) {
        await generateLayoutFromParsedTokens(parsedTokens, prefix, createVariables);
      }

      const successMsg = createVariables && generateLayout
        ? 'Tokens imported successfully! Variables created and layout generated.'
        : createVariables
        ? 'Tokens imported successfully! Variables created.'
        : 'Tokens imported successfully! Layout generated.';
      figma.ui.postMessage({ type: 'status', message: successMsg });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'generateWithSelections') {
    // Handle generate with individual selections
    try {
      const data = msg.data;
      if (!data || !data.length) {
        figma.ui.postMessage({ type: 'status', message: 'No data found in JSON.', error: true });
        return;
      }

      const globalStyle = data[0].values;
      const createVariables = msg.createVariables || false;
      const prefix = msg.prefix || '';
      const selections = msg.selections || {};

      // Create Variables and Text Styles if checkbox is checked
      if (createVariables) {
        await createVariablesAndStyles(globalStyle, prefix, 'skip', selections);
      }

      await generateGlobalStyle(globalStyle, createVariables ? prefix : '');

      const successMsg = createVariables
        ? 'Global Style generated successfully! Variables & Text Styles created.'
        : 'Global Style generated successfully!';
      figma.ui.postMessage({ type: 'status', message: successMsg });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ type: 'status', message: `Error: ${error.message}`, error: true });
    }
  } else if (msg.type === 'exportTokens') {
    try {
      const tokenTypes = msg.tokenTypes || [];
      const projectName = msg.projectName || 'Project A — Corporate / Enterprise';
      
      const exportedTokens = await exportTokensFromFigma(tokenTypes, projectName);
      
      // Send back to UI for download
      figma.ui.postMessage({ 
        type: 'tokensExported', 
        tokens: exportedTokens,
        projectName: projectName
      });
    } catch (error) {
      console.error(error);
      figma.ui.postMessage({ 
        type: 'status', 
        message: `Error exporting tokens: ${error.message}`, 
        error: true 
      });
    }
  }
};

async function generateGlobalStyle(values, prefix = '') {
  // 0. Pre-load local variables and styles
  const localPaintStyles = figma.getLocalPaintStyles();
  const localTextStyles = figma.getLocalTextStyles();
  
  // Also load Variables (Figma Variables)
  const localVariables = figma.variables.getLocalVariables("COLOR"); // Filter for Color variables

  // Create maps for faster lookup
  const paintStyleMap = new Map(localPaintStyles.map(s => [s.name, s]));
  const textStyleMap = new Map(localTextStyles.map(s => [s.name, s]));
  const variableMap = new Map(localVariables.map(v => [v.name, v]));
  
  // DEBUG: Log available styles to console to debug matching issues
  console.log("Available Paint Styles:", Array.from(paintStyleMap.keys()));
  console.log("Available Variables:", Array.from(variableMap.keys()));
  console.log("Available Text Styles:", Array.from(textStyleMap.keys()));
  
  // 1. Load Fonts
  const styles = values.typographyStyles || [];
  const fontsToLoad = new Set();
  
  // Add base fonts for UI
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Regular" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Bold" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Medium" }));

  // Add fonts from JSON - handle different font style formats
  styles.forEach(style => {
    if (style.fontFamily && style.fontWeight) {
      // Add the exact font style from JSON
      fontsToLoad.add(JSON.stringify({ family: style.fontFamily, style: style.fontWeight }));
      
      // Also try to load common variations if style contains multiple words
      // e.g., "Semibold Subhead" -> try "Semibold Subhead", "Semibold", "Regular"
      const styleParts = style.fontWeight.split(' ');
      if (styleParts.length > 1) {
        // Try just the first part (e.g., "Semibold" from "Semibold Subhead")
        fontsToLoad.add(JSON.stringify({ family: style.fontFamily, style: styleParts[0] }));
      }
    }
  });

  // Load all fonts with better error handling
  const loadedFonts = new Set();
  for (const fontStr of fontsToLoad) {
    const font = JSON.parse(fontStr);
    const fontKey = `${font.family}:${font.style}`;
    
    // Skip if already loaded
    if (loadedFonts.has(fontKey)) continue;
    
    try {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey);
      console.log(`Loaded font: ${font.family} ${font.style}`);
    } catch (e) {
      console.warn(`Could not load font: ${font.family} ${font.style}`, e);
      // Try common fallbacks
      const fallbacks = [
        { family: font.family, style: "Regular" },
        { family: font.family, style: "Medium" },
        { family: "Inter", style: "Regular" }
      ];
      
      let loaded = false;
      for (const fallback of fallbacks) {
        try {
          await figma.loadFontAsync(fallback);
          loadedFonts.add(`${fallback.family}:${fallback.style}`);
          loaded = true;
          console.log(`Loaded fallback font: ${fallback.family} ${fallback.style}`);
          break;
        } catch (fallbackError) {
          // Continue to next fallback
        }
      }
      
      if (!loaded) {
        console.error(`Failed to load font and all fallbacks for: ${font.family} ${font.style}`);
      }
    }
  }

  // 2. Create Page or Main Frame
  // Let's create a big frame to hold everything
  const mainFrame = figma.createFrame();
  mainFrame.name = "Global Style";
  mainFrame.layoutMode = "HORIZONTAL";
  mainFrame.itemSpacing = 100;
  mainFrame.paddingLeft = 100;
  mainFrame.paddingRight = 100;
  mainFrame.paddingTop = 100;
  mainFrame.paddingBottom = 100;
  mainFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }]; // Light grey background
  
  // 3. Generate Sections
  createColorsSection(mainFrame, values.colorNameMap, paintStyleMap, variableMap);

  // Check if styles are organized by breakpoints (Mobile/Tablet/Desktop)
  const breakpoints = ["Mobile", "Tablet", "Desktop"];
  const hasBreakpointStyles = breakpoints.some(bp =>
    styles.some(s => s.name.startsWith(bp))
  );

  if (hasBreakpointStyles) {
    // Render separate sections for each breakpoint
    for (const breakpoint of breakpoints) {
      const hasStyles = styles.some(s => s.name.startsWith(breakpoint));
      if (hasStyles) {
        await createTypographySection(mainFrame, styles, breakpoint, textStyleMap, prefix);
      }
    }
  } else {
    // Render all typography styles in one section
    if (styles.length > 0) {
      await createTypographySection(mainFrame, styles, null, textStyleMap, prefix);
    }
  }

  createSpacingSection(mainFrame, values.spacingScale);

  // Resize main frame to fit content
  mainFrame.primaryAxisSizingMode = "AUTO";
  mainFrame.counterAxisSizingMode = "AUTO";

  figma.viewport.scrollAndZoomIntoView([mainFrame]);
}

function createColorsSection(parent, colorMap, paintStyleMap, variableMap) {
  const section = figma.createFrame();
  section.name = "Colors";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White card
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  // Group colors by their group name
  // If name contains '/', use it as separator (e.g., "Primary/Teal" -> group: "Primary", name: "Teal")
  // Otherwise, use first word as group (e.g., "NewQuest Navy" -> group: "NewQuest", name: "Navy")
  const groupedColors = {};
  const seenColorKeys = new Set(); // Track unique colors globally by (colorName + hex) to prevent duplicates

  Object.entries(colorMap).forEach(([hex, fullName]) => {
    let groupName, colorName;

    if (fullName.includes('/')) {
      // Use '/' as separator (e.g., "Primary/Teal")
      const parts = fullName.split('/');
      groupName = parts[0] || 'Other';
      colorName = parts[1] || fullName;
    } else {
      // Use first word as group (e.g., "NewQuest Navy" -> group: "NewQuest", name: "Navy")
      const parts = fullName.split(' ');
      groupName = parts[0] || 'Other';
      colorName = parts.slice(1).join(' ') || fullName;
    }

    // Dedupe: skip if same colorName + hex already seen (across all groups)
    // This prevents rendering the same color twice even if it appears multiple times
    const normalizedHex = hex.toUpperCase().trim();
    const normalizedName = colorName.trim().toLowerCase();
    const dedupeKey = `${normalizedName}|${normalizedHex}`;

    if (seenColorKeys.has(dedupeKey)) {
      console.log(`Skipping duplicate color: ${colorName} (${hex})`);
      return; // Skip duplicate
    }
    seenColorKeys.add(dedupeKey);

    if (!groupedColors[groupName]) {
      groupedColors[groupName] = [];
    }
    groupedColors[groupName].push({
      hex: hex,
      name: colorName,
      fullName: fullName
    });
  });

  // Define group order - Primary always first, Secondary second
  const groupOrder = ['Primary', 'Secondary', 'Infra', 'Tint', 'Darker Hover State', 'Neutral', 'Other'];

  // Sort groups by predefined order
  const sortedGroups = Object.entries(groupedColors).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);

    // If both are in order list, sort by order
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If only A is in order list, A comes first
    if (indexA !== -1) return -1;
    // If only B is in order list, B comes first
    if (indexB !== -1) return 1;
    // Otherwise sort alphabetically
    return a[0].localeCompare(b[0]);
  });

  // Create a frame for each group
  sortedGroups.forEach(([groupName, colors]) => {
    // Sort colors within each group alphabetically by name
    const sortedColors = colors.slice().sort((a, b) => a.name.localeCompare(b.name));
    const groupFrame = figma.createFrame();
    groupFrame.name = groupName;
    groupFrame.layoutMode = "VERTICAL";
    groupFrame.itemSpacing = 20;
    groupFrame.fills = [];
    groupFrame.primaryAxisSizingMode = "AUTO";
    groupFrame.counterAxisSizingMode = "FIXED";
    groupFrame.resize(1200, 100);

    // Group title
    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Bold" };
    title.characters = groupName;
    title.fontSize = 28;
    groupFrame.appendChild(title);

    // Create rows of swatches (4 per row)
    const swatchesPerRow = 4;
    for (let i = 0; i < sortedColors.length; i += swatchesPerRow) {
      const swatchesRow = figma.createFrame();
      swatchesRow.name = "Swatches Row";
      swatchesRow.layoutMode = "HORIZONTAL";
      swatchesRow.itemSpacing = 20;
      swatchesRow.fills = [];
      swatchesRow.primaryAxisSizingMode = "AUTO";
      swatchesRow.counterAxisSizingMode = "AUTO";

      const rowColors = sortedColors.slice(i, i + swatchesPerRow);
      rowColors.forEach(c => {
        const swatchContainer = figma.createFrame();
        swatchContainer.name = c.name;
        swatchContainer.layoutMode = "VERTICAL";
        swatchContainer.itemSpacing = 16;
        swatchContainer.fills = [];
        swatchContainer.primaryAxisSizingMode = "AUTO";
        swatchContainer.counterAxisSizingMode = "AUTO";

        const rect = figma.createRectangle();
        rect.name = "Swatch";
        rect.resize(240, 240);
        rect.cornerRadius = 8;

        // Check for existing paint style
        // Try exact match, or "Group/Name", or "Name" if stored without group prefix
        // In global.json, c.fullName is like "Primary/Teal" and c.name is "Teal"
        const existingStyle = paintStyleMap.get(c.fullName) || paintStyleMap.get(c.name);

        // Also check variables
        const existingVariable = variableMap.get(c.fullName) || variableMap.get(c.name);

        if (existingStyle) {
            rect.fillStyleId = existingStyle.id;
        } else if (existingVariable) {
             // Creating a paint with variable ID
             rect.fills = [
                (function() {
                    const rgb = hexToRgb(c.hex);
                    const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b };
                    const paintObj = { type: 'SOLID', color: colorObj };
                    if (rgb.a !== undefined && rgb.a !== 1) {
                        paintObj.opacity = rgb.a;
                    }
                    return figma.variables.setBoundVariableForPaint(paintObj, 'color', existingVariable);
                })()
            ];
        } else {
            // Try to find case-insensitive match if strict match fails?
            // Or try finding by HEX?
            // Let's stick to name matching but be more robust
            // Maybe keys in map are different than expected?
            const rgb = hexToRgb(c.hex);
            const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b };
            const paintObj = { type: 'SOLID', color: colorObj };
            if (rgb.a !== undefined && rgb.a !== 1) {
              paintObj.opacity = rgb.a;
            }
            rect.fills = [paintObj];
        }
        
        rect.strokeWeight = 1;
        rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }];

        const nameText = figma.createText();
        nameText.name = "Color Name"; // Meaningful name
        nameText.fontName = { family: "Inter", style: "Bold" };
        nameText.characters = c.name;
        nameText.fontSize = 24; // Increased font size (was 12)
        nameText.textAlignHorizontal = "CENTER";
        nameText.resize(240, nameText.height);

        const hexText = figma.createText();
        hexText.name = "Hex Value"; // Meaningful name
        hexText.fontName = { family: "Inter", style: "Regular" };
        hexText.characters = c.hex;
        hexText.fontSize = 24; // Increased font size (was 10)
        hexText.textAlignHorizontal = "CENTER";
        hexText.resize(240, hexText.height);

        swatchContainer.appendChild(rect);
        swatchContainer.appendChild(nameText);
        swatchContainer.appendChild(hexText);
        
        swatchesRow.appendChild(swatchContainer);
      });
      groupFrame.appendChild(swatchesRow);
    }
    
    section.appendChild(groupFrame);
  });

  parent.appendChild(section);
}

async function createTypographySection(parent, styles, filterPrefix, textStyleMap, projectPrefix = '') {
  // Filter styles by prefix if provided, otherwise use all styles
  const filteredStyles = filterPrefix
    ? styles.filter(s => s.name.startsWith(filterPrefix))
    : styles;

  if (filteredStyles.length === 0) {
    return; // Don't create section if no styles exist
  }

  // Build section title with project prefix
  // e.g., filterPrefix="Desktop", projectPrefix="MG" -> "Desktop - MG | Typography"
  let sectionTitle = filterPrefix || "Typography";
  if (projectPrefix && filterPrefix) {
    sectionTitle = `${filterPrefix} - ${projectPrefix}`;
  }

  const section = figma.createFrame();
  section.name = filterPrefix ? `${sectionTitle} Typography` : "Typography";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 24;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White card
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  // Fixed Width 1200px
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100); // height auto-updates due to primaryAxisSizingMode

  const header = figma.createFrame();
  header.layoutMode = "HORIZONTAL";
  header.itemSpacing = 10;
  header.fills = [];
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";

  const title = figma.createText();
  title.characters = filterPrefix ? `${sectionTitle} | Typography` : "Typography";
  title.fontSize = 24;
  title.fontName = { family: "Inter", style: "Regular" };
  header.appendChild(title);
  section.appendChild(header);

  // Column headers
  const colHeader = figma.createText();
  colHeader.characters = "Standard text";
  colHeader.fontSize = 18;
  colHeader.fontName = { family: "Inter", style: "Bold" };
  section.appendChild(colHeader);

  // List Container
  const listFrame = figma.createFrame();
  listFrame.name = "Styles List"; // Meaningful name
  listFrame.layoutMode = "VERTICAL";
  listFrame.itemSpacing = 0;
  listFrame.fills = [];
  listFrame.layoutAlign = "STRETCH";
  listFrame.primaryAxisSizingMode = "AUTO"; 
  listFrame.counterAxisSizingMode = "FIXED"; // Don't hug content width
  section.appendChild(listFrame);
  
  for (const s of filteredStyles) {
    // Remove breakpoint prefix from name for display (e.g., "Desktop/H1" -> "H1")
    // Also remove any project prefix pattern like "- MG/" or "MG/" from the name
    let displayName = filterPrefix ? s.name.replace(`${filterPrefix}/`, '') : s.name;

    // Strip any remaining prefix patterns: "- MG/H1" -> "H1" or "MG/H1" -> "H1"
    if (displayName.includes('/')) {
      displayName = displayName.split('/').pop();
    }
    // Also handle "- " prefix at the start
    if (displayName.startsWith('- ')) {
      displayName = displayName.substring(2);
    }

    const row = figma.createFrame();
    row.name = displayName; // Meaningful name (e.g., "H1", "Body Copy")
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 40;
    row.fills = [];
    row.paddingTop = 16;
    row.paddingBottom = 16;
    row.primaryAxisAlignItems = "MIN";
    row.counterAxisAlignItems = "CENTER";
    row.layoutAlign = "STRETCH";
    
    // Key fix: Row width should be FIXED (controlled by Stretch), not AUTO (Hug)
    // Row height should be AUTO (Hug) to grow with wrapped text
    row.primaryAxisSizingMode = "FIXED"; 
    row.counterAxisSizingMode = "AUTO";

    // Style Name Label
    const label = figma.createText();
    label.name = "Label";
    label.fontName = { family: "Inter", style: "Regular" };
    label.characters = displayName;
    label.fontSize = 16;
    label.resize(150, label.height);
    label.layoutGrow = 0;

    // Sample Text
    const sample = figma.createText();
    sample.name = "Preview Text"; // Meaningful name
    // Default Lorem Ipsum
    let sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.sed do eiusmod tempor incididunt";
    
    // Customize text length based on font size
    if (s.fontSize > 65) {
        sampleText = "Lorem ipsum dolor sit amet";
    } else if (s.fontSize < 24) {
       sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris";
    }
    else if (s.fontSize >= 40) {
        sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    }

    // const lowerName = displayName.toLowerCase();
    // if (lowerName.includes('display')) {
    //     sampleText = "THIS IS DISPLAY TEXT IN TWO LINES";
    // } else if (lowerName.match(/^h\d/)) {
    //     sampleText = `This is ${displayName} text`;
    // }
    
    // Apply styles BEFORE setting characters and textAutoResize
    try {
        // Calculate the text style name with project prefix
        // Text styles are created as "Desktop - MG/H1" when prefix is "MG"
        // s.name is "Desktop/H1", displayName is "H1"
        let textStyleName = s.name;
        if (projectPrefix) {
          if (filterPrefix) {
            // "Desktop/H1" -> "Desktop - MG/H1"
            textStyleName = `${filterPrefix} - ${projectPrefix}/${displayName}`;
          } else {
            // No breakpoint: "H1" -> "MG/H1"
            textStyleName = `${projectPrefix}/${s.name}`;
          }
        }

        // Check for existing text style
        const existingTextStyle = textStyleMap.get(textStyleName) || textStyleMap.get(s.name) || textStyleMap.get(displayName);
        if (existingTextStyle) {
             // Load the font used by the text style first
             const originalFont = existingTextStyle.fontName;

             try {
               await figma.loadFontAsync(originalFont);
               console.log(`✓ Loaded font for text style ${s.name}: ${originalFont.family} ${originalFont.style}`);
               sample.textStyleId = existingTextStyle.id;
             } catch (styleLoadError) {
               console.warn(`✗ Could not load font for text style ${s.name}:`, styleLoadError);

               // Try fallback fonts
               const fallbacks = [
                 { family: originalFont.family, style: "Regular" },
                 { family: originalFont.family, style: "Medium" },
                 { family: originalFont.family, style: "Bold" },
                 { family: "Inter", style: "Regular" }
               ];

               let fontToUse = { family: "Inter", style: "Regular" };
               for (const fallback of fallbacks) {
                 try {
                   await figma.loadFontAsync(fallback);
                   fontToUse = fallback;
                   console.log(`✓ Loaded fallback font: ${fontToUse.family} ${fontToUse.style}`);
                   break;
                 } catch (e) {
                   // Continue to next fallback
                 }
               }

               // Apply fallback font manually
               sample.fontName = fontToUse;
               sample.fontSize = s.fontSize;
               if (s.lineHeight && s.lineHeight.endsWith('%')) {
                 sample.lineHeight = { value: parseFloat(s.lineHeight), unit: 'PERCENT' };
               }
               if (s.letterSpacing) {
                 if (s.letterSpacing.endsWith('%')) {
                   sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PERCENT' };
                 } else {
                   sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PIXELS' };
                 }
               }

               // Add warning text
               sampleText += ` (check font-family manual: expected ${originalFont.family} ${originalFont.style})`;
             }
        } else {
             // Fallback to manual properties - ensure font is loaded first
             const fontToUse = { family: s.fontFamily, style: s.fontWeight };
             const originalFont = { family: s.fontFamily, style: s.fontWeight };
             let usingFallback = false;

             // Try to load font if not already loaded
             try {
               await figma.loadFontAsync(fontToUse);
               console.log(`✓ Loaded font: ${fontToUse.family} ${fontToUse.style}`);
             } catch (fontError) {
               console.warn(`✗ Font not found: ${fontToUse.family} ${fontToUse.style}, trying fallbacks`);
               usingFallback = true;

               // Try fallbacks
               const fallbacks = [
                 { family: s.fontFamily, style: "Regular" },
                 { family: s.fontFamily, style: "Medium" },
                 { family: s.fontFamily, style: "Bold" },
                 { family: "Inter", style: "Regular" }
               ];

               let loaded = false;
               for (const fallback of fallbacks) {
                 try {
                   await figma.loadFontAsync(fallback);
                   fontToUse.family = fallback.family;
                   fontToUse.style = fallback.style;
                   loaded = true;
                   console.log(`✓ Loaded fallback font: ${fontToUse.family} ${fontToUse.style}`);
                   break;
                 } catch (e) {
                   // Continue to next fallback
                 }
               }

               if (!loaded) {
                 // Final fallback to Inter Regular - must load it
                 await figma.loadFontAsync({ family: "Inter", style: "Regular" });
                 fontToUse.family = "Inter";
                 fontToUse.style = "Regular";
                 console.log(`✓ Used final fallback: Inter Regular`);
               }
             }

             sample.fontName = fontToUse;
             sample.fontSize = s.fontSize;
             if (s.lineHeight && s.lineHeight.endsWith('%')) {
                 sample.lineHeight = { value: parseFloat(s.lineHeight), unit: 'PERCENT' };
             }
             if (s.letterSpacing) {
                  if (s.letterSpacing.endsWith('%')) {
                      sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PERCENT' };
                  } else {
                      sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PIXELS' };
                  }
             }

             // Add warning text if using fallback font
             if (usingFallback) {
               sampleText += ` (check font-family manual: expected ${originalFont.family} ${originalFont.style})`;
             }
        }

        // Now set characters and textAutoResize AFTER font is loaded
        sample.characters = sampleText;
        sample.layoutGrow = 1;
        sample.textAutoResize = "HEIGHT";
    } catch(e) {
        console.error("Font/Style assign failed", e);
        // Fallback to Inter Regular
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
          sample.fontName = { family: "Inter", style: "Regular" };
          sample.characters = sampleText;
          sample.layoutGrow = 1;
          sample.textAutoResize = "HEIGHT";
        } catch (fallbackError) {
          console.error("Even fallback font failed", fallbackError);
        }
    }

    row.appendChild(label);
    row.appendChild(sample);
    listFrame.appendChild(row);

    // Separator Line
    const line = figma.createRectangle();
    line.name = "Separator"; // Meaningful name
    line.resize(100, 1);
    line.layoutAlign = "STRETCH";
    line.fills = [{type: 'SOLID', color: {r: 0.9, g: 0.9, b: 0.9}}];
    listFrame.appendChild(line);
  }

  parent.appendChild(section);
}

function createSpacingSection(parent, spacingScale) {
  const section = figma.createFrame();
  section.name = "Spacing / Vertical";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 20;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White card
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "AUTO";

  const title = figma.createText();
  title.characters = "Spacing / Vertical";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Regular" };
  section.appendChild(title);
  
  if (!spacingScale) return;
  
  const values = spacingScale.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
  
  // Table header
  const table = figma.createFrame();
  table.layoutMode = "VERTICAL";
  table.itemSpacing = 1; // Grid lines effect
  table.fills = [{type: 'SOLID', color: {r:0.9, g:0.9, b:0.9}}]; // Border color
  table.counterAxisSizingMode = "AUTO";
  
  // Header Row
  const headerRow = figma.createFrame();
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{type: 'SOLID', color: {r:0.2, g:0.2, b:0.2}}]; // Dark header
  headerRow.paddingLeft = 16; headerRow.paddingRight = 16;
  headerRow.paddingTop = 10; headerRow.paddingBottom = 10;
  headerRow.primaryAxisSizingMode = "AUTO";
  headerRow.counterAxisSizingMode = "AUTO";
  
  ['Name', 'Mobile', 'Tablet', 'Desktop'].forEach(text => {
     const cell = figma.createText();
     cell.characters = text;
     cell.fills = [{type: 'SOLID', color: {r:1, g:1, b:1}}];
     cell.fontSize = 16;
     cell.fontName = { family: "Inter", style: "Bold" };
     cell.resize(100, cell.height); // Wider cells
     headerRow.appendChild(cell);
  });
  table.appendChild(headerRow);

  values.forEach((val, index) => {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.fills = [{type: 'SOLID', color: {r:0.2, g:0.2, b:0.2}}]; // Dark bg like screenshot
    row.paddingLeft = 16; row.paddingRight = 16;
    row.paddingTop = 10; row.paddingBottom = 10;
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    
    // Label (e.g. index)
    const label = figma.createText();
    label.characters = index.toString();
    label.fills = [{type: 'SOLID', color: {r:1, g:1, b:1}}];
    label.fontSize = 16;
    label.fontName = { family: "Inter", style: "Regular" };
    label.resize(100, label.height);
    
    row.appendChild(label);
    
    for(let i=0; i<3; i++) {
        const valText = figma.createText();
        valText.characters = val.toString();
        valText.fills = [{type: 'SOLID', color: {r:1, g:1, b:1}}];
        valText.fontSize = 16;
        valText.fontName = { family: "Inter", style: "Regular" };
        valText.resize(100, valText.height);
        row.appendChild(valText);
    }
    
    table.appendChild(row);
  });

  section.appendChild(table);
  parent.appendChild(section);
}

// hexToRgb function moved to line 3670 (duplicate removed)

function rgbToHex(r, g, b) {
  const toHex = (val) => {
    const hex = Math.round(val * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ============================================
// EXPORT TOKENS FUNCTIONS
// ============================================

async function exportTokensFromFigma(tokenTypes, projectName) {
  const exported = {};
  
  // Get all Figma data
  const colorVariables = figma.variables.getLocalVariables("COLOR");
  const textStyles = figma.getLocalTextStyles();
  const numberVariables = figma.variables.getLocalVariables("FLOAT");
  const paintStyles = figma.getLocalPaintStyles();
  
  // Export each token type
  if (tokenTypes.includes('color')) {
    // Prefer Color Variables; fall back to Color Styles (Paint Styles)
    // when the file has no local color variables (e.g. styles-only files).
    if (colorVariables && colorVariables.length > 0) {
      exported.color = exportColorTokens(colorVariables, projectName);
    } else {
      exported.color = exportColorTokensFromPaintStyles(paintStyles, projectName);
    }
  }
  
  if (tokenTypes.includes('typography')) {
    exported.typography = await exportTypographyTokens(textStyles, projectName);
  }
  
  if (tokenTypes.includes('spacing')) {
    exported.spacing = exportSpacingTokens(numberVariables, projectName);
  }
  
  if (tokenTypes.includes('shadow')) {
    const effectStyles = figma.getLocalEffectStyles();
    exported.shadow = exportShadowTokens(effectStyles, projectName);
  }
  
  if (tokenTypes.includes('border')) {
    exported.border = exportBorderTokens(numberVariables, projectName);
  }
  
  if (tokenTypes.includes('breakpoint')) {
    exported.breakpoint = exportBreakpointTokens(numberVariables, projectName);
  }
  
  if (tokenTypes.includes('button')) {
    // Button tokens might need special handling (from components)
    exported.button = exportButtonTokens(projectName);
  }
  
  return exported;
}

function exportColorTokens(colorVariables, projectName) {
  const colorData = {};
  
  colorVariables.forEach(variable => {
    const name = variable.name;
    const description = variable.description || '';
    
    // Remove collection prefix if exists: "Colors - Project A/" → ""
    let cleanName = name.replace(/^Colors\s*-\s*[^/]+\//, '');
    
    // Parse path: "primary/100" → ["primary", "100"]
    // Or: "semantic/success" → ["semantic", "success"]
    // Or: "black" → ["black"]
    const parts = cleanName.split('/').filter(p => p);
    
    // Build nested structure
    let current = colorData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    // Get color value from first mode
    const modeId = Object.keys(variable.valuesByMode)[0];
    let colorValue = variable.valuesByMode[modeId];
    
    // Resolve if it's a variable reference (recursively)
    colorValue = resolveVariableValue(colorValue);
    
    // Convert to hex string
    const hex = colorToHexString(colorValue);
    
    // Set final value
    const finalKey = parts[parts.length - 1];
    current[finalKey] = {
      value: hex,
      description: description
    };
  });
  
  // Always add transparent color at the end
  colorData.transparent = {
    value: "transparent",
    description: "Transparent color"
  };
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "color",
    "$project": projectName,
    "color": colorData
  };
}

function exportColorTokensFromPaintStyles(paintStyles, projectName) {
  const colorData = {};

  (paintStyles || []).forEach(style => {
    const fills = style.paints || [];
    // Only export solid color styles (skip gradients/images)
    const solid = fills.find(p => p.type === 'SOLID');
    if (!solid) {
      console.log(`[EXPORT COLOR/STYLES] Skipping non-solid style: ${style.name}`);
      return;
    }

    const name = style.name;
    const description = style.description || '';

    // Remove collection prefix if exists: "Colors - Project A/" → ""
    let cleanName = name.replace(/^Colors\s*-\s*[^/]+\//, '');

    // Parse path, keep full grouping: "Presidio/Cyan" → ["presidio", "cyan"]
    const parts = cleanName.split('/').map(p => p.trim()).filter(p => p);
    if (parts.length === 0) return;

    // Build nested structure
    let current = colorData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    // Convert color (respect opacity from paint)
    const colorValue = {
      r: solid.color.r,
      g: solid.color.g,
      b: solid.color.b,
      a: solid.opacity !== undefined ? solid.opacity : 1
    };
    const hex = colorToHexString(colorValue);

    const finalKey = parts[parts.length - 1];
    current[finalKey] = {
      value: hex,
      description: description
    };
  });

  // Always add transparent color at the end
  colorData.transparent = {
    value: "transparent",
    description: "Transparent color"
  };

  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "color",
    "$project": projectName,
    "color": colorData
  };
}

async function exportTypographyTokens(textStyles, projectName) {
  const textStylesData = {};
  
  // Styles to skip - these are already exported in linksColors
  const skipStyles = ['default', 'hover', 'focus'];
  
  // First pass: collect all styles grouped by style name
  const stylesByName = {};
  
  textStyles.forEach(style => {
    const parsed = parseTextStyleName(style.name);
    const styleName = parsed.styleName;
    const breakpoint = parsed.breakpoint;
    
    console.log(`[EXPORT TYPOGRAPHY] Parsing style: ${style.name}`);
    console.log(`[EXPORT TYPOGRAPHY]   → styleName: ${styleName}, breakpoint: ${breakpoint}, breakpoints: ${parsed.breakpoints.join(', ')}`);
    
    // Skip styles that are part of linksColors
    if (skipStyles.includes(styleName)) {
      console.log(`[EXPORT TYPOGRAPHY]   → Skipping (part of linksColors)`);
      return;
    }
    
    if (!stylesByName[styleName]) {
      stylesByName[styleName] = {};
    }
    
    if (!stylesByName[styleName][breakpoint]) {
      stylesByName[styleName][breakpoint] = [];
    }
    
    stylesByName[styleName][breakpoint].push(style);
    console.log(`[EXPORT TYPOGRAPHY]   → Added to stylesByName[${styleName}][${breakpoint}]`);
  });
  
  // Find body fontFamily to use as default (skip if same)
  let bodyFontFamily = null;
  if (stylesByName.body && stylesByName.body.mobile && stylesByName.body.mobile.length > 0) {
    const bodyStyle = stylesByName.body.mobile[0];
    if (bodyStyle.fontName && bodyStyle.fontName.family) {
      bodyFontFamily = bodyStyle.fontName.family;
    }
  }
  
  // Second pass: build nested structure
  Object.keys(stylesByName).forEach(styleName => {
    const breakpointStyles = stylesByName[styleName];
    
    console.log(`[EXPORT TYPOGRAPHY] Building structure for style: ${styleName}`);
    console.log(`[EXPORT TYPOGRAPHY]   → Available breakpoints:`, Object.keys(breakpointStyles));
    
    // Start with mobile (base)
    if (breakpointStyles.mobile && breakpointStyles.mobile.length > 0) {
      console.log(`[EXPORT TYPOGRAPHY]   → Found mobile base`);
      const mobileStyle = breakpointStyles.mobile[0];
      const mobileObj = buildStyleObject(mobileStyle, null, bodyFontFamily, styleName);
      
      // Check if there are nested breakpoints (tablet, desktop) within mobile
      // This happens when we have "Body/Mobile/Tablet" or "H1/Mobile/Desktop" structure
      // Both tablet and desktop are nested under mobile, not tablet nested under desktop
      
      // Handle tablet nested in mobile
      // Only include properties that differ from mobile
      if (breakpointStyles.tablet && breakpointStyles.tablet.length > 0) {
        console.log(`[EXPORT TYPOGRAPHY]   → Found tablet, comparing with mobile...`);
        const tabletStyle = breakpointStyles.tablet[0];
        const tabletObj = buildStyleObject(tabletStyle, mobileStyle, bodyFontFamily, styleName);
        // Filter out properties that are the same as mobile
        const filteredTabletObj = {};
        Object.keys(tabletObj).forEach(key => {
          if (JSON.stringify(tabletObj[key]) !== JSON.stringify(mobileObj[key])) {
            filteredTabletObj[key] = tabletObj[key];
          }
        });
        console.log(`[EXPORT TYPOGRAPHY]   → Tablet differences:`, Object.keys(filteredTabletObj));
        // Only add tablet if it has at least one different property
        if (Object.keys(filteredTabletObj).length > 0) {
          mobileObj.tablet = filteredTabletObj;
          console.log(`[EXPORT TYPOGRAPHY]   → Added tablet to mobile`);
        } else {
          console.log(`[EXPORT TYPOGRAPHY]   → Tablet same as mobile, skipping`);
        }
      } else {
        console.log(`[EXPORT TYPOGRAPHY]   → No tablet found`);
      }
      
      // Handle desktop nested in mobile (not in tablet)
      // Only include properties that differ from mobile
      if (breakpointStyles.desktop && breakpointStyles.desktop.length > 0) {
        console.log(`[EXPORT TYPOGRAPHY]   → Found desktop, comparing with mobile...`);
        const desktopStyle = breakpointStyles.desktop[0];
        // Desktop is nested under mobile, use mobileStyle as base
        const desktopObj = buildStyleObject(desktopStyle, mobileStyle, bodyFontFamily, styleName);
        // Filter out properties that are the same as mobile
        const filteredDesktopObj = {};
        Object.keys(desktopObj).forEach(key => {
          if (JSON.stringify(desktopObj[key]) !== JSON.stringify(mobileObj[key])) {
            filteredDesktopObj[key] = desktopObj[key];
          }
        });
        console.log(`[EXPORT TYPOGRAPHY]   → Desktop differences:`, Object.keys(filteredDesktopObj));
        // Only add desktop if it has at least one different property
        if (Object.keys(filteredDesktopObj).length > 0) {
          mobileObj.desktop = filteredDesktopObj;
          console.log(`[EXPORT TYPOGRAPHY]   → Added desktop to mobile`);
        } else {
          console.log(`[EXPORT TYPOGRAPHY]   → Desktop same as mobile, skipping`);
        }
      } else {
        console.log(`[EXPORT TYPOGRAPHY]   → No desktop found`);
      }
      
      textStylesData[styleName] = { mobile: mobileObj };
    } else {
      // Fallback: use first available breakpoint
      const firstBreakpoint = Object.keys(breakpointStyles)[0];
      if (firstBreakpoint && breakpointStyles[firstBreakpoint].length > 0) {
        const style = breakpointStyles[firstBreakpoint][0];
        textStylesData[styleName] = { [firstBreakpoint]: buildStyleObject(style, null, bodyFontFamily, styleName) };
      }
    }
  });
  
  // Export linksColors from Link text styles
  const linksColors = await exportLinksColors(textStyles);
  
  const result = {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "typography",
    "$project": projectName,
    "textStyles": textStylesData
  };
  
  // Add linksColors if found
  if (linksColors && Object.keys(linksColors).length > 0) {
    result.linksColors = linksColors;
  }

  return result;
}

async function exportLinksColors(textStyles) {
  const linksColors = {};
  
  // First, try to find "Links Colors" Frame layout (new format)
  let linksColorsFrame = null;
  figma.root.children.forEach(page => {
    const frames = page.findAll(node => 
      node.type === 'FRAME' && node.name === 'Links Colors'
    );
    if (frames.length > 0 && !linksColorsFrame) {
      linksColorsFrame = frames[0];
    }
  });
  
  if (linksColorsFrame) {
    console.log(`[EXPORT LINKS] Found Links Colors Frame, parsing from layout...`);
    const result = await exportLinksColorsFromLayout(linksColorsFrame);
    if (result && Object.keys(result).length > 0) {
      return result;
    }
    console.log(`[EXPORT LINKS] Layout export returned empty, trying text styles...`);
  }
  
  // Fallback: Find Link text styles: Link/Default, Link/Hover, Link/Focus
  const linkStyles = textStyles.filter(style => {
    const name = style.name.toLowerCase();
    return name.startsWith('link/') || name.startsWith('links/');
  });
  
  if (linkStyles.length === 0) {
    return null;
  }
  
  // Parse each link style
  for (const style of linkStyles) {
    const name = style.name.toLowerCase();
    
    // Parse state: "link/default" → "default", "link/hover" → "hover", "link/focus" → "focus"
    let state = 'default';
    if (name.includes('/hover')) {
      state = 'hover';
    } else if (name.includes('/focus')) {
      state = 'focus';
    } else if (name.includes('/default')) {
      state = 'default';
    }
    
    // Extract color from description (Text styles don't support fills)
    // Color is stored in description when importing
    const description = style.description || '';
    const properties = parseLinkDescription(description);
    
    // Get color from description
    let color = properties.color || null;
    console.log(`[EXPORT LINKS] Processing style: ${style.name}`);
    console.log(`[EXPORT LINKS] Description: ${description}`);
    console.log(`[EXPORT LINKS] Color from description: ${color}`);
    
    // Fallback: If color not in description, try to find it from text nodes using this style
    if (!color) {
      try {
        // Find all text nodes in all pages that use this style
        const allPages = figma.root.children;
        let textNodes = [];
        
        for (const page of allPages) {
          const nodes = page.findAll(node => {
            return node.type === 'TEXT' && node.textStyleId === style.id;
          });
          textNodes = textNodes.concat(nodes);
        }
        
        console.log(`[EXPORT LINKS] Found ${textNodes.length} text nodes using style ${style.name}`);
        
        if (textNodes.length > 0) {
          const firstTextNode = textNodes[0];
          if (firstTextNode.fills && firstTextNode.fills.length > 0) {
            const fill = firstTextNode.fills[0];
            if (fill.type === 'SOLID') {
              // Check if color is bound to a variable
              if (fill.boundVariables && fill.boundVariables.color) {
                try {
                  const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
                  if (variable) {
                    const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
                    if (collection && collection.modes.length > 0) {
                      const modeId = collection.modes[0].modeId;
                      let value = variable.valuesByMode[modeId];
                      value = resolveVariableValue(value);
                      color = colorToHexString(value);
                      console.log(`[EXPORT LINKS] Found color from text node variable: ${color}`);
                    }
                  }
                } catch (e) {
                  console.warn(`[EXPORT LINKS] Failed to resolve color variable from text node:`, e);
                  if (fill.color) {
                    color = colorToHexString(fill.color);
                    console.log(`[EXPORT LINKS] Fallback to direct color from text node: ${color}`);
                  }
                }
              } else if (fill.color) {
                color = colorToHexString(fill.color);
                console.log(`[EXPORT LINKS] Found color from text node: ${color}`);
              }
            }
          }
        } else {
          console.log(`[EXPORT LINKS] No text nodes found using style ${style.name}, trying to find from layout...`);
          
          // Fallback: Try to find color from layout "Links Colors" section
          // Look for frames named "Default Link", "Hover Link", or "Focus Link"
          let layoutNodeName = null;
          if (state === 'default') {
            layoutNodeName = 'Default Link';
          } else if (state === 'hover') {
            layoutNodeName = 'Hover Link';
          } else if (state === 'focus') {
            layoutNodeName = 'Focus Link';
          }
          
          if (layoutNodeName) {
            // Find frame with this name in all pages
            for (const page of allPages) {
              const layoutFrames = page.findAll(node => {
                return node.type === 'FRAME' && node.name === layoutNodeName;
              });
              
              if (layoutFrames.length > 0) {
                const layoutFrame = layoutFrames[0];
                // Find text node inside this frame
                const textNodesInLayout = layoutFrame.findAll(node => {
                  return node.type === 'TEXT' && node.name === 'Link Text';
                });
                
                if (textNodesInLayout.length > 0) {
                  const layoutTextNode = textNodesInLayout[0];
                  if (layoutTextNode.fills && layoutTextNode.fills.length > 0) {
                    const fill = layoutTextNode.fills[0];
                    if (fill.type === 'SOLID') {
                      // Check if color is bound to a variable
                      if (fill.boundVariables && fill.boundVariables.color) {
                        try {
                          const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
                          if (variable) {
                            const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
                            if (collection && collection.modes.length > 0) {
                              const modeId = collection.modes[0].modeId;
                              let value = variable.valuesByMode[modeId];
                              value = resolveVariableValue(value);
                              color = colorToHexString(value);
                              console.log(`[EXPORT LINKS] Found color from layout variable: ${color}`);
                            }
                          }
                        } catch (e) {
                          console.warn(`[EXPORT LINKS] Failed to resolve color variable from layout:`, e);
                          if (fill.color) {
                            color = colorToHexString(fill.color);
                            console.log(`[EXPORT LINKS] Fallback to direct color from layout: ${color}`);
                          }
                        }
                      } else if (fill.color) {
                        color = colorToHexString(fill.color);
                        console.log(`[EXPORT LINKS] Found color from layout: ${color}`);
                      }
                    }
                  }
                  break; // Found, no need to continue searching
                }
              }
            }
          }
          
          if (!color) {
            console.log(`[EXPORT LINKS] No color found for ${style.name}, color will be missing. Please import JSON again to update description.`);
          }
        }
      } catch (e) {
        console.warn(`[EXPORT LINKS] Error finding color from text nodes:`, e);
      }
    }
    
    if (state === 'default') {
      // Default properties
      if (color) {
        linksColors.color = color;
      }
      if (properties.underline !== undefined) {
        linksColors.underline = properties.underline;
      } else {
        linksColors.underline = 'none';
      }
      if (properties.fontWeight !== undefined) {
        linksColors['font-weight'] = properties.fontWeight;
      } else {
        linksColors['font-weight'] = 'inherit';
      }
    } else if (state === 'hover') {
      // Hover properties
      if (!linksColors.hover) {
        linksColors.hover = {};
      }
      if (color) {
        linksColors.hover.color = color;
      }
      if (properties.underline !== undefined) {
        linksColors.hover.underline = properties.underline;
      }
      if (properties.underlineOffset !== undefined) {
        linksColors.hover['underline-offset'] = properties.underlineOffset;
      }
    } else if (state === 'focus') {
      // Focus properties
      if (!linksColors.focus) {
        linksColors.focus = {};
      }
      if (color) {
        linksColors.focus.color = color;
      }
      if (properties.outlineOffset !== undefined) {
        linksColors.focus['outline-offset'] = properties.outlineOffset;
      }
    }
  }
  
  // Return null if no valid data found
  if (Object.keys(linksColors).length === 0) {
    return null;
  }
  
  return linksColors;
}

async function exportLinksColorsFromLayout(linksColorsFrame) {
  const linksColors = {};
  
  try {
    console.log(`[EXPORT LINKS] Parsing from Links Colors Frame layout`);
    
    // Find "Preview Links" Frame inside Links Colors Frame
    const previewLinksFrame = linksColorsFrame.findAll(node => 
      node.type === 'FRAME' && node.name === 'Preview Links'
    )[0];
    
    if (!previewLinksFrame) {
      console.warn('[EXPORT LINKS] Preview Links Frame not found');
      return null;
    }
    
    console.log(`[EXPORT LINKS] Found Preview Links Frame with ${previewLinksFrame.children.length} children`);
    
    // Parse each link state from Frame children
    for (const child of previewLinksFrame.children) {
      if (child.type !== 'FRAME') continue;
      
      const frameName = child.name;
      console.log(`[EXPORT LINKS] Processing Frame: ${frameName}`);
      
      // Determine state from frame name
      let state = null;
      if (frameName === 'Default Link') {
        state = 'default';
      } else if (frameName === 'Hover Link') {
        state = 'hover';
      } else if (frameName === 'Focus Link') {
        state = 'focus';
      }
      
      if (!state) continue;
      
      // Find text node inside this frame (could be direct child or nested in Focus Outline)
      let textNode = null;
      if (state === 'focus') {
        // For Focus Link, text is inside "Focus Outline" Frame
        const focusOutlineFrame = child.findAll(node => 
          node.type === 'FRAME' && node.name === 'Focus Outline'
        )[0];
        if (focusOutlineFrame) {
          textNode = focusOutlineFrame.findAll(node => 
            node.type === 'TEXT' && node.name === 'Link Text'
          )[0];
        }
      } else {
        // For Default and Hover, text is direct child
        textNode = child.findAll(node => 
          node.type === 'TEXT' && node.name === 'Link Text'
        )[0];
      }
      
      if (!textNode) {
        console.warn(`[EXPORT LINKS] No Link Text found in ${frameName}`);
        continue;
      }
      
      // Extract color from text node fills (can be bound to variable or direct color)
      let color = null;
      if (textNode.fills && textNode.fills.length > 0) {
        const fill = textNode.fills[0];
        if (fill.type === 'SOLID') {
          // Check if color is bound to a variable
          if (fill.boundVariables && fill.boundVariables.color) {
            try {
              const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
              if (variable) {
                const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
                if (collection && collection.modes.length > 0) {
                  const modeId = collection.modes[0].modeId;
                  let value = variable.valuesByMode[modeId];
                  value = resolveVariableValue(value);
                  color = colorToHexString(value);
                  console.log(`[EXPORT LINKS] Found color from variable for ${state}: ${color}`);
                }
              }
            } catch (e) {
              console.warn(`[EXPORT LINKS] Failed to resolve color variable:`, e);
              if (fill.color) {
                color = colorToHexString(fill.color);
                console.log(`[EXPORT LINKS] Fallback to direct color for ${state}: ${color}`);
              }
            }
          } else if (fill.color) {
            color = colorToHexString(fill.color);
            console.log(`[EXPORT LINKS] Found direct color for ${state}: ${color}`);
          }
        }
      }
      
      // Extract underline property from text decoration
      let underline = 'none';
      if (textNode.textDecoration === 'UNDERLINE') {
        underline = 'underline';
        console.log(`[EXPORT LINKS] Found underline for ${state}`);
      }
      
      // Extract underline-offset (for hover state)
      let underlineOffset = null;
      if (state === 'hover' && underline === 'underline') {
        // Default to 0.2em if underline is present
        underlineOffset = '0.2em';
      }
      
      // Extract outline-offset (for focus state)
      let outlineOffset = null;
      if (state === 'focus') {
        // Find "Focus Outline" Frame inside Focus Link Frame
        const focusOutlineFrame = child.findAll(node => 
          node.type === 'FRAME' && node.name === 'Focus Outline'
        )[0];
        
        if (focusOutlineFrame) {
          // outline-offset is typically the padding value
          const padding = focusOutlineFrame.paddingLeft || focusOutlineFrame.paddingTop || 0;
          if (padding > 0) {
            outlineOffset = `${padding}px`;
            console.log(`[EXPORT LINKS] Found outline-offset for focus: ${outlineOffset}`);
          } else {
            outlineOffset = '3px'; // Default
          }
        } else {
          outlineOffset = '3px'; // Default
        }
      }
      
      // Build linksColors object
      if (state === 'default') {
        if (color) linksColors.color = color;
        linksColors.underline = underline;
        linksColors['font-weight'] = 'inherit';
      } else if (state === 'hover') {
        if (!linksColors.hover) linksColors.hover = {};
        if (color) linksColors.hover.color = color;
        if (underline === 'underline') {
          linksColors.hover.underline = underline;
          if (underlineOffset) {
            linksColors.hover['underline-offset'] = underlineOffset;
          }
        }
      } else if (state === 'focus') {
        if (!linksColors.focus) linksColors.focus = {};
        if (color) linksColors.focus.color = color;
        if (outlineOffset) {
          linksColors.focus['outline-offset'] = outlineOffset;
        }
      }
    }
    
    // Return null if no valid data found
    if (Object.keys(linksColors).length === 0) {
      console.warn('[EXPORT LINKS] No valid link colors found in layout');
      return null;
    }
    
    console.log(`[EXPORT LINKS] Successfully exported linksColors from layout:`, linksColors);
    return linksColors;
  } catch (error) {
    console.error('[EXPORT LINKS] Error exporting from layout:', error);
    return null;
  }
}

function parseLinkDescription(description) {
  const properties = {};
  
  if (!description) {
    return properties;
  }
  
  // Parse format: "color: #4a9fdc, underline: underline, underline-offset: 0.2em"
  // Or: "outline-offset: 3px"
  // Or: "underline: none, font-weight: inherit"
  
  const pairs = description.split(',').map(p => p.trim());
  
  pairs.forEach(pair => {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = pair.substring(0, colonIndex).trim();
    const value = pair.substring(colonIndex + 1).trim();
    
    if (key === 'color') {
      properties.color = value;
    } else if (key === 'underline') {
      properties.underline = value;
    } else if (key === 'underline-offset') {
      properties.underlineOffset = value;
    } else if (key === 'outline-offset') {
      properties.outlineOffset = value;
    } else if (key === 'font-weight') {
      properties.fontWeight = value;
    }
  });
  
  return properties;
}

function buildStyleObject(style, baseStyle = null, bodyFontFamily = null, styleName = null) {
  const styleObj = {};
  
  // fontSize
  if (style.fontSize !== undefined) {
    styleObj.fontSize = `${style.fontSize}px`;
  } else if (baseStyle && baseStyle.fontSize !== undefined) {
    styleObj.fontSize = `${baseStyle.fontSize}px`;
  }
  
  // lineHeight
  if (style.lineHeight !== undefined) {
    if (typeof style.lineHeight === 'object' && style.lineHeight !== null) {
      // Handle AUTO unit - omit lineHeight if it's AUTO
      if (style.lineHeight.unit === 'AUTO') {
        // Don't include lineHeight if it's AUTO
      } else {
        const unit = style.lineHeight.unit === 'PERCENT' ? '%' : 
                     style.lineHeight.unit === 'PIXELS' ? 'px' : 
                     style.lineHeight.unit || '';
        // Round percentage values to whole numbers (e.g., 110.00000238418579% => 110%)
        const value = unit === '%' ? Math.round(style.lineHeight.value) : style.lineHeight.value;
        styleObj.lineHeight = `${value}${unit}`;
      }
    } else if (typeof style.lineHeight === 'number') {
      styleObj.lineHeight = `${Math.round(style.lineHeight * 100)}%`;
    } else {
      styleObj.lineHeight = style.lineHeight;
    }
  } else if (baseStyle && baseStyle.lineHeight !== undefined) {
    if (typeof baseStyle.lineHeight === 'object' && baseStyle.lineHeight !== null) {
      // Handle AUTO unit - omit lineHeight if it's AUTO
      if (baseStyle.lineHeight.unit === 'AUTO') {
        // Don't include lineHeight if it's AUTO
      } else {
        const unit = baseStyle.lineHeight.unit === 'PERCENT' ? '%' : 
                     baseStyle.lineHeight.unit === 'PIXELS' ? 'px' : 
                     baseStyle.lineHeight.unit || '';
        // Round percentage values to whole numbers (e.g., 110.00000238418579% => 110%)
        const value = unit === '%' ? Math.round(baseStyle.lineHeight.value) : baseStyle.lineHeight.value;
        styleObj.lineHeight = `${value}${unit}`;
      }
    } else if (typeof baseStyle.lineHeight === 'number') {
      styleObj.lineHeight = `${Math.round(baseStyle.lineHeight * 100)}%`;
    } else {
      styleObj.lineHeight = baseStyle.lineHeight;
    }
  }
  
  // fontWeight - export in lowercase format to match JSON (semibold, regular, bold, etc.)
  // Map from Figma font style names (Semibold, Regular, Bold) to lowercase token format
  if (style.fontName && style.fontName.style) {
    // Extract weight from Figma font style name and convert to lowercase token format
    const fontStyleName = style.fontName.style;
    const lowerStyle = fontStyleName.toLowerCase();
    // Check for italic first (before checking weight)
    const isItalic = lowerStyle.includes('italic') || lowerStyle.includes('oblique');
    
    if (lowerStyle.includes('semibold') || lowerStyle.includes('semi-bold') || lowerStyle.includes('semi bold')) {
      styleObj.fontWeight = isItalic ? 'semibold italic' : 'semibold';
    } else if (lowerStyle.includes('bold') && !lowerStyle.includes('semi')) {
      styleObj.fontWeight = isItalic ? 'bold italic' : 'bold';
    } else if (lowerStyle.includes('medium')) {
      styleObj.fontWeight = isItalic ? 'medium italic' : 'medium';
    } else if (lowerStyle.includes('light')) {
      styleObj.fontWeight = isItalic ? 'light italic' : 'light';
    } else if (lowerStyle.includes('regular') || lowerStyle.includes('normal')) {
      styleObj.fontWeight = isItalic ? 'regular italic' : 'regular';
    } else {
      // Fallback: use lowercase version of style name
      styleObj.fontWeight = lowerStyle;
    }
  } else if (style.fontWeight !== undefined) {
    // If fontWeight is a number, convert to token format string
    const weightMap = {
      100: 'thin',
      200: 'extralight',
      300: 'light',
      400: 'regular',
      500: 'medium',
      600: 'semibold',
      700: 'bold',
      800: 'extrabold',
      900: 'black'
    };
    styleObj.fontWeight = weightMap[style.fontWeight] || 'regular';
  } else if (baseStyle && baseStyle.fontName && baseStyle.fontName.style) {
    // Inherit from base style
    const baseStyleName = baseStyle.fontName.style;
    const lowerBaseStyle = baseStyleName.toLowerCase();
    const isItalic = lowerBaseStyle.includes('italic') || lowerBaseStyle.includes('oblique');
    
    if (lowerBaseStyle.includes('semibold') || lowerBaseStyle.includes('semi-bold') || lowerBaseStyle.includes('semi bold')) {
      styleObj.fontWeight = isItalic ? 'semibold italic' : 'semibold';
    } else if (lowerBaseStyle.includes('bold') && !lowerBaseStyle.includes('semi')) {
      styleObj.fontWeight = isItalic ? 'bold italic' : 'bold';
    } else if (lowerBaseStyle.includes('medium')) {
      styleObj.fontWeight = isItalic ? 'medium italic' : 'medium';
    } else if (lowerBaseStyle.includes('light')) {
      styleObj.fontWeight = isItalic ? 'light italic' : 'light';
    } else if (lowerBaseStyle.includes('regular') || lowerBaseStyle.includes('normal')) {
      styleObj.fontWeight = isItalic ? 'regular italic' : 'regular';
    } else if (baseStyle.fontWeight !== undefined) {
      // Convert numeric fontWeight to token format string
      const weightMap = {
        100: 'thin',
        200: 'extralight',
        300: 'light',
        400: 'regular',
        500: 'medium',
        600: 'semibold',
        700: 'bold',
        800: 'extrabold',
        900: 'black'
      };
      styleObj.fontWeight = weightMap[baseStyle.fontWeight] || 'regular';
    }
  }
  
  // fontFamily - always include for body style, otherwise only if different from body fontFamily
  let currentFontFamily = null;
  if (style.fontName && style.fontName.family) {
    currentFontFamily = style.fontName.family;
  } else if (baseStyle && baseStyle.fontName && baseStyle.fontName.family) {
    currentFontFamily = baseStyle.fontName.family;
  }
  
  // Always include fontFamily for body style, otherwise only if different from body fontFamily
  if (currentFontFamily) {
    if (styleName === 'body' || currentFontFamily !== bodyFontFamily) {
    styleObj.fontFamily = currentFontFamily;
    }
  }
  
  // letterSpacing - only include if not 0% or 0px
  if (style.letterSpacing !== undefined) {
    if (typeof style.letterSpacing === 'object' && style.letterSpacing !== null) {
      const unit = style.letterSpacing.unit === 'PERCENT' ? '%' : 
                   style.letterSpacing.unit === 'PIXELS' ? 'px' : 
                   style.letterSpacing.unit || '';
      const value = style.letterSpacing.value;
      // Only include if value is not 0
      if (value !== 0) {
        styleObj.letterSpacing = `${value}${unit}`;
      }
    } else if (typeof style.letterSpacing === 'number') {
      // Only include if value is not 0
      if (style.letterSpacing !== 0) {
        styleObj.letterSpacing = `${style.letterSpacing}px`;
      }
    } else {
      // Check if string value is "0%" or "0px" or "0"
      const strValue = String(style.letterSpacing).trim();
      if (strValue !== '0%' && strValue !== '0px' && strValue !== '0') {
        styleObj.letterSpacing = style.letterSpacing;
      }
    }
  } else if (baseStyle && baseStyle.letterSpacing !== undefined) {
    if (typeof baseStyle.letterSpacing === 'object' && baseStyle.letterSpacing !== null) {
      const unit = baseStyle.letterSpacing.unit === 'PERCENT' ? '%' : 
                   baseStyle.letterSpacing.unit === 'PIXELS' ? 'px' : 
                   baseStyle.letterSpacing.unit || '';
      const value = baseStyle.letterSpacing.value;
      // Only include if value is not 0
      if (value !== 0) {
        styleObj.letterSpacing = `${value}${unit}`;
      }
    } else if (typeof baseStyle.letterSpacing === 'number') {
      // Only include if value is not 0
      if (baseStyle.letterSpacing !== 0) {
        styleObj.letterSpacing = `${baseStyle.letterSpacing}px`;
      }
    } else {
      // Check if string value is "0%" or "0px" or "0"
      const strValue = String(baseStyle.letterSpacing).trim();
      if (strValue !== '0%' && strValue !== '0px' && strValue !== '0') {
        styleObj.letterSpacing = baseStyle.letterSpacing;
      }
    }
  }
  
  // color
  // Text styles don't have fills directly, need to find from text nodes using this style
  if (style.fills && style.fills.length > 0) {
    const fill = style.fills[0];
    if (fill.type === 'SOLID') {
      // Check if color is bound to a variable
      if (fill.boundVariables && fill.boundVariables.color) {
        try {
          const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
          if (variable) {
            const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
            if (collection && collection.modes.length > 0) {
              const modeId = collection.modes[0].modeId;
              let value = variable.valuesByMode[modeId];
              value = resolveVariableValue(value);
              styleObj.color = colorToHexString(value);
            }
          }
        } catch (e) {
          console.warn(`Could not resolve color variable:`, e);
          if (fill.color) {
      styleObj.color = colorToHexString(fill.color);
          }
        }
      } else if (fill.color) {
        styleObj.color = colorToHexString(fill.color);
      }
    }
  } else if (baseStyle && baseStyle.fills && baseStyle.fills.length > 0) {
    const fill = baseStyle.fills[0];
    if (fill.type === 'SOLID') {
      // Check if color is bound to a variable
      if (fill.boundVariables && fill.boundVariables.color) {
        try {
          const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
          if (variable) {
            const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
            if (collection && collection.modes.length > 0) {
              const modeId = collection.modes[0].modeId;
              let value = variable.valuesByMode[modeId];
              value = resolveVariableValue(value);
              styleObj.color = colorToHexString(value);
            }
          }
        } catch (e) {
          console.warn(`Could not resolve color variable:`, e);
          if (fill.color) {
      styleObj.color = colorToHexString(fill.color);
          }
        }
      } else if (fill.color) {
        styleObj.color = colorToHexString(fill.color);
      }
    }
  } else if (style.id) {
    // For all styles, try to find color from text nodes using this style
    try {
      const allPages = figma.root.children;
      let textNodes = [];
      
      for (const page of allPages) {
        const nodes = page.findAll(node => {
          return node.type === 'TEXT' && node.textStyleId === style.id;
        });
        textNodes = textNodes.concat(nodes);
      }
      
      if (textNodes.length > 0) {
        const firstTextNode = textNodes[0];
        if (firstTextNode.fills && firstTextNode.fills.length > 0) {
          const fill = firstTextNode.fills[0];
          if (fill.type === 'SOLID') {
            // Check if color is bound to a variable
            if (fill.boundVariables && fill.boundVariables.color) {
              try {
                const variable = figma.variables.getVariableById(fill.boundVariables.color.id);
                if (variable) {
                  const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
                  if (collection && collection.modes.length > 0) {
                    const modeId = collection.modes[0].modeId;
                    let value = variable.valuesByMode[modeId];
                    value = resolveVariableValue(value);
                    styleObj.color = colorToHexString(value);
                  }
                }
              } catch (e) {
                console.warn(`Could not resolve color variable from text node:`, e);
                if (fill.color) {
                  styleObj.color = colorToHexString(fill.color);
                }
              }
            } else if (fill.color) {
              styleObj.color = colorToHexString(fill.color);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Could not extract color from style ${styleName}:`, e);
    }
  }
  
  return styleObj;
}

function exportSpacingTokens(numberVariables, projectName) {
  const spacingData = {};
  
  // Filter spacing variables by collection name
  const spacingVars = numberVariables.filter(v => {
    const collectionName = getCollectionName(v.variableCollectionId).toLowerCase();
    return collectionName.includes('spacing');
  });
  
  // Group variables by collection to handle modes
  const collectionMap = new Map();
  
  spacingVars.forEach(variable => {
    const collectionId = variable.variableCollectionId;
    if (!collectionMap.has(collectionId)) {
      const collection = figma.variables.getVariableCollectionById(collectionId);
      collectionMap.set(collectionId, {
        collection: collection,
        variables: []
      });
    }
    collectionMap.get(collectionId).variables.push(variable);
  });
  
  // Process each collection
  collectionMap.forEach((collectionData, collectionId) => {
    const collection = collectionData.collection;
    const variables = collectionData.variables;
    
    // Get mode mapping (Mobile, Tablet, Desktop)
    const modeMap = {};
    collection.modes.forEach(mode => {
      const modeName = mode.name.toLowerCase();
      if (modeName === 'mobile') {
        modeMap.mobile = mode.modeId;
      } else if (modeName === 'tablet') {
        modeMap.tablet = mode.modeId;
      } else if (modeName === 'desktop') {
        modeMap.desktop = mode.modeId;
      }
    });
    
    // Process each variable in this collection
    variables.forEach(variable => {
      const name = variable.name;
      
      // Remove collection prefix if exists: "Spacing - Final/" → ""
      let cleanName = name.replace(/^Spacing\s*-\s*[^/]+\//, '');
      cleanName = cleanName.replace(/^Spacing\s*\/?/i, '');
      
      // Parse: could be "1", "1/desktop", etc.
      const parts = cleanName.split('/').filter(p => p);
      const key = parts[0];
      
      // If variable name has breakpoint (e.g., "1/desktop"), use that
      if (parts.length >= 2) {
        const breakpoint = parts[1].toLowerCase();
        if (breakpoint === 'mobile' || breakpoint === 'tablet' || breakpoint === 'desktop') {
          const modeId = modeMap[breakpoint] || Object.keys(variable.valuesByMode)[0];
          let value = variable.valuesByMode[modeId];
          value = resolveVariableValue(value);
          
          if (!spacingData[key]) {
            spacingData[key] = {};
          }
          spacingData[key][breakpoint] = {
            value: value === 0 ? "0" : `${value}px`
          };
          return;
        }
      }
      
      // Otherwise, get values from all modes
      if (!spacingData[key]) {
        spacingData[key] = {};
      }
      
      // Get value from each mode
      if (modeMap.mobile && variable.valuesByMode[modeMap.mobile] !== undefined) {
        let value = variable.valuesByMode[modeMap.mobile];
        value = resolveVariableValue(value);
        spacingData[key].mobile = {
          value: value === 0 ? "0" : `${value}px`
        };
      }
      
      if (modeMap.tablet && variable.valuesByMode[modeMap.tablet] !== undefined) {
        let value = variable.valuesByMode[modeMap.tablet];
        value = resolveVariableValue(value);
        spacingData[key].tablet = {
          value: value === 0 ? "0" : `${value}px`
        };
      }
      
      if (modeMap.desktop && variable.valuesByMode[modeMap.desktop] !== undefined) {
        let value = variable.valuesByMode[modeMap.desktop];
        value = resolveVariableValue(value);
        spacingData[key].desktop = {
          value: value === 0 ? "0" : `${value}px`
        };
      }
      
      // If no modes found, try to get from first available mode
      if (Object.keys(spacingData[key]).length === 0) {
        const modeId = Object.keys(variable.valuesByMode)[0];
        let value = variable.valuesByMode[modeId];
        value = resolveVariableValue(value);
        spacingData[key].mobile = {
          value: value === 0 ? "0" : `${value}px`
        };
      }
    });
  });
  
  // Reorder to match format: desktop, tablet, mobile
  Object.keys(spacingData).forEach(key => {
    const ordered = {};
    
    if (spacingData[key].desktop) {
      ordered.desktop = spacingData[key].desktop;
    }
    if (spacingData[key].tablet) {
      ordered.tablet = spacingData[key].tablet;
    }
    if (spacingData[key].mobile) {
      ordered.mobile = spacingData[key].mobile;
    }
    
    spacingData[key] = ordered;
  });
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "spacing",
    "$project": projectName,
    "spacing": spacingData
  };
}

function exportShadowTokens(effectStyles, projectName) {
  const shadowData = {};
  
  // Filter shadow effect styles (all effect styles should have effects)
  const shadowStyles = effectStyles.filter(style => {
    if (!style.effects || style.effects.length === 0) return false;
    return style.effects.some(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW');
  });
  
  shadowStyles.forEach(style => {
    // Parse name like "Shadow/sm", "shadow - prefix/sm", "shadow/xs", or just "sm"
    let cleanName = style.name;
    
    // Remove prefix patterns: "shadow - prefix/" or "Shadow/"
    cleanName = cleanName.replace(/^shadow\s*-\s*[^/]+\//i, '');
    cleanName = cleanName.replace(/^Shadow\s*\/?/i, '');
    
    // Use the cleaned name as key (lowercase)
    const key = cleanName.toLowerCase().trim();
    
    // Skip if key is empty
    if (!key) return;
    
    // Convert effects to CSS shadow string
    const shadowValue = effectsToShadowString(style.effects);
    
    shadowData[key] = {
      value: shadowValue,
      description: style.description || ""
    };
  });
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "shadow",
    "$project": projectName,
    "shadow": shadowData
  };
}

function exportBorderTokens(numberVariables, projectName) {
  const borderData = {
    radius: {},
    width: {}
  };
  
  // Filter border variables
  const borderVars = numberVariables.filter(v => {
    const name = v.name.toLowerCase();
    return name.includes('border') || 
           name.includes('radius') ||
           (v.variableCollectionId && getCollectionName(v.variableCollectionId).toLowerCase().includes('border'));
  });
  
  borderVars.forEach(variable => {
    const name = variable.name;
    
    // Parse: "Border Radius/sm" → { type: "radius", key: "sm" }
    let cleanName = name.replace(/^Border\s+/i, '');
    const parts = cleanName.split('/').filter(p => p);
    
    let type, key;
    if (parts.length >= 2) {
      type = parts[0].toLowerCase().includes('radius') ? 'radius' : 'width';
      key = parts[1];
    } else if (cleanName.toLowerCase().includes('radius')) {
      type = 'radius';
      key = parts[0] || cleanName.replace(/radius/i, '').trim();
    } else {
      type = 'width';
      key = parts[0] || cleanName.replace(/width/i, '').trim();
    }
    
    // Get value from first mode
    const modeId = Object.keys(variable.valuesByMode)[0];
    let value = variable.valuesByMode[modeId];
    value = resolveVariableValue(value);
    
    // Convert to appropriate unit
    const valueStr = formatBorderValue(value);
    
    if (type === 'radius') {
      borderData.radius[key] = {
        value: valueStr,
        description: variable.description || ""
      };
    } else if (type === 'width') {
      borderData.width[key] = {
        value: valueStr,
        description: variable.description || ""
      };
    }
  });
  
  // Add DEFAULT for width if not exists
  if (Object.keys(borderData.width).length > 0 && !borderData.width.DEFAULT) {
    borderData.width.DEFAULT = "1px";
  }
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "border",
    "$project": projectName,
    "border": borderData
  };
}

function exportBreakpointTokens(numberVariables, projectName) {
  const breakpointData = {};
  const containerData = {};
  
  // Valid breakpoint keys only
  const validBreakpointKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  // Filter breakpoint variables - look for collection name "Breakpoint" or variable name patterns
  const breakpointVars = numberVariables.filter(v => {
    const collectionName = getCollectionName(v.variableCollectionId).toLowerCase();
    const varName = v.name.toLowerCase();
    
    // Check if in Breakpoint collection
    if (collectionName.includes('breakpoint')) {
      // Extract the key from variable name (e.g., "xs", "xs/value", "xs/max")
      const parts = varName.split('/').filter(p => p);
      const key = parts[0];
      
      // Only include if it's a valid breakpoint key (exclude "radius" and other non-breakpoint keys)
      if (validBreakpointKeys.includes(key)) {
      return true;
      }
      
      // Also check if variable name matches a valid breakpoint key directly
      if (validBreakpointKeys.includes(varName)) {
        return true;
      }
      
      return false;
    }
    
    // Check if variable name suggests breakpoint (xs, sm, md, lg, xl, 2xl)
    if (validBreakpointKeys.some(key => varName === key || varName.startsWith(key + '/'))) {
      return true;
    }
    
    return false;
  });
  
  breakpointVars.forEach(variable => {
    const name = variable.name;
    const collectionName = getCollectionName(variable.variableCollectionId).toLowerCase();
    
    // Get value
    const modeId = Object.keys(variable.valuesByMode)[0];
    let value = variable.valuesByMode[modeId];
    value = resolveVariableValue(value);
    
    // Determine if it's container or breakpoint
    // Container collection has "container" in name, breakpoint collection has "breakpoint" in name
    const isContainer = collectionName.includes('container') && !collectionName.includes('breakpoint');
    const target = isContainer ? containerData : breakpointData;
    
    // Parse variable name - could be:
    // - "xs", "sm", "md", etc. (simple name)
    // - "Breakpoint/xs/value" or "Breakpoint/xs/max" (with prefix)
    // - "xs/value" or "xs/max" (with property)
    let cleanName = name;
    
    // Remove collection prefix if exists
    cleanName = cleanName.replace(/^Breakpoint\s*-\s*[^/]+\//i, '');
    cleanName = cleanName.replace(/^Breakpoint\s*\/?/i, '');
    cleanName = cleanName.replace(/^Container\s*-\s*[^/]+\//i, '');
    cleanName = cleanName.replace(/^Container\s*\/?/i, '');
    
    const parts = cleanName.split('/').filter(p => p);
    
    if (parts.length >= 2) {
      // Format: "xs/value" or "xs/max"
      const breakpointKey = parts[0];
      const property = parts[1];
      
      if (!target[breakpointKey]) {
        target[breakpointKey] = {};
      }
      
      if (property === 'value' || property === 'max') {
        // Handle "0" value specially
        if (property === 'max' && (value === null || value === undefined || value === 'none' || (typeof value === 'string' && value.toLowerCase() === 'none'))) {
          target[breakpointKey][property] = "none";
        } else {
        target[breakpointKey][property] = value === 0 ? "0" : `${value}px`;
        }
      } else {
        target[breakpointKey].value = value === 0 ? "0" : `${value}px`;
      }
      
      if (variable.description) {
        target[breakpointKey].description = variable.description;
      }
    } else if (parts.length === 1) {
      // Simple format: just "xs", "sm", etc.
      const breakpointKey = parts[0];
      
      if (!target[breakpointKey]) {
        target[breakpointKey] = {};
      }
      
      // If it's a breakpoint (not container), set as value
      if (!isContainer) {
        target[breakpointKey].value = value === 0 ? "0" : `${value}px`;
      } else {
        // For container, handle percentage values
        if (typeof value === 'number' && value <= 1 && value > 0) {
          // Likely a percentage stored as decimal (e.g., 1.0 = 100%)
          target[breakpointKey].value = `${value * 100}%`;
        } else if (typeof value === 'number') {
          target[breakpointKey].value = value === 0 ? "0" : `${value}px`;
        } else {
          target[breakpointKey].value = value;
        }
      }
      
      if (variable.description) {
        target[breakpointKey].description = variable.description;
      }
    }
  });
  
  // Only ensure breakpoints have value if missing (don't auto-calculate max)
  // Max should only be exported if it exists as a variable
  const breakpointKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  breakpointKeys.forEach(key => {
    if (breakpointData[key]) {
      if (!breakpointData[key].value) {
        // Try to infer from other breakpoints
        const prevKey = breakpointKeys[breakpointKeys.indexOf(key) - 1];
        if (prevKey && breakpointData[prevKey] && breakpointData[prevKey].value) {
          const prevValue = parseInt(breakpointData[prevKey].value) || 0;
          breakpointData[key].value = `${prevValue + 1}px`;
        } else {
          breakpointData[key].value = key === 'xs' ? "0" : "480px";
        }
      }
      
      // For 2xl, if max is not set and it's the last breakpoint, set to "none"
      if (key === '2xl' && !breakpointData[key].max) {
        breakpointData[key].max = "none";
      }
      
      // Don't auto-calculate max for other breakpoints - only export if it exists as a variable
      // This ensures exported file matches imported file structure
    }
  });
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "breakpoint",
    "$project": projectName,
    "breakpoint": breakpointData,
    "container": containerData
  };
}

function exportButtonTokens(projectName) {
  console.log('[EXPORT BUTTON] Starting button export...');
  
  try {
    // Find "Buttons" Frame (layout) - search in all pages
    let buttonsFrame = null;
    let textLinksFrame = null;
    
    // Search in all pages
    figma.root.children.forEach(page => {
      const buttonsFrames = page.findAll(node => 
        node.type === 'FRAME' && node.name === 'Buttons'
      );
      const textLinksFrames = page.findAll(node => 
        node.type === 'FRAME' && node.name === 'Text Links'
      );
      if (buttonsFrames.length > 0 && !buttonsFrame) {
        buttonsFrame = buttonsFrames[0];
      }
      if (textLinksFrames.length > 0 && !textLinksFrame) {
        textLinksFrame = textLinksFrames[0];
      }
    });
    
    console.log(`[EXPORT BUTTON] Found Buttons Frame: ${!!buttonsFrame}`);
    console.log(`[EXPORT BUTTON] Found Text Links Frame: ${!!textLinksFrame}`);
    
    const result = {
      "$schema": "https://gravity-flex.dev/schemas/tokens.json",
      "$type": "button",
      "$project": projectName,
      "config": {
        "examples": {
          "defaultText": "Button",
          "textLinkText": "Text link"
        },
        "icons": {
          "default": "arrow--right"
        }
      }
    };
    
    // Export from Buttons layout Frame
    if (buttonsFrame) {
      try {
        console.log(`[EXPORT BUTTON] Processing Buttons Frame`);
        result.button = exportButtonLayout(buttonsFrame);
        console.log(`[EXPORT BUTTON] Button export result:`, JSON.stringify(result.button, null, 2).substring(0, 500));
      } catch (error) {
        console.error('[EXPORT BUTTON] Error exporting Buttons Frame:', error);
        result.button = {};
      }
    } else {
      result.button = {};
    }
    
    // Export from Text Links layout Frame
    if (textLinksFrame) {
      try {
        console.log(`[EXPORT BUTTON] Processing Text Links Frame`);
        result.textLink = exportTextLinkLayout(textLinksFrame);
        console.log(`[EXPORT BUTTON] Text Link export result:`, JSON.stringify(result.textLink, null, 2).substring(0, 500));
      } catch (error) {
        console.error('[EXPORT BUTTON] Error exporting Text Links Frame:', error);
        result.textLink = {};
      }
    } else {
      result.textLink = {};
    }
    
    console.log('[EXPORT BUTTON] Export completed');
    return result;
  } catch (error) {
    console.error('[EXPORT BUTTON] Fatal error:', error);
    figma.ui.postMessage({ 
      type: 'status', 
      message: `Error exporting buttons: ${error.message}`, 
      error: true 
    });
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "button",
    "$project": projectName,
      "config": {
        "examples": {
          "defaultText": "Button",
          "textLinkText": "Text link"
        },
        "icons": {
          "default": "arrow--right"
        }
      },
      "button": {},
      "textLink": {}
    };
  }
}

function exportButtonLayout(buttonsFrame) {
  try {
    console.log(`[EXPORT BUTTON] exportButtonLayout called for Frame: ${buttonsFrame.name}`);
    console.log(`[EXPORT BUTTON] Buttons Frame children count: ${buttonsFrame.children.length}`);
    
    // First, try to find COMPONENT_SET (new format) - search recursively in all children
    const componentSets = buttonsFrame.findAll(node => 
      node.type === 'COMPONENT_SET' && (
        node.name === 'Button' || 
        node.name.toLowerCase().includes('button')
      )
    );
    
    console.log(`[EXPORT BUTTON] Found ${componentSets.length} Component Set(s) in Buttons Frame`);
    
    if (componentSets.length > 0) {
      const componentSet = componentSets[0];
      console.log(`[EXPORT BUTTON] Using Component Set: ${componentSet.name}, children: ${componentSet.children.length}`);
      
      const result = exportButtonComponentSet(componentSet);
      console.log(`[EXPORT BUTTON] Component Set export result keys:`, Object.keys(result));
      
      // Check if result is empty
      if (!result || Object.keys(result).length === 0) {
        console.warn('[EXPORT BUTTON] Component Set export returned empty result, trying Button Grid format...');
      } else {
        return result;
      }
    }
    
    console.log(`[EXPORT BUTTON] No Component Set found or empty result, trying Button Grid format...`);
    
    // Fallback: Find "Button Grid" Frame inside Buttons Frame (old format)
    const buttonGrid = buttonsFrame.findAll(node => 
      node.type === 'FRAME' && node.name === 'Button Grid'
    )[0];
    
    if (!buttonGrid) {
      console.warn('[EXPORT BUTTON] Neither Component Set nor Button Grid found in Buttons Frame');
      return {};
    }
    
    console.log(`[EXPORT BUTTON] Found Button Grid with ${buttonGrid.children.length} rows`);
    
    // Collect all button instances from rows
    const buttonInstances = [];
    const typeValues = new Set();
    const colorValues = new Set();
    const sizeValues = new Set();
    const stateValues = new Set();
    
    // Skip header row (first child)
    for (let i = 1; i < buttonGrid.children.length; i++) {
      const row = buttonGrid.children[i];
      if (row.type !== 'FRAME') continue;
      
      // Parse row name: "fill - primary - large" → type: "fill", color: "primary", size: "large"
      const rowNameParts = row.name.toLowerCase().split(' - ').filter(p => p);
      if (rowNameParts.length < 3) continue;
      
      const type = rowNameParts[0]; // "fill" or "outline"
      const color = rowNameParts[1]; // "primary", "secondary", etc.
      const size = rowNameParts[2]; // "large" or "small"
      
      typeValues.add(type);
      colorValues.add(color);
      sizeValues.add(size);
      
      // Find button instances in this row (skip first child which is label)
      for (let j = 1; j < row.children.length; j++) {
        const cell = row.children[j];
        if (cell.type !== 'FRAME') continue;
        
        // Find button instance inside cell - could be INSTANCE or FRAME
        // Look for frames with names like "Fill Primary Large Default", "Fill Primary Large Hover", etc.
        let buttonInstance = null;
        
        // First try to find INSTANCE
        const instances = cell.findAll(node => node.type === 'INSTANCE');
        if (instances.length > 0) {
          buttonInstance = instances[0];
        } else {
          // Try to find FRAME with button-like name (contains type, color, size, state)
          const frames = cell.findAll(node => 
            node.type === 'FRAME' && node.name
          );
          for (const frame of frames) {
            const frameName = frame.name.toLowerCase();
            // Check if frame name contains the expected pattern
            if (frameName.includes(type) && frameName.includes(color) && frameName.includes(size)) {
              buttonInstance = frame;
              break;
            }
          }
          
          // Fallback: find any frame that might be a button
          if (!buttonInstance && frames.length > 0) {
            buttonInstance = frames[0];
          }
        }
        
        if (!buttonInstance) continue;
        
        // Parse button name: "Fill Primary Large Default" → state: "default"
        const buttonName = buttonInstance.name.toLowerCase();
        let state = 'default';
        if (buttonName.includes('hover')) {
          state = 'hover';
        } else if (buttonName.includes('disable')) {
          state = 'disabled';
        }
        
        stateValues.add(state);
        
        buttonInstances.push({
          instance: buttonInstance,
          type,
          color,
          size,
          state
        });
      }
    }
    
    console.log(`[EXPORT BUTTON] Found ${buttonInstances.length} button instances`);
    console.log(`[EXPORT BUTTON] Variants - Type: ${Array.from(typeValues)}, Color: ${Array.from(colorValues)}, Size: ${Array.from(sizeValues)}, State: ${Array.from(stateValues)}`);
    
    if (buttonInstances.length === 0) {
      return {};
    }
    
    // Extract base properties from first button instance
    const firstButton = buttonInstances[0].instance;
    const base = extractButtonBasePropertiesFromInstance(firstButton, buttonInstances);
    
    // Extract sizes
    const sizes = {};
    sizeValues.forEach(size => {
      const sampleButton = buttonInstances.find(b => b.size === size);
      if (sampleButton) {
        const instance = sampleButton.instance;
        sizes[size] = {
          padding: {
            x: instance.paddingLeft || instance.paddingRight || 0,
            y: instance.paddingTop || instance.paddingBottom || 0
          }
        };
      }
    });
    
    // Extract styles
    const styles = {
      fill: {},
      outline: {}
    };
    
    typeValues.forEach(type => {
      styles[type] = {};
      colorValues.forEach(color => {
        styles[type][color] = {};
        stateValues.forEach(state => {
          const buttonData = buttonInstances.find(b => 
            b.type === type && b.color === color && b.state === state
          );
          
          if (buttonData) {
            styles[type][color][state] = extractButtonStyleProperties(buttonData.instance);
          }
        });
      });
    });
    
    // Extract properties
    const properties = extractButtonPropertiesFromInstance(firstButton);
    
    // Sort variants with custom order for state
    const stateOrder = ['default', 'hover', 'disabled'];
    const sortedStates = Array.from(stateValues).sort((a, b) => {
      const aIndex = stateOrder.indexOf(a);
      const bIndex = stateOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    const variants = {
      state: sortedStates,
      color: Array.from(colorValues).sort(),
      size: Array.from(sizeValues).sort(),
      type: Array.from(typeValues).sort()
    };
    
    const result = {
      variants,
      base,
      sizes,
      styles,
      properties
    };
    
    console.log(`[EXPORT BUTTON] exportButtonLayout completed. Variants: ${JSON.stringify(variants)}, Styles keys: ${Object.keys(styles)}`);
    return result;
  } catch (error) {
    console.error('[EXPORT BUTTON] Error in exportButtonLayout:', error);
    console.error('[EXPORT BUTTON] Stack:', error.stack);
    return {};
  }
}

function exportButtonComponentSet(componentSet) {
  try {
    console.log(`[EXPORT BUTTON] exportButtonComponentSet called for Component Set: ${componentSet.name}`);
    const components = componentSet.children;
    console.log(`[EXPORT BUTTON] Component Set has ${components.length} children`);
    
    if (components.length === 0) {
      console.warn('[EXPORT BUTTON] Component Set has no children');
      return {};
    }
    
    // Log first few component names for debugging
    console.log(`[EXPORT BUTTON] First 3 component names:`, components.slice(0, 3).map(c => c.name));
    
    // Extract variant properties from first component
    const firstComponent = components[0];
    const variantProperties = firstComponent.variantProperties || {};
    console.log(`[EXPORT BUTTON] First component name: ${firstComponent.name}`);
    console.log(`[EXPORT BUTTON] First component variant properties:`, variantProperties);
    
    // Determine variant structure
    const typeValues = new Set();
    const colorValues = new Set();
    const sizeValues = new Set();
    const stateValues = new Set();
    
    components.forEach(comp => {
      let props = comp.variantProperties || {};
      
      // If variantProperties is empty, try to parse from component name
      // Format: "Type=Fill, Color=Primary, Size=Large, State=Default"
      if (!props || Object.keys(props).length === 0) {
        const name = comp.name || '';
        console.log(`[EXPORT BUTTON] Parsing variant from component name: ${name}`);
        const nameParts = name.split(',');
        props = {};
        nameParts.forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          if (key && value) {
            props[key] = value;
          }
        });
        console.log(`[EXPORT BUTTON] Parsed props:`, props);
      }
      
      if (props.Type) typeValues.add(props.Type.toLowerCase());
      if (props.Color) colorValues.add(props.Color.toLowerCase());
      if (props.Size) sizeValues.add(props.Size.toLowerCase());
      if (props.State) {
        // Normalize state name: "Disable" -> "disabled"
        const state = props.State.toLowerCase();
        stateValues.add(state === 'disable' ? 'disabled' : state);
      }
    });
    
    // Check if we found any variants
    if (typeValues.size === 0 && colorValues.size === 0 && sizeValues.size === 0 && stateValues.size === 0) {
      console.warn('[EXPORT BUTTON] No variants found in Component Set - components may not have variant properties or correct naming');
      console.warn('[EXPORT BUTTON] Component names:', components.map(c => c.name).join(', '));
      return {};
    }
    
    console.log(`[EXPORT BUTTON] Variants found - Type: ${Array.from(typeValues)}, Color: ${Array.from(colorValues)}, Size: ${Array.from(sizeValues)}, State: ${Array.from(stateValues)}`);
  
  // Build variants structure
  // Sort variants with custom order for state
  const stateOrder = ['default', 'hover', 'disabled'];
  const sortedStates = Array.from(stateValues).sort((a, b) => {
    const aIndex = stateOrder.indexOf(a);
    const bIndex = stateOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  const variants = {
    state: sortedStates,
    color: Array.from(colorValues).sort(),
    size: Array.from(sizeValues).sort(),
    type: Array.from(typeValues).sort()
  };
  
  // Extract base properties - merge from all size variants
  const base = extractButtonBaseProperties(firstComponent);
  
  // Merge font sizes and line heights from all size variants
  sizeValues.forEach(size => {
    const sampleComponent = components.find(c => {
      let props = c.variantProperties || {};
      
      // If variantProperties is empty, try to parse from component name
      if (!props || Object.keys(props).length === 0) {
        const name = c.name || '';
        const nameParts = name.split(',');
        props = {};
        nameParts.forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          if (key && value) {
            props[key] = value;
          }
        });
      }
      
      return props.Size && props.Size.toLowerCase() === size;
    });
    
    if (sampleComponent) {
      const textNode = sampleComponent.findAll(node => node.type === 'TEXT' && node.name === 'text')[0];
      if (textNode) {
        base.font.size[size] = textNode.fontSize || 16;
        const lineHeight = typeof textNode.lineHeight === 'object' 
          ? textNode.lineHeight.value 
          : textNode.lineHeight || 24;
        base.font.lineHeight[size] = lineHeight;
      }
      
      // Extract minHeight for this size
      if (sampleComponent.minHeight) {
        base.minHeight[size] = sampleComponent.minHeight;
      }
    }
  });
  
  // Extract sizes
  const sizes = {};
  sizeValues.forEach(size => {
    const sampleComponent = components.find(c => {
      let props = c.variantProperties || {};
      
      // If variantProperties is empty, try to parse from component name
      if (!props || Object.keys(props).length === 0) {
        const name = c.name || '';
        const nameParts = name.split(',');
        props = {};
        nameParts.forEach(part => {
          const [key, value] = part.split('=').map(s => s.trim());
          if (key && value) {
            props[key] = value;
          }
        });
      }
      
      return props.Size && props.Size.toLowerCase() === size;
    });
    if (sampleComponent) {
      sizes[size] = {
        padding: {
          x: sampleComponent.paddingLeft || sampleComponent.paddingRight || 0,
          y: sampleComponent.paddingTop || sampleComponent.paddingBottom || 0
        }
      };
    }
  });
  
  // Extract styles
  const styles = {
    fill: {},
    outline: {}
  };
  
  typeValues.forEach(type => {
    styles[type] = {};
    colorValues.forEach(color => {
      styles[type][color] = {};
      stateValues.forEach(state => {
        const component = components.find(c => {
          let props = c.variantProperties || {};
          
          // If variantProperties is empty, try to parse from component name
          if (!props || Object.keys(props).length === 0) {
            const name = c.name || '';
            const nameParts = name.split(',');
            props = {};
            nameParts.forEach(part => {
              const [key, value] = part.split('=').map(s => s.trim());
              if (key && value) {
                props[key] = value;
              }
            });
          }
          
          const compType = props.Type && props.Type.toLowerCase();
          const compColor = props.Color && props.Color.toLowerCase();
          const compState = props.State && props.State.toLowerCase();
          // Handle both "disabled" and "Disable" state names
          const normalizedState = compState === 'disable' ? 'disabled' : compState;
          const normalizedTargetState = state === 'disable' ? 'disabled' : state;
          return compType === type &&
                 compColor === color &&
                 normalizedState === normalizedTargetState;
        });
        
        if (component) {
          // Normalize state name for JSON output
          const normalizedState = state === 'disable' ? 'disabled' : state;
          styles[type][color][normalizedState] = extractButtonStyleProperties(component);
        }
      });
    });
  });
  
    // Extract properties - must use componentSet, not component variant
    const properties = extractButtonProperties(componentSet);
    
    const result = {
      variants,
      base,
      sizes,
      styles,
      properties
    };
    
    console.log(`[EXPORT BUTTON] exportButtonComponentSet completed. Variants: ${JSON.stringify(variants)}, Styles keys: ${Object.keys(styles)}`);
    return result;
  } catch (error) {
    console.error('[EXPORT BUTTON] Error in exportButtonComponentSet:', error);
    console.error('[EXPORT BUTTON] Stack:', error.stack);
    return {};
  }
}

function exportTextLinkLayout(textLinksFrame) {
  try {
    console.log(`[EXPORT TEXT LINK] exportTextLinkLayout called for Frame: ${textLinksFrame.name}`);
    
    // First, try to find COMPONENT_SET in Text Link Grid (new format)
    let textLinkGrid = textLinksFrame.findAll(node => 
      node.type === 'FRAME' && node.name === 'Text Link Grid'
    )[0];
    
    if (!textLinkGrid) {
      textLinkGrid = textLinksFrame;
    }
    
    // Look for COMPONENT_SET inside Text Link Grid
    const componentSets = textLinkGrid.findAll(node => 
      node.type === 'COMPONENT_SET'
    );
    console.log(`[EXPORT TEXT LINK] Found ${componentSets.length} COMPONENT_SET(s) in Text Link Grid`);
    
    if (componentSets.length > 0) {
      const componentSet = componentSets[0];
      console.log(`[EXPORT TEXT LINK] Found COMPONENT_SET: ${componentSet.name}, parsing from component set...`);
      const result = exportTextLinkComponentSet(componentSet);
      console.log(`[EXPORT TEXT LINK] Component set export result keys:`, Object.keys(result));
      console.log(`[EXPORT TEXT LINK] Component set export result:`, JSON.stringify(result, null, 2).substring(0, 1000));
      if (result && Object.keys(result).length > 0) {
        console.log(`[EXPORT TEXT LINK] Returning component set result`);
        return result;
      }
      console.log(`[EXPORT TEXT LINK] Component set export returned empty, trying grid format...`);
    } else {
      console.log(`[EXPORT TEXT LINK] No COMPONENT_SET found, will try grid format...`);
    }
    
    console.log(`[EXPORT TEXT LINK] Found Text Link Grid with ${textLinkGrid.children.length} rows`);
    
    // Collect all text link instances from rows
    const textLinkInstances = [];
    const colorValues = new Set();
    const stateValues = new Set();
    
    // Skip header row (first child)
    for (let i = 1; i < textLinkGrid.children.length; i++) {
      const row = textLinkGrid.children[i];
      if (row.type !== 'FRAME') continue;
      
      // Parse row name or find color from first cell
      // Row might be named by color or we need to extract from instances
      let color = 'primary'; // default
      
      // Find text link instances in this row (skip first child which is label)
      for (let j = 1; j < row.children.length; j++) {
        const cell = row.children[j];
        if (cell.type !== 'FRAME') continue;
        
        // Find text link instance inside cell
        let textLinkInstance = cell.findAll(node => node.type === 'INSTANCE')[0];
        if (!textLinkInstance) {
          textLinkInstance = cell.findAll(node => 
            node.type === 'TEXT' || (node.type === 'FRAME' && node.children && node.children.length > 0)
          )[0];
        }
        
        if (!textLinkInstance) continue;
        
        // Parse instance name or cell name: "Primary Default", "Primary Hover", etc.
        const name = (textLinkInstance.name || cell.name || '').toLowerCase();
        let state = 'default';
        if (name.includes('hover')) {
          state = 'hover';
        } else if (name.includes('disable')) {
          state = 'disabled';
        }
        
        // Extract color from name
        if (name.includes('primary')) color = 'primary';
        else if (name.includes('secondary')) color = 'secondary';
        else if (name.includes('dark')) color = 'dark';
        else if (name.includes('light')) color = 'light';
        
        stateValues.add(state);
        colorValues.add(color);
        
        textLinkInstances.push({
          instance: textLinkInstance,
          color,
          state
        });
      }
    }
    
    console.log(`[EXPORT BUTTON] Found ${textLinkInstances.length} text link instances`);
    
    if (textLinkInstances.length === 0) {
      return {};
    }
    
    // Extract base properties from first text link instance
    const firstTextLink = textLinkInstances[0].instance;
    const base = extractTextLinkBasePropertiesFromInstance(firstTextLink);
    
    // Extract styles
    const styles = {};
    colorValues.forEach(color => {
      styles[color] = {};
      stateValues.forEach(state => {
        const textLinkData = textLinkInstances.find(t => 
          t.color === color && t.state === state
        );
        
        if (textLinkData) {
          styles[color][state] = extractTextLinkStylePropertiesFromInstance(textLinkData.instance);
        }
      });
    });
    
    // Extract properties
    const properties = extractTextLinkPropertiesFromInstance(firstTextLink);
    
    // Sort variants with custom order for state
    const stateOrder = ['default', 'hover', 'disabled'];
    const sortedStates = Array.from(stateValues).sort((a, b) => {
      const aIndex = stateOrder.indexOf(a);
      const bIndex = stateOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    const variants = {
      state: sortedStates,
      color: Array.from(colorValues).sort()
    };
    
    return {
      variants,
      base,
      styles,
      properties
    };
  } catch (error) {
    console.error('[EXPORT BUTTON] Error in exportTextLinkLayout:', error);
    return {};
  }
}

function extractTextLinkBasePropertiesFromInstance(instance) {
  const textNode = instance.type === 'TEXT' 
    ? instance 
    : instance.findAll(node => node.type === 'TEXT')[0];
  
  const fontSize = (textNode && textNode.fontSize) || 16;
  let lineHeight = 24; // default
  
  if (textNode && textNode.lineHeight) {
    if (typeof textNode.lineHeight === 'object') {
      // Figma lineHeight object: { unit: 'PERCENT', value: 150 }
      if (textNode.lineHeight.unit === 'PERCENT') {
        // Convert percentage to pixel: fontSize * (percentage / 100)
        lineHeight = Math.round(fontSize * (textNode.lineHeight.value / 100));
        console.log(`[EXPORT TEXT LINK] Converted lineHeight from ${textNode.lineHeight.value}% to ${lineHeight}px (fontSize: ${fontSize}px)`);
      } else if (textNode.lineHeight.unit === 'PIXELS') {
        lineHeight = textNode.lineHeight.value;
      } else {
        // AUTO or other units
        lineHeight = textNode.lineHeight.value;
      }
    } else {
      // Direct numeric value (assumed to be pixels)
      lineHeight = textNode.lineHeight;
    }
  }
  
  const base = {
    font: {
      family: (textNode && textNode.fontName && textNode.fontName.family) || 'Inter',
      weight: mapFigmaWeightToToken((textNode && textNode.fontName && textNode.fontName.style) || 'Regular'),
      size: fontSize,
      lineHeight: lineHeight
    },
    gap: (instance.itemSpacing !== undefined) ? instance.itemSpacing : 4
  };
  
  return base;
}

function extractTextLinkStylePropertiesFromInstance(instance) {
  const style = {};
  
  const textNode = instance.type === 'TEXT' 
    ? instance 
    : instance.findAll(node => node.type === 'TEXT')[0];
    
  if (textNode && textNode.fills && textNode.fills.length > 0) {
    const textFill = textNode.fills[0];
    if (textFill.boundVariables && textFill.boundVariables.color) {
      const variable = figma.variables.getVariableById(textFill.boundVariables.color.id);
      if (variable) {
        style.text = variableNameToTokenPath(variable.name);
      }
    } else if (textFill.type === 'SOLID' && textFill.color) {
      style.text = findColorTokenByValue(textFill.color);
    }
  }
  
  // Extract opacity and round to 1 decimal place
  if (instance.opacity !== undefined && instance.opacity < 1) {
    style.opacity = Math.round(instance.opacity * 10) / 10;
  }
  
  return style;
}

function extractTextLinkPropertiesFromInstance(instance) {
  const properties = {};
  
  // Check if it's an instance with component properties
  if (instance.type === 'INSTANCE' && instance.mainComponent) {
    const mainComponent = instance.mainComponent;
    if (mainComponent.componentPropertyDefinitions) {
      const props = mainComponent.componentPropertyDefinitions;
      
      if (props.text) {
        properties.text = {
          type: 'text',
          default: props.text.defaultValue || '{config.examples.textLinkText}'
        };
      }
      
      if (props.icon) {
        properties.icon = {
          type: 'text',
          optional: true,
          default: props.icon.defaultValue || ''
        };
      }
    }
  } else {
    // Default properties
    properties.text = { type: 'text', default: '{config.examples.textLinkText}' };
    properties.icon = { type: 'text', optional: true };
  }
  
  return properties;
}

function exportTextLinkComponentSet(componentSet) {
  console.log(`[EXPORT TEXT LINK] ===== Starting exportTextLinkComponentSet =====`);
  console.log(`[EXPORT TEXT LINK] Component Set name: ${componentSet.name}`);
  console.log(`[EXPORT TEXT LINK] Component Set type: ${componentSet.type}`);
  
  const components = componentSet.children || [];
  console.log(`[EXPORT TEXT LINK] Found ${components.length} components`);
  
  if (components.length === 0) {
    console.warn('[EXPORT TEXT LINK] No components found in component set');
    return {};
  }
  
  // Extract variant properties
  const colorValues = new Set();
  const stateValues = new Set();
  const componentMap = new Map(); // Map: "color-state" -> component
  
  components.forEach((comp, index) => {
    console.log(`[EXPORT TEXT LINK] --- Processing component ${index + 1}/${components.length} ---`);
    console.log(`[EXPORT TEXT LINK] Component name: ${comp.name}`);
    console.log(`[EXPORT TEXT LINK] Component type: ${comp.type}`);
    
    let props = comp.variantProperties || {};
    console.log(`[EXPORT TEXT LINK] variantProperties:`, JSON.stringify(props));
    
    let color = 'primary';
    let state = 'default';
    
    // Check if variantProperties has "Property 1" key (common in Figma component sets)
    if (props['Property 1']) {
      const propertyValue = props['Property 1'];
      console.log(`[EXPORT TEXT LINK] Found Property 1 value: ${propertyValue}`);
      
      // Parse format: "Primary Default", "Primary Hover", "Secondary Disable", etc.
      const parts = propertyValue.split(/\s+/);
      if (parts.length >= 2) {
        const colorName = parts[0].toLowerCase();
        const stateName = parts.slice(1).join(' ').toLowerCase();
        
        console.log(`[EXPORT TEXT LINK] Parsed from Property 1 - colorName: ${colorName}, stateName: ${stateName}`);
        
        // Map color names
        if (colorName === 'primary') color = 'primary';
        else if (colorName === 'secondary') color = 'secondary';
        else if (colorName === 'dark') color = 'dark';
        else if (colorName === 'light') color = 'light';
        
        // Map state names
        if (stateName === 'hover') state = 'hover';
        else if (stateName === 'disable' || stateName === 'disabled') state = 'disabled';
        else state = 'default';
      }
    } else if (Object.keys(props).length === 0) {
      // If variantProperties is empty, parse from name
      const name = comp.name || '';
      console.log(`[EXPORT TEXT LINK] variantProperties empty, parsing from name: ${name}`);
      
      // Parse format: "Property 1=Primary Default" or "Property 1=Primary Hover"
      const match = name.match(/Property\s+1\s*=\s*(\w+)\s+(\w+)/i);
      if (match) {
        const colorName = match[1].toLowerCase();
        const stateName = match[2].toLowerCase();
        console.log(`[EXPORT TEXT LINK] Parsed from name - colorName: ${colorName}, stateName: ${stateName}`);
        
        // Map color names
        if (colorName === 'primary') color = 'primary';
        else if (colorName === 'secondary') color = 'secondary';
        else if (colorName === 'dark') color = 'dark';
        else if (colorName === 'light') color = 'light';
        
        // Map state names
        if (stateName === 'hover') state = 'hover';
        else if (stateName === 'disable' || stateName === 'disabled') state = 'disabled';
        else state = 'default';
      } else {
        console.warn(`[EXPORT TEXT LINK] Could not parse variant from name: ${name}`);
      }
    } else {
      // Fallback: try to extract from variant properties directly
      color = props.color || props.Color || 'primary';
      state = props.state || props.State || 'default';
    }
    
    // Normalize color and state
    color = color.toLowerCase();
    state = state.toLowerCase();
    if (state === 'disable') state = 'disabled';
    
    console.log(`[EXPORT TEXT LINK] Final variant - color: ${color}, state: ${state}`);
    
    colorValues.add(color);
    stateValues.add(state);
    
    const key = `${color}-${state}`;
    componentMap.set(key, comp);
    
    console.log(`[EXPORT TEXT LINK] Added to map: ${key}`);
  });
  
  console.log(`[EXPORT TEXT LINK] Total colors found: ${colorValues.size}`, Array.from(colorValues));
  console.log(`[EXPORT TEXT LINK] Total states found: ${stateValues.size}`, Array.from(stateValues));
  console.log(`[EXPORT TEXT LINK] Component map size: ${componentMap.size}`);
  
  if (componentMap.size === 0) {
    console.warn('[EXPORT TEXT LINK] No valid variants found');
    return {};
  }
  
  // Extract base properties from first component
  const firstComponent = Array.from(componentMap.values())[0];
  const base = extractTextLinkBaseProperties(firstComponent);
  
  // Extract styles
  const styles = {};
  colorValues.forEach(color => {
    console.log(`[EXPORT TEXT LINK] Processing styles for color: ${color}`);
    styles[color] = {};
    stateValues.forEach(state => {
      const key = `${color}-${state}`;
      const component = componentMap.get(key);
      if (component) {
        console.log(`[EXPORT TEXT LINK] Extracting style for ${key}`);
        const style = extractTextLinkStyleProperties(component);
        console.log(`[EXPORT TEXT LINK] Extracted style for ${key}:`, JSON.stringify(style));
        styles[color][state] = style;
      } else {
        console.warn(`[EXPORT TEXT LINK] No component found for ${key}`);
      }
    });
  });
  
  console.log(`[EXPORT TEXT LINK] Final styles object:`, JSON.stringify(styles, null, 2));
  
  // Extract properties from component set
  const properties = extractTextLinkPropertiesFromComponentSet(componentSet);
  
  // Sort variants with custom order for state
  const stateOrder = ['default', 'hover', 'disabled'];
  const sortedStates = Array.from(stateValues).sort((a, b) => {
    const aIndex = stateOrder.indexOf(a);
    const bIndex = stateOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  const variants = {
    state: sortedStates,
    color: Array.from(colorValues).sort()
  };
  
  const result = {
    variants,
    base,
    styles,
    properties
  };
  
  console.log(`[EXPORT TEXT LINK] ===== Final result =====`);
  console.log(`[EXPORT TEXT LINK] Variants:`, JSON.stringify(variants, null, 2));
  console.log(`[EXPORT TEXT LINK] Base:`, JSON.stringify(base, null, 2));
  console.log(`[EXPORT TEXT LINK] Styles:`, JSON.stringify(styles, null, 2));
  console.log(`[EXPORT TEXT LINK] Properties:`, JSON.stringify(properties, null, 2));
  console.log(`[EXPORT TEXT LINK] Full result:`, JSON.stringify(result, null, 2));
  console.log(`[EXPORT TEXT LINK] ===== End exportTextLinkComponentSet =====`);
  return result;
}

function extractTextLinkPropertiesFromComponentSet(componentSet) {
  const properties = {};
  
  try {
    if (!componentSet.componentPropertyDefinitions) {
      console.log('[EXPORT TEXT LINK] No componentPropertyDefinitions found, using defaults');
      // Return default properties
      return {
        text: {
          type: 'text',
          default: '{config.examples.textLinkText}'
        },
        icon: {
          type: 'text',
          optional: true
        }
      };
    }
    
    const propDefs = componentSet.componentPropertyDefinitions;
    
    // Check for text property
    if (propDefs.text) {
      const textProp = propDefs.text;
      properties.text = {
        type: textProp.type === 'TEXT' ? 'text' : 'text',
        default: textProp.defaultValue || '{config.examples.textLinkText}'
      };
    } else {
      // Default text property
      properties.text = {
        type: 'text',
        default: '{config.examples.textLinkText}'
      };
    }
    
    // Check for icon property
    if (propDefs.icon) {
      const iconProp = propDefs.icon;
      properties.icon = {
        type: iconProp.type === 'TEXT' ? 'text' : 'text',
        optional: true
      };
    } else {
      // Default icon property (optional)
      properties.icon = {
        type: 'text',
        optional: true
      };
    }
    
    console.log(`[EXPORT TEXT LINK] Extracted properties:`, properties);
  } catch (error) {
    console.warn('[EXPORT TEXT LINK] Error extracting properties:', error);
    // Return defaults on error
    return {
      text: {
        type: 'text',
        default: '{config.examples.textLinkText}'
      },
      icon: {
        type: 'text',
        optional: true
      }
    };
  }
  
  return properties;
}

function extractButtonBasePropertiesFromInstance(instance, buttonInstances) {
  // Find text node to extract font properties
  const textNode = instance.findAll(node => node.type === 'TEXT' && (node.name === 'text' || node.name === 'Text'))[0];
  
  const base = {
    layout: {
      direction: instance.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
      align: instance.primaryAxisAlignItems === 'CENTER' ? 'center' : 
             instance.primaryAxisAlignItems === 'MIN' ? 'start' : 'end',
      gap: instance.itemSpacing || 8
    },
    borderRadius: instance.cornerRadius || 4,
    borderWidth: instance.strokeWeight || 1,
    minHeight: {},
    font: {
      family: "Inter",
      weight: 600,
      size: {},
      lineHeight: {}
    }
  };
  
  // Extract font properties from text node
  if (textNode) {
    const fontFamily = (textNode.fontName && textNode.fontName.family) || 'Inter';
    const fontStyle = (textNode.fontName && textNode.fontName.style) || 'Regular';
    const fontWeight = mapFigmaWeightToToken(fontStyle);
    
    base.font.family = fontFamily;
    base.font.weight = fontWeight;
    
    // Extract size-specific font sizes and line heights from all button instances
    const sizeValues = new Set(buttonInstances.map(b => b.size));
    sizeValues.forEach(size => {
      const sampleButton = buttonInstances.find(b => b.size === size);
      if (sampleButton) {
        const sampleTextNode = sampleButton.instance.findAll(node => 
          node.type === 'TEXT' && (node.name === 'text' || node.name === 'Text')
        )[0];
        if (sampleTextNode) {
          base.font.size[size] = sampleTextNode.fontSize || 16;
          const lineHeight = typeof sampleTextNode.lineHeight === 'object' 
            ? sampleTextNode.lineHeight.value 
            : sampleTextNode.lineHeight || 24;
          base.font.lineHeight[size] = lineHeight;
        }
        
        // Extract minHeight for this size
        if (sampleButton.instance.minHeight) {
          base.minHeight[size] = sampleButton.instance.minHeight;
        }
      }
    });
  }
  
  return base;
}

function extractButtonBaseProperties(component) {
  // Find text node to extract font properties
  const textNode = component.findAll(node => node.type === 'TEXT' && node.name === 'text')[0];
  
  // Get variant properties to determine size
  const variantProps = component.variantProperties || {};
  const size = (variantProps.Size && variantProps.Size.toLowerCase()) || 'large';
  
  const base = {
    layout: {
      direction: component.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
      align: component.primaryAxisAlignItems === 'CENTER' ? 'center' : 
             component.primaryAxisAlignItems === 'MIN' ? 'start' : 'end',
      gap: component.itemSpacing || 8
    },
    borderRadius: component.cornerRadius || 4,
    borderWidth: component.strokeWeight || 1,
    minHeight: {}
  };
  
  // Extract minHeight for this size
  if (component.minHeight) {
    base.minHeight[size] = component.minHeight;
  }
  
  // Extract font properties from text node
  if (textNode) {
    const fontFamily = (textNode.fontName && textNode.fontName.family) || 'Inter';
    const fontWeight = mapFigmaWeightToToken((textNode.fontName && textNode.fontName.style) || 'Regular');
    
    base.font = {
      family: fontFamily,
      weight: fontWeight,
      size: {},
      lineHeight: {}
    };
    
    // Extract size-specific font size and line height
    const fontSize = textNode.fontSize || 16;
    const lineHeight = typeof textNode.lineHeight === 'object' 
      ? textNode.lineHeight.value 
      : textNode.lineHeight || 24;
    
    base.font.size[size] = fontSize;
    base.font.lineHeight[size] = lineHeight;
  } else {
    base.font = {
      family: "Inter",
      weight: 600,
      size: { large: 16, small: 14 },
      lineHeight: { large: 24, small: 20 }
    };
  }
  
  return base;
}

function extractTextLinkBaseProperties(component) {
  const textNode = component.findAll(node => node.type === 'TEXT')[0];
  
  const fontSize = (textNode && textNode.fontSize) || 16;
  let lineHeight = 24; // default
  
  if (textNode && textNode.lineHeight) {
    if (typeof textNode.lineHeight === 'object') {
      // Figma lineHeight object: { unit: 'PERCENT', value: 150 }
      if (textNode.lineHeight.unit === 'PERCENT') {
        // Convert percentage to pixel: fontSize * (percentage / 100)
        lineHeight = Math.round(fontSize * (textNode.lineHeight.value / 100));
        console.log(`[EXPORT TEXT LINK] Converted lineHeight from ${textNode.lineHeight.value}% to ${lineHeight}px (fontSize: ${fontSize}px)`);
      } else if (textNode.lineHeight.unit === 'PIXELS') {
        lineHeight = textNode.lineHeight.value;
      } else {
        // AUTO or other units
        lineHeight = textNode.lineHeight.value;
      }
    } else {
      // Direct numeric value (assumed to be pixels)
      lineHeight = textNode.lineHeight;
    }
  }
  
  const base = {
    font: {
      family: (textNode && textNode.fontName && textNode.fontName.family) || 'Inter',
      weight: mapFigmaWeightToToken((textNode && textNode.fontName && textNode.fontName.style) || 'Regular'),
      size: fontSize,
      lineHeight: lineHeight
    },
    gap: component.itemSpacing || 4
  };
  
  console.log(`[EXPORT TEXT LINK] Base properties - fontSize: ${fontSize}px, lineHeight: ${lineHeight}px`);
  
  return base;
}

function extractButtonStyleProperties(component) {
  const style = {};
  
  // Extract text color - try multiple ways to find text node
  let textNode = component.findAll(node => node.type === 'TEXT' && node.name === 'text')[0];
  if (!textNode) {
    textNode = component.findAll(node => node.type === 'TEXT' && node.name === 'Text')[0];
  }
  if (!textNode) {
    textNode = component.findAll(node => node.type === 'TEXT')[0];
  }
  
  if (textNode && textNode.fills && textNode.fills.length > 0) {
    const textFill = textNode.fills[0];
    if (textFill.boundVariables && textFill.boundVariables.color) {
      const variable = figma.variables.getVariableById(textFill.boundVariables.color.id);
      if (variable) {
        style.text = variableNameToTokenPath(variable.name);
      }
    } else if (textFill.type === 'SOLID' && textFill.color) {
      // Fallback: try to find matching variable by color
      style.text = findColorTokenByValue(textFill.color);
    }
  }
  
  // Extract background color
  if (component.fills && component.fills.length > 0) {
    const bgFill = component.fills[0];
    if (bgFill.boundVariables && bgFill.boundVariables.color) {
      const variable = figma.variables.getVariableById(bgFill.boundVariables.color.id);
      if (variable) {
        const varName = variable.name;
        if (varName.toLowerCase().includes('transparent')) {
          style.background = 'color.transparent';
        } else {
          style.background = variableNameToTokenPath(varName);
        }
      }
    } else if (bgFill.type === 'SOLID' && bgFill.color) {
      // Check if transparent
      if (bgFill.opacity === 0 || (bgFill.color.r === 0 && bgFill.color.g === 0 && bgFill.color.b === 0 && bgFill.color.a === 0)) {
        style.background = 'color.transparent';
      } else {
        style.background = findColorTokenByValue(bgFill.color);
      }
    } else {
      style.background = 'color.transparent';
    }
  } else {
    style.background = 'color.transparent';
  }
  
  // Extract border color
  if (component.strokes && component.strokes.length > 0) {
    const borderStroke = component.strokes[0];
    if (borderStroke.boundVariables && borderStroke.boundVariables.color) {
      const variable = figma.variables.getVariableById(borderStroke.boundVariables.color.id);
      if (variable) {
        style.border = variableNameToTokenPath(variable.name);
      }
    } else if (borderStroke.type === 'SOLID' && borderStroke.color) {
      style.border = findColorTokenByValue(borderStroke.color);
    }
  } else {
    // Use background color for border if no stroke
    style.border = style.background;
  }
  
  // If text color not found, infer from background/border
  if (!style.text) {
    // For outline buttons, text usually matches border color
    if (style.border && style.border !== 'color.transparent' && style.background === 'color.transparent') {
      style.text = style.border;
    } 
    // For fill buttons with colored background, text is usually white
    else if (style.background && style.background !== 'color.transparent' && style.background !== 'color.white') {
      style.text = 'color.white';
    }
    // For fill buttons with white/light background, text is usually black
    else if (style.background === 'color.white') {
      style.text = 'color.black';
    }
    // For fill buttons with black/dark background, text is usually white
    else if (style.background === 'color.black') {
      style.text = 'color.white';
    }
    // Default fallback
    else {
      style.text = 'color.black';
    }
  }
  
  // Extract opacity and round to 1 decimal place
  if (component.opacity !== undefined && component.opacity < 1) {
    style.opacity = Math.round(component.opacity * 10) / 10;
  }
  
  return style;
}

function extractTextLinkStyleProperties(component) {
  console.log(`[EXPORT TEXT LINK STYLE] Extracting style properties from component: ${component.name}`);
  const style = {};
  
  const textNode = component.findAll(node => node.type === 'TEXT')[0];
  console.log(`[EXPORT TEXT LINK STYLE] Found text node:`, textNode ? textNode.name : 'none');
  
  if (textNode && textNode.fills && textNode.fills.length > 0) {
    const textFill = textNode.fills[0];
    console.log(`[EXPORT TEXT LINK STYLE] Text fill type: ${textFill.type}`);
    console.log(`[EXPORT TEXT LINK STYLE] Text fill boundVariables:`, textFill.boundVariables);
    
    if (textFill.boundVariables && textFill.boundVariables.color) {
      try {
        const variable = figma.variables.getVariableById(textFill.boundVariables.color.id);
        if (variable) {
          console.log(`[EXPORT TEXT LINK STYLE] Found variable: ${variable.name}`);
          const tokenPath = variableNameToTokenPath(variable.name);
          style.text = tokenPath;
          console.log(`[EXPORT TEXT LINK STYLE] Mapped to token path: ${tokenPath}`);
        } else {
          console.warn(`[EXPORT TEXT LINK STYLE] Variable not found for ID: ${textFill.boundVariables.color.id}`);
        }
      } catch (e) {
        console.error(`[EXPORT TEXT LINK STYLE] Error resolving variable:`, e);
      }
    } else if (textFill.type === 'SOLID' && textFill.color) {
      console.log(`[EXPORT TEXT LINK STYLE] Direct color:`, textFill.color);
      const tokenPath = findColorTokenByValue(textFill.color);
      style.text = tokenPath;
      console.log(`[EXPORT TEXT LINK STYLE] Mapped to token path: ${tokenPath}`);
    } else {
      console.warn(`[EXPORT TEXT LINK STYLE] No valid color found in text fill`);
    }
  } else {
    console.warn(`[EXPORT TEXT LINK STYLE] No text node or fills found`);
  }
  
  // Extract opacity and round to 1 decimal place
  if (component.opacity !== undefined && component.opacity < 1) {
    style.opacity = Math.round(component.opacity * 10) / 10;
    console.log(`[EXPORT TEXT LINK STYLE] Found opacity: ${style.opacity}`);
  }
  
  console.log(`[EXPORT TEXT LINK STYLE] Final style:`, JSON.stringify(style));
  return style;
}

function extractButtonPropertiesFromInstance(instance) {
  const properties = {};
  
  // Check if it's an instance with component properties
  if (instance.type === 'INSTANCE' && instance.mainComponent) {
    const mainComponent = instance.mainComponent;
    if (mainComponent.componentPropertyDefinitions) {
      const props = mainComponent.componentPropertyDefinitions;
      
      if (props.leftIcon) {
        properties.leftIcon = {
          type: 'boolean',
          default: props.leftIcon.defaultValue || false
        };
      }
      
      if (props.rightIcon) {
        properties.rightIcon = {
          type: 'boolean',
          default: props.rightIcon.defaultValue !== undefined ? props.rightIcon.defaultValue : false
        };
      }
      
      if (props.text) {
        properties.text = {
          type: 'text',
          default: props.text.defaultValue || '{config.examples.defaultText}'
        };
      }
      
      if (props.icon) {
        properties.icon = {
          type: 'text',
          default: props.icon.defaultValue || '{config.icons.default}'
        };
      }
    }
  } else {
    // Default properties if not an instance
    properties.leftIcon = { type: 'boolean', default: false };
    properties.rightIcon = { type: 'boolean', default: false };
    properties.text = { type: 'text', default: '{config.examples.defaultText}' };
    properties.icon = { type: 'text', default: '{config.icons.default}' };
  }
  
  return properties;
}

function extractButtonProperties(component) {
  const properties = {};
  
  // Check component properties
  if (component.componentPropertyDefinitions) {
    const props = component.componentPropertyDefinitions;
    
    if (props.leftIcon) {
      properties.leftIcon = {
        type: props.leftIcon.type === 'BOOLEAN' ? 'boolean' : 'boolean',
        default: props.leftIcon.defaultValue || false
      };
    }
    
    if (props.rightIcon) {
      properties.rightIcon = {
        type: props.rightIcon.type === 'BOOLEAN' ? 'boolean' : 'boolean',
        default: props.rightIcon.defaultValue !== undefined ? props.rightIcon.defaultValue : true
      };
    }
    
    if (props.text) {
      properties.text = {
        type: 'text',
        default: props.text.defaultValue || '{config.examples.defaultText}'
      };
    }
    
    if (props.icon) {
      properties.icon = {
        type: 'text',
        default: props.icon.defaultValue || '{config.icons.default}'
      };
    }
  }
  
  return properties;
}

function extractTextLinkProperties(component) {
  const properties = {};
  
  if (component.componentPropertyDefinitions) {
    const props = component.componentPropertyDefinitions;
    
    if (props.text) {
      properties.text = {
        type: 'text',
        default: props.text.defaultValue || '{config.examples.textLinkText}'
      };
    }
    
    if (props.icon) {
      properties.icon = {
        type: 'text',
        optional: true,
        default: props.icon.defaultValue || ''
      };
    }
  }
  
  return properties;
}

function variableNameToTokenPath(variableName) {
  // Convert variable name like "Primary/300" or "Colors - Project A/Primary/300" to "color.primary.300"
  let cleanName = variableName;
  
  // Remove collection prefix
  cleanName = cleanName.replace(/^Colors\s*-\s*[^/]+\//i, '');
  cleanName = cleanName.replace(/^Colors\s*\/?/i, '');
  
  // Split by / or -
  const parts = cleanName.split(/[/-]/).filter(p => p);
  
  if (parts.length === 0) {
    return `color.${cleanName.toLowerCase()}`;
  }
  
  // Convert to token path format
  const tokenParts = ['color'];
  parts.forEach(part => {
    tokenParts.push(part.toLowerCase());
  });
  
  return tokenParts.join('.');
}

function findColorTokenByValue(color) {
  // Try to find matching color variable by RGB value
  const colorVariables = figma.variables.getLocalVariables('COLOR');
  
  for (const variable of colorVariables) {
    const modeId = Object.keys(variable.valuesByMode)[0];
    let value = variable.valuesByMode[modeId];
    value = resolveVariableValue(value);
    
    if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      const tolerance = 0.01;
      if (Math.abs(value.r - color.r) < tolerance &&
          Math.abs(value.g - color.g) < tolerance &&
          Math.abs(value.b - color.b) < tolerance) {
        return variableNameToTokenPath(variable.name);
      }
    }
  }
  
  // Fallback: return a generic color reference
  return 'color.black';
}

function mapFigmaWeightToToken(figmaWeight) {
  // Map Figma font weight names to token format (numeric)
  // Same logic as typography export but returns numeric value instead of string
  if (!figmaWeight) return 400;
  
  const weightMap = {
    'thin': 100,
    'extralight': 200,
    'light': 300,
    'regular': 400,
    'normal': 400,
    'medium': 500,
    'semibold': 600,
    'semi-bold': 600,
    'semi bold': 600,
    'bold': 700,
    'extrabold': 800,
    'extra-bold': 800,
    'extra bold': 800,
    'black': 900
  };
  
  // Normalize: remove spaces, hyphens, underscores and convert to lowercase
  // Handles: "Semi Bold", "Semi-Bold", "Semi_Bold", "Semibold", "SEMIBOLD", etc.
  const normalized = String(figmaWeight).replace(/[\s\-_]+/g, '').toLowerCase();
  
  // Try direct match first
  if (weightMap[normalized]) {
    return weightMap[normalized];
  }
  
  // Try partial match (e.g., "Semibold Italic" → "semibold")
  for (const [token, value] of Object.entries(weightMap)) {
    if (normalized.includes(token)) {
      return value;
    }
  }
  
  // Try to extract number from style name (e.g., "Weight 600")
  const numberMatch = figmaWeight.match(/(\d+)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1]);
    // Validate number is a valid weight (100-900)
    if (num >= 100 && num <= 900) {
      return num;
    }
  }
  
  // Default fallback
  return 400;
}

// Helper functions for export

function resolveVariableValue(value) {
  // If value is a variable reference, resolve it
  if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
    try {
      const variable = figma.variables.getVariableById(value.id);
      if (variable) {
        const modeId = Object.keys(variable.valuesByMode)[0];
        return resolveVariableValue(variable.valuesByMode[modeId]);
      }
    } catch (e) {
      console.warn('Could not resolve variable reference:', e);
    }
  }
  return value;
}

function colorToHexString(colorValue) {
  if (!colorValue) return '#000000';
  
  if (typeof colorValue === 'string') {
    return colorValue;
  }
  
  // Handle RGB object (can be {r, g, b} or {type: 'RGB', r, g, b})
  if (colorValue && typeof colorValue === 'object' && 'r' in colorValue && 'g' in colorValue && 'b' in colorValue) {
    const r = Math.round(colorValue.r * 255);
    const g = Math.round(colorValue.g * 255);
    const b = Math.round(colorValue.b * 255);
    const a = colorValue.a !== undefined ? colorValue.a : 1;
    
    // Handle transparent
    if (a === 0) {
      return 'transparent';
    }
    
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return rgbToHex(colorValue.r, colorValue.g, colorValue.b);
  }
  
  // Handle VARIABLE_ALIAS - should be resolved before calling this
  if (colorValue && typeof colorValue === 'object' && colorValue.type === 'VARIABLE_ALIAS') {
    console.warn('Variable alias not resolved before colorToHexString');
    return '#000000';
  }
  
  // Handle other color types if needed
  return '#000000';
}

function parseTextStyleName(name) {
  // "Mobile/H1" → { breakpoint: "mobile", styleName: "h1", breakpoints: ["mobile"] }
  // "Desktop/Body" → { breakpoint: "desktop", styleName: "body", breakpoints: ["desktop"] }
  // "Body" → { breakpoint: "mobile", styleName: "body", breakpoints: ["mobile"] }
  // Handle nested: "Body/Mobile/Tablet" → { breakpoint: "tablet", styleName: "body", breakpoints: ["mobile", "tablet"] }
  // Handle format: "Desktop - Project/body" → { breakpoint: "desktop", styleName: "body", breakpoints: ["desktop"] }
  // Handle format: "Tablet - Project/body" → { breakpoint: "tablet", styleName: "body", breakpoints: ["tablet"] }
  // Handle format: "Ag Desktop - Project/body" → { breakpoint: "desktop", styleName: "body", breakpoints: ["desktop"] }
  
  const parts = name.split('/').filter(p => p);
  const breakpointKeywords = ['mobile', 'tablet', 'desktop'];
  
  let styleName = '';
  const breakpoints = [];
  
  // Check if breakpoint is in the first part (before /)
  // Format: "Desktop - Project/body" or "Tablet - Project/body" or "Ag Desktop - Project/body"
  if (parts.length > 0) {
    const firstPart = parts[0].toLowerCase();
    for (const keyword of breakpointKeywords) {
      if (firstPart.includes(keyword)) {
        breakpoints.push(keyword);
        break;
      }
    }
  }
  
  // Also check all parts for breakpoint keywords
  parts.forEach(part => {
    const lowerPart = part.toLowerCase();
    if (breakpointKeywords.includes(lowerPart)) {
      if (!breakpoints.includes(lowerPart)) {
        breakpoints.push(lowerPart);
      }
    } else if (!lowerPart.includes('project') && !lowerPart.includes('-') && lowerPart !== 'ag') {
      // Skip "Project", parts with "-" (like "Desktop - Project"), and "Ag" prefix
      // The actual style name is usually the last part
      styleName = part.toLowerCase();
    }
  });
  
  // If we found breakpoint in first part but no styleName yet, use last part
  if (breakpoints.length > 0 && !styleName && parts.length > 1) {
    styleName = parts[parts.length - 1].toLowerCase();
  }
  
  // If still no styleName, try to extract from first part (remove breakpoint and project)
  if (!styleName && parts.length > 0) {
    const firstPart = parts[0].toLowerCase();
    // Remove breakpoint keywords and "project" and "ag"
    let cleaned = firstPart
      .replace(/\b(mobile|tablet|desktop)\b/g, '')
      .replace(/\bproject\b/g, '')
      .replace(/\bag\b/g, '')
      .replace(/[-\s]+/g, ' ')
      .trim();
    if (cleaned) {
      styleName = cleaned;
    }
  }
  
  // Default to mobile if no breakpoint found
  if (breakpoints.length === 0) {
    breakpoints.push('mobile');
  }
  
  // If still no styleName, use the original name (fallback)
  if (!styleName) {
    styleName = name.toLowerCase();
  }
  
  return {
    breakpoint: breakpoints[breakpoints.length - 1],
    styleName: styleName,
    breakpoints: breakpoints
  };
}

function extractWeightFromFontStyle(styleName) {
  // Extract weight from font style name and return in Figma format (e.g., "Bold", "Semibold", "Regular")
  const lowerStyle = styleName.toLowerCase();
  if (lowerStyle.includes('bold') && !lowerStyle.includes('semi')) return 'bold';
  if (lowerStyle.includes('semibold') || lowerStyle.includes('semi-bold') || lowerStyle.includes('semi bold')) return 'semibold';
  if (lowerStyle.includes('medium')) return 'medium';
  if (lowerStyle.includes('light')) return 'light';
  if (lowerStyle.includes('regular') || lowerStyle.includes('normal')) return 'regular';
  if (lowerStyle.includes('italic')) {
    // Check if there's a weight before italic
    if (lowerStyle.includes('bold')) return 'bold italic';
    if (lowerStyle.includes('semibold') || lowerStyle.includes('semi-bold') || lowerStyle.includes('semi bold')) return 'semibold italic';
    return 'regular italic';
  }
  return null;
}

function formatBorderValue(value) {
  // Convert px to rem for small values (matching original format)
  const remMap = {
    2: '0.125rem',
    4: '0.25rem',
    6: '0.375rem',
    8: '0.5rem',
    12: '0.75rem',
    16: '1rem',
    24: '1.5rem',
    32: '2rem'
  };
  
  if (remMap[value]) {
    return remMap[value];
  }
  
  // Special cases
  if (value === 0) return '0';
  if (value === 9999) return '9999px';
  
  return `${value}px`;
}

function effectsToShadowString(effects) {
  // Convert Figma effects to CSS shadow string
  const shadows = [];
  
  effects.forEach(effect => {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const x = effect.offset.x;
      const y = effect.offset.y;
      const blur = effect.radius;
      const spread = effect.spread || 0;
      
      // Convert color
      const color = effect.color;
      const r = Math.round(color.r * 255);
      const g = Math.round(color.g * 255);
      const b = Math.round(color.b * 255);
      const a = color.a !== undefined ? color.a : 1;
      
      // Format: "x y blur spread rgb(r g b / a)"
      const shadowStr = `${x}px ${y}px ${blur}px ${spread}px rgb(${r} ${g} ${b} / ${a})`;
      shadows.push(shadowStr);
    }
  });
  
  return shadows.join(', ') || '0 0 #0000';
}

function getCollectionName(collectionId) {
  try {
    const collection = figma.variables.getVariableCollectionById(collectionId);
    return collection ? collection.name : '';
  } catch (e) {
    return '';
  }
}

async function generateFromFigmaVariablesAndStyles() {
  // Get all local variables and styles first
  const localColorVariables = figma.variables.getLocalVariables("COLOR");
  const localPaintStyles = figma.getLocalPaintStyles();
  const localTextStyles = figma.getLocalTextStyles();
  const localNumberVariables = figma.variables.getLocalVariables("FLOAT");

  console.log("Color Variables:", localColorVariables.length);
  console.log("Paint Styles:", localPaintStyles.length);
  console.log("Text Styles:", localTextStyles.length);
  console.log("Number Variables:", localNumberVariables.length);

  // Load all fonts used in text styles
  const fontsToLoad = new Set();
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Regular" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Bold" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Medium" }));

  // Add all fonts from text styles
  localTextStyles.forEach(style => {
    fontsToLoad.add(JSON.stringify({ family: style.fontName.family, style: style.fontName.style }));
  });

  console.log("Loading fonts...", fontsToLoad.size, "unique fonts");

  // Load all fonts with better error handling
  const loadedFonts = new Set();
  for (const fontStr of fontsToLoad) {
    const font = JSON.parse(fontStr);
    const fontKey = `${font.family}:${font.style}`;

    // Skip if already loaded
    if (loadedFonts.has(fontKey)) continue;

    try {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey);
      console.log(`Loaded: ${font.family} ${font.style}`);
    } catch (e) {
      console.warn(`Could not load font: ${font.family} ${font.style}`, e);
      // Try common fallbacks
      const fallbacks = [
        { family: font.family, style: "Regular" },
        { family: font.family, style: "Medium" },
        { family: "Inter", style: "Regular" }
      ];

      let loaded = false;
      for (const fallback of fallbacks) {
        const fallbackKey = `${fallback.family}:${fallback.style}`;
        if (loadedFonts.has(fallbackKey)) {
          loaded = true;
          break;
        }

        try {
          await figma.loadFontAsync(fallback);
          loadedFonts.add(fallbackKey);
          loaded = true;
          console.log(`Loaded fallback: ${fallback.family} ${fallback.style}`);
          break;
        } catch (fallbackError) {
          // Continue to next fallback
        }
      }

      if (!loaded) {
        console.error(`Failed to load font and all fallbacks for: ${font.family} ${font.style}`);
      }
    }
  }

  // Create main frame
  const mainFrame = figma.createFrame();
  mainFrame.name = "Global Style from Figma";
  mainFrame.layoutMode = "HORIZONTAL";
  mainFrame.itemSpacing = 100;
  mainFrame.paddingLeft = 100;
  mainFrame.paddingRight = 100;
  mainFrame.paddingTop = 100;
  mainFrame.paddingBottom = 100;
  mainFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // 1. Create Colors Section from Variables
  if (localColorVariables.length > 0) {
    await createColorsFromVariables(mainFrame, localColorVariables);
  }

  // 1b. Create Colors Section from Paint Styles
  if (localPaintStyles.length > 0) {
    await createColorsFromPaintStyles(mainFrame, localPaintStyles);
  }

  // 2. Create Typography Section from Text Styles
  if (localTextStyles.length > 0) {
    await createTypographyFromStyles(mainFrame, localTextStyles);
  }

  // 3. Create Spacing Section from Number Variables
  if (localNumberVariables.length > 0) {
    await createSpacingFromVariables(mainFrame, localNumberVariables);
  }

  // Resize main frame
  mainFrame.primaryAxisSizingMode = "AUTO";
  mainFrame.counterAxisSizingMode = "AUTO";

  figma.viewport.scrollAndZoomIntoView([mainFrame]);
}

async function createColorsFromVariables(parent, colorVariables) {
  // Group variables by their collection first
  // Each collection becomes a separate page/section (e.g., "Colors - MG", "Colors - MG2")
  const collectionMap = new Map(); // collectionId -> { name, variables }

  for (const variable of colorVariables) {
    const collectionId = variable.variableCollectionId;
    if (!collectionMap.has(collectionId)) {
      const collection = figma.variables.getVariableCollectionById(collectionId);
      collectionMap.set(collectionId, {
        name: collection ? collection.name : 'Colors',
        variables: []
      });
    }
    collectionMap.get(collectionId).variables.push(variable);
  }

  // Sort collections: "Colors" first, then alphabetically
  const sortedCollections = Array.from(collectionMap.entries()).sort((a, b) => {
    if (a[1].name === 'Colors') return -1;
    if (b[1].name === 'Colors') return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  // Create a section for each collection
  for (const [collectionId, collectionData] of sortedCollections) {
    const section = figma.createFrame();
    section.name = collectionData.name;
    section.layoutMode = "VERTICAL";
    section.itemSpacing = 40;
    section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    section.paddingLeft = 40;
    section.paddingRight = 40;
    section.paddingTop = 40;
    section.paddingBottom = 40;
    section.cornerRadius = 8;
    section.counterAxisSizingMode = "FIXED";
    section.resize(1200, 100);

    // Add section title
    const sectionTitle = figma.createText();
    sectionTitle.fontName = { family: "Inter", style: "Regular" };
    sectionTitle.characters = collectionData.name;
    sectionTitle.fontSize = 24;
    section.appendChild(sectionTitle);

    // Group colors within this collection by their group (using '/' separator or first word)
    const groupedColors = {};

    for (const variable of collectionData.variables) {
      let groupName, colorName;
      const fullName = variable.name;

      if (fullName.includes('/')) {
        const parts = fullName.split('/');
        groupName = parts[0] || 'Other';
        colorName = parts.slice(1).join('/') || fullName;
      } else {
        const parts = fullName.split(' ');
        groupName = parts[0] || 'Other';
        colorName = parts.slice(1).join(' ') || fullName;
      }

      // Get the color value from the first mode
      const modes = Object.keys(variable.valuesByMode);
      const firstMode = modes[0];
      const colorValue = variable.valuesByMode[firstMode];

      if (colorValue && typeof colorValue === 'object' && 'r' in colorValue) {
        const hex = rgbToHex(colorValue.r, colorValue.g, colorValue.b);

        if (!groupedColors[groupName]) {
          groupedColors[groupName] = [];
        }

        groupedColors[groupName].push({
          hex: hex,
          name: colorName,
          fullName: fullName,
          variable: variable
        });
      }
    }

    // Define group order - Primary always first, Secondary second
    const groupOrder = ['Primary', 'Secondary', 'Infra', 'Tint', 'Darker Hover State', 'Neutral', 'Other'];

    // Sort groups by predefined order
    const sortedGroups = Object.entries(groupedColors).sort((a, b) => {
      const indexA = groupOrder.indexOf(a[0]);
      const indexB = groupOrder.indexOf(b[0]);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    // Create a frame for each group within this collection
    sortedGroups.forEach(([groupName, colors]) => {
      const sortedColors = colors.slice().sort((a, b) => a.name.localeCompare(b.name));
      const groupFrame = figma.createFrame();
      groupFrame.name = groupName;
      groupFrame.layoutMode = "VERTICAL";
      groupFrame.itemSpacing = 20;
      groupFrame.fills = [];
      groupFrame.primaryAxisSizingMode = "AUTO";
      groupFrame.counterAxisSizingMode = "FIXED";
      groupFrame.resize(1200, 100);

      // Group title
      const title = figma.createText();
      title.fontName = { family: "Inter", style: "Bold" };
      title.characters = groupName;
      title.fontSize = 28;
      groupFrame.appendChild(title);

      // Create rows of swatches (4 per row)
      const swatchesPerRow = 4;
      for (let i = 0; i < sortedColors.length; i += swatchesPerRow) {
        const swatchesRow = figma.createFrame();
        swatchesRow.name = "Swatches Row";
        swatchesRow.layoutMode = "HORIZONTAL";
        swatchesRow.itemSpacing = 20;
        swatchesRow.fills = [];
        swatchesRow.primaryAxisSizingMode = "AUTO";
        swatchesRow.counterAxisSizingMode = "AUTO";

        const rowColors = sortedColors.slice(i, i + swatchesPerRow);
        rowColors.forEach(c => {
          const swatchContainer = figma.createFrame();
          swatchContainer.name = c.name;
          swatchContainer.layoutMode = "VERTICAL";
          swatchContainer.itemSpacing = 16;
          swatchContainer.fills = [];
          swatchContainer.primaryAxisSizingMode = "AUTO";
          swatchContainer.counterAxisSizingMode = "AUTO";

          const rect = figma.createRectangle();
          rect.name = "Swatch";
          rect.resize(240, 240);
          rect.cornerRadius = 8;

          // Bind to variable
          rect.fills = [
            (function() {
              const rgb = hexToRgb(c.hex);
              const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b };
              const paintObj = { type: 'SOLID', color: colorObj };
              if (rgb.a !== undefined && rgb.a !== 1) {
                paintObj.opacity = rgb.a;
              }
              return figma.variables.setBoundVariableForPaint(paintObj, 'color', c.variable);
            })()
          ];

          rect.strokeWeight = 1;
          rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }];

          const nameText = figma.createText();
          nameText.name = "Color Name";
          nameText.fontName = { family: "Inter", style: "Bold" };
          nameText.characters = c.name;
          nameText.fontSize = 24;
          nameText.textAlignHorizontal = "CENTER";
          nameText.resize(240, nameText.height);

          const hexText = figma.createText();
          hexText.name = "Hex Value";
          hexText.fontName = { family: "Inter", style: "Regular" };
          hexText.characters = c.hex;
          hexText.fontSize = 24;
          hexText.textAlignHorizontal = "CENTER";
          hexText.resize(240, hexText.height);

          swatchContainer.appendChild(rect);
          swatchContainer.appendChild(nameText);
          swatchContainer.appendChild(hexText);

          swatchesRow.appendChild(swatchContainer);
        });
        groupFrame.appendChild(swatchesRow);
      }

      section.appendChild(groupFrame);
    });

    parent.appendChild(section);
  }
}

async function createColorsFromPaintStyles(parent, paintStyles) {
  // Group paint styles by their prefix before '/'
  const groupedColors = {};

  for (const style of paintStyles) {
    // Only handle solid color paints
    if (!style.paints || style.paints.length === 0) continue;
    const paint = style.paints[0];
    if (paint.type !== 'SOLID') continue;

    let groupName, colorName;
    const fullName = style.name;

    if (fullName.includes('/')) {
      const parts = fullName.split('/');
      groupName = parts[0] || 'Color Styles';
      colorName = parts.slice(1).join('/') || fullName;
    } else {
      groupName = 'Color Styles';
      colorName = fullName;
    }

    const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);

    if (!groupedColors[groupName]) {
      groupedColors[groupName] = [];
    }

    groupedColors[groupName].push({
      hex: hex,
      name: colorName,
      fullName: fullName,
      style: style,
      opacity: paint.opacity !== undefined ? paint.opacity : 1
    });
  }

  if (Object.keys(groupedColors).length === 0) return;

  // Create main section
  const section = figma.createFrame();
  section.name = "Color Styles";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  // Add section title
  const sectionTitle = figma.createText();
  sectionTitle.fontName = { family: "Inter", style: "Regular" };
  sectionTitle.characters = "Color Styles";
  sectionTitle.fontSize = 24;
  section.appendChild(sectionTitle);

  // Sort groups alphabetically, "Color Styles" first
  const sortedGroups = Object.entries(groupedColors).sort((a, b) => {
    if (a[0] === 'Color Styles') return -1;
    if (b[0] === 'Color Styles') return 1;
    return a[0].localeCompare(b[0]);
  });

  // Create a frame for each group
  sortedGroups.forEach(([groupName, colors]) => {
    const sortedColors = colors.slice().sort((a, b) => a.name.localeCompare(b.name));
    const groupFrame = figma.createFrame();
    groupFrame.name = groupName;
    groupFrame.layoutMode = "VERTICAL";
    groupFrame.itemSpacing = 20;
    groupFrame.fills = [];
    groupFrame.primaryAxisSizingMode = "AUTO";
    groupFrame.counterAxisSizingMode = "FIXED";
    groupFrame.resize(1200, 100);

    // Group title
    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Bold" };
    title.characters = groupName;
    title.fontSize = 28;
    groupFrame.appendChild(title);

    // Create rows of swatches (4 per row)
    const swatchesPerRow = 4;
    for (let i = 0; i < sortedColors.length; i += swatchesPerRow) {
      const swatchesRow = figma.createFrame();
      swatchesRow.name = "Swatches Row";
      swatchesRow.layoutMode = "HORIZONTAL";
      swatchesRow.itemSpacing = 20;
      swatchesRow.fills = [];
      swatchesRow.primaryAxisSizingMode = "AUTO";
      swatchesRow.counterAxisSizingMode = "AUTO";

      const rowColors = sortedColors.slice(i, i + swatchesPerRow);
      rowColors.forEach(c => {
        const swatchContainer = figma.createFrame();
        swatchContainer.name = c.name;
        swatchContainer.layoutMode = "VERTICAL";
        swatchContainer.itemSpacing = 16;
        swatchContainer.fills = [];
        swatchContainer.primaryAxisSizingMode = "AUTO";
        swatchContainer.counterAxisSizingMode = "AUTO";

        const rect = figma.createRectangle();
        rect.name = "Swatch";
        rect.resize(240, 240);
        rect.cornerRadius = 8;

        // Apply paint style
        const rgb = hexToRgb(c.hex);
        const paintObj = { type: 'SOLID', color: { r: rgb.r, g: rgb.g, b: rgb.b } };
        if (c.opacity !== 1) {
          paintObj.opacity = c.opacity;
        }
        rect.fills = [paintObj];
        rect.fillStyleId = c.style.id;

        rect.strokeWeight = 1;
        rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }];

        const nameText = figma.createText();
        nameText.name = "Color Name";
        nameText.fontName = { family: "Inter", style: "Bold" };
        nameText.characters = c.name;
        nameText.fontSize = 24;
        nameText.textAlignHorizontal = "CENTER";
        nameText.resize(240, nameText.height);

        const hexText = figma.createText();
        hexText.name = "Hex Value";
        hexText.fontName = { family: "Inter", style: "Regular" };
        hexText.characters = c.hex;
        hexText.fontSize = 24;
        hexText.textAlignHorizontal = "CENTER";
        hexText.resize(240, hexText.height);

        swatchContainer.appendChild(rect);
        swatchContainer.appendChild(nameText);
        swatchContainer.appendChild(hexText);

        swatchesRow.appendChild(swatchContainer);
      });
      groupFrame.appendChild(swatchesRow);
    }

    section.appendChild(groupFrame);
  });

  parent.appendChild(section);

  // Resize section to fit content
  section.primaryAxisSizingMode = "AUTO";
}

async function createTypographyFromStyles(parent, textStyles) {
  // Group text styles by their full group prefix
  // e.g., "Desktop", "Desktop - MG", "Desktop - MG2", "Mobile", "Mobile - MG", etc.
  // Each group becomes a separate page/section
  const breakpoints = ["Mobile", "Tablet", "Desktop"];
  const groupedStyles = {};

  textStyles.forEach(style => {
    const name = style.name;
    let groupKey = "All"; // Default group for unmatched styles

    for (const breakpoint of breakpoints) {
      // Match pattern: "Breakpoint - PREFIX/" (e.g., "Desktop - MG/H1")
      const prefixMatch = name.match(new RegExp(`^(${breakpoint}\\s*-\\s*[^/]+)/`));
      if (prefixMatch) {
        // Use full prefix as group key: "Desktop - MG"
        groupKey = prefixMatch[1].trim();
        break;
      }

      // Match pattern: "Breakpoint/" (e.g., "Desktop/H1")
      if (name.startsWith(breakpoint + '/')) {
        groupKey = breakpoint;
        break;
      }

      // Match pattern: "Breakpoint " (e.g., "Desktop H1")
      if (name.startsWith(breakpoint + ' ') && !name.includes('/')) {
        groupKey = breakpoint;
        break;
      }
    }

    if (!groupedStyles[groupKey]) {
      groupedStyles[groupKey] = [];
    }
    groupedStyles[groupKey].push(style);
  });

  // Sort groups: Mobile variants first, then Tablet, then Desktop, then others
  const sortedGroupKeys = Object.keys(groupedStyles).sort((a, b) => {
    const getOrder = (key) => {
      if (key.startsWith('Mobile')) return 0;
      if (key.startsWith('Tablet')) return 1;
      if (key.startsWith('Desktop')) return 2;
      if (key === 'All') return 3;
      return 4;
    };
    const orderDiff = getOrder(a) - getOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return a.localeCompare(b);
  });

  // Create sections for each group
  for (const groupKey of sortedGroupKeys) {
    const styles = groupedStyles[groupKey];
    if (styles.length === 0) continue;

    const section = figma.createFrame();
    section.name = groupKey === "All" ? "Typography" : `${groupKey} | Typography`;
    section.layoutMode = "VERTICAL";
    section.itemSpacing = 24;
    section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    section.paddingLeft = 40;
    section.paddingRight = 40;
    section.paddingTop = 40;
    section.paddingBottom = 40;
    section.cornerRadius = 8;
    section.counterAxisSizingMode = "FIXED";
    section.resize(1200, 100);

    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Regular" };
    title.characters = groupKey === "All" ? "Typography" : `${groupKey} | Typography`;
    title.fontSize = 24;
    section.appendChild(title);

    const colHeader = figma.createText();
    colHeader.fontName = { family: "Inter", style: "Bold" };
    colHeader.characters = "Standard text";
    colHeader.fontSize = 14;
    section.appendChild(colHeader);

    const listFrame = figma.createFrame();
    listFrame.name = "Styles List";
    listFrame.layoutMode = "VERTICAL";
    listFrame.itemSpacing = 0;
    listFrame.fills = [];
    listFrame.layoutAlign = "STRETCH";
    listFrame.primaryAxisSizingMode = "AUTO";
    listFrame.counterAxisSizingMode = "FIXED";
    section.appendChild(listFrame);

    for (const style of styles) {
      // Handle multiple name formats using groupKey:
      // "Desktop/H1" -> "H1"
      // "Desktop - MG/H1" -> "H1" (prefix format)
      // "Desktop H1" -> "H1"
      let displayName = style.name;

      // Remove the groupKey prefix from the style name
      // groupKey can be "Desktop", "Desktop - MG", "Mobile - MG2", etc.
      if (groupKey !== "All") {
        // Try removing "GroupKey/" pattern first
        if (displayName.startsWith(groupKey + '/')) {
          displayName = displayName.substring(groupKey.length + 1);
        }
        // Try removing "GroupKey " pattern (for styles like "Desktop H1")
        else if (displayName.startsWith(groupKey + ' ')) {
          displayName = displayName.substring(groupKey.length + 1);
        }
      }

      // Final cleanup: if still has "/" (nested paths), take the last part
      if (displayName.includes('/')) {
        displayName = displayName.split('/').pop();
      }

      const row = figma.createFrame();
      row.name = displayName;
      row.layoutMode = "HORIZONTAL";
      row.itemSpacing = 40;
      row.fills = [];
      row.paddingTop = 16;
      row.paddingBottom = 16;
      row.primaryAxisAlignItems = "MIN";
      row.counterAxisAlignItems = "CENTER";
      row.layoutAlign = "STRETCH";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";

      const label = figma.createText();
      label.name = "Label";
      label.fontName = { family: "Inter", style: "Regular" };
      label.characters = displayName;
      label.fontSize = 16;
      label.resize(150, label.height);
      label.layoutGrow = 0;

      // Sample text based on size (define first)
      let sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.sed do eiusmod tempor incididunt";
      if (style.fontSize > 65) {
        sampleText = "Lorem ipsum dolor sit amet";
      } else if (style.fontSize < 24) {
        sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris";
      } else if (style.fontSize >= 40) {
        sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      }

      // CRITICAL: Load the font for this style BEFORE creating text node
      // When we apply textStyleId, Figma will try to use the font from that style
      let fontToUse = { family: "Inter", style: "Regular" };
      let canApplyTextStyle = false;

      try {
        await figma.loadFontAsync(style.fontName);
        console.log(`✓ Loaded font for text style ${style.name}: ${style.fontName.family} ${style.fontName.style}`);
        fontToUse = style.fontName;
        canApplyTextStyle = true;
      } catch (e) {
        console.warn(`✗ Could not load font for style ${style.name}: ${style.fontName.family} ${style.fontName.style}`);

        // Try fallbacks
        const fallbacks = [
          { family: style.fontName.family, style: "Regular" },
          { family: style.fontName.family, style: "Medium" },
          { family: style.fontName.family, style: "Bold" },
          { family: "Inter", style: "Regular" }
        ];

        for (const fallback of fallbacks) {
          try {
            await figma.loadFontAsync(fallback);
            console.log(`✓ Loaded fallback font: ${fallback.family} ${fallback.style}`);
            fontToUse = fallback;
            // Don't apply textStyleId if using fallback font
            canApplyTextStyle = false;
            break;
          } catch (fallbackError) {
            // Continue to next fallback
          }
        }
      }

      // Create text node with loaded font
      const sample = figma.createText();
      sample.name = "Preview Text";
      sample.fontName = fontToUse;

      // Only apply text style if the exact font was loaded successfully
      if (canApplyTextStyle) {
        try {
          sample.textStyleId = style.id;
          console.log(`✓ Applied text style: ${style.name}`);
        } catch (styleError) {
          console.error(`✗ Failed to apply text style ${style.name}:`, styleError);
        }
      } else {
        // Manually apply style properties if we couldn't load the original font
        console.log(`⚠ Applying manual properties for ${style.name} (using fallback font)`);
        try {
          sample.fontSize = style.fontSize;
          if (style.lineHeight && typeof style.lineHeight === 'object') {
            sample.lineHeight = style.lineHeight;
          }
          if (style.letterSpacing && typeof style.letterSpacing === 'object') {
            sample.letterSpacing = style.letterSpacing;
          }
          if (style.textCase) {
            sample.textCase = style.textCase;
          }
        } catch (propError) {
          console.error(`Failed to apply manual properties:`, propError);
        }

        // Add warning text if using fallback font
        sampleText += ` (check font-family manual: expected ${style.fontName.family} ${style.fontName.style})`;
      }

      // Set characters
      sample.characters = sampleText;
      sample.layoutGrow = 1;
      sample.textAutoResize = "HEIGHT";

      row.appendChild(label);
      row.appendChild(sample);
      listFrame.appendChild(row);

      const line = figma.createRectangle();
      line.name = "Separator";
      line.resize(100, 1);
      line.layoutAlign = "STRETCH";
      line.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      listFrame.appendChild(line);
    }

    parent.appendChild(section);
  }
}

// ============================================
// CHECK FOR DUPLICATES BEFORE CREATING
// ============================================

async function checkForDuplicatesFromParsedTokens(parsedTokens, prefix) {
  const duplicates = {
    colors: [],
    spacing: [],
    textStyles: [],
    borders: [],
    shadows: [],
    breakpoints: []
  };

  // Check Color Variables
  if (parsedTokens.colors && parsedTokens.colors.length > 0) {
    const collectionName = prefix ? `Colors - ${prefix}` : 'Colors';
    const existingCollections = figma.variables.getLocalVariableCollections();
    const collection = existingCollections.find(c => c.name === collectionName);

    if (collection) {
      const existingVariables = figma.variables.getLocalVariables('COLOR')
        .filter(v => v.variableCollectionId === collection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));

      for (const color of parsedTokens.colors) {
        if (existingNames.has(color.name)) {
          duplicates.colors.push(color.name);
        }
      }
    }
  }

  // Check Spacing Variables
  if (parsedTokens.spacing && parsedTokens.spacing.length > 0) {
    const collectionName = prefix ? `Spacing - ${prefix}` : 'Spacing';
    const existingCollections = figma.variables.getLocalVariableCollections();
    const collection = existingCollections.find(c => c.name === collectionName);

    if (collection) {
      const existingVariables = figma.variables.getLocalVariables('FLOAT')
        .filter(v => v.variableCollectionId === collection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));

      for (const spacing of parsedTokens.spacing) {
        if (existingNames.has(spacing.name)) {
          duplicates.spacing.push(spacing.name);
        }
      }
    }
  }

  // Check Text Styles
  if (parsedTokens.typography && parsedTokens.typography.length > 0) {
    const existingStyles = figma.getLocalTextStyles();
    const existingNames = new Set(existingStyles.map(s => s.name));

    for (const style of parsedTokens.typography) {
      let styleName = style.name;
      if (prefix) {
        if (style.name.includes('/')) {
          const [breakpoint, name] = style.name.split('/');
          styleName = `${breakpoint} - ${prefix}/${name}`;
        } else {
          styleName = `${prefix}/${style.name}`;
        }
      }
      if (existingNames.has(styleName)) {
        duplicates.textStyles.push(styleName);
      }
    }
  }

  // Check Border Variables
  if (parsedTokens.borders) {
    const radiusCollectionName = prefix ? `Border Radius - ${prefix}` : 'Border Radius';
    const widthCollectionName = prefix ? `Border Width - ${prefix}` : 'Border Width';
    const existingCollections = figma.variables.getLocalVariableCollections();
    
    const radiusCollection = existingCollections.find(c => c.name === radiusCollectionName);
    const widthCollection = existingCollections.find(c => c.name === widthCollectionName);

    if (radiusCollection && parsedTokens.borders.radius.length > 0) {
      const existingVariables = figma.variables.getLocalVariables('FLOAT')
        .filter(v => v.variableCollectionId === radiusCollection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));
      for (const border of parsedTokens.borders.radius) {
        if (existingNames.has(border.name)) {
          duplicates.borders.push(`Radius: ${border.name}`);
        }
      }
    }

    if (widthCollection && parsedTokens.borders.width.length > 0) {
      const existingVariables = figma.variables.getLocalVariables('FLOAT')
        .filter(v => v.variableCollectionId === widthCollection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));
      for (const border of parsedTokens.borders.width) {
        if (existingNames.has(border.name)) {
          duplicates.borders.push(`Width: ${border.name}`);
        }
      }
    }
  }

  // Check Breakpoint Variables
  if (parsedTokens.breakpoints && parsedTokens.breakpoints.breakpoints && parsedTokens.breakpoints.breakpoints.length > 0) {
    const collectionName = prefix ? `Breakpoint - ${prefix}` : 'Breakpoint';
    const existingCollections = figma.variables.getLocalVariableCollections();
    const collection = existingCollections.find(c => c.name === collectionName);

    if (collection) {
      const existingVariables = figma.variables.getLocalVariables('FLOAT')
        .filter(v => v.variableCollectionId === collection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));

      for (const bp of parsedTokens.breakpoints.breakpoints) {
        if (existingNames.has(bp.name)) {
          duplicates.breakpoints.push(bp.name);
        }
        // Also check for max variables
        if (bp.max && bp.max !== 'none' && existingNames.has(`${bp.name}/max`)) {
          duplicates.breakpoints.push(`${bp.name}/max`);
        }
      }
    }
  }

  return duplicates;
}

async function checkForDuplicates(values, prefix) {
  const duplicates = {
    colors: [],
    spacing: [],
    textStyles: []
  };

  // Check Color Variables
  if (values.colorNameMap && Object.keys(values.colorNameMap).length > 0) {
    const collectionName = prefix ? `Colors - ${prefix}` : 'Colors';
    const existingCollections = figma.variables.getLocalVariableCollections();
    const collection = existingCollections.find(c => c.name === collectionName);

    if (collection) {
      const existingVariables = figma.variables.getLocalVariables('COLOR')
        .filter(v => v.variableCollectionId === collection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));

      for (const [hex, name] of Object.entries(values.colorNameMap)) {
        // Skip "No name" patterns
        if (name === 'No name' || /^No name \d+$/.test(name)) continue;
        if (existingNames.has(name)) {
          duplicates.colors.push(name);
        }
      }
    }
  }

  // Check Spacing Variables
  if (values.spacingScale) {
    const spacingValues = values.spacingScale.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    const collectionName = prefix ? `Spacing - ${prefix}` : 'Spacing';
    const existingCollections = figma.variables.getLocalVariableCollections();
    const collection = existingCollections.find(c => c.name === collectionName);

    if (collection) {
      const existingVariables = figma.variables.getLocalVariables('FLOAT')
        .filter(v => v.variableCollectionId === collection.id);
      const existingNames = new Set(existingVariables.map(v => v.name));

      for (let index = 0; index < spacingValues.length; index++) {
        const variableName = String(index);
        if (existingNames.has(variableName)) {
          duplicates.spacing.push(`${variableName} (${spacingValues[index]}px)`);
        }
      }
    }
  }

  // Check Text Styles
  if (values.typographyStyles && values.typographyStyles.length > 0) {
    const existingStyles = figma.getLocalTextStyles();
    const existingNames = new Set(existingStyles.map(s => s.name));

    for (const style of values.typographyStyles) {
      let styleName = style.name;
      if (prefix) {
        const breakpoints = ['Desktop/', 'Tablet/', 'Mobile/'];
        for (const bp of breakpoints) {
          if (style.name.startsWith(bp)) {
            const restOfName = style.name.substring(bp.length);
            const breakpointName = bp.slice(0, -1);
            styleName = `${breakpointName} - ${prefix}/${restOfName}`;
            break;
          }
        }
        if (styleName === style.name && !breakpoints.some(bp => style.name.startsWith(bp))) {
          styleName = `${prefix}/${style.name}`;
        }
      }
      if (existingNames.has(styleName)) {
        duplicates.textStyles.push(styleName);
      }
    }
  }

  return duplicates;
}

// ============================================
// CREATE VARIABLES AND TEXT STYLES FROM JSON
// ============================================

async function createVariablesAndStyles(values, prefix, duplicateAction = 'skip') {
  console.log('Creating Variables and Text Styles with prefix:', prefix, 'duplicateAction:', duplicateAction);

  // 1. Create Color Variables
  if (values.colorNameMap && Object.keys(values.colorNameMap).length > 0) {
    await createColorVariablesFromJSON(values.colorNameMap, prefix, duplicateAction);
  }

  // 2. Create Spacing Variables
  if (values.spacingScale) {
    await createSpacingVariablesFromJSON(values.spacingScale, prefix, duplicateAction);
  }

  // 3. Create Text Styles
  if (values.typographyStyles && values.typographyStyles.length > 0) {
    await createTextStylesFromJSON(values.typographyStyles, prefix, duplicateAction);
  }
}

async function createColorVariablesFromJSON(colorNameMap, prefix, duplicateAction = 'skip') {
  console.log('Creating color variables... duplicateAction:', duplicateAction);

  // Get or create a variable collection for colors
  let collection;
  // Format: "Colors - MG" (prefix after)
  const collectionName = prefix ? `Colors - ${prefix}` : 'Colors';

  // Check if collection already exists
  const existingCollections = figma.variables.getLocalVariableCollections();
  collection = existingCollections.find(c => c.name === collectionName);

  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    console.log(`Created new collection: ${collectionName}`);
  } else {
    console.log(`Using existing collection: ${collectionName}`);
  }

  const modeId = collection.modes[0].modeId;

  // Get existing variables in THIS collection only to avoid duplicates
  const existingVariables = figma.variables.getLocalVariables('COLOR')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  let createdCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  for (const [hex, name] of Object.entries(colorNameMap)) {
    // Variable name stays the same (no prefix on individual variables, only on collection)
    // "No name X" colors are also created as variables
    const variableName = name;

    // Check if variable already exists in this collection
    const existingVariable = existingVariableMap.get(variableName);
    if (existingVariable) {
      if (duplicateAction === 'overwrite') {
        // Overwrite: update the existing variable's value
        try {
          const rgb = hexToRgb(hex);
          existingVariable.setValueForMode(modeId, rgb);
          overwrittenCount++;
          console.log(`Overwritten color variable: ${variableName} = ${hex}`);
        } catch (e) {
          console.error(`Failed to overwrite variable ${variableName}:`, e);
        }
      } else {
        // Skip
        console.log(`Skipping existing variable in collection: ${variableName}`);
        skippedCount++;
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'COLOR');
      const rgb = hexToRgb(hex);
      variable.setValueForMode(modeId, rgb);
      createdCount++;
      console.log(`Created color variable: ${variableName} = ${hex}`);
    } catch (e) {
      console.error(`Failed to create variable ${variableName}:`, e);
    }
  }

  console.log(`Color variables: ${createdCount} created, ${overwrittenCount} overwritten, ${skippedCount} skipped`);
}

async function createSpacingVariablesFromJSON(spacingScale, prefix, duplicateAction = 'skip') {
  console.log('Creating spacing variables... duplicateAction:', duplicateAction);

  const values = spacingScale.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));

  if (values.length === 0) {
    console.log('No valid spacing values found');
    return;
  }

  // Get or create a variable collection for spacing
  let collection;
  // Format: "Spacing - MG" (prefix after)
  const collectionName = prefix ? `Spacing - ${prefix}` : 'Spacing';

  const existingCollections = figma.variables.getLocalVariableCollections();
  collection = existingCollections.find(c => c.name === collectionName);

  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
    console.log(`Created new collection: ${collectionName}`);
  } else {
    console.log(`Using existing collection: ${collectionName}`);
  }

  // Setup 3 modes: Mobile, Tablet, Desktop
  const modes = {};

  // Rename default mode to Mobile
  const defaultMode = collection.modes[0];
  collection.renameMode(defaultMode.modeId, 'Mobile');
  modes['Mobile'] = defaultMode.modeId;

  // Add Tablet and Desktop modes if they don't exist
  const existingModeNames = collection.modes.map(m => m.name);

  if (!existingModeNames.includes('Tablet')) {
    const tabletModeId = collection.addMode('Tablet');
    modes['Tablet'] = tabletModeId;
  } else {
    modes['Tablet'] = collection.modes.find(m => m.name === 'Tablet').modeId;
  }

  if (!existingModeNames.includes('Desktop')) {
    const desktopModeId = collection.addMode('Desktop');
    modes['Desktop'] = desktopModeId;
  } else {
    modes['Desktop'] = collection.modes.find(m => m.name === 'Desktop').modeId;
  }

  console.log('Modes setup:', modes);

  // Get existing variables in THIS collection only to avoid duplicates
  const existingVariables = figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  let createdCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  // Create variables with index-based names (0, 1, 2, 3...)
  // Variable names are just numbers, prefix is only used for collection name
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const variableName = String(index);

    const existingVariable = existingVariableMap.get(variableName);
    if (existingVariable) {
      if (duplicateAction === 'overwrite') {
        // Overwrite: update the existing variable's values
        try {
          existingVariable.setValueForMode(modes['Mobile'], value);
          existingVariable.setValueForMode(modes['Tablet'], value);
          existingVariable.setValueForMode(modes['Desktop'], value);
          overwrittenCount++;
          console.log(`Overwritten spacing variable: ${variableName} = ${value} (all modes)`);
        } catch (e) {
          console.error(`Failed to overwrite variable ${variableName}:`, e);
        }
      } else {
        // Skip
        console.log(`Skipping existing variable in collection: ${variableName}`);
        skippedCount++;
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'FLOAT');

      // Set same value for all 3 modes (Mobile, Tablet, Desktop)
      variable.setValueForMode(modes['Mobile'], value);
      variable.setValueForMode(modes['Tablet'], value);
      variable.setValueForMode(modes['Desktop'], value);

      createdCount++;
      console.log(`Created spacing variable: ${variableName} = ${value} (all modes)`);
    } catch (e) {
      console.error(`Failed to create variable ${variableName}:`, e);
    }
  }

  console.log(`Spacing variables: ${createdCount} created, ${overwrittenCount} overwritten, ${skippedCount} skipped`);
}

async function createTextStylesFromJSON(typographyStyles, prefix, duplicateAction = 'skip') {
  console.log('Creating text styles... duplicateAction:', duplicateAction);

  // Get existing text styles to avoid duplicates
  const existingStyles = figma.getLocalTextStyles();
  const existingStyleMap = new Map(existingStyles.map(s => [s.name, s]));

  let createdCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;

  for (const style of typographyStyles) {
    // Handle prefix - add prefix after breakpoint with " - " separator
    // e.g., "Desktop/H1" + prefix "MG" -> "Desktop - MG/H1"
    let styleName = style.name;

    if (prefix) {
      const breakpoints = ['Desktop/', 'Tablet/', 'Mobile/'];
      let breakpointFound = false;

      for (const bp of breakpoints) {
        if (style.name.startsWith(bp)) {
          const restOfName = style.name.substring(bp.length);
          const breakpointName = bp.slice(0, -1); // Remove trailing "/"
          styleName = `${breakpointName} - ${prefix}/${restOfName}`;
          breakpointFound = true;
          break;
        }
      }

      // If no breakpoint prefix, just add prefix with separator
      if (!breakpointFound) {
        styleName = `${prefix}/${style.name}`;
      }
    }

    const existingStyle = existingStyleMap.get(styleName);

    // Load the font first
    const fontName = { family: style.fontFamily, style: style.fontWeight };
    let fontLoaded = false;

    try {
      await figma.loadFontAsync(fontName);
      fontLoaded = true;
    } catch (e) {
      // Try fallbacks - only try other styles of the same fontFamily
      const fallbacks = [
        { family: style.fontFamily, style: 'Regular' },
        { family: style.fontFamily, style: 'Medium' }
      ];

      for (const fallback of fallbacks) {
        try {
          await figma.loadFontAsync(fallback);
          fontName.family = fallback.family;
          fontName.style = fallback.style;
          fontLoaded = true;
          console.warn(`Using fallback font for ${styleName}: ${fallback.family} ${fallback.style}`);
          break;
        } catch (fallbackError) {
          // Continue
        }
      }
    }

    if (!fontLoaded) {
      console.error(`Could not load any font for style: ${styleName} (fontFamily: ${style.fontFamily}, fontWeight: ${style.fontWeight})`);
      figma.ui.postMessage({
        type: 'status',
        message: `Error: Could not load font "${style.fontFamily} ${style.fontWeight}" for style ${styleName}. Please check if the font is available in Figma.`,
        error: true
      });
      skippedCount++;
      continue;
    }

    if (existingStyle) {
      if (duplicateAction === 'overwrite') {
        // Overwrite: update the existing style's properties
        try {
          existingStyle.fontName = fontName;
          existingStyle.fontSize = style.fontSize;

          // Line height
          if (style.lineHeight) {
            if (style.lineHeight === 'auto' || style.lineHeight === 'Auto') {
              existingStyle.lineHeight = { unit: 'AUTO' };
            } else if (String(style.lineHeight).endsWith('%')) {
              existingStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PERCENT' };
            } else {
              existingStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PIXELS' };
            }
          }

          // Letter spacing
          if (style.letterSpacing) {
            if (String(style.letterSpacing).endsWith('%')) {
              existingStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PERCENT' };
            } else {
              existingStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PIXELS' };
            }
          }

          overwrittenCount++;
          console.log(`Overwritten text style: ${styleName}`);
        } catch (e) {
          console.error(`Failed to overwrite text style ${styleName}:`, e);
        }
      } else {
        // Skip
        console.log(`Skipping existing text style: ${styleName}`);
        skippedCount++;
      }
      continue;
    }

    try {
      // Create the text style
      const textStyle = figma.createTextStyle();
      textStyle.name = styleName;
      textStyle.fontName = fontName;
      textStyle.fontSize = style.fontSize;

      // Line height
      if (style.lineHeight) {
        if (style.lineHeight === 'auto' || style.lineHeight === 'Auto') {
          textStyle.lineHeight = { unit: 'AUTO' };
        } else if (String(style.lineHeight).endsWith('%')) {
          textStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PERCENT' };
        } else {
          textStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PIXELS' };
        }
      }

      // Letter spacing
      if (style.letterSpacing) {
        if (String(style.letterSpacing).endsWith('%')) {
          textStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PERCENT' };
        } else {
          textStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PIXELS' };
        }
      }

      createdCount++;
      console.log(`Created text style: ${styleName}`);
    } catch (e) {
      console.error(`Failed to create text style ${styleName}:`, e);
      skippedCount++;
    }
  }

  console.log(`Text styles: ${createdCount} created, ${overwrittenCount} overwritten, ${skippedCount} skipped`);
}

// ============================================
// END CREATE VARIABLES AND TEXT STYLES
// ============================================

async function createSpacingFromVariables(parent, numberVariables) {
  // Group variables by their collection first
  // Each collection becomes a separate page/section (e.g., "Spacing", "Spacing - MG", "Spacing - MG2")
  const collectionMap = new Map(); // collectionId -> { name, variables, collection }

  for (const variable of numberVariables) {
    const collectionId = variable.variableCollectionId;
    if (!collectionMap.has(collectionId)) {
      const collection = figma.variables.getVariableCollectionById(collectionId);
      collectionMap.set(collectionId, {
        name: collection ? collection.name : 'Spacing',
        variables: [],
        collection: collection
      });
    }
    collectionMap.get(collectionId).variables.push(variable);
  }

  // Sort collections: "Spacing" first, then alphabetically
  const sortedCollections = Array.from(collectionMap.entries()).sort((a, b) => {
    if (a[1].name === 'Spacing') return -1;
    if (b[1].name === 'Spacing') return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  // Create a section for each collection
  for (const [collectionId, collectionData] of sortedCollections) {
    const collection = collectionData.collection;
    if (!collection) continue;

    // Get modes for this collection and sort: Mobile, Tablet, Desktop
    const modeOrder = ['Mobile', 'Tablet', 'Desktop'];
    const modes = collection.modes
      .map(m => ({
        id: m.modeId,
        name: m.name
      }))
      .sort((a, b) => {
        const indexA = modeOrder.indexOf(a.name);
        const indexB = modeOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    // Helper function to get value with fallback to default mode
    const getVariableValue = (variable, modeId) => {
      if (variable.valuesByMode[modeId] !== undefined) {
        return variable.valuesByMode[modeId];
      }
      if (collection.defaultModeId && variable.valuesByMode[collection.defaultModeId] !== undefined) {
        return variable.valuesByMode[collection.defaultModeId];
      }
      const firstValue = Object.values(variable.valuesByMode)[0];
      return firstValue !== undefined ? firstValue : 0;
    };

    // Create section for this collection
    const section = figma.createFrame();
    section.name = collectionData.name;
    section.layoutMode = "VERTICAL";
    section.itemSpacing = 20;
    section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    section.paddingLeft = 40;
    section.paddingRight = 40;
    section.paddingTop = 40;
    section.paddingBottom = 40;
    section.cornerRadius = 8;
    section.counterAxisSizingMode = "AUTO";

    // Section title
    const sectionTitle = figma.createText();
    sectionTitle.fontName = { family: "Inter", style: "Regular" };
    sectionTitle.characters = collectionData.name;
    sectionTitle.fontSize = 24;
    section.appendChild(sectionTitle);

    // Group variables within this collection by category
    const groupedVars = {};
    collectionData.variables.forEach(v => {
      const name = v.name;
      let category;

      if (name.toLowerCase().includes('horizontal')) {
        category = 'Horizontal spacing';
      } else if (name.toLowerCase().includes('vertical')) {
        category = 'Vertical spacing';
      } else {
        category = 'Spacing';
      }

      if (!groupedVars[category]) {
        groupedVars[category] = [];
      }
      groupedVars[category].push(v);
    });

    // Create table for each category within this collection
    Object.entries(groupedVars).forEach(([category, vars]) => {
      const categoryFrame = figma.createFrame();
      categoryFrame.name = category;
      categoryFrame.layoutMode = "VERTICAL";
      categoryFrame.itemSpacing = 10;
      categoryFrame.fills = [];
      categoryFrame.primaryAxisSizingMode = "AUTO";
      categoryFrame.counterAxisSizingMode = "AUTO";

      // Category title
      const categoryTitle = figma.createText();
      categoryTitle.fontName = { family: "Inter", style: "Bold" };
      categoryTitle.characters = category;
      categoryTitle.fontSize = 18;
      categoryFrame.appendChild(categoryTitle);

      const table = figma.createFrame();
      table.layoutMode = "VERTICAL";
      table.itemSpacing = 1;
      table.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      table.counterAxisSizingMode = "AUTO";

      // Header Row
      const headerRow = figma.createFrame();
      headerRow.layoutMode = "HORIZONTAL";
      headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      headerRow.paddingLeft = 16;
      headerRow.paddingRight = 16;
      headerRow.paddingTop = 10;
      headerRow.paddingBottom = 10;
      headerRow.primaryAxisSizingMode = "AUTO";
      headerRow.counterAxisSizingMode = "AUTO";

      const nameHeader = figma.createText();
      nameHeader.fontName = { family: "Inter", style: "Bold" };
      nameHeader.characters = 'Name';
      nameHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      nameHeader.fontSize = 16;
      nameHeader.resize(150, nameHeader.height);
      headerRow.appendChild(nameHeader);

      modes.forEach(mode => {
        const cell = figma.createText();
        cell.fontName = { family: "Inter", style: "Bold" };
        cell.characters = mode.name;
        cell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        cell.fontSize = 16;
        cell.resize(100, cell.height);
        headerRow.appendChild(cell);
      });
      table.appendChild(headerRow);

      // Sort variables by numeric value
      const sortedVars = vars.slice().sort((a, b) => {
        const extractNum = (name) => {
          const match = name.match(/\/(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        };
        return extractNum(a.name) - extractNum(b.name);
      });

      // Data Rows
      sortedVars.forEach(variable => {
        const row = figma.createFrame();
        row.layoutMode = "HORIZONTAL";
        row.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
        row.paddingLeft = 16;
        row.paddingRight = 16;
        row.paddingTop = 10;
        row.paddingBottom = 10;
        row.primaryAxisSizingMode = "AUTO";
        row.counterAxisSizingMode = "AUTO";

        const displayName = variable.name.split('/').pop() || variable.name;
        const nameCell = figma.createText();
        nameCell.fontName = { family: "Inter", style: "Regular" };
        nameCell.characters = displayName;
        nameCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        nameCell.fontSize = 16;
        nameCell.resize(150, nameCell.height);
        row.appendChild(nameCell);

        modes.forEach(mode => {
          const value = getVariableValue(variable, mode.id);
          const valueCell = figma.createText();
          valueCell.fontName = { family: "Inter", style: "Regular" };
          valueCell.characters = String(value);
          valueCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          valueCell.fontSize = 16;
          valueCell.resize(100, valueCell.height);
          row.appendChild(valueCell);
        });

        table.appendChild(row);
      });

      categoryFrame.appendChild(table);
      section.appendChild(categoryFrame);
    });

    parent.appendChild(section);
  }
}

// ============================================
// TOKEN PARSERS
// ============================================

function parseAllTokens(tokenFiles) {
  const parsed = {
    colors: [],
    typography: [],
    typographyAll: [],        // All styles including duplicates (for layout preview)
    styleRedirectMap: new Map(), // Map removed style name → kept style name
    spacing: [],
    shadows: [],
    borders: { radius: [], width: [] },
    breakpoints: [],
    buttons: null,
    linksColors: null
  };

  // Parse colors
  if (tokenFiles.color && tokenFiles.color.color) {
    parsed.colors = parseColorTokens(tokenFiles.color.color);
  }

  // Parse typography
  if (tokenFiles.typography && tokenFiles.typography.textStyles) {
    const typResult = parseTypographyTokens(tokenFiles.typography.textStyles);
    parsed.typography = typResult.styles;              // Deduplicated (for text style creation)
    parsed.typographyAll = typResult.allStyles;        // All breakpoints (for layout preview)
    parsed.styleRedirectMap = typResult.styleRedirectMap; // Redirect map
  }
  
  // Parse linksColors from typography
  if (tokenFiles.typography && tokenFiles.typography.linksColors) {
    parsed.linksColors = tokenFiles.typography.linksColors;
  }

  // Parse spacing
  if (tokenFiles.spacing && tokenFiles.spacing.spacing) {
    parsed.spacing = parseSpacingTokens(tokenFiles.spacing.spacing);
  }

  // Parse shadows
  if (tokenFiles.shadow && tokenFiles.shadow.shadow) {
    parsed.shadows = parseShadowTokens(tokenFiles.shadow.shadow);
  }

  // Parse borders
  if (tokenFiles.border && tokenFiles.border.border) {
    const borderData = parseBorderTokens(tokenFiles.border.border);
    parsed.borders.radius = borderData.radius;
    parsed.borders.width = borderData.width;
  }

  // Parse breakpoints
  if (tokenFiles.breakpoint && tokenFiles.breakpoint.breakpoint) {
    parsed.breakpoints = parseBreakpointTokens(tokenFiles.breakpoint);
  }

  // Parse buttons (support both old format with button.buttons and new format with button.button)
  if (tokenFiles.button) {
    const hasOldFormat = tokenFiles.button.buttons;
    const hasNewFormat = tokenFiles.button.button;
    
    console.log('=== PARSING BUTTON TOKENS ===');
    console.log('tokenFiles.button keys:', Object.keys(tokenFiles.button));
    console.log('  - hasOldFormat (button.buttons):', !!hasOldFormat);
    console.log('  - hasNewFormat (button.button):', !!hasNewFormat);
    
    if (hasOldFormat || hasNewFormat) {
      parsed.buttons = parseButtonTokens(tokenFiles.button);
      console.log('✓ Parsed buttons result:');
      console.log('  - format:', parsed.buttons.format);
      console.log('  - has button:', !!parsed.buttons.button);
      console.log('  - has textLink:', !!parsed.buttons.textLink);
    } else {
      console.warn('⚠ Button data exists but no recognized format (missing button.buttons or button.button)');
    }
    console.log('=== END PARSING BUTTON TOKENS ===');
  } else {
    console.log('⚠ No button data found in tokenFiles');
  }

  return parsed;
}

function parseColorTokens(colorData) {
  const colors = [];
  const seen = new Set();

  function flattenColors(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if (value.value !== undefined) {
          // This is a color value
          const colorName = prefix ? `${prefix}/${key}` : key;
          const hex = value.value;
          const description = value.description || '';

          // Skip duplicates
          const dedupeKey = `${colorName}|${hex}`.toLowerCase();
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          // Extract group name (first part before /)
          const group = prefix.split('/')[0] || prefix || 'Other';

          colors.push({
            name: colorName,
            hex: hex === 'transparent' ? '#00000000' : hex,
            group: group,
            description: description
          });
        } else {
          // Nested object, recurse
          const newPrefix = prefix ? `${prefix}/${key}` : key;
          flattenColors(value, newPrefix);
        }
      }
    }
  }

  flattenColors(colorData);
  return colors;
}

function parseTypographyTokens(textStylesData) {
  const styles = [];

  function flattenTypography(obj, styleName = '', baseProps = {}) {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        // Check if this is a breakpoint (mobile, tablet, desktop)
        if (key === 'mobile' || key === 'tablet' || key === 'desktop') {
          // Merge with base properties
          // Don't set defaults here - let fillMissingBreakpoints handle inheritance
          const mergedProps = {
            fontSize: value.fontSize !== undefined ? parseValue(value.fontSize) : baseProps.fontSize,
            lineHeight: value.lineHeight !== undefined ? value.lineHeight : baseProps.lineHeight,
            fontWeight: value.fontWeight !== undefined ? value.fontWeight : baseProps.fontWeight,
            fontFamily: value.fontFamily !== undefined ? value.fontFamily : baseProps.fontFamily,
            letterSpacing: value.letterSpacing !== undefined ? value.letterSpacing : baseProps.letterSpacing,
            color: value.color !== undefined ? value.color : baseProps.color
          };

          // Check if this breakpoint has nested breakpoints (e.g., body.mobile.tablet)
          const hasNestedBreakpoints = Object.keys(value).some(k => k === 'mobile' || k === 'tablet' || k === 'desktop');
          
          if (hasNestedBreakpoints) {
            // First, create style for current breakpoint (mobile) with its properties
            const fullName = `${key.charAt(0).toUpperCase() + key.slice(1)}/${styleName}`;
            styles.push({
              name: fullName,
              displayName: styleName,
              breakpoint: key,
              fontSize: mergedProps.fontSize,
              lineHeight: mergedProps.lineHeight,
              fontWeight: mergedProps.fontWeight,
              fontFamily: mergedProps.fontFamily,
              letterSpacing: mergedProps.letterSpacing,
              color: mergedProps.color
            });
            
            // Then recurse to handle nested breakpoints (tablet, desktop) with merged props as base
            flattenTypography(value, styleName, mergedProps);
          } else {
            // This is a final style definition for this breakpoint
            const fullName = `${key.charAt(0).toUpperCase() + key.slice(1)}/${styleName}`;
            styles.push({
              name: fullName,
              displayName: styleName,
              breakpoint: key,
              fontSize: mergedProps.fontSize,
              lineHeight: mergedProps.lineHeight,
              fontWeight: mergedProps.fontWeight,
              fontFamily: mergedProps.fontFamily,
              letterSpacing: mergedProps.letterSpacing,
              color: mergedProps.color
            });
          }
        } else {
          // This is a style name (h1, h2, body, etc.)
          // Check if it has direct properties (like fontSize) or breakpoints
          const hasDirectProps = value.fontSize !== undefined || value.value !== undefined;
          const hasBreakpoints = Object.keys(value).some(k => k === 'mobile' || k === 'tablet' || k === 'desktop');

          if (hasDirectProps && !hasBreakpoints) {
            // Direct style definition without breakpoints
            const finalStyleName = styleName || key;
            const fontSize = parseValue(value.fontSize || value.value);
            const lineHeight = value.lineHeight;
            const fontWeight = value.fontWeight; // Don't set default, let fillMissingBreakpoints handle
            const fontFamily = value.fontFamily;
            const letterSpacing = value.letterSpacing;
            const color = value.color;

            styles.push({
              name: finalStyleName,
              displayName: finalStyleName,
              breakpoint: 'mobile',
              fontSize: fontSize,
              lineHeight: lineHeight,
              fontWeight: fontWeight,
              fontFamily: fontFamily,
              letterSpacing: letterSpacing,
              color: color
            });
          } else {
            // Extract base properties from this level (if any)
            // Don't set default 'Inter' here - let it be undefined so we can use body's fontFamily later
            const newBaseProps = {
              fontSize: value.fontSize !== undefined ? parseValue(value.fontSize) : baseProps.fontSize,
              lineHeight: value.lineHeight !== undefined ? value.lineHeight : baseProps.lineHeight,
              fontWeight: value.fontWeight !== undefined ? value.fontWeight : baseProps.fontWeight,
              fontFamily: value.fontFamily !== undefined ? value.fontFamily : baseProps.fontFamily,
              letterSpacing: value.letterSpacing !== undefined ? value.letterSpacing : baseProps.letterSpacing,
              color: value.color !== undefined ? value.color : baseProps.color
            };

            // Recurse with new style name
            const newStyleName = styleName || key;
            flattenTypography(value, newStyleName, newBaseProps);
          }
        }
      }
    }
  }

  flattenTypography(textStylesData);
  console.log(`Parsed ${styles.length} typography styles before inherit:`, styles.map(s => s.name));

  // Fill missing breakpoints with inheritance logic
  const filledStyles = fillMissingBreakpoints(styles);
  console.log(`Parsed ${filledStyles.length} typography styles after inherit:`, filledStyles.map(s => s.name));

  // Deduplicate: if breakpoints have identical props, keep desktop
  const { styles: dedupedStyles, styleRedirectMap } = deduplicateTypographyStyles(filledStyles);

  return { styles: dedupedStyles, styleRedirectMap, allStyles: filledStyles };
}

function fillMissingBreakpoints(styles) {
  // Group styles by displayName (e.g., "h1", "body")
  const stylesByDisplayName = {};
  
  for (const style of styles) {
    const displayName = style.displayName || style.name.split('/').pop();
    if (!stylesByDisplayName[displayName]) {
      stylesByDisplayName[displayName] = [];
    }
    stylesByDisplayName[displayName].push(style);
  }

  const filledStyles = [];
  const breakpointOrder = ['mobile', 'tablet', 'desktop'];

  for (const [displayName, styleGroup] of Object.entries(stylesByDisplayName)) {
    // Get existing breakpoints for this style
    const existingBreakpoints = {};
    for (const style of styleGroup) {
      const bp = style.breakpoint || 'mobile';
      existingBreakpoints[bp] = style;
    }

    // Build base properties from mobile (or first available)
    let baseProps = null;
    for (const bp of breakpointOrder) {
      if (existingBreakpoints[bp]) {
        baseProps = {
          fontSize: existingBreakpoints[bp].fontSize,
          lineHeight: existingBreakpoints[bp].lineHeight,
          fontWeight: existingBreakpoints[bp].fontWeight,
          fontFamily: existingBreakpoints[bp].fontFamily,
          letterSpacing: existingBreakpoints[bp].letterSpacing,
          color: existingBreakpoints[bp].color
        };
        break;
      }
    }

    if (!baseProps) {
      // No base props found, skip this style group
      console.warn(`No base properties found for style: ${displayName}`);
      filledStyles.push.apply(filledStyles, styleGroup);
      continue;
    }

    // Create styles for all 3 breakpoints with inheritance
    // Track the last processed breakpoint to inherit from
    let lastProcessedProps = null;
    
    for (const bp of breakpointOrder) {
      let styleProps;
      
      if (existingBreakpoints[bp]) {
        // Breakpoint exists, merge with previous breakpoint (or base if first)
        const existing = existingBreakpoints[bp];
        const inheritFrom = lastProcessedProps || baseProps;
        
        styleProps = {
          fontSize: existing.fontSize !== undefined ? existing.fontSize : inheritFrom.fontSize,
          lineHeight: existing.lineHeight !== undefined ? existing.lineHeight : inheritFrom.lineHeight,
          fontWeight: existing.fontWeight !== undefined ? existing.fontWeight : inheritFrom.fontWeight,
          fontFamily: existing.fontFamily !== undefined ? existing.fontFamily : inheritFrom.fontFamily,
          letterSpacing: existing.letterSpacing !== undefined ? existing.letterSpacing : inheritFrom.letterSpacing,
          color: existing.color !== undefined ? existing.color : inheritFrom.color
        };
        
        // Update last processed props for next breakpoint
        lastProcessedProps = styleProps;
      } else {
        // Breakpoint missing, inherit from previous breakpoint (or base if first)
        if (lastProcessedProps) {
          // Inherit from last processed breakpoint
          styleProps = {
            fontSize: lastProcessedProps.fontSize,
            lineHeight: lastProcessedProps.lineHeight,
            fontWeight: lastProcessedProps.fontWeight,
            fontFamily: lastProcessedProps.fontFamily,
            letterSpacing: lastProcessedProps.letterSpacing,
            color: lastProcessedProps.color
          };
        } else {
          // Fallback to base props (shouldn't happen if mobile exists)
          styleProps = {
            fontSize: baseProps.fontSize,
            lineHeight: baseProps.lineHeight,
            fontWeight: baseProps.fontWeight,
            fontFamily: baseProps.fontFamily,
            letterSpacing: baseProps.letterSpacing,
            color: baseProps.color
          };
        }
        
        // Update last processed props for next breakpoint
        lastProcessedProps = styleProps;
      }

      // Create style name
      const fullName = `${bp.charAt(0).toUpperCase() + bp.slice(1)}/${displayName}`;
      
      // Ensure fontSize has a default value (required for Figma styles)
      const finalFontSize = styleProps.fontSize !== undefined ? styleProps.fontSize : 16;
      
      filledStyles.push({
        name: fullName,
        displayName: displayName,
        breakpoint: bp,
        fontSize: finalFontSize,
        lineHeight: styleProps.lineHeight,
        fontWeight: styleProps.fontWeight,
        fontFamily: styleProps.fontFamily,
        letterSpacing: styleProps.letterSpacing,
        color: styleProps.color
      });
    }
  }

  return filledStyles;
}

// ============================================
// DEDUPLICATE TYPOGRAPHY STYLES
// If multiple breakpoints have identical properties, keep only desktop (priority)
// Returns { styles, styleRedirectMap }
// styleRedirectMap: Map<removedStyleName, keptStyleName> for layout to reference
// ============================================

function deduplicateTypographyStyles(styles) {
  const styleRedirectMap = new Map();

  // Group by displayName
  const groups = {};
  for (const s of styles) {
    const dn = s.displayName || s.name.split('/').pop();
    if (!groups[dn]) groups[dn] = [];
    groups[dn].push(s);
  }

  const result = [];
  const breakpointPriority = ['desktop', 'mobile', 'tablet']; // desktop wins, mobile over tablet

  for (const [displayName, group] of Object.entries(groups)) {
    if (group.length <= 1) {
      result.push(...group);
      continue;
    }

    // Compare properties between breakpoints
    const propsKey = (s) => [
      s.fontSize, s.lineHeight, s.fontWeight, s.fontFamily, s.letterSpacing
    ].map(v => v === undefined ? '' : String(v)).join('|');

    // Group by identical props
    const buckets = {};
    for (const s of group) {
      const key = propsKey(s);
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(s);
    }

    for (const [, bucket] of Object.entries(buckets)) {
      if (bucket.length === 1) {
        // Unique — keep as-is
        result.push(bucket[0]);
        continue;
      }

      // Multiple breakpoints with same props — keep highest priority
      let kept = null;
      for (const bp of breakpointPriority) {
        const match = bucket.find(s => s.breakpoint === bp);
        if (match) {
          kept = match;
          break;
        }
      }
      if (!kept) kept = bucket[0];

      result.push(kept);

      // Map removed styles to kept style
      for (const s of bucket) {
        if (s !== kept) {
          styleRedirectMap.set(s.name, kept.name);
        }
      }
    }
  }

  console.log(`Deduplicated typography: ${styles.length} → ${result.length} styles`);
  if (styleRedirectMap.size > 0) {
    console.log('Style redirects:', Array.from(styleRedirectMap.entries()));
  }

  return { styles: result, styleRedirectMap };
}

function parseSpacingTokens(spacingData) {
  const spacing = [];

  for (const [key, value] of Object.entries(spacingData)) {
    if (value && typeof value === 'object') {
      const desktop = parseValue((value.desktop && value.desktop.value !== undefined ? value.desktop.value : value.desktop) || 0);
      const tablet = parseValue((value.tablet && value.tablet.value !== undefined ? value.tablet.value : value.tablet) || desktop);
      const mobile = parseValue((value.mobile && value.mobile.value !== undefined ? value.mobile.value : value.mobile) || desktop);

      spacing.push({
        name: key,
        desktop: desktop,
        tablet: tablet,
        mobile: mobile
      });
    }
  }

  // Sort by name (numeric if possible)
  spacing.sort((a, b) => {
    const numA = parseInt(a.name);
    const numB = parseInt(b.name);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.name.localeCompare(b.name);
  });

  return spacing;
}

function parseShadowTokens(shadowData) {
  const shadows = [];

  for (const [key, value] of Object.entries(shadowData)) {
    if (value && value.value) {
      shadows.push({
        name: key,
        value: value.value,
        description: value.description || ''
      });
    }
  }

  return shadows;
}

function parseBorderTokens(borderData) {
  const radius = [];
  const width = [];

  if (borderData.radius) {
    for (const [key, value] of Object.entries(borderData.radius)) {
      if (value && value.value !== undefined) {
        radius.push({
          name: key,
          value: parseValue(value.value),
          description: value.description || ''
        });
      }
    }
  }

  if (borderData.width) {
    for (const [key, value] of Object.entries(borderData.width)) {
      if (value && value.value !== undefined) {
        width.push({
          name: key,
          value: parseValue(value.value),
          description: value.description || ''
        });
      }
    }
  }

  return { radius, width };
}

function parseBreakpointTokens(breakpointData) {
  const breakpoints = [];
  const containers = [];

  if (breakpointData.breakpoint) {
    for (const [key, value] of Object.entries(breakpointData.breakpoint)) {
      if (value && typeof value === 'object') {
        breakpoints.push({
          name: key,
          value: value.value || '0',
          max: value.max || 'none',
          description: value.description || ''
        });
      }
    }
  }

  if (breakpointData.container) {
    for (const [key, value] of Object.entries(breakpointData.container)) {
      if (value && typeof value === 'object') {
        containers.push({
          name: key,
          value: value.value || '100%',
          description: value.description || ''
        });
      }
    }
  }

  return { breakpoints, containers };
}

// ============================================
// VALIDATE BUTTON JSON (NEW FORMAT)
// ============================================

function validateButtonJSON(data) {
  const errors = [];
  
  // Check button structure
  if (!data.button) {
    errors.push('Missing "button" key');
  } else {
    if (!data.button.variants) {
      errors.push('Missing "button.variants"');
    }
    if (!data.button.styles) {
      errors.push('Missing "button.styles"');
    }
    if (!data.button.base) {
      errors.push('Missing "button.base"');
    } else {
      // Validate base properties
      if (data.button.base.layout) {
        if (typeof data.button.base.layout.gap !== 'number') {
          errors.push('button.base.layout.gap must be a number');
        }
      }
      if (typeof data.button.base.borderRadius !== 'number') {
        errors.push('button.base.borderRadius must be a number');
      }
      if (typeof data.button.base.borderWidth !== 'number') {
        errors.push('button.base.borderWidth must be a number');
      }
      if (data.button.base.font) {
        if (typeof data.button.base.font.size !== 'object' && typeof data.button.base.font.size !== 'number') {
          errors.push('button.base.font.size must be a number or object');
        }
        // fontFamily is optional - can be inherited from body typography style
        // weight is optional - defaults to 400/Regular
      }
    }
    if (data.button.sizes) {
      for (const [size, sizeData] of Object.entries(data.button.sizes)) {
        if (sizeData.padding) {
          if (typeof sizeData.padding.x !== 'number' || typeof sizeData.padding.y !== 'number') {
            errors.push(`button.sizes.${size}.padding.x and .y must be numbers`);
          }
        }
      }
    }
    // Validate color values in styles are strings (token paths)
    if (data.button.styles) {
      for (const [type, typeStyles] of Object.entries(data.button.styles)) {
        for (const [color, colorStyles] of Object.entries(typeStyles)) {
          for (const [state, stateStyles] of Object.entries(colorStyles)) {
            if (stateStyles.text && typeof stateStyles.text !== 'string') {
              errors.push(`button.styles.${type}.${color}.${state}.text must be a string (token path)`);
            }
            if (stateStyles.background && typeof stateStyles.background !== 'string') {
              errors.push(`button.styles.${type}.${color}.${state}.background must be a string (token path)`);
            }
            if (stateStyles.border && typeof stateStyles.border !== 'string') {
              errors.push(`button.styles.${type}.${color}.${state}.border must be a string (token path)`);
            }
          }
        }
      }
    }
  }
  
  // Check textLink structure
  if (!data.textLink) {
    errors.push('Missing "textLink" key');
  } else {
    if (!data.textLink.styles) {
      errors.push('Missing "textLink.styles"');
    }
    if (data.textLink.base && data.textLink.base.gap && typeof data.textLink.base.gap !== 'number') {
      errors.push('textLink.base.gap must be a number');
    }
    if (data.textLink.base && data.textLink.base.font) {
      if (typeof data.textLink.base.font.size !== 'number') {
        errors.push('textLink.base.font.size must be a number');
      }
      // fontFamily is optional - can be inherited from body typography style
      // weight is optional - defaults to 400/Regular
    }
    // Validate color values in textLink styles are strings
    if (data.textLink.styles) {
      for (const [color, colorStyles] of Object.entries(data.textLink.styles)) {
        for (const [state, stateStyles] of Object.entries(colorStyles)) {
          if (stateStyles.text && typeof stateStyles.text !== 'string') {
            errors.push(`textLink.styles.${color}.${state}.text must be a string (token path)`);
          }
        }
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error('JSON Validation failed:\n' + errors.join('\n'));
  }
  
  return true;
}

// ============================================
// PARSE RAW COLOR VALUES (hex, rgb, rgba)
// ============================================

function parseRawColor(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();

  // Hex: #RGB, #RRGGBB, #RRGGBBAA
  const hexMatch = v.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    let r, g, b, a = 1;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
      a = parseInt(hex[3] + hex[3], 16) / 255;
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    } else if (hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
      a = parseInt(hex.substring(6, 8), 16) / 255;
    } else {
      return null;
    }
    return { r, g, b, a };
  }

  // rgba(R, G, B, A)
  const rgbaMatch = v.match(/^rgba\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d*\.?\d+)\s*\)$/i);
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]) / 255,
      g: parseFloat(rgbaMatch[2]) / 255,
      b: parseFloat(rgbaMatch[3]) / 255,
      a: parseFloat(rgbaMatch[4])
    };
  }

  // rgb(R, G, B)
  const rgbMatch = v.match(/^rgb\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i);
  if (rgbMatch) {
    return {
      r: parseFloat(rgbMatch[1]) / 255,
      g: parseFloat(rgbMatch[2]) / 255,
      b: parseFloat(rgbMatch[3]) / 255,
      a: 1
    };
  }

  return null;
}

// ============================================
// RESOLVE COLOR TO FIGMA PAINT
// Returns a paint object ready to use in .fills / .strokes
// Supports: token paths (bound to variable), raw hex, rgb(), rgba(), transparent
// ============================================

function resolveColorToPaint(tokenPath, colorVariables) {
  if (!tokenPath || typeof tokenPath !== 'string') return null;
  if (tokenPath === 'color.transparent' || tokenPath === 'transparent') return null;

  // Try raw color first (hex, rgb, rgba)
  const rawColor = parseRawColor(tokenPath);
  if (rawColor) {
    const paint = { type: 'SOLID', color: { r: rawColor.r, g: rawColor.g, b: rawColor.b } };
    if (rawColor.a !== undefined && rawColor.a < 1) {
      paint.opacity = rawColor.a;
    }
    return paint;
  }

  // Token path — resolve to Figma variable
  const variable = resolveColorToken(tokenPath, colorVariables);
  if (variable) {
    return figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
      'color',
      variable
    );
  }

  return null;
}

// ============================================
// CHECK IF A COLOR VALUE IS LIGHT/WHITE
// Supports: token paths (color.white), hex, rgb, rgba, transparent
// ============================================

function isLightOrTransparentColor(colorValue) {
  if (!colorValue || typeof colorValue !== 'string') return false;
  const v = colorValue.trim().toLowerCase();

  // Token path checks
  if (v === 'color.white' || v === 'color.transparent' || v === 'transparent') return true;

  // Parse raw color
  const raw = parseRawColor(colorValue);
  if (!raw) return false;

  // Transparent or near-transparent
  if (raw.a < 0.15) return true;

  // Luminance check (perceived brightness)
  const luminance = 0.299 * raw.r + 0.587 * raw.g + 0.114 * raw.b;
  return luminance > 0.85;
}

// ============================================
// RESOLVE COLOR TOKEN TO FIGMA VARIABLE
// ============================================

function resolveColorToken(tokenPath, colorVariables) {
  if (!tokenPath || typeof tokenPath !== 'string') {
    throw new Error(`Invalid token path: ${tokenPath}`);
  }
  
  // Handle transparent
  if (tokenPath === 'color.transparent' || tokenPath === 'transparent') {
    return null; // Return null for transparent (no fill)
  }
  
  // Find variable by exact name match
  for (const variable of colorVariables) {
    if (variable.name === tokenPath) {
      return variable;
    }
  }
  
  // Try to find by partial match (e.g., "color.primary.500" might be stored as "Primary/500")
  const parts = tokenPath.split('.');
  if (parts.length >= 2 && parts[0] === 'color') {
    const colorName = parts[1];
    const shade = parts[2];
    
    // Try different naming patterns
    const patterns = [];
    
    if (shade) {
      // Has shade: "color.primary.500"
      const colorNameCap = colorName.charAt(0).toUpperCase() + colorName.slice(1);
      patterns.push(`${colorNameCap}/${shade}`);
      patterns.push(`${colorName}/${shade}`);
      patterns.push(`${colorNameCap}-${shade}`);
      patterns.push(`${colorName}-${shade}`);
    } else {
      // No shade: "color.white" or "color.primary"
      const colorNameCap = colorName.charAt(0).toUpperCase() + colorName.slice(1);
      patterns.push(colorNameCap);
      patterns.push(colorName);
      patterns.push(`color/${colorNameCap}`);
      patterns.push(`color/${colorName}`);
    }
    
    // Try each pattern
    for (const pattern of patterns) {
      for (const variable of colorVariables) {
        const varName = variable.name.toLowerCase();
        const patternLower = pattern.toLowerCase();
        
        // Exact match
        if (variable.name === pattern) {
          return variable;
        }
        
        // Case-insensitive match
        if (varName === patternLower) {
          return variable;
        }
        
        // Ends with pattern
        if (varName.endsWith(`/${patternLower}`) || varName.endsWith(`-${patternLower}`)) {
          return variable;
        }
        
        // Contains pattern (for nested structures)
        if (varName.includes(patternLower)) {
          return variable;
        }
      }
    }
  }
  
  // Last attempt: case-insensitive search for any part of the token path
  const searchTerms = tokenPath.toLowerCase().split('.');
  for (const term of searchTerms) {
    if (term === 'color') continue; // Skip 'color' prefix
    
    for (const variable of colorVariables) {
      const varName = variable.name.toLowerCase();
      if (varName === term || varName.includes(term)) {
        console.log(`Found color variable by partial match: "${tokenPath}" -> "${variable.name}"`);
        return variable;
      }
    }
  }
  
  throw new Error(`Color token not found: ${tokenPath}. Please ensure the variable exists in Figma.`);
}

// ============================================
// HELPER: RESOLVE CONFIG VALUE
// ============================================

function resolveConfigValue(value, config) {
  if (typeof value !== 'string') return value;
  
  // Handle {config.examples.defaultText} format
  const match = value.match(/\{config\.(.+)\}/);
  if (match) {
    const path = match[1].split('.');
    let result = config;
    for (const key of path) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        return value; // Return original if path not found
      }
    }
    return result;
  }
  
  return value;
}

// ============================================
// PARSE BUTTON TOKENS (NEW FORMAT)
// ============================================

function parseButtonTokens(buttonData) {
  console.log('=== parseButtonTokens START ===');
  console.log('buttonData keys:', buttonData ? Object.keys(buttonData) : 'null');
  console.log('buttonData.button exists?', !!(buttonData && buttonData.button));
  console.log('buttonData.buttons exists?', !!(buttonData && buttonData.buttons));
  console.log('buttonData.button.variants exists?', !!(buttonData && buttonData.button && buttonData.button.variants));
  
  // Validate JSON structure first
  try {
    console.log('Validating JSON structure...');
    validateButtonJSON(buttonData);
    console.log('✓ JSON validation passed');
  } catch (error) {
    console.error('❌ Button JSON validation failed:', error.message);
    throw error;
  }
  
  // Check if this is new format (has button.variants) or old format (has button.buttons)
  const isNewFormat = buttonData.button && buttonData.button.variants;
  const isOldFormat = buttonData.buttons;
  
  console.log('Format detection:');
  console.log('  - isNewFormat:', isNewFormat);
  console.log('  - isOldFormat:', isOldFormat);
  
  if (isOldFormat && !isNewFormat) {
    console.log('Using OLD format parser');
    // Old format - use existing parser
    return parseButtonTokensOld(buttonData);
  }
  
  if (!isNewFormat) {
    console.error('❌ Invalid button JSON format: missing button.variants or buttons');
    throw new Error('Invalid button JSON format: missing button.variants or buttons');
  }
  
  console.log('Using NEW format parser');
  
  const button = buttonData.button;
  const textLink = buttonData.textLink;
  const config = buttonData.config || {};
  
  // Parse button variants
  const buttonVariants = {
    state: button.variants.state || ['default', 'hover', 'disabled'],
    color: button.variants.color || [],
    size: button.variants.size || ['large', 'small'],
    type: button.variants.type || ['fill', 'outline']
  };
  
  // Parse button base
  const buttonBase = {
    layout: {
      direction: (button.base.layout && button.base.layout.direction) || 'horizontal',
      align: (button.base.layout && button.base.layout.align) || 'center',
      gap: (button.base.layout && button.base.layout.gap) || 8
    },
    borderRadius: button.base.borderRadius || 4,
    borderWidth: button.base.borderWidth || 2,
    minHeight: button.base.minHeight || {},
    font: button.base.font || {
      family: 'Inter',
      weight: 600,
      size: { large: 16, small: 14 },
      lineHeight: { large: 24, small: 20 }
    }
  };
  
  // Parse button sizes
  const buttonSizes = button.sizes || {};
  
  // Parse button styles (already validated)
  const buttonStyles = button.styles || {};
  
  // Parse button properties
  const buttonProperties = button.properties || {};
  
  // Parse textLink variants
  const textLinkVariants = {
    state: (textLink.variants && textLink.variants.state) || ['default', 'hover', 'disabled'],
    color: (textLink.variants && textLink.variants.color) || []
  };
  
  // Parse textLink base
  const textLinkBase = {
    font: (textLink.base && textLink.base.font) || {
      family: 'Inter',
      weight: 500,
      size: 16,
      lineHeight: 24
    },
    gap: (textLink.base && textLink.base.gap) || 4
  };
  
  // Parse textLink styles
  const textLinkStyles = textLink.styles || {};
  
  // Parse textLink properties
  const textLinkProperties = textLink.properties || {};
  
  const result = {
    format: 'new',
    button: {
      variants: buttonVariants,
      base: buttonBase,
      sizes: buttonSizes,
      styles: buttonStyles,
      properties: buttonProperties
    },
    textLink: {
      variants: textLinkVariants,
      base: textLinkBase,
      styles: textLinkStyles,
      properties: textLinkProperties
    },
    config: config
  };
  
  console.log('=== parseButtonTokens END ===');
  console.log('Parsed result format:', result.format);
  console.log('Button variants count:', result.button.variants.type.length * result.button.variants.color.length * result.button.variants.size.length * result.button.variants.state.length);
  console.log('TextLink variants count:', result.textLink.variants.color.length * result.textLink.variants.state.length);
  console.log('Result keys:', Object.keys(result));
  
  return result;
}

// ============================================
// PARSE BUTTON TOKENS (OLD FORMAT - BACKWARD COMPATIBILITY)
// ============================================

function parseButtonTokensOld(buttonData) {
  console.log('parseButtonTokensOld called with:', buttonData);
  const buttons = buttonData.buttons || {};
  const config = buttonData.config || {};
  
  const defaultProps = buttons.default || {};
  const smallProps = buttons.small || {};
  
  // Parse button variants
  const buttonVariants = [];
  const textLinkVariants = (config.textLinks && config.textLinks.variants) ? config.textLinks.variants : [];
  
  console.log('Button variants to parse:', Object.keys(buttons));
  
  // Button variants mapping
  const variantMap = {
    'primary': { type: 'Fill', color: 'Primary' },
    'outline-primary': { type: 'Outline', color: 'Primary' },
    'secondary': { type: 'Fill', color: 'Secondary' },
    'outline-secondary': { type: 'Outline', color: 'Secondary' },
    'gray': { type: 'Fill', color: 'Gray' },
    'outline-gray': { type: 'Outline', color: 'Gray' },
    'white': { type: 'Fill', color: 'White' },
    'outline-white': { type: 'Outline', color: 'White' },
    'dark': { type: 'Fill', color: 'Dark' },
    'tertiary': { type: 'Fill', color: 'Tertiary' },
    'outline-tertiary': { type: 'Outline', color: 'Tertiary' }
  };
  
  // Parse each button variant
  for (const [key, value] of Object.entries(buttons)) {
    if (key === 'default' || key === 'small') continue;
    
    const mapping = variantMap[key];
    if (!mapping) continue;
    
    // Get default state
    const defaultState = {
      color: value.color || '#000000',
      backgroundColor: value['background-color'] || 'transparent',
      borderColor: value['border-color'] || 'transparent'
    };
    
    // Get hover state
    const hoverState = value.hover ? {
      color: value.hover.color || defaultState.color,
      backgroundColor: value.hover['background-color'] || defaultState.backgroundColor,
      borderColor: value.hover['border-color'] || defaultState.borderColor
    } : defaultState;
    
    // Get disable state (default if not provided)
    const disableState = value.disable ? {
      color: value.disable.color || '#cccccc',
      backgroundColor: value.disable['background-color'] || '#e0e0e0',
      borderColor: value.disable['border-color'] || '#e0e0e0'
    } : {
      color: '#cccccc',
      backgroundColor: '#e0e0e0',
      borderColor: '#e0e0e0'
    };
    
    buttonVariants.push({
      name: key,
      type: mapping.type,
      color: mapping.color,
      states: {
        default: defaultState,
        hover: hoverState,
        disable: disableState
      }
    });
  }
  
  // Parse text link variants
  const textLinks = [];
  for (const variant of textLinkVariants) {
    // Extract color from variant name (e.g., "text-link-primary" -> "Primary")
    const colorMatch = variant.match(/text-link-(.+)/);
    if (colorMatch) {
      const colorName = colorMatch[1].charAt(0).toUpperCase() + colorMatch[1].slice(1);
      textLinks.push({
        name: variant,
        color: colorName,
        states: {
          default: { color: '#6fb7e8' }, // Default colors, can be enhanced
          hover: { color: '#4a9fdc' },
          disable: { color: '#cccccc' }
        }
      });
    }
  }
  
  return {
    variants: buttonVariants,
    textLinks: textLinks,
    defaultProps: {
      paddingLeft: parseValue(defaultProps['padding-left'] || '2.75rem'),
      paddingRight: parseValue(defaultProps['padding-right'] || '2.75rem'),
      paddingTop: parseValue(defaultProps['padding-top'] || '20px'),
      paddingBottom: parseValue(defaultProps['padding-bottom'] || '20px'),
      fontWeight: defaultProps['font-weight'] || '700',
      borderRadius: parseValue(defaultProps['border-radius'] || '0.125rem'),
      borderWidth: parseValue(defaultProps['border-width'] || '2px')
    },
    smallProps: {
      paddingLeft: parseValue(smallProps['padding-left'] || '2rem'),
      paddingRight: parseValue(smallProps['padding-right'] || '2rem'),
      paddingTop: parseValue(smallProps['padding-top'] || '1rem'),
      paddingBottom: parseValue(smallProps['padding-bottom'] || '1rem')
    },
    config: {
      defaultText: (config.examples && config.examples.defaultText) ? config.examples.defaultText : 'Button',
      textLinkText: (config.examples && config.examples.textLinkText) ? config.examples.textLinkText : 'Text link',
      iconClass: (config.icon && config.icon.class) ? config.icon.class : 'icomoon icon-chevron-right'
    }
  };
}

function mapFontWeightToFigma(fontWeight) {
  // Map fontWeight from JSON to Figma font style
  // Handles: numeric values (e.g., "600"), spaced values (e.g., "semi bold"), case variations, and compound weights (e.g., "semibold italic")
  if (!fontWeight) return 'Regular';
  
  // Handle numeric font weights (e.g., "600", "700")
  const numericWeight = parseInt(fontWeight);
  if (!isNaN(numericWeight)) {
    const numericMap = {
      100: 'Thin',
      200: 'ExtraLight',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semibold',
      700: 'Bold',
      800: 'ExtraBold',
      900: 'Black'
    };
    return numericMap[numericWeight] || 'Regular';
  }
  
  // Normalize: remove spaces, hyphens, underscores and convert to lowercase
  // Handles: "semi bold", "semi-bold", "semi_bold", "SemiBold", "SEMIBOLD", etc.
  const normalized = String(fontWeight).replace(/[\s\-_]+/g, '').toLowerCase();
  
  // Check for italic variants first
  if (normalized.includes('italic')) {
    if (normalized.includes('semibold') || normalized.includes('semi')) {
      return 'Semibold Italic';
    } else if (normalized.includes('extrabold') || normalized.includes('ultrabold')) {
      return 'ExtraBold Italic';
    } else if (normalized.includes('bold')) {
      return 'Bold Italic';
    } else if (normalized.includes('medium')) {
      return 'Medium Italic';
    } else if (normalized.includes('extralight') || normalized.includes('ultralight')) {
      return 'ExtraLight Italic';
    } else if (normalized.includes('light')) {
      return 'Light Italic';
    } else if (normalized.includes('thin')) {
      return 'Thin Italic';
    } else if (normalized.includes('black') || normalized.includes('heavy')) {
      return 'Black Italic';
    } else {
      return 'Italic';
    }
  } else {
    // Non-italic weights - check normalized version
    // Handles all variations: "semibold", "semi bold", "Semi Bold", "SEMI BOLD", "semi-bold", etc.
    const fontWeightMap = {
      'regular': 'Regular',
      'normal': 'Regular',
      'semibold': 'Semibold',        // "semibold", "semi bold", "Semi Bold", "SEMI BOLD", "semi-bold", etc.
      'semi': 'Semibold',            // Short form
      'bold': 'Bold',
      'light': 'Light',
      'medium': 'Medium',
      'thin': 'Thin',
      'extralight': 'ExtraLight',    // "extralight", "extra light", "Extra Light", "extra-light", etc.
      'ultralight': 'ExtraLight',    // Alternative name
      'extrabold': 'ExtraBold',      // "extrabold", "extra bold", "Extra Bold", "extra-bold", etc.
      'ultrabold': 'ExtraBold',      // Alternative name
      'black': 'Black',
      'heavy': 'Black'               // Alternative name
    };
    return fontWeightMap[normalized] || 'Regular';
  }
}

function parseValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  // Remove px, rem, etc.
  const numStr = value.replace(/px|rem|em|%/g, '');
  const num = parseFloat(numStr);
  
  // Convert rem to px (assuming 16px base)
  if (value.includes('rem')) {
    return num * 16;
  }
  
  return isNaN(num) ? 0 : num;
}

// ============================================
// CREATE VARIABLES FROM PARSED TOKENS
// ============================================

// Helper function to get action for a specific item
function getItemAction(itemName, category, duplicateAction, selections) {
  if (selections && selections[category] && selections[category][itemName]) {
    return selections[category][itemName]; // 'skip' or 'overwrite'
  }
  return duplicateAction; // Fallback to default action
}

async function createVariablesFromParsedTokens(parsedTokens, prefix, duplicateAction = 'skip', selections = null) {
  // Create color variables
  if (parsedTokens.colors.length > 0) {
    await createColorVariablesFromParsedTokens(parsedTokens.colors, prefix, duplicateAction, selections);
  }

  // Create typography styles
  // Get color variables first (they should already be created)
  const colorVariables = figma.variables.getLocalVariables('COLOR');
  if (parsedTokens.typography.length > 0) {
    await createTypographyStylesFromParsedTokens(parsedTokens.typography, prefix, duplicateAction, selections, colorVariables);
  }
  
  // Create link styles from linksColors
  if (parsedTokens.linksColors) {
    await createLinkStylesFromParsedTokens(parsedTokens.linksColors, prefix, duplicateAction, colorVariables, selections);
  }

  // Create spacing variables
  if (parsedTokens.spacing.length > 0) {
    await createSpacingVariablesFromParsedTokens(parsedTokens.spacing, prefix, duplicateAction, selections);
  }

  // Create border variables
  if (parsedTokens.borders.radius.length > 0 || parsedTokens.borders.width.length > 0) {
    await createBorderVariablesFromParsedTokens(parsedTokens.borders, prefix, duplicateAction, selections);
  }

  // Create shadow effects
  if (parsedTokens.shadows.length > 0) {
    await createShadowEffectsFromParsedTokens(parsedTokens.shadows, prefix, duplicateAction, selections);
  }

  // Create breakpoint variables
  if (parsedTokens.breakpoints && parsedTokens.breakpoints.breakpoints && parsedTokens.breakpoints.breakpoints.length > 0) {
    await createBreakpointVariablesFromParsedTokens(parsedTokens.breakpoints.breakpoints, parsedTokens.breakpoints.containers || [], prefix, duplicateAction, selections);
  }
}

async function createColorVariablesFromParsedTokens(colors, prefix, duplicateAction, selections = null) {
  const collectionName = prefix ? `Colors - ${prefix}` : 'Colors';
  
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
  }

  const modeId = collection.modes[0].modeId;
  const existingVariables = figma.variables.getLocalVariables('COLOR')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  for (const color of colors) {
    if (color.hex === '#00000000' || color.hex === 'transparent') {
      // Skip transparent for now (Figma doesn't support transparent color variables directly)
      continue;
    }

    console.log(`Processing color: ${color.name}, description: ${color.description || '(none)'}`);

    const existingVariable = existingVariableMap.get(color.name);
    if (existingVariable) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(color.name, '🎨 Color Variables', duplicateAction, selections);
      if (itemAction === 'overwrite') {
        try {
          const rgb = hexToRgb(color.hex);
          existingVariable.setValueForMode(modeId, rgb);
          if (color.description) {
            existingVariable.description = color.description;
          }
        } catch (e) {
          console.error(`Failed to overwrite color variable ${color.name}:`, e);
        }
      } else {
        // Even when skipping, update description if it's missing or different
        try {
          if (color.description !== undefined && (!existingVariable.description || existingVariable.description !== color.description)) {
            existingVariable.description = color.description || '';
            console.log(`Updated description for existing color variable ${color.name}: ${color.description || '(empty)'}`);
          }
        } catch (e) {
          console.warn(`Failed to update description for color variable ${color.name}:`, e);
        }
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(color.name, collection, 'COLOR');
      const rgb = hexToRgb(color.hex);
      variable.setValueForMode(modeId, rgb);
      // Set description after creating variable (even if empty)
      try {
        variable.description = color.description || '';
        if (color.description) {
          console.log(`Set description for color variable ${color.name}: ${color.description}`);
        }
      } catch (descError) {
        console.warn(`Failed to set description for color variable ${color.name}:`, descError);
      }
      console.log(`Created color variable: ${color.name} = ${color.hex}`);
    } catch (e) {
      console.error(`Failed to create color variable ${color.name}:`, e);
    }
  }
}

async function createTypographyStylesFromParsedTokens(typography, prefix, duplicateAction, selections = null, colorVariables = []) {
  console.log(`Creating typography styles. Total: ${typography.length}`);
  const existingStyles = figma.getLocalTextStyles();
  const existingStyleMap = new Map(existingStyles.map(s => [s.name, s]));

  // Find body style to get default fontFamily
  console.log('=== DEBUG: Finding body styles ===');
  console.log('Total typography styles:', typography.length);
  console.log('Typography style names:', typography.map(s => s.name));
  
  const bodyStyles = typography.filter(s => {
    const nameParts = s.name.split('/');
    const styleName = nameParts.length > 1 ? nameParts[1] : nameParts[0];
    const isBody = styleName.toLowerCase() === 'body';
    if (isBody) {
      console.log(`Found body style: ${s.name}, breakpoint: ${s.breakpoint}, fontFamily: ${s.fontFamily}`);
    }
    return isBody;
  });

  console.log(`Found ${bodyStyles.length} body style(s)`);

  // Create a map of breakpoint -> fontFamily from body
  const bodyFontFamilyMap = new Map();
  // Create a map of breakpoint -> color from body
  const bodyColorMap = new Map();
  for (const bodyStyle of bodyStyles) {
    const breakpoint = bodyStyle.breakpoint || 'mobile';
    console.log(`Processing body style: ${bodyStyle.name}, breakpoint: ${breakpoint}, fontFamily: ${bodyStyle.fontFamily || '(none)'}, color: ${bodyStyle.color || '(none)'}`);
    if (bodyStyle.fontFamily) {
      bodyFontFamilyMap.set(breakpoint, bodyStyle.fontFamily);
      console.log(`Added to map: ${breakpoint} -> ${bodyStyle.fontFamily}`);
    } else {
      console.warn(`Body style ${bodyStyle.name} (${breakpoint}) does not have fontFamily!`);
    }
    if (bodyStyle.color) {
      bodyColorMap.set(breakpoint, bodyStyle.color);
      console.log(`Added color to map: ${breakpoint} -> ${bodyStyle.color}`);
    }
  }

  console.log('Body fontFamily map:', Array.from(bodyFontFamilyMap.entries()));
  console.log('Body color map:', Array.from(bodyColorMap.entries()));

  // Check if body has fontFamily for at least one breakpoint
  if (bodyFontFamilyMap.size === 0 && bodyStyles.length > 0) {
    console.error('ERROR: Body styles found but none have fontFamily!');
    figma.ui.postMessage({
      type: 'status',
      message: 'Error: Body style does not have fontFamily defined. Please add fontFamily to body style in your tokens.',
      error: true
    });
    return;
  }

  // Check if body has fontFamily for at least one breakpoint - required!
  if (bodyFontFamilyMap.size === 0) {
    console.error('ERROR: Body style does not have fontFamily defined for any breakpoint!');
    figma.ui.postMessage({
      type: 'status',
      message: 'Error: Body style does not have fontFamily defined. Please add fontFamily to body style in your tokens.',
      error: true
    });
    return;
  }
  
  console.log(`Body fontFamily available for breakpoints: ${Array.from(bodyFontFamilyMap.keys()).join(', ')}`);

  // Create color variable map
  const colorVariableMap = new Map(colorVariables.map(v => [v.name, v]));
  console.log(`[TYPOGRAPHY COLOR] Total color variables available: ${colorVariables.length}`);

  for (const style of typography) {
    // Build style name with prefix
    let styleName = style.name;
    if (prefix) {
      // Format: "Desktop - Prefix/H1" or "Mobile - Prefix/H1"
      if (style.name.includes('/')) {
        const [breakpoint, name] = style.name.split('/');
        styleName = `${breakpoint} - ${prefix}/${name}`;
      } else {
        styleName = `${prefix}/${style.name}`;
      }
    }

    // Get fontFamily: use style's fontFamily, or body's fontFamily for same breakpoint
    // If body doesn't have fontFamily for this breakpoint, stop and show error
    let fontFamily = style.fontFamily;
    const breakpoint = style.breakpoint || 'mobile';
    console.log(`DEBUG ${styleName}: style.fontFamily=${style.fontFamily || '(none)'}, breakpoint=${breakpoint}`);
    
    if (!fontFamily) {
      // Try exact breakpoint first, then fallback to any available breakpoint (desktop > tablet > mobile)
      const bodyFontFamily = bodyFontFamilyMap.get(breakpoint)
        || bodyFontFamilyMap.get('desktop')
        || bodyFontFamilyMap.get('tablet')
        || bodyFontFamilyMap.get('mobile');
      console.log(`DEBUG ${styleName}: bodyFontFamilyMap.get('${breakpoint}')=${bodyFontFamily || '(none)'}`);
      if (bodyFontFamily) {
        fontFamily = bodyFontFamily;
        console.log(`Style ${styleName} missing fontFamily, using body's fontFamily for ${breakpoint}: ${fontFamily}`);
      } else {
        // Body doesn't have fontFamily for this breakpoint - stop!
        console.error(`ERROR: Style ${styleName} (${breakpoint}) missing fontFamily and body doesn't have fontFamily for ${breakpoint}`);
        figma.ui.postMessage({
          type: 'status',
          message: `Error: Style ${styleName} (${breakpoint}) is missing fontFamily and body style doesn't have fontFamily for ${breakpoint}. Please add fontFamily to body style for ${breakpoint} in your tokens.`,
          error: true
        });
        return;
      }
    } else {
      console.log(`Style ${styleName} has explicit fontFamily: ${fontFamily}`);
    }

    // Get color: use style's color, or body's color (try same breakpoint, then fallback)
    let color = style.color;
    if (!color) {
      const bodyColor = bodyColorMap.get(breakpoint)
        || bodyColorMap.get('desktop')
        || bodyColorMap.get('tablet')
        || bodyColorMap.get('mobile');
      if (bodyColor) {
        color = bodyColor;
        console.log(`Style ${styleName} missing color, using body's color for ${breakpoint}: ${color}`);
      }
    }

    console.log(`Processing style: ${styleName}, fontSize: ${style.fontSize}, fontFamily: ${fontFamily}, fontWeight: ${style.fontWeight}, color: ${color || '(none)'}`);

    const existingStyle = existingStyleMap.get(styleName);
    if (existingStyle) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
      if (itemAction === 'skip') {
      console.log(`Skipping existing style: ${styleName}`);
      continue;
      }
      // If overwrite, continue to update the style below
    }

    // Map fontWeight using helper function
    const figmaFontWeight = mapFontWeightToFigma(style.fontWeight);
    console.log(`Mapped fontWeight: "${style.fontWeight}" -> "${figmaFontWeight}"`);

    // For Inter font, try alternative names first (Inter uses "Semi Bold" not "Semibold")
    let fontName = { family: fontFamily, style: figmaFontWeight };
    let fontLoaded = false;
    
    // Special handling for Inter font - try common alternative names first
    if (fontFamily === 'Inter' && figmaFontWeight === 'Semibold') {
      // Inter uses "Semi Bold" (with space), try that first
      try {
        await figma.loadFontAsync({ family: fontFamily, style: 'Semi Bold' });
        fontName = { family: fontFamily, style: 'Semi Bold' };
        fontLoaded = true;
      } catch (e) {
        // Continue to try "Semibold" below
      }
    } else if (fontFamily === 'Inter' && figmaFontWeight === 'ExtraBold') {
      // Inter might use "Extra Bold" (with space), try that first
      try {
        await figma.loadFontAsync({ family: fontFamily, style: 'Extra Bold' });
        fontName = { family: fontFamily, style: 'Extra Bold' };
        fontLoaded = true;
      } catch (e) {
        // Continue to try "ExtraBold" below
      }
    } else if (fontFamily === 'Inter' && figmaFontWeight === 'ExtraLight') {
      // Inter might use "Extra Light" (with space), try that first
      try {
        await figma.loadFontAsync({ family: fontFamily, style: 'Extra Light' });
        fontName = { family: fontFamily, style: 'Extra Light' };
        fontLoaded = true;
      } catch (e) {
        // Continue to try "ExtraLight" below
      }
    } else if (figmaFontWeight === 'Semibold Italic') {
      // Try alternative names for Semibold Italic (some fonts use "Semi Bold Italic" with space)
      try {
        await figma.loadFontAsync({ family: fontFamily, style: 'Semi Bold Italic' });
        fontName = { family: fontFamily, style: 'Semi Bold Italic' };
        fontLoaded = true;
      } catch (e) {
        // Continue to try "Semibold Italic" below
      }
    }

    // Try the mapped font weight if not already loaded
    if (!fontLoaded) {
      try {
        await figma.loadFontAsync(fontName);
        fontLoaded = true;
        console.log(`✓ Successfully loaded font: ${fontName.family} ${fontName.style}`);
      } catch (e) {
        // Try fallbacks - try similar weights first, then lighter weights
        const fallbacks = [];
        
        // If trying Semibold, also try alternative names (with space, different case)
        if (figmaFontWeight === 'Semibold') {
          fallbacks.push(
            { family: fontFamily, style: 'Semi Bold' },
            { family: fontFamily, style: 'SemiBold' },
            { family: fontFamily, style: 'semibold' }
          );
        }
        
        // If trying ExtraBold, try alternative names and similar heavy weights
        if (figmaFontWeight === 'ExtraBold') {
          fallbacks.push(
            { family: fontFamily, style: 'Extra Bold' },  // With space
            { family: fontFamily, style: 'extrabold' },  // Lowercase
            { family: fontFamily, style: 'Black' },
            { family: fontFamily, style: 'Bold' },
            { family: fontFamily, style: 'Semibold' }
          );
        }
        
        // If trying ExtraLight, try alternative names and similar light weights
        if (figmaFontWeight === 'ExtraLight') {
          fallbacks.push(
            { family: fontFamily, style: 'Extra Light' },  // With space
            { family: fontFamily, style: 'extralight' },    // Lowercase
            { family: fontFamily, style: 'Light' },
            { family: fontFamily, style: 'Thin' }
          );
        }
        
        // If trying Bold, try similar weights
        if (figmaFontWeight === 'Bold') {
          fallbacks.push(
            { family: fontFamily, style: 'ExtraBold' },
            { family: fontFamily, style: 'Semibold' },
            { family: fontFamily, style: 'Medium' }
          );
        }
        
        // Standard fallbacks - try lighter weights
        // But don't fallback to non-italic if trying to load italic font
        const isItalic = figmaFontWeight.includes('Italic') || figmaFontWeight.includes('italic');
        if (!isItalic) {
        if (figmaFontWeight !== 'Regular' && figmaFontWeight !== 'Medium') {
          fallbacks.push(
            { family: fontFamily, style: 'Medium' },
            { family: fontFamily, style: 'Regular' }
          );
        } else {
          // If already trying Regular or Medium, just try the other one
          fallbacks.push(
            { family: fontFamily, style: figmaFontWeight === 'Regular' ? 'Medium' : 'Regular' }
          );
          }
        } else {
          // For italic fonts, try alternative italic names but don't fallback to non-italic
          if (figmaFontWeight === 'Semibold Italic') {
            fallbacks.push(
              { family: fontFamily, style: 'Semi Bold Italic' },
              { family: fontFamily, style: 'SemiBold Italic' }
            );
          }
          // Don't fallback to non-italic - if italic font not found, should error
        }

        for (const fallback of fallbacks) {
          try {
            await figma.loadFontAsync(fallback);
            fontName.family = fallback.family;
            fontName.style = fallback.style;
            fontLoaded = true;
            // Only log fallback if it's different from what we tried first
            if (fallback.style !== figmaFontWeight) {
              console.log(`Using fallback font: ${fallback.family} ${fallback.style} (instead of ${figmaFontWeight})`);
            }
            break;
          } catch (fallbackError) {
            // Continue
          }
        }
      }
    } else {
      // Font already loaded with alternative name
      console.log(`✓ Successfully loaded font: ${fontName.family} ${fontName.style}`);
    }

    if (!fontLoaded) {
      console.error(`Could not load font for style: ${styleName} (fontFamily: ${fontFamily}, style: ${figmaFontWeight})`);
      figma.ui.postMessage({
        type: 'status',
        message: `Error: Could not load font "${fontFamily} ${figmaFontWeight}" for style ${styleName}. Please check if the font is available in Figma.`,
        error: true
      });
      continue;
    }

    try {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
      
      let textStyle = null;
      if (existingStyle && itemAction === 'overwrite') {
        textStyle = existingStyle;
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : parseValue(style.fontSize);
        textStyle.fontName = fontName;
        textStyle.fontSize = fontSize;
        if (style.lineHeight) {
          if (style.lineHeight === 'auto' || style.lineHeight === 'Auto') {
            textStyle.lineHeight = { unit: 'AUTO' };
          } else if (String(style.lineHeight).endsWith('%')) {
            textStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PERCENT' };
          } else {
            textStyle.lineHeight = { value: parseValue(style.lineHeight), unit: 'PIXELS' };
          }
        }
        if (style.letterSpacing) {
          if (String(style.letterSpacing).endsWith('%')) {
            textStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PERCENT' };
          } else {
            textStyle.letterSpacing = { value: parseValue(style.letterSpacing), unit: 'PIXELS' };
          }
        }
      } else if (!existingStyle || itemAction === 'overwrite') {
        // Ensure fontSize is a number
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : parseValue(style.fontSize);
        if (!fontSize || fontSize <= 0) {
          console.error(`Invalid fontSize for ${styleName}: ${style.fontSize}`);
          continue;
        }

        textStyle = existingStyle && itemAction === 'overwrite' ? existingStyle : figma.createTextStyle();
        textStyle.name = styleName;
        textStyle.fontName = fontName;
        textStyle.fontSize = fontSize;

        if (style.lineHeight) {
          if (style.lineHeight === 'auto' || style.lineHeight === 'Auto') {
            textStyle.lineHeight = { unit: 'AUTO' };
          } else if (String(style.lineHeight).endsWith('%')) {
            textStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PERCENT' };
          } else {
            textStyle.lineHeight = { value: parseValue(style.lineHeight), unit: 'PIXELS' };
          }
        }

        if (style.letterSpacing) {
          if (String(style.letterSpacing).endsWith('%')) {
            textStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PERCENT' };
          } else {
            textStyle.letterSpacing = { value: parseValue(style.letterSpacing), unit: 'PIXELS' };
          }
        }
      } else {
        // Skip existing style
        console.log(`Skipping existing style: ${styleName}`);
        continue;
      }

      // Note: Text styles in Figma don't support fills property
      // Color will be set on text nodes in the layout instead
      // When exporting, color will be extracted from text nodes using this style
      if (color) {
        console.log(`[TYPOGRAPHY COLOR] Color ${color} will be applied to text nodes in layout for style ${styleName}`);
      } else {
        console.log(`[TYPOGRAPHY COLOR] No color specified for ${styleName} (neither in style nor inherited from body)`);
      }

      console.log(`Created text style: ${styleName}`);
    } catch (e) {
      console.error(`Failed to create text style ${styleName}:`, e);
    }
  }
}

async function createLinkStylesFromParsedTokens(linksColors, prefix, duplicateAction, colorVariables = [], selections = null) {
  console.log('Creating link styles from linksColors...');
  
  const existingStyles = figma.getLocalTextStyles();
  const existingStyleMap = new Map(existingStyles.map(s => [s.name, s]));
  
  // Get body fontFamily for default font-weight
  const bodyStyles = existingStyles.filter(s => {
    const name = s.name.toLowerCase();
    return name.includes('body') && (name.includes('mobile') || !name.includes('/'));
  });
  
  let defaultFontFamily = 'Inter';
  let defaultFontWeight = 'Regular';
  if (bodyStyles.length > 0) {
    const bodyStyle = bodyStyles[0];
    if (bodyStyle.fontName) {
      defaultFontFamily = bodyStyle.fontName.family;
      defaultFontWeight = bodyStyle.fontName.style;
    }
  }
  
  // Create color variable map
  const colorVariableMap = new Map(colorVariables.map(v => [v.name, v]));
  
  // Create Link/Default style
  if (linksColors.color) {
    const styleName = prefix ? `${prefix}/Link/Default` : 'Link/Default';
    const existingStyle = existingStyleMap.get(styleName);
    
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
      if (existingStyle && itemAction === 'skip') {
      console.log(`[UPDATE EXISTING] Skipping existing link style: ${styleName} - but updating description with color`);
      // Update description to include color
      const description = buildLinkDescription({
        color: linksColors.color,
        underline: linksColors.underline || 'none',
        fontWeight: linksColors['font-weight'] || 'inherit'
      });
      existingStyle.description = description;
      console.log(`[UPDATE EXISTING] Updated description for ${styleName}: ${description}`);
    } else {
      try {
        // Load font
        await figma.loadFontAsync({ family: defaultFontFamily, style: defaultFontWeight });
        
        // Build description (include color)
        const description = buildLinkDescription({
          color: linksColors.color,
          underline: linksColors.underline || 'none',
          fontWeight: linksColors['font-weight'] || 'inherit'
        });
        
        // Create text style
        const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
        const textStyle = existingStyle && itemAction === 'overwrite' 
          ? existingStyle 
          : figma.createTextStyle();
        
        textStyle.name = styleName;
        textStyle.fontName = { family: defaultFontFamily, style: defaultFontWeight };
        textStyle.fontSize = 16; // Default body size
        textStyle.description = description;
        
        // Set color - map with variable if found
        // Clear existing fills first to ensure clean state
        console.log(`[SET COLOR] Starting to set color for ${styleName}, hex: ${linksColors.color}`);
        textStyle.fills = [];
        console.log(`[SET COLOR] Cleared fills, current fills:`, textStyle.fills);
        
        const colorVariable = findColorVariableByHex(linksColors.color, colorVariableMap);
        const rgbColor = hexToRgb(linksColors.color);
        console.log(`[SET COLOR] Found variable:`, colorVariable ? colorVariable.name : 'none', `RGB:`, rgbColor);
        
        if (colorVariable) {
          try {
            const paintObj = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
            const boundPaint = figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVariable);
            console.log(`[SET COLOR] Paint object after binding:`, boundPaint);
            console.log(`[SET COLOR] boundVariables:`, boundPaint.boundVariables);
            textStyle.fills = [boundPaint];
            console.log(`[SET COLOR] Set fills to textStyle, current fills:`, textStyle.fills);
            console.log(`[SET COLOR] Fills boundVariables:`, textStyle.fills[0] && textStyle.fills[0].boundVariables);
            console.log(`[SET COLOR] Successfully bound variable ${colorVariable.name} to link style ${styleName} for color ${linksColors.color}`);
          } catch (e) {
            console.warn(`[SET COLOR] Failed to bind variable ${colorVariable.name}:`, e);
            textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
            console.log(`[SET COLOR] Fallback: Set fills with hex color:`, textStyle.fills);
          }
        } else {
          console.log(`[SET COLOR] No variable found for ${linksColors.color}, using hex color directly`);
          textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
          console.log(`[SET COLOR] Set fills with hex color:`, textStyle.fills);
        }
        
        // Verify fills after setting
        console.log(`[SET COLOR] Final fills for ${styleName}:`, textStyle.fills);
        
        // Set lineHeight (use body's lineHeight if available)
        if (bodyStyles.length > 0 && bodyStyles[0].lineHeight) {
          textStyle.lineHeight = bodyStyles[0].lineHeight;
        }
        
        console.log(`Created link style: ${styleName}`);
      } catch (e) {
        console.error(`Failed to create link style ${styleName}:`, e);
      }
    }
  }
  
  // Create Link/Hover style
  if (linksColors.hover && linksColors.hover.color) {
    const styleName = prefix ? `${prefix}/Link/Hover` : 'Link/Hover';
    const existingStyle = existingStyleMap.get(styleName);
    
    // Check if there's a specific selection for this item
    const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
    if (existingStyle && itemAction === 'skip') {
      console.log(`Skipping existing link style: ${styleName} - but updating description with color`);
      // Update description to include color
      const description = buildLinkDescription({
        color: linksColors.hover.color,
        underline: linksColors.hover.underline,
        underlineOffset: linksColors.hover['underline-offset']
      });
      existingStyle.description = description;
      console.log(`Updated description for ${styleName}: ${description}`);
    } else {
      try {
        // Load font
        await figma.loadFontAsync({ family: defaultFontFamily, style: defaultFontWeight });
        
        // Build description (include color)
        const description = buildLinkDescription({
          color: linksColors.hover.color,
          underline: linksColors.hover.underline,
          underlineOffset: linksColors.hover['underline-offset']
        });
        
        // Create text style
        const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
        const textStyle = existingStyle && itemAction === 'overwrite' 
          ? existingStyle 
          : figma.createTextStyle();
        
        textStyle.name = styleName;
        textStyle.fontName = { family: defaultFontFamily, style: defaultFontWeight };
        textStyle.fontSize = 16; // Default body size
        textStyle.description = description;
        
        // Set color - map with variable if found
        const colorVariable = findColorVariableByHex(linksColors.hover.color, colorVariableMap);
        const rgbColor = hexToRgb(linksColors.hover.color);
        
        if (colorVariable) {
          try {
            const paintObj = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
            figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVariable);
            textStyle.fills = [paintObj];
            console.log(`Bound variable ${colorVariable.name} to link style ${styleName}`);
          } catch (e) {
            console.warn(`Failed to bind variable ${colorVariable.name}:`, e);
            textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
          }
        } else {
          textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
        }
        
        // Set lineHeight (use body's lineHeight if available)
        if (bodyStyles.length > 0 && bodyStyles[0].lineHeight) {
          textStyle.lineHeight = bodyStyles[0].lineHeight;
        }
        
        console.log(`Created link style: ${styleName}`);
      } catch (e) {
        console.error(`Failed to create link style ${styleName}:`, e);
      }
    }
  }
  
  // Create Link/Focus style
  if (linksColors.focus && linksColors.focus.color) {
    const styleName = prefix ? `${prefix}/Link/Focus` : 'Link/Focus';
    const existingStyle = existingStyleMap.get(styleName);
    
    // Check if there's a specific selection for this item
    const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
    if (existingStyle && itemAction === 'skip') {
      console.log(`Skipping existing link style: ${styleName} - but updating description with color`);
      // Update description to include color
      const description = buildLinkDescription({
        color: linksColors.focus.color,
        outlineOffset: linksColors.focus['outline-offset']
      });
      existingStyle.description = description;
      console.log(`Updated description for ${styleName}: ${description}`);
    } else {
      try {
        // Load font
        await figma.loadFontAsync({ family: defaultFontFamily, style: defaultFontWeight });
        
        // Build description (include color)
        const description = buildLinkDescription({
          color: linksColors.focus.color,
          outlineOffset: linksColors.focus['outline-offset']
        });
        
        // Create text style
        const itemAction = getItemAction(styleName, '✍️ Text Styles', duplicateAction, selections);
        const textStyle = existingStyle && itemAction === 'overwrite' 
          ? existingStyle 
          : figma.createTextStyle();
        
        textStyle.name = styleName;
        textStyle.fontName = { family: defaultFontFamily, style: defaultFontWeight };
        textStyle.fontSize = 16; // Default body size
        textStyle.description = description;
        
        // Set color - map with variable if found
        const colorVariable = findColorVariableByHex(linksColors.focus.color, colorVariableMap);
        const rgbColor = hexToRgb(linksColors.focus.color);
        
        if (colorVariable) {
          try {
            const paintObj = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
            figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVariable);
            textStyle.fills = [paintObj];
            console.log(`Bound variable ${colorVariable.name} to link style ${styleName}`);
          } catch (e) {
            console.warn(`Failed to bind variable ${colorVariable.name}:`, e);
            textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
          }
        } else {
          textStyle.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
        }
        
        // Set lineHeight (use body's lineHeight if available)
        if (bodyStyles.length > 0 && bodyStyles[0].lineHeight) {
          textStyle.lineHeight = bodyStyles[0].lineHeight;
        }
        
        console.log(`Created link style: ${styleName}`);
      } catch (e) {
        console.error(`Failed to create link style ${styleName}:`, e);
      }
    }
  }
}

function buildLinkDescription(properties) {
  const parts = [];
  
  if (properties.color !== undefined) {
    parts.push(`color: ${properties.color}`);
  }
  
  if (properties.underline !== undefined) {
    parts.push(`underline: ${properties.underline}`);
  }
  
  if (properties.underlineOffset !== undefined) {
    parts.push(`underline-offset: ${properties.underlineOffset}`);
  }
  
  if (properties.outlineOffset !== undefined) {
    parts.push(`outline-offset: ${properties.outlineOffset}`);
  }
  
  if (properties.fontWeight !== undefined) {
    parts.push(`font-weight: ${properties.fontWeight}`);
  }
  
  return parts.join(', ');
}

async function createSpacingVariablesFromParsedTokens(spacing, prefix, duplicateAction, selections = null) {
  const collectionName = prefix ? `Spacing - ${prefix}` : 'Spacing';
  
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
  }

  // Setup modes: Mobile, Tablet, Desktop
  const modes = {};
  const defaultMode = collection.modes[0];
  collection.renameMode(defaultMode.modeId, 'Mobile');
  modes['Mobile'] = defaultMode.modeId;

  const existingModeNames = collection.modes.map(m => m.name);
  if (!existingModeNames.includes('Tablet')) {
    const tabletModeId = collection.addMode('Tablet');
    modes['Tablet'] = tabletModeId;
  } else {
    modes['Tablet'] = collection.modes.find(m => m.name === 'Tablet').modeId;
  }

  if (!existingModeNames.includes('Desktop')) {
    const desktopModeId = collection.addMode('Desktop');
    modes['Desktop'] = desktopModeId;
  } else {
    modes['Desktop'] = collection.modes.find(m => m.name === 'Desktop').modeId;
  }

  const existingVariables = figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  for (const spacingItem of spacing) {
    const variableName = spacingItem.name;
    const existingVariable = existingVariableMap.get(variableName);

    if (existingVariable) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(variableName, '📏 Spacing Variables', duplicateAction, selections);
      if (itemAction === 'overwrite') {
        try {
          existingVariable.setValueForMode(modes['Mobile'], spacingItem.mobile);
          existingVariable.setValueForMode(modes['Tablet'], spacingItem.tablet);
          existingVariable.setValueForMode(modes['Desktop'], spacingItem.desktop);
        } catch (e) {
          console.error(`Failed to overwrite spacing variable ${variableName}:`, e);
        }
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'FLOAT');
      variable.setValueForMode(modes['Mobile'], spacingItem.mobile);
      variable.setValueForMode(modes['Tablet'], spacingItem.tablet);
      variable.setValueForMode(modes['Desktop'], spacingItem.desktop);
      console.log(`Created spacing variable: ${variableName}`);
    } catch (e) {
      console.error(`Failed to create spacing variable ${variableName}:`, e);
    }
  }
}

async function createBorderVariablesFromParsedTokens(borders, prefix, duplicateAction, selections = null) {
  const collectionName = prefix ? `Border - ${prefix}` : 'Border';
  
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
  }

  const modeId = collection.modes[0].modeId;
  const existingVariables = figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  // Create radius variables
  for (const radius of borders.radius) {
    const variableName = `radius/${radius.name}`;
    const existingVariable = existingVariableMap.get(variableName);
    
    if (existingVariable) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(`Radius: ${radius.name}`, '🔲 Border Variables', duplicateAction, selections);
      if (itemAction === 'overwrite') {
        try {
          existingVariable.setValueForMode(modeId, radius.value);
          if (radius.description) {
            existingVariable.description = radius.description;
          }
        } catch (e) {
          console.error(`Failed to overwrite border radius variable ${variableName}:`, e);
        }
      } else {
        // Even when skipping, update description if it's missing or different
        try {
          if (radius.description && (!existingVariable.description || existingVariable.description !== radius.description)) {
            existingVariable.description = radius.description;
          }
        } catch (e) {
          console.warn(`Failed to update description for border radius variable ${variableName}:`, e);
        }
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'FLOAT');
      variable.setValueForMode(modeId, radius.value);
      if (radius.description) {
        variable.description = radius.description;
      }
      console.log(`Created border radius variable: ${variableName} = ${radius.value}`);
    } catch (e) {
      console.error(`Failed to create border radius variable ${variableName}:`, e);
    }
  }

  // Create width variables
  for (const width of borders.width) {
    const variableName = `width/${width.name}`;
    const existingVariable = existingVariableMap.get(variableName);
    
    if (existingVariable) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(`Width: ${width.name}`, '🔲 Border Variables', duplicateAction, selections);
      if (itemAction === 'overwrite') {
        try {
          existingVariable.setValueForMode(modeId, width.value);
          if (width.description) {
            existingVariable.description = width.description;
          }
        } catch (e) {
          console.error(`Failed to overwrite border width variable ${variableName}:`, e);
        }
      } else {
        // Even when skipping, update description if it's missing or different
        try {
          if (width.description && (!existingVariable.description || existingVariable.description !== width.description)) {
            existingVariable.description = width.description;
          }
        } catch (e) {
          console.warn(`Failed to update description for border width variable ${variableName}:`, e);
        }
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'FLOAT');
      variable.setValueForMode(modeId, width.value);
      if (width.description) {
        variable.description = width.description;
      }
      console.log(`Created border width variable: ${variableName} = ${width.value}`);
    } catch (e) {
      console.error(`Failed to create border width variable ${variableName}:`, e);
    }
  }
}

async function createShadowEffectsFromParsedTokens(shadows, prefix, duplicateAction, selections = null) {
  const existingEffects = figma.getLocalEffectStyles();
  const existingEffectMap = new Map(existingEffects.map(s => [s.name, s]));

  for (const shadow of shadows) {
    // Format: "shadow - {prefix}/{name}" to group by shadow type first
    const styleName = prefix ? `shadow - ${prefix}/${shadow.name}` : `shadow/${shadow.name}`;
    const existingStyle = existingEffectMap.get(styleName);
    
    if (existingStyle) {
      // Check if there's a specific selection for this item
      const itemAction = getItemAction(styleName, 'Shadow Effects', duplicateAction, selections);
      if (itemAction === 'skip') {
      continue;
      }
      // If overwrite, continue to update the style below
    }

    // Handle "none" shadow - create empty effects array
    let effects = [];
    if (shadow.value === '0 0 #0000' || shadow.name === 'none') {
      // None shadow - empty effects
      effects = [];
    } else {
      // Parse CSS shadow string to Figma Effect
      effects = parseShadowString(shadow.value);
      if (effects.length === 0) {
        console.warn(`Could not parse shadow: ${shadow.value}`);
        continue;
      }
    }

    try {
      if (existingStyle && duplicateAction === 'overwrite') {
        existingStyle.effects = effects;
        if (shadow.description) {
          existingStyle.description = shadow.description;
        }
      } else {
        const effectStyle = figma.createEffectStyle();
        effectStyle.name = styleName;
        effectStyle.effects = effects;
        if (shadow.description) {
          effectStyle.description = shadow.description;
        }
        console.log(`Created shadow effect: ${styleName}`);
      }
    } catch (e) {
      console.error(`Failed to create shadow effect ${styleName}:`, e);
    }
  }
}

function parseShadowString(shadowStr) {
  // Parse CSS shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)"
  // Format: offsetX offsetY blur spread color
  const effects = [];
  
  // Skip invalid shadows
  if (!shadowStr || shadowStr === '0 0 #0000' || shadowStr.trim() === '') {
    return effects;
  }
  
  // Split multiple shadows by comma
  const shadowParts = shadowStr.split(',');
  
  for (let i = 0; i < shadowParts.length; i++) {
    const part = shadowParts[i].trim();
    if (!part || part === '#0000') continue;
    
    // Match pattern: offsetX offsetY blur [spread] color
    const match = part.match(/(-?\d+(?:\.\d+)?(?:px|rem|em)?)\s+(-?\d+(?:\.\d+)?(?:px|rem|em)?)\s+(-?\d+(?:\.\d+)?(?:px|rem|em)?)\s*(-?\d+(?:\.\d+)?(?:px|rem|em)?)?\s*(.*)/);
    
    if (match) {
      const offsetX = parseValue(match[1] || '0');
      const offsetY = parseValue(match[2] || '0');
      const blur = parseValue(match[3] || '0');
      const spread = match[4] ? parseValue(match[4]) : 0;
      const colorStr = (match[5] || 'rgb(0 0 0 / 0.1)').trim();
      
      // Parse color - handle rgb(0 0 0 / 0.05) format
      let r = 0, g = 0, b = 0, a = 0.1;
      
      if (colorStr.includes('rgb')) {
        const colorMatch = colorStr.match(/rgba?\(([^)]+)\)/);
        if (colorMatch) {
          const values = colorMatch[1].split(/[\s\/,]+/).filter(v => v !== '');
          if (values.length >= 3) {
            r = parseFloat(values[0]) / 255;
            g = parseFloat(values[1]) / 255;
            b = parseFloat(values[2]) / 255;
            if (values.length >= 4) {
              a = parseFloat(values[3]);
            } else if (colorStr.includes('/')) {
              // Handle rgb(0 0 0 / 0.05) format
              const alphaMatch = colorStr.match(/\/(\s*[\d.]+)/);
              if (alphaMatch) {
                a = parseFloat(alphaMatch[1]);
              }
            }
          }
        }
      } else if (colorStr === '#0000' || colorStr === '#00000000') {
        a = 0;
      }
      
      // Ensure values are valid numbers
      if (isNaN(offsetX) || isNaN(offsetY) || isNaN(blur) || isNaN(spread)) {
        continue;
      }
      
      // Create effect object with correct Figma format
      const effect = {
        type: 'DROP_SHADOW',
        color: { r: r, g: g, b: b, a: a },
        offset: { x: offsetX, y: offsetY },
        radius: blur,
        spread: spread,
        visible: true,
        blendMode: 'NORMAL'
      };
      
      effects.push(effect);
    }
  }
  
  return effects;
}

async function createBreakpointVariablesFromParsedTokens(breakpoints, containers, prefix, duplicateAction, selections = null) {
  const collectionName = prefix ? `Breakpoint - ${prefix}` : 'Breakpoint';
  const containerCollectionName = prefix ? `Container - ${prefix}` : 'Container';
  
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
  }

  let containerCollection = figma.variables.getLocalVariableCollections().find(c => c.name === containerCollectionName);
  if (!containerCollection && containers.length > 0) {
    containerCollection = figma.variables.createVariableCollection(containerCollectionName);
  }

  const modeId = collection.modes[0].modeId;
  const containerModeId = containerCollection ? containerCollection.modes[0].modeId : null;
  
  const existingVariables = figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  const existingContainerVariables = containerCollection ? figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === containerCollection.id) : [];
  const existingContainerVariableMap = new Map(existingContainerVariables.map(v => [v.name, v]));

  // Create breakpoint variables (value and max)
  for (const bp of breakpoints) {
    // Create value variable
    const valueVariableName = bp.name;
    const existingValueVariable = existingVariableMap.get(valueVariableName);
    
    // Parse value (remove 'px' if present)
    const minValue = parseValue(bp.value);
    
    if (existingValueVariable) {
      if (duplicateAction === 'overwrite') {
        try {
          existingValueVariable.setValueForMode(modeId, minValue);
          if (bp.description) {
            existingValueVariable.description = bp.description;
          }
        } catch (e) {
          console.error(`Failed to overwrite breakpoint variable ${valueVariableName}:`, e);
        }
      } else {
        try {
          if (bp.description && (!existingValueVariable.description || existingValueVariable.description !== bp.description)) {
            existingValueVariable.description = bp.description;
          }
        } catch (e) {
          console.warn(`Failed to update description for breakpoint variable ${valueVariableName}:`, e);
        }
      }
    } else {
    try {
        const variable = figma.variables.createVariable(valueVariableName, collection, 'FLOAT');
      variable.setValueForMode(modeId, minValue);
      if (bp.description) {
        variable.description = bp.description;
      }
        console.log(`Created breakpoint variable: ${valueVariableName} = ${minValue}`);
    } catch (e) {
        console.error(`Failed to create breakpoint variable ${valueVariableName}:`, e);
      }
    }

    // Create max variable if max is defined and not 'none'
    if (bp.max && bp.max !== 'none') {
      const maxVariableName = `${bp.name}/max`;
      const existingMaxVariable = existingVariableMap.get(maxVariableName);
      const maxValue = parseValue(bp.max);
      
      if (existingMaxVariable) {
        if (duplicateAction === 'overwrite') {
          try {
            existingMaxVariable.setValueForMode(modeId, maxValue);
          } catch (e) {
            console.error(`Failed to overwrite breakpoint max variable ${maxVariableName}:`, e);
          }
        }
      } else {
        try {
          const variable = figma.variables.createVariable(maxVariableName, collection, 'FLOAT');
          variable.setValueForMode(modeId, maxValue);
          console.log(`Created breakpoint max variable: ${maxVariableName} = ${maxValue}`);
        } catch (e) {
          console.error(`Failed to create breakpoint max variable ${maxVariableName}:`, e);
        }
      }
    }
  }

  // Create container variables
  if (containerCollection && containers.length > 0) {
    for (const container of containers) {
      const containerVariableName = container.name;
      const existingContainerVariable = existingContainerVariableMap.get(containerVariableName);
      
      // Parse value (keep % if present, otherwise convert px to number)
      let containerValue;
      if (typeof container.value === 'string' && container.value.includes('%')) {
        containerValue = container.value; // Keep as string for percentage
      } else {
        containerValue = parseValue(container.value);
      }
      
      if (existingContainerVariable) {
        if (duplicateAction === 'overwrite') {
          try {
            if (typeof containerValue === 'string' && containerValue.includes('%')) {
              // For percentage, we need to store as string - but Figma variables don't support strings
              // So we'll convert to a number representing the percentage
              const percentValue = parseFloat(containerValue) / 100;
              existingContainerVariable.setValueForMode(containerModeId, percentValue);
            } else {
              existingContainerVariable.setValueForMode(containerModeId, containerValue);
            }
            if (container.description) {
              existingContainerVariable.description = container.description;
            }
          } catch (e) {
            console.error(`Failed to overwrite container variable ${containerVariableName}:`, e);
          }
        } else {
          try {
            if (container.description && (!existingContainerVariable.description || existingContainerVariable.description !== container.description)) {
              existingContainerVariable.description = container.description;
            }
          } catch (e) {
            console.warn(`Failed to update description for container variable ${containerVariableName}:`, e);
          }
        }
      } else {
        try {
          const variable = figma.variables.createVariable(containerVariableName, containerCollection, 'FLOAT');
          if (typeof containerValue === 'string' && containerValue.includes('%')) {
            const percentValue = parseFloat(containerValue) / 100;
            variable.setValueForMode(containerModeId, percentValue);
          } else {
            variable.setValueForMode(containerModeId, containerValue);
          }
          if (container.description) {
            variable.description = container.description;
          }
          console.log(`Created container variable: ${containerVariableName} = ${containerValue}`);
        } catch (e) {
          console.error(`Failed to create container variable ${containerVariableName}:`, e);
        }
      }
    }
  }
}

// ============================================
// GENERATE LAYOUT FROM PARSED TOKENS
// ============================================

// Helper function to create icon from SVG
// Recursively apply fill color to all vector children in an SVG node
function applyFillToAllChildren(node, fillOrPaint) {
  // fillOrPaint can be {r,g,b} or a paint object {type:'SOLID', color:{r,g,b}}
  const paint = fillOrPaint.type === 'SOLID' ? fillOrPaint : { type: 'SOLID', color: fillOrPaint };

  if ('fills' in node && node.type !== 'GROUP' && node.type !== 'FRAME') {
    node.fills = [paint];
  }
  if ('children' in node) {
    for (const child of node.children) {
      applyFillToAllChildren(child, paint);
    }
  }
}

function createIconFromSVG(fillColor = { r: 1, g: 1, b: 1 }, fontToUse = null, iconValue = null) {
  // "none" → no icon
  if (iconValue === 'none') return null;

  // Custom SVG string → parse with Figma API
  if (iconValue && typeof iconValue === 'string' && iconValue.trim().startsWith('<svg')) {
    try {
      const svgNode = figma.createNodeFromSvg(iconValue.trim());
      svgNode.name = "Icon";
      applyFillToAllChildren(svgNode, fillColor);
      return svgNode;
    } catch (e) {
      console.warn('Failed to parse custom SVG icon, falling back to arrow:', e);
    }
  }

  // Default: arrow icon — prefer text character if font is available
  if (fontToUse) {
    try {
      const icon = figma.createText();
      icon.name = "Icon";
      icon.characters = "→";
      icon.fontSize = 16;
      icon.fontName = fontToUse;
      icon.fills = [{ type: 'SOLID', color: fillColor }];
      icon.strokes = [];
      icon.textAutoResize = "WIDTH_AND_HEIGHT";
      return icon;
    } catch (e) {
      console.warn('Failed to create arrow from text, using shapes:', e);
    }
  }

  // Fallback: create arrow using simple shapes
  const arrowGroup = figma.createFrame();
  arrowGroup.name = "Icon";
  arrowGroup.layoutMode = "HORIZONTAL";
  arrowGroup.primaryAxisAlignItems = "CENTER";
  arrowGroup.counterAxisAlignItems = "CENTER";
  arrowGroup.fills = [];
  arrowGroup.strokes = [];
  arrowGroup.itemSpacing = -2;

  const body = figma.createRectangle();
  body.name = "Arrow Body";
  body.resize(8, 1.2);
  body.fills = [{ type: 'SOLID', color: fillColor }];
  body.strokes = [];
  body.cornerRadius = 0.6;

  const head = figma.createRectangle();
  head.name = "Arrow Head";
  head.resize(4, 4);
  head.fills = [{ type: 'SOLID', color: fillColor }];
  head.strokes = [];
  head.rotation = 45;
  head.x = 5.5;

  arrowGroup.appendChild(body);
  arrowGroup.appendChild(head);
  arrowGroup.resize(14, 14);
  arrowGroup.primaryAxisSizingMode = "AUTO";
  arrowGroup.counterAxisSizingMode = "AUTO";

  return arrowGroup;
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  if (!hex || hex === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 8-digit hex (with alpha)
  if (hex.length === 8) {
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = parseInt(hex.substring(6, 8), 16) / 255;
    return { r, g, b, a };
  }
  
  // Handle 6-digit hex
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return { r, g, b, a: 1 };
  }
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16) / 255;
    const g = parseInt(hex[1] + hex[1], 16) / 255;
    const b = parseInt(hex[2] + hex[2], 16) / 255;
    return { r, g, b, a: 1 };
  }
  
  return { r: 0, g: 0, b: 0, a: 1 };
}

// Helper function to find color variable by name
function findColorVariable(colorName, colorVariables) {
  if (!colorVariables || colorVariables.length === 0) return null;
  
  // Try exact match first
  for (const variable of colorVariables) {
    if (variable.name === colorName || variable.name.toLowerCase() === colorName.toLowerCase()) {
      return variable;
    }
  }
  
  // Try partial match (e.g., "primary/500" for "primary")
  const normalizedName = colorName.toLowerCase();
  for (const variable of colorVariables) {
    const varName = variable.name.toLowerCase();
    if (varName.includes(normalizedName) || normalizedName.includes(varName.split('/')[0])) {
      return variable;
    }
  }
  
  return null;
}

// Function to create Button Component with variants
async function createButtonComponent(buttonData, colorVariables, prefix) {
  if (!buttonData || !buttonData.variants || buttonData.variants.length === 0) {
    return null;
  }

  // Load fonts
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const componentName = prefix ? `Button - ${prefix}` : 'Button';
  
  // Create base component frame
  const baseComponent = figma.createComponent();
  baseComponent.name = componentName;
  baseComponent.layoutMode = "HORIZONTAL";
  baseComponent.primaryAxisAlignItems = "CENTER";
  baseComponent.counterAxisAlignItems = "CENTER";
  baseComponent.paddingLeft = buttonData.defaultProps.paddingLeft;
  baseComponent.paddingRight = buttonData.defaultProps.paddingRight;
  baseComponent.paddingTop = buttonData.defaultProps.paddingTop;
  baseComponent.paddingBottom = buttonData.defaultProps.paddingBottom;
  baseComponent.cornerRadius = buttonData.defaultProps.borderRadius;
  baseComponent.strokeWeight = buttonData.defaultProps.borderWidth;
  baseComponent.itemSpacing = 8;
  baseComponent.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.7, b: 0.9 } }];
  baseComponent.strokes = [{ type: 'SOLID', color: { r: 0.4, g: 0.7, b: 0.9 } }];

  // Create text node
  const textNode = figma.createText();
  textNode.name = "Text Button";
  textNode.characters = buttonData.config.defaultText;
  textNode.fontName = { family: "Inter", style: "Bold" };
  textNode.fontSize = 16;
  textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  textNode.textAutoResize = "WIDTH_AND_HEIGHT";

  // Create right icon - use same font as text
  const iconDefault = buttonData.config && buttonData.config.icons ? buttonData.config.icons.default : 'arrow--right';
  const iconNode = createIconFromSVG({ r: 1, g: 1, b: 1 }, textNode.fontName, iconDefault);

  baseComponent.appendChild(textNode);
  if (iconNode) {
    iconNode.name = "Right Icon";
    baseComponent.appendChild(iconNode);
  }

  // Set component properties
  baseComponent.addComponentProperty("Text Button", "TEXT", buttonData.config.defaultText);
  if (iconNode) {
    baseComponent.addComponentProperty("Left icon", "BOOLEAN", false);
    baseComponent.addComponentProperty("Right icon", "BOOLEAN", true);
    baseComponent.addComponentProperty("Icon", "TEXT", iconDefault || 'arrow--right');
  }

  // Create variants for State, Color, Size, Type
  const states = ['Default', 'Hover', 'Disable'];
  const sizes = ['Large', 'Small'];
  const types = ['Fill', 'Outline'];
  const colors = ['Primary', 'Secondary', 'Gray', 'White', 'Dark', 'Tertiary'];

  // Add variant properties
  baseComponent.addVariantProperty("State", states);
  baseComponent.addVariantProperty("Color", colors);
  baseComponent.addVariantProperty("Size", sizes);
  baseComponent.addVariantProperty("Type", types);

  // Create all variant instances
  const variantInstances = [];
  
  for (const variant of buttonData.variants) {
    const stateKeys = ['default', 'hover', 'disable'];
    
    for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
      const state = states[stateIdx];
      const stateKey = stateKeys[stateIdx];
      const stateData = variant.states[stateKey];
      
      if (!stateData) continue;

      // Find matching size
      const size = sizes[0]; // Default to Large, can be enhanced
      
      // Create instance
      const instance = baseComponent.createInstance();
      instance.name = `${variant.type} - ${variant.color} - ${size} - ${state}`;
      
      // Set variant properties
      instance.setProperties({
        "State": state,
        "Color": variant.color,
        "Size": size,
        "Type": variant.type
      });

      // Apply colors
      const bgColorRgb = hexToRgb(stateData.backgroundColor);
      const textColorRgb = hexToRgb(stateData.color);
      const borderColorRgb = hexToRgb(stateData.borderColor);
      
      // Extract color objects without alpha
      const bgColor = { r: bgColorRgb.r, g: bgColorRgb.g, b: bgColorRgb.b };
      const textColor = { r: textColorRgb.r, g: textColorRgb.g, b: textColorRgb.b };
      const borderColor = { r: borderColorRgb.r, g: borderColorRgb.g, b: borderColorRgb.b };

      // Check if we can use variables
      const colorVar = findColorVariable(variant.color.toLowerCase(), colorVariables);
      
      if (variant.type === 'Fill') {
        if (colorVar && stateData.backgroundColor !== 'transparent') {
          try {
            const paintObj = { type: 'SOLID', color: bgColor };
            if (bgColorRgb.a !== undefined && bgColorRgb.a !== 1) {
              paintObj.opacity = bgColorRgb.a;
            }
            instance.fills = [
              figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVar)
            ];
          } catch (e) {
            const fallbackPaint = { type: 'SOLID', color: bgColor };
            if (bgColorRgb.a !== undefined && bgColorRgb.a !== 1) {
              fallbackPaint.opacity = bgColorRgb.a;
            }
            instance.fills = [fallbackPaint];
          }
        } else {
          const fallbackPaint = { type: 'SOLID', color: bgColor };
          if (bgColorRgb.a !== undefined && bgColorRgb.a !== 1) {
            fallbackPaint.opacity = bgColorRgb.a;
          }
          instance.fills = [fallbackPaint];
        }
      } else {
        // Outline: transparent fill
        instance.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
      }
      
      const strokePaint = { type: 'SOLID', color: borderColor };
      if (borderColorRgb.a !== undefined && borderColorRgb.a !== 1) {
        strokePaint.opacity = borderColorRgb.a;
      }
      instance.strokes = [strokePaint];
      
      // Update text and icon colors
      const textChild = instance.findOne(n => n.name === "Text Button");
      const iconChild = instance.findOne(n => n.name === "Right Icon");
      
      const textPaint = { type: 'SOLID', color: textColor };
      if (textColorRgb.a !== undefined && textColorRgb.a !== 1) {
        textPaint.opacity = textColorRgb.a;
      }
      
      if (textChild && textChild.type === 'TEXT') {
        textChild.fills = [textPaint];
      }
      if (iconChild) {
        iconChild.fills = [textPaint];
      }

      // Apply size
      if (size === 'Small') {
        instance.paddingLeft = buttonData.smallProps.paddingLeft;
        instance.paddingRight = buttonData.smallProps.paddingRight;
        instance.paddingTop = buttonData.smallProps.paddingTop;
        instance.paddingBottom = buttonData.smallProps.paddingBottom;
      }

      variantInstances.push(instance);
    }
  }

  // Clean up: remove base component if we created instances
  if (variantInstances.length > 0) {
    baseComponent.remove();
    return variantInstances[0].mainComponent; // Return the main component
  }

  return baseComponent;
}

// Function to create Text Link Component with variants
async function createTextLinkComponent(textLinkData, colorVariables, prefix) {
  if (!textLinkData || !textLinkData.textLinks || textLinkData.textLinks.length === 0) {
    return null;
  }

  // Load fonts
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const componentName = prefix ? `Text Link - ${prefix}` : 'Text Link';
  
  // Create base component
  const baseComponent = figma.createComponent();
  baseComponent.name = componentName;
  baseComponent.layoutMode = "HORIZONTAL";
  baseComponent.primaryAxisAlignItems = "CENTER";
  baseComponent.counterAxisAlignItems = "CENTER";
  baseComponent.itemSpacing = 8;
  baseComponent.fills = [];

  // Create text node
  const textNode = figma.createText();
  textNode.name = "Text Link";
  textNode.characters = textLinkData.config.textLinkText;
  textNode.fontName = { family: "Inter", style: "Regular" };
  textNode.fontSize = 16;
  textNode.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.7, b: 0.9 } }];
  textNode.textAutoResize = "WIDTH_AND_HEIGHT";
  textNode.textDecoration = "UNDERLINE";

  baseComponent.appendChild(textNode);

  // Set component properties
  baseComponent.addComponentProperty("Text Link", "TEXT", textLinkData.config.textLinkText);
  baseComponent.addComponentProperty("Icon", "TEXT", "arrow--right");

  // Create variants
  const states = ['Default', 'Hover', 'Disable'];
  const colors = [];

  for (const link of textLinkData.textLinks) {
    if (!colors.includes(link.color)) {
      colors.push(link.color);
    }
  }

  baseComponent.addVariantProperty("State", states);
  baseComponent.addVariantProperty("Color", colors);

  // Create variant instances
  const variantInstances = [];
  
  for (const link of textLinkData.textLinks) {
    const stateKeys = ['default', 'hover', 'disable'];
    
    for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
      const state = states[stateIdx];
      const stateKey = stateKeys[stateIdx];
      const stateData = link.states[stateKey];
      
      if (!stateData) continue;

      const instance = baseComponent.createInstance();
      instance.name = `${link.color} - ${state}`;
      
      instance.setProperties({
        "State": state,
        "Color": link.color
      });

      const textColorRgb = hexToRgb(stateData.color);
      const textColor = { r: textColorRgb.r, g: textColorRgb.g, b: textColorRgb.b };
      const textChild = instance.findOne(n => n.name === "Text Link");
      
      if (textChild && textChild.type === 'TEXT') {
        const textPaint = { type: 'SOLID', color: textColor };
        if (textColorRgb.a !== undefined && textColorRgb.a !== 1) {
          textPaint.opacity = textColorRgb.a;
        }
        textChild.fills = [textPaint];
      }

      variantInstances.push(instance);
    }
  }

  if (variantInstances.length > 0) {
    baseComponent.remove();
    return variantInstances[0].mainComponent;
  }

  return baseComponent;
}

async function generateLayoutFromParsedTokens(parsedTokens, prefix, useVariables = false) {
  // Load fonts
  const fontsToLoad = new Set();
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Regular" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Bold" }));
  fontsToLoad.add(JSON.stringify({ family: "Inter", style: "Medium" }));

  parsedTokens.typography.forEach(style => {
    const figmaFontWeight = mapFontWeightToFigma(style.fontWeight);
    fontsToLoad.add(JSON.stringify({ family: style.fontFamily, style: figmaFontWeight }));
  });

  for (const fontStr of fontsToLoad) {
    const font = JSON.parse(fontStr);
    try {
      await figma.loadFontAsync(font);
    } catch (e) {
      console.warn(`Could not load font: ${font.family} ${font.style}`);
    }
  }

  // Create main frame
  const mainFrame = figma.createFrame();
  mainFrame.name = `Tokens - ${prefix}`;
  mainFrame.layoutMode = "HORIZONTAL";
  mainFrame.itemSpacing = 100;
  mainFrame.paddingLeft = 100;
  mainFrame.paddingRight = 100;
  mainFrame.paddingTop = 100;
  mainFrame.paddingBottom = 100;
  mainFrame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

  // Get variables if using them
  const colorVariables = useVariables ? figma.variables.getLocalVariables('COLOR') : [];
  const colorVariableMap = new Map(colorVariables.map(v => [v.name, v]));

  const textStyles = useVariables ? figma.getLocalTextStyles() : [];
  const textStyleMap = new Map(textStyles.map(s => [s.name, s]));

  const spacingVariables = useVariables ? figma.variables.getLocalVariables('FLOAT') : [];
  const spacingVariableMap = new Map(spacingVariables.map(v => [v.name, v]));

  // Generate colors section
  if (parsedTokens.colors.length > 0) {
    await generateColorsLayoutFromTokens(mainFrame, parsedTokens.colors, colorVariableMap);
  }

  // Generate typography section (use all styles for layout, redirect map for style lookup)
  const typographyForLayout = parsedTokens.typographyAll && parsedTokens.typographyAll.length > 0
    ? parsedTokens.typographyAll : parsedTokens.typography;
  if (typographyForLayout.length > 0) {
    await generateTypographyLayoutFromTokens(mainFrame, typographyForLayout, textStyleMap, prefix, colorVariableMap, parsedTokens.styleRedirectMap);
  }
  
  // Generate linksColors section in typography layout
  if (parsedTokens.linksColors) {
    await generateLinksColorsLayout(mainFrame, parsedTokens.linksColors, textStyleMap, prefix, colorVariableMap);
  }

  // Generate spacing section
  if (parsedTokens.spacing.length > 0) {
    await generateSpacingLayoutFromTokens(mainFrame, parsedTokens.spacing, spacingVariableMap);
  }

  // Generate border section
  if (parsedTokens.borders && (parsedTokens.borders.radius.length > 0 || parsedTokens.borders.width.length > 0)) {
    try {
      await generateBorderLayoutFromTokens(mainFrame, parsedTokens.borders);
    } catch (e) {
      console.error('Failed to generate border layout:', e);
    }
  }

  // Generate shadow section
  if (parsedTokens.shadows.length > 0) {
    await generateShadowLayoutFromTokens(mainFrame, parsedTokens.shadows);
  }

  // Generate breakpoint section
  if (parsedTokens.breakpoints && parsedTokens.breakpoints.breakpoints && parsedTokens.breakpoints.breakpoints.length > 0) {
    await generateBreakpointLayoutFromTokens(mainFrame, parsedTokens.breakpoints.breakpoints);
  }

  // Generate button section
  console.log('=== BUTTON GENERATION DEBUG ===');
  console.log('parsedTokens.buttons exists?', !!parsedTokens.buttons);
  console.log('parsedTokens.buttons:', parsedTokens.buttons);
  
  if (parsedTokens.buttons) {
    try {
      console.log('Button data format:', parsedTokens.buttons.format);
      console.log('Button data keys:', Object.keys(parsedTokens.buttons));
      const colorVariables = useVariables ? figma.variables.getLocalVariables('COLOR') : [];
      console.log('Color variables found:', colorVariables.length);
      
      // Check if new format
      if (parsedTokens.buttons.format === 'new') {
        console.log('✓ Detected NEW format, generating Component Sets and Grid Layout...');
        
        // Step 1: Create Component Sets first (but don't append to mainFrame)
        console.log('Step 1: Creating Button Component Set...');
        const buttonComponentSetFrame = await generateButtonComponents(
          parsedTokens.buttons,
          colorVariables,
          parsedTokens.buttons.config || {},
          parsedTokens
        );
        
        console.log('Step 2: Creating Text Link Component Set...');
        const textLinkComponentSetFrame = await generateTextLinkComponents(
          parsedTokens.buttons,
          colorVariables,
          parsedTokens.buttons.config || {},
          parsedTokens
        );
        
        // Step 2: Append Component Set Frames to page (Figma auto-converts to Component Set)
        // Figma only auto-converts Frame to Component Set when appended to page
        let buttonComponentSet = null;
        let textLinkComponentSet = null;
        
        if (buttonComponentSetFrame && buttonComponentSetFrame.children.length > 0) {
          // Append to page so Figma can auto-convert to Component Set
          figma.currentPage.appendChild(buttonComponentSetFrame);
          
          // Check if Figma converted it to Component Set
          const firstComponent = buttonComponentSetFrame.children[0];
          if (firstComponent && firstComponent.parent && firstComponent.parent.type === 'COMPONENT_SET') {
            buttonComponentSet = firstComponent.parent;
            console.log('✓ Found Button Component Set:', buttonComponentSet.name);
            // Hide the Component Set (don't show in final layout)
            buttonComponentSet.visible = false;
          } else {
            // If still a Frame, try to find Component Set by name
            const allComponentSets = figma.root.findAll(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
            if (allComponentSets.length > 0) {
              buttonComponentSet = allComponentSets[0];
              console.log('✓ Found Button Component Set by name:', buttonComponentSet.name);
              buttonComponentSet.visible = false;
            } else {
              console.log('⚠ Button Component Set not auto-created, components will use fallback');
              buttonComponentSet = null;
            }
          }
        }
        
        if (textLinkComponentSetFrame && textLinkComponentSetFrame.children.length > 0) {
          // Append to page so Figma can auto-convert to Component Set
          figma.currentPage.appendChild(textLinkComponentSetFrame);
          
          // Check if Figma converted it to Component Set
          const firstComponent = textLinkComponentSetFrame.children[0];
          if (firstComponent && firstComponent.parent && firstComponent.parent.type === 'COMPONENT_SET') {
            textLinkComponentSet = firstComponent.parent;
            console.log('✓ Found Text Link Component Set:', textLinkComponentSet.name);
            // Hide the Component Set (don't show in final layout)
            textLinkComponentSet.visible = false;
          } else {
            // If still a Frame, try to find Component Set by name
            const allComponentSets = figma.root.findAll(n => n.type === 'COMPONENT_SET' && n.name === 'Text Link');
            if (allComponentSets.length > 0) {
              textLinkComponentSet = allComponentSets[0];
              console.log('✓ Found Text Link Component Set by name:', textLinkComponentSet.name);
              textLinkComponentSet.visible = false;
            } else {
              console.log('⚠ Text Link Component Set not auto-created, components will use fallback');
              textLinkComponentSet = null;
            }
          }
        }
        
        // Step 3: Generate Grid Layout using Component Sets
        console.log('Step 3: Generating Button Grid Layout with Component instances...');
        await generateButtonGridLayout(
          mainFrame,
          parsedTokens.buttons,
          colorVariables,
          parsedTokens.buttons.config || {},
          parsedTokens,
          buttonComponentSet
        );
        
        console.log('Step 4: Generating Text Link Grid Layout with Component instances...');
        await generateTextLinkGridLayout(
          mainFrame,
          parsedTokens.buttons,
          colorVariables,
          parsedTokens.buttons.config || {},
          parsedTokens,
          textLinkComponentSet
        );
        
        // Step 5: Remove Component Sets and Frames after grid layout is created (they're no longer needed)
        console.log('Step 5: Cleaning up Component Sets and Frames...');
        
        // First, try to find and remove ALL Component Sets by name (most reliable method)
        try {
          const allButtonSets = figma.root.findAll(n => n.type === 'COMPONENT_SET' && (n.name === 'Button' || n.name.indexOf('Button') >= 0));
          console.log('Found', allButtonSets.length, 'Button Component Set(s) to remove');
          for (const set of allButtonSets) {
            try {
              set.remove();
              console.log('✓ Removed Button Component Set:', set.name);
            } catch (e) {
              console.warn('Could not remove Button Component Set:', set.name, e);
            }
          }
          
          const allTextLinkSets = figma.root.findAll(n => n.type === 'COMPONENT_SET' && (n.name === 'Text Link' || n.name.indexOf('Text Link') >= 0));
          console.log('Found', allTextLinkSets.length, 'Text Link Component Set(s) to remove');
          for (const set of allTextLinkSets) {
            try {
              set.remove();
              console.log('✓ Removed Text Link Component Set:', set.name);
            } catch (e) {
              console.warn('Could not remove Text Link Component Set:', set.name, e);
            }
          }
        } catch (e) {
          console.warn('Error removing Component Sets by name:', e);
        }
        
        // Also remove the Component Set references if they exist
        if (buttonComponentSet) {
          try {
            if (buttonComponentSet.parent) {
              buttonComponentSet.remove();
              console.log('✓ Removed Button Component Set (from reference)');
            }
          } catch (e) {
            // Already removed or doesn't exist
          }
        }
        
        if (textLinkComponentSet) {
          try {
            if (textLinkComponentSet.parent) {
              textLinkComponentSet.remove();
              console.log('✓ Removed Text Link Component Set (from reference)');
            }
          } catch (e) {
            // Already removed or doesn't exist
          }
        }
        
        // Also remove the original frames if they still exist
        if (buttonComponentSetFrame && buttonComponentSetFrame.parent) {
          try {
            buttonComponentSetFrame.remove();
            console.log('✓ Removed Button Component Set Frame');
          } catch (e) {
            // Already removed or doesn't exist
          }
        }
        
        if (textLinkComponentSetFrame && textLinkComponentSetFrame.parent) {
          try {
            textLinkComponentSetFrame.remove();
            console.log('✓ Removed Text Link Component Set Frame');
          } catch (e) {
            // Already removed or doesn't exist
          }
        }
      } else {
        console.log('Detected OLD format, generating layout...');
        // Old format: Generate layout
        await generateButtonLayoutFromTokens(mainFrame, parsedTokens.buttons, colorVariables, prefix);
      }
    } catch (e) {
      console.error('❌ Failed to generate button components:', e);
      console.error('Error stack:', e.stack);
      figma.ui.postMessage({ type: 'status', message: `Error generating buttons: ${e.message}`, error: true });
    }
  } else {
    console.log('⚠ No button data found in parsedTokens');
    console.log('parsedTokens keys:', Object.keys(parsedTokens));
  }
  console.log('=== END BUTTON GENERATION DEBUG ===');

  mainFrame.primaryAxisSizingMode = "AUTO";
  mainFrame.counterAxisSizingMode = "AUTO";

  figma.viewport.scrollAndZoomIntoView([mainFrame]);
}

async function generateColorsLayoutFromTokens(parent, colors, variableMap) {
  const section = figma.createFrame();
  section.name = "Colors";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  // Group colors
  const groupedColors = {};
  colors.forEach(color => {
    const group = color.group || 'Other';
    if (!groupedColors[group]) {
      groupedColors[group] = [];
    }
    groupedColors[group].push(color);
  });

  const groupOrder = ['Primary', 'Secondary', 'Gray', 'Semantic', 'Surface', 'Other'];
  const sortedGroups = Object.entries(groupedColors).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a[0].localeCompare(b[0]);
  });

  sortedGroups.forEach(([groupName, groupColors]) => {
    const groupFrame = figma.createFrame();
    groupFrame.name = groupName;
    groupFrame.layoutMode = "VERTICAL";
    groupFrame.itemSpacing = 20;
    groupFrame.fills = [];
    groupFrame.primaryAxisSizingMode = "AUTO";
    groupFrame.counterAxisSizingMode = "FIXED";
    groupFrame.resize(1200, 100);

    const title = figma.createText();
    title.fontName = { family: "Inter", style: "Bold" };
    title.characters = groupName;
    title.fontSize = 28;
    groupFrame.appendChild(title);

    const swatchesPerRow = 4;
    for (let i = 0; i < groupColors.length; i += swatchesPerRow) {
      const swatchesRow = figma.createFrame();
      swatchesRow.name = "Swatches Row";
      swatchesRow.layoutMode = "HORIZONTAL";
      swatchesRow.itemSpacing = 20;
      swatchesRow.fills = [];
      swatchesRow.primaryAxisSizingMode = "AUTO";
      swatchesRow.counterAxisSizingMode = "AUTO";

      const rowColors = groupColors.slice(i, i + swatchesPerRow);
      rowColors.forEach(c => {
        const swatchContainer = figma.createFrame();
        swatchContainer.name = c.name;
        swatchContainer.layoutMode = "VERTICAL";
        swatchContainer.itemSpacing = 16;
        swatchContainer.fills = [];
        swatchContainer.primaryAxisSizingMode = "AUTO";
        swatchContainer.counterAxisSizingMode = "AUTO";

        const rect = figma.createRectangle();
        rect.name = "Swatch";
        rect.resize(240, 240);
        rect.cornerRadius = 8;

        const existingVariable = variableMap.get(c.name);
        if (existingVariable) {
          rect.fills = [
            (function() {
              const rgb = hexToRgb(c.hex);
              const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b };
              const paintObj = { type: 'SOLID', color: colorObj };
              if (rgb.a !== undefined && rgb.a !== 1) {
                paintObj.opacity = rgb.a;
              }
              return figma.variables.setBoundVariableForPaint(paintObj, 'color', existingVariable);
            })()
          ];
        } else {
          const rgb = hexToRgb(c.hex);
          const colorObj = { r: rgb.r, g: rgb.g, b: rgb.b };
          const paintObj = { type: 'SOLID', color: colorObj };
          if (rgb.a !== undefined && rgb.a !== 1) {
            paintObj.opacity = rgb.a;
          }
          rect.fills = [paintObj];
        }

        rect.strokeWeight = 1;
        rect.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.1 }];

        const nameText = figma.createText();
        nameText.name = "Color Name";
        nameText.fontName = { family: "Inter", style: "Bold" };
        nameText.characters = c.name;
        nameText.fontSize = 24;
        nameText.textAlignHorizontal = "CENTER";
        nameText.resize(240, nameText.height);

        const hexText = figma.createText();
        hexText.name = "Hex Value";
        hexText.fontName = { family: "Inter", style: "Regular" };
        hexText.characters = c.hex;
        hexText.fontSize = 24;
        hexText.textAlignHorizontal = "CENTER";
        hexText.resize(240, hexText.height);

        swatchContainer.appendChild(rect);
        swatchContainer.appendChild(nameText);
        swatchContainer.appendChild(hexText);
        swatchesRow.appendChild(swatchContainer);
      });
      groupFrame.appendChild(swatchesRow);
    }

    section.appendChild(groupFrame);
  });

  parent.appendChild(section);
}

async function generateTypographyLayoutFromTokens(parent, typography, textStyleMap, prefix, colorVariableMap = null, styleRedirectMap = null) {
  // Find body styles to get color for inheritance
  const bodyStyles = typography.filter(s => {
    const nameParts = s.name.split('/');
    const styleName = nameParts.length > 1 ? nameParts[1] : nameParts[0];
    return styleName.toLowerCase() === 'body';
  });
  
  // Create a map of breakpoint -> color from body
  const bodyColorMap = new Map();
  for (const bodyStyle of bodyStyles) {
    const breakpoint = bodyStyle.breakpoint || 'mobile';
    if (bodyStyle.color) {
      bodyColorMap.set(breakpoint, bodyStyle.color);
      console.log(`[LAYOUT COLOR] Added body color to map: ${breakpoint} -> ${bodyStyle.color}`);
    }
  }
  console.log(`[LAYOUT COLOR] Body color map:`, Array.from(bodyColorMap.entries()));
  
  // Group by breakpoint
  const groupedByBreakpoint = {};
  typography.forEach(style => {
    const bp = style.breakpoint || 'mobile';
    if (!groupedByBreakpoint[bp]) {
      groupedByBreakpoint[bp] = [];
    }
    groupedByBreakpoint[bp].push(style);
  });

  const breakpointOrder = ['Mobile', 'Tablet', 'Desktop'];
  const sortedBreakpoints = Object.keys(groupedByBreakpoint).sort((a, b) => {
    const indexA = breakpointOrder.indexOf(a.charAt(0).toUpperCase() + a.slice(1));
    const indexB = breakpointOrder.indexOf(b.charAt(0).toUpperCase() + b.slice(1));
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    return a.localeCompare(b);
  });

  for (const breakpoint of sortedBreakpoints) {
    const styles = groupedByBreakpoint[breakpoint];
    const section = figma.createFrame();
    section.name = `${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} Typography`;
    section.layoutMode = "VERTICAL";
    section.itemSpacing = 24;
    section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    section.paddingLeft = 40;
    section.paddingRight = 40;
    section.paddingTop = 40;
    section.paddingBottom = 40;
    section.cornerRadius = 8;
    section.counterAxisSizingMode = "FIXED";
    section.resize(1200, 100);

    const title = figma.createText();
    title.characters = `${breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1)} | Typography`;
    title.fontSize = 24;
    title.fontName = { family: "Inter", style: "Regular" };
    section.appendChild(title);

    const colHeader = figma.createText();
    colHeader.characters = "Standard text";
    colHeader.fontSize = 18;
    colHeader.fontName = { family: "Inter", style: "Bold" };
    section.appendChild(colHeader);

    const listFrame = figma.createFrame();
    listFrame.name = "Styles List";
    listFrame.layoutMode = "VERTICAL";
    listFrame.itemSpacing = 0;
    listFrame.fills = [];
    listFrame.layoutAlign = "STRETCH";
    listFrame.primaryAxisSizingMode = "AUTO";
    listFrame.counterAxisSizingMode = "FIXED";
    section.appendChild(listFrame);

    for (const s of styles) {
      const row = figma.createFrame();
      row.name = s.displayName;
      row.layoutMode = "HORIZONTAL";
      row.itemSpacing = 40;
      row.fills = [];
      row.paddingTop = 16;
      row.paddingBottom = 16;
      row.primaryAxisAlignItems = "MIN";
      row.counterAxisAlignItems = "CENTER";
      row.layoutAlign = "STRETCH";
      row.primaryAxisSizingMode = "FIXED";
      row.counterAxisSizingMode = "AUTO";

      const label = figma.createText();
      label.name = "Label";
      label.fontName = { family: "Inter", style: "Regular" };
      label.characters = s.displayName;
      label.fontSize = 16;
      label.resize(150, label.height);
      label.layoutGrow = 0;

      const sample = figma.createText();
      sample.name = "Preview Text";
      let sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      if (s.fontSize > 65) {
        sampleText = "Lorem ipsum dolor sit amet";
      } else if (s.fontSize < 24) {
        sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
      }

      // Build style name with prefix
      let styleName = s.name;
      if (prefix) {
        if (s.name.includes('/')) {
          const [bp, name] = s.name.split('/');
          styleName = `${bp} - ${prefix}/${name}`;
        } else {
          styleName = `${prefix}/${s.name}`;
        }
      }

      // Try direct lookup first, then try redirect map (for deduplicated styles)
      let redirectedStyleName = null;
      if (styleRedirectMap && styleRedirectMap.has(s.name)) {
        const redirectName = styleRedirectMap.get(s.name);
        if (prefix && redirectName.includes('/')) {
          const [bp, name] = redirectName.split('/');
          redirectedStyleName = `${bp} - ${prefix}/${name}`;
        } else {
          redirectedStyleName = prefix ? `${prefix}/${redirectName}` : redirectName;
        }
      }
      const existingTextStyle = textStyleMap.get(styleName) || textStyleMap.get(s.name)
        || (redirectedStyleName && textStyleMap.get(redirectedStyleName))
        || (styleRedirectMap && styleRedirectMap.has(s.name) && textStyleMap.get(styleRedirectMap.get(s.name)));
      if (existingTextStyle) {
        try {
          await figma.loadFontAsync(existingTextStyle.fontName);
          sample.textStyleId = existingTextStyle.id;
        } catch (e) {
          // Fallback to manual
          const figmaFontWeight = mapFontWeightToFigma(s.fontWeight);
          try {
            await figma.loadFontAsync({ family: s.fontFamily, style: figmaFontWeight });
            sample.fontName = { family: s.fontFamily, style: figmaFontWeight };
            sample.fontSize = s.fontSize;
            if (s.lineHeight && String(s.lineHeight).endsWith('%')) {
              sample.lineHeight = { value: parseFloat(s.lineHeight), unit: 'PERCENT' };
            }
            if (s.letterSpacing) {
              if (String(s.letterSpacing).endsWith('%')) {
                sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PERCENT' };
              } else {
                sample.letterSpacing = { value: parseValue(s.letterSpacing), unit: 'PIXELS' };
              }
            }
          } catch (fontError) {
            console.warn(`Font load failed for ${s.name}`);
          }
        }
      } else {
        const fontWeightMap = {
          'regular': 'Regular',
          'semibold': 'Semibold',
          'bold': 'Bold',
          'light': 'Light',
          'medium': 'Medium'
        };
        const figmaFontWeight = fontWeightMap[s.fontWeight.toLowerCase()] || 'Regular';
        try {
          await figma.loadFontAsync({ family: s.fontFamily, style: figmaFontWeight });
          sample.fontName = { family: s.fontFamily, style: figmaFontWeight };
          sample.fontSize = s.fontSize;
          if (s.lineHeight && String(s.lineHeight).endsWith('%')) {
            sample.lineHeight = { value: parseFloat(s.lineHeight), unit: 'PERCENT' };
          }
          if (s.letterSpacing) {
            if (String(s.letterSpacing).endsWith('%')) {
              sample.letterSpacing = { value: parseFloat(s.letterSpacing), unit: 'PERCENT' };
            } else {
              sample.letterSpacing = { value: parseValue(s.letterSpacing), unit: 'PIXELS' };
            }
          }
        } catch (fontError) {
          console.warn(`Font load failed for ${s.name}`);
        }
      }

      // Get color: use style's color, or body's color for same breakpoint
      let color = s.color;
      const breakpoint = s.breakpoint || 'mobile';
      if (!color) {
        const bodyColor = bodyColorMap.get(breakpoint);
        if (bodyColor) {
          color = bodyColor;
          console.log(`[LAYOUT COLOR] Style ${s.name} missing color, using body's color for ${breakpoint}: ${color}`);
        }
      }
      
      // Set color if available (from style or inherited from body)
      console.log(`[LAYOUT COLOR] Checking color for ${s.name}: s.color=${s.color || '(none)'}, inherited color=${color || '(none)'}, styleName=${styleName}`);
      if (color) {
        try {
          console.log(`[LAYOUT COLOR] Starting to set color for ${s.name}, hex: ${color}`);
          console.log(`[LAYOUT COLOR] colorVariableMap available: ${colorVariableMap ? 'yes' : 'no'}, size: ${colorVariableMap ? colorVariableMap.size : 0}`);
          
          // Check if color exists as a variable
          const colorVariable = colorVariableMap ? findColorVariableByHex(color, colorVariableMap) : null;
          console.log(`[LAYOUT COLOR] Found variable:`, colorVariable ? colorVariable.name : 'none');
          
          if (colorVariable) {
            // Bind to color variable
            const paintObj = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
            const boundPaint = figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVariable);
            console.log(`[LAYOUT COLOR] Paint object after binding:`, boundPaint);
            console.log(`[LAYOUT COLOR] boundVariables:`, boundPaint.boundVariables);
            sample.fills = [boundPaint];
            console.log(`[LAYOUT COLOR] Set fills to sample, current fills:`, sample.fills);
            console.log(`[LAYOUT COLOR] Fills boundVariables:`, sample.fills[0] && sample.fills[0].boundVariables);
            console.log(`[LAYOUT COLOR] Successfully bound color variable ${colorVariable.name} to text node for ${s.name}`);
          } else {
            // Use direct color
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16) / 255;
            const g = parseInt(hex.substring(2, 4), 16) / 255;
            const b = parseInt(hex.substring(4, 6), 16) / 255;
            const rgbColor = { r: r, g: g, b: b };
            console.log(`[LAYOUT COLOR] Converting hex ${color} to RGB:`, rgbColor);
            sample.fills = [{ type: 'SOLID', color: rgbColor }];
            console.log(`[LAYOUT COLOR] Set fills with direct color:`, sample.fills);
            console.log(`[LAYOUT COLOR] Set direct color ${color} (RGB: ${r}, ${g}, ${b}) for text node ${s.name}`);
          }
          
          // Verify fills after setting
          console.log(`[LAYOUT COLOR] Final fills for ${s.name}:`, sample.fills);
          if (sample.fills && sample.fills.length > 0) {
            const fill = sample.fills[0];
            if (fill.boundVariables && fill.boundVariables.color) {
              console.log(`[LAYOUT COLOR] Fill is bound to variable:`, fill.boundVariables.color);
            } else if (fill.color) {
              console.log(`[LAYOUT COLOR] Fill has direct color:`, fill.color);
            }
          }
        } catch (colorError) {
          console.error(`[LAYOUT COLOR] Failed to set color for ${s.name}:`, colorError);
          console.error(`[LAYOUT COLOR] Error stack:`, colorError.stack);
        }
      } else {
        console.log(`[LAYOUT COLOR] No color specified for ${s.name} in parsed tokens`);
      }

      sample.characters = sampleText;
      sample.layoutGrow = 1;
      sample.textAutoResize = "HEIGHT";

      row.appendChild(label);
      row.appendChild(sample);
      listFrame.appendChild(row);

      const line = figma.createRectangle();
      line.name = "Separator";
      line.resize(100, 1);
      line.layoutAlign = "STRETCH";
      line.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      listFrame.appendChild(line);
    }

    parent.appendChild(section);
  }
}

async function generateLinksColorsLayout(parent, linksColors, textStyleMap, prefix, colorVariableMap) {
  // Load fonts
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // Create Links Colors section
  const section = figma.createFrame();
  section.name = "Links Colors";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 24;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(500, 100);

  // Title
  const title = figma.createText();
  title.characters = "Link Colors:";
  title.fontSize = 18;
  title.fontName = { family: "Inter", style: "Bold" };
  title.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }];
  section.appendChild(title);

  // Preview row with all link states
  const previewRow = figma.createFrame();
  previewRow.name = "Preview Links";
  previewRow.layoutMode = "HORIZONTAL";
  previewRow.itemSpacing = 40;
  previewRow.fills = [];
  previewRow.paddingTop = 16;
  previewRow.paddingBottom = 16;
  previewRow.primaryAxisSizingMode = "AUTO";
  previewRow.counterAxisSizingMode = "AUTO";
  previewRow.primaryAxisAlignItems = "MIN";
  previewRow.counterAxisAlignItems = "CENTER";

  // Default Link State
  if (linksColors.color) {
    const defaultLink = createPreviewLink("Default Link", linksColors.color, {
      underline: linksColors.underline || 'none',
      fontWeight: linksColors['font-weight'] || 'inherit'
    }, colorVariableMap);
    previewRow.appendChild(defaultLink);
  }

  // Hover State
  if (linksColors.hover && linksColors.hover.color) {
    const hoverLink = createPreviewLink("Hover Link", linksColors.hover.color, {
      underline: linksColors.hover.underline,
      underlineOffset: linksColors.hover['underline-offset']
    }, colorVariableMap);
    previewRow.appendChild(hoverLink);
  }

  // Focus State
  if (linksColors.focus && linksColors.focus.color) {
    const focusLink = createPreviewLink("Focus Link", linksColors.focus.color, {
      outlineOffset: linksColors.focus['outline-offset']
    }, colorVariableMap);
    previewRow.appendChild(focusLink);
  }

  section.appendChild(previewRow);
  parent.appendChild(section);
}

function createPreviewLink(label, color, properties, colorVariableMap) {
  const linkFrame = figma.createFrame();
  linkFrame.name = label;
  linkFrame.layoutMode = "HORIZONTAL";
  linkFrame.itemSpacing = 12;
  linkFrame.fills = [];
  linkFrame.primaryAxisSizingMode = "AUTO";
  linkFrame.counterAxisSizingMode = "AUTO";
  linkFrame.primaryAxisAlignItems = "MIN";
  linkFrame.counterAxisAlignItems = "CENTER";

  // Link text
  const linkText = figma.createText();
  linkText.name = "Link Text";
  linkText.characters = label;
  linkText.fontSize = 16;
  linkText.fontName = { family: "Inter", style: "Regular" };
  
  // Find color variable by hex value
  console.log(`[PREVIEW LINK] Setting color for ${label}, hex: ${color}`);
  const colorVariable = findColorVariableByHex(color, colorVariableMap);
  const rgbColor = hexToRgb(color);
  console.log(`[PREVIEW LINK] Found variable:`, colorVariable ? colorVariable.name : 'none', `RGB:`, rgbColor);
  
  // Validate rgbColor
  if (!rgbColor || (rgbColor.r === 0 && rgbColor.g === 0 && rgbColor.b === 0 && rgbColor.a !== 0)) {
    console.warn(`[PREVIEW LINK] Invalid color value for ${color}, using fallback`);
  }
  
  // Set color - use variable if found, otherwise use hex color
  if (colorVariable) {
    try {
      const paintObj = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
      const boundPaint = figma.variables.setBoundVariableForPaint(paintObj, 'color', colorVariable);
      console.log(`[PREVIEW LINK] Paint object after binding:`, boundPaint);
      console.log(`[PREVIEW LINK] boundVariables:`, boundPaint.boundVariables);
      linkText.fills = [boundPaint];
      console.log(`[PREVIEW LINK] Set fills to linkText, current fills:`, linkText.fills);
      console.log(`[PREVIEW LINK] Fills boundVariables:`, linkText.fills[0] && linkText.fills[0].boundVariables);
      console.log(`[PREVIEW LINK] Successfully bound variable ${colorVariable.name} to link text for color ${color}`);
    } catch (e) {
      console.warn(`[PREVIEW LINK] Failed to bind variable ${colorVariable.name} for color ${color}:`, e);
      // Fallback to hex color if variable binding fails
      if (rgbColor && rgbColor.r !== undefined) {
        linkText.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
        console.log(`[PREVIEW LINK] Using hex color fallback: ${color} -> RGB(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}), fills:`, linkText.fills);
      }
    }
  } else {
    console.log(`[PREVIEW LINK] No variable found for color ${color}, using hex color directly`);
    if (rgbColor && rgbColor.r !== undefined) {
      linkText.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
      console.log(`[PREVIEW LINK] Applied hex color: ${color} -> RGB(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}), fills:`, linkText.fills);
    } else {
      console.error(`[PREVIEW LINK] Failed to convert hex ${color} to RGB, text will be black`);
    }
  }
  
  // Verify fills after setting
  console.log(`[PREVIEW LINK] Final fills for ${label}:`, linkText.fills);
  if (linkText.fills[0] && linkText.fills[0].boundVariables) {
    console.log(`[PREVIEW LINK] Final boundVariables:`, linkText.fills[0].boundVariables);
  }
  
  // Add underline if property is set to 'underline'
  if (properties.underline === 'underline') {
    linkText.textDecoration = "UNDERLINE";
  }
  
  linkText.textAutoResize = "WIDTH_AND_HEIGHT";
  
  // Add outline for focus state (wrap text in a frame with stroke)
  if (label === "Focus Link" && properties.outlineOffset !== undefined) {
    const outlineFrame = figma.createFrame();
    outlineFrame.name = "Focus Outline";
    outlineFrame.layoutMode = "HORIZONTAL";
    outlineFrame.fills = [];
    
    // Use variable for stroke if found
    if (colorVariable) {
      try {
        const strokeObj = { type: 'SOLID' };
        figma.variables.setBoundVariableForPaint(strokeObj, 'color', colorVariable);
        outlineFrame.strokes = [strokeObj];
      } catch (e) {
        outlineFrame.strokes = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
      }
    } else {
      outlineFrame.strokes = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
    }
    
    outlineFrame.strokeWeight = 2;
    outlineFrame.cornerRadius = 2;
    outlineFrame.paddingLeft = 4;
    outlineFrame.paddingRight = 4;
    outlineFrame.paddingTop = 2;
    outlineFrame.paddingBottom = 2;
    outlineFrame.primaryAxisSizingMode = "AUTO";
    outlineFrame.counterAxisSizingMode = "AUTO";
    outlineFrame.appendChild(linkText);
    linkFrame.appendChild(outlineFrame);
  } else {
    linkFrame.appendChild(linkText);
  }

  return linkFrame;
}

// Helper function to find color variable by hex value
function findColorVariableByHex(hex, colorVariableMap) {
  if (!colorVariableMap || colorVariableMap.size === 0) {
    console.log('No color variables available');
    return null;
  }
  
  // Normalize hex string (uppercase, remove #)
  const normalizedHex = hex.replace('#', '').toUpperCase();
  const targetRgb = hexToRgb(hex);
  const tolerance = 0.001; // Small tolerance for floating point comparison
  
  console.log(`Searching for color variable matching hex: ${hex} (RGB: ${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`);
  
  // Iterate through all color variables
  for (const variable of colorVariableMap.values()) {
    try {
      // Get value from first mode
      const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
      if (!collection || collection.modes.length === 0) continue;
      
      const modeId = collection.modes[0].modeId;
      let value = variable.valuesByMode[modeId];
      
      // Resolve variable alias recursively using existing function
      value = resolveVariableValue(value);
      
      // Compare RGB values
      if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
        const rMatch = Math.abs(value.r - targetRgb.r) < tolerance;
        const gMatch = Math.abs(value.g - targetRgb.g) < tolerance;
        const bMatch = Math.abs(value.b - targetRgb.b) < tolerance;
        
        if (rMatch && gMatch && bMatch) {
          console.log(`Found matching color variable: ${variable.name} for hex ${hex} (RGB: ${value.r}, ${value.g}, ${value.b})`);
          return variable;
        }
      }
    } catch (e) {
      // Skip variables that can't be read
      console.warn(`Error checking variable ${variable.name}:`, e);
      continue;
    }
  }
  
  console.log(`No matching color variable found for hex ${hex}`);
  return null;
}

function createLinkStateFrame(stateName, color, properties, textStyleMap, prefix) {
  const stateFrame = figma.createFrame();
  stateFrame.name = `${stateName} Link`;
  stateFrame.layoutMode = "VERTICAL";
  stateFrame.itemSpacing = 16;
  stateFrame.fills = [];
  stateFrame.paddingTop = 20;
  stateFrame.paddingBottom = 20;
  stateFrame.paddingLeft = 0;
  stateFrame.paddingRight = 0;
  stateFrame.primaryAxisSizingMode = "AUTO";
  stateFrame.counterAxisSizingMode = "FIXED";

  // State label
  const stateLabel = figma.createText();
  stateLabel.characters = stateName;
  stateLabel.fontSize = 18;
  stateLabel.fontName = { family: "Inter", style: "Bold" };
  stateFrame.appendChild(stateLabel);

  // Example text row
  const exampleRow = figma.createFrame();
  exampleRow.name = "Example";
  exampleRow.layoutMode = "HORIZONTAL";
  exampleRow.itemSpacing = 40;
  exampleRow.fills = [];
  exampleRow.paddingTop = 12;
  exampleRow.paddingBottom = 12;
  exampleRow.primaryAxisAlignItems = "MIN";
  exampleRow.counterAxisAlignItems = "CENTER";
  exampleRow.layoutAlign = "STRETCH";
  exampleRow.primaryAxisSizingMode = "FIXED";
  exampleRow.counterAxisSizingMode = "AUTO";

  const label = figma.createText();
  label.name = "Label";
  label.characters = "Example";
  label.fontSize = 16;
  label.fontName = { family: "Inter", style: "Regular" };
  label.resize(150, label.height);
  label.layoutGrow = 0;
  exampleRow.appendChild(label);

  // Link text example
  const linkText = figma.createText();
  linkText.name = "Link Text";
  linkText.characters = "Link text";
  linkText.fontSize = 16;
  linkText.fontName = { family: "Inter", style: "Regular" };
  
  // Set color
  const rgbColor = hexToRgb(color);
  linkText.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
  
  // Add underline if property is set to 'underline'
  if (properties.underline === 'underline') {
    linkText.textDecoration = "UNDERLINE";
  }
  
  linkText.layoutGrow = 1;
  linkText.textAutoResize = "HEIGHT";
  exampleRow.appendChild(linkText);
  stateFrame.appendChild(exampleRow);

  // Properties row
  const propsRow = figma.createFrame();
  propsRow.name = "Properties";
  propsRow.layoutMode = "HORIZONTAL";
  propsRow.itemSpacing = 24;
  propsRow.fills = [];
  propsRow.paddingTop = 8;
  propsRow.paddingBottom = 8;
  propsRow.primaryAxisSizingMode = "AUTO";
  propsRow.counterAxisSizingMode = "AUTO";

  // Color property
  const colorProp = createPropertyItem("Color", color);
  propsRow.appendChild(colorProp);

  // Other properties
  if (properties.underline !== undefined) {
    const underlineProp = createPropertyItem("Underline", properties.underline);
    propsRow.appendChild(underlineProp);
  }

  if (properties.fontWeight !== undefined && properties.fontWeight !== 'inherit') {
    const fontWeightProp = createPropertyItem("Font-weight", properties.fontWeight);
    propsRow.appendChild(fontWeightProp);
  }

  if (properties.underlineOffset !== undefined) {
    const offsetProp = createPropertyItem("Underline-offset", properties.underlineOffset);
    propsRow.appendChild(offsetProp);
  }

  if (properties.outlineOffset !== undefined) {
    const outlineProp = createPropertyItem("Outline-offset", properties.outlineOffset);
    propsRow.appendChild(outlineProp);
  }

  stateFrame.appendChild(propsRow);

  // Separator
  const separator = figma.createRectangle();
  separator.name = "Separator";
  separator.resize(100, 1);
  separator.layoutAlign = "STRETCH";
  separator.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  stateFrame.appendChild(separator);

  return stateFrame;
}

function createPropertyItem(label, value) {
  const propFrame = figma.createFrame();
  propFrame.name = label;
  propFrame.layoutMode = "HORIZONTAL";
  propFrame.itemSpacing = 8;
  propFrame.fills = [];
  propFrame.primaryAxisSizingMode = "AUTO";
  propFrame.counterAxisSizingMode = "AUTO";

  const propLabel = figma.createText();
  propLabel.characters = `${label}:`;
  propLabel.fontSize = 14;
  propLabel.fontName = { family: "Inter", style: "Regular" };
  propLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  propFrame.appendChild(propLabel);

  // If it's a color, show swatch
  if (label === "Color" && value.startsWith('#')) {
    const swatch = figma.createRectangle();
    swatch.resize(20, 20);
    swatch.cornerRadius = 4;
    const rgbColor = hexToRgb(value);
    swatch.fills = [{ type: 'SOLID', color: { r: rgbColor.r, g: rgbColor.g, b: rgbColor.b } }];
    swatch.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    swatch.strokeWeight = 1;
    propFrame.appendChild(swatch);
  }

  const propValue = figma.createText();
  propValue.characters = value;
  propValue.fontSize = 14;
  propValue.fontName = { family: "Inter", style: "Regular" };
  propFrame.appendChild(propValue);

  return propFrame;
}

async function generateSpacingLayoutFromTokens(parent, spacing, variableMap) {
  const section = figma.createFrame();
  section.name = "Spacing";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 20;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "AUTO";

  const title = figma.createText();
  title.characters = "Spacing";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Regular" };
  section.appendChild(title);

  const table = figma.createFrame();
  table.layoutMode = "VERTICAL";
  table.itemSpacing = 1;
  table.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  table.counterAxisSizingMode = "AUTO";

  const headerRow = figma.createFrame();
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  headerRow.paddingLeft = 16;
  headerRow.paddingRight = 16;
  headerRow.paddingTop = 10;
  headerRow.paddingBottom = 10;
  headerRow.primaryAxisSizingMode = "AUTO";
  headerRow.counterAxisSizingMode = "AUTO";

  ['Name', 'Mobile', 'Tablet', 'Desktop'].forEach(text => {
    const cell = figma.createText();
    cell.characters = text;
    cell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    cell.fontSize = 16;
    cell.fontName = { family: "Inter", style: "Bold" };
    cell.resize(100, cell.height);
    headerRow.appendChild(cell);
  });
  table.appendChild(headerRow);

  spacing.forEach(item => {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    row.paddingLeft = 16;
    row.paddingRight = 16;
    row.paddingTop = 10;
    row.paddingBottom = 10;
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";

    const label = figma.createText();
    label.characters = item.name;
    label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    label.fontSize = 16;
    label.fontName = { family: "Inter", style: "Regular" };
    label.resize(100, label.height);
    row.appendChild(label);

    [item.mobile, item.tablet, item.desktop].forEach(val => {
      const valText = figma.createText();
      valText.characters = String(val);
      valText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      valText.fontSize = 16;
      valText.fontName = { family: "Inter", style: "Regular" };
      valText.resize(100, valText.height);
      row.appendChild(valText);
    });

    table.appendChild(row);
  });

  section.appendChild(table);
  parent.appendChild(section);
}

async function generateBorderLayoutFromTokens(parent, borders) {
  // Ensure borders object has required properties
  if (!borders || (!borders.radius && !borders.width)) {
    console.warn('Invalid borders object:', borders);
    return;
  }
  
  // Create safe copies of arrays to avoid modifying original
  const radiusArray = borders.radius && Array.isArray(borders.radius) ? Array.from(borders.radius) : [];
  const widthArray = borders.width && Array.isArray(borders.width) ? Array.from(borders.width) : [];
  
  const section = figma.createFrame();
  section.name = "Border";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  // Border Radius
  if (radiusArray.length > 0) {
    const radiusTitle = figma.createText();
    radiusTitle.fontName = { family: "Inter", style: "Bold" };
    radiusTitle.characters = "Border Radius";
    radiusTitle.fontSize = 24;
    section.appendChild(radiusTitle);

    const radiusFrame = figma.createFrame();
    radiusFrame.name = "Radius Examples";
    radiusFrame.layoutMode = "HORIZONTAL";
    radiusFrame.itemSpacing = 20;
    radiusFrame.fills = [];
    radiusFrame.primaryAxisSizingMode = "AUTO";
    radiusFrame.counterAxisSizingMode = "AUTO";
    radiusFrame.paddingTop = 20;
    radiusFrame.paddingBottom = 20;
    radiusFrame.layoutWrap = "WRAP";

    radiusArray.forEach(radius => {
      const example = figma.createFrame();
      example.name = radius.name;
      example.layoutMode = "VERTICAL";
      example.itemSpacing = 12;
      example.fills = [];
      example.primaryAxisSizingMode = "AUTO";
      example.counterAxisSizingMode = "AUTO";
      example.layoutAlign = "STRETCH";

      const rect = figma.createRectangle();
      rect.name = "Example";
      rect.resize(90, 90);
      rect.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      rect.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
      rect.strokeWeight = 2;
      rect.cornerRadius = radius.value;

      const label = figma.createText();
      label.fontName = { family: "Inter", style: "Regular" };
      label.characters = radius.name;
      label.fontSize = 14;
      label.textAlignHorizontal = "CENTER";
      label.textAutoResize = "WIDTH_AND_HEIGHT";
      label.layoutAlign = "STRETCH";

      const value = figma.createText();
      value.fontName = { family: "Inter", style: "Regular" };
      value.characters = String(radius.value) + "px";
      value.fontSize = 12;
      value.textAlignHorizontal = "CENTER";
      value.textAutoResize = "WIDTH_AND_HEIGHT";
      value.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
      value.layoutAlign = "STRETCH";

      const description = figma.createText();
      description.fontName = { family: "Inter", style: "Regular" };
      description.characters = radius.description || '';
      description.fontSize = 11;
      description.textAlignHorizontal = "CENTER";
      description.textAutoResize = "WIDTH_AND_HEIGHT";
      description.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
      description.layoutAlign = "STRETCH";

      example.appendChild(rect);
      example.appendChild(label);
      example.appendChild(value);
      if (radius.description) {
        example.appendChild(description);
      }
      radiusFrame.appendChild(example);
    });

    section.appendChild(radiusFrame);
  }

  // Border Width
  if (widthArray.length > 0) {
    const widthTitle = figma.createText();
    widthTitle.fontName = { family: "Inter", style: "Bold" };
    widthTitle.characters = "Border Width";
    widthTitle.fontSize = 24;
    section.appendChild(widthTitle);

    const widthFrame = figma.createFrame();
    widthFrame.name = "Width Examples";
    widthFrame.layoutMode = "VERTICAL";
    widthFrame.itemSpacing = 16;
    widthFrame.fills = [];
    widthFrame.primaryAxisSizingMode = "AUTO";
    widthFrame.counterAxisSizingMode = "FIXED";
    widthFrame.resize(1200, 100);
    widthFrame.paddingTop = 20;
    widthFrame.paddingBottom = 20;

    widthArray.forEach(width => {
      const example = figma.createFrame();
      example.name = width.name;
      example.layoutMode = "HORIZONTAL";
      example.itemSpacing = 20;
      example.fills = [];
      example.primaryAxisAlignItems = "CENTER";
      example.counterAxisAlignItems = "CENTER";
      example.primaryAxisSizingMode = "FIXED";
      example.counterAxisSizingMode = "AUTO";
      example.resize(1200, 50);
      example.layoutAlign = "STRETCH";

      const label = figma.createText();
      label.fontName = { family: "Inter", style: "Regular" };
      label.characters = width.name;
      label.fontSize = 14;
      label.textAutoResize = "WIDTH_AND_HEIGHT";
      label.resize(150, label.height);
      label.layoutGrow = 0;

      const line = figma.createRectangle();
      line.name = "Example";
      line.resize(200, width.value);
      line.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      line.cornerRadius = width.value / 2;
      line.layoutGrow = 0;

      const value = figma.createText();
      value.fontName = { family: "Inter", style: "Regular" };
      value.characters = String(width.value) + "px";
      value.fontSize = 12;
      value.textAutoResize = "WIDTH_AND_HEIGHT";
      value.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
      value.layoutGrow = 0;

      const description = figma.createText();
      description.fontName = { family: "Inter", style: "Regular" };
      description.characters = width.description || '';
      description.fontSize = 12;
      description.textAutoResize = "WIDTH_AND_HEIGHT";
      description.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
      description.layoutGrow = 1;

      example.appendChild(label);
      example.appendChild(line);
      example.appendChild(value);
      if (width.description) {
        example.appendChild(description);
      }
      widthFrame.appendChild(example);
    });

    section.appendChild(widthFrame);
  }

  parent.appendChild(section);
}

async function generateShadowLayoutFromTokens(parent, shadows) {
  const section = figma.createFrame();
  section.name = "Shadows";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  const title = figma.createText();
  title.fontName = { family: "Inter", style: "Bold" };
  title.characters = "Shadows";
  title.fontSize = 24;
  section.appendChild(title);

  const shadowsFrame = figma.createFrame();
  shadowsFrame.name = "Shadow Examples";
  shadowsFrame.layoutMode = "HORIZONTAL";
  shadowsFrame.itemSpacing = 30;
  shadowsFrame.fills = [];
  shadowsFrame.primaryAxisSizingMode = "AUTO";
  shadowsFrame.counterAxisSizingMode = "AUTO";
  shadowsFrame.paddingTop = 20;
  shadowsFrame.paddingBottom = 20;

  shadows.forEach(shadow => {
    if (shadow.value === '0 0 #0000' || shadow.name === 'none') {
      return; // Skip none shadow
    }

    const example = figma.createFrame();
    example.name = shadow.name;
    example.layoutMode = "VERTICAL";
    example.itemSpacing = 12;
    example.fills = [];
    example.primaryAxisSizingMode = "AUTO";
    example.counterAxisSizingMode = "AUTO";

    const rect = figma.createRectangle();
    rect.name = "Example";
    rect.resize(150, 150);
    rect.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    rect.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    rect.strokeWeight = 1;
    
    // Apply shadow effect
    const effects = parseShadowString(shadow.value);
    if (effects.length > 0) {
      rect.effects = effects;
    }

    const label = figma.createText();
    label.fontName = { family: "Inter", style: "Regular" };
    label.characters = shadow.name;
    label.fontSize = 14;
    label.textAlignHorizontal = "CENTER";

    example.appendChild(rect);
    example.appendChild(label);
    shadowsFrame.appendChild(example);
  });

  section.appendChild(shadowsFrame);
  parent.appendChild(section);
}

async function generateBreakpointLayoutFromTokens(parent, breakpoints) {
  const section = figma.createFrame();
  section.name = "Breakpoints";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 20;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "AUTO";

  const title = figma.createText();
  title.characters = "Breakpoints";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Regular" };
  section.appendChild(title);

  const table = figma.createFrame();
  table.layoutMode = "VERTICAL";
  table.itemSpacing = 1;
  table.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  table.counterAxisSizingMode = "AUTO";

  const headerRow = figma.createFrame();
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  headerRow.paddingLeft = 16;
  headerRow.paddingRight = 16;
  headerRow.paddingTop = 10;
  headerRow.paddingBottom = 10;
  headerRow.primaryAxisSizingMode = "AUTO";
  headerRow.counterAxisSizingMode = "AUTO";

  ['Name', 'Min Width', 'Max Width', 'Description'].forEach(text => {
    const cell = figma.createText();
    cell.characters = text;
    cell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    cell.fontSize = 16;
    cell.fontName = { family: "Inter", style: "Bold" };
    cell.resize(150, cell.height);
    headerRow.appendChild(cell);
  });
  table.appendChild(headerRow);

  breakpoints.forEach(bp => {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    row.paddingLeft = 16;
    row.paddingRight = 16;
    row.paddingTop = 10;
    row.paddingBottom = 10;
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";

    const nameCell = figma.createText();
    nameCell.characters = bp.name;
    nameCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    nameCell.fontSize = 16;
    nameCell.fontName = { family: "Inter", style: "Regular" };
    nameCell.resize(150, nameCell.height);
    row.appendChild(nameCell);

    const minCell = figma.createText();
    minCell.characters = bp.value;
    minCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    minCell.fontSize = 16;
    minCell.fontName = { family: "Inter", style: "Regular" };
    minCell.resize(150, minCell.height);
    row.appendChild(minCell);

    const maxCell = figma.createText();
    maxCell.characters = bp.max;
    maxCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    maxCell.fontSize = 16;
    maxCell.fontName = { family: "Inter", style: "Regular" };
    maxCell.resize(150, maxCell.height);
    row.appendChild(maxCell);

    const descCell = figma.createText();
    descCell.characters = bp.description || '';
    descCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    descCell.fontSize = 16;
    descCell.fontName = { family: "Inter", style: "Regular" };
    descCell.resize(300, descCell.height);
    row.appendChild(descCell);

    table.appendChild(row);
  });

  section.appendChild(table);
  parent.appendChild(section);
}

// ============================================
// GENERATE BUTTON COMPONENTS (NEW FORMAT)
// ============================================

// Helper: Get fontFamily from body typography style
function getFontFamilyFromBodyStyle(parsedTokens) {
  if (!parsedTokens || !parsedTokens.typography) {
    return null;
  }
  
  // Find body style
  for (const style of parsedTokens.typography) {
    if (style.displayName === 'body' || style.name.toLowerCase().includes('body')) {
      // Try to get fontFamily from any breakpoint
      if (style.fontFamily) {
        return style.fontFamily;
      }
    }
  }
  
  return null;
}

async function generateButtonComponents(buttonData, colorVariables, config, parsedTokens) {
  console.log('=== generateButtonComponents START ===');
  console.log('buttonData:', buttonData);
  console.log('buttonData.format:', buttonData ? buttonData.format : 'undefined');
  console.log('colorVariables count:', colorVariables ? colorVariables.length : 0);
  console.log('config:', config);
  
  if (!buttonData || buttonData.format !== 'new') {
    console.log('❌ Skipping: not new format or missing button data');
    console.log('  - buttonData exists?', !!buttonData);
    console.log('  - format:', buttonData ? buttonData.format : 'N/A');
    return null;
  }
  
  const button = buttonData.button;
  const variants = button.variants;
  const base = button.base;
  const sizes = button.sizes;
  const styles = button.styles;
  const properties = button.properties;
  
  console.log('Button variants:', variants);
  console.log('Button base:', base);
  console.log('Button sizes:', sizes);
  console.log('Button styles keys:', styles ? Object.keys(styles) : 'none');
  console.log('Button properties:', properties);
  
  // Get fontFamily - from button config, or from body style, or error
  let fontFamily = base.font.family;
  if (!fontFamily && parsedTokens) {
    fontFamily = getFontFamilyFromBodyStyle(parsedTokens);
    console.log('Got fontFamily from body style:', fontFamily);
  }
  
  if (!fontFamily) {
    const errorMsg = 'Font family not found. Please set fontFamily in button.base.font or ensure body typography style has fontFamily.';
    console.error('❌', errorMsg);
    figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
    throw new Error(errorMsg);
  }
  
  const fontWeight = mapFontWeightToFigma(base.font.weight);
  console.log('Using fontFamily:', fontFamily, 'fontWeight:', fontWeight);
  
  // Create a parent frame to hold all components (Component Set will be created automatically)
  const componentSetFrame = figma.createFrame();
  componentSetFrame.name = 'Button';
  componentSetFrame.layoutMode = 'VERTICAL';
  componentSetFrame.itemSpacing = 20;
  componentSetFrame.fills = [];
  
  // Generate all variant combinations
  const components = [];
  const totalCombinations = variants.type.length * variants.color.length * variants.size.length * variants.state.length;
  console.log(`Generating ${totalCombinations} button component variants...`);
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const type of variants.type) {
    for (const color of variants.color) {
      for (const size of variants.size) {
        for (const state of variants.state) {
          // Get style data for this variant
          const styleData = styles[type] && styles[type][color] && styles[type][color][state];
          if (!styleData) {
            console.warn(`⚠ Missing style for ${type}/${color}/${state}`);
            skippedCount++;
            continue;
          }
          
          console.log(`Creating component: ${type}/${color}/${size}/${state}`);
          
          // Create component
          const component = figma.createComponent();
          
          // Name component - Figma will auto-create variant properties when components are in same frame
          // Format: "Type=Value1, Color=Value2, Size=Value3, State=Value4"
          const typeName = type.charAt(0).toUpperCase() + type.slice(1);
          const colorName = color.charAt(0).toUpperCase() + color.slice(1);
          const sizeName = size.charAt(0).toUpperCase() + size.slice(1);
          const stateName = state.charAt(0).toUpperCase() + state.slice(1);
          // Use pattern that Figma recognizes for variant properties
          component.name = `Type=${typeName}, Color=${colorName}, Size=${sizeName}, State=${stateName}`;
          
          // Configure Auto Layout
          const layoutDirection = base.layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
          const layoutAlign = base.layout.align === 'center' ? 'CENTER' : 
                             base.layout.align === 'start' ? 'MIN' : 
                             base.layout.align === 'end' ? 'MAX' : 'CENTER';
          
          component.layoutMode = layoutDirection;
          component.primaryAxisAlignItems = layoutAlign;
          component.counterAxisAlignItems = 'CENTER';
          component.itemSpacing = base.layout.gap;
          
          // Apply padding
          const sizeData = sizes[size];
          if (sizeData && sizeData.padding) {
            component.paddingLeft = sizeData.padding.x;
            component.paddingRight = sizeData.padding.x;
            component.paddingTop = sizeData.padding.y;
            component.paddingBottom = sizeData.padding.y;
          }
          
          // Apply minHeight
          if (base.minHeight && base.minHeight[size]) {
            component.minHeight = base.minHeight[size];
          }
          
          // Apply border radius and width
          component.cornerRadius = base.borderRadius;
          component.strokeWeight = base.borderWidth;
          
          // Apply colors (bind to variables)
          try {
            // Background
            if (styleData.background && styleData.background !== 'color.transparent') {
              const bgPaint = resolveColorToPaint(styleData.background, colorVariables);
              if (bgPaint) {
                component.fills = [bgPaint];
              }
            } else {
              component.fills = [];
            }

            // Border
            if (styleData.border && styleData.border !== 'color.transparent') {
              const borderPaint = resolveColorToPaint(styleData.border, colorVariables);
              if (borderPaint) {
                component.strokes = [borderPaint];
              } else {
                component.strokes = [];
              }
            } else {
              component.strokes = [];
            }
            
            // Opacity
            if (styleData.opacity !== undefined) {
              component.opacity = styleData.opacity;
            }
          } catch (error) {
            console.error(`Error applying colors for ${type}/${color}/${state}:`, error);
            throw error;
          }
          
          // Create text layer
          const textNode = figma.createText();
          const defaultText = resolveConfigValue(
            properties.text ? properties.text.default : '{config.examples.defaultText}',
            config
          );
          textNode.characters = defaultText || 'Button';
          
          // Apply typography
          const fontSize = typeof base.font.size === 'object' 
            ? (base.font.size[size] || base.font.size.large || 16)
            : (base.font.size || 16);
          const lineHeight = typeof base.font.lineHeight === 'object'
            ? (base.font.lineHeight[size] || base.font.lineHeight.large || 24)
            : (base.font.lineHeight || 24);
          
          // Load font - Try exact name first, then common alternative names
          const figmaFontWeight = mapFontWeightToFigma(base.font.weight);
          
          // Validate fontFamily before loading
          if (!fontFamily || fontFamily === 'undefined') {
            const errorMsg = 'Font family is undefined. Please set fontFamily in button.base.font or ensure body typography style has fontFamily.';
            console.error('❌', errorMsg);
            figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
            throw new Error(errorMsg);
          }
          
          let fontToUse = { family: fontFamily, style: figmaFontWeight };
          let fontLoaded = false;
          
          try {
            await figma.loadFontAsync(fontToUse);
            fontLoaded = true;
            console.log(`✓ Loaded font: ${fontFamily} ${figmaFontWeight}`);
          } catch (e) {
            // Try alternative names for Semibold (different fonts use different naming)
            if (figmaFontWeight === 'Semibold') {
              const alternatives = ['Semi Bold', 'SemiBold', 'semibold'];
              for (const altStyle of alternatives) {
                try {
                  await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                  fontToUse = { family: fontFamily, style: altStyle };
                fontLoaded = true;
                  console.log(`✓ Loaded font: ${fontFamily} ${altStyle}`);
                  break;
              } catch (e2) {
                  // Continue to next alternative
                }
              }
            }
            // Try alternative names for ExtraBold
            else if (figmaFontWeight === 'ExtraBold') {
              const alternatives = ['Extra Bold', 'ExtraBold', 'extrabold'];
              for (const altStyle of alternatives) {
                try {
                  await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                  fontToUse = { family: fontFamily, style: altStyle };
                  fontLoaded = true;
                  console.log(`✓ Loaded font: ${fontFamily} ${altStyle}`);
                  break;
                } catch (e2) {
                  // Continue to next alternative
                }
              }
            }
            // Try alternative names for ExtraLight
            else if (figmaFontWeight === 'ExtraLight') {
              const alternatives = ['Extra Light', 'ExtraLight', 'extralight'];
              for (const altStyle of alternatives) {
                try {
                  await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                  fontToUse = { family: fontFamily, style: altStyle };
                  fontLoaded = true;
                  console.log(`✓ Loaded font: ${fontFamily} ${altStyle}`);
                  break;
                } catch (e2) {
                  // Continue to next alternative
                }
              }
            }
          }
          
          if (!fontLoaded) {
            const errorMsg = `Font weight "${figmaFontWeight}" (weight: ${base.font.weight}) not found for font family "${fontFamily}". Please ensure this font weight exists in your design system. Tried: ${figmaFontWeight}${figmaFontWeight === 'Semibold' ? ', Semi Bold, SemiBold' : ''}${figmaFontWeight === 'ExtraBold' ? ', Extra Bold, ExtraBold' : ''}${figmaFontWeight === 'ExtraLight' ? ', Extra Light, ExtraLight' : ''}`;
            console.error('❌', errorMsg);
            figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
            throw new Error(errorMsg);
          }
          
          textNode.fontName = fontToUse;
          textNode.fontSize = fontSize;
          textNode.lineHeight = { value: lineHeight, unit: 'PIXELS' };
          
          // Apply text color
          try {
            if (styleData.text) {
              const textPaint = resolveColorToPaint(styleData.text, colorVariables);
              if (textPaint) {
                textNode.fills = [textPaint];
              }
            }
          } catch (error) {
            console.error(`Error applying text color for ${type}/${color}/${state}:`, error);
          }

          textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
          // Name must match property name for Figma to allow instance overrides
          textNode.name = 'text';

          // Resolve icon config value
          const iconConfigValue = resolveConfigValue(
            properties.icon ? properties.icon.default : '{config.icons.default}', config
          );

          // Get text color for icon (should match text color)
          let iconColor = { r: 0, g: 0, b: 0 };
          let iconFill = null;
          if (styleData.text) {
            try {
              const textPaint = resolveColorToPaint(styleData.text, colorVariables);
              if (textPaint) {
                iconFill = [textPaint];
              }
            } catch (error) {
              console.warn('Could not resolve text color for icon:', error);
            }
          }

          // Create icon node (may return null for "none")
          const iconNode = createIconFromSVG(iconColor, fontToUse, iconConfigValue);

          if (iconNode) {
            iconNode.name = 'icon';
            if (iconFill) {
              if (iconNode.type === 'GROUP' || iconNode.type === 'FRAME') {
                applyFillToAllChildren(iconNode, iconFill[0]);
              } else {
                iconNode.fills = iconFill;
              }
            }

            // Create icon containers (with actual icons, controlled by properties)
            const leftIconContainer = figma.createFrame();
            leftIconContainer.name = 'leftIcon';
            leftIconContainer.layoutMode = 'HORIZONTAL';
            leftIconContainer.primaryAxisAlignItems = 'CENTER';
            leftIconContainer.counterAxisAlignItems = 'CENTER';
            const leftIcon = iconNode.clone();
            leftIconContainer.appendChild(leftIcon);
            leftIconContainer.primaryAxisSizingMode = 'AUTO';
            leftIconContainer.counterAxisSizingMode = 'AUTO';
            leftIconContainer.visible = false;

            const rightIconContainer = figma.createFrame();
            rightIconContainer.name = 'rightIcon';
            rightIconContainer.layoutMode = 'HORIZONTAL';
            rightIconContainer.primaryAxisAlignItems = 'CENTER';
            rightIconContainer.counterAxisAlignItems = 'CENTER';
            rightIconContainer.appendChild(iconNode);
            rightIconContainer.primaryAxisSizingMode = 'AUTO';
            rightIconContainer.counterAxisSizingMode = 'AUTO';
            rightIconContainer.visible = true;

            // Add Component Properties
            if (properties.leftIcon) {
              component.addComponentProperty('leftIcon', 'BOOLEAN', properties.leftIcon.default || false);
            }
            if (properties.rightIcon) {
              component.addComponentProperty('rightIcon', 'BOOLEAN', properties.rightIcon.default !== undefined ? properties.rightIcon.default : true);
            }
            if (properties.text) {
              const textDefault = resolveConfigValue(properties.text.default, config);
              component.addComponentProperty('text', 'TEXT', textDefault || 'Button');
            }
            if (properties.icon) {
              component.addComponentProperty('icon', 'TEXT', iconConfigValue || '');
            }

            // Append children (leftIcon, text, rightIcon)
            component.appendChild(leftIconContainer);
            component.appendChild(textNode);
            component.appendChild(rightIconContainer);
          } else {
            // No icon — text only
            if (properties.text) {
              const textDefault = resolveConfigValue(properties.text.default, config);
              component.addComponentProperty('text', 'TEXT', textDefault || 'Button');
            }
            component.appendChild(textNode);
          }
          
          // Add to component set frame
          componentSetFrame.appendChild(component);
          components.push(component);
          createdCount++;
          console.log(`✓ Created component ${createdCount}/${totalCombinations}: ${type}/${color}/${size}/${state}`);
        }
      }
    }
  }
  
  // Figma will automatically create a Component Set if components have variantProperties
  // and are children of the same frame
  console.log(`=== generateButtonComponents END ===`);
  console.log(`✓ Created ${createdCount} button components`);
  console.log(`⚠ Skipped ${skippedCount} components (missing styles)`);
  console.log(`Component set frame children: ${componentSetFrame.children.length}`);
  
  // Return the frame (which will become a Component Set automatically)
  return componentSetFrame;
}

// ============================================
// GENERATE BUTTON GRID LAYOUT (NEW FORMAT - LIKE SCREENSHOT)
// ============================================

async function generateButtonGridLayout(parent, buttonData, colorVariables, config, parsedTokens, componentSet = null) {
  console.log('=== generateButtonGridLayout START ===');
  console.log('componentSet provided?', !!componentSet);
  
  if (!buttonData || buttonData.format !== 'new') {
    console.log('❌ Skipping: not new format or missing button data');
    return;
  }
  
  const button = buttonData.button;
  const variants = button.variants;
  const base = button.base;
  const sizes = button.sizes;
  const styles = button.styles;
  const properties = button.properties;
  
  // Get fontFamily
  let fontFamily = base.font.family;
  if (!fontFamily && parsedTokens) {
    fontFamily = getFontFamilyFromBodyStyle(parsedTokens);
  }
  if (!fontFamily) {
    const errorMsg = 'Font family not found. Please set fontFamily in button.base.font or ensure body typography style has fontFamily.';
    console.error('❌', errorMsg);
    figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
    throw new Error(errorMsg);
  }
  
  // Validate fontFamily before loading
  if (!fontFamily || fontFamily === 'undefined') {
    console.error('❌ fontFamily is undefined or null, cannot load font');
    throw new Error('Font family is undefined. Please set fontFamily in button.base.font or ensure body typography style has fontFamily.');
  }
  
  // Load fonts - Try exact name first, then common alternative names
  const fontWeight = mapFontWeightToFigma(base.font.weight);
  let fontToUse = { family: fontFamily, style: fontWeight };
  
  console.log(`[generateButtonGridLayout] Loading font: ${fontFamily} ${fontWeight}`);
  
  let fontLoaded = false;
    try {
      await figma.loadFontAsync(fontToUse);
    fontLoaded = true;
      console.log(`✓ [generateButtonGridLayout] Successfully loaded font: ${fontFamily} ${fontWeight}`);
    } catch (e) {
    // Try alternative names for Semibold (different fonts use different naming)
    // Some fonts use "Semi Bold" (with space), "SemiBold" (camelCase), etc.
      if (fontWeight === 'Semibold') {
      const alternatives = ['Semi Bold', 'SemiBold', 'semibold'];
      for (const altStyle of alternatives) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style: altStyle });
          fontToUse = { family: fontFamily, style: altStyle };
          fontLoaded = true;
          console.log(`✓ [generateButtonGridLayout] Successfully loaded ${fontFamily} ${altStyle}`);
          break;
        } catch (e2) {
          // Continue to next alternative
        }
      }
    }
    // Try alternative names for ExtraBold
    else if (fontWeight === 'ExtraBold') {
      const alternatives = ['Extra Bold', 'ExtraBold', 'extrabold'];
      for (const altStyle of alternatives) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style: altStyle });
          fontToUse = { family: fontFamily, style: altStyle };
          fontLoaded = true;
          console.log(`✓ [generateButtonGridLayout] Successfully loaded ${fontFamily} ${altStyle}`);
          break;
        } catch (e2) {
          // Continue to next alternative
        }
      }
    }
    // Try alternative names for ExtraLight
    else if (fontWeight === 'ExtraLight') {
      const alternatives = ['Extra Light', 'ExtraLight', 'extralight'];
      for (const altStyle of alternatives) {
        try {
          await figma.loadFontAsync({ family: fontFamily, style: altStyle });
          fontToUse = { family: fontFamily, style: altStyle };
          fontLoaded = true;
          console.log(`✓ [generateButtonGridLayout] Successfully loaded ${fontFamily} ${altStyle}`);
          break;
        } catch (e2) {
          // Continue to next alternative
        }
      }
    }
  }
  
  if (!fontLoaded) {
    const errorMsg = `Font weight "${fontWeight}" (weight: ${base.font.weight}) not found for font family "${fontFamily}". Please ensure this font weight exists in your design system. Tried: ${fontWeight}${fontWeight === 'Semibold' ? ', Semi Bold, SemiBold' : ''}${fontWeight === 'ExtraBold' ? ', Extra Bold, ExtraBold' : ''}${fontWeight === 'ExtraLight' ? ', Extra Light, ExtraLight' : ''}`;
    console.error('❌ [generateButtonGridLayout]', errorMsg);
    figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
    throw new Error(errorMsg);
  }
  
  // Load Inter for UI text (with error handling)
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  } catch (e) {
    console.warn('Could not load some Inter font variants:', e);
  }
  
  // Create section
  const section = figma.createFrame();
  section.name = "Buttons";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 20;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);
  
  // Title
  const title = figma.createText();
  title.characters = "Buttons";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
  section.appendChild(title);
  
  // Create grid table
  const grid = figma.createFrame();
  grid.name = "Button Grid";
  grid.layoutMode = "VERTICAL";
  grid.itemSpacing = 0;
  grid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  grid.counterAxisSizingMode = "AUTO";
  grid.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }];
  grid.strokeWeight = 1;
  grid.cornerRadius = 4;
  
  // Define column widths (consistent across header and data rows)
  const COLUMN_WIDTHS = {
    variant: 200,
    state: 300
  };
  
  // Header row - auto height
  const headerRow = figma.createFrame();
  headerRow.name = "Header";
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  headerRow.paddingLeft = 16;
  headerRow.paddingRight = 16;
  headerRow.paddingTop = 12;
  headerRow.paddingBottom = 12;
  headerRow.itemSpacing = 0; // No spacing between cells
  headerRow.counterAxisSizingMode = "AUTO"; // Auto height
  
  // Header cells - wrap in fixed width containers
    const variantHeaderCell = figma.createFrame();
    variantHeaderCell.layoutMode = "HORIZONTAL";
    variantHeaderCell.primaryAxisAlignItems = "MIN";
    variantHeaderCell.counterAxisAlignItems = "CENTER";
    variantHeaderCell.fills = [];
    variantHeaderCell.resize(COLUMN_WIDTHS.variant, 1); // Will auto-resize
    variantHeaderCell.primaryAxisSizingMode = "FIXED";
    variantHeaderCell.counterAxisSizingMode = "AUTO"; // Auto height
  
  const variantHeader = figma.createText();
  variantHeader.characters = "Type - Color - Size";
  variantHeader.fontSize = 13;
  variantHeader.fontName = { family: "Inter", style: "Semi Bold" };
  variantHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  variantHeader.letterSpacing = { value: 0.5, unit: 'PIXELS' };
  variantHeader.textAutoResize = "WIDTH_AND_HEIGHT";
  variantHeaderCell.appendChild(variantHeader);
  headerRow.appendChild(variantHeaderCell);
  
  const states = ['Default', 'Hover', 'Disable'];
  const stateKeys = ['default', 'hover', 'disabled'];
  states.forEach(state => {
    const stateHeaderCell = figma.createFrame();
    stateHeaderCell.layoutMode = "HORIZONTAL";
    stateHeaderCell.primaryAxisAlignItems = "MIN";
    stateHeaderCell.counterAxisAlignItems = "CENTER";
    stateHeaderCell.fills = [];
    stateHeaderCell.resize(COLUMN_WIDTHS.state, 1); // Will auto-resize
    stateHeaderCell.primaryAxisSizingMode = "FIXED";
    stateHeaderCell.counterAxisSizingMode = "AUTO"; // Auto height
    
    const stateHeader = figma.createText();
    stateHeader.characters = state;
    stateHeader.fontSize = 14;
    stateHeader.fontName = { family: "Inter", style: "Bold" };
    stateHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stateHeader.textAutoResize = "WIDTH_AND_HEIGHT";
    stateHeaderCell.appendChild(stateHeader);
    headerRow.appendChild(stateHeaderCell);
  });
  
  grid.appendChild(headerRow);
  
  // Generate rows for each variant combination (type, color, size)
  for (const type of variants.type) {
    for (const color of variants.color) {
      for (const size of variants.size) {
        // Skip row if no style data exists for this type/color combination
        const hasAnyStyleData = stateKeys.some(sk => styles[type] && styles[type][color] && styles[type][color][sk]);
        if (!hasAnyStyleData) continue;

        const row = figma.createFrame();
        row.name = `${type} - ${color} - ${size}`;
        row.layoutMode = "HORIZONTAL";
        row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        row.paddingLeft = 20;
        row.paddingRight = 20;
        row.paddingTop = 20;
        row.paddingBottom = 20;
        row.itemSpacing = 0; // No spacing between cells for perfect alignment
        row.counterAxisSizingMode = "AUTO"; // Auto height to fit button content
        // Add subtle border between rows
        row.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }];
        row.strokeWeight = 1;
        row.strokeTopWeight = 1;
        row.strokeBottomWeight = 0;
        row.strokeLeftWeight = 0;
        row.strokeRightWeight = 0;

        // Variant label cell - fixed width, auto height
        const variantLabelCell = figma.createFrame();
        variantLabelCell.layoutMode = "HORIZONTAL";
        variantLabelCell.primaryAxisAlignItems = "MIN";
        variantLabelCell.counterAxisAlignItems = "CENTER";
        variantLabelCell.fills = [];
        variantLabelCell.resize(COLUMN_WIDTHS.variant, 1); // Will auto-resize
        variantLabelCell.primaryAxisSizingMode = "FIXED";
        variantLabelCell.counterAxisSizingMode = "AUTO"; // Auto height
        
        const variantLabel = figma.createText();
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        const sizeName = size.charAt(0).toUpperCase() + size.slice(1);
        variantLabel.characters = `${typeName} - ${colorName} - ${sizeName}`;
        variantLabel.fontSize = 13;
        variantLabel.fontName = { family: "Inter", style: "Medium" };
        variantLabel.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
        variantLabel.textAutoResize = "WIDTH_AND_HEIGHT";
        variantLabelCell.appendChild(variantLabel);
        row.appendChild(variantLabelCell);
        
        // Create button instance for each state
        for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
          const state = states[stateIdx];
          const stateKey = stateKeys[stateIdx];
          
          // Get style data
          const styleData = styles[type] && styles[type][color] && styles[type][color][stateKey];
          
          // Create cell container with fixed width, auto height - align left
          const cellContainer = figma.createFrame();
          cellContainer.layoutMode = "HORIZONTAL";
          cellContainer.primaryAxisAlignItems = "MIN"; // Left align
          cellContainer.counterAxisAlignItems = "CENTER";
          cellContainer.fills = [];
          cellContainer.paddingLeft = 16;
          cellContainer.paddingRight = 16;
          cellContainer.paddingTop = 12;
          cellContainer.paddingBottom = 12;
          cellContainer.resize(COLUMN_WIDTHS.state, 1); // Will auto-resize
          cellContainer.primaryAxisSizingMode = "FIXED";
          cellContainer.counterAxisSizingMode = "AUTO"; // Auto height to fit button
          
          if (!styleData) {
            row.appendChild(cellContainer);
            continue;
          }
          
          // Create button instance from Component Set if available
          let buttonInstance = null;
          
          if (componentSet && componentSet.type === 'COMPONENT_SET') {
            // Find the matching component in the Component Set
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            const colorName = color.charAt(0).toUpperCase() + color.slice(1);
            const sizeName = size.charAt(0).toUpperCase() + size.slice(1);
            const stateName = state.charAt(0).toUpperCase() + state.slice(1);
            
            // Find component with matching variant properties
            let matchingComponent = null;
            for (const child of componentSet.children) {
              if (child.type === 'COMPONENT') {
                const variantProps = child.variantProperties;
                if (variantProps && 
                    variantProps.Type === typeName &&
                    variantProps.Color === colorName &&
                    variantProps.Size === sizeName &&
                    variantProps.State === stateName) {
                  matchingComponent = child;
                  break;
                }
              }
            }
            
            if (matchingComponent) {
              // Create instance from component
              buttonInstance = matchingComponent.createInstance();
              buttonInstance.name = `${typeName} ${colorName} ${sizeName} ${state}`;
              
              // Set default properties for the instance
              try {
                const textDefault = resolveConfigValue(
                  properties.text ? properties.text.default : '{config.examples.defaultText}',
                  config
                );
                const iconDefault = resolveConfigValue(
                  properties.icon ? properties.icon.default : '{config.icons.default}',
                  config
                );
                
                buttonInstance.setProperties({
                  'text': textDefault || 'Button',
                  'leftIcon': properties.leftIcon ? (properties.leftIcon.default || false) : false,
                  'rightIcon': properties.rightIcon ? (properties.rightIcon.default !== undefined ? properties.rightIcon.default : true) : true,
                  'icon': iconDefault || 'arrow--right'
                });
              } catch (propError) {
                console.warn('Could not set properties for instance:', propError);
              }
              
              console.log(`✓ Created instance from Component Set: ${typeName}/${colorName}/${sizeName}/${stateName}`);
            } else {
              console.warn(`⚠ Component not found in Component Set: ${typeName}/${colorName}/${sizeName}/${stateName}`);
            }
          }
          
          // Fallback: Create button frame if no Component Set or component not found
          if (!buttonInstance) {
            // Create button frame
            const buttonFrame = figma.createFrame();
            buttonFrame.name = `${typeName} ${colorName} ${sizeName} ${state}`;
            buttonFrame.layoutMode = "HORIZONTAL";
            buttonFrame.primaryAxisAlignItems = "CENTER";
            buttonFrame.counterAxisAlignItems = "CENTER";
            
            // Apply padding
            const sizeData = sizes[size];
            if (sizeData && sizeData.padding) {
              buttonFrame.paddingLeft = sizeData.padding.x;
              buttonFrame.paddingRight = sizeData.padding.x;
              buttonFrame.paddingTop = sizeData.padding.y;
              buttonFrame.paddingBottom = sizeData.padding.y;
            }
            
            // Apply minHeight
            if (base.minHeight && base.minHeight[size]) {
              buttonFrame.minHeight = base.minHeight[size];
            }
            
            // Apply border radius and width
            buttonFrame.cornerRadius = base.borderRadius;
            buttonFrame.strokeWeight = base.borderWidth;
            buttonFrame.itemSpacing = base.layout.gap;
            
            // Apply colors
            try {
              // Background
              if (styleData.background && styleData.background !== 'color.transparent') {
                const bgPaint = resolveColorToPaint(styleData.background, colorVariables);
                if (bgPaint) {
                  buttonFrame.fills = [bgPaint];
                }
              } else {
                buttonFrame.fills = [];
              }

              // Border
              if (styleData.border && styleData.border !== 'color.transparent') {
                const borderPaint = resolveColorToPaint(styleData.border, colorVariables);
                if (borderPaint) {
                  buttonFrame.strokes = [borderPaint];
                } else {
                  buttonFrame.strokes = [];
                }
              } else {
                buttonFrame.strokes = [];
              }
              
              // Opacity
              if (styleData.opacity !== undefined) {
                buttonFrame.opacity = styleData.opacity;
              }
            } catch (error) {
              console.error(`Error applying colors for ${type}/${color}/${size}/${stateKey}:`, error);
              buttonFrame.fills = [];
              buttonFrame.strokes = [];
            }
            
            // Create text
            const textNode = figma.createText();
            const defaultText = resolveConfigValue(
              properties.text ? properties.text.default : '{config.examples.defaultText}',
              config
            );
            textNode.characters = defaultText || 'Button';
            
            // Apply typography
            const fontSize = typeof base.font.size === 'object' 
              ? (base.font.size[size] || base.font.size.large || 16)
              : (base.font.size || 16);
            const lineHeight = typeof base.font.lineHeight === 'object'
              ? (base.font.lineHeight[size] || base.font.lineHeight.large || 24)
              : (base.font.lineHeight || 24);
            
            // Load font for this text node - Try exact name first, then common alternative names
            const textFontWeight = mapFontWeightToFigma(base.font.weight);
            let textFontToUse = { family: fontFamily, style: textFontWeight };
            
            let textFontLoaded = false;
            try {
              await figma.loadFontAsync(textFontToUse);
              textFontLoaded = true;
              console.log(`✓ Loaded font for button: ${fontFamily} ${textFontWeight}`);
            } catch (e) {
              // Try alternative names for Semibold (different fonts use different naming)
              if (textFontWeight === 'Semibold') {
                const alternatives = ['Semi Bold', 'SemiBold', 'semibold'];
                for (const altStyle of alternatives) {
                  try {
                    await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                    textFontToUse = { family: fontFamily, style: altStyle };
                    textFontLoaded = true;
                    console.log(`✓ Loaded font for button: ${fontFamily} ${altStyle}`);
                  break;
                } catch (e2) {
                    // Continue to next alternative
                  }
                }
              }
              // Try alternative names for ExtraBold
              else if (textFontWeight === 'ExtraBold') {
                const alternatives = ['Extra Bold', 'ExtraBold', 'extrabold'];
                for (const altStyle of alternatives) {
                  try {
                    await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                    textFontToUse = { family: fontFamily, style: altStyle };
                    textFontLoaded = true;
                    console.log(`✓ Loaded font for button: ${fontFamily} ${altStyle}`);
                    break;
                  } catch (e2) {
                    // Continue to next alternative
                  }
                }
              }
              // Try alternative names for ExtraLight
              else if (textFontWeight === 'ExtraLight') {
                const alternatives = ['Extra Light', 'ExtraLight', 'extralight'];
                for (const altStyle of alternatives) {
                  try {
                    await figma.loadFontAsync({ family: fontFamily, style: altStyle });
                    textFontToUse = { family: fontFamily, style: altStyle };
                    textFontLoaded = true;
                    console.log(`✓ Loaded font for button: ${fontFamily} ${altStyle}`);
                    break;
                  } catch (e2) {
                    // Continue to next alternative
                  }
                }
              }
            }
            
            if (!textFontLoaded) {
              const errorMsg = `Font weight "${textFontWeight}" (weight: ${base.font.weight}) not found for font family "${fontFamily}". Please ensure this font weight exists in your design system. Tried: ${textFontWeight}${textFontWeight === 'Semibold' ? ', Semi Bold, SemiBold' : ''}${textFontWeight === 'ExtraBold' ? ', Extra Bold, ExtraBold' : ''}${textFontWeight === 'ExtraLight' ? ', Extra Light, ExtraLight' : ''}`;
              console.error('❌', errorMsg);
              figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
              throw new Error(errorMsg);
            }
            
            textNode.fontName = textFontToUse;
            textNode.fontSize = fontSize;
            textNode.lineHeight = { value: lineHeight, unit: 'PIXELS' };
            
            // Apply text color
            try {
              if (styleData.text) {
                const textPaint = resolveColorToPaint(styleData.text, colorVariables);
                if (textPaint) {
                  textNode.fills = [textPaint];
                }
              }
            } catch (error) {
              console.error(`Error applying text color for ${type}/${color}/${size}/${stateKey}:`, error);
              textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
            }

            textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
            textNode.name = 'Text';

            // Resolve icon config value
            const iconConfigValue2 = resolveConfigValue(
              properties.icon ? properties.icon.default : '{config.icons.default}', config
            );

            // Get text color for icon (should match text color)
            let iconColor = { r: 0, g: 0, b: 0 };
            let iconFill = null;
            if (styleData.text) {
              try {
                const textPaint = resolveColorToPaint(styleData.text, colorVariables);
                if (textPaint) {
                  iconFill = [textPaint];
                }
              } catch (error) {
                console.warn('Could not resolve text color for icon:', error);
              }
            }

            // Create icon
            const iconNode = createIconFromSVG(iconColor, textFontToUse, iconConfigValue2);

            buttonFrame.appendChild(textNode);
            if (iconNode) {
              iconNode.name = 'Icon';
              if (iconFill) {
                if (iconNode.type === 'GROUP' || iconNode.type === 'FRAME') {
                  applyFillToAllChildren(iconNode, iconFill[0]);
                } else {
                  iconNode.fills = iconFill;
                }
              }
              buttonFrame.appendChild(iconNode);
            }
            
            buttonFrame.primaryAxisSizingMode = "AUTO";
            buttonFrame.counterAxisSizingMode = "AUTO";
            
            buttonInstance = buttonFrame;
          }
          
          // Check if button has light/white colors and add background to cell if needed
          if (styleData) {
            const hasLightBackground = isLightOrTransparentColor(styleData.background);
            const hasLightText = isLightOrTransparentColor(styleData.text);
            const hasLightBorder = isLightOrTransparentColor(styleData.border);
            const hasDarkBackground = styleData.background && !isLightOrTransparentColor(styleData.background);
            const hasDarkBorder = styleData.border && !isLightOrTransparentColor(styleData.border);

            // Add background if:
            // 1. Button has light/transparent background, OR
            // 2. Button has light text AND (light background OR light border), AND not both dark background and border
            if (hasLightBackground ||
                (hasLightText && (hasLightBackground || hasLightBorder) && !(hasDarkBackground && hasDarkBorder))) {
              cellContainer.fills = [{ type: 'SOLID', color: { r: 0.725, g: 0.725, b: 0.725 } }];
            }
          }
          
          // Add button instance to cell container
          cellContainer.appendChild(buttonInstance);
          row.appendChild(cellContainer);
        }
        
        grid.appendChild(row);
      }
    }
  }
  
  section.appendChild(grid);
  parent.appendChild(section);
  
  console.log('=== generateButtonGridLayout END ===');
}

// ============================================
// GENERATE TEXT LINK GRID LAYOUT (NEW FORMAT - LIKE SCREENSHOT)
// ============================================

async function generateTextLinkGridLayout(parent, buttonData, colorVariables, config, parsedTokens, componentSet = null) {
  console.log('=== generateTextLinkGridLayout START ===');
  console.log('componentSet provided?', !!componentSet);
  
  if (!buttonData || buttonData.format !== 'new' || !buttonData.textLink) {
    console.log('❌ Skipping: not new format or missing textLink data');
    return;
  }
  
  const textLink = buttonData.textLink;
  const variants = textLink.variants;
  const base = textLink.base;
  const styles = textLink.styles;
  const properties = textLink.properties;
  
  // Get fontFamily
  let fontFamily = base.font.family;
  if (!fontFamily && parsedTokens) {
    fontFamily = getFontFamilyFromBodyStyle(parsedTokens);
  }
  if (!fontFamily) {
    const errorMsg = 'Font family not found. Please set fontFamily in textLink.base.font or ensure body typography style has fontFamily.';
    console.error('❌', errorMsg);
    figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
    throw new Error(errorMsg);
  }
  
  // Validate fontFamily before loading
  if (!fontFamily || fontFamily === 'undefined') {
    console.error('❌ fontFamily is undefined or null, cannot load font');
    throw new Error('Font family is undefined. Please set fontFamily in button.base.font or ensure body typography style has fontFamily.');
  }
  
  // Load fonts
  const fontWeight = mapFontWeightToFigma(base.font.weight);
  let fontToUse = { family: fontFamily, style: fontWeight };
  try {
    await figma.loadFontAsync(fontToUse);
  } catch (e) {
    try {
      await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
      fontToUse = { family: fontFamily, style: 'Regular' };
    } catch (e2) {
      console.error('Could not load font:', fontFamily, fontWeight);
      throw new Error(`Could not load font: ${fontFamily} ${fontWeight}`);
    }
  }
  
  // Load Inter for UI text
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  
  // Create section
  const section = figma.createFrame();
  section.name = "Text Links";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 20;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);
  
  // Title
  const title = figma.createText();
  title.characters = "Text Links";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
  section.appendChild(title);
  
  // Create grid table
  const grid = figma.createFrame();
  grid.name = "Text Link Grid";
  grid.layoutMode = "VERTICAL";
  grid.itemSpacing = 0;
  grid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  grid.counterAxisSizingMode = "AUTO";
  grid.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }];
  grid.strokeWeight = 1;
  grid.cornerRadius = 4;
  
  // Define column widths (consistent across header and data rows)
  const COLUMN_WIDTHS = {
    variant: 200,
    state: 300
  };
  
  // Header row - auto height
  const headerRow = figma.createFrame();
  headerRow.name = "Header";
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
  headerRow.paddingLeft = 20;
  headerRow.paddingRight = 20;
  headerRow.paddingTop = 16;
  headerRow.paddingBottom = 16;
  headerRow.itemSpacing = 0; // No spacing between cells
  headerRow.counterAxisSizingMode = "AUTO"; // Auto height
  
  // Header cells - wrap in fixed width containers
    const variantHeaderCell = figma.createFrame();
    variantHeaderCell.layoutMode = "HORIZONTAL";
    variantHeaderCell.primaryAxisAlignItems = "MIN";
    variantHeaderCell.counterAxisAlignItems = "CENTER";
    variantHeaderCell.fills = [];
    variantHeaderCell.resize(COLUMN_WIDTHS.variant, 1); // Will auto-resize
    variantHeaderCell.primaryAxisSizingMode = "FIXED";
    variantHeaderCell.counterAxisSizingMode = "AUTO"; // Auto height
  
  const variantHeader = figma.createText();
  variantHeader.characters = "Color";
  variantHeader.fontSize = 13;
  variantHeader.fontName = { family: "Inter", style: "Semi Bold" };
  variantHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  variantHeader.letterSpacing = { value: 0.5, unit: 'PIXELS' };
  variantHeader.textAutoResize = "WIDTH_AND_HEIGHT";
  variantHeaderCell.appendChild(variantHeader);
  headerRow.appendChild(variantHeaderCell);
  
  const states = ['Default', 'Hover', 'Disable'];
  const stateKeys = ['default', 'hover', 'disabled'];
  states.forEach(state => {
    const stateHeaderCell = figma.createFrame();
    stateHeaderCell.layoutMode = "HORIZONTAL";
    stateHeaderCell.primaryAxisAlignItems = "MIN";
    stateHeaderCell.counterAxisAlignItems = "CENTER";
    stateHeaderCell.fills = [];
    stateHeaderCell.resize(COLUMN_WIDTHS.state, 1); // Will auto-resize
    stateHeaderCell.primaryAxisSizingMode = "FIXED";
    stateHeaderCell.counterAxisSizingMode = "AUTO"; // Auto height
    
    const stateHeader = figma.createText();
    stateHeader.characters = state;
    stateHeader.fontSize = 14;
    stateHeader.fontName = { family: "Inter", style: "Bold" };
    stateHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stateHeader.textAutoResize = "WIDTH_AND_HEIGHT";
    stateHeaderCell.appendChild(stateHeader);
    headerRow.appendChild(stateHeaderCell);
  });
  
  grid.appendChild(headerRow);
  
  // Generate rows for each color variant
  for (const color of variants.color) {
    const row = figma.createFrame();
    row.name = color;
    row.layoutMode = "HORIZONTAL";
    row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    row.paddingLeft = 16;
    row.paddingRight = 16;
    row.paddingTop = 16;
    row.paddingBottom = 16;
    row.itemSpacing = 0; // No spacing between cells for perfect alignment
    row.counterAxisSizingMode = "AUTO"; // Auto height to fit content
    
    // Color label cell - fixed width, auto height
    const colorLabelCell = figma.createFrame();
    colorLabelCell.layoutMode = "HORIZONTAL";
    colorLabelCell.primaryAxisAlignItems = "MIN";
    colorLabelCell.counterAxisAlignItems = "CENTER";
    colorLabelCell.fills = [];
    colorLabelCell.resize(COLUMN_WIDTHS.variant, 1); // Will auto-resize
    colorLabelCell.primaryAxisSizingMode = "FIXED";
    colorLabelCell.counterAxisSizingMode = "AUTO"; // Auto height
    
    const colorLabel = figma.createText();
    const colorName = color.charAt(0).toUpperCase() + color.slice(1);
    colorLabel.characters = colorName;
    colorLabel.fontSize = 13;
    colorLabel.fontName = { family: "Inter", style: "Medium" };
    colorLabel.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    colorLabel.textAutoResize = "WIDTH_AND_HEIGHT";
    colorLabelCell.appendChild(colorLabel);
    row.appendChild(colorLabelCell);
    
    // Create text link for each state
    for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
      const state = states[stateIdx];
      const stateKey = stateKeys[stateIdx];
      
      // Get style data
      const styleData = styles[color] && styles[color][stateKey];
      
      // Create cell container with fixed width, auto height - align left
      const cellContainer = figma.createFrame();
      cellContainer.layoutMode = "HORIZONTAL";
      cellContainer.primaryAxisAlignItems = "MIN"; // Left align
      cellContainer.counterAxisAlignItems = "CENTER";
      cellContainer.fills = [];
      cellContainer.paddingLeft = 16;
      cellContainer.paddingRight = 16;
      cellContainer.paddingTop = 12;
      cellContainer.paddingBottom = 12;
      cellContainer.resize(COLUMN_WIDTHS.state, 1); // Will auto-resize
      cellContainer.primaryAxisSizingMode = "FIXED";
      cellContainer.counterAxisSizingMode = "AUTO"; // Auto height to fit content
      
      if (!styleData) {
        row.appendChild(cellContainer);
        continue;
      }
      
      // Create text link instance from Component Set if available
      let linkInstance = null;
      
      if (componentSet && componentSet.type === 'COMPONENT_SET') {
        // Find the matching component in the Component Set
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        const stateName = state.charAt(0).toUpperCase() + state.slice(1);
        
        // Find component with matching variant properties
        let matchingComponent = null;
        for (const child of componentSet.children) {
          if (child.type === 'COMPONENT') {
            const variantProps = child.variantProperties;
            if (variantProps && 
                variantProps.Color === colorName &&
                variantProps.State === stateName) {
              matchingComponent = child;
              break;
            }
          }
        }
        
        if (matchingComponent) {
          // Create instance from component
          linkInstance = matchingComponent.createInstance();
          linkInstance.name = `${colorName} ${state}`;
          
          // Set default properties for the instance
          try {
            const textDefault = resolveConfigValue(
              properties.text ? properties.text.default : '{config.examples.textLinkText}',
              config
            );
            const iconDefault = properties.icon ? resolveConfigValue(
              properties.icon.default || '',
              config
            ) : '';
            
            linkInstance.setProperties({
              'text': textDefault || 'Text link',
              'icon': iconDefault || ''
            });
          } catch (propError) {
            console.warn('Could not set properties for text link instance:', propError);
          }
          
          console.log(`✓ Created text link instance from Component Set: ${colorName}/${stateName}`);
        } else {
          console.warn(`⚠ Text link component not found in Component Set: ${colorName}/${stateName}`);
        }
      }
      
      // Fallback: Create text link frame if no Component Set or component not found
      if (!linkInstance) {
        // Create text link frame
        const linkFrame = figma.createFrame();
        linkFrame.name = `${colorName} ${state}`;
        linkFrame.layoutMode = "HORIZONTAL";
        linkFrame.primaryAxisAlignItems = "CENTER";
        linkFrame.counterAxisAlignItems = "CENTER";
        linkFrame.itemSpacing = base.gap;
        linkFrame.fills = [];
        linkFrame.strokes = [];
        
        // Opacity
        if (styleData.opacity !== undefined) {
          linkFrame.opacity = styleData.opacity;
        }
        
        // Create text
        const textNode = figma.createText();
        const defaultText = resolveConfigValue(
          properties.text ? properties.text.default : '{config.examples.textLinkText}',
          config
        );
        textNode.characters = defaultText || 'Text link';
        
        // Apply typography
        let textFontToUse = fontToUse;
        try {
          await figma.loadFontAsync(textFontToUse);
        } catch (e) {
          try {
            await figma.loadFontAsync({ family: fontFamily, style: 'Regular' });
            textFontToUse = { family: fontFamily, style: 'Regular' };
          } catch (e2) {
            console.warn('Could not load font for text link');
          }
        }
        
        textNode.fontName = textFontToUse;
        textNode.fontSize = base.font.size || 16;
        textNode.lineHeight = { value: base.font.lineHeight || 24, unit: 'PIXELS' };
        
        // Apply text color
        try {
          if (styleData.text) {
            const textPaint = resolveColorToPaint(styleData.text, colorVariables);
            if (textPaint) {
              textNode.fills = [textPaint];
            }
          }
        } catch (error) {
          console.error(`Error applying text color for textLink ${color}/${stateKey}:`, error);
          textNode.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        }
        
        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        textNode.name = 'Text';
        
        linkFrame.appendChild(textNode);
        linkFrame.primaryAxisSizingMode = "AUTO";
        linkFrame.counterAxisSizingMode = "AUTO";
        
        linkInstance = linkFrame;
      }
      
      // Check if text link has light/white color and add background to cell if needed
      if (styleData) {
        if (isLightOrTransparentColor(styleData.text)) {
          cellContainer.fills = [{ type: 'SOLID', color: { r: 0.725, g: 0.725, b: 0.725 } }];
        }
      }
      
      // Add link instance to cell container
      cellContainer.appendChild(linkInstance);
      row.appendChild(cellContainer);
    }
    
    grid.appendChild(row);
  }
  
  section.appendChild(grid);
  parent.appendChild(section);
  
  console.log('=== generateTextLinkGridLayout END ===');
}

// ============================================
// GENERATE TEXT LINK COMPONENTS (NEW FORMAT)
// ============================================

async function generateTextLinkComponents(buttonData, colorVariables, config, parsedTokens) {
  console.log('=== generateTextLinkComponents START ===');
  console.log('buttonData:', buttonData);
  console.log('buttonData.format:', buttonData ? buttonData.format : 'undefined');
  console.log('buttonData.textLink:', buttonData ? buttonData.textLink : 'undefined');
  
  if (!buttonData || buttonData.format !== 'new' || !buttonData.textLink) {
    console.log('❌ Skipping: not new format or missing textLink data');
    console.log('  - buttonData exists?', !!buttonData);
    console.log('  - format:', buttonData ? buttonData.format : 'N/A');
    console.log('  - textLink exists?', !!(buttonData && buttonData.textLink));
    return null;
  }
  
  const textLink = buttonData.textLink;
  const variants = textLink.variants;
  const base = textLink.base;
  const styles = textLink.styles;
  const properties = textLink.properties;
  
  console.log('TextLink variants:', variants);
  console.log('TextLink base:', base);
  console.log('TextLink styles keys:', styles ? Object.keys(styles) : 'none');
  console.log('TextLink properties:', properties);
  
  // Get fontFamily - from textLink config, or from body style, or error
  let fontFamily = base.font.family;
  if (!fontFamily && parsedTokens) {
    fontFamily = getFontFamilyFromBodyStyle(parsedTokens);
    console.log('Got fontFamily from body style:', fontFamily);
  }
  
  if (!fontFamily) {
    const errorMsg = 'Font family not found. Please set fontFamily in textLink.base.font or ensure body typography style has fontFamily.';
    console.error('❌', errorMsg);
    figma.ui.postMessage({ type: 'status', message: errorMsg, error: true });
    throw new Error(errorMsg);
  }
  
  const fontWeight = mapFontWeightToFigma(base.font.weight);
  console.log('Using fontFamily:', fontFamily, 'fontWeight:', fontWeight);
  
  // Create a parent frame to hold all components (Component Set will be created automatically)
  const componentSetFrame = figma.createFrame();
  componentSetFrame.name = 'Text Link';
  componentSetFrame.layoutMode = 'VERTICAL';
  componentSetFrame.itemSpacing = 20;
  componentSetFrame.fills = [];
  
  // Generate all variant combinations
  const components = [];
  const totalCombinations = variants.color.length * variants.state.length;
  console.log(`Generating ${totalCombinations} text link component variants...`);
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const color of variants.color) {
    for (const state of variants.state) {
      // Get style data for this variant
      const styleData = styles[color] && styles[color][state];
      if (!styleData) {
        console.warn(`⚠ Missing style for textLink ${color}/${state}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Creating text link component: ${color}/${state}`);
      
      // Create component
      const component = figma.createComponent();
      
      // Name component - Figma will auto-create variant properties when components are in same frame
      // Format: "Color=Value1, State=Value2"
      const colorName = color.charAt(0).toUpperCase() + color.slice(1);
      const stateName = state.charAt(0).toUpperCase() + state.slice(1);
      // Use pattern that Figma recognizes for variant properties
      component.name = `Color=${colorName}, State=${stateName}`;
      
      // Configure Auto Layout
      component.layoutMode = 'HORIZONTAL';
      component.primaryAxisAlignItems = 'CENTER';
      component.counterAxisAlignItems = 'CENTER';
      component.itemSpacing = base.gap;
      
      // No padding, border, or background for text links
      component.fills = [];
      component.strokes = [];
      
      // Opacity
      if (styleData.opacity !== undefined) {
        component.opacity = styleData.opacity;
      }
      
      // Create text layer
      const textNode = figma.createText();
      const defaultText = resolveConfigValue(
        properties.text ? properties.text.default : '{config.examples.textLinkText}',
        config
      );
      textNode.characters = defaultText || 'Text link';
      
      // Load font before setting fontName (with fallback logic)
      const figmaFontWeight = mapFontWeightToFigma(base.font.weight);
      let fontToUse = { family: fontFamily, style: figmaFontWeight };
      let fontLoaded = false;
      
      // Try to load font with fallback
      try {
        await figma.loadFontAsync(fontToUse);
        fontLoaded = true;
      } catch (e) {
        console.warn(`Failed to load font: ${fontToUse.family} ${fontToUse.style}, trying fallbacks...`);
        
        // Try fallbacks
        const fallbacks = [];
        if (figmaFontWeight === 'Semibold') {
          fallbacks.push(
            { family: fontFamily, style: 'Semi Bold' },
            { family: fontFamily, style: 'Bold' },
            { family: fontFamily, style: 'Medium' }
          );
        } else if (figmaFontWeight !== 'Regular' && figmaFontWeight !== 'Medium') {
          fallbacks.push(
            { family: fontFamily, style: 'Medium' },
            { family: fontFamily, style: 'Regular' }
          );
        } else {
          fallbacks.push(
            { family: fontFamily, style: figmaFontWeight === 'Regular' ? 'Medium' : 'Regular' }
          );
        }
        
        for (const fallback of fallbacks) {
          try {
            await figma.loadFontAsync(fallback);
            fontToUse = fallback;
            fontLoaded = true;
            console.log(`Using fallback font: ${fallback.family} ${fallback.style}`);
            break;
          } catch (fallbackError) {
            // Continue
          }
        }
      }
      
      if (!fontLoaded) {
        throw new Error(`Could not load font: ${fontFamily} ${figmaFontWeight} for text link component`);
      }
      
      // Apply typography
      textNode.fontName = fontToUse;
      textNode.fontSize = base.font.size || 16;
      textNode.lineHeight = { value: base.font.lineHeight || 24, unit: 'PIXELS' };
      
      // Apply text color
      try {
        if (styleData.text) {
          const textPaint = resolveColorToPaint(styleData.text, colorVariables);
          if (textPaint) {
            textNode.fills = [textPaint];
          }
        }
      } catch (error) {
        console.error(`Error applying text color for textLink ${color}/${state}:`, error);
      }

      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
      // Name must match property name for Figma to allow instance overrides
      textNode.name = 'text';

      // Resolve icon config value
      const iconConfigValue = resolveConfigValue(
        properties.icon ? properties.icon.default : '{config.icons.default}', config
      );

      // Get text color for icon (should match text color)
      let iconColor = { r: 0, g: 0, b: 0 };
      let iconFill = null;
      if (styleData.text) {
        try {
          const textPaint = resolveColorToPaint(styleData.text, colorVariables);
          if (textPaint) {
            iconFill = [textPaint];
          }
        } catch (error) {
          console.warn('Could not resolve text color for icon:', error);
        }
      }

      // Create icon node (may return null for "none")
      const iconNode = createIconFromSVG(iconColor, fontToUse, iconConfigValue);

      // Add Component Properties
      if (properties.text) {
        const textDefault = resolveConfigValue(properties.text.default, config);
        component.addComponentProperty('text', 'TEXT', textDefault || 'Text link');
      }

      component.appendChild(textNode);

      if (iconNode) {
        iconNode.name = 'icon';
        if (iconFill) {
          if (iconNode.type === 'GROUP' || iconNode.type === 'FRAME') {
            applyFillToAllChildren(iconNode, iconFill[0]);
          } else {
            iconNode.fills = iconFill;
          }
        }

        // Create icon container
        const iconContainer = figma.createFrame();
        iconContainer.name = 'icon';
        iconContainer.layoutMode = 'HORIZONTAL';
        iconContainer.primaryAxisAlignItems = 'CENTER';
        iconContainer.counterAxisAlignItems = 'CENTER';
        iconContainer.appendChild(iconNode);
        iconContainer.primaryAxisSizingMode = 'AUTO';
        iconContainer.counterAxisSizingMode = 'AUTO';
        iconContainer.visible = false;

        if (properties.icon) {
          component.addComponentProperty('icon', 'TEXT', iconConfigValue || '');
        }
        component.appendChild(iconContainer);
      }
      
      // Add to component set frame
      componentSetFrame.appendChild(component);
      components.push(component);
      createdCount++;
      console.log(`✓ Created text link component ${createdCount}/${totalCombinations}: ${color}/${state}`);
    }
  }
  
  // Figma will automatically create a Component Set if components have variantProperties
  // and are children of the same frame
  console.log(`=== generateTextLinkComponents END ===`);
  console.log(`✓ Created ${createdCount} text link components`);
  console.log(`⚠ Skipped ${skippedCount} components (missing styles)`);
  console.log(`Component set frame children: ${componentSetFrame.children.length}`);
  
  // Return the frame (which will become a Component Set automatically)
  return componentSetFrame;
}

// ============================================
// GENERATE BUTTON LAYOUT FROM TOKENS (OLD FORMAT - BACKWARD COMPATIBILITY)
// ============================================

async function generateButtonLayoutFromTokens(parent, buttonData, colorVariables, prefix) {
  console.log('generateButtonLayoutFromTokens called with:', {
    hasButtonData: !!buttonData,
    hasVariants: !!(buttonData && buttonData.variants),
    variantsLength: buttonData && buttonData.variants ? buttonData.variants.length : 0
  });
  
  if (!buttonData || !buttonData.variants || buttonData.variants.length === 0) {
    console.log('Skipping button layout: no variants found');
    return;
  }

  // Load fonts
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const section = figma.createFrame();
  section.name = "Buttons";
  section.layoutMode = "VERTICAL";
  section.itemSpacing = 40;
  section.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  section.paddingLeft = 40;
  section.paddingRight = 40;
  section.paddingTop = 40;
  section.paddingBottom = 40;
  section.cornerRadius = 8;
  section.counterAxisSizingMode = "FIXED";
  section.resize(1200, 100);

  const title = figma.createText();
  title.characters = "Buttons";
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
  section.appendChild(title);

  // Create grid: Rows = variants, Columns = states (Default, Hover, Disable)
  const states = ['Default', 'Hover', 'Disable'];
  const stateKeys = ['default', 'hover', 'disable'];

  const grid = figma.createFrame();
  grid.name = "Button Grid";
  grid.layoutMode = "VERTICAL";
  grid.itemSpacing = 20;
  grid.fills = [];
  grid.primaryAxisSizingMode = "AUTO";
  grid.counterAxisSizingMode = "FIXED";
  grid.resize(1200, 100);

  // Header row
  const headerRow = figma.createFrame();
  headerRow.name = "Header";
  headerRow.layoutMode = "HORIZONTAL";
  headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  headerRow.paddingLeft = 16;
  headerRow.paddingRight = 16;
  headerRow.paddingTop = 10;
  headerRow.paddingBottom = 10;
  headerRow.primaryAxisSizingMode = "AUTO";
  headerRow.counterAxisSizingMode = "AUTO";

  const variantHeader = figma.createText();
  variantHeader.characters = "Variant";
  variantHeader.fontSize = 16;
  variantHeader.fontName = { family: "Inter", style: "Bold" };
  variantHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  variantHeader.resize(200, variantHeader.height);
  headerRow.appendChild(variantHeader);

  states.forEach(state => {
    const stateHeader = figma.createText();
    stateHeader.characters = state;
    stateHeader.fontSize = 16;
    stateHeader.fontName = { family: "Inter", style: "Bold" };
    stateHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    stateHeader.resize(300, stateHeader.height);
    headerRow.appendChild(stateHeader);
  });

  grid.appendChild(headerRow);

  // Create button instances for each variant and state
  for (const variant of buttonData.variants) {
    const row = figma.createFrame();
    row.name = `${variant.type} - ${variant.color}`;
    row.layoutMode = "HORIZONTAL";
    row.fills = [];
    row.paddingLeft = 16;
    row.paddingRight = 16;
    row.paddingTop = 10;
    row.paddingBottom = 10;
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = 20;

    // Variant label
    const variantLabel = figma.createText();
    variantLabel.characters = `${variant.type} - ${variant.color}`;
    variantLabel.fontSize = 14;
    variantLabel.fontName = { family: "Inter", style: "Regular" };
    variantLabel.resize(200, variantLabel.height);
    row.appendChild(variantLabel);

    // Create button instance for each state
    for (let stateIdx = 0; stateIdx < states.length; stateIdx++) {
      const state = states[stateIdx];
      const stateKey = stateKeys[stateIdx];
      const stateData = variant.states[stateKey];

      if (!stateData) continue;

      // Create button frame
      const buttonFrame = figma.createFrame();
      buttonFrame.name = `${variant.type} - ${variant.color} - ${state}`;
      buttonFrame.layoutMode = "HORIZONTAL";
      buttonFrame.primaryAxisAlignItems = "CENTER";
      buttonFrame.counterAxisAlignItems = "CENTER";
      buttonFrame.paddingLeft = buttonData.defaultProps.paddingLeft;
      buttonFrame.paddingRight = buttonData.defaultProps.paddingRight;
      buttonFrame.paddingTop = buttonData.defaultProps.paddingTop;
      buttonFrame.paddingBottom = buttonData.defaultProps.paddingBottom;
      buttonFrame.cornerRadius = buttonData.defaultProps.borderRadius;
      buttonFrame.strokeWeight = buttonData.defaultProps.borderWidth;
      buttonFrame.itemSpacing = 8;
      buttonFrame.resize(300, 50);

      // Apply colors
      const bgColorRgb = hexToRgb(stateData.backgroundColor);
      const textColorRgb = hexToRgb(stateData.color);
      const borderColorRgb = hexToRgb(stateData.borderColor);
      
      // Extract color objects without alpha
      const bgColor = { r: bgColorRgb.r, g: bgColorRgb.g, b: bgColorRgb.b };
      const textColor = { r: textColorRgb.r, g: textColorRgb.g, b: textColorRgb.b };
      const borderColor = { r: borderColorRgb.r, g: borderColorRgb.g, b: borderColorRgb.b };

      if (variant.type === 'Fill') {
        const fillPaint = { type: 'SOLID', color: bgColor };
        if (bgColorRgb.a !== undefined && bgColorRgb.a !== 1) {
          fillPaint.opacity = bgColorRgb.a;
        }
        buttonFrame.fills = [fillPaint];
      } else {
        buttonFrame.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }];
      }
      
      const strokePaint = { type: 'SOLID', color: borderColor };
      if (borderColorRgb.a !== undefined && borderColorRgb.a !== 1) {
        strokePaint.opacity = borderColorRgb.a;
      }
      buttonFrame.strokes = [strokePaint];

      // Create text
      const textNode = figma.createText();
      textNode.name = "Text";
      textNode.characters = buttonData.config.defaultText;
      textNode.fontName = { family: "Inter", style: "Bold" };
      textNode.fontSize = 16;
      textNode.fills = [{ type: 'SOLID', color: textColor }];
      textNode.textAutoResize = "WIDTH_AND_HEIGHT";

      // Create icon - use same font as text
      const oldIconDefault = buttonData.config && buttonData.config.icons ? buttonData.config.icons.default : 'arrow--right';
      const iconNode = createIconFromSVG(textColor, { family: "Inter", style: "Bold" }, oldIconDefault);

      buttonFrame.appendChild(textNode);
      if (iconNode) {
        iconNode.name = "Icon";
        buttonFrame.appendChild(iconNode);
      }

      row.appendChild(buttonFrame);
    }

    grid.appendChild(row);
  }

  section.appendChild(grid);
  parent.appendChild(section);
}



