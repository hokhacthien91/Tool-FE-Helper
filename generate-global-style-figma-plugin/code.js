console.clear();

figma.showUI(__html__, { width: 600, height: 300 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    const data = msg.data;
    if (!data || !data.length) {
      figma.ui.postMessage({ type: 'status', message: 'No data found in JSON.', error: true });
      return;
    }

    const globalStyle = data[0].values;

    try {
      await generateGlobalStyle(globalStyle);
      figma.ui.postMessage({ type: 'status', message: 'Global Style generated successfully!' });
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

async function generateGlobalStyle(values) {
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
        await createTypographySection(mainFrame, styles, breakpoint, textStyleMap);
      }
    }
  } else {
    // Render all typography styles in one section
    if (styles.length > 0) {
      await createTypographySection(mainFrame, styles, null, textStyleMap);
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

async function createTypographySection(parent, styles, filterPrefix, textStyleMap) {
  // Filter styles by prefix if provided, otherwise use all styles
  const filteredStyles = filterPrefix
    ? styles.filter(s => s.name.startsWith(filterPrefix))
    : styles;

  if (filteredStyles.length === 0) {
    return; // Don't create section if no styles exist
  }

  const section = figma.createFrame();
  section.name = filterPrefix ? `${filterPrefix} Typography` : "Typography";
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
  title.characters = filterPrefix ? `${filterPrefix} | Typography` : "Typography";
  title.fontSize = 24;
  title.fontName = { family: "Inter", style: "Regular" };
  header.appendChild(title);
  section.appendChild(header);

  // Column headers
  const colHeader = figma.createText();
  colHeader.characters = "Standard text";
  colHeader.fontSize = 14;
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
    // Remove prefix from name for display
    const displayName = filterPrefix ? s.name.replace(`${filterPrefix}/`, '') : s.name;

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
    label.fontSize = 12;
    label.resize(150, label.height);
    label.layoutGrow = 0;

    // Sample Text
    const sample = figma.createText();
    sample.name = "Preview Text"; // Meaningful name
    // Default Lorem Ipsum
    let sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis blandit tempus odio varius tincidunt.";
    
    // Customize text length based on font size
    if (s.fontSize > 65) {
        sampleText = "Lorem ipsum dolor sit amet";
    } else if (s.fontSize < 24) {
      sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis blandit tempus odio varius tincidunt. Sed et dui id nisl mollis maximus. Morbi luctus, eros a sagittis condimentum.";
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
        // Check for existing text style
        const existingTextStyle = textStyleMap.get(s.name) || textStyleMap.get(displayName);
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
     cell.fontSize = 12;
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
    label.fontSize = 12;
    label.fontName = { family: "Inter", style: "Regular" };
    label.resize(100, label.height);
    
    row.appendChild(label);
    
    for(let i=0; i<3; i++) {
        const valText = figma.createText();
        valText.characters = val.toString();
        valText.fills = [{type: 'SOLID', color: {r:1, g:1, b:1}}];
        valText.fontSize = 12;
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

  // Group colors by their group (using '/' separator or first word)
  const groupedColors = {};

  for (const variable of colorVariables) {
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

    if (!groupedColors[groupName]) {
      groupedColors[groupName] = [];
    }

    // Get the color value from the first mode
    const modes = Object.keys(variable.valuesByMode);
    const firstMode = modes[0];
    const colorValue = variable.valuesByMode[firstMode];

    if (colorValue && typeof colorValue === 'object' && 'r' in colorValue) {
      const hex = rgbToHex(colorValue.r, colorValue.g, colorValue.b);
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

async function createTypographyFromStyles(parent, textStyles) {
  // Group text styles by breakpoint if they follow "Desktop/", "Tablet/", "Mobile/" pattern
  const breakpoints = ["Desktop", "Tablet", "Mobile"];
  const groupedStyles = { "All": [] };

  textStyles.forEach(style => {
    const name = style.name;
    let matched = false;

    for (const breakpoint of breakpoints) {
      if (name.startsWith(breakpoint + '/') || name.startsWith(breakpoint + ' ')) {
        if (!groupedStyles[breakpoint]) {
          groupedStyles[breakpoint] = [];
        }
        groupedStyles[breakpoint].push(style);
        matched = true;
        break;
      }
    }

    if (!matched) {
      groupedStyles["All"].push(style);
    }
  });

  // Create sections for each group
  for (const [breakpoint, styles] of Object.entries(groupedStyles)) {
    if (styles.length === 0) continue;

    const section = figma.createFrame();
    section.name = breakpoint === "All" ? "Typography" : `${breakpoint} Typography`;
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
    title.characters = breakpoint === "All" ? "Typography" : `${breakpoint} | Typography`;
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
      const displayName = style.name.replace(`${breakpoint}/`, '').replace(`${breakpoint} `, '');

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
      label.fontSize = 12;
      label.resize(150, label.height);
      label.layoutGrow = 0;

      // Sample text based on size (define first)
      let sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis blandit tempus odio varius tincidunt.";
      if (style.fontSize > 65) {
        sampleText = "Lorem ipsum dolor sit amet";
      } else if (style.fontSize < 24) {
        sampleText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis blandit tempus odio varius tincidunt. Sed et dui id nisl mollis maximus.";
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

async function createSpacingFromVariables(parent, numberVariables) {
  // Filter spacing-related variables
  const spacingVars = numberVariables.filter(v =>
    v.name.toLowerCase().includes('spacing') ||
    v.name.toLowerCase().includes('space') ||
    v.name.toLowerCase().includes('gap') ||
    v.name.toLowerCase().includes('padding') ||
    v.name.toLowerCase().includes('margin')
  );

  if (spacingVars.length === 0) return;

  // Get all available modes from the first variable's collection
  const firstVariable = spacingVars[0];
  const collection = figma.variables.getVariableCollectionById(firstVariable.variableCollectionId);

  // Log collection info for debugging
  console.log("Collection modes:", collection.modes);

  // Create array of mode objects from collection
  const modes = collection.modes.map(m => ({
    id: m.modeId,
    name: m.name
  }));

  console.log("All modes:", modes);
  console.log("Collection defaultModeId:", collection.defaultModeId);

  // Helper function to get value with fallback to default mode
  const getVariableValue = (variable, modeId) => {
    // First, try to get the value for the requested mode
    if (variable.valuesByMode[modeId] !== undefined) {
      return variable.valuesByMode[modeId];
    }

    // If not found, fallback to default mode
    if (collection.defaultModeId && variable.valuesByMode[collection.defaultModeId] !== undefined) {
      return variable.valuesByMode[collection.defaultModeId];
    }

    // If still not found, try the first available value
    const firstValue = Object.values(variable.valuesByMode)[0];
    return firstValue !== undefined ? firstValue : 0;
  };

  // Group variables by category (Horizontal spacing / Vertical spacing)
  const groupedVars = {};
  spacingVars.forEach(v => {
    const name = v.name;
    let category;

    if (name.toLowerCase().includes('horizontal')) {
      category = 'Horizontal spacing';
    } else if (name.toLowerCase().includes('vertical')) {
      category = 'Vertical spacing';
    } else {
      category = 'Other spacing';
    }

    if (!groupedVars[category]) {
      groupedVars[category] = [];
    }
    groupedVars[category].push(v);
  });

  // Create sections for each category
  Object.entries(groupedVars).forEach(([category, vars]) => {
    const section = figma.createFrame();
    section.name = category;
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
    title.fontName = { family: "Inter", style: "Regular" };
    title.characters = category;
    title.fontSize = 32;
    section.appendChild(title);

    const table = figma.createFrame();
    table.layoutMode = "VERTICAL";
    table.itemSpacing = 1;
    table.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    table.counterAxisSizingMode = "AUTO";

    // Header Row with all mode names
    const headerRow = figma.createFrame();
    headerRow.layoutMode = "HORIZONTAL";
    headerRow.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
    headerRow.paddingLeft = 16;
    headerRow.paddingRight = 16;
    headerRow.paddingTop = 10;
    headerRow.paddingBottom = 10;
    headerRow.primaryAxisSizingMode = "AUTO";
    headerRow.counterAxisSizingMode = "AUTO";

    // First column: Name
    const nameHeader = figma.createText();
    nameHeader.fontName = { family: "Inter", style: "Bold" };
    nameHeader.characters = 'Name';
    nameHeader.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    nameHeader.fontSize = 12;
    nameHeader.resize(150, nameHeader.height);
    headerRow.appendChild(nameHeader);

    // Other columns: Mode names (Desktop, Tablet, Mobile, 1024, etc.)
    modes.forEach(mode => {
      const cell = figma.createText();
      cell.fontName = { family: "Inter", style: "Bold" };
      cell.characters = mode.name;
      cell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      cell.fontSize = 12;
      cell.resize(100, cell.height);
      headerRow.appendChild(cell);
    });
    table.appendChild(headerRow);

    // Sort variables by numeric value (extract number from name)
    const sortedVars = [...vars].sort((a, b) => {
      // Extract numeric part from name like "Horizontal spacing/8" -> 8
      const extractNum = (name) => {
        const match = name.match(/\/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      };
      return extractNum(a.name) - extractNum(b.name);
    });

    // Data Rows
    sortedVars.forEach(variable => {
      // Debug log for first few variables
      if (sortedVars.indexOf(variable) < 3) {
        console.log(`\nVariable: ${variable.name}`);
        console.log(`valuesByMode keys:`, Object.keys(variable.valuesByMode));
        console.log(`valuesByMode:`, variable.valuesByMode);
        console.log(`Resolved values for each mode:`);
        modes.forEach(mode => {
          const rawValue = variable.valuesByMode[mode.id];
          const resolvedValue = getVariableValue(variable, mode.id);
          console.log(`  ${mode.name}: raw=${rawValue}, resolved=${resolvedValue}`);
        });
      }

      const row = figma.createFrame();
      row.layoutMode = "HORIZONTAL";
      row.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
      row.paddingLeft = 16;
      row.paddingRight = 16;
      row.paddingTop = 10;
      row.paddingBottom = 10;
      row.primaryAxisSizingMode = "AUTO";
      row.counterAxisSizingMode = "AUTO";

      // Name cell - show just the number or last part
      const displayName = variable.name.split('/').pop() || variable.name;
      const nameCell = figma.createText();
      nameCell.fontName = { family: "Inter", style: "Regular" };
      nameCell.characters = displayName;
      nameCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      nameCell.fontSize = 12;
      nameCell.resize(150, nameCell.height);
      row.appendChild(nameCell);

      // Value cells for each mode
      modes.forEach(mode => {
        const value = getVariableValue(variable, mode.id);
        const valueCell = figma.createText();
        valueCell.fontName = { family: "Inter", style: "Regular" };
        valueCell.characters = String(value);
        valueCell.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        valueCell.fontSize = 12;
        valueCell.resize(100, valueCell.height);
        row.appendChild(valueCell);
      });

      table.appendChild(row);
    });

    section.appendChild(table);
    parent.appendChild(section);
  });
}
