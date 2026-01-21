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

    try {
      const duplicates = await checkForDuplicates(globalStyle, prefix);
      const hasDuplicates = duplicates.colors.length > 0 || duplicates.spacing.length > 0 || duplicates.textStyles.length > 0;

      if (hasDuplicates) {
        figma.ui.postMessage({ type: 'duplicatesFound', duplicates: duplicates });
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
      const prefix = msg.prefix || 'Project';

      // Parse tokens
      const parsedTokens = parseAllTokens(tokenFiles);

      // Create variables if requested
      if (createVariables) {
        await createVariablesFromParsedTokens(parsedTokens, prefix, 'skip');
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
                figma.variables.setBoundVariableForPaint(
                    { type: 'SOLID', color: hexToRgb(c.hex) }, // Fallback color
                    'color',
                    existingVariable
                )
            ];
        } else {
            // Try to find case-insensitive match if strict match fails?
            // Or try finding by HEX?
            // Let's stick to name matching but be more robust
            // Maybe keys in map are different than expected?
            rect.fills = [{ type: 'SOLID', color: hexToRgb(c.hex) }];
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
  const toHex = (val) => {
    const hex = Math.round(val * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
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
            figma.variables.setBoundVariableForPaint(
              { type: 'SOLID', color: hexToRgb(c.hex) },
              'color',
              c.variable
            )
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
    spacing: [],
    shadows: [],
    borders: { radius: [], width: [] },
    breakpoints: []
  };

  // Parse colors
  if (tokenFiles.color && tokenFiles.color.color) {
    parsed.colors = parseColorTokens(tokenFiles.color.color);
  }

  // Parse typography
  if (tokenFiles.typography && tokenFiles.typography.textStyles) {
    parsed.typography = parseTypographyTokens(tokenFiles.typography.textStyles);
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
            letterSpacing: value.letterSpacing !== undefined ? value.letterSpacing : baseProps.letterSpacing
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
              letterSpacing: mergedProps.letterSpacing
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
              letterSpacing: mergedProps.letterSpacing
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

            styles.push({
              name: finalStyleName,
              displayName: finalStyleName,
              breakpoint: 'mobile',
              fontSize: fontSize,
              lineHeight: lineHeight,
              fontWeight: fontWeight,
              fontFamily: fontFamily,
              letterSpacing: letterSpacing
            });
          } else {
            // Extract base properties from this level (if any)
            // Don't set default 'Inter' here - let it be undefined so we can use body's fontFamily later
            const newBaseProps = {
              fontSize: value.fontSize !== undefined ? parseValue(value.fontSize) : baseProps.fontSize,
              lineHeight: value.lineHeight !== undefined ? value.lineHeight : baseProps.lineHeight,
              fontWeight: value.fontWeight !== undefined ? value.fontWeight : baseProps.fontWeight,
              fontFamily: value.fontFamily !== undefined ? value.fontFamily : baseProps.fontFamily,
              letterSpacing: value.letterSpacing !== undefined ? value.letterSpacing : baseProps.letterSpacing
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
  return filledStyles;
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
          letterSpacing: existingBreakpoints[bp].letterSpacing
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
          letterSpacing: existing.letterSpacing !== undefined ? existing.letterSpacing : inheritFrom.letterSpacing
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
            letterSpacing: lastProcessedProps.letterSpacing
          };
        } else {
          // Fallback to base props (shouldn't happen if mobile exists)
          styleProps = {
            fontSize: baseProps.fontSize,
            lineHeight: baseProps.lineHeight,
            fontWeight: baseProps.fontWeight,
            fontFamily: baseProps.fontFamily,
            letterSpacing: baseProps.letterSpacing
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
        letterSpacing: styleProps.letterSpacing
      });
    }
  }

  return filledStyles;
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

  return breakpoints;
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

async function createVariablesFromParsedTokens(parsedTokens, prefix, duplicateAction = 'skip') {
  // Create color variables
  if (parsedTokens.colors.length > 0) {
    await createColorVariablesFromParsedTokens(parsedTokens.colors, prefix, duplicateAction);
  }

  // Create typography styles
  if (parsedTokens.typography.length > 0) {
    await createTypographyStylesFromParsedTokens(parsedTokens.typography, prefix, duplicateAction);
  }

  // Create spacing variables
  if (parsedTokens.spacing.length > 0) {
    await createSpacingVariablesFromParsedTokens(parsedTokens.spacing, prefix, duplicateAction);
  }

  // Create border variables
  if (parsedTokens.borders.radius.length > 0 || parsedTokens.borders.width.length > 0) {
    await createBorderVariablesFromParsedTokens(parsedTokens.borders, prefix, duplicateAction);
  }

  // Create shadow effects
  if (parsedTokens.shadows.length > 0) {
    await createShadowEffectsFromParsedTokens(parsedTokens.shadows, prefix, duplicateAction);
  }

  // Create breakpoint variables
  if (parsedTokens.breakpoints.length > 0) {
    await createBreakpointVariablesFromParsedTokens(parsedTokens.breakpoints, prefix, duplicateAction);
  }
}

async function createColorVariablesFromParsedTokens(colors, prefix, duplicateAction) {
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
      if (duplicateAction === 'overwrite') {
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

async function createTypographyStylesFromParsedTokens(typography, prefix, duplicateAction) {
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
  for (const bodyStyle of bodyStyles) {
    const breakpoint = bodyStyle.breakpoint || 'mobile';
    console.log(`Processing body style: ${bodyStyle.name}, breakpoint: ${breakpoint}, fontFamily: ${bodyStyle.fontFamily || '(none)'}`);
    if (bodyStyle.fontFamily) {
      bodyFontFamilyMap.set(breakpoint, bodyStyle.fontFamily);
      console.log(`Added to map: ${breakpoint} -> ${bodyStyle.fontFamily}`);
    } else {
      console.warn(`Body style ${bodyStyle.name} (${breakpoint}) does not have fontFamily!`);
    }
  }

  console.log('Body fontFamily map:', Array.from(bodyFontFamilyMap.entries()));

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
      const bodyFontFamily = bodyFontFamilyMap.get(breakpoint);
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

    console.log(`Processing style: ${styleName}, fontSize: ${style.fontSize}, fontFamily: ${fontFamily}, fontWeight: ${style.fontWeight}`);

    const existingStyle = existingStyleMap.get(styleName);
    if (existingStyle && duplicateAction === 'skip') {
      console.log(`Skipping existing style: ${styleName}`);
      continue;
    }

    // Map fontWeight using helper function
    const figmaFontWeight = mapFontWeightToFigma(style.fontWeight);
    console.log(`Mapped fontWeight: "${style.fontWeight}" -> "${figmaFontWeight}"`);

    const fontName = { family: fontFamily, style: figmaFontWeight };
    let fontLoaded = false;

    try {
      await figma.loadFontAsync(fontName);
      fontLoaded = true;
      console.log(`✓ Successfully loaded font: ${fontName.family} ${fontName.style}`);
    } catch (e) {
      console.warn(`✗ Failed to load font: ${fontName.family} ${fontName.style}, trying fallbacks...`);
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

      for (const fallback of fallbacks) {
        try {
          await figma.loadFontAsync(fallback);
          fontName.family = fallback.family;
          fontName.style = fallback.style;
          fontLoaded = true;
          console.warn(`Using fallback font: ${fallback.family} ${fallback.style}`);
          break;
        } catch (fallbackError) {
          // Continue
        }
      }
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
      if (existingStyle && duplicateAction === 'overwrite') {
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : parseValue(style.fontSize);
        existingStyle.fontName = fontName;
        existingStyle.fontSize = fontSize;
        if (style.lineHeight) {
          if (style.lineHeight === 'auto' || style.lineHeight === 'Auto') {
            existingStyle.lineHeight = { unit: 'AUTO' };
          } else if (String(style.lineHeight).endsWith('%')) {
            existingStyle.lineHeight = { value: parseFloat(style.lineHeight), unit: 'PERCENT' };
          } else {
            existingStyle.lineHeight = { value: parseValue(style.lineHeight), unit: 'PIXELS' };
          }
        }
        if (style.letterSpacing) {
          if (String(style.letterSpacing).endsWith('%')) {
            existingStyle.letterSpacing = { value: parseFloat(style.letterSpacing), unit: 'PERCENT' };
          } else {
            existingStyle.letterSpacing = { value: parseValue(style.letterSpacing), unit: 'PIXELS' };
          }
        }
      } else {
        // Ensure fontSize is a number
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : parseValue(style.fontSize);
        if (!fontSize || fontSize <= 0) {
          console.error(`Invalid fontSize for ${styleName}: ${style.fontSize}`);
          continue;
        }

        const textStyle = figma.createTextStyle();
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
      }
      console.log(`Created text style: ${styleName}`);
    } catch (e) {
      console.error(`Failed to create text style ${styleName}:`, e);
    }
  }
}

async function createSpacingVariablesFromParsedTokens(spacing, prefix, duplicateAction) {
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
      if (duplicateAction === 'overwrite') {
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

async function createBorderVariablesFromParsedTokens(borders, prefix, duplicateAction) {
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
      if (duplicateAction === 'overwrite') {
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
      if (duplicateAction === 'overwrite') {
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

async function createShadowEffectsFromParsedTokens(shadows, prefix, duplicateAction) {
  const existingEffects = figma.getLocalEffectStyles();
  const existingEffectMap = new Map(existingEffects.map(s => [s.name, s]));

  for (const shadow of shadows) {
    // Format: "shadow - {prefix}/{name}" to group by shadow type first
    const styleName = prefix ? `shadow - ${prefix}/${shadow.name}` : `shadow/${shadow.name}`;
    const existingStyle = existingEffectMap.get(styleName);
    
    if (existingStyle && duplicateAction === 'skip') {
      continue;
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

async function createBreakpointVariablesFromParsedTokens(breakpoints, prefix, duplicateAction) {
  const collectionName = prefix ? `Breakpoint - ${prefix}` : 'Breakpoint';
  
  let collection = figma.variables.getLocalVariableCollections().find(c => c.name === collectionName);
  if (!collection) {
    collection = figma.variables.createVariableCollection(collectionName);
  }

  const modeId = collection.modes[0].modeId;
  const existingVariables = figma.variables.getLocalVariables('FLOAT')
    .filter(v => v.variableCollectionId === collection.id);
  const existingVariableMap = new Map(existingVariables.map(v => [v.name, v]));

  // Create breakpoint variables (min value)
  for (const bp of breakpoints) {
    const variableName = bp.name;
    const existingVariable = existingVariableMap.get(variableName);
    
    // Parse value (remove 'px' if present)
    const minValue = parseValue(bp.value);
    
    if (existingVariable) {
      if (duplicateAction === 'overwrite') {
        try {
          existingVariable.setValueForMode(modeId, minValue);
          if (bp.description) {
            existingVariable.description = bp.description;
          }
        } catch (e) {
          console.error(`Failed to overwrite breakpoint variable ${variableName}:`, e);
        }
      } else {
        // Even when skipping, update description if it's missing or different
        try {
          if (bp.description && (!existingVariable.description || existingVariable.description !== bp.description)) {
            existingVariable.description = bp.description;
          }
        } catch (e) {
          console.warn(`Failed to update description for breakpoint variable ${variableName}:`, e);
        }
      }
      continue;
    }

    try {
      const variable = figma.variables.createVariable(variableName, collection, 'FLOAT');
      variable.setValueForMode(modeId, minValue);
      if (bp.description) {
        variable.description = bp.description;
      }
      console.log(`Created breakpoint variable: ${variableName} = ${minValue}`);
    } catch (e) {
      console.error(`Failed to create breakpoint variable ${variableName}:`, e);
    }
  }
}

// ============================================
// GENERATE LAYOUT FROM PARSED TOKENS
// ============================================

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

  // Generate typography section
  if (parsedTokens.typography.length > 0) {
    await generateTypographyLayoutFromTokens(mainFrame, parsedTokens.typography, textStyleMap, prefix);
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
  if (parsedTokens.breakpoints.length > 0) {
    await generateBreakpointLayoutFromTokens(mainFrame, parsedTokens.breakpoints);
  }

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
            figma.variables.setBoundVariableForPaint(
              { type: 'SOLID', color: hexToRgb(c.hex) },
              'color',
              existingVariable
            )
          ];
        } else {
          rect.fills = [{ type: 'SOLID', color: hexToRgb(c.hex) }];
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

async function generateTypographyLayoutFromTokens(parent, typography, textStyleMap, prefix) {
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

      const existingTextStyle = textStyleMap.get(styleName) || textStyleMap.get(s.name);
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
