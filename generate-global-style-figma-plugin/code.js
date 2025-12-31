console.clear();

figma.showUI(__html__, { width: 600, height: 430 });

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
  console.log("Available Paint Styles:", [...paintStyleMap.keys()]);
  console.log("Available Variables:", [...variableMap.keys()]);
  console.log("Available Text Styles:", [...textStyleMap.keys()]);
  
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

  // Check if styles are organized by breakpoints (Desktop/Tablet/Mobile)
  const breakpoints = ["Desktop", "Tablet", "Mobile"];
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
    const sortedColors = [...colors].sort((a, b) => a.name.localeCompare(b.name));
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
  
  ['Name', 'Desktop', 'Tablet', 'Mobile'].forEach(text => {
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
  const sortedCollections = [...collectionMap.entries()].sort((a, b) => {
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
      const sortedColors = [...colors].sort((a, b) => a.name.localeCompare(b.name));
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
  const breakpoints = ["Desktop", "Tablet", "Mobile"];
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

  // Sort groups: Desktop variants first, then Tablet, then Mobile, then others
  const sortedGroupKeys = Object.keys(groupedStyles).sort((a, b) => {
    const getOrder = (key) => {
      if (key.startsWith('Desktop')) return 0;
      if (key.startsWith('Tablet')) return 1;
      if (key.startsWith('Mobile')) return 2;
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

  // Setup 3 modes: Desktop, Tablet, Mobile
  const modes = {};

  // Rename default mode to Desktop
  const defaultMode = collection.modes[0];
  collection.renameMode(defaultMode.modeId, 'Desktop');
  modes['Desktop'] = defaultMode.modeId;

  // Add Tablet and Mobile modes if they don't exist
  const existingModeNames = collection.modes.map(m => m.name);

  if (!existingModeNames.includes('Tablet')) {
    const tabletModeId = collection.addMode('Tablet');
    modes['Tablet'] = tabletModeId;
  } else {
    modes['Tablet'] = collection.modes.find(m => m.name === 'Tablet').modeId;
  }

  if (!existingModeNames.includes('Mobile')) {
    const mobileModeId = collection.addMode('Mobile');
    modes['Mobile'] = mobileModeId;
  } else {
    modes['Mobile'] = collection.modes.find(m => m.name === 'Mobile').modeId;
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
          existingVariable.setValueForMode(modes['Desktop'], value);
          existingVariable.setValueForMode(modes['Tablet'], value);
          existingVariable.setValueForMode(modes['Mobile'], value);
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

      // Set same value for all 3 modes (Desktop, Tablet, Mobile)
      variable.setValueForMode(modes['Desktop'], value);
      variable.setValueForMode(modes['Tablet'], value);
      variable.setValueForMode(modes['Mobile'], value);

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
      // Try fallbacks
      const fallbacks = [
        { family: style.fontFamily, style: 'Regular' },
        { family: style.fontFamily, style: 'Medium' },
        { family: 'Inter', style: 'Regular' }
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
      console.error(`Could not load any font for style: ${styleName}`);
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
  const sortedCollections = [...collectionMap.entries()].sort((a, b) => {
    if (a[1].name === 'Spacing') return -1;
    if (b[1].name === 'Spacing') return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  // Create a section for each collection
  for (const [collectionId, collectionData] of sortedCollections) {
    const collection = collectionData.collection;
    if (!collection) continue;

    // Get modes for this collection
    const modes = collection.modes.map(m => ({
      id: m.modeId,
      name: m.name
    }));

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
      const sortedVars = [...vars].sort((a, b) => {
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
