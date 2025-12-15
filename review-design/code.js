// code.js - runs in Figma plugin environment
figma.showUI(__html__, { width: 600, height: 700 });

// Utility: traverse nodes (skip hidden nodes, Sticky Notes, and "Not check design")
function traverse(node, cb, skipHidden = true) {
  // Skip hidden nodes if skipHidden is true
  if (skipHidden && "visible" in node && node.visible === false) {
    return; // Don't process hidden nodes and their children
  }

  // Skip nodes with name containing "Sticky Note" or "Not check design" (and their children)
  const nodeName = (node.name || "").toLowerCase();
  if (nodeName.includes("sticky note") || nodeName.includes("not check design")) {
    return; // Don't process these nodes and their children
  }

  cb(node);
  if ("children" in node) {
    for (const child of node.children) {
      traverse(child, cb, skipHidden);
    }
  }
}

// Allowed rules / settings
const RULES = {
  // 1) Frame Naming semantic
  namingPatterns: {
    frame: /^(Section|Block|Item|Media|Title|Desc|Button|Card|Header|Footer|Nav|Sidebar|Container|Wrapper|Grid|List|Form|Input|Label|Icon|Image|Avatar|Badge|Tag|Tooltip|Modal|Dialog|Dropdown|Menu|Tab|Accordion|Breadcrumb|Pagination|Slider|Carousel|Table|Row|Col|Cell)/i,
    component: /^(Card|Button|Header-item|CTA|Input|Select|Checkbox|Radio|Switch|Textarea|Label|Icon|Image|Avatar|Badge|Tag|Tooltip|Modal|Dialog|Dropdown|Menu|Tab|Accordion|Breadcrumb|Pagination|Slider|Carousel|Table|Row|Col|Cell)/i,
    text: /^(Title|Desc|Label|Caption|Heading|Subheading|Body|Link|Button-text|Content)/i
  },
  
  // 2) Auto-layout settings
  checkAutoLayout: true,
  preferredLayoutMode: "VERTICAL", // VERTICAL stack preferred
  spacingScale: [8, 12, 16, 24, 32, 40, 48, 64], // Extended scale
  gapScale: [8, 12, 16, 24, 32, 40, 48, 64],
  
  // 3) Structure rules
  disallowGroups: true,
  disallowNestedGroups: true,
  checkEmptyFrames: true,
  checkDuplicateFrames: true,
  
  // 4) Grid & Spacing for responsive
  breakpoints: {
    mobile: { min: 0, max: 768 },
    tablet: { min: 768, max: 1024 },
    desktop: { min: 1024, max: Infinity }
  },
  
  // 5) Typography scale
  typographySizes: {
    h1: 32,
    h2: 24,
    h3: 20,
    h4: 18,
    body: [14, 16, 18],
    caption: 12
  },
  allTypographySizes: [32, 24, 20, 18, 16, 14, 12],
  disallowLineHeightAuto: true,
  disallowLineHeightBaseline: true, // Check for baseline-based line-height
  requireTextStyleKey: true, // Text should use textStyle with key
  
  // 6) Component rules
  requireComponentization: true,
  componentPatterns: ["Card", "Button", "Header-item", "CTA", "Input", "Select", "Checkbox", "Radio", "Switch", "Textarea", "Label", "Icon", "Image", "Avatar", "Badge", "Tag", "Tooltip", "Modal", "Dialog", "Dropdown", "Menu", "Tab", "Accordion", "Breadcrumb", "Pagination", "Slider", "Carousel", "Table", "Row", "Col", "Cell"],
  
  // Additional
  allowedTextStyleIds: [], // Fill with style IDs if enforcing specific styles
  checkNegativePosition: true,
  
  // 7) Accessibility - Color Contrast (WCAG AA only)
  checkTextContrast: true,
  contrastAA: 4.5, // WCAG AA for normal text
  contrastAALarge: 3.0 // WCAG AA for large text (>= 18pt or >= 14pt bold)
};

// Hash for duplicate detection (more detailed)
function nodeHash(node) {
  if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
    const childrenInfo = "children" in node ? 
      node.children.map(c => `${c.type}:${c.name || ""}`).join(",") : "";
    return `${node.type}|${node.name || ""}|${childrenInfo}|${Math.round(node.width || 0)}x${Math.round(node.height || 0)}|${node.layoutMode || "NONE"}`;
  }
  return null;
}

// Check if spacing value is in scale
function isInScale(value, scale) {
  if (typeof value !== "number") return false;
  const rounded = Math.abs(Math.round(value));
  return scale.includes(rounded);
}

// Check if text size matches typography scale
function isValidTypographySize(size) {
  if (typeof size !== "number") return false;
  return RULES.allTypographySizes.includes(Math.round(size));
}

// Convert RGB to relative luminance (for contrast calculation)
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Blend two colors (foreground over background) based on alpha
function blendColors(foreground, background, alpha) {
  // alpha is the opacity of foreground (0-1)
  // background is assumed to be opaque
  const bgAlpha = background.a !== undefined ? background.a : 1;
  const fgAlpha = (foreground.a !== undefined ? foreground.a : 1) * alpha;
  
  // Blend formula: result = foreground * alpha + background * (1 - alpha)
  const r = foreground.r * fgAlpha + background.r * bgAlpha * (1 - fgAlpha);
  const g = foreground.g * fgAlpha + background.g * bgAlpha * (1 - fgAlpha);
  const b = foreground.b * fgAlpha + background.b * bgAlpha * (1 - fgAlpha);
  
  return { r: r, g: g, b: b, a: 1 }; // Result is opaque
}

// Get background color behind a node (for blending semi-transparent backgrounds)
function getBackgroundBehindNode(node) {
  // If node has a parent, check parent's background first
  if (node.parent && node.parent.type !== "PAGE") {
    let parent = node.parent;
    
    // Check parent's fills
    if ("fills" in parent && Array.isArray(parent.fills) && parent.fills.length > 0) {
      for (let i = parent.fills.length - 1; i >= 0; i--) {
        const fill = parent.fills[i];
        if (fill.visible !== false && fill.type === "SOLID") {
          const parentOpacity = fill.opacity !== undefined ? fill.opacity : 1;
          const parentAlpha = fill.color.a !== undefined ? fill.color.a : 1;
          // If parent also has transparency, we need to go further back
          if (parentAlpha * parentOpacity < 1) {
            // Recursively find background behind parent
            return getBackgroundBehindNode(parent);
          }
          return fill.color;
        }
      }
    }
    
    // If parent has no fills, check grandparent
    if (parent.parent && parent.parent.type !== "PAGE") {
      return getBackgroundBehindNode(parent);
    }
  }
  
  // Default to white (canvas background)
  return { r: 1, g: 1, b: 1, a: 1 };
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1.r * 255, color1.g * 255, color1.b * 255);
  const lum2 = getLuminance(color2.r * 255, color2.g * 255, color2.b * 255);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Calculate average color from gradient stops (weighted by position)
function getAverageColorFromGradient(gradient) {
  if (!gradient || !gradient.gradientStops || gradient.gradientStops.length === 0) {
    return null;
  }
  
  const stops = gradient.gradientStops;
  
  // If only one stop, return that color
  if (stops.length === 1) {
    return stops[0].color;
  }
  
  // Calculate weighted average based on position
  // Sort stops by position to handle them in order
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  
  let totalWeight = 0;
  let r = 0, g = 0, b = 0, a = 0;
  
  for (let i = 0; i < sortedStops.length; i++) {
    const stop = sortedStops[i];
    const nextStop = sortedStops[i + 1];
    
    // Calculate weight: distance between this stop and next (or 1 if last)
    const weight = nextStop ? (nextStop.position - stop.position) : (1 - stop.position);
    
    r += stop.color.r * weight;
    g += stop.color.g * weight;
    b += stop.color.b * weight;
    a += (stop.color.a !== undefined ? stop.color.a : 1) * weight;
    totalWeight += weight;
  }
  
  if (totalWeight === 0) {
    // Fallback: simple average
    r = g = b = a = 0;
    stops.forEach(stop => {
      r += stop.color.r;
      g += stop.color.g;
      b += stop.color.b;
      a += (stop.color.a !== undefined ? stop.color.a : 1);
    });
    const count = stops.length;
    return {
      r: r / count,
      g: g / count,
      b: b / count,
      a: a / count
    };
  }
  
  return {
    r: r / totalWeight,
    g: g / totalWeight,
    b: b / totalWeight,
    a: a / totalWeight
  };
}

// Check if a node overlaps with text node (for sibling background detection)
// Only returns true if node is actually behind text at the same position (text on top)
function nodeOverlapsText(node, textNode) {
  if (!node || !textNode || !("x" in node) || !("y" in node) || !("width" in node) || !("height" in node)) {
    return false;
  }
  if (!("x" in textNode) || !("y" in textNode) || !("width" in textNode) || !("height" in textNode)) {
    return false;
  }
  
  // Check if node is behind text (lower z-index means it's rendered behind)
  // In Figma, children array order determines z-index (later = on top)
  const parent = textNode.parent;
  if (parent && "children" in parent) {
    const textIndex = parent.children.indexOf(textNode);
    const nodeIndex = parent.children.indexOf(node);
    if (nodeIndex === -1 || textIndex === -1) return false;
    // If node comes before text in children array, it's behind text
    if (nodeIndex < textIndex) {
      // Calculate overlap area - node must actually overlap with text, not just be nearby
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;
      const textRight = textNode.x + textNode.width;
      const textBottom = textNode.y + textNode.height;
      
      // Check if bounding boxes overlap at all
      const overlapX = Math.max(0, Math.min(nodeRight, textRight) - Math.max(node.x, textNode.x));
      const overlapY = Math.max(0, Math.min(nodeBottom, textBottom) - Math.max(node.y, textNode.y));
      const overlapArea = overlapX * overlapY;
      
      // Calculate text area
      const textArea = (textRight - textNode.x) * (textBottom - textNode.y);
      
      // Node must overlap with at least 50% of text area to be considered as background
      // This ensures we only use layers that are actually behind the text, not just nearby
      if (textArea > 0 && overlapArea / textArea >= 0.5) {
        return true;
      }
      
      // Also check if node completely covers text (common case for background layers)
      if (node.x <= textNode.x && node.y <= textNode.y && 
          nodeRight >= textRight && nodeBottom >= textBottom) {
        return true;
      }
    }
  }
  return false;
}

// Get background color from node or parent (returns color and node info)
function getBackgroundColor(node) {
  // For TEXT nodes, fills are the text color (foreground), not background
  // So we skip checking TEXT node's fills and go straight to parent
  const isTextNode = node.type === "TEXT";
  
  // For TEXT nodes: Check sibling nodes that are behind the text (same parent, lower z-index)
  if (isTextNode && node.parent && "children" in node.parent) {
    const parent = node.parent;
    const textIndex = parent.children.indexOf(node);
    
    // Check siblings that come before text in children array (behind text)
    for (let i = 0; i < textIndex; i++) {
      const sibling = parent.children[i];
      // Skip hidden siblings
      if ("visible" in sibling && sibling.visible === false) continue;
      
      // Skip TEXT siblings - their fills are text color, not background
      if (sibling.type === "TEXT") continue;
      
      // Check if sibling overlaps with text
      if (nodeOverlapsText(sibling, node)) {
        // Check sibling's fills (only for non-text nodes)
        if ("fills" in sibling && Array.isArray(sibling.fills) && sibling.fills.length > 0) {
          for (let j = sibling.fills.length - 1; j >= 0; j--) {
            const fill = sibling.fills[j];
            if (fill.visible !== false) {
              if (fill.type === "SOLID") {
                return {
                  color: fill.color,
                  nodeName: sibling.name || "Unnamed",
                  nodeId: sibling.id,
                  fromSibling: true,
                  fillOpacity: fill.opacity !== undefined ? fill.opacity : 1
                };
              }
              // Handle gradients: calculate average color from gradient stops
              if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || 
                  fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
                const avgColor = getAverageColorFromGradient(fill);
                const gradientString = gradientToString(fill);
                if (avgColor) {
                  return {
                    color: avgColor,
                    nodeName: sibling.name || "Unnamed",
                    nodeId: sibling.id,
                    isGradient: true,
                    gradientType: fill.type,
                    gradientString: gradientString,
                    fromSibling: true
                  };
                }
              }
            }
          }
        }
      }
    }
  }
  
  // For non-text nodes, check their own fills first (their own background)
  if (!isTextNode && "fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
    // Check fills from bottom to top (last fill is on top)
    for (let i = node.fills.length - 1; i >= 0; i--) {
      const fill = node.fills[i];
      if (fill.visible !== false) {
        if (fill.type === "SOLID") {
          return {
            color: fill.color,
            nodeName: node.name || "Unnamed",
            nodeId: node.id,
            fillOpacity: fill.opacity !== undefined ? fill.opacity : 1
          };
        }
        // Handle gradients: calculate average color from gradient stops
        if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || 
            fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
          const avgColor = getAverageColorFromGradient(fill);
          const gradientString = gradientToString(fill);
          if (avgColor) {
            return {
              color: avgColor,
              nodeName: node.name || "Unnamed",
              nodeId: node.id,
              isGradient: true,
              gradientType: fill.type,
              gradientString: gradientString
            };
          }
        }
      }
    }
  }
  
  // For TEXT nodes or if node itself has no background:
  // Check parent's background (traverse up the hierarchy)
  // Priority: immediate parent first, then go up
  let parent = node.parent;
  while (parent && parent.type !== "PAGE") {
    if ("fills" in parent && Array.isArray(parent.fills) && parent.fills.length > 0) {
      // Check fills from bottom to top (last fill is on top)
      for (let i = parent.fills.length - 1; i >= 0; i--) {
        const fill = parent.fills[i];
        if (fill.visible !== false) {
          if (fill.type === "SOLID") {
            return {
              color: fill.color,
              nodeName: parent.name || "Unnamed",
              nodeId: parent.id,
              fillOpacity: fill.opacity !== undefined ? fill.opacity : 1
            };
          }
          // Handle gradients: calculate average color from gradient stops
          if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || 
              fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
            const avgColor = getAverageColorFromGradient(fill);
            const gradientString = gradientToString(fill);
            if (avgColor) {
              return {
                color: avgColor,
                nodeName: parent.name || "Unnamed",
                nodeId: parent.id,
                isGradient: true,
                gradientType: fill.type,
                gradientString: gradientString
              };
            }
            // If gradient calculation failed, continue searching parent
            break;
          }
        }
      }
    }
    parent = parent.parent;
  }
  
  // Default to white if no background found
  return {
    color: { r: 1, g: 1, b: 1 },
    nodeName: "Default (white)",
    nodeId: null
  };
}

// Check text contrast
function checkTextContrast(node) {
  if (node.type !== "TEXT" || !RULES.checkTextContrast) return null;
  
  // Get text color
  let textColor = null;
  if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
    for (const fill of node.fills) {
      if (fill.type === "SOLID" && fill.visible !== false) {
        textColor = fill.color;
        break;
      }
    }
  }
  
  if (!textColor) return null;
  
  // Get background color and info
  const bgInfo = getBackgroundColor(node);
  let bgColor = bgInfo.color;
  const bgFillOpacity = bgInfo.fillOpacity !== undefined ? bgInfo.fillOpacity : 1;
  const bgColorAlpha = bgColor.a !== undefined ? bgColor.a : 1;
  const totalAlpha = bgColorAlpha * bgFillOpacity;
  
  // If background has transparency, blend with background behind it
  if (totalAlpha < 1) {
    // Find the background node (could be sibling, parent, etc.)
    // If we have nodeId, try to get the actual node, otherwise use current node's parent
    let bgNode = null;
    if (bgInfo.nodeId) {
      try {
        bgNode = figma.getNodeById(bgInfo.nodeId);
      } catch (e) {
        // Node not found, fallback to parent
        bgNode = node.parent;
      }
    } else {
      bgNode = node.parent;
    }
    
    // Find background behind the background layer
    const behindBg = bgNode ? getBackgroundBehindNode(bgNode) : { r: 1, g: 1, b: 1, a: 1 };
    // Blend the semi-transparent background with what's behind it
    bgColor = blendColors(bgColor, behindBg, totalAlpha);
  }
  
  // Calculate contrast ratio (use blended color if opacity was applied)
  const contrast = getContrastRatio(textColor, bgColor);
  
  // Determine if text is large (>= 18pt or >= 14pt bold)
  // Check if fontSize is a valid number (not figma.mixed or symbol)
  const fontSize = (node.fontSize && typeof node.fontSize === "number" && !isNaN(node.fontSize)) ? node.fontSize : 14;
  const fontStyle = (node.fontName && node.fontName.style) ? node.fontName.style.toLowerCase() : "";
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontStyle.includes("bold"));
  
  // Check against WCAG AA standards only
  const minContrast = isLargeText ? RULES.contrastAALarge : RULES.contrastAA;
  
  // Convert colors to hex/rgba strings (preserve alpha and opacity)
  // Note: bgFillOpacity already declared above
  const textColorHex = colorToString(textColor);
  const bgColorHex = colorToString(bgColor, bgFillOpacity);
  const textNodeName = node.name || "Unnamed";
  const bgNodeName = bgInfo.nodeName || "Unknown";
  const isGradient = bgInfo.isGradient || false;
  const gradientType = bgInfo.gradientType || null;
  const gradientString = bgInfo.gradientString || null;
  
  // Check for contrast issues
  if (contrast < minContrast) {
    // Determine severity:
    // - WARNING if gradient (needs manual check) or contrast = 1.00 (likely background detection issue)
    // - ERROR otherwise
    let severity = "error";
    let message = `Text contrast ratio ${contrast.toFixed(2)}:1 không đạt WCAG ${isLargeText ? "AA (large text)" : "AA"} (cần >= ${minContrast}:1). Text: "${node.characters.slice(0, 30)}"`;
    
    if (isGradient) {
      severity = "warn";
      message = `Text contrast ratio ${contrast.toFixed(2)}:1 không đạt WCAG ${isLargeText ? "AA (large text)" : "AA"} (cần >= ${minContrast}:1) với gradient background. Cần check manual vì gradient có thể có vị trí pass. Text: "${node.characters.slice(0, 30)}"`;
    } else if (Math.abs(contrast - 1.0) < 0.01) {
      // Contrast = 1.00:1 (likely same color or background detection failed)
      severity = "warn";
      message = `Text contrast ratio ${contrast.toFixed(2)}:1 - Có thể không lấy được background color đúng (có thể là layer cùng cấp nằm dưới text). Cần check manual. Text: "${node.characters.slice(0, 30)}"`;
    }
    
    return {
      severity: severity,
      type: "contrast",
      message: message,
      id: node.id,
      nodeName: textNodeName,
      contrast: contrast,
      fontSize: fontSize,
      isLargeText: isLargeText,
      minContrast: minContrast,
      textColor: textColorHex,
      textColorNode: textNodeName,
      backgroundColor: bgColorHex,
      backgroundColorNode: bgNodeName,
      isGradient: isGradient,
      gradientType: gradientType,
      gradientString: gradientString,
      fromSibling: bgInfo.fromSibling || false
    };
  }
  
  return null;
}

// Check line-height issues
function checkLineHeight(node, customLineHeightScale = null, lineHeightThreshold = 300, lineHeightBaselineThreshold = 120) {
  if (node.type !== "TEXT" || !node.lineHeight) return null;
  
  // Check if AUTO is allowed in custom scale
  const allowAuto = customLineHeightScale && customLineHeightScale.allowAuto;
  
  // Check AUTO line-height
  if (node.lineHeight.unit === "AUTO") {
    if (allowAuto) {
      return null; // Pass - auto is in the scale
    } else {
      // Auto is not in scale, show warning
      return {
        severity: "warn",
        type: "line-height",
        message: `Line-height để "AUTO" — nên set giá trị cụ thể để tính toán spacing chính xác.`,
        id: node.id,
        nodeName: node.name || "Unnamed"
      };
    }
  }
  
  // Convert line-height to percentage for checking
  let lineHeightPercent = null;
  let lineHeightPixels = null;
  // Check if fontSize is a valid number (not figma.mixed or symbol)
  const fontSize = (node.fontSize && typeof node.fontSize === "number" && !isNaN(node.fontSize)) ? node.fontSize : null;

  if (node.lineHeight.unit === "PERCENT") {
    lineHeightPercent = Math.round(node.lineHeight.value);
    if (fontSize) {
      lineHeightPixels = Math.round((node.lineHeight.value / 100) * fontSize * 100) / 100; // Round to 2 decimals
    }
  } else if (node.lineHeight.unit === "PIXELS" && fontSize && typeof fontSize === "number") {
    lineHeightPixels = node.lineHeight.value;
    lineHeightPercent = Math.round((node.lineHeight.value / fontSize) * 100);
  }
  
  if (lineHeightPercent === null) return null;
  
  // Check if line-height exceeds threshold (special case)
  if (lineHeightPercent > lineHeightThreshold) {
    return null; // Pass - value is above threshold (special case)
  }
  
  // Check against custom line-height scale FIRST - if in scale, pass (skip baseline check)
  if (customLineHeightScale !== null && customLineHeightScale.values && customLineHeightScale.values.length > 0) {
    if (customLineHeightScale.values.includes(lineHeightPercent)) {
      return null; // Pass - value is in scale, skip baseline check
    }
    
    // Not in scale - show warning
    const scaleDisplay = allowAuto ? `auto, ${customLineHeightScale.values.join(", ")}` : customLineHeightScale.values.join(", ");
    
    // Build message with font-size and line-height details
    let detailInfo = "";
    if (fontSize && lineHeightPixels !== null) {
      detailInfo = ` (font-size: ${fontSize}px / line-height: ${lineHeightPixels}px)`;
    } else if (fontSize) {
      detailInfo = ` (font-size: ${fontSize}px)`;
    }
    
    return {
      severity: "warn",
      type: "line-height",
      message: `Line-height ${lineHeightPercent}%${detailInfo} không theo scale. Scale: ${scaleDisplay}%`,
      id: node.id,
      nodeName: node.name || "Unnamed"
    };
  }
  
  // Only check baseline if value is NOT in scale (or no custom scale provided)
  // Check for baseline-based line-height (can cause spacing calculation issues)
  if (RULES.disallowLineHeightBaseline) {
    if (fontSize && typeof fontSize === "number" && node.lineHeight.unit === "PIXELS") {
      const lineHeightValue = node.lineHeight.value;
      const ratio = lineHeightValue / fontSize;
      const ratioPercent = Math.round(ratio * 100);
      
      // Use configurable baseline threshold (default 120% = 1.2x)
      if (ratioPercent < lineHeightBaselineThreshold) {
        return {
          severity: "warn",
          type: "line-height",
          message: `Line-height ${lineHeightPercent}% (font-size: ${fontSize}px / line-height: ${lineHeightValue}px) quá gần với font-size — có thể gây lỗi tính toán spacing giữa các element. Nên dùng line-height >= ${lineHeightBaselineThreshold}% (>= ${(lineHeightBaselineThreshold / 100).toFixed(1)}x font-size).`,
          id: node.id,
          nodeName: node.name || "Unnamed"
        };
      }
    } else if (fontSize && typeof fontSize === "number" && node.lineHeight.unit === "PERCENT") {
      // For PERCENT unit, check directly
      if (lineHeightPercent < lineHeightBaselineThreshold) {
        const lineHeightPx = lineHeightPixels !== null ? lineHeightPixels : Math.round((lineHeightPercent / 100) * fontSize);
        return {
          severity: "warn",
          type: "line-height",
          message: `Line-height ${lineHeightPercent}% (font-size: ${fontSize}px / line-height: ${lineHeightPx}px) quá gần với font-size — có thể gây lỗi tính toán spacing giữa các element. Nên dùng line-height >= ${lineHeightBaselineThreshold}% (>= ${(lineHeightBaselineThreshold / 100).toFixed(1)}x font-size).`,
          id: node.id,
          nodeName: node.name || "Unnamed"
        };
      }
    }
  }
  
  return null;
}

// Get full path of node (from root to node)
function getNodeFullPath(node) {
  const path = [];
  let current = node;
  while (current && current.type !== "PAGE") {
    path.unshift(current.name || "Unnamed");
    current = current.parent;
  }
  return path.join(" > ");
}

// Check if node is a child (or descendant) of a Component or Instance
function isChildOfComponent(node) {
  let parent = node.parent;
  while (parent && parent.type !== "PAGE") {
    if (parent.type === "COMPONENT" || parent.type === "INSTANCE") {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

// Check if frame should be a component
function shouldBeComponent(node) {
  if (node.type !== "FRAME" && node.type !== "INSTANCE") return false;
  if (node.type === "COMPONENT" || node.type === "INSTANCE") return false;
  
  // Skip if node is already inside a Component/Instance (parent manages it)
  if (isChildOfComponent(node)) {
    return false;
  }
  
  const name = (node.name || "").toLowerCase();
  for (const pattern of RULES.componentPatterns) {
    if (name.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Check if frame has similar structure to common components
  if ("children" in node && node.children.length > 0) {
    const hasText = node.children.some(c => c.type === "TEXT");
    const hasMultipleElements = node.children.length >= 2;
    if (hasText && hasMultipleElements) {
      return true; // Likely a reusable component
    }
  }
  
  return false;
}

// Check if a nested group contains background/shape elements
function isBackgroundGroup(group) {
  if (!("children" in group) || group.children.length === 0) return false;
  
  // Check if group contains only shape/background elements
  const allShapes = group.children.every(c => 
    c.type === "RECTANGLE" || c.type === "ELLIPSE" || c.type === "POLYGON" ||
    c.type === "STAR" || c.type === "VECTOR" || c.type === "LINE" ||
    c.type === "BOOLEAN_OPERATION"
  );
  
  // Or if it contains a single shape that's likely a background
  if (group.children.length === 1) {
    const child = group.children[0];
    const childName = (child.name || "").toLowerCase();
    if (child.type === "RECTANGLE" || child.type === "ELLIPSE" || 
        childName.includes("background") || childName.includes("bg") ||
        childName.includes("shape") || childName.includes("container")) {
      return true;
    }
  }
  
  return allShapes && group.children.length <= 3;
}

// Check if group has valid semantic structure (e.g., text + icon, button pattern)
function hasValidGroupStructure(group) {
  if (!("children" in group) || group.children.length === 0) return false;
  
  const children = group.children;
  const childTypes = children.map(c => c.type);
  const childNames = children.map(c => (c.name || "").toLowerCase());
  
  // Pattern 1: Text + Icon (button/link pattern) - very common and valid
  const hasText = childTypes.includes("TEXT");
  const hasIcon = childTypes.some((type, idx) => 
    type === "VECTOR" || type === "COMPONENT" || type === "INSTANCE" || 
    childNames[idx].includes("icon")
  );
  if (hasText && hasIcon && children.length <= 3) {
    return true; // Valid: text + icon pattern (e.g., "LEARN MORE" + arrow icon)
  }
  
  // Pattern 2: Text + Background (button pattern) - text + rectangle or text + group with rectangle
  if (hasText) {
    const hasRectangle = childTypes.includes("RECTANGLE") || childTypes.includes("ELLIPSE");
    const hasBackgroundGroup = childTypes.some((type, idx) => {
      if (type === "GROUP" && "children" in children[idx]) {
        return isBackgroundGroup(children[idx]);
      }
      return false;
    });
    
    if ((hasRectangle || hasBackgroundGroup) && children.length <= 3) {
      return true; // Valid: text + background pattern (e.g., "VIEW LISTING" + rectangle background)
    }
  }
  
  // Pattern 3: Multiple related elements (2-4 elements) - could be valid component
  if (children.length >= 2 && children.length <= 4) {
    // If all children are simple elements (not groups), it's likely valid
    const allSimple = children.every(c => 
      c.type === "TEXT" || c.type === "VECTOR" || c.type === "RECTANGLE" || 
      c.type === "ELLIPSE" || c.type === "COMPONENT" || c.type === "INSTANCE" ||
      c.type === "FRAME"
    );
    if (allSimple) {
      return true; // Valid: small group of related elements
    }
  }
  
  return false;
}

// Check for nested groups (only flag if truly illogical)
function hasNestedGroups(node) {
  if (node.type !== "GROUP" || !("children" in node)) return false;
  
  // Check if this group contains nested groups
  const hasNested = node.children.some(child => child.type === "GROUP");
  
  if (!hasNested) return false; // No nested groups
  
  // Rule 1: If group has 2+ children (layers), it's valid regardless of nested groups
  if (node.children.length >= 2) {
    return false; // Valid: group contains multiple layers
  }
  
  // Rule 2: If group has valid structure (e.g., text + icon), allow nested groups
  if (hasValidGroupStructure(node)) {
    return false; // Valid: parent group has semantic meaning (e.g., button with text + icon)
  }
  
  // Rule 3: Check if nested groups are too deep (more than 1 level)
  for (const child of node.children) {
    if (child.type === "GROUP" && "children" in child) {
      // Check if nested group itself contains groups (depth > 1)
      const hasDeepNesting = child.children.some(grandchild => grandchild.type === "GROUP");
      if (hasDeepNesting) {
        return true; // Too deeply nested (depth > 1)
      }
    }
  }
  
  // Rule 4: If we get here, parent only has 1 nested group
  // Check if nested group is a background group and parent has text
  const nestedGroups = node.children.filter(c => c.type === "GROUP");
  const otherChildren = node.children.filter(c => c.type !== "GROUP");
  const hasText = otherChildren.some(c => c.type === "TEXT");
  
  // Pattern: Text + Background Group (button pattern) - very common and valid
  if (hasText && nestedGroups.length === 1 && isBackgroundGroup(nestedGroups[0])) {
    return false; // Valid: text + background group (e.g., "VIEW LISTING" + rectangle background)
  }
  
  // Rule 5: Check if nested group has valid structure
  if (nestedGroups.length === 1 && hasValidGroupStructure(nestedGroups[0])) {
    // Single nested group with valid structure - might be okay
    // But parent should also have reason - check if parent has other children
    if (otherChildren.length > 0) {
      return false; // Parent has other children + valid nested group - likely okay
    }
  }
  
  // Rule 6: If parent only contains 1 nested group without valid structure → illogical
  // This is the case: Group 1453 only contains Group 1427 (which only contains Vector)
  return true; // Nested groups without clear valid structure
}

// Check if elements overlap
function elementsOverlap(child1, child2) {
  if (!("x" in child1) || !("y" in child1) || !("width" in child1) || !("height" in child1)) return false;
  if (!("x" in child2) || !("y" in child2) || !("width" in child2) || !("height" in child2)) return false;
  
  const right1 = child1.x + child1.width;
  const bottom1 = child1.y + child1.height;
  const right2 = child2.x + child2.width;
  const bottom2 = child2.y + child2.height;
  
  return !(right1 <= child2.x || child1.x >= right2 || bottom1 <= child2.y || child1.y >= bottom2);
}

// Check if frame should use auto-layout based on test cases
function shouldUseAutoLayoutCheck(node) {
  if (!("children" in node) || node.children.length === 0) {
    return { required: false, message: null };
  }
  
  const children = node.children;
  const childCount = children.length;
  const nodeName = (node.name || "").toLowerCase();
  
  // If frame only has 1 child, auto-layout is not required
  if (childCount === 1) {
    return { required: false, message: null };
  }
  
  // TC-15: Decorative frame - NOT required
  if (nodeName.includes("bg") || nodeName.includes("background") || 
      nodeName.includes("overlay") || nodeName.includes("shadow") || 
      nodeName.includes("decoration")) {
    return { required: false, message: null };
  }
  
  // TC-14: Single image/illustration - NOT required
  if (childCount === 1) {
    const child = children[0];
    if ((child.type === "IMAGE" || child.type === "VECTOR") && child.type !== "TEXT") {
      return { required: false, message: null };
    }
  }
  
  // TC-13: Overlapping elements - NOT required
  let hasOverlap = false;
  for (let i = 0; i < children.length; i++) {
    for (let j = i + 1; j < children.length; j++) {
      if (elementsOverlap(children[i], children[j])) {
        hasOverlap = true;
        break;
      }
    }
    if (hasOverlap) break;
  }
  if (hasOverlap) {
    return { required: false, message: null };
  }
  
  // TC-01: Frame chứa chỉ Text
  if (childCount === 1 && children[0].type === "TEXT") {
    return { 
      required: true, 
      message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Text có thể thay đổi độ dài, nên dùng Auto Layout.` 
    };
  }
  
  // TC-02: Frame chứa Icon + Text
  if (childCount === 2) {
    const hasText = children.some(c => c.type === "TEXT");
    const hasIcon = children.some(c => 
      c.type === "VECTOR" || c.type === "COMPONENT" || c.type === "INSTANCE" ||
      (c.name && c.name.toLowerCase().includes("icon"))
    );
    
    if (hasText && hasIcon) {
      // Check if elements are aligned (X or Y close)
      const child1 = children[0];
      const child2 = children[1];
      if (("x" in child1) && ("y" in child1) && ("x" in child2) && ("y" in child2)) {
        const deltaX = Math.abs(child1.x - child2.x);
        const deltaY = Math.abs(child1.y - child2.y);
        if (deltaX < 10 || deltaY < 10) { // Close alignment
          return { 
            required: true, 
            message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Button/Label pattern (Icon + Text) nên dùng Auto Layout.` 
          };
        }
      }
    }
  }
  
  // TC-03: Multiple Text nodes xếp dọc
  if (childCount >= 2 && children.every(c => c.type === "TEXT")) {
    // Check if Y spacing is relatively even
    const yPositions = children.map(c => ("y" in c) ? c.y : 0).sort((a, b) => a - b);
    if (yPositions.length >= 2) {
      const spacings = [];
      for (let i = 1; i < yPositions.length; i++) {
        spacings.push(yPositions[i] - yPositions[i - 1]);
      }
      if (spacings.length > 0) {
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
        const isEven = spacings.every(s => Math.abs(s - avgSpacing) < 5); // Tolerance 5px
        if (isEven) {
          return { 
            required: true, 
            message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Text stack (title + description) nên dùng Auto Layout.` 
          };
        }
      }
    }
  }
  
  // TC-04: Khoảng cách giữa children gần như bằng nhau
  if (childCount >= 3) {
    // Check horizontal spacing
    const xPositions = children.map(c => ("x" in c) ? c.x : 0).sort((a, b) => a - b);
    const yPositions = children.map(c => ("y" in c) ? c.y : 0).sort((a, b) => a - b);
    
    // Check if X spacing is even (horizontal layout)
    if (xPositions.length >= 3) {
      const xSpacings = [];
      for (let i = 1; i < xPositions.length; i++) {
        xSpacings.push(xPositions[i] - xPositions[i - 1]);
      }
      if (xSpacings.length > 0) {
        const avgXSpacing = xSpacings.reduce((a, b) => a + b, 0) / xSpacings.length;
        const isEvenX = xSpacings.every(s => Math.abs(s - avgXSpacing) < 2); // Tolerance 2px
        if (isEvenX && avgXSpacing > 0) {
          return { 
            required: true, 
            message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Khoảng cách đều giữa các children, nên dùng Auto Layout.` 
          };
        }
      }
    }
    
    // Check if Y spacing is even (vertical layout)
    if (yPositions.length >= 3) {
      const ySpacings = [];
      for (let i = 1; i < yPositions.length; i++) {
        ySpacings.push(yPositions[i] - yPositions[i - 1]);
      }
      if (ySpacings.length > 0) {
        const avgYSpacing = ySpacings.reduce((a, b) => a + b, 0) / ySpacings.length;
        const isEvenY = ySpacings.every(s => Math.abs(s - avgYSpacing) < 2); // Tolerance 2px
        if (isEvenY && avgYSpacing > 0) {
          return { 
            required: true, 
            message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Khoảng cách đều giữa các children, nên dùng Auto Layout.` 
          };
        }
      }
    }
  }
  
  // TC-05: Padding rõ ràng xung quanh content
  if (childCount > 0 && "width" in node && "height" in node) {
    const minX = Math.min(...children.map(c => ("x" in c) ? c.x : 0));
    const minY = Math.min(...children.map(c => ("y" in c) ? c.y : 0));
    const maxX = Math.max(...children.map(c => ("x" in c && "width" in c) ? c.x + c.width : 0));
    const maxY = Math.max(...children.map(c => ("y" in c && "height" in c) ? c.y + c.height : 0));
    
    const paddingLeft = minX;
    const paddingTop = minY;
    const paddingRight = node.width - maxX;
    const paddingBottom = node.height - maxY;
    
    // Check if padding is consistent (within 5px tolerance)
    if (paddingLeft > 0 && paddingTop > 0 && paddingRight > 0 && paddingBottom > 0) {
      const avgPadding = (paddingLeft + paddingTop + paddingRight + paddingBottom) / 4;
      const isConsistent = Math.abs(paddingLeft - avgPadding) < 5 &&
                          Math.abs(paddingTop - avgPadding) < 5 &&
                          Math.abs(paddingRight - avgPadding) < 5 &&
                          Math.abs(paddingBottom - avgPadding) < 5;
      if (isConsistent) {
        return { 
          required: true, 
          message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Frame có padding thủ công, nên dùng Auto Layout.` 
        };
      }
    }
  }
  
  // TC-06: Component without Auto Layout
  if (node.type === "COMPONENT") {
    return { 
      required: true, 
      message: `Auto-layout chưa bật trên Component "${node.name || "Unnamed"}" — Component reusable nên dùng Auto Layout.` 
    };
  }
  
  // TC-08: Frame có resize behavior (constraints)
  if (childCount > 0) {
    const hasConstraints = children.some(c => {
      if ("constraints" in c && c.constraints) {
        const constraints = c.constraints;
        return (constraints.horizontal === "LEFT_RIGHT" || constraints.horizontal === "SCALE") ||
               (constraints.vertical === "TOP_BOTTOM" || constraints.vertical === "SCALE");
      }
      return false;
    });
    if (hasConstraints) {
      return { 
        required: true, 
        message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Frame có responsive constraints, nên dùng Auto Layout.` 
      };
    }
  }
  
  // TC-10: Các child có kích thước giống nhau (List/Grid)
  if (childCount >= 3) {
    const widths = children.map(c => ("width" in c) ? c.width : 0);
    const heights = children.map(c => ("height" in c) ? c.height : 0);
    
    if (widths.length > 0 && heights.length > 0) {
      const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
      
      const isSameSize = widths.every(w => Math.abs(w - avgWidth) < 2) &&
                        heights.every(h => Math.abs(h - avgHeight) < 2);
      
      // Check if X or Y is evenly spaced
      const xPositions = children.map(c => ("x" in c) ? c.x : 0).sort((a, b) => a - b);
      const yPositions = children.map(c => ("y" in c) ? c.y : 0).sort((a, b) => a - b);
      
      let isEvenlySpaced = false;
      if (xPositions.length >= 3) {
        const xSpacings = [];
        for (let i = 1; i < xPositions.length; i++) {
          xSpacings.push(xPositions[i] - xPositions[i - 1]);
        }
        const avgXSpacing = xSpacings.reduce((a, b) => a + b, 0) / xSpacings.length;
        isEvenlySpaced = xSpacings.every(s => Math.abs(s - avgXSpacing) < 2);
      }
      if (!isEvenlySpaced && yPositions.length >= 3) {
        const ySpacings = [];
        for (let i = 1; i < yPositions.length; i++) {
          ySpacings.push(yPositions[i] - yPositions[i - 1]);
        }
        const avgYSpacing = ySpacings.reduce((a, b) => a + b, 0) / ySpacings.length;
        isEvenlySpaced = ySpacings.every(s => Math.abs(s - avgYSpacing) < 2);
      }
      
      if (isSameSize && isEvenlySpaced) {
        return { 
          required: true, 
          message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — List/Grid pattern (children cùng size), nên dùng Auto Layout.` 
        };
      }
    }
  }
  
  // TC-12: Node name match UI keywords
  const uiKeywords = /button|badge|tag|chip|pill|input|field|navbar|menu|list/i;
  if (uiKeywords.test(nodeName)) {
    return { 
      required: true, 
      message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — Standard UI pattern nên dùng Auto Layout.` 
    };
  }
  
  // Default: require auto-layout for frames/components
  return { 
    required: true, 
    message: `Auto-layout chưa bật trên ${node.type} "${node.name || "Unnamed"}" — yêu cầu 100% Auto-layout.` 
  };
}

// Check if frame has visual content (background, effects, etc.)
function hasVisualContent(node) {
  // Check fills (background color, gradient, image)
  if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
    for (const fill of node.fills) {
      if (fill.visible !== false) {
        if (fill.type === "SOLID" || fill.type === "GRADIENT_LINEAR" || 
            fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || 
            fill.type === "GRADIENT_DIAMOND" || fill.type === "IMAGE") {
          return true; // Has background
        }
      }
    }
  }
  
  // Check effects (shadows, blurs, etc.)
  if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
    for (const effect of node.effects) {
      if (effect.visible !== false) {
        if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW" || 
            effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
          return true; // Has effects
        }
      }
    }
  }
  
  // Check strokes (borders)
  if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    for (const stroke of node.strokes) {
      if (stroke.visible !== false) {
        return true; // Has border
      }
    }
  }
  
  return false;
}

// Check if frame is empty or redundant
function isEmptyOrRedundant(node) {
  if (node.type !== "FRAME" && node.type !== "COMPONENT") return false;
  if (!("children" in node)) return false;
  
  // Check if frame has visual content (background, effects, shadows)
  // If it has visual content, it's not empty even if no children
  if (hasVisualContent(node)) {
    return null; // Not empty - has visual content
  }
  
  // Empty frame (no children AND no visual content)
  if (node.children.length === 0) {
    return { type: "empty", message: "Frame trống — nên xóa hoặc thêm nội dung." };
  }
  
  // Frame with only one child (might be redundant)
  if (node.children.length === 1 && node.layoutMode === "NONE") {
    const child = node.children[0];
    // If child is same size as parent, might be redundant
    if (Math.abs((child.width || 0) - (node.width || 0)) < 1 && 
        Math.abs((child.height || 0) - (node.height || 0)) < 1) {
      
      // Check if frame has valid reasons to exist (not redundant)
      
      // Reason 1: Frame has visual content (background, effects, shadows)
      if (hasVisualContent(node)) {
        return null; // Not redundant - has visual content
      }
      
      // Reason 2: Frame has padding/spacing
      const hasPadding = (node.paddingLeft && node.paddingLeft > 0) ||
                        (node.paddingRight && node.paddingRight > 0) ||
                        (node.paddingTop && node.paddingTop > 0) ||
                        (node.paddingBottom && node.paddingBottom > 0);
      if (hasPadding) {
        return null; // Not redundant - has padding
      }
      
      // Reason 3: Child is positioned differently (not at 0,0)
      if (child.x !== 0 || child.y !== 0) {
        return null; // Not redundant - child has positioning
      }
      
      // Reason 4: Frame is a component or instance (needed for reusability)
      if (node.type === "COMPONENT" || node.type === "INSTANCE") {
        return null; // Not redundant - component/instance needs wrapper
      }
      
      // Reason 5: Child is a vector/icon and frame might be needed for organization
      // But if frame has no visual content and no padding, it's likely redundant
      // We'll still flag it as potentially redundant
      
      return { 
        type: "redundant", 
        message: `Frame chỉ chứa 1 child có kích thước giống hệt — có thể là frame dư thừa.` 
      };
    }
  }
  
  return null;
}

// Compute issues scanning a selection or whole page
async function scan(target, customSpacingScale = null, spacingThreshold = 100, customFontSizeScale = null, fontSizeThreshold = 100, customLineHeightScale = null, lineHeightThreshold = 300, lineHeightBaselineThreshold = 120) {
  const nodesToScan = [];
  if (target === "selection") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("Không có selection — quét toàn bộ page.");
      traverse(figma.currentPage, n => nodesToScan.push(n));
    } else {
      for (const n of figma.currentPage.selection) traverse(n, nd => nodesToScan.push(nd));
    }
  } else {
    traverse(figma.currentPage, n => nodesToScan.push(n));
  }

  const issues = [];
  const hashMap = new Map(); // For duplicate detection and usage counting
  const groupNodes = []; // Track groups for nested check
  const componentIssues = []; // Store component issues temporarily to update with usage count later
  const reportedHashes = new Set(); // Track which hashes have already been reported to avoid duplicates
  const contrastGroups = new Map(); // Group similar contrast issues together
  const issueGroups = new Map(); // Group similar issues together (for all types except contrast)
  
  // Helper function to add issue (with grouping for non-contrast issues)
  function addIssue(issue) {
    // Contrast issues are handled separately
    if (issue.type === "contrast") {
      const contrastKey = `${issue.contrast.toFixed(2)}|${issue.textColor}|${issue.backgroundColor}|${issue.backgroundColorNode}`;
      if (!contrastGroups.has(contrastKey)) {
        contrastGroups.set(contrastKey, []);
      }
      contrastGroups.get(contrastKey).push(issue);
      return;
    }
    
    // For other issues, group by type + severity + normalized message + full path
    // Normalize message by removing node-specific parts to ensure same messages group together
    let normalizedMessage = issue.message || "";
    // Remove node name from message if present (for grouping purposes)
    const nodeNameInMessage = issue.nodeName ? issue.nodeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "";
    if (nodeNameInMessage) {
      // Try to remove node name from message (handle both "name" and 'name' formats)
      normalizedMessage = normalizedMessage.replace(new RegExp(`"${nodeNameInMessage}"`, 'g'), '');
      normalizedMessage = normalizedMessage.replace(new RegExp(`'${nodeNameInMessage}'`, 'g'), '');
      normalizedMessage = normalizedMessage.replace(new RegExp(nodeNameInMessage, 'g'), '');
      normalizedMessage = normalizedMessage.trim();
    }
    
    // Get full path of node for more accurate grouping
    let fullPath = issue.nodeName || "";
    try {
      const nodeForPath = figma.getNodeById(issue.id);
      if (nodeForPath) {
        fullPath = getNodeFullPath(nodeForPath);
      }
    } catch (e) {
      // Node not found, use nodeName as fallback
    }
    
    // Group by type + severity + message + nodeName (not full path)
    // Use original message to ensure exact matches are grouped together
    // Group by nodeName so nodes with same name and same message are grouped
    // even if they are at different locations in hierarchy
    const groupKey = `${issue.type}|${issue.severity}|${issue.message}|${issue.nodeName || ""}`;
    if (!issueGroups.has(groupKey)) {
      issueGroups.set(groupKey, []);
    }
    issueGroups.get(groupKey).push(issue);
  }

  // First pass: Track all frames in hashMap for usage counting
  for (const node of nodesToScan) {
    try {
      if ("visible" in node && node.visible === false) {
        continue;
      }
      if ((node.type === "FRAME" || node.type === "COMPONENT")) {
        const h = nodeHash(node);
        if (h) {
          if (!hashMap.has(h)) hashMap.set(h, []);
          hashMap.get(h).push(node);
        }
      }
    } catch (e) {
      // Skip errors in first pass
    }
  }

  // Second pass: Check all rules and create issues
  for (const node of nodesToScan) {
    try {
      // Skip hidden nodes (double check in case traverse didn't catch it)
      if ("visible" in node && node.visible === false) {
        continue;
      }
      
      const nodeName = node.name || "Unnamed";
      
      // 1) Frame Naming semantic
      if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
        // Only warn if name contains "Frame" or "Group" (default Figma naming)
        const hasDefaultNaming = /frame|group/i.test(nodeName);
        
        if (hasDefaultNaming) {
        addIssue({
          severity: "warn",
          type: "naming",
            message: `Naming không theo convention: "${nodeName}". Nên đặt tên có ý nghĩa thay vì dùng tên mặc định.`,
            id: node.id,
            nodeName: nodeName
          });
        }
        // All other names pass (no warning)
      }
      
      // Text naming
      if (node.type === "TEXT") {
        // Allow "content" or "Content" as valid naming
        const isContent = nodeName.toLowerCase() === "content";
        
        // Allow if name is actual text content (long text with multiple words)
        // Check if name matches the text content or is a long descriptive text
        const isActualTextContent = nodeName.length > 20 && nodeName.split(/\s+/).length >= 3;
        
        // Check if name matches the text node's characters (actual content)
        const matchesTextContent = node.characters && 
                                   node.characters.trim() === nodeName.trim();
        
        // Allow short button/link text (1-3 words, uppercase or mixed case)
        // Common patterns: "VIEW ALL", "LEARN MORE", "Read More", etc.
        const wordCount = nodeName.split(/\s+/).length;
        const isShortButtonText = wordCount >= 1 && wordCount <= 3 && nodeName.length <= 50;
        
        if (!isContent && !isActualTextContent && !matchesTextContent && !isShortButtonText && !RULES.namingPatterns.text.test(nodeName)) {
          addIssue({
            severity: "warn",
            type: "naming",
            message: `Text naming không theo convention: "${nodeName}". Nên dùng: Title/Desc/Label/Caption/Heading/Body/Content...`,
            id: node.id,
            nodeName: nodeName
          });
        }
      }

      // 2) Groups - disallow and check nested
      if (node.type === "GROUP") {
        groupNodes.push(node);
        
        if (RULES.disallowGroups) {
          // Skip groups with only 1 child - no need for Auto-layout with single child
          if ("children" in node && node.children.length > 1) {
            addIssue({
              severity: "error",
              type: "group",
              message: `Group detected — nên dùng Frame + Auto-layout thay thế.`,
              id: node.id,
              nodeName: nodeName
            });
          }
        }
        
        if (RULES.disallowNestedGroups && hasNestedGroups(node)) {
          addIssue({
            severity: "error",
            type: "nested-group",
            message: `Group lồng nhau phát hiện — cấu trúc không hợp lý.`,
            id: node.id,
            nodeName: nodeName
          });
        }
      }

      // 3) Auto-layout check for frames/components (with test cases)
      if (RULES.checkAutoLayout && (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE")) {
        if (node.layoutMode === "NONE") {
          // Check if auto-layout is needed based on test cases
          const shouldUseAutoLayout = shouldUseAutoLayoutCheck(node);
          
          if (shouldUseAutoLayout.required) {
          addIssue({
              severity: "error",
            type: "autolayout",
              message: shouldUseAutoLayout.message || `Auto-layout chưa bật trên ${node.type} "${nodeName}" — yêu cầu 100% Auto-layout.`,
              id: node.id,
              nodeName: nodeName
          });
          }
        } else {
          // Auto-layout is enabled - no need to check preferred layout mode
          // User can use HORIZONTAL or VERTICAL as needed
          
          // Check itemSpacing (gap) - only if spacing scale is provided
          if (customSpacingScale !== null) {
          if (typeof node.itemSpacing === "number") {
              // If value exceeds threshold, pass (special case)
              if (node.itemSpacing > spacingThreshold) {
                // Pass - value is above threshold (special case)
              } else if (!isInScale(node.itemSpacing, customSpacingScale)) {
              addIssue({
                severity: "warn",
                type: "spacing",
                  message: `Gap (itemSpacing: ${node.itemSpacing}px) không theo scale trên "${nodeName}". Scale: ${customSpacingScale.join(", ")}`,
                  id: node.id,
                  nodeName: nodeName
              });
            }
          }
          } else {
            // If spacing scale is empty, show skipped message
            if (typeof node.itemSpacing === "number") {
              addIssue({
                severity: "info",
                type: "spacing",
                message: `Gap (itemSpacing: ${node.itemSpacing}px) - Check spacing đã bị bỏ qua (spacing scale trống).`,
                id: node.id,
                nodeName: nodeName
              });
            }
          }
          
          // Check padding - only if spacing scale is provided
          const paddings = [
            { name: "paddingLeft", value: node.paddingLeft },
            { name: "paddingRight", value: node.paddingRight },
            { name: "paddingTop", value: node.paddingTop },
            { name: "paddingBottom", value: node.paddingBottom }
          ];
          
          if (customSpacingScale !== null) {
            for (const pad of paddings) {
              if (typeof pad.value === "number" && pad.value !== 0) {
                // If value exceeds threshold, pass (special case)
                if (pad.value > spacingThreshold) {
                  // Pass - value is above threshold (special case)
                  continue;
                } else if (!isInScale(pad.value, customSpacingScale)) {
                addIssue({
                  severity: "warn",
                  type: "spacing",
                    message: `Padding ${pad.name} (${pad.value}px) không theo scale trên "${nodeName}". Scale: ${customSpacingScale.join(", ")}`,
                    id: node.id,
                    nodeName: nodeName
                });
                break;
              }
              }
            }
          } else {
            // If spacing scale is empty, show skipped message for padding
            const hasPadding = paddings.some(p => typeof p.value === "number" && p.value !== 0);
            if (hasPadding) {
              addIssue({
                severity: "info",
                type: "spacing",
                message: `Padding - Check spacing đã bị bỏ qua (spacing scale trống).`,
                id: node.id,
                nodeName: nodeName
              });
            }
          }
        }
      }

      // 4) Empty/Redundant frames
      if (RULES.checkEmptyFrames) {
        const emptyCheck = isEmptyOrRedundant(node);
        if (emptyCheck) {
          addIssue({
            severity: emptyCheck.type === "empty" ? "error" : "warn",
            type: "empty-frame",
            message: emptyCheck.message,
            id: node.id,
            nodeName: nodeName
          });
        }
      }

      // 5) Text nodes: typography / style usage
      if (node.type === "TEXT") {
        const fs = node.fontSize;
        // Check if fontSize is a valid number (not figma.mixed or symbol)
        if (fs && typeof fs === "number" && !isNaN(fs)) {
          // Check if font-size exceeds threshold (special case)
          if (fs > fontSizeThreshold) {
            // Pass - value is above threshold (special case)
          } else if (customFontSizeScale !== null) {
            // Check against custom font-size scale
            if (!customFontSizeScale.includes(Math.round(fs))) {
          addIssue({
            severity: "warn",
            type: "typography",
                message: `fontSize ${fs}px không theo scale trên text "${node.characters.slice(0, 30)}". Scale: ${customFontSizeScale.join(", ")}`,
                id: node.id,
                nodeName: nodeName
          });
            }
          } else if (!isValidTypographySize(fs)) {
            // Check against default scale
            addIssue({
              severity: "warn",
              type: "typography",
              message: `fontSize ${fs}px không theo scale trên text "${node.characters.slice(0, 30)}". Scale: ${RULES.allTypographySizes.join(", ")}`,
              id: node.id,
              nodeName: nodeName
            });
          }
        }
        
        // Text style key check
        if (RULES.requireTextStyleKey) {
          const styleId = node.textStyleId;
          if (!styleId || styleId === figma.mixed) {
            addIssue({
              severity: "warn",
              type: "typography-style",
              message: `Text không dùng Text Style (key) — khó quản lý và không đồng bộ. Nên tạo và dùng Text Style.`,
              id: node.id,
              nodeName: nodeName
            });
          }
        } else if (RULES.allowedTextStyleIds.length > 0) {
          const styleId = node.textStyleId;
          if (!styleId || !RULES.allowedTextStyleIds.includes(styleId)) {
            addIssue({
              severity: "warn",
              type: "typography-style",
              message: `Text không dùng Text Style chuẩn.`,
              id: node.id,
              nodeName: nodeName
            });
          }
        }
        
        // Line height check
        if (RULES.disallowLineHeightAuto || RULES.disallowLineHeightBaseline || customLineHeightScale !== null) {
          const lineHeightIssue = checkLineHeight(node, customLineHeightScale, lineHeightThreshold, lineHeightBaselineThreshold);
          if (lineHeightIssue) {
            addIssue(lineHeightIssue);
          }
        }
        
        // Text contrast check
        if (RULES.checkTextContrast) {
          const contrastIssue = checkTextContrast(node);
          if (contrastIssue) {
            // Group similar contrast issues: same ratio, text color, background color, and background node name
            const contrastKey = `${contrastIssue.contrast.toFixed(2)}|${contrastIssue.textColor}|${contrastIssue.backgroundColor}|${contrastIssue.backgroundColorNode}`;
            if (!contrastGroups.has(contrastKey)) {
              contrastGroups.set(contrastKey, []);
            }
            contrastGroups.get(contrastKey).push(contrastIssue);
          }
        }
      }

      // 6) Component check (only for FRAME, not GROUP)
      // Note: GROUP cannot be converted to Component in Figma, only FRAME can
      // Only warn if frame is used 2+ times (needs reuse) or matches component pattern
      if (RULES.requireComponentization && (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE")) {
        if (shouldBeComponent(node)) {
          const nodeTypeLabel = node.type === "FRAME" ? "Frame" : node.type;
          // Get usage count from hashMap (already populated in first pass)
          const h = nodeHash(node);
          const usageCount = h && hashMap.has(h) ? hashMap.get(h).length : 1;
          
          // Only warn if used 2+ times (needs componentization for reuse)
          // If only used once, no need to componentize
          // Only report once per unique hash to avoid duplicate warnings
          if (usageCount > 1 && h && !reportedHashes.has(h)) {
            reportedHashes.add(h); // Mark as reported
            const usageText = ` (đang dùng ${usageCount} lần)`;
          addIssue({
            severity: "warn",
              type: "component",
              message: `${nodeTypeLabel} "${nodeName}" nên được component hóa để tái sử dụng${usageText}.`,
              id: node.id, // Use first node's ID for selection
              nodeName: nodeName
          });
          }
        }
      }

      // 7) Negative/offscreen offsets
      if (RULES.checkNegativePosition && "x" in node && "y" in node && node.parent && node.parent.type !== "PAGE") {
        // Only warn if position is actually negative (not 0 or positive)
        // Use a small threshold to avoid floating point precision issues
        const threshold = -0.5; // Only flag if significantly negative
        if (node.x < threshold || node.y < threshold) {
          addIssue({
            severity: "warn",
            type: "position",
            message: `Child có vị trí âm (x:${Math.round(node.x)}, y:${Math.round(node.y)}) trong "${node.parent.name}". Kiểm tra margin/absolute positioning.`,
            id: node.id,
            nodeName: nodeName
          });
        }
      }

      // 8) Duplicate frames detection
      // Note: hashMap already populated in first pass, this section just creates issues for duplicates
    } catch (e) {
      console.error("Scan node error", e);
    }
  } // for nodes

  // Add grouped issues (only once per unique combination)
  if (issueGroups.size > 0) {
    for (const [key, group] of issueGroups.entries()) {
      if (group.length > 0) {
        const firstIssue = group[0];
        const count = group.length;
        
        // Update message to include count if multiple nodes affected
        let message = firstIssue.message;
        if (count > 1) {
          // For most issues, just add count at the end
          // Remove node-specific info if present and add count
          if (message.includes(`"${firstIssue.nodeName}"`)) {
            message = message.replace(`"${firstIssue.nodeName}"`, `(${count} nodes)`);
          } else if (message.includes(`'${firstIssue.nodeName}'`)) {
            message = message.replace(`'${firstIssue.nodeName}'`, `(${count} nodes)`);
          } else {
            message = `${message} (${count} nodes)`;
          }
        }
        
        // Create grouped issue
        issues.push({
          severity: firstIssue.severity,
          type: firstIssue.type,
          message: message,
          id: firstIssue.id, // Use first node's ID for selection
          nodeName: firstIssue.nodeName,
          affectedCount: count
        });
      }
    }
  }

  // Add grouped contrast issues (only once per unique combination)
  if (contrastGroups.size > 0) {
    for (const [key, group] of contrastGroups.entries()) {
      if (group.length > 0) {
        // Use first issue as template, but update message to show count
        const firstIssue = group[0];
        const count = group.length;
        
        // Rebuild message with count if multiple nodes affected
        let message = firstIssue.message;
        if (count > 1) {
          // Extract base message without specific text
          const contrastRatio = firstIssue.contrast.toFixed(2);
          const isLargeText = firstIssue.isLargeText !== undefined ? firstIssue.isLargeText : (firstIssue.fontSize >= 18);
          const minContrast = firstIssue.minContrast !== undefined ? firstIssue.minContrast : (isLargeText ? RULES.contrastAALarge : RULES.contrastAA);
          
          if (firstIssue.isGradient) {
            message = `Text contrast ratio ${contrastRatio}:1 không đạt WCAG ${isLargeText ? "AA (large text)" : "AA"} (cần >= ${minContrast}:1) với gradient background (${count} text nodes). Cần check manual vì gradient có thể có vị trí pass.`;
          } else if (Math.abs(firstIssue.contrast - 1.0) < 0.01) {
            message = `Text contrast ratio ${contrastRatio}:1 - Có thể không lấy được background color đúng (có thể là layer cùng cấp nằm dưới text) (${count} text nodes). Cần check manual.`;
          } else {
            message = `Text contrast ratio ${contrastRatio}:1 không đạt WCAG ${isLargeText ? "AA (large text)" : "AA"} (cần >= ${minContrast}:1) (${count} text nodes).`;
          }
        }
        
        // Create grouped contrast issue
        issues.push({
          severity: firstIssue.severity,
          type: "contrast",
          message: message,
          id: firstIssue.id, // Use first node's ID for selection
          nodeName: firstIssue.nodeName,
          contrast: firstIssue.contrast,
          fontSize: firstIssue.fontSize,
          isLargeText: firstIssue.isLargeText,
          minContrast: firstIssue.minContrast,
          textColor: firstIssue.textColor,
          textColorNode: firstIssue.textColorNode,
          backgroundColor: firstIssue.backgroundColor,
          backgroundColorNode: firstIssue.backgroundColorNode,
          isGradient: firstIssue.isGradient,
          gradientType: firstIssue.gradientType,
          gradientString: firstIssue.gradientString,
          fromSibling: firstIssue.fromSibling,
          affectedCount: count // Add count for reference
        });
      }
    }
  }

  // Add duplicates as issues (only once per unique hash)
  // Skip if nodes are children of Component/Instance (parent manages them)
  // Also skip if already reported by component check (to avoid duplicate warnings)
  if (RULES.checkDuplicateFrames) {
    for (const [h, arr] of hashMap.entries()) {
      if (arr.length > 1 && !reportedHashes.has(h)) {
        // Filter out nodes that are children of Component/Instance
        const nodesToReport = arr.filter(n => !isChildOfComponent(n));
        
        // Only report if there are 2+ nodes that are NOT children of components
        // Also check if this would be reported by component check - if so, skip duplicate check
        // (component check already handles this case with better message)
        if (nodesToReport.length > 1) {
          // Check if any node would trigger component check
          const wouldTriggerComponentCheck = nodesToReport.some(n => 
            RULES.requireComponentization && 
            (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE") &&
            shouldBeComponent(n)
          );
          
          // If component check would handle this, skip duplicate check to avoid redundancy
          if (!wouldTriggerComponentCheck) {
            // Only report once per unique duplicate group
            reportedHashes.add(h); // Mark as reported
            const firstNode = nodesToReport[0];
        issues.push({
          severity: "warn",
          type: "duplicate",
              message: `Possible duplicate ${firstNode.type.toLowerCase()} "${firstNode.name || "Unnamed"}" (${nodesToReport.length} copies) — nên component hóa.`,
              id: firstNode.id, // Use first node's ID for selection
              nodeName: firstNode.name || "Unnamed"
        });
          }
        }
      }
    }
  }

  return issues;
}

// Convert color to hex/rgb string
function colorToString(color, fillOpacity = 1) {
  if (!color) return null;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  // Combine color alpha with fill opacity
  const alpha = (color.a !== undefined ? color.a : 1) * fillOpacity;
  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Convert gradient to string with full details
function gradientToString(gradient) {
  if (!gradient || gradient.type === "SOLID") return null;
  if (gradient.type === "GRADIENT_LINEAR" || gradient.type === "GRADIENT_RADIAL" || gradient.type === "GRADIENT_ANGULAR" || gradient.type === "GRADIENT_DIAMOND") {
    const stops = gradient.gradientStops.map(stop => {
      const color = colorToString(stop.color);
      // Use exact position with 2 decimal places
      const position = (stop.position * 100).toFixed(2);
      return `${color} ${position}%`;
    }).join(", ");
    
    const gradientType = gradient.type.replace("GRADIENT_", "").toLowerCase();
    let gradientStr = `${gradientType}-gradient(`;
    
    // For radial gradients, add size and position if available
    if (gradient.type === "GRADIENT_RADIAL") {
      // Try gradientHandlePositions first (more accurate)
      if (gradient.gradientHandlePositions && gradient.gradientHandlePositions.length >= 3) {
        const handles = gradient.gradientHandlePositions;
        const center = handles[0];
        const endPoint = handles[1];
        const widthPoint = handles[2];
        
        // Calculate size (distance from center to end points)
        const dx1 = endPoint.x - center.x;
        const dy1 = endPoint.y - center.y;
        const dx2 = widthPoint.x - center.x;
        const dy2 = widthPoint.y - center.y;
        
        // Size as percentage (multiply by 100 to get percentage)
        const sizeX = (Math.sqrt(dx2 * dx2 + dy2 * dy2) * 100).toFixed(2);
        const sizeY = (Math.sqrt(dx1 * dx1 + dy1 * dy1) * 100).toFixed(2);
        
        // Position (center point in percentage, relative to object bounds)
        const posX = (center.x * 100).toFixed(2);
        const posY = (center.y * 100).toFixed(2);
        
        gradientStr += `${sizeX}% ${sizeY}% at ${posX}% ${posY}%, `;
      } else if (gradient.gradientTransform) {
        // Fallback to gradientTransform if gradientHandlePositions not available
        const transform = gradient.gradientTransform;
        if (transform && transform.length >= 2) {
          // Calculate size from transform
          const scaleX = Math.sqrt(transform[0][0] * transform[0][0] + transform[0][1] * transform[0][1]);
          const scaleY = Math.sqrt(transform[1][0] * transform[1][0] + transform[1][1] * transform[1][1]);
          const sizeX = (scaleX * 100).toFixed(2);
          const sizeY = (scaleY * 100).toFixed(2);
          
          // Calculate position from transform
          const posX = (transform[0][2] * 100).toFixed(2);
          const posY = (transform[1][2] * 100).toFixed(2);
          
          gradientStr += `${sizeX}% ${sizeY}% at ${posX}% ${posY}%, `;
        }
      }
    } else if (gradient.type === "GRADIENT_LINEAR" && gradient.gradientHandlePositions && gradient.gradientHandlePositions.length >= 2) {
      // For linear gradients, we can show angle/direction if needed
      // But for now, just show stops
    }
    
    gradientStr += stops + ")";
    return gradientStr;
  }
  return null;
}

// Convert line-height to percentage
function lineHeightToPercent(node) {
  if (!node.lineHeight) return null;
  if (node.lineHeight.unit === "AUTO") return "auto";
  if (node.lineHeight.unit === "PERCENT") {
    return `${Math.round(node.lineHeight.value)}%`;
  }
  if (node.lineHeight.unit === "PIXELS" && node.fontSize && typeof node.fontSize === "number" && !isNaN(node.fontSize)) {
    const percent = (node.lineHeight.value / node.fontSize) * 100;
    return `${Math.round(percent)}%`;
  }
  return null;
}

// Extract design tokens from nodes
async function extractDesignTokens(target) {
  const nodesToScan = [];
  if (target === "selection") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("Không có selection — quét toàn bộ page.");
      traverse(figma.currentPage, n => nodesToScan.push(n));
    } else {
      for (const n of figma.currentPage.selection) traverse(n, nd => nodesToScan.push(nd));
    }
  } else {
    traverse(figma.currentPage, n => nodesToScan.push(n));
  }

  const tokens = {
    colors: new Map(), // value -> {value, nodes: [{id, name}]}
    gradients: new Map(),
    borderRadius: new Map(),
    fontWeight: new Map(),
    lineHeight: new Map(),
    fontSize: new Map(),
    fontFamily: new Map()
  };

  function addToken(map, value, nodeId, nodeName, colorType = null) {
    const key = String(value);
    if (!map.has(key)) {
      map.set(key, { value, nodes: [], colorType: colorType || null });
    }
    // Only add if not already in nodes array
    const existing = map.get(key);
    if (!existing.nodes.some(n => n.id === nodeId)) {
      existing.nodes.push({ id: nodeId, name: nodeName || "Unnamed" });
    }
    // Update colorType if provided and not already set
    if (colorType && !existing.colorType) {
      existing.colorType = colorType;
    } else if (colorType && existing.colorType && existing.colorType !== colorType) {
      // If different colorType, combine them
      if (!existing.colorType.includes(colorType)) {
        existing.colorType = `${existing.colorType}, ${colorType}`;
      }
    }
  }

  for (const node of nodesToScan) {
    try {
      // Skip hidden nodes (double check in case traverse didn't catch it)
      if ("visible" in node && node.visible === false) {
        continue;
      }
      
      const nodeId = node.id;
      const nodeName = node.name || "Unnamed";

      // Colors (fills) - distinguish by node type and usage
      if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
        let colorType = "background";
        if (node.type === "TEXT") {
          colorType = "text";
        } else if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP") {
          colorType = "background";
        } else {
          colorType = "fill";
        }
        
        for (const fill of node.fills) {
          if (fill.type === "SOLID") {
            const color = colorToString(fill.color);
            if (color) addToken(tokens.colors, color, nodeId, nodeName, colorType);
          } else if (fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL" || fill.type === "GRADIENT_ANGULAR" || fill.type === "GRADIENT_DIAMOND") {
            const gradient = gradientToString(fill);
            if (gradient) addToken(tokens.gradients, gradient, nodeId, nodeName, colorType);
          }
        }
      }

      // Border colors (strokes)
      if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
        for (const stroke of node.strokes) {
          if (stroke.type === "SOLID") {
            const color = colorToString(stroke.color);
            if (color) addToken(tokens.colors, color, nodeId, nodeName, "border");
          }
        }
      }

      // Shadow/Effect colors
      if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
        for (const effect of node.effects) {
          if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
            const color = colorToString(effect.color);
            if (color) addToken(tokens.colors, color, nodeId, nodeName, "shadow");
          }
        }
      }

      // Border radius
      if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
        const radius = Math.round(node.cornerRadius);
        addToken(tokens.borderRadius, radius, nodeId, nodeName);
      }
      if ("topLeftRadius" in node && typeof node.topLeftRadius === "number") {
        const radius = Math.round(node.topLeftRadius);
        addToken(tokens.borderRadius, radius, nodeId, nodeName);
      }
      if ("topRightRadius" in node && typeof node.topRightRadius === "number") {
        const radius = Math.round(node.topRightRadius);
        addToken(tokens.borderRadius, radius, nodeId, nodeName);
      }
      if ("bottomLeftRadius" in node && typeof node.bottomLeftRadius === "number") {
        const radius = Math.round(node.bottomLeftRadius);
        addToken(tokens.borderRadius, radius, nodeId, nodeName);
      }
      if ("bottomRightRadius" in node && typeof node.bottomRightRadius === "number") {
        const radius = Math.round(node.bottomRightRadius);
        addToken(tokens.borderRadius, radius, nodeId, nodeName);
      }

      // Typography (TEXT nodes)
      if (node.type === "TEXT") {
        // Font size
        if (node.fontSize && typeof node.fontSize === "number") {
          const size = Math.round(node.fontSize);
          addToken(tokens.fontSize, size, nodeId, nodeName);
        }

        // Font family
        if (node.fontName && typeof node.fontName === "object") {
          const family = node.fontName.family || "";
          const style = node.fontName.style || "";
          if (family) {
            const familyStr = style ? `${family} (${style})` : family;
            addToken(tokens.fontFamily, familyStr, nodeId, nodeName);
          }
        }

        // Font weight
        if (node.fontName && typeof node.fontName === "object") {
          const style = node.fontName.style || "";
          // Extract weight from style (e.g., "Bold", "Regular", "Medium")
          if (style) {
            addToken(tokens.fontWeight, style, nodeId, nodeName);
          }
        }

        // Line height (convert to %)
        const lh = lineHeightToPercent(node);
        if (lh) addToken(tokens.lineHeight, lh, nodeId, nodeName);
      }
    } catch (e) {
      console.error("Extract token error", e);
    }
  }

  // Convert Maps to sorted arrays with node info
  function mapToArray(map, sortFn) {
    return Array.from(map.values())
      .sort((a, b) => {
        if (sortFn) return sortFn(a.value, b.value);
        if (typeof a.value === "number" && typeof b.value === "number") {
          return b.value - a.value; // Descending for numbers
        }
        return String(a.value).localeCompare(String(b.value));
      });
  }

  return {
    colors: mapToArray(tokens.colors),
    gradients: mapToArray(tokens.gradients),
    borderRadius: mapToArray(tokens.borderRadius, (a, b) => a - b),
    fontWeight: mapToArray(tokens.fontWeight),
    lineHeight: mapToArray(tokens.lineHeight),
    fontSize: mapToArray(tokens.fontSize, (a, b) => b - a), // Descending
    fontFamily: mapToArray(tokens.fontFamily)
  };
}

// Listen for UI commands
figma.ui.onmessage = async msg => {
  if (msg.type === "scan") {
    const mode = msg.mode || "page";
    const spacingScaleInput = msg.spacingScale || "";
    const spacingThreshold = msg.spacingThreshold || 100;
    const fontSizeScaleInput = msg.fontSizeScale || "";
    const fontSizeThreshold = msg.fontSizeThreshold || 100;
    const lineHeightScaleInput = msg.lineHeightScale || "";
    const lineHeightThreshold = msg.lineHeightThreshold || 300;
    const lineHeightBaselineThreshold = msg.lineHeightBaselineThreshold || 120;
    
    // Parse spacing scale from input
    let customSpacingScale = null;
    if (spacingScaleInput.trim()) {
      try {
        // Parse comma-separated values
        const values = spacingScaleInput.split(",").map(v => {
          const num = parseInt(v.trim(), 10);
          return isNaN(num) ? null : num;
        }).filter(v => v !== null);
        
        if (values.length > 0) {
          customSpacingScale = values;
        }
      } catch (e) {
        console.error("Error parsing spacing scale:", e);
      }
    }
    
    // Parse font-size scale from input
    let customFontSizeScale = null;
    if (fontSizeScaleInput.trim()) {
      try {
        // Parse comma-separated values
        const values = fontSizeScaleInput.split(",").map(v => {
          const num = parseInt(v.trim(), 10);
          return isNaN(num) ? null : num;
        }).filter(v => v !== null);
        
        if (values.length > 0) {
          customFontSizeScale = values;
        }
      } catch (e) {
        console.error("Error parsing font-size scale:", e);
      }
    }
    
    // Parse line-height scale from input (allow "auto" keyword)
    let customLineHeightScale = null;
    let allowAuto = false;
    if (lineHeightScaleInput.trim()) {
      try {
        // Check if "auto" is in the scale
        const lowerInput = lineHeightScaleInput.toLowerCase();
        allowAuto = lowerInput.includes("auto");
        
        // Parse comma-separated values (numbers only)
        const values = lineHeightScaleInput.split(",").map(v => {
          const trimmed = v.trim().toLowerCase();
          if (trimmed === "auto") {
            return null; // Skip "auto", we'll handle it separately
          }
          const num = parseInt(trimmed, 10);
          return isNaN(num) ? null : num;
        }).filter(v => v !== null);
        
        if (values.length > 0 || allowAuto) {
          customLineHeightScale = {
            values: values,
            allowAuto: allowAuto
          };
        }
      } catch (e) {
        console.error("Error parsing line-height scale:", e);
      }
    }
    
    try {
      const issues = await scan(mode, customSpacingScale, spacingThreshold, customFontSizeScale, fontSizeThreshold, customLineHeightScale, lineHeightThreshold, lineHeightBaselineThreshold);
    figma.ui.postMessage({ type: "report", issues });
    } catch (error) {
      figma.notify(`Lỗi khi quét: ${error.message}`);
      figma.ui.postMessage({ type: "report", issues: [], error: error.message });
    }
  }
  if (msg.type === "extract-tokens") {
    const mode = msg.mode || "page";
    try {
      const tokens = await extractDesignTokens(mode);
      figma.ui.postMessage({ type: "tokens-report", tokens });
    } catch (error) {
      figma.notify(`Lỗi khi extract tokens: ${error.message}`);
      figma.ui.postMessage({ type: "tokens-report", tokens: null, error: error.message });
    }
  }
  if (msg.type === "select-node") {
    const id = msg.id;
    const node = figma.getNodeById(id);
    if (node) {
      // Select the node first
      figma.currentPage.selection = [node];
      
      // Calculate bounds with padding to center the node
      const padding = 200; // Padding in pixels
      
      // Get node bounds
      let bounds;
      if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
        bounds = node.absoluteBoundingBox;
      } else if ("x" in node && "y" in node && "width" in node && "height" in node) {
        // Calculate absolute position if needed
        let x = node.x;
        let y = node.y;
        let parent = node.parent;
        while (parent && "x" in parent && "y" in parent && parent.type !== "PAGE") {
          x += parent.x;
          y += parent.y;
          parent = parent.parent;
        }
        bounds = {
          x: x,
          y: y,
          width: node.width,
          height: node.height
        };
      } else {
        // Fallback to scrollAndZoomIntoView
      figma.viewport.scrollAndZoomIntoView([node]);
        figma.notify("Đã chọn node");
        return;
      }
      
      // Expand bounds with padding
      const expandedBounds = {
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + (padding * 2),
        height: bounds.height + (padding * 2)
      };
      
      // Calculate center point
      const centerX = expandedBounds.x + (expandedBounds.width / 2);
      const centerY = expandedBounds.y + (expandedBounds.height / 2);
      
      // Get viewport size
      const viewportWidth = figma.viewport.bounds.width;
      const viewportHeight = figma.viewport.bounds.height;
      
      // Calculate zoom level to fit the expanded bounds in viewport
      const zoomX = viewportWidth / expandedBounds.width;
      const zoomY = viewportHeight / expandedBounds.height;
      const zoom = Math.min(zoomX, zoomY, 2); // Cap zoom at 2x for very small elements
      
      // Set viewport center and zoom
      figma.viewport.center = { x: centerX, y: centerY };
      figma.viewport.zoom = zoom;
      
      figma.notify("Đã chọn và hiển thị node ở giữa màn hình");
    } else {
      figma.notify("Không tìm thấy node");
    }
  }
  if (msg.type === "close") figma.closePlugin();
};

console.log("code.js loaded");
