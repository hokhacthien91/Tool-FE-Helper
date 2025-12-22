// code.js - runs in Figma plugin environment
figma.showUI(__html__, { width: 600, height: 700 });

// Global cancel flag
let cancelRequested = false;

// Global component cache
let componentCache = {
  components: [],
  timestamp: 0,
  pageName: null
};

// Function to collect all components from document (with caching)
function collectAllComponents(forceRefresh = false) {
  const currentPageName = figma.currentPage.name;
  const now = Date.now();
  const cacheAge = now - componentCache.timestamp;
  const cacheValid = !forceRefresh && 
                     componentCache.components.length > 0 && 
                     componentCache.pageName === currentPageName &&
                     cacheAge < 300000; // Cache valid for 5 minutes
  
  if (cacheValid) {
    console.log("[component-cache] Using cached components:", componentCache.components.length, "components");
    return componentCache.components;
  }
  
  console.log("[component-cache] Collecting components (cache miss or expired)");
  
  const allComponents = [];
  
  function collectComponents(n, depth = 0) {
    // Limit depth to avoid infinite recursion and improve performance
    if (depth > 100) {
      console.warn("[component-cache] Max depth reached, stopping traversal");
      return;
    }
    
    try {
      if (n.type === "COMPONENT") {
        allComponents.push({
          id: n.id,
          name: n.name,
          description: n.description || ""
        });
      }
      
      // Only traverse children if node has children property
      if ("children" in n && Array.isArray(n.children)) {
        for (const child of n.children) {
          try {
            collectComponents(child, depth + 1);
          } catch (childError) {
            // Skip children that can't be accessed
            console.warn(`[component-cache] Could not access child:`, childError);
          }
        }
      }
    } catch (nodeError) {
      // Skip nodes that can't be accessed
      console.warn(`[component-cache] Could not access node:`, nodeError);
    }
  }
  
  // Only scan current page instead of entire document to avoid freezing
  console.log("[component-cache] Scanning current page:", currentPageName);
  collectComponents(figma.currentPage);
  
  // Also check if there are components in other pages (but limit to first 10 pages to avoid freezing)
  const allPages = figma.root.children.filter(child => child.type === "PAGE");
  const pagesToScan = allPages.slice(0, 10); // Limit to first 10 pages
  
  if (pagesToScan.length > 1) {
    console.log(`[component-cache] Also scanning ${pagesToScan.length - 1} additional page(s)`);
    for (let i = 1; i < pagesToScan.length; i++) {
      try {
        collectComponents(pagesToScan[i]);
      } catch (pageError) {
        console.warn(`[component-cache] Could not scan page ${pagesToScan[i].name}:`, pageError);
      }
    }
  }
  
  // Sort by name
  allComponents.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  
  // Update cache
  componentCache = {
    components: allComponents,
    timestamp: now,
    pageName: currentPageName
  };
  
  console.log("[component-cache] Cached", allComponents.length, "components");
  return allComponents;
}

// Function to add component to cache
function addComponentToCache(component) {
  if (!component || !component.id) return;
  
  // Check if component already exists in cache
  const exists = componentCache.components.some(c => c.id === component.id);
  if (!exists) {
    componentCache.components.push(component);
    // Re-sort
    componentCache.components.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    console.log("[component-cache] Added new component to cache:", component.name);
  }
}

// Function to invalidate cache
function invalidateComponentCache() {
  componentCache = {
    components: [],
    timestamp: 0,
    pageName: null
  };
  console.log("[component-cache] Cache invalidated");
}

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

// Build a human-readable scan context label for history/export (page name or top-level container name)
function buildScanContext(mode) {
  const fileName = (figma.root && figma.root.name) ? figma.root.name : "Untitled File";
  const pageName = (figma.currentPage && figma.currentPage.name) ? figma.currentPage.name : "Unnamed Page";

  // Page scan
  if (mode !== "selection") {
    return { mode: "page", fileName, pageName, label: `File: ${fileName} • Page: ${pageName}` };
  }

  // Selection scan
  const selection = Array.isArray(figma.currentPage.selection) ? figma.currentPage.selection : [];
  if (!selection.length) {
    // Will fallback to scanning the whole page in scan()/extractDesignTokens()
    return { mode: "page", fileName, pageName, label: `File: ${fileName} • Page: ${pageName}` };
  }

  function getTopLevelContainerName(node) {
    // Walk up to PAGE; remember the last FRAME/COMPONENT/INSTANCE encountered (closest to PAGE)
    let current = node;
    let topContainer = null;
    while (current && current.type !== "PAGE") {
      if (current.type === "FRAME" || current.type === "COMPONENT" || current.type === "INSTANCE") {
        topContainer = current;
      }
      current = current.parent;
    }
    if (topContainer && topContainer.name) return topContainer.name;
    return (node && node.name) ? node.name : "Selection";
  }

  const names = new Set();
  for (const n of selection) {
    try {
      names.add(getTopLevelContainerName(n));
    } catch (e) {
      // ignore
    }
  }

  const unique = Array.from(names).filter(Boolean);
  if (unique.length === 1) {
    return { mode: "selection", fileName, pageName, label: `File: ${fileName} • Selection: ${unique[0]}` };
  }

  // Multiple containers selected
  const preview = unique.slice(0, 2).join(", ");
  const more = unique.length > 2 ? ` (+${unique.length - 2} more)` : "";
  return { mode: "selection", fileName, pageName, label: `File: ${fileName} • Selection: ${preview}${more}` };
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
  contrastAALarge: 3.0, // WCAG AA for large text (>= 18pt or >= 14pt bold)
  
  // 8) Accessibility - Text Size for Mobile (ADA)
  checkTextSizeMobile: true,
  mobileMinTextSize: 16, // Minimum text size for mobile (px)
  mobileMinTextSizeBold: 14 // Minimum text size for bold text on mobile (px)
};

const STORAGE_KEYS = {
  lastReport: "design-qa-last-report",
  history: "design-qa-history",
  inputValues: "design-qa-input-values"
};

const MAX_HISTORY_ENTRIES = 10;

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
    let message = `Text contrast ratio ${contrast.toFixed(2)}:1 fails WCAG ${isLargeText ? "AA (large text)" : "AA"} (requires >= ${minContrast}:1). Text: "${node.characters.slice(0, 30)}"`;
    
    if (isGradient) {
      severity = "warn";
      message = `Text contrast ratio ${contrast.toFixed(2)}:1 fails WCAG ${isLargeText ? "AA (large text)" : "AA"} (requires >= ${minContrast}:1) with a gradient background. Manual check recommended because gradients may pass at some positions. Text: "${node.characters.slice(0, 30)}"`;
    } else if (Math.abs(contrast - 1.0) < 0.01) {
      // Contrast = 1.00:1 (likely same color or background detection failed)
      severity = "warn";
      message = `Text contrast ratio ${contrast.toFixed(2)}:1 — background color may not have been detected correctly (e.g. a sibling layer behind the text). Manual check recommended. Text: "${node.characters.slice(0, 30)}"`;
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

// Check if a node is within mobile breakpoint (based on parent frame width)
function isWithinMobileBreakpoint(node) {
  if (!node || !node.parent) return false;
  
  // Traverse up the parent chain to find the first FRAME/COMPONENT/INSTANCE
  let current = node.parent;
  while (current && current.type !== "PAGE") {
    if (current.type === "FRAME" || current.type === "COMPONENT" || current.type === "INSTANCE") {
      // Check if frame width is within mobile breakpoint (0-768px)
      if ("width" in current && typeof current.width === "number") {
        const width = current.width;
        return width > 0 && width <= RULES.breakpoints.mobile.max;
      }
    }
    current = current.parent;
  }
  
  // If no frame found, check if we're in a page that might be mobile
  // Default: assume mobile if we can't determine (conservative approach)
  return true;
}

// Check text size for mobile (ADA compliance)
function checkTextSizeMobile(node) {
  if (node.type !== "TEXT" || !RULES.checkTextSizeMobile) return null;
  
  // Check if text is within mobile breakpoint
  if (!isWithinMobileBreakpoint(node)) return null;
  
  // Get font size
  const fontSize = (node.fontSize && typeof node.fontSize === "number" && !isNaN(node.fontSize)) ? node.fontSize : null;
  if (!fontSize) return null;
  
  // Check if text is too small (12px or smaller)
  if (fontSize <= 12) {
    const textPreview = node.characters ? node.characters.slice(0, 30) : "";
    
    return {
      severity: "error",
      type: "text-size-mobile",
      message: `Text is too small on mobile (${fontSize}px) — ADA non-compliant. Font sizes of 12px or smaller are not allowed on mobile. Text: "${textPreview}"`,
      id: node.id,
      nodeName: node.name || "Unnamed",
      fontSize: fontSize,
      minSize: 12,
      textPreview: textPreview
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
        message: `Line-height is set to "AUTO" — set an explicit value to ensure spacing calculations are accurate.`,
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
          message: `Line-height ${lineHeightPercent}% (font-size: ${fontSize}px / line-height: ${lineHeightValue}px) too close to font-size — could cause spacing calculation errors between elements. Should use line-height >= ${lineHeightBaselineThreshold}% (>= ${(lineHeightBaselineThreshold / 100).toFixed(1)}x font-size).`,
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
          message: `Line-height ${lineHeightPercent}% (font-size: ${fontSize}px / line-height: ${lineHeightPx}px) too close to font-size — could cause spacing calculation errors between elements. Should use line-height >= ${lineHeightBaselineThreshold}% (>= ${(lineHeightBaselineThreshold / 100).toFixed(1)}x font-size).`,
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

// Treat icon-only groups as valid (often used to build a single icon from vectors)
function isIconOnlyGroup(group) {
  if (!group || group.type !== "GROUP" || !("children" in group) || !Array.isArray(group.children)) return false;
  if (group.children.length === 0) return false;

  // If group contains any TEXT/FRAME/INSTANCE/COMPONENT, it's not a simple icon group
  const disallowed = new Set(["TEXT", "FRAME", "INSTANCE", "COMPONENT"]);
  for (const child of group.children) {
    if (!child) return false;
    if (disallowed.has(child.type)) return false;
    // Nested group: only allow if that nested group is also icon-only
    if (child.type === "GROUP") {
      if (!isIconOnlyGroup(child)) return false;
      continue;
    }
  }

  // Allow common vector/shape primitives used for icons
  const allowed = new Set([
    "VECTOR",
    "BOOLEAN_OPERATION",
    "STAR",
    "LINE",
    "ELLIPSE",
    "POLYGON",
    "RECTANGLE"
  ]);

  return group.children.every(c => c && (allowed.has(c.type) || c.type === "GROUP"));
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
      message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Text can change length, should use Auto Layout.` 
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
            message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Button/Label pattern (Icon + Text) should use Auto Layout.` 
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
            message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Text stack (title + description) should use Auto Layout.` 
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
            message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Even spacing between children, should use Auto Layout.` 
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
            message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Even spacing between children, should use Auto Layout.` 
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
          message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Frame has manual padding, should use Auto Layout.` 
        };
      }
    }
  }
  
  // TC-06: Component without Auto Layout
  if (node.type === "COMPONENT") {
    return { 
      required: true, 
      message: `Auto-layout is not enabled on Component "${node.name || "Unnamed"}" — Component reusable should use Auto Layout.` 
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
        message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Frame has responsive constraints, should use Auto Layout.` 
      };
    }
  }
  
  // TC-10: Children have the same size (List/Grid)
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
          message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — List/Grid pattern (children same size), should use Auto Layout.` 
        };
      }
    }
  }
  
  // TC-12: Node name match UI keywords
  const uiKeywords = /button|badge|tag|chip|pill|input|field|navbar|menu|list/i;
  if (uiKeywords.test(nodeName)) {
    return { 
      required: true, 
      message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — Standard UI pattern should use Auto Layout.` 
    };
  }
  
  // Default: require auto-layout for frames/components
  return { 
    required: true, 
    message: `Auto-layout is not enabled on ${node.type} "${node.name || "Unnamed"}" — requires 100% Auto-layout.` 
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
    return { type: "empty", message: "Empty frame — remove it or add content." };
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
        message: `Frame only contains 1 child with the same size — it might be a redundant frame.` 
      };
    }
  }
  
  return null;
}

// Normalize color to lowercase hex or rgba for comparison
function normalizeColor(colorStr) {
  if (!colorStr) return null;
  const trimmed = colorStr.trim().toUpperCase();
  // Normalize hex colors (#fff -> #FFFFFF)
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      // Expand shorthand hex (#fff -> #FFFFFF)
      return "#" + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return trimmed;
  }
  return trimmed;
}

// Check if color is in scale
function isColorInScale(colorStr, scale) {
  if (!colorStr || !scale || !Array.isArray(scale)) return false;
  const normalized = normalizeColor(colorStr);
  if (!normalized) return false;
  return scale.some(scaleColor => normalizeColor(scaleColor) === normalized);
}

// Check if text matches a typography style
function checkTypographyStyleMatch(node, styles, rules) {
  if (node.type !== "TEXT") return null;
  if (!styles || styles.length === 0) return null;
  if (!rules || !rules.checkStyle) return null; // Skip if style check is disabled

  // Get node properties
  const nodeFontSize = (node.fontSize && typeof node.fontSize === "number") ? Math.round(node.fontSize) : null;
  const nodeFontFamily = (node.fontName && typeof node.fontName === "object") ? node.fontName.family : null;
  const nodeFontWeight = (node.fontName && typeof node.fontName === "object") ? node.fontName.style : null;
  
  // Get line height
  let nodeLineHeight = null;
  if (node.lineHeight && node.lineHeight.unit === "PERCENT") {
    nodeLineHeight = `${Math.round(node.lineHeight.value)}%`;
  } else if (node.lineHeight && node.lineHeight.unit === "AUTO") {
    nodeLineHeight = "auto";
  } else if (node.lineHeight && node.lineHeight.unit === "PIXELS" && nodeFontSize) {
    const percent = Math.round((node.lineHeight.value / nodeFontSize) * 100);
    nodeLineHeight = `${percent}%`;
  }
  
  // Get letter spacing
  let nodeLetterSpacing = null;
  if (node.letterSpacing && typeof node.letterSpacing === "object") {
    if (node.letterSpacing.unit === "PERCENT") {
      nodeLetterSpacing = `${node.letterSpacing.value}%`;
    } else if (node.letterSpacing.unit === "PIXELS") {
      nodeLetterSpacing = `${node.letterSpacing.value}px`;
    }
  } else if (typeof node.letterSpacing === "number") {
    nodeLetterSpacing = `${node.letterSpacing}`;
  }
  
  // Get color (removed from check, but keep for reference)
  let nodeColor = null;
  if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
    for (const fill of node.fills) {
      if (fill.type === "SOLID" && fill.visible !== false) {
        nodeColor = colorToString(fill.color);
        break;
      }
    }
  }

  // Try to match with any style
  let bestMatch = null;
  let bestMatchScore = 0;
  
  for (const style of styles) {
    let score = 0;
    let maxScore = 0;
    
    // Font Size (if check enabled)
    if (rules.checkFontSize && nodeFontSize !== null && style.fontSize) {
      maxScore++;
      if (nodeFontSize === parseInt(style.fontSize)) score++;
    }
    
    // Font Family (if check enabled)
    if (rules.checkFontFamily && nodeFontFamily && style.fontFamily) {
      maxScore++;
      if (nodeFontFamily.toLowerCase().includes(style.fontFamily.toLowerCase()) || 
          style.fontFamily.toLowerCase().includes(nodeFontFamily.toLowerCase())) {
        score++;
      }
    }
    
    // Font Weight (if check enabled)
    if (rules.checkFontWeight && nodeFontWeight && style.fontWeight) {
      maxScore++;
      if (nodeFontWeight.toLowerCase().includes(style.fontWeight.toLowerCase()) ||
          style.fontWeight.toLowerCase().includes(nodeFontWeight.toLowerCase())) {
        score++;
      }
    }
    
    // Line Height (if check enabled)
    if (rules.checkLineHeight && nodeLineHeight && style.lineHeight) {
      maxScore++;
      const styleLineHeight = String(style.lineHeight).toLowerCase();
      if (nodeLineHeight.toLowerCase() === styleLineHeight) {
        score++;
      }
    }
    
    // Letter Spacing (if check enabled)
    if (rules.checkLetterSpacing && nodeLetterSpacing !== null && style.letterSpacing !== undefined) {
      maxScore++;
      const styleLetterSpacing = String(style.letterSpacing).toLowerCase().trim();
      const nodeLetterSpacingNormalized = nodeLetterSpacing.toLowerCase().trim();
      
      // Normalize "0" variants
      const isZero = (val) => val === "0" || val === "0px" || val === "0%";
      
      if (isZero(styleLetterSpacing) && isZero(nodeLetterSpacingNormalized)) {
        score++;
      } else if (styleLetterSpacing === nodeLetterSpacingNormalized) {
        score++;
      }
    }
    
    // Word Spacing (if check enabled - future implementation)
    if (rules.checkWordSpacing && style.wordSpacing !== undefined) {
      // TODO: Implement word spacing check when Figma API supports it
      // For now, we'll skip this
    }
    
    // Perfect match
    if (maxScore > 0 && score === maxScore) {
      return { 
        matched: true, 
        styleName: style.name,
        nodeProps: {
          fontFamily: nodeFontFamily,
          fontSize: nodeFontSize,
          fontWeight: nodeFontWeight,
          lineHeight: nodeLineHeight,
          letterSpacing: nodeLetterSpacing
        },
        styleProps: {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing
        }
      };
    }
    
    // Track best partial match
    if (maxScore > 0 && score > bestMatchScore) {
      bestMatchScore = score;
      bestMatch = style;
    }
  }
  
  // No perfect match found - build detailed report
  const textPreview = node.characters ? node.characters.slice(0, 30) : "";
  
  // Count enabled rules
  let totalProps = 0;
  if (rules.checkFontFamily) totalProps++;
  if (rules.checkFontSize) totalProps++;
  if (rules.checkFontWeight) totalProps++;
  if (rules.checkLineHeight) totalProps++;
  if (rules.checkLetterSpacing) totalProps++;
  if (rules.checkWordSpacing) totalProps++;
  
  // Build differences array for best match
  const differences = [];
  if (bestMatch) {
    if (rules.checkFontFamily && nodeFontFamily && bestMatch.fontFamily) {
      const matches = nodeFontFamily.toLowerCase().includes(bestMatch.fontFamily.toLowerCase()) || 
                      bestMatch.fontFamily.toLowerCase().includes(nodeFontFamily.toLowerCase());
      differences.push({
        property: "Font Family",
        current: nodeFontFamily,
        expected: bestMatch.fontFamily,
        matches
      });
    }
    if (rules.checkFontSize && nodeFontSize !== null && bestMatch.fontSize) {
      const matches = nodeFontSize === parseInt(bestMatch.fontSize);
      differences.push({
        property: "Font Size",
        current: nodeFontSize + "px",
        expected: bestMatch.fontSize + "px",
        matches
      });
    }
    if (rules.checkFontWeight && nodeFontWeight && bestMatch.fontWeight) {
      const matches = nodeFontWeight.toLowerCase().includes(bestMatch.fontWeight.toLowerCase()) ||
                      bestMatch.fontWeight.toLowerCase().includes(nodeFontWeight.toLowerCase());
      differences.push({
        property: "Font Weight",
        current: nodeFontWeight,
        expected: bestMatch.fontWeight,
        matches
      });
    }
    if (rules.checkLineHeight && nodeLineHeight && bestMatch.lineHeight) {
      const matches = nodeLineHeight.toLowerCase() === String(bestMatch.lineHeight).toLowerCase();
      differences.push({
        property: "Line Height",
        current: nodeLineHeight,
        expected: bestMatch.lineHeight,
        matches
      });
    }
    if (rules.checkLetterSpacing && nodeLetterSpacing !== null && bestMatch.letterSpacing !== undefined) {
      const isZero = (val) => val === "0" || val === "0px" || val === "0%";
      const styleLS = String(bestMatch.letterSpacing).toLowerCase().trim();
      const nodeLS = nodeLetterSpacing.toLowerCase().trim();
      const matches = (isZero(styleLS) && isZero(nodeLS)) || styleLS === nodeLS;
      differences.push({
        property: "Letter Spacing",
        current: nodeLetterSpacing,
        expected: bestMatch.letterSpacing,
        matches
      });
    }
  }
  
  let matchPercentage = 0;
  if (totalProps > 0 && bestMatchScore > 0) {
    matchPercentage = Math.round((bestMatchScore / totalProps) * 100);
  }
  
  return {
    matched: false,
    message: `Typography does not match any defined style. Text: "${textPreview}"`,
    textPreview,
    nodeProps: {
      fontFamily: nodeFontFamily,
      fontSize: nodeFontSize,
      fontWeight: nodeFontWeight,
      lineHeight: nodeLineHeight,
      letterSpacing: nodeLetterSpacing
    },
    bestMatch: bestMatch ? {
      name: bestMatch.name,
      score: bestMatchScore,
      total: totalProps,
      percentage: matchPercentage,
      differences
    } : null
  };
}

// Compute issues scanning a selection or whole page
async function scan(target, customSpacingScale = null, spacingThreshold = 100, customColorScale = null, customFontSizeScale = null, fontSizeThreshold = 100, customLineHeightScale = null, lineHeightThreshold = 300, lineHeightBaselineThreshold = 120, typographyStyles = [], typographyRules = {}) {
  const nodesToScan = [];
  if (target === "selection") {
    if (figma.currentPage.selection.length === 0) {
      figma.notify("No selection — scanning the whole page.");
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
  const totalNodes = nodesToScan.length;
  let processedNodes = 0;
  const progressInterval = Math.max(1, Math.floor(totalNodes / 50)); // Report progress every 2%
  
  for (const node of nodesToScan) {
    try {
      // Check for cancel request
      if (cancelRequested) {
        figma.notify("Scan cancelled by user");
        cancelRequested = false; // Reset flag
        throw new Error("Scan cancelled");
      }
      
      // Report progress periodically and yield control
      processedNodes++;
      if (processedNodes % progressInterval === 0 || processedNodes === totalNodes) {
        const progress = Math.round((processedNodes / totalNodes) * 100);
        figma.ui.postMessage({ 
          type: "scan-progress", 
          progress: progress,
          current: processedNodes,
          total: totalNodes
        });
        // Yield control to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
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
            message: `Naming does not follow convention: "${nodeName}". Should be named with a meaningful name instead of default name.`,  
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
            message: `Text naming does not follow convention: "${nodeName}". Should be named with a meaningful name instead of default name.`,
            id: node.id,
            nodeName: nodeName
          });
        }
      }

      // 2) Groups - disallow and check nested
      if (node.type === "GROUP") {
        groupNodes.push(node);

        // Icon groups built from vectors/shapes are valid (no need for Auto-layout)
        if (isIconOnlyGroup(node)) {
          continue;
        }
        
        if (RULES.disallowGroups) {
          // Skip groups with only 1 child - no need for Auto-layout with single child
          if ("children" in node && node.children.length > 1) {
            addIssue({
              severity: "error",
              type: "group",
              message: `Group detected — should use Frame + Auto-layout instead.`,
              id: node.id,
              nodeName: nodeName
            });
          }
        }
        
        if (RULES.disallowNestedGroups && hasNestedGroups(node)) {
          addIssue({
            severity: "error",
            type: "nested-group",
            message: `Nested groups detected — structure is not recommended.`,
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
              message: shouldUseAutoLayout.message || `Auto-layout is not enabled on ${node.type} "${nodeName}" — requires 100% Auto-layout.`,
              id: node.id,
              nodeName: nodeName
          });
          }
        } else {
          // Auto-layout is enabled - no need to check preferred layout mode
          // User can use HORIZONTAL or VERTICAL as needed
          
          // Check itemSpacing (gap) - only if spacing guidelines is provided
          if (customSpacingScale !== null) {
          if (typeof node.itemSpacing === "number") {
              // If value exceeds threshold, pass (special case)
              if (node.itemSpacing > spacingThreshold) {
                // Pass - value is above threshold (special case)
              } else if (!isInScale(node.itemSpacing, customSpacingScale)) {
              addIssue({
                severity: "error",
                type: "spacing",
                  message: `Gap (itemSpacing: ${node.itemSpacing}px) does not follow scale on "${nodeName}". Scale: ${customSpacingScale.join(", ")}`,
                  id: node.id,
                  nodeName: nodeName
              });
            }
          }
          } else {
            // If spacing guidelines is empty, show skipped message
            if (typeof node.itemSpacing === "number") {
              addIssue({
                severity: "info",
                type: "spacing",
                message: `Gap (itemSpacing: ${node.itemSpacing}px) - Check spacing is skipped (spacing guidelines is empty).`,
                id: node.id,
                nodeName: nodeName
              });
            }
          }
          
          // Check padding - only if spacing guidelines is provided
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
                  severity: "error",
                  type: "spacing",
                    message: `Padding ${pad.name} (${pad.value}px) does not follow scale on "${nodeName}". Scale: ${customSpacingScale.join(", ")}`,
                    id: node.id,
                    nodeName: nodeName
                });
                break;
              }
              }
            }
          } else {
            // If spacing guidelines is empty, show skipped message for padding
            const hasPadding = paddings.some(p => typeof p.value === "number" && p.value !== 0);
            if (hasPadding) {
              addIssue({
                severity: "info",
                type: "spacing",
                message: `Padding - Check spacing is skipped (spacing guidelines is empty).`,
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

      // 4.5) Color check - Check fills/strokes/effects against color
      if (customColorScale !== null && Array.isArray(customColorScale) && customColorScale.length > 0) {
        // Check fills
        if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
          for (const fill of node.fills) {
            if (fill.visible !== false && fill.type === "SOLID") {
              const colorStr = colorToString(fill.color);
              if (colorStr && !isColorInScale(colorStr, customColorScale)) {
                addIssue({
                  severity: "error",
                  type: "color",
                  message: `Color ${colorStr} does not follow scale on "${nodeName}". Scale: ${customColorScale.join(", ")}`,
                  id: node.id,
                  nodeName: nodeName
                });
                break; // Only report once per node
              }
            }
          }
        }
        
        // Check strokes
        if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
          for (const stroke of node.strokes) {
            if (stroke.visible !== false && stroke.type === "SOLID") {
              const colorStr = colorToString(stroke.color);
              if (colorStr && !isColorInScale(colorStr, customColorScale)) {
                addIssue({
                  severity: "error",
                  type: "color",
                  message: `Stroke color ${colorStr} does not follow scale on "${nodeName}". Scale: ${customColorScale.join(", ")}`,
                  id: node.id,
                  nodeName: nodeName
                });
                break; // Only report once per node
              }
            }
          }
        }
        
        // Check effects (shadows)
        if ("effects" in node && Array.isArray(node.effects) && node.effects.length > 0) {
          for (const effect of node.effects) {
            if (effect.visible !== false && (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW")) {
              const colorStr = colorToString(effect.color);
              if (colorStr && !isColorInScale(colorStr, customColorScale)) {
                addIssue({
                  severity: "error",
                  type: "color",
                  message: `Effect color ${colorStr} does not follow scale on "${nodeName}". Scale: ${customColorScale.join(", ")}`,
                  id: node.id,
                  nodeName: nodeName
                });
                break; // Only report once per node
              }
            }
          }
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
                message: `fontSize ${fs}px does not follow scale on text "${node.characters.slice(0, 30)}". Scale: ${customFontSizeScale.join(", ")}`,
                id: node.id,
                nodeName: nodeName
          });
            }
          } else if (!isValidTypographySize(fs)) {
            // Check against default scale
            addIssue({
              severity: "warn",
              type: "typography",
              message: `fontSize ${fs}px does not follow scale on text "${node.characters.slice(0, 30)}". Scale: ${RULES.allTypographySizes.join(", ")}`,
              id: node.id,
              nodeName: nodeName
            });
          }
        }
        
        // Text style key check
        if (RULES.requireTextStyleKey) {
          const styleId = node.textStyleId;
          if (!styleId || styleId === figma.mixed) {
            // Check if there's a matching typography style
            let bestMatch = null;
            if (typographyStyles && typographyStyles.length > 0) {
              const matchResult = checkTypographyStyleMatch(node, typographyStyles, typographyRules);
              if (matchResult && matchResult.bestMatch) {
                bestMatch = matchResult.bestMatch;
              }
            }
            
            // Get node properties for UI
            const nodeFontSize = (node.fontSize && typeof node.fontSize === "number") ? Math.round(node.fontSize) : null;
            const nodeFontFamily = (node.fontName && typeof node.fontName === "object") ? node.fontName.family : null;
            const nodeFontWeight = (node.fontName && typeof node.fontName === "object") ? node.fontName.style : null;
            
            let nodeLineHeight = null;
            if (node.lineHeight && node.lineHeight.unit === "PERCENT") {
              nodeLineHeight = `${Math.round(node.lineHeight.value)}%`;
            } else if (node.lineHeight && node.lineHeight.unit === "AUTO") {
              nodeLineHeight = "auto";
            } else if (node.lineHeight && node.lineHeight.unit === "PIXELS" && nodeFontSize) {
              const percent = Math.round((node.lineHeight.value / nodeFontSize) * 100);
              nodeLineHeight = `${percent}%`;
            }
            
            let nodeLetterSpacing = null;
            if (node.letterSpacing && typeof node.letterSpacing === "object") {
              if (node.letterSpacing.unit === "PERCENT") {
                nodeLetterSpacing = `${node.letterSpacing.value}%`;
              } else if (node.letterSpacing.unit === "PIXELS") {
                nodeLetterSpacing = `${node.letterSpacing.value}px`;
              }
            } else if (typeof node.letterSpacing === "number") {
              nodeLetterSpacing = `${node.letterSpacing}`;
            }
            
            addIssue({
              severity: "warn",
              type: "typography-style",
              message: `Text does not use Text Style (variable) — difficult to manage and not consistent. Should create and use Text Style Variable.`,
              id: node.id,
              nodeName: nodeName,
              nodeProps: {
                fontFamily: nodeFontFamily,
                fontSize: nodeFontSize,
                fontWeight: nodeFontWeight,
                lineHeight: nodeLineHeight,
                letterSpacing: nodeLetterSpacing
              },
              bestMatch: bestMatch
            });
          }
        } else if (RULES.allowedTextStyleIds.length > 0) {
          const styleId = node.textStyleId;
          if (!styleId || !RULES.allowedTextStyleIds.includes(styleId)) {
            addIssue({
              severity: "warn",
              type: "typography-style",
              message: `Text does not use standard Text Style.`,
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
            // Store additional info for fix functionality
            contrastIssue.textColorHex = contrastIssue.textColor;
            contrastIssue.backgroundColorHex = contrastIssue.backgroundColor;
            // Group similar contrast issues: same ratio, text color, background color, and background node name
            const contrastKey = `${contrastIssue.contrast.toFixed(2)}|${contrastIssue.textColor}|${contrastIssue.backgroundColor}|${contrastIssue.backgroundColorNode}`;
            if (!contrastGroups.has(contrastKey)) {
              contrastGroups.set(contrastKey, []);
            }
            contrastGroups.get(contrastKey).push(contrastIssue);
          }
        }
        
        // Text size for mobile (ADA) check
        if (RULES.checkTextSizeMobile) {
          const mobileSizeIssue = checkTextSizeMobile(node);
          if (mobileSizeIssue) {
            // Store font info for fix functionality
            if (node.fontName) {
              mobileSizeIssue.fontName = node.fontName;
            }
            addIssue(mobileSizeIssue);
          }
        }
        
        // Typography Style Match check
        if (typographyStyles && typographyStyles.length > 0 && typographyRules && typographyRules.checkStyle) {
          const typoMatch = checkTypographyStyleMatch(node, typographyStyles, typographyRules);
          if (typoMatch && !typoMatch.matched) {
            addIssue({
              severity: "error",
              type: "typography-check",
              message: typoMatch.message,
              id: node.id,
              nodeName: nodeName,
              textPreview: typoMatch.textPreview,
              nodeProps: typoMatch.nodeProps,
              bestMatch: typoMatch.bestMatch
            });
          } else if (typoMatch && typoMatch.matched) {
            // Add success info for matched typography - same type to group together
            addIssue({
              severity: "info",
              type: "typography-check",
              message: `✓ Matches style "${typoMatch.styleName}"`,
              id: node.id,
              nodeName: nodeName,
              styleName: typoMatch.styleName,
              nodeProps: typoMatch.nodeProps,
              styleProps: typoMatch.styleProps
            });
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
            const usageText = ` (used ${usageCount} times)`;
          addIssue({
            severity: "warn",
              type: "component",
              message: `${nodeTypeLabel} "${nodeName}" should be componentized for reuse${usageText}.`,
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
            message: `Child has negative position (x:${Math.round(node.x)}, y:${Math.round(node.y)}) in "${node.parent.name}". Check margin/absolute positioning.`,
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
        
        // Create grouped issue - copy ALL properties from firstIssue
        const groupedIssue = Object.assign({}, firstIssue, {
          message: message,  // Override with grouped message
          affectedCount: count  // Add count
        });
        
        issues.push(groupedIssue);
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
            message = `Text contrast ratio ${contrastRatio}:1 fails WCAG ${isLargeText ? "AA (large text)" : "AA"} (requires >= ${minContrast}:1) with a gradient background (${count} text nodes). Manual check recommended because gradients may pass at some positions.`;
          } else if (Math.abs(firstIssue.contrast - 1.0) < 0.01) {
            message = `Text contrast ratio ${contrastRatio}:1 — background color may not have been detected correctly (e.g. a sibling layer behind the text) (${count} text nodes). Manual check recommended.`;
          } else {
            message = `Text contrast ratio ${contrastRatio}:1 fails WCAG ${isLargeText ? "AA (large text)" : "AA"} (requires >= ${minContrast}:1) (${count} text nodes).`;
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
  // Always return hex (ignore alpha/opacity for color extraction)
  // Convert to uppercase for consistency
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
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
      figma.notify("No selection — scanning the whole page.");
      traverse(figma.currentPage, n => nodesToScan.push(n));
    } else {
      for (const n of figma.currentPage.selection) traverse(n, nd => nodesToScan.push(nd));
    }
  } else {
    traverse(figma.currentPage, n => nodesToScan.push(n));
  }

  const totalNodes = nodesToScan.length;
  let processedNodes = 0;
  const progressInterval = Math.max(1, Math.floor(totalNodes / 50)); // Report progress every 2%

  const tokens = {
    colors: new Map(), // value -> {value, nodes: [{id, name}]}
    gradients: new Map(),
    spacing: new Map(), // number(px) -> {value, nodes: [{id, name, spacingType}]}
    borderRadius: new Map(),
    fontWeight: new Map(),
    lineHeight: new Map(),
    fontSize: new Map(),
    fontFamily: new Map()
  };

  function addToken(map, value, nodeId, nodeName, colorType = null, nodeMeta = null) {
    const key = String(value);
    if (!map.has(key)) {
      map.set(key, { value, nodes: [], colorType: colorType || null });
    }
    // Only add if not already in nodes array
    const existing = map.get(key);
    const existingNode = existing.nodes.find(n => n.id === nodeId);
    if (!existingNode) {
      const nodeObj = { id: nodeId, name: nodeName || "Unnamed" };
      if (nodeMeta && typeof nodeMeta === "object") {
        Object.assign(nodeObj, nodeMeta);
      }
      existing.nodes.push(nodeObj);
    } else if (nodeMeta && typeof nodeMeta === "object") {
      // Merge metadata if node already exists (keep the latest non-empty values)
      for (const [k, v] of Object.entries(nodeMeta)) {
        if (v !== undefined && v !== null && v !== "" && existingNode[k] !== v) {
          existingNode[k] = v;
        }
      }
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
      // Check for cancel request
      if (cancelRequested) {
        figma.notify("Extraction cancelled by user");
        cancelRequested = false; // Reset flag
        throw new Error("Extraction cancelled");
      }
      
      // Report progress periodically and yield control
      processedNodes++;
      if (processedNodes % progressInterval === 0 || processedNodes === totalNodes) {
        const progress = Math.round((processedNodes / totalNodes) * 100);
        figma.ui.postMessage({ 
          type: "scan-progress", 
          progress: progress,
          current: processedNodes,
          total: totalNodes
        });
        // Yield control to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Skip hidden nodes (double check in case traverse didn't catch it)
      if ("visible" in node && node.visible === false) {
        continue;
      }
      
      const nodeId = node.id;
      const nodeName = node.name || "Unnamed";

      // Spacing tokens (Auto Layout gaps/paddings)
      // Only FRAME/COMPONENT/INSTANCE can have auto-layout spacing properties.
      if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE") {
        // itemSpacing + paddings exist when auto-layout is enabled
        if (node.layoutMode && node.layoutMode !== "NONE") {
          if (typeof node.itemSpacing === "number" && !isNaN(node.itemSpacing)) {
            // Always use absolute value for spacing (convert negative to positive)
            addToken(tokens.spacing, Math.abs(Math.round(node.itemSpacing)), nodeId, nodeName, null, { spacingType: "itemSpacing" });
          }

          const pads = [
            { k: "paddingLeft", v: node.paddingLeft },
            { k: "paddingRight", v: node.paddingRight },
            { k: "paddingTop", v: node.paddingTop },
            { k: "paddingBottom", v: node.paddingBottom }
          ];
          for (const p of pads) {
            if (typeof p.v === "number" && !isNaN(p.v)) {
              // Always use absolute value for spacing (convert negative to positive)
              addToken(tokens.spacing, Math.abs(Math.round(p.v)), nodeId, nodeName, null, { spacingType: p.k });
            }
          }
        }
      }

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
          const family = node.fontName.family || "";
          const style = node.fontName.style || "";
          // Extract weight from style (e.g., "Bold", "Regular", "Medium")
          if (style) {
            addToken(tokens.fontWeight, style, nodeId, nodeName, null, { fontFamily: family || "Unknown" });
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

  function enrichFontWeightTokens(fontWeightTokens) {
    if (!Array.isArray(fontWeightTokens)) return fontWeightTokens;
    for (const token of fontWeightTokens) {
      const nodes = Array.isArray(token.nodes) ? token.nodes : [];
      const familyCount = new Map();
      for (const n of nodes) {
        const fam = (n && n.fontFamily) ? String(n.fontFamily) : "Unknown";
        familyCount.set(fam, (familyCount.get(fam) || 0) + 1);
      }
      token.fontFamilies = Array.from(familyCount.entries())
        .map(([family, count]) => ({ family, count }))
        .sort((a, b) => (b.count - a.count) || a.family.localeCompare(b.family));
    }
    return fontWeightTokens;
  }

  const result = {
    colors: mapToArray(tokens.colors),
    gradients: mapToArray(tokens.gradients),
    spacing: mapToArray(tokens.spacing, (a, b) => a - b),
    borderRadius: mapToArray(tokens.borderRadius, (a, b) => a - b),
    fontWeight: mapToArray(tokens.fontWeight),
    lineHeight: mapToArray(tokens.lineHeight),
    fontSize: mapToArray(tokens.fontSize, (a, b) => b - a), // Descending
    fontFamily: mapToArray(tokens.fontFamily)
  };

  // Add font-family usage breakdown for each font-weight token
  result.fontWeight = enrichFontWeightTokens(result.fontWeight);

  return result;
}

// Listen for UI commands
// Helper function to apply typography fix
async function applyTypographyFix(node, bestMatch) {
  if (node.type !== "TEXT") {
    throw new Error("Node is not a text node");
  }

  // Get current font info
  const currentFontName = node.fontName;
  const currentFontFamily = currentFontName ? currentFontName.family : "Inter";
  const currentFontStyle = currentFontName ? currentFontName.style : "Regular";
  
  // Collect all changes first, then apply in correct order
  const changes = {
    fontFamily: null,
    fontWeight: null,
    fontSize: null,
    lineHeight: null,
    letterSpacing: null
  };
  
  // Parse all differences
  if (bestMatch.differences) {
    for (const diff of bestMatch.differences) {
      if (!diff.matches && diff.expected) {
        if (diff.property === "Font Family") {
          changes.fontFamily = diff.expected;
        } else if (diff.property === "Font Weight") {
          changes.fontWeight = diff.expected;
        } else if (diff.property === "Font Size") {
          changes.fontSize = diff.expected;
        } else if (diff.property === "Line Height") {
          changes.lineHeight = diff.expected;
        } else if (diff.property === "Letter Spacing") {
          changes.letterSpacing = diff.expected;
        }
      }
    }
  }
  
  // Apply changes in correct order: Family -> Weight -> Size -> Line Height -> Letter Spacing
  // 1. Font Family (must be first)
  let targetFamily = currentFontFamily;
  let targetStyle = currentFontStyle;
  
  if (changes.fontFamily) {
    targetFamily = changes.fontFamily;
    try {
      // Load font with current style first
      await figma.loadFontAsync({ family: targetFamily, style: targetStyle });
      node.fontName = { family: targetFamily, style: targetStyle };
    } catch (fontError) {
      // If font doesn't exist, try with Regular style
      try {
        await figma.loadFontAsync({ family: targetFamily, style: "Regular" });
        node.fontName = { family: targetFamily, style: "Regular" };
        targetStyle = "Regular";
      } catch (fallbackError) {
        console.error(`Failed to load font ${targetFamily}:`, fallbackError);
        throw new Error(`Font "${targetFamily}" not available. Please install it first.`);
      }
    }
  }
  
  // 2. Font Weight (must be after family)
  if (changes.fontWeight) {
    const weightMap = {
      "Regular": "Regular",
      "Medium": "Medium",
      "Semi Bold": "SemiBold",
      "SemiBold": "SemiBold",
      "Bold": "Bold"
    };
    const newStyle = weightMap[changes.fontWeight] || changes.fontWeight;
    
    // Only change if different from current
    if (newStyle !== targetStyle) {
      try {
        // Load font with new style
        await figma.loadFontAsync({ family: targetFamily, style: newStyle });
        node.fontName = { family: targetFamily, style: newStyle };
        targetStyle = newStyle;
      } catch (styleError) {
        console.error(`Failed to load font style ${targetFamily} ${newStyle}:`, styleError);
        // Continue with current style instead of failing
        console.warn(`Using current style ${targetStyle} instead of ${newStyle}`);
      }
    }
  }
  
  // Ensure font is loaded before setting any other properties
  // Re-load font with current targetFamily and targetStyle to ensure it's ready
  try {
    await figma.loadFontAsync({ family: targetFamily, style: targetStyle });
    // Verify fontName is set
    if (!node.fontName || node.fontName.family !== targetFamily || node.fontName.style !== targetStyle) {
      node.fontName = { family: targetFamily, style: targetStyle };
    }
  } catch (fontLoadError) {
    console.error("Failed to ensure font is loaded:", fontLoadError);
    throw new Error(`Cannot load font "${targetFamily}" ${targetStyle}. Please ensure the font is installed.`);
  }
  
  // 3. Font Size (can be set independently, but after fontName is set)
  if (changes.fontSize) {
    const size = parseFloat(changes.fontSize.replace("px", ""));
    if (!isNaN(size) && size > 0 && size <= 1000) { // Reasonable limit
      try {
        node.fontSize = size;
      } catch (sizeError) {
        console.error("Failed to set font size:", sizeError);
        throw new Error(`Cannot set font size to ${size}px: ${sizeError.message}`);
      }
    }
  }
  
  // 4. Line Height (must be after font is fully loaded)
  if (changes.lineHeight) {
    try {
      const lh = changes.lineHeight;
      if (lh === "auto") {
        node.lineHeight = { unit: "AUTO" };
      } else if (lh.includes("%")) {
        const percent = parseFloat(lh.replace("%", ""));
        if (!isNaN(percent)) {
          node.lineHeight = { unit: "PERCENT", value: percent };
        }
      } else {
        const px = parseFloat(lh.replace("px", ""));
        if (!isNaN(px)) {
          node.lineHeight = { unit: "PIXELS", value: px };
        }
      }
    } catch (lineHeightError) {
      if (lineHeightError.message && lineHeightError.message.includes("unloaded")) {
        // Font not loaded, try to reload
        try {
          await figma.loadFontAsync({ family: targetFamily, style: targetStyle });
          node.fontName = { family: targetFamily, style: targetStyle };
          // Retry lineHeight
          const lh = changes.lineHeight;
          if (lh === "auto") {
            node.lineHeight = { unit: "AUTO" };
          } else if (lh.includes("%")) {
            const percent = parseFloat(lh.replace("%", ""));
            if (!isNaN(percent)) {
              node.lineHeight = { unit: "PERCENT", value: percent };
            }
          } else {
            const px = parseFloat(lh.replace("px", ""));
            if (!isNaN(px)) {
              node.lineHeight = { unit: "PIXELS", value: px };
            }
          }
        } catch (retryError) {
          throw new Error(`Cannot set line height: Font "${targetFamily}" ${targetStyle} is not loaded. ${retryError.message}`);
        }
      } else {
        throw lineHeightError;
      }
    }
  }
  
  // 5. Letter Spacing (must be after font is fully loaded)
  if (changes.letterSpacing) {
    try {
      const ls = changes.letterSpacing;
      if (ls.includes("%")) {
        const percent = parseFloat(ls.replace("%", ""));
        if (!isNaN(percent)) {
          node.letterSpacing = { unit: "PERCENT", value: percent };
        }
      } else {
        const px = parseFloat(ls.replace("px", ""));
        if (!isNaN(px)) {
          node.letterSpacing = { unit: "PIXELS", value: px };
        }
      }
    } catch (letterSpacingError) {
      if (letterSpacingError.message && letterSpacingError.message.includes("unloaded")) {
        // Font not loaded, try to reload
        try {
          await figma.loadFontAsync({ family: targetFamily, style: targetStyle });
          node.fontName = { family: targetFamily, style: targetStyle };
          // Retry letterSpacing
          const ls = changes.letterSpacing;
          if (ls.includes("%")) {
            const percent = parseFloat(ls.replace("%", ""));
            if (!isNaN(percent)) {
              node.letterSpacing = { unit: "PERCENT", value: percent };
            }
          } else {
            const px = parseFloat(ls.replace("px", ""));
            if (!isNaN(px)) {
              node.letterSpacing = { unit: "PIXELS", value: px };
            }
          }
        } catch (retryError) {
          throw new Error(`Cannot set letter spacing: Font "${targetFamily}" ${targetStyle} is not loaded. ${retryError.message}`);
        }
      } else {
        throw letterSpacingError;
      }
    }
  }
}

figma.ui.onmessage = async msg => {
  switch (msg.type) {
    case "notify": {
      const message = msg.message || "Notification";
      figma.notify(message);
      break;
    }
    case "cancel-scan": {
      cancelRequested = true;
      figma.notify("Cancelling scan...");
      break;
    }
    case "scan": {
      cancelRequested = false; // Reset cancel flag when starting new scan
    const mode = msg.mode || "page";
    const context = buildScanContext(mode);
    const spacingScaleInput = msg.spacingScale || "";
    const spacingThreshold = msg.spacingThreshold || 100;
    const colorScaleInput = msg.colorScale || "";
    const fontSizeScaleInput = msg.fontSizeScale || "";
    const fontSizeThreshold = msg.fontSizeThreshold || 100;
    const lineHeightScaleInput = msg.lineHeightScale || "";
    const lineHeightThreshold = msg.lineHeightThreshold || 300;
    const lineHeightBaselineThreshold = msg.lineHeightBaselineThreshold || 120;
    const typographyStyles = msg.typographyStyles || [];
    const typographyRules = msg.typographyRules || {};
    const ignoredIssuesFromUI = msg.ignoredIssues || {}; // Get ignored issues from UI
    
    // Parse spacing guidelines from input
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
        console.error("Error parsing spacing guidelines:", e);
      }
    }
    
    // Parse color from input
    let customColorScale = null;
    if (colorScaleInput.trim()) {
      try {
        // Parse comma-separated color values (hex or rgba)
        const values = colorScaleInput.split(",").map(v => {
          const trimmed = v.trim();
          return trimmed ? normalizeColor(trimmed) : null;
        }).filter(v => v !== null);
        
        if (values.length > 0) {
          customColorScale = values;
        }
      } catch (e) {
        console.error("Error parsing color:", e);
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
      const issues = await scan(mode, customSpacingScale, spacingThreshold, customColorScale, customFontSizeScale, fontSizeThreshold, customLineHeightScale, lineHeightThreshold, lineHeightBaselineThreshold, typographyStyles, typographyRules);
      
      // Mark ignored issues
      if (ignoredIssuesFromUI && typeof ignoredIssuesFromUI === "object") {
        issues.forEach(issue => {
          if (ignoredIssuesFromUI[issue.id] === true) {
            issue.ignored = true;
            issue.severity = "info"; // Change to info for ignored issues
          }
        });
      }
      
      // Limit issues array size to prevent memory errors
      // Figma has a limit on postMessage data size (typically ~8MB)
      // Each issue is roughly 1-2KB, so limit to ~3000 issues per message
      const MAX_ISSUES_PER_MESSAGE = 3000;
      const issuesToSend = issues.slice(0, MAX_ISSUES_PER_MESSAGE);
      
      if (issues.length > MAX_ISSUES_PER_MESSAGE) {
        figma.notify(`⚠️ Found ${issues.length} issues, but only showing first ${MAX_ISSUES_PER_MESSAGE} to prevent memory errors.`);
      }
      
      figma.ui.postMessage({ type: "report", issues: issuesToSend, context, totalIssues: issues.length });
    } catch (error) {
      figma.notify(`Scan failed: ${error.message}`);
      figma.ui.postMessage({ type: "report", issues: [], error: error.message, context });
    }
    break;
  }
    case "extract-tokens": {
      cancelRequested = false; // Reset cancel flag when starting new extraction
      const mode = msg.mode || "page";
      const context = buildScanContext(mode);
      try {
        const tokens = await extractDesignTokens(mode);
        figma.ui.postMessage({ type: "tokens-report", tokens, context });
      } catch (error) {
        figma.notify(`Token extraction failed: ${error.message}`);
        figma.ui.postMessage({ type: "tokens-report", tokens: null, error: error.message, context });
      }
      break;
    }
    case "select-node": {
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
        figma.notify("Node selected");
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
      
      figma.notify("Node selected and centered in the viewport");
    } else {
      figma.notify("Node not found");
    }
    break;
  }
    case "save-last-report": {
      try {
        await figma.clientStorage.setAsync(STORAGE_KEYS.lastReport, msg.report || null);
      } catch (e) {
        console.error("Failed to save last report", e);
      }
      break;
    }
    case "get-last-report": {
      try {
        const report = await figma.clientStorage.getAsync(STORAGE_KEYS.lastReport);
        figma.ui.postMessage({ type: "last-report", report: report || null });
      } catch (e) {
        console.error("Failed to load last report", e);
        figma.ui.postMessage({ type: "last-report", report: null });
      }
      break;
    }
    case "save-history-entry": {
      try {
        const entry = msg.entry;
        if (entry) {
          let history = await figma.clientStorage.getAsync(STORAGE_KEYS.history) || [];
          history.unshift(entry);
          history = history.slice(0, MAX_HISTORY_ENTRIES);
          await figma.clientStorage.setAsync(STORAGE_KEYS.history, history);
          figma.ui.postMessage({ type: "history-data", history });
        }
      } catch (e) {
        console.error("Failed to save history entry", e);
      }
      break;
    }
    case "get-history": {
      try {
        const history = await figma.clientStorage.getAsync(STORAGE_KEYS.history) || [];
        figma.ui.postMessage({ type: "history-data", history });
      } catch (e) {
        console.error("Failed to load history", e);
        figma.ui.postMessage({ type: "history-data", history: [] });
      }
      break;
    }
    case "save-input-values": {
      try {
        await figma.clientStorage.setAsync(STORAGE_KEYS.inputValues, msg.values || null);
      } catch (e) {
        console.error("Failed to save input values", e);
      }
      break;
    }
    case "get-input-values": {
      try {
        const values = await figma.clientStorage.getAsync(STORAGE_KEYS.inputValues);
        figma.ui.postMessage({ type: "input-values-data", values: values || null });
      } catch (e) {
        console.error("Failed to load input values", e);
        figma.ui.postMessage({ type: "input-values-data", values: null });
      }
      break;
    }
    case "clear-history": {
      try {
        // Use STORAGE_KEYS constants (correct keys with prefix)
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.history);
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.lastReport);
        await figma.clientStorage.deleteAsync(STORAGE_KEYS.inputValues);
        // Send empty history back to UI
        figma.ui.postMessage({ type: "history-data", history: [] });
        figma.notify("✅ History and settings cleared");
      } catch (error) {
        console.error("Error clearing history:", error);
      }
      break;
    }
    case "extract-typography-styles": {
      try {
        const mode = msg.mode || "all"; // desktop, tablet, mobile, or all
        const textStyles = figma.getLocalTextStyles();
        const extractedStyles = [];
        
        for (const style of textStyles) {
          const styleName = style.name.toLowerCase();
          
          // Helper functions to detect device types
          const isMobile = styleName.includes("mobile") || styleName.includes("mob") || 
                          styleName.includes("m/") || styleName.endsWith("/m");
          const isTablet = styleName.includes("tablet") || styleName.includes("tab") || 
                          styleName.includes("t/") || styleName.endsWith("/t");
          
          // Filter based on mode
          if (mode === "desktop") {
            // Skip if name contains mobile or tablet
            if (isMobile || isTablet) {
              continue;
            }
          } else if (mode === "tablet") {
            // Only include if name contains tablet
            if (!isTablet) {
              continue;
            }
          } else if (mode === "mobile") {
            // Only include if name contains mobile
            if (!isMobile) {
              continue;
            }
          }
          // mode === "all" -> include everything
          
          // Get font name
          const fontFamily = style.fontName && style.fontName.family ? style.fontName.family : "Inter";
          const fontWeight = style.fontName && style.fontName.style ? style.fontName.style : "Regular";
          
          // Get font size (default to 16 if not set)
          const fontSize = typeof style.fontSize === "number" ? Math.round(style.fontSize) : 16;
          
          // Get line height
          let lineHeight = "150%";
          if (style.lineHeight && style.lineHeight.unit === "PERCENT") {
            lineHeight = Math.round(style.lineHeight.value) + "%";
          } else if (style.lineHeight && style.lineHeight.unit === "AUTO") {
            lineHeight = "auto";
          } else if (style.lineHeight && style.lineHeight.unit === "PIXELS" && fontSize) {
            const percentage = Math.round((style.lineHeight.value / fontSize) * 100);
            lineHeight = percentage + "%";
          }
          
          // Get letter spacing (default to 0)
          let letterSpacing = "0";
          if (style.letterSpacing && style.letterSpacing.unit === "PIXELS") {
            letterSpacing = String(Math.round(style.letterSpacing.value * 100) / 100);
          } else if (style.letterSpacing && style.letterSpacing.unit === "PERCENT") {
            letterSpacing = String(Math.round(style.letterSpacing.value * 10) / 10) + "%";
          }
          
          extractedStyles.push({
            name: style.name,
            styleId: style.id, // Store style ID for "Select" button
            fontFamily: fontFamily,
            fontSize: fontSize,
            fontWeight: fontWeight,
            lineHeight: lineHeight,
            letterSpacing: letterSpacing,
            wordSpacing: "0" // Figma doesn't expose word spacing in API
          });
        }
        
        const modeLabel = mode === "desktop" ? "Desktop" : 
                         mode === "tablet" ? "Tablet" : 
                         mode === "mobile" ? "Mobile" : "All";
        figma.ui.postMessage({ 
          type: "typography-styles-extracted", 
          styles: extractedStyles,
          mode: mode
        });
        
        if (extractedStyles.length === 0) {
          figma.notify(`⚠️ No ${modeLabel.toLowerCase()} text styles found`);
        } else {
          figma.notify(`✅ Extracted ${extractedStyles.length} ${modeLabel.toLowerCase()} text styles`);
        }
      } catch (error) {
        figma.notify(`❌ Error extracting text styles: ${error.message}`);
        console.error("Error extracting text styles:", error);
      }
      break;
    }
    case "select-text-style": {
      try {
        const styleId = msg.styleId;
        if (!styleId) {
          figma.notify("⚠️ No style ID provided");
          break;
        }
        
        // Find the text style
        const textStyle = figma.getStyleById(styleId);
        if (!textStyle || textStyle.type !== "TEXT") {
          figma.notify("⚠️ Text style not found");
          break;
        }
        
        // Find first text node using this style
        function findTextNodeWithStyle(node, targetStyleId) {
          if (node.type === "TEXT" && node.textStyleId === targetStyleId) {
            return node;
          }
          if ("children" in node) {
            for (const child of node.children) {
              const found = findTextNodeWithStyle(child, targetStyleId);
              if (found) return found;
            }
          }
          return null;
        }
        
        const textNode = findTextNodeWithStyle(figma.currentPage, styleId);
        if (textNode) {
          figma.currentPage.selection = [textNode];
          figma.viewport.scrollAndZoomIntoView([textNode]);
          figma.notify(`✅ Selected "${textNode.characters.slice(0, 30)}..." with style "${textStyle.name}"`);
        } else {
          figma.notify(`⚠️ No text using style "${textStyle.name}" found on this page`);
        }
      } catch (error) {
        figma.notify(`❌ Error: ${error.message}`);
        console.error("Error selecting text style:", error);
      }
      break;
    }
    case "fix-issue": {
      const issue = msg.issue;
      const issueId = issue ? issue.id : null;
      
      try {
        if (!issue) {
          throw new Error("No issue provided");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }

        // Check if node is in read-only mode
        try {
          if (node.type === "TEXT") {
            const testFontSize = node.fontSize;
            if (node.parent && "locked" in node.parent && node.parent.locked) {
              throw new Error("Node is locked");
            }
          }
        } catch (readOnlyError) {
          figma.notify("⚠️ Cannot fix: Node is in read-only mode. Please switch to Design Mode or unlock the node.");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Cannot fix: Node is in read-only mode. Please switch to Design Mode."
          });
          break;
        }

        // Handle typography fix
        if (issue.type === "typography-check" && issue.bestMatch) {
          // Check if custom fixData is provided
          if (msg.fixData) {
            // Apply custom fix data
            const fixData = msg.fixData;
            
            // Get font family and weight
            const fontFamily = fixData.fontFamily || "Inter";
            const fontWeight = fixData.fontWeight || "Regular";
            
            // Load font
            try {
              await figma.loadFontAsync({ family: fontFamily, style: fontWeight });
            } catch (fontError) {
              // Try Regular as fallback
              try {
                await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
              } catch (fallbackError) {
                throw new Error(`Font "${fontFamily}" could not be loaded. Please ensure it's installed.`);
              }
            }
            
            // Apply properties
            node.fontName = { family: fontFamily, style: fontWeight };
            node.fontSize = parseFloat(fixData.fontSize) || 16;
            
            // Set line height
            if (fixData.lineHeight === "auto") {
              node.lineHeight = { unit: "AUTO" };
            } else if (fixData.lineHeight.includes("%")) {
              const percent = parseFloat(fixData.lineHeight.replace("%", ""));
              if (!isNaN(percent)) {
                node.lineHeight = { unit: "PERCENT", value: percent };
              }
            } else if (fixData.lineHeight.includes("px")) {
              const px = parseFloat(fixData.lineHeight.replace("px", ""));
              if (!isNaN(px)) {
                node.lineHeight = { unit: "PIXELS", value: px };
              }
            }
            
            // Set letter spacing
            if (fixData.letterSpacing && fixData.letterSpacing !== "0") {
              if (fixData.letterSpacing.includes("%")) {
                const percent = parseFloat(fixData.letterSpacing.replace("%", ""));
                if (!isNaN(percent)) {
                  node.letterSpacing = { unit: "PERCENT", value: percent };
                }
              } else if (fixData.letterSpacing.includes("px")) {
                const px = parseFloat(fixData.letterSpacing.replace("px", ""));
                if (!isNaN(px)) {
                  node.letterSpacing = { unit: "PIXELS", value: px };
                }
              }
            }
            
            figma.notify(`✅ Fixed typography with custom values`);
            
            // Send success message to UI
            figma.ui.postMessage({
              type: "fix-issue-result",
              issueId: issueId,
              success: true,
              message: `✅ Fixed typography with custom values`
            });
          } else {
            // Use bestMatch (original behavior)
            await applyTypographyFix(node, issue.bestMatch);
            
            figma.notify(`✅ Fixed typography to match "${issue.bestMatch.name}"`);
            
            // Send success message to UI
            figma.ui.postMessage({
              type: "fix-issue-result",
              issueId: issueId,
              success: true,
              message: `✅ Fixed typography to match "${issue.bestMatch.name}"`
            });
          }
        } else if (msg.manualFix) {
          // Manual fix - show notification
          figma.notify(`⚠️ Manual fix required: ${msg.manualFix}`);
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: `⚠️ Manual fix required: ${msg.manualFix}`
          });
        } else {
          figma.notify("⚠️ Cannot auto-fix this issue type");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Cannot auto-fix this issue type"
          });
        }
      } catch (error) {
        figma.notify(`❌ Error fixing issue: ${error.message}`);
        console.error("Error fixing issue:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${error.message}`
        });
      }
      break;
    }
    case "fix-all-issues": {
      try {
        const issues = msg.issues || [];
        const issueType = msg.issueType || "unknown";
        let fixedCount = 0;
        let errorCount = 0;

        for (const issue of issues) {
          try {
            const nodeId = issue.id;
            const node = figma.getNodeById(nodeId);
            
            if (!node) {
              errorCount++;
              continue;
            }

            // Check if node is in read-only mode
            try {
              if (node.type === "TEXT") {
                const testFontSize = node.fontSize;
                if (node.parent && "locked" in node.parent && node.parent.locked) {
                  throw new Error("Node is locked");
                }
              }
            } catch (readOnlyError) {
              errorCount++;
              continue; // Skip this node
            }

            // Handle typography fix
            if (issue.type === "typography-check" && issue.bestMatch) {
              await applyTypographyFix(node, issue.bestMatch);
              fixedCount++;
            }
          } catch (error) {
            console.error("Error fixing issue:", error);
            errorCount++;
          }
        }

        if (fixedCount > 0) {
          const errorMsg = errorCount > 0 ? ` (${errorCount} failed - may be in read-only mode)` : "";
          figma.notify(`✅ Fixed ${fixedCount} issue(s) in ${issueType}${errorMsg}`);
        } else {
          figma.notify(`⚠️ No issues could be fixed. ${errorCount > 0 ? "Nodes may be in read-only mode. Please switch to Design Mode." : ""}`);
        }
      } catch (error) {
        figma.notify(`❌ Error fixing issues: ${error.message}`);
        console.error("Error fixing all issues:", error);
      }
      break;
    }
    case "create-text-style": {
      console.log("create-text-style handler called", msg);
      
      // Store issueId at the beginning to ensure it's available in catch block
      const issue = msg.issue;
      const issueId = issue ? issue.id : null;
      const styleName = msg.styleName;
      
      try {
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!styleName || !styleName.trim()) {
          throw new Error("Style name is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        console.log("create-text-style: node found", { nodeId, nodeType: node ? node.type : "null" });
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "create-text-style-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        if (node.type !== "TEXT") {
          figma.notify("⚠️ Node is not a text node");
          figma.ui.postMessage({
            type: "create-text-style-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a text node"
          });
          break;
        }
        
        // Get current text properties
        const fontName = node.fontName;
        const fontSize = node.fontSize;
        const lineHeight = node.lineHeight;
        const letterSpacing = node.letterSpacing;
        
        if (!fontName || typeof fontName !== "object" || !fontName.family) {
          throw new Error("Font information is missing or invalid");
        }
        
        // Load font first - handle font loading errors with fallback
        const fontFamily = fontName.family;
        const fontStyle = fontName.style || "Regular";
        let loadedFontName = fontName;
        
        // Map common style names that might not match exactly
        const styleMap = {
          "Semi Bold": "SemiBold",
          "SemiBold": "SemiBold",
          "Semi-Bold": "SemiBold",
          "Semi": "SemiBold"
        };
        const mappedStyle = styleMap[fontStyle] || fontStyle;
        
        try {
          // Try to load with the exact style from the node
          await figma.loadFontAsync(fontName);
        } catch (fontError) {
          // If exact style fails, try with mapped style name
          if (mappedStyle !== fontStyle) {
            try {
              console.warn(`Font style "${fontFamily} ${fontStyle}" not available, trying "${mappedStyle}"...`);
              await figma.loadFontAsync({ family: fontFamily, style: mappedStyle });
              loadedFontName = { family: fontFamily, style: mappedStyle };
            } catch (mappedError) {
              // If mapped style also fails, try Regular
              try {
                console.warn(`Font style "${fontFamily} ${mappedStyle}" not available, trying Regular...`);
                await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
                loadedFontName = { family: fontFamily, style: "Regular" };
              } catch (fallbackError) {
                const errorMsg = fallbackError && fallbackError.message ? fallbackError.message : `Font "${fontFamily}" could not be loaded`;
                throw new Error(`${errorMsg}. Please ensure the font "${fontFamily}" is installed in Figma.`);
              }
            }
          } else {
            // If no mapping, try Regular directly
            try {
              console.warn(`Font style "${fontFamily} ${fontStyle}" not available, trying Regular...`);
              await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
              loadedFontName = { family: fontFamily, style: "Regular" };
            } catch (fallbackError) {
              const errorMsg = fallbackError && fallbackError.message ? fallbackError.message : `Font "${fontFamily}" could not be loaded`;
              throw new Error(`${errorMsg}. Please ensure the font "${fontFamily}" is installed in Figma.`);
            }
          }
        }
        
        // Create text style
        const textStyle = figma.createTextStyle();
        textStyle.name = styleName.trim();
        // Use loaded font (may be different from original if fallback was used)
        textStyle.fontName = loadedFontName;
        textStyle.fontSize = fontSize;
        textStyle.lineHeight = lineHeight;
        textStyle.letterSpacing = letterSpacing;
        
        // Apply the style to the node
        node.textStyleId = textStyle.id;
        
        figma.notify(`✅ Created and applied text style "${styleName.trim()}"`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "create-text-style-result",
          issueId: issueId,
          success: true,
          message: `✅ Created and applied text style "${styleName.trim()}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error creating text style: ${errorMessage}`);
        console.error("Error creating text style:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "create-text-style-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "create-text-style-all": {
      try {
        const issues = msg.issues || [];
        const styleName = msg.styleName;
        let createdCount = 0;
        let errorCount = 0;
        const styleMap = new Map(); // Map to reuse styles for nodes with same properties
        
        for (const issue of issues) {
          const issueId = issue ? issue.id : null; // Store issueId for error handling
          
          try {
            if (!issue || !issue.id) {
              errorCount++;
              continue;
            }
            
            const nodeId = issue.id;
            const node = figma.getNodeById(nodeId);
            
            if (!node || node.type !== "TEXT") {
              errorCount++;
              figma.ui.postMessage({
                type: "create-text-style-result",
                issueId: issueId,
                success: false,
                message: "⚠️ Node is not a text node"
              });
              continue;
            }
            
            // Get current text properties
            const fontName = node.fontName;
            const fontSize = node.fontSize;
            const lineHeight = node.lineHeight;
            const letterSpacing = node.letterSpacing;
            
            if (!fontName || typeof fontName !== "object" || !fontName.family) {
              throw new Error("Font information is missing or invalid");
            }
            
            // Create a key for grouping nodes with same properties
            const styleKey = JSON.stringify({
              family: fontName.family,
              style: fontName.style,
              fontSize: fontSize,
              lineHeight: lineHeight ? JSON.stringify(lineHeight) : null,
              letterSpacing: letterSpacing ? JSON.stringify(letterSpacing) : null
            });
            
            // Get or create style for this property set
            let textStyle = styleMap.get(styleKey);
            if (!textStyle) {
              // Load font first - handle font loading errors with fallback
              const fontFamily = fontName.family;
              const fontStyle = fontName.style || "Regular";
              let loadedFontName = fontName;
              
              // Map common style names that might not match exactly
              const styleMap = {
                "Semi Bold": "SemiBold",
                "SemiBold": "SemiBold",
                "Semi-Bold": "SemiBold",
                "Semi": "SemiBold"
              };
              const mappedStyle = styleMap[fontStyle] || fontStyle;
              
              try {
                // Try to load with the exact style from the node
                await figma.loadFontAsync(fontName);
              } catch (fontError) {
                // If exact style fails, try with mapped style name
                if (mappedStyle !== fontStyle) {
                  try {
                    console.warn(`Font style "${fontFamily} ${fontStyle}" not available, trying "${mappedStyle}"...`);
                    await figma.loadFontAsync({ family: fontFamily, style: mappedStyle });
                    loadedFontName = { family: fontFamily, style: mappedStyle };
                  } catch (mappedError) {
                    // If mapped style also fails, try Regular
                    try {
                      console.warn(`Font style "${fontFamily} ${mappedStyle}" not available, trying Regular...`);
                      await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
                      loadedFontName = { family: fontFamily, style: "Regular" };
                    } catch (fallbackError) {
                      const errorMsg = fallbackError && fallbackError.message ? fallbackError.message : `Font "${fontFamily}" could not be loaded`;
                      throw new Error(`${errorMsg}. Please ensure the font "${fontFamily}" is installed in Figma.`);
                    }
                  }
                } else {
                  // If no mapping, try Regular directly
                  try {
                    console.warn(`Font style "${fontFamily} ${fontStyle}" not available, trying Regular...`);
                    await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
                    loadedFontName = { family: fontFamily, style: "Regular" };
                  } catch (fallbackError) {
                    const errorMsg = fallbackError && fallbackError.message ? fallbackError.message : `Font "${fontFamily}" could not be loaded`;
                    throw new Error(`${errorMsg}. Please ensure the font "${fontFamily}" is installed in Figma.`);
                  }
                }
              }
              
              // Create text style
              textStyle = figma.createTextStyle();
              // If multiple property sets, append suffix
              const finalStyleName = styleMap.size > 0 ? `${styleName.trim()} ${styleMap.size + 1}` : styleName.trim();
              textStyle.name = finalStyleName;
              // Use loaded font (may be different from original if fallback was used)
              textStyle.fontName = loadedFontName;
              textStyle.fontSize = fontSize;
              textStyle.lineHeight = lineHeight;
              textStyle.letterSpacing = letterSpacing;
              
              styleMap.set(styleKey, textStyle);
            }
            
            // Apply the style to the node
            node.textStyleId = textStyle.id;
            createdCount++;
            
            // Send success message for each node
            figma.ui.postMessage({
              type: "create-text-style-result",
              issueId: issueId,
              success: true,
              message: `✅ Applied text style "${textStyle.name}"`
            });
          } catch (error) {
            console.error("Error creating text style for node:", error);
            errorCount++;
            
            const errorMessage = error && error.message ? error.message : "Unknown error occurred";
            
            // Send error message
            figma.ui.postMessage({
              type: "create-text-style-result",
              issueId: issueId,
              success: false,
              message: `❌ Error: ${errorMessage}`
            });
          }
        }
        
        const stylesCreated = styleMap.size;
        if (createdCount > 0) {
          const styleMsg = stylesCreated > 1 ? `${stylesCreated} text styles` : `text style "${styleName.trim()}"`;
          figma.notify(`✅ Created ${styleMsg} and applied to ${createdCount} node(s)${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
        } else {
          figma.notify(`⚠️ No text styles could be created (${errorCount} errors)`);
        }
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error creating text styles: ${errorMessage}`);
        console.error("Error creating text styles:", error);
      }
      break;
    }
    case "apply-typography-style": {
      try {
        const issue = msg.issue;
        const style = msg.style;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!style) {
          throw new Error("Style data is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || node.type !== "TEXT") {
          figma.notify("⚠️ Node is not a text node");
          figma.ui.postMessage({
            type: "apply-typography-style-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a text node"
          });
          break;
        }
        
        // Map style properties to Figma format
        const fontFamily = style.fontFamily || "Inter";
        const fontSize = style.fontSize || 16;
        const fontWeight = style.fontWeight || "Regular";
        const lineHeight = style.lineHeight || "150%";
        const letterSpacing = style.letterSpacing || "0";
        
        // Map font weight to style
        const weightMap = {
          "Regular": "Regular",
          "Medium": "Medium",
          "Semi Bold": "SemiBold",
          "SemiBold": "SemiBold",
          "Bold": "Bold"
        };
        const fontStyle = weightMap[fontWeight] || fontWeight;
        
        // Load font
        try {
          await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
        } catch (fontError) {
          // Try Regular as fallback
          try {
            await figma.loadFontAsync({ family: fontFamily, style: "Regular" });
          } catch (fallbackError) {
            throw new Error(`Font "${fontFamily}" could not be loaded. Please ensure it's installed.`);
          }
        }
        
        // Apply style properties
        node.fontName = { family: fontFamily, style: fontStyle };
        node.fontSize = fontSize;
        
        // Set line height
        if (lineHeight === "auto") {
          node.lineHeight = { unit: "AUTO" };
        } else if (lineHeight.includes("%")) {
          const percent = parseFloat(lineHeight.replace("%", ""));
          if (!isNaN(percent)) {
            node.lineHeight = { unit: "PERCENT", value: percent };
          }
        } else {
          const px = parseFloat(lineHeight.replace("px", ""));
          if (!isNaN(px)) {
            node.lineHeight = { unit: "PIXELS", value: px };
          }
        }
        
        // Set letter spacing
        if (letterSpacing && letterSpacing !== "0") {
          if (letterSpacing.includes("%")) {
            const percent = parseFloat(letterSpacing.replace("%", ""));
            if (!isNaN(percent)) {
              node.letterSpacing = { unit: "PERCENT", value: percent };
            }
          } else {
            const px = parseFloat(letterSpacing.replace("px", ""));
            if (!isNaN(px)) {
              node.letterSpacing = { unit: "PIXELS", value: px };
            }
          }
        }
        
        figma.notify(`✅ Applied typography style "${style.name}"`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "apply-typography-style-result",
          issueId: issueId,
          success: true,
          message: `✅ Applied typography style "${style.name}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error applying style: ${errorMessage}`);
        console.error("Error applying typography style:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "apply-typography-style-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "get-figma-text-styles": {
      try {
        const textStyles = figma.getLocalTextStyles();
        const stylesList = [];
        
        for (const style of textStyles) {
          stylesList.push({
            id: style.id,
            name: style.name,
            fontFamily: style.fontName ? style.fontName.family : "Inter",
            fontWeight: style.fontName ? style.fontName.style : "Regular",
            fontSize: typeof style.fontSize === "number" ? Math.round(style.fontSize) : 16,
            lineHeight: style.lineHeight ? (style.lineHeight.unit === "PERCENT" ? `${Math.round(style.lineHeight.value)}%` : 
                                           style.lineHeight.unit === "AUTO" ? "auto" : 
                                           style.lineHeight.unit === "PIXELS" && style.fontSize ? `${Math.round((style.lineHeight.value / style.fontSize) * 100)}%` : "150%") : "150%",
            letterSpacing: style.letterSpacing ? (style.letterSpacing.unit === "PIXELS" ? `${Math.round(style.letterSpacing.value * 100) / 100}px` : 
                                                  style.letterSpacing.unit === "PERCENT" ? `${style.letterSpacing.value}%` : "0") : "0"
          });
        }
        
        // Sort by name
        stylesList.sort((a, b) => a.name.localeCompare(b.name));
        
        figma.ui.postMessage({
          type: "figma-text-styles-loaded",
          issueId: msg.issueId,
          styles: stylesList
        });
      } catch (error) {
        console.error("Error getting text styles:", error);
        figma.ui.postMessage({
          type: "figma-text-styles-loaded",
          issueId: msg.issueId,
          styles: [],
          error: error.message
        });
      }
      break;
    }
    case "apply-figma-text-style": {
      try {
        const issue = msg.issue;
        const styleId = msg.styleId;
        const styleName = msg.styleName;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!styleId) {
          throw new Error("Style ID is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || node.type !== "TEXT") {
          figma.notify("⚠️ Node is not a text node");
          figma.ui.postMessage({
            type: "apply-typography-style-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a text node"
          });
          break;
        }
        
        // Get the text style from Figma
        const textStyle = figma.getStyleById(styleId);
        if (!textStyle) {
          throw new Error(`Text style "${styleName}" not found`);
        }
        
        // Apply the text style directly
        node.textStyleId = styleId;
        
        figma.notify(`✅ Applied text style "${styleName}"`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "apply-typography-style-result",
          issueId: issueId,
          success: true,
          message: `✅ Applied text style "${styleName}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error applying style: ${errorMessage}`);
        console.error("Error applying Figma text style:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "apply-typography-style-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-color-issue": {
      try {
        const issue = msg.issue;
        const color = msg.color;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!color || !color.startsWith("#")) {
          throw new Error("Invalid color format");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        // Parse color hex to RGB
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        const newColor = { r: r, g: g, b: b };
        
        // Apply color to fills
        if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
          const fills = node.fills.map(fill => {
            if (fill.type === "SOLID" && fill.visible !== false) {
              return {
                type: "SOLID",
                color: newColor,
                opacity: fill.opacity !== undefined ? fill.opacity : 1,
                visible: fill.visible !== undefined ? fill.visible : true
              };
            }
            return fill;
          });
          node.fills = fills;
        }
        
        // Apply color to strokes
        if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
          const strokes = node.strokes.map(stroke => {
            if (stroke.type === "SOLID" && stroke.visible !== false) {
              return {
                type: "SOLID",
                color: newColor,
                opacity: stroke.opacity !== undefined ? stroke.opacity : 1,
                visible: stroke.visible !== undefined ? stroke.visible : true
              };
            }
            return stroke;
          });
          node.strokes = strokes;
        }
        
        figma.notify(`✅ Changed color to ${color}`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Changed color to ${color}`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing color: ${errorMessage}`);
        console.error("Error fixing color:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-spacing-issue": {
      try {
        const issue = msg.issue;
        const propertyName = msg.propertyName;
        const value = msg.value;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!propertyName || !["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing"].includes(propertyName)) {
          throw new Error("Invalid property name");
        }
        
        if (typeof value !== "number" || value < 0) {
          throw new Error("Invalid spacing value");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        // Check if node supports spacing properties (FRAME, COMPONENT, INSTANCE)
        if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") {
          throw new Error("Node does not support spacing properties");
        }
        
        // Check if auto-layout is enabled (required for both padding and itemSpacing)
        if (!node.layoutMode || node.layoutMode === "NONE") {
          throw new Error("Auto-layout is not enabled. Please enable auto-layout first.");
        }
        
        // Apply spacing value
        if (propertyName === "paddingLeft") {
          node.paddingLeft = value;
        } else if (propertyName === "paddingRight") {
          node.paddingRight = value;
        } else if (propertyName === "paddingTop") {
          node.paddingTop = value;
        } else if (propertyName === "paddingBottom") {
          node.paddingBottom = value;
        } else if (propertyName === "itemSpacing") {
          node.itemSpacing = value;
        }
        
        figma.notify(`✅ Changed ${propertyName} to ${value}px`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Changed ${propertyName} to ${value}px`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing spacing: ${errorMessage}`);
        console.error("Error fixing spacing:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-text-size-issue": {
      try {
        const issue = msg.issue;
        const fontSize = msg.fontSize;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (typeof fontSize !== "number" || fontSize < 14) {
          throw new Error("Font size must be at least 14px for ADA compliance");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || node.type !== "TEXT") {
          figma.notify("⚠️ Node is not a text node");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a text node"
          });
          break;
        }
        
        // Get current font info
        const fontName = issue.fontName || node.fontName || { family: "Inter", style: "Regular" };
        
        // Load font
        try {
          await figma.loadFontAsync(fontName);
        } catch (fontError) {
          // Try Regular as fallback
          try {
            await figma.loadFontAsync({ family: fontName.family, style: "Regular" });
            fontName.style = "Regular";
          } catch (fallbackError) {
            throw new Error(`Font "${fontName.family}" could not be loaded. Please ensure it's installed.`);
          }
        }
        
        // Apply font size
        node.fontSize = fontSize;
        node.fontName = fontName;
        
        figma.notify(`✅ Changed font size to ${fontSize}px`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Changed font size to ${fontSize}px`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing text size: ${errorMessage}`);
        console.error("Error fixing text size:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "get-contrast-colors": {
      try {
        const issue = msg.issue;
        const colors = [];
        
        // Helper function to resolve color value from variable (reuse from extract-color-variables)
        function resolveColorValueForContrast(variable) {
          try {
            const modes = variable.valuesByMode;
            if (!modes || Object.keys(modes).length === 0) return null;
            
            const firstMode = Object.keys(modes)[0];
            let value = modes[firstMode];
            
            // Handle aliases
            if (value && typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
              const referencedVar = figma.variables.getVariableById(value.id);
              if (referencedVar) {
                return resolveColorValueForContrast(referencedVar);
              }
              return null;
            }
            
            // Handle direct color
            if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
              const r = Math.round(value.r * 255);
              const g = Math.round(value.g * 255);
              const b = Math.round(value.b * 255);
              return "#" + r.toString(16).padStart(2, "0") + 
                         g.toString(16).padStart(2, "0") + 
                         b.toString(16).padStart(2, "0");
            }
            
            return null;
          } catch (e) {
            console.warn("Error resolving color value:", e);
            return null;
          }
        }
        
        // 1. Get from Variables (COLOR type)
        try {
          const variables = figma.variables.getLocalVariables();
          for (const variable of variables) {
            if (variable.resolvedType === "COLOR") {
              const colorValue = resolveColorValueForContrast(variable);
              if (colorValue) {
                colors.push({
                  source: "variable",
                  id: variable.id,
                  name: variable.name,
                  hex: colorValue.toUpperCase(),
                  variable: variable
                });
              }
            }
          }
        } catch (e) {
          console.warn("Error getting variables:", e);
        }
        
        // 2. Get from Paint Styles
        try {
          const paintStyles = figma.getLocalPaintStyles();
          for (const style of paintStyles) {
            if (style.paints && style.paints.length > 0) {
              const firstPaint = style.paints[0];
              if (firstPaint.type === "SOLID" && firstPaint.color) {
                const color = firstPaint.color;
                const r = Math.round(color.r * 255);
                const g = Math.round(color.g * 255);
                const b = Math.round(color.b * 255);
                const hex = "#" + r.toString(16).padStart(2, "0") + 
                                 g.toString(16).padStart(2, "0") + 
                                 b.toString(16).padStart(2, "0");
                colors.push({
                  source: "style",
                  id: style.id,
                  name: style.name,
                  hex: hex.toUpperCase(),
                  style: style
                });
              }
            }
          }
        } catch (e) {
          console.warn("Error getting paint styles:", e);
        }
        
        // 3. Get from input (will be added in UI)
        
        figma.ui.postMessage({
          type: "contrast-colors-loaded",
          issueId: issue.id,
          colors: colors
        });
      } catch (error) {
        console.error("Error getting contrast colors:", error);
        figma.ui.postMessage({
          type: "contrast-colors-loaded",
          issueId: msg.issue.id,
          colors: [],
          error: error.message
        });
      }
      break;
    }
    case "fix-contrast-issue": {
      try {
        const issue = msg.issue;
        const color = msg.color;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!color || !color.startsWith("#")) {
          throw new Error("Invalid color format");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || node.type !== "TEXT") {
          figma.notify("⚠️ Node is not a text node");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a text node"
          });
          break;
        }
        
        // Parse color hex to RGB
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        const newColor = { r: r, g: g, b: b };
        
        // Apply color to text fills
        if ("fills" in node && Array.isArray(node.fills) && node.fills.length > 0) {
          const fills = node.fills.map(fill => {
            if (fill.type === "SOLID" && fill.visible !== false) {
              return {
                type: "SOLID",
                color: newColor,
                opacity: fill.opacity !== undefined ? fill.opacity : 1,
                visible: fill.visible !== undefined ? fill.visible : true
              };
            }
            return fill;
          });
          node.fills = fills;
        } else {
          // If no fills, create one
          node.fills = [{
            type: "SOLID",
            color: newColor,
            opacity: 1,
            visible: true
          }];
        }
        
        figma.notify(`✅ Changed text color to ${color}`);
        
        // Send success message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Changed text color to ${color}`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing contrast: ${errorMessage}`);
        console.error("Error fixing contrast:", error);
        
        // Send error message to UI
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-empty-frame-issue": {
      try {
        const issue = msg.issue;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || (node.type !== "FRAME" && node.type !== "COMPONENT")) {
          figma.notify("⚠️ Node is not a frame or component");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a frame or component"
          });
          break;
        }
        
        // Check if frame has only one child
        if (!("children" in node) || node.children.length !== 1) {
          figma.notify("⚠️ Frame does not have exactly one child");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Frame does not have exactly one child"
          });
          break;
        }
        
        const child = node.children[0];
        const frameName = node.name || "";
        const childName = child.name || "";
        
        // Check if frame has meaningful name (not default Figma naming)
        const hasMeaningfulName = frameName && !/frame|group/i.test(frameName);
        
        // Check if frame has style config (fills, effects, etc.)
        const hasStyleConfig = hasVisualContent(node);
        
        // Check if frame has padding
        const hasPadding = (node.paddingLeft && node.paddingLeft > 0) ||
                          (node.paddingRight && node.paddingRight > 0) ||
                          (node.paddingTop && node.paddingTop > 0) ||
                          (node.paddingBottom && node.paddingBottom > 0);
        
        // Decision: Keep frame if it has meaningful name AND (style config OR padding)
        // Otherwise, remove frame and keep child
        if (hasMeaningfulName && (hasStyleConfig || hasPadding)) {
          figma.notify("✅ Frame kept (has meaningful name and style config)");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: true,
            message: "✅ Frame kept (has meaningful name and style config)"
          });
          break;
        }
        
        // Remove frame and keep child
        // Preserve meaningful name on child if frame has it
        if (hasMeaningfulName && !childName) {
          child.name = frameName;
        } else if (hasMeaningfulName && childName && childName !== frameName) {
          // If both have names, combine them intelligently
          child.name = `${frameName} ${childName}`;
        }
        
        // Move child to parent of frame
        const parent = node.parent;
        if (!parent || !("appendChild" in parent)) {
          throw new Error("Cannot remove frame: parent is not a valid container");
        }
        
        // Check if parent is an instance or inside an instance
        // Cannot modify instances or nodes inside instances
        let currentParent = parent;
        let instanceParent = null;
        while (currentParent && currentParent.type !== "PAGE") {
          if (currentParent.type === "INSTANCE") {
            instanceParent = currentParent;
            break;
          }
          if (currentParent.type === "COMPONENT") {
            instanceParent = currentParent;
            break;
          }
          currentParent = currentParent.parent;
        }
        
        if (instanceParent) {
          const parentName = instanceParent.name || "Unknown";
          throw new Error(`Cannot modify frame: The frame is inside a ${instanceParent.type === "INSTANCE" ? "component instance" : "component"} "${parentName}". To fix this, you need to edit the main component directly. Right-click the component and select "Edit Component" to enter Design Mode.`);
        }
        
        // Check if node itself is inside an instance
        if (isChildOfComponent(node)) {
          throw new Error("Cannot modify frame: The frame is inside a component instance. To fix this, right-click the component instance and select 'Edit Component' to enter Design Mode, then try again.");
        }
        
        try {
          // Calculate absolute position of child
          const absoluteX = node.x + (child.x || 0);
          const absoluteY = node.y + (child.y || 0);
          
          // Clone child to preserve it (since we'll remove the frame)
          const clonedChild = child.clone();
          
          // Set position relative to parent
          clonedChild.x = absoluteX;
          clonedChild.y = absoluteY;
          
          // Insert cloned child before frame in parent
          const frameIndex = parent.children.indexOf(node);
          parent.insertChild(frameIndex, clonedChild);
          
          // Remove frame (original child will be removed with frame)
          node.remove();
          
          figma.notify(`✅ Removed redundant frame, kept child "${clonedChild.name}"`);
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: true,
            message: `✅ Removed redundant frame, kept child "${clonedChild.name}"`
          });
        } catch (insertError) {
          // If insertChild fails, it might be because parent is read-only
          if (insertError.message && insertError.message.includes("instance")) {
            throw new Error("Cannot modify frame: The frame's parent is a component instance. To fix this, right-click the component instance and select 'Edit Component' to enter Design Mode, then try again.");
          }
          throw insertError;
        }
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing empty frame: ${errorMessage}`);
        console.error("Error fixing empty frame:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-autolayout-issue": {
      try {
        const issue = msg.issue;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node || (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE")) {
          figma.notify("⚠️ Node is not a frame, component, or instance");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a frame, component, or instance"
          });
          break;
        }
        
        // If node is an INSTANCE, or node is inside an INSTANCE, we need to enable auto-layout on the main component
        let targetNode = node;
        if (node.type === "INSTANCE" && node.mainComponent) {
          targetNode = node.mainComponent;
          console.log(`[fix-autolayout] Node is instance, using main component: ${targetNode.id}`);
        } else if (node.parent && node.parent.type === "INSTANCE" && node.parent.mainComponent) {
          // Node is inside an instance, need to find corresponding node in main component
          const instanceParent = node.parent;
          const mainComponent = instanceParent.mainComponent;
          
          // Try to find the corresponding node in main component by name or index
          if (mainComponent && "children" in mainComponent) {
            const nodeIndex = instanceParent.children.indexOf(node);
            if (nodeIndex >= 0 && nodeIndex < mainComponent.children.length) {
              targetNode = mainComponent.children[nodeIndex];
              console.log(`[fix-autolayout] Node is inside instance, using corresponding node in main component: ${targetNode.id}`);
            } else {
              // Try to find by name
              const nodeName = node.name;
              const matchingNode = mainComponent.children.find(child => child.name === nodeName);
              if (matchingNode) {
                targetNode = matchingNode;
                console.log(`[fix-autolayout] Node is inside instance, found by name in main component: ${targetNode.id}`);
              } else {
                throw new Error("Cannot enable auto-layout: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
              }
            }
          } else {
            throw new Error("Cannot enable auto-layout: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
          }
        }
        
        // Check if auto-layout is already enabled
        if (targetNode.layoutMode && targetNode.layoutMode !== "NONE") {
          figma.notify("✅ Auto-layout is already enabled");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: true,
            message: "✅ Auto-layout is already enabled"
          });
          break;
        }
        
        // Determine layout direction based on children arrangement
        // Use original node for calculation (to get correct positions)
        let layoutMode = "HORIZONTAL"; // Default
        if ("children" in node && node.children.length > 0) {
          const children = node.children;
          
          // Check if children are arranged horizontally or vertically
          if (children.length >= 2) {
            const firstChild = children[0];
            const secondChild = children[1];
            
            // Calculate distances
            const horizontalDistance = Math.abs((secondChild.x || 0) - (firstChild.x || 0));
            const verticalDistance = Math.abs((secondChild.y || 0) - (firstChild.y || 0));
            
            // If vertical distance is greater, use vertical layout
            if (verticalDistance > horizontalDistance) {
              layoutMode = "VERTICAL";
            }
          }
        }
        
        // Try to enable auto-layout directly - let Figma API handle permissions
        try {
          console.log(`[fix-autolayout] Before enable - layoutMode: ${targetNode.layoutMode}, node type: ${targetNode.type}, node id: ${targetNode.id}`);
          console.log(`[fix-autolayout] Node locked: ${targetNode.locked}, parent: ${targetNode.parent ? targetNode.parent.type : 'none'}`);
          
          // Check if node is locked
          if (targetNode.locked) {
            throw new Error("Cannot enable auto-layout: node is locked. Please unlock it first.");
          }
          
          // Try to enable auto-layout on target node (component if instance, or original node)
          try {
            targetNode.layoutMode = layoutMode;
          } catch (setError) {
            console.error(`[fix-autolayout] Error setting layoutMode:`, setError);
            throw new Error(`Cannot set layoutMode: ${setError.message || setError}. The node may be in read-only mode.`);
          }
          
          // Verify that auto-layout was actually enabled
          const verifyLayoutMode = targetNode.layoutMode;
          console.log(`[fix-autolayout] After enable - layoutMode: ${verifyLayoutMode}, expected: ${layoutMode}`);
          
          if (verifyLayoutMode === "NONE" || !verifyLayoutMode) {
            console.error(`[fix-autolayout] Failed to enable - layoutMode is still: ${verifyLayoutMode}`);
            // Try to get more info about why it failed
            console.error(`[fix-autolayout] Node info - type: ${targetNode.type}, locked: ${targetNode.locked}, parent type: ${targetNode.parent ? targetNode.parent.type : 'none'}`);
            throw new Error("Failed to enable auto-layout. The node may be locked, in read-only mode, or inside an instance. Please ensure you're in Design Mode and the node is editable.");
          }
          
          // Set default spacing (0) if not already set
          if (typeof targetNode.itemSpacing !== "number") {
            targetNode.itemSpacing = 0;
          }
          
          // Set default padding (0) if not already set
          if (typeof targetNode.paddingLeft !== "number") {
            targetNode.paddingLeft = 0;
          }
          if (typeof targetNode.paddingRight !== "number") {
            targetNode.paddingRight = 0;
          }
          if (typeof targetNode.paddingTop !== "number") {
            targetNode.paddingTop = 0;
          }
          if (typeof targetNode.paddingBottom !== "number") {
            targetNode.paddingBottom = 0;
          }
          
          // Final verify
          const finalLayoutMode = targetNode.layoutMode;
          console.log(`[fix-autolayout] Final verify - layoutMode: ${finalLayoutMode}, itemSpacing: ${targetNode.itemSpacing}`);
          
          figma.notify(`✅ Enabled auto-layout (${finalLayoutMode.toLowerCase()})`);
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: true,
            message: `✅ Enabled auto-layout (${finalLayoutMode.toLowerCase()})`
          });
        } catch (apiError) {
          // If Figma API throws error, it means we don't have permission
          const errorMessage = apiError && apiError.message ? apiError.message : "Unknown error";
          console.error("[fix-autolayout] Error enabling auto-layout:", apiError);
          throw new Error(`Cannot enable auto-layout: ${errorMessage}. Please ensure you're in Design Mode and the node is editable.`);
        }
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error enabling auto-layout: ${errorMessage}`);
        console.error("Error enabling auto-layout:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "fix-group-issue": {
      try {
        const issue = msg.issue;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        if (node.type !== "GROUP") {
          figma.notify("⚠️ Node is not a Group");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node is not a Group"
          });
          break;
        }
        
        // Check if node is locked
        if (node.locked) {
          throw new Error("Cannot convert group: node is locked. Please unlock it first.");
        }
        
        // Check if node is inside an instance
        if (node.parent && node.parent.type === "INSTANCE") {
          throw new Error("Cannot convert group: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
        }
        
        // Store group properties
        const groupName = node.name;
        const groupChildren = node.children.slice(); // Copy array
        const parent = node.parent;
        const groupIndex = parent && "children" in parent ? parent.children.indexOf(node) : -1;
        
        // Get group bounds
        const groupX = node.x;
        const groupY = node.y;
        
        // Create a new Frame to replace the Group
        const newFrame = figma.createFrame();
        newFrame.name = groupName;
        newFrame.x = groupX;
        newFrame.y = groupY;
        
        // Enable auto-layout on the new Frame first
        // Determine layout direction based on children arrangement
        let layoutMode = "HORIZONTAL"; // Default
        if (groupChildren.length > 0) {
          // Check if children are arranged more vertically or horizontally
          const firstChild = groupChildren[0];
          const lastChild = groupChildren[groupChildren.length - 1];
          const verticalDiff = Math.abs(lastChild.y - firstChild.y);
          const horizontalDiff = Math.abs(lastChild.x - firstChild.x);
          if (verticalDiff > horizontalDiff) {
            layoutMode = "VERTICAL";
          }
        }
        
        newFrame.layoutMode = layoutMode;
        newFrame.primaryAxisSizingMode = "AUTO";
        newFrame.counterAxisSizingMode = "AUTO";
        
        // Set default spacing
        newFrame.itemSpacing = 0;
        newFrame.paddingLeft = 0;
        newFrame.paddingRight = 0;
        newFrame.paddingTop = 0;
        newFrame.paddingBottom = 0;
        
        // Insert Frame into parent BEFORE moving children (so it's in the right position)
        if (parent && "children" in parent) {
          if (groupIndex >= 0) {
            parent.insertChild(groupIndex, newFrame);
          } else {
            parent.appendChild(newFrame);
          }
        }
        
        // Move children from Group to Frame
        // When we appendChild, the child is automatically removed from the Group
        for (const child of groupChildren) {
          try {
            newFrame.appendChild(child);
          } catch (e) {
            console.warn(`[fix-group] Could not append child ${child.name}:`, e);
          }
        }
        
        // Remove the old Group only if it still exists and has no children
        // In Figma, when all children are moved out, the Group might be auto-removed
        try {
          // Check if node still exists
          const nodeStillExists = figma.getNodeById(node.id);
          if (nodeStillExists && nodeStillExists.type === "GROUP") {
            // Check if Group has any children left
            if ("children" in nodeStillExists && nodeStillExists.children.length === 0) {
              try {
                nodeStillExists.remove();
                console.log("[fix-group] Successfully removed empty Group");
              } catch (removeError) {
                // Group might have been auto-removed, that's fine
                console.log("[fix-group] Group was already removed or doesn't exist:", removeError.message);
              }
            } else if ("children" in nodeStillExists && nodeStillExists.children.length > 0) {
              // Some children couldn't be moved, try to move remaining ones
              console.log(`[fix-group] Group still has ${nodeStillExists.children.length} children, trying to move them`);
              const remainingChildren = nodeStillExists.children.slice();
              for (const remainingChild of remainingChildren) {
                try {
                  newFrame.appendChild(remainingChild);
                } catch (e) {
                  console.warn(`[fix-group] Could not move remaining child ${remainingChild.name}:`, e);
                }
              }
              // Try to remove again after moving remaining children
              try {
                const nodeCheck = figma.getNodeById(node.id);
                if (nodeCheck && nodeCheck.type === "GROUP") {
                  if ("children" in nodeCheck && nodeCheck.children.length === 0) {
                    nodeCheck.remove();
                    console.log("[fix-group] Successfully removed Group after moving remaining children");
                  } else {
                    console.warn(`[fix-group] Group still has ${nodeCheck.children.length} children, cannot remove`);
                  }
                }
              } catch (removeError) {
                // Group might have been auto-removed, that's fine
                console.log("[fix-group] Group was already removed or doesn't exist:", removeError.message);
              }
            }
          } else {
            console.log("[fix-group] Group was already removed or converted (node no longer exists or is not a GROUP)");
          }
        } catch (removeError) {
          // Group might have been auto-removed when children were moved, that's fine
          console.log("[fix-group] Group was already removed or doesn't exist:", removeError.message);
        }
        
        // Always send success message even if Group removal had issues
        // The conversion to Frame is the main goal, and that was successful
        figma.notify(`✅ Converted Group to Frame with Auto-layout (${layoutMode.toLowerCase()})`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Converted Group to Frame with Auto-layout (${layoutMode.toLowerCase()})`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error converting group: ${errorMessage}`);
        console.error("Error converting group:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "extract-color-styles": {
      try {
        const paintStyles = figma.getLocalPaintStyles();
        const extractedColors = [];
        
        for (const style of paintStyles) {
          // Only process solid color paints
          if (style.paints && style.paints.length > 0) {
            const firstPaint = style.paints[0];
            
            if (firstPaint.type === "SOLID" && firstPaint.color) {
              const color = firstPaint.color;
              const r = Math.round(color.r * 255);
              const g = Math.round(color.g * 255);
              const b = Math.round(color.b * 255);
              const hex = "#" + r.toString(16).padStart(2, "0") + 
                               g.toString(16).padStart(2, "0") + 
                               b.toString(16).padStart(2, "0");
              
              extractedColors.push({
                name: style.name,
                hex: hex.toUpperCase()
              });
            }
          }
        }
        
        figma.ui.postMessage({ 
          type: "color-styles-extracted", 
          colors: extractedColors 
        });
        
        if (extractedColors.length === 0) {
          figma.notify("⚠️ No color styles found in this file");
        } else {
          figma.notify(`✅ Extracted ${extractedColors.length} color styles`);
        }
      } catch (error) {
        figma.notify(`❌ Error extracting color styles: ${error.message}`);
        console.error("Error extracting color styles:", error);
      }
      break;
    }
    case "extract-color-variables": {
      try {
        const variables = figma.variables.getLocalVariables();
        const extractedColors = [];
        const processedIds = new Set(); // Track processed variables to avoid duplicates
        
        // Helper function to resolve color value from variable
        function resolveColorValue(variable, modeId) {
          try {
            const value = variable.valuesByMode[modeId];
            
            // If value is a reference to another variable (alias)
            if (value && typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
              const referencedVar = figma.variables.getVariableById(value.id);
              if (referencedVar && referencedVar.resolvedType === "COLOR") {
                // Recursively resolve the referenced variable
                return resolveColorValue(referencedVar, modeId);
              }
              return null;
            }
            
            // If value is a direct color (RGBA object)
            if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
              return value;
            }
            
            return null;
          } catch (e) {
            return null;
          }
        }
        
        for (const variable of variables) {
          // Only process COLOR type variables
          if (variable.resolvedType === "COLOR" && !processedIds.has(variable.id)) {
            processedIds.add(variable.id);
            
            // Get all modes (e.g., light, dark)
            const modeIds = variable.valuesByMode ? Object.keys(variable.valuesByMode) : [];
            
            if (modeIds.length > 0) {
              // Use the first available mode (usually "default" or first mode)
              const firstModeId = modeIds[0];
              const colorValue = resolveColorValue(variable, firstModeId);
              
              if (colorValue) {
                const r = Math.round(colorValue.r * 255);
                const g = Math.round(colorValue.g * 255);
                const b = Math.round(colorValue.b * 255);
                const hex = "#" + r.toString(16).padStart(2, "0") + 
                                 g.toString(16).padStart(2, "0") + 
                                 b.toString(16).padStart(2, "0");
                
                extractedColors.push({
                  name: variable.name,
                  hex: hex.toUpperCase()
                });
              }
            }
          }
        }
        
        figma.ui.postMessage({ 
          type: "color-variables-extracted", 
          colors: extractedColors 
        });
        
        if (extractedColors.length === 0) {
          figma.notify("⚠️ No color variables found in this file");
        } else {
          figma.notify(`✅ Extracted ${extractedColors.length} color variables`);
        }
      } catch (error) {
        figma.notify(`❌ Error extracting color variables: ${error.message}`);
        console.error("Error extracting color variables:", error);
      }
      break;
    }
    case "close":
      figma.closePlugin();
      break;
    case "fix-position-issue": {
      try {
        const issue = msg.issue;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        // If node is inside an instance, try to find corresponding node in main component
        let targetNode = node;
        if (node.parent && node.parent.type === "INSTANCE" && node.parent.mainComponent) {
          // Node is inside an instance, need to find corresponding node in main component
          const instanceParent = node.parent;
          const mainComponent = instanceParent.mainComponent;
          
          // Try to find the corresponding node in main component by name or index
          if (mainComponent && "children" in mainComponent) {
            const nodeIndex = instanceParent.children.indexOf(node);
            if (nodeIndex >= 0 && nodeIndex < mainComponent.children.length) {
              targetNode = mainComponent.children[nodeIndex];
              console.log(`[fix-position] Node is inside instance, using corresponding node in main component: ${targetNode.id}`);
            } else {
              // Try to find by name
              const nodeName = node.name;
              const matchingNode = mainComponent.children.find(child => child.name === nodeName);
              if (matchingNode) {
                targetNode = matchingNode;
                console.log(`[fix-position] Node is inside instance, found by name in main component: ${targetNode.id}`);
              } else {
                throw new Error("Cannot fix position: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
              }
            }
          } else {
            throw new Error("Cannot fix position: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
          }
        }
        
        // Check if target node is an INSTANCE - cannot override position in instances
        if (targetNode.type === "INSTANCE") {
          throw new Error("Cannot fix position: the node is an instance. Position properties cannot be overridden in instances. Please edit the main component directly.");
        }
        
        // Check if target node is locked
        if (targetNode.locked) {
          throw new Error("Cannot fix position: node is locked. Please unlock it first.");
        }
        
        // Try to set position to (0, 0) - wrap in try-catch to handle API errors
        try {
          targetNode.x = 0;
          targetNode.y = 0;
        } catch (apiError) {
          const errorMessage = apiError && apiError.message ? apiError.message : "Unknown error";
          console.error("[fix-position] Error setting position:", apiError);
          throw new Error(`Cannot fix position: ${errorMessage}. The node may be inside an instance or have restricted properties.`);
        }
        
        figma.notify(`✅ Fixed position to (0, 0) for "${targetNode.name}"`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Fixed position to (0, 0) for "${targetNode.name}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error fixing position: ${errorMessage}`);
        console.error("Error fixing position:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: msg.issue ? msg.issue.id : null,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "remove-position-layer": {
      try {
        const issue = msg.issue;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        // If node is inside an instance, try to find corresponding node in main component
        let targetNode = node;
        if (node.parent && node.parent.type === "INSTANCE" && node.parent.mainComponent) {
          // Node is inside an instance, need to find corresponding node in main component
          const instanceParent = node.parent;
          const mainComponent = instanceParent.mainComponent;
          
          // Try to find the corresponding node in main component by name or index
          if (mainComponent && "children" in mainComponent) {
            const nodeIndex = instanceParent.children.indexOf(node);
            if (nodeIndex >= 0 && nodeIndex < mainComponent.children.length) {
              targetNode = mainComponent.children[nodeIndex];
              console.log(`[remove-position] Node is inside instance, using corresponding node in main component: ${targetNode.id}`);
            } else {
              // Try to find by name
              const nodeName = node.name;
              const matchingNode = mainComponent.children.find(child => child.name === nodeName);
              if (matchingNode) {
                targetNode = matchingNode;
                console.log(`[remove-position] Node is inside instance, found by name in main component: ${targetNode.id}`);
              } else {
                throw new Error("Cannot remove layer: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
              }
            }
          } else {
            throw new Error("Cannot remove layer: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
          }
        }
        
        // Check if target node is an INSTANCE - cannot remove instances directly
        if (targetNode.type === "INSTANCE") {
          throw new Error("Cannot remove layer: the node is an instance. Please edit the main component directly to remove it.");
        }
        
        // Check if target node is locked
        if (targetNode.locked) {
          throw new Error("Cannot remove layer: node is locked. Please unlock it first.");
        }
        
        // Store node name for notification
        const nodeName = targetNode.name;
        
        // Try to remove the node - wrap in try-catch to handle API errors
        try {
          targetNode.remove();
        } catch (apiError) {
          const errorMessage = apiError && apiError.message ? apiError.message : "Unknown error";
          console.error("[remove-position] Error removing node:", apiError);
          throw new Error(`Cannot remove layer: ${errorMessage}. The node may be inside an instance or have restricted properties.`);
        }
        
        figma.notify(`✅ Removed layer "${nodeName}"`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Removed layer "${nodeName}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error removing layer: ${errorMessage}`);
        console.error("Error removing layer:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: msg.issue ? msg.issue.id : null,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "get-components-for-issue": {
      try {
        console.log("[get-components-for-issue] Received request", msg);
        const issue = msg.issue;
        if (!issue || !issue.id) {
          console.error("[get-components-for-issue] Invalid issue data", issue);
          throw new Error("Invalid issue data");
        }
        
        console.log("[get-components-for-issue] Issue ID:", issue.id);
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          console.warn("[get-components-for-issue] Node not found for ID:", nodeId);
          figma.ui.postMessage({
            type: "components-for-issue-loaded",
            issueId: issue.id,
            similarComponents: []
          });
          break;
        }
        
        console.log("[get-components-for-issue] Node found:", node.name, node.type);
        
        // Get all components from cache (or collect if cache miss)
        const allComponents = collectAllComponents();
        
        // Show loading notification only if we had to scan (cache miss)
        if (componentCache.timestamp === Date.now() || componentCache.components.length === 0) {
          figma.notify("⏳ Finding similar components...", { timeout: 1000 });
        }
        
        console.log("[get-components-for-issue] Found", allComponents.length, "components in document");
        
        // Find similar components based on name and structure
        // Simple matching: check if component name is similar to node name
        const nodeName = (node.name || "").toLowerCase();
        const similarComponents = allComponents
          .filter(comp => {
            const compName = (comp.name || "").toLowerCase();
            // Check if names are similar (contain same words or substring)
            return compName.includes(nodeName) || nodeName.includes(compName) || 
                   compName.split(/[\s-_]+/).some(word => nodeName.includes(word)) ||
                   nodeName.split(/[\s-_]+/).some(word => compName.includes(word));
          })
          .slice(0, 5); // Limit to 5 most similar
        
        console.log("[get-components-for-issue] Found", similarComponents.length, "similar components");
        console.log("[get-components-for-issue] Sending response with issueId:", issue.id);
        
        figma.ui.postMessage({
          type: "components-for-issue-loaded",
          issueId: issue.id,
          similarComponents: similarComponents
        });
      } catch (error) {
        console.error("Error getting components for issue:", error);
        figma.ui.postMessage({
          type: "components-for-issue-loaded",
          issueId: msg.issue ? msg.issue.id : null,
          similarComponents: []
        });
      }
      break;
    }
    case "get-all-components": {
      try {
        console.log("[get-all-components] Received request", msg);
        const issue = msg.issue;
        console.log("[get-all-components] Issue:", issue);
        
        // Get all components from cache (or collect if cache miss)
        const allComponents = collectAllComponents();
        
        // Show loading notification only if we had to scan (cache miss)
        if (componentCache.timestamp === Date.now() || componentCache.components.length === 0) {
          figma.notify("⏳ Loading components...", { timeout: 1000 });
        }
        
        const issueId = issue ? issue.id : null;
        console.log("[get-all-components] Sending response with issueId:", issueId);
        
        figma.ui.postMessage({
          type: "all-components-loaded",
          issueId: issueId,
          components: allComponents
        });
      } catch (error) {
        console.error("Error getting all components:", error);
        figma.notify(`❌ Error loading components: ${error.message}`, { timeout: 3000 });
        figma.ui.postMessage({
          type: "all-components-loaded",
          issueId: msg.issue ? msg.issue.id : null,
          components: []
        });
      }
      break;
    }
    case "create-component-from-issue": {
      try {
        const issue = msg.issue;
        const componentName = msg.componentName;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!componentName || !componentName.trim()) {
          throw new Error("Component name is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          throw new Error("Node not found");
        }
        
        if (node.type !== "FRAME") {
          throw new Error("Only frames can be converted to components");
        }
        
        // Convert frame to component
        // Clone the frame first to preserve it
        const clonedFrame = node.clone();
        
        // Create component from cloned frame
        // Note: Figma API doesn't have direct convert, so we create new component and copy properties
        const newComponent = figma.createComponent();
        newComponent.name = componentName.trim();
        
        // Copy basic properties
        newComponent.resize(node.width, node.height);
        if ("fills" in node && "fills" in newComponent) {
          newComponent.fills = node.fills;
        }
        if ("effects" in node && "effects" in newComponent) {
          newComponent.effects = node.effects;
        }
        if ("layoutMode" in node && "layoutMode" in newComponent) {
          newComponent.layoutMode = node.layoutMode;
        }
        if ("itemSpacing" in node && "itemSpacing" in newComponent) {
          newComponent.itemSpacing = node.itemSpacing;
        }
        if ("paddingLeft" in node && "paddingLeft" in newComponent) {
          newComponent.paddingLeft = node.paddingLeft;
        }
        if ("paddingRight" in node && "paddingRight" in newComponent) {
          newComponent.paddingRight = node.paddingRight;
        }
        if ("paddingTop" in node && "paddingTop" in newComponent) {
          newComponent.paddingTop = node.paddingTop;
        }
        if ("paddingBottom" in node && "paddingBottom" in newComponent) {
          newComponent.paddingBottom = node.paddingBottom;
        }
        
        // Clone and append children
        for (const child of node.children) {
          const cloned = child.clone();
          newComponent.appendChild(cloned);
        }
        
        // Get parent and index before removing
        const parent = node.parent;
        const index = parent.children.indexOf(node);
        
        // Insert new component in the same parent
        parent.insertChild(index, newComponent);
        
        // Replace original node with instance of new component
        const instance = newComponent.createInstance();
        instance.x = node.x;
        instance.y = node.y;
        instance.name = node.name; // Keep original name
        
        // Insert instance after component
        parent.insertChild(index + 1, instance);
        
        // Remove original node
        node.remove();
        
        // Remove cloned frame (we don't need it)
        clonedFrame.remove();
        
        // Add new component to cache
        addComponentToCache({
          id: newComponent.id,
          name: newComponent.name,
          description: newComponent.description || ""
        });
        
        figma.notify(`✅ Created component "${componentName.trim()}" and replaced frame`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Created component "${componentName.trim()}" and replaced frame`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error creating component: ${errorMessage}`);
        console.error("Error creating component:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: msg.issue ? msg.issue.id : null,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "apply-component-to-issue": {
      try {
        const issue = msg.issue;
        const componentId = msg.componentId;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!componentId) {
          throw new Error("Component ID is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        const component = figma.getNodeById(componentId);
        
        if (!node) {
          throw new Error("Node not found");
        }
        
        if (!component || component.type !== "COMPONENT") {
          throw new Error("Component not found");
        }
        
        if (node.type !== "FRAME") {
          throw new Error("Only frames can be replaced with component instances");
        }
        
        // Create instance of component
        const instance = component.createInstance();
        instance.x = node.x;
        instance.y = node.y;
        instance.name = node.name; // Keep original name
        
        // Insert instance in the same parent
        const parent = node.parent;
        const index = parent.children.indexOf(node);
        parent.insertChild(index, instance);
        
        // Remove original node
        node.remove();
        
        figma.notify(`✅ Replaced frame with component "${component.name}"`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Replaced frame with component "${component.name}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error applying component: ${errorMessage}`);
        console.error("Error applying component:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: msg.issue ? msg.issue.id : null,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    case "rename-node": {
      try {
        const issue = msg.issue;
        const newName = msg.newName;
        const issueId = issue ? issue.id : null;
        
        if (!issue || !issue.id) {
          throw new Error("Invalid issue data");
        }
        
        if (!newName || !newName.trim()) {
          throw new Error("Name is required");
        }
        
        const nodeId = issue.id;
        const node = figma.getNodeById(nodeId);
        
        if (!node) {
          figma.notify("⚠️ Node not found");
          figma.ui.postMessage({
            type: "fix-issue-result",
            issueId: issueId,
            success: false,
            message: "⚠️ Node not found"
          });
          break;
        }
        
        // Check if node is locked
        if (node.locked) {
          throw new Error("Cannot rename: node is locked. Please unlock it first.");
        }
        
        // Check if node is inside an instance
        if (node.parent && node.parent.type === "INSTANCE") {
          throw new Error("Cannot rename: node is inside an instance. Please switch to Design Mode and edit the main component directly.");
        }
        
        // Store old name
        const oldName = node.name || "Unnamed";
        
        // Rename the node
        node.name = newName.trim();
        
        figma.notify(`✅ Renamed "${oldName}" to "${newName.trim()}"`);
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: true,
          message: `✅ Renamed to "${newName.trim()}"`
        });
      } catch (error) {
        const errorMessage = error && error.message ? error.message : "Unknown error occurred";
        figma.notify(`❌ Error renaming: ${errorMessage}`);
        console.error("Error renaming node:", error);
        
        figma.ui.postMessage({
          type: "fix-issue-result",
          issueId: issueId,
          success: false,
          message: `❌ Error: ${errorMessage}`
        });
      }
      break;
    }
    default:
      break;
  }
};

console.log("code.js loaded");
