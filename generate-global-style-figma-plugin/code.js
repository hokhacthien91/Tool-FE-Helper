console.clear();

figma.showUI(__html__, { width: 400, height: 300 });

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
  
  // Only render typography sections if styles exist for that breakpoint
  const breakpoints = ["Desktop", "Tablet", "Mobile"];
  for (const breakpoint of breakpoints) {
    const hasStyles = styles.some(s => s.name.startsWith(breakpoint));
    if (hasStyles) {
      await createTypographySection(mainFrame, styles, breakpoint, textStyleMap);
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

  // Create a frame for each group
  Object.entries(groupedColors).forEach(([groupName, colors]) => {
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
    title.characters = groupName;
    title.fontSize = 28;
    title.fontName = { family: "Inter", style: "Bold" };
    groupFrame.appendChild(title);

    // Create rows of swatches (4 per row)
    const swatchesPerRow = 4;
    for (let i = 0; i < colors.length; i += swatchesPerRow) {
      const swatchesRow = figma.createFrame();
      swatchesRow.name = "Swatches Row";
      swatchesRow.layoutMode = "HORIZONTAL";
      swatchesRow.itemSpacing = 20;
      swatchesRow.fills = [];
      swatchesRow.primaryAxisSizingMode = "AUTO";
      swatchesRow.counterAxisSizingMode = "AUTO";

      const rowColors = colors.slice(i, i + swatchesPerRow);
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
        nameText.characters = c.name;
        nameText.fontSize = 24; // Increased font size (was 12)
        nameText.fontName = { family: "Inter", style: "Bold" };
        nameText.textAlignHorizontal = "CENTER";
        nameText.resize(240, nameText.height); 

        const hexText = figma.createText();
        hexText.name = "Hex Value"; // Meaningful name
        hexText.characters = c.hex;
        hexText.fontSize = 24; // Increased font size (was 10)
        hexText.fontName = { family: "Inter", style: "Regular" };
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
  // Check if there are any styles for this breakpoint before creating section
  const filteredStyles = styles.filter(s => s.name.startsWith(filterPrefix));
  if (filteredStyles.length === 0) {
    return; // Don't create section if no styles exist
  }
  
  const section = figma.createFrame();
  section.name = `${filterPrefix} Typography`;
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
  title.characters = `${filterPrefix} | Typography`;
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
    const displayName = s.name.replace(`${filterPrefix}/`, '');

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
    label.name = "Label"; // Meaningful name
    label.characters = displayName;
    label.fontSize = 12;
    label.fontName = { family: "Inter", style: "Regular" };
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
             sample.textStyleId = existingTextStyle.id;
        } else {
             // Fallback to manual properties - ensure font is loaded first
             const fontToUse = { family: s.fontFamily, style: s.fontWeight };
             
             // Try to load font if not already loaded
             try {
               await figma.loadFontAsync(fontToUse);
             } catch (fontError) {
               console.warn(`Font not found: ${fontToUse.family} ${fontToUse.style}, trying fallbacks`, fontError);
               // Try fallbacks
               const fallbacks = [
                 { family: s.fontFamily, style: "Regular" },
                 { family: s.fontFamily, style: "Medium" },
                 { family: "Inter", style: "Regular" }
               ];
               
               let loaded = false;
               for (const fallback of fallbacks) {
                 try {
                   await figma.loadFontAsync(fallback);
                   fontToUse.family = fallback.family;
                   fontToUse.style = fallback.style;
                   loaded = true;
                   break;
                 } catch (e) {
                   // Continue to next fallback
                 }
               }
               
               if (!loaded) {
                 fontToUse.family = "Inter";
                 fontToUse.style = "Regular";
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
