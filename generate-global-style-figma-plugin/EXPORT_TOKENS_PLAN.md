# Plan: Export/Download Tokens từ Figma về JSON Files

## Mục tiêu
Thêm chức năng export/download ngược lại: từ Figma Variables & Styles → JSON token files, để lấy data mới nhất khi design có thay đổi.

## Cấu trúc hiện tại
- **Import flow**: JSON files → Parse → Create Variables/Styles → Generate Layout
- **Export flow cần thêm**: Figma Variables/Styles → Parse → Generate JSON → Download files

## Các bước implementation

### 1. UI/UX Changes (ui.html)

#### 1.1. Thêm Tab mới "Export Tokens"
- Thêm tab thứ 3 vào navigation: "Export Tokens"
- Tab content sẽ có:
  - Checkbox list để chọn các loại tokens muốn export
  - Input field cho Project name (để fill vào `$project`)
  - Button "Export & Download"

#### 1.2. Checkbox mapping với file types
```
☑ Colors (colors.json)
☑ Typography (typography.json)
☑ Spacing (spacing.json)
☑ Shadow (shadow.json)
☑ Border (border.json)
☑ Breakpoints (breakpoints.json)
☑ Button (button.json)
```

#### 1.3. UI Structure
```html
<div id="tab3" class="tab-content">
  <div class="option-card">
    <h3>Export Tokens from Figma</h3>
    <p>Export Variables & Styles from Figma to JSON token files</p>
    
    <div class="checkbox-group">
      <label><input type="checkbox" data-token="color" checked> Colors (colors.json)</label>
      <label><input type="checkbox" data-token="typography" checked> Typography (typography.json)</label>
      <label><input type="checkbox" data-token="spacing" checked> Spacing (spacing.json)</label>
      <label><input type="checkbox" data-token="shadow" checked> Shadow (shadow.json)</label>
      <label><input type="checkbox" data-token="border" checked> Border (border.json)</label>
      <label><input type="checkbox" data-token="breakpoint" checked> Breakpoints (breakpoints.json)</label>
      <label><input type="checkbox" data-token="button" checked> Button (button.json)</label>
    </div>
    
    <div class="prefix-input">
      <label>Project Name:</label>
      <input type="text" id="exportProjectName" placeholder="e.g., Project A — Corporate / Enterprise">
    </div>
    
    <button id="exportTokensBtn">Export & Download</button>
  </div>
</div>
```

### 2. Backend Logic (code.js)

#### 2.1. Message Handler mới
```javascript
else if (msg.type === 'exportTokens') {
  try {
    const tokenTypes = msg.tokenTypes || []; // ['color', 'typography', ...]
    const projectName = msg.projectName || 'Project A — Corporate / Enterprise';
    
    const exportedTokens = await exportTokensFromFigma(tokenTypes, projectName);
    
    // Send back to UI for download
    figma.ui.postMessage({ 
      type: 'tokensExported', 
      tokens: exportedTokens,
      projectName: projectName
    });
  } catch (error) {
    figma.ui.postMessage({ 
      type: 'status', 
      message: `Error: ${error.message}`, 
      error: true 
    });
  }
}
```

#### 2.2. Main Export Function
```javascript
async function exportTokensFromFigma(tokenTypes, projectName) {
  const exported = {};
  
  // Get all Figma data
  const colorVariables = figma.variables.getLocalVariables("COLOR");
  const textStyles = figma.getLocalTextStyles();
  const numberVariables = figma.variables.getLocalVariables("FLOAT");
  const paintStyles = figma.getLocalPaintStyles();
  
  // Export each token type
  if (tokenTypes.includes('color')) {
    exported.color = exportColorTokens(colorVariables, projectName);
  }
  
  if (tokenTypes.includes('typography')) {
    exported.typography = exportTypographyTokens(textStyles, projectName);
  }
  
  if (tokenTypes.includes('spacing')) {
    exported.spacing = exportSpacingTokens(numberVariables, projectName);
  }
  
  if (tokenTypes.includes('shadow')) {
    exported.shadow = exportShadowTokens(paintStyles, projectName);
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
```

#### 2.3. Export Functions cho từng token type

##### 2.3.1. Export Colors
```javascript
function exportColorTokens(colorVariables, projectName) {
  const colorData = {};
  
  // Parse variable names to match exact structure:
  // "Colors - Project A/primary/100" → color.primary.100
  // "primary/100" → color.primary.100
  // "semantic/success" → color.semantic.success
  // "black" → color.black
  
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
    const colorValue = variable.valuesByMode[modeId];
    
    // Resolve if it's a variable reference
    const resolvedValue = resolveVariableValue(colorValue);
    
    // Convert to hex string
    const hex = colorToHex(resolvedValue);
    
    // Set final value
    const finalKey = parts[parts.length - 1];
    current[finalKey] = {
      value: hex,
      description: description
    };
  });
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "color",
    "$project": projectName,
    "color": colorData
  };
}
```

##### 2.3.2. Export Typography
```javascript
function exportTypographyTokens(textStyles, projectName) {
  const textStylesData = {};
  
  textStyles.forEach(style => {
    // Parse name like "Mobile/H1" or "Desktop/Body" or "Body"
    // → { breakpoint: "mobile", styleName: "h1" }
    const parsed = parseTextStyleName(style.name);
    
    // Build nested structure matching exact format:
    // textStyles.h1.mobile = { fontSize, lineHeight, fontWeight, ... }
    // textStyles.body.mobile.tablet = { fontSize, ... } (nested breakpoints)
    
    if (!textStylesData[parsed.styleName]) {
      textStylesData[parsed.styleName] = {};
    }
    
    // Handle nested breakpoints (e.g., body.mobile.tablet.desktop)
    let current = textStylesData[parsed.styleName];
    const breakpoints = parsed.breakpoints || [parsed.breakpoint];
    
    for (let i = 0; i < breakpoints.length - 1; i++) {
      if (!current[breakpoints[i]]) {
        current[breakpoints[i]] = {};
      }
      current = current[breakpoints[i]];
    }
    
    const finalBreakpoint = breakpoints[breakpoints.length - 1];
    
    // Build style object (only include defined properties)
    const styleObj = {};
    if (style.fontSize !== undefined) {
      styleObj.fontSize = `${style.fontSize}px`;
    }
    if (style.lineHeight !== undefined) {
      if (typeof style.lineHeight === 'object') {
        styleObj.lineHeight = `${style.lineHeight.value}${style.lineHeight.unit}`;
      } else {
        styleObj.lineHeight = style.lineHeight;
      }
    }
    if (style.fontWeight !== undefined) {
      styleObj.fontWeight = mapFigmaWeightToToken(style.fontWeight);
    }
    if (style.fontName && style.fontName.family) {
      styleObj.fontFamily = style.fontName.family;
    }
    if (style.letterSpacing !== undefined) {
      if (typeof style.letterSpacing === 'object') {
        styleObj.letterSpacing = `${style.letterSpacing.value}${style.letterSpacing.unit}`;
      } else {
        styleObj.letterSpacing = `${style.letterSpacing}px`;
      }
    }
    if (style.fills && style.fills.length > 0) {
      const fill = style.fills[0];
      if (fill.type === 'SOLID') {
        styleObj.color = colorToHex(fill.color);
      }
    }
    
    current[finalBreakpoint] = styleObj;
  });
  
  // Note: linksColors might need special handling if it exists in text styles
  // or might need to be extracted from a different source
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "typography",
    "$project": projectName,
    "textStyles": textStylesData
  };
}
```

##### 2.3.3. Export Spacing
```javascript
function exportSpacingTokens(numberVariables, projectName) {
  const spacingData = {};
  
  // Filter spacing variables (by name pattern or collection)
  const spacingVars = numberVariables.filter(v => {
    const name = v.name.toLowerCase();
    return name.includes('spacing') || 
           (v.variableCollectionId && getCollectionName(v.variableCollectionId).toLowerCase().includes('spacing'));
  });
  
  // Group by spacing key (0, 1, 2, ...) and breakpoint
  spacingVars.forEach(variable => {
    const name = variable.name;
    
    // Remove collection prefix: "Spacing - Project A/" → ""
    let cleanName = name.replace(/^Spacing\s*-\s*[^/]+\//, '');
    
    // Parse: "1/desktop" → { key: "1", breakpoint: "desktop" }
    // Or: "1" → { key: "1", breakpoint: "mobile" (default) }
    const parts = cleanName.split('/').filter(p => p);
    const key = parts[0];
    const breakpoint = parts[1] || 'mobile'; // Default to mobile if no breakpoint
    
    // Get value from first mode
    const modeId = Object.keys(variable.valuesByMode)[0];
    let value = variable.valuesByMode[modeId];
    
    // Resolve if it's a variable reference
    value = resolveVariableValue(value);
    
    // Initialize spacing key if not exists
    if (!spacingData[key]) {
      spacingData[key] = {};
    }
    
    // Set value for breakpoint
    spacingData[key][breakpoint] = {
      value: `${value}px`
    };
  });
  
  // Ensure all breakpoints exist for each key (inherit from mobile if missing)
  Object.keys(spacingData).forEach(key => {
    if (!spacingData[key].mobile) {
      // Try to inherit from first available breakpoint
      const firstBreakpoint = Object.keys(spacingData[key])[0];
      if (firstBreakpoint) {
        spacingData[key].mobile = spacingData[key][firstBreakpoint];
      }
    }
    if (!spacingData[key].tablet) {
      spacingData[key].tablet = spacingData[key].mobile || spacingData[key].desktop;
    }
    if (!spacingData[key].desktop) {
      spacingData[key].desktop = spacingData[key].tablet || spacingData[key].mobile;
    }
  });
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "spacing",
    "$project": projectName,
    "spacing": spacingData
  };
}
```

##### 2.3.4. Export Shadow
```javascript
function exportShadowTokens(paintStyles, projectName) {
  const shadowData = {};
  
  // Filter shadow paint styles (only those with shadow effects)
  const shadowStyles = paintStyles.filter(style => {
    if (!style.effects || style.effects.length === 0) return false;
    return style.effects.some(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW');
  });
  
  shadowStyles.forEach(style => {
    // Parse name like "Shadow/sm" or "shadow/xs" or "sm"
    let cleanName = style.name.replace(/^Shadow\s*\/?/i, '');
    const key = cleanName.toLowerCase();
    
    // Convert effects to CSS shadow string
    // Format: "0 1px 2px 0 rgb(0 0 0 / 0.05)" or multiple shadows
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
```

##### 2.3.5. Export Border
```javascript
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
    // Or: "Border Width/thin" → { type: "width", key: "thin" }
    // Or: "radius/sm" → { type: "radius", key: "sm" }
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
    
    // Convert to appropriate unit (px or rem)
    // Check if value should be rem (like 0.125rem) or px
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
```

##### 2.3.6. Export Breakpoints
```javascript
function exportBreakpointTokens(numberVariables, projectName) {
  const breakpointData = {};
  const containerData = {};
  
  // Filter breakpoint variables
  const breakpointVars = numberVariables.filter(v => {
    const name = v.name.toLowerCase();
    return name.includes('breakpoint') || 
           (v.variableCollectionId && getCollectionName(v.variableCollectionId).toLowerCase().includes('breakpoint'));
  });
  
  // Group by breakpoint name (xs, sm, md, lg, xl, 2xl)
  // Parse names like: "Breakpoint/xs/value", "Breakpoint/xs/max", "Container/xs"
  breakpointVars.forEach(variable => {
    const name = variable.name;
    
    // Remove prefix: "Breakpoint/" or "Container/"
    let cleanName = name.replace(/^(Breakpoint|Container)\s*\/?/i, '');
    const parts = cleanName.split('/').filter(p => p);
    
    if (parts.length >= 2) {
      const breakpointKey = parts[0]; // xs, sm, md, lg, xl, 2xl
      const property = parts[1]; // value, max
      
      // Get value
      const modeId = Object.keys(variable.valuesByMode)[0];
      let value = variable.valuesByMode[modeId];
      value = resolveVariableValue(value);
      
      // Determine if it's breakpoint or container
      const isContainer = name.toLowerCase().includes('container');
      const target = isContainer ? containerData : breakpointData;
      
      if (!target[breakpointKey]) {
        target[breakpointKey] = {};
      }
      
      if (property === 'value' || property === 'max') {
        target[breakpointKey][property] = `${value}px`;
      } else {
        target[breakpointKey].value = `${value}px`;
      }
      
      // Add description if available
      if (variable.description) {
        target[breakpointKey].description = variable.description;
      }
    }
  });
  
  // Ensure all breakpoints have value and max
  const breakpointKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  breakpointKeys.forEach(key => {
    if (breakpointData[key] && !breakpointData[key].max) {
      breakpointData[key].max = key === '2xl' ? 'none' : `${parseInt(breakpointData[key].value) + 319}px`;
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
```

##### 2.3.7. Export Button
```javascript
function exportButtonTokens(projectName) {
  // Button tokens might need to be extracted from components
  // Or might not be exportable if they're complex component structures
  // This might need special handling or be marked as "not supported"
  
  return {
    "$schema": "https://gravity-flex.dev/schemas/tokens.json",
    "$type": "button",
    "$project": projectName,
    "button": {
      // Extract from button components if they exist
      // Or return empty structure
    }
  };
}
```

### 3. Helper Functions

#### 3.1. Color conversion
```javascript
function colorToHex(colorValue) {
  if (colorValue.type === 'RGB') {
    const r = Math.round(colorValue.r * 255);
    const g = Math.round(colorValue.g * 255);
    const b = Math.round(colorValue.b * 255);
    const a = colorValue.a !== undefined ? colorValue.a : 1;
    
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    return rgbToHex(r, g, b);
  }
  // Handle other color types
}
```

#### 3.2. Name parsing functions
```javascript
function parseTextStyleName(name) {
  // "Mobile/H1" → { breakpoint: "mobile", styleName: "h1", breakpoints: ["mobile"] }
  // "Desktop/Body" → { breakpoint: "desktop", styleName: "body", breakpoints: ["desktop"] }
  // "Body" → { breakpoint: "mobile", styleName: "body", breakpoints: ["mobile"] }
  // Handle nested: "Body/Mobile/Tablet" → { breakpoint: "tablet", styleName: "body", breakpoints: ["mobile", "tablet"] }
  
  const parts = name.split('/').filter(p => p);
  const breakpointKeywords = ['mobile', 'tablet', 'desktop'];
  
  let styleName = '';
  const breakpoints = [];
  
  parts.forEach(part => {
    const lowerPart = part.toLowerCase();
    if (breakpointKeywords.includes(lowerPart)) {
      breakpoints.push(lowerPart);
    } else {
      styleName = part.toLowerCase();
    }
  });
  
  // Default to mobile if no breakpoint found
  if (breakpoints.length === 0) {
    breakpoints.push('mobile');
  }
  
  return {
    breakpoint: breakpoints[breakpoints.length - 1],
    styleName: styleName || name.toLowerCase(),
    breakpoints: breakpoints
  };
}

function mapFigmaWeightToToken(figmaWeight) {
  // Map Figma font weight numbers to token format
  // 100-300 → "light", 400 → "regular", 500 → "medium", 600 → "semibold", 700 → "bold"
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
  return weightMap[figmaWeight] || 'regular';
}

function formatBorderValue(value) {
  // Convert px to rem for small values (matching original format)
  // 2px → 0.125rem, 4px → 0.25rem, etc.
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
```

#### 3.3. Effects to shadow string
```javascript
function effectsToShadowString(effects) {
  // Convert Figma effects to CSS shadow string
  // Format: "0 1px 2px 0 rgb(0 0 0 / 0.05)" or multiple shadows
  // "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
  
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

function resolveVariableValue(value) {
  // If value is a variable reference, resolve it
  if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
    const variable = figma.variables.getVariableById(value.id);
    if (variable) {
      const modeId = Object.keys(variable.valuesByMode)[0];
      return resolveVariableValue(variable.valuesByMode[modeId]);
    }
  }
  return value;
}

function getCollectionName(collectionId) {
  const collection = figma.variables.getVariableCollectionById(collectionId);
  return collection ? collection.name : '';
}
```

### 4. Download Logic (ui.html)

#### 4.1. Handle exported tokens
```javascript
window.addEventListener('message', (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg.type === 'tokensExported') {
    const tokens = msg.tokens;
    const projectName = msg.projectName;
    
    // Download each token file
    Object.keys(tokens).forEach(tokenType => {
      const tokenData = tokens[tokenType];
      const fileName = getFileNameForTokenType(tokenType);
      
      downloadJSON(fileName, tokenData);
    });
    
    showSuccess(`Exported ${Object.keys(tokens).length} token files`);
  }
});

function getFileNameForTokenType(tokenType) {
  const mapping = {
    'color': 'colors.json',
    'typography': 'typography.json',
    'spacing': 'spacing.json',
    'shadow': 'shadow.json',
    'border': 'border.json',
    'breakpoint': 'breakpoints.json',
    'button': 'button.json'
  };
  return mapping[tokenType] || `${tokenType}.json`;
}

function downloadJSON(fileName, data) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### 5. Edge Cases & Considerations

#### 5.1. Variable naming conventions
- Cần handle nhiều naming patterns:
  - "Colors - Project A/primary/100" → color.primary.100
  - "primary/100" → color.primary.100
  - "Colors/primary/100" → color.primary.100
  - "semantic/success" → color.semantic.success
  - "black" → color.black
- Cần detect collection name từ variable collection
- **QUAN TRỌNG**: Output structure phải giống hệt input structure để có thể import lại

#### 5.2. Breakpoints trong typography/spacing
- Typography có thể có breakpoints: mobile, tablet, desktop
- Typography có thể có nested breakpoints: body.mobile.tablet.desktop
- Spacing có thể có breakpoints: spacing.1.desktop, spacing.1.tablet, spacing.1.mobile
- Cần parse và group đúng theo format: `{ "1": { "desktop": { "value": "8px" }, ... } }`

#### 5.3. Missing data
- Nếu không có variables/styles cho token type nào → export empty structure với đúng format
- Show warning message cho user
- Đảm bảo JSON structure vẫn đúng format (có $schema, $type, $project)

#### 5.4. Variable modes
- Figma variables có thể có multiple modes (light/dark theme)
- Cần quyết định export mode nào (default: first mode)
- Có thể thêm option để user chọn mode

#### 5.5. Variable references
- Variables có thể reference đến variables khác
- Cần resolve references để lấy actual value (recursive resolution)
- Sử dụng `resolveVariableValue()` helper function

#### 5.6. **CRITICAL: Output Format Matching**
- **Colors**: `{ "$schema", "$type", "$project", "color": { "primary": { "100": { "value", "description" } } } }`
- **Typography**: `{ "$schema", "$type", "$project", "textStyles": { "h1": { "mobile": { ... } } }, "linksColors": { ... } }`
- **Spacing**: `{ "$schema", "$type", "$project", "spacing": { "0": { "desktop": { "value" }, ... } } }`
- **Shadow**: `{ "$schema", "$type", "$project", "shadow": { "xs": { "value", "description" } } }`
- **Border**: `{ "$schema", "$type", "$project", "border": { "radius": { ... }, "width": { ... } } }`
- **Breakpoints**: `{ "$schema", "$type", "$project", "breakpoint": { ... }, "container": { ... } }`
- **Button**: Complex structure với config, variants, base, sizes, styles, properties, textLink
- **MUST**: Output JSON phải có thể import lại được mà không lỗi

### 6. Testing Checklist

- [ ] Export colors từ color variables
- [ ] Export typography từ text styles
- [ ] Export spacing từ number variables
- [ ] Export shadow từ paint styles với effects
- [ ] Export border từ number variables
- [ ] Export breakpoints từ number variables
- [ ] Export multiple token types cùng lúc
- [ ] Download files với đúng tên
- [ ] JSON format đúng với schema
- [ ] Handle missing data gracefully
- [ ] Handle different naming conventions
- [ ] Handle variable references
- [ ] Handle multiple modes

### 7. Implementation Order

1. **Phase 1: UI Setup**
   - Thêm tab "Export Tokens"
   - Thêm checkbox list
   - Thêm project name input
   - Thêm export button

2. **Phase 2: Basic Export (Colors & Typography)**
   - Implement `exportColorTokens()`
   - Implement `exportTypographyTokens()`
   - Test với simple cases

3. **Phase 3: Number-based Tokens**
   - Implement `exportSpacingTokens()`
   - Implement `exportBorderTokens()`
   - Implement `exportBreakpointTokens()`

4. **Phase 4: Complex Tokens**
   - Implement `exportShadowTokens()`
   - Implement `exportButtonTokens()` (if possible)

5. **Phase 5: Download & Polish**
   - Implement download logic
   - Handle edge cases
   - Add error handling
   - Add success/error messages

6. **Phase 6: Testing & Refinement**
   - Test với real Figma files
   - Fix naming parsing issues
   - Improve error messages
   - Add validation

## Notes

### **CRITICAL REQUIREMENT: Format Matching**

Output JSON **PHẢI** có cấu trúc giống hệt input format để có thể import lại được. Đây là yêu cầu quan trọng nhất.

#### Format Examples (phải match chính xác):

**colors.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "color",
  "$project": "Project A — Corporate / Enterprise",
  "color": {
    "primary": {
      "100": { "value": "#9dcef0", "description": "Primary tint" },
      "200": { "value": "#6fb7e8", "description": "Primary light" }
    },
    "semantic": {
      "success": { "value": "#2e7d32", "description": "Success state" }
    }
  }
}
```

**typography.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "typography",
  "$project": "Project A — Corporate / Enterprise",
  "textStyles": {
    "h1": {
      "mobile": {
        "fontSize": "60px",
        "lineHeight": "120%",
        "fontWeight": "semibold"
      },
      "desktop": {
        "fontSize": "64px"
      }
    },
    "body": {
      "mobile": {
        "fontSize": "16px",
        "lineHeight": "150%",
        "fontWeight": "regular",
        "fontFamily": "Lato",
        "tablet": {
          "fontSize": "17px"
        }
      }
    }
  },
  "linksColors": { ... }
}
```

**spacing.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "spacing",
  "$project": "Project A — Corporate / Enterprise",
  "spacing": {
    "1": {
      "desktop": { "value": "8px" },
      "tablet": { "value": "8px" },
      "mobile": { "value": "8px" }
    }
  }
}
```

**shadow.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "shadow",
  "$project": "Project A — Corporate / Enterprise",
  "shadow": {
    "xs": { "value": "0 1px 2px 0 rgb(0 0 0 / 0.05)", "description": "Extra small shadow" }
  }
}
```

**border.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "border",
  "$project": "Project A — Corporate / Enterprise",
  "border": {
    "radius": {
      "sm": { "value": "0.125rem", "description": "Small border radius (2px)" }
    },
    "width": {
      "thin": { "value": "1px", "description": "Thin border" },
      "DEFAULT": "1px"
    }
  }
}
```

**breakpoints.json:**
```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "breakpoint",
  "$project": "Project A — Corporate / Enterprise",
  "breakpoint": {
    "xs": { 
      "value": "0", 
      "max": "480px",
      "description": "Extra small devices (portrait phones)" 
    }
  },
  "container": {
    "xs": { "value": "100%", "description": "Full width on extra small" }
  }
}
```

### Other Considerations

- Cần handle các edge cases về naming conventions
- Có thể cần thêm options để user chọn:
  - Export mode (nếu có multiple modes)
  - Naming convention preference
  - Include/exclude specific collections
- Button tokens có thể phức tạp hơn vì cần extract từ components - có thể cần special handling hoặc mark as "not fully supported"

