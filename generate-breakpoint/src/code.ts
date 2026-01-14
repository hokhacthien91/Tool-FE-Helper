// ============================================================================
// MAIN PLUGIN CODE
// Thien Assist - Multi-purpose Figma plugin for FE developers
// ============================================================================

import {
  PluginConfig,
  PluginMessage,
  UIMessage,
  TransformResult,
  TransformStats,
  ValidationResult,
  AvailableMobileFrame,
  DEFAULT_CONFIG,
  isTextNode,
  hasChildren,
  QAConfig,
  QAIssue,
  QAScanResult,
  IssueGroup,
  IssueCategory,
  DesignTokens,
  ColorToken,
  DEFAULT_QA_CONFIG,
  GifExportConfig,
  GifSelectionInfo,
  GifFrameData,
} from './types';

// ============================================================================
// PLUGIN INITIALIZATION
// ============================================================================

figma.showUI(__html__, {
  width: 550,
  height: 600,
  title: 'Thien Assist',
  themeColors: true,
});

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const SETTINGS_KEY = 'pluginSettings';
const MUTED_FRAMES_KEY = 'mutedFrames';

// Load saved settings and muted frames, send to UI
(async () => {
  const savedConfig = await loadSettings();
  const savedMutedFrames = await loadMutedFrames();
  sendToUI({ type: 'SETTINGS_LOADED', config: savedConfig });
  sendToUI({ type: 'MUTED_FRAMES_LOADED', mutedFrames: savedMutedFrames });
})();

async function saveSettings(config: PluginConfig): Promise<void> {
  try {
    await figma.clientStorage.setAsync(SETTINGS_KEY, config);
    console.log('✓ Settings saved:', config);
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

async function loadSettings(): Promise<PluginConfig> {
  try {
    console.log(`🔍 Loading settings with key: "${SETTINGS_KEY}"`);
    const config = await figma.clientStorage.getAsync(SETTINGS_KEY);
    console.log('🔍 Raw value from storage:', config);

    if (config) {
      console.log('✓ Settings loaded:', config);
      return config as PluginConfig;
    } else {
      console.log('⚠️ No saved settings found, using defaults');
    }
  } catch (e) {
    console.error('❌ Failed to load settings:', e);
  }
  console.log('📋 Returning DEFAULT_CONFIG:', DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

// ============================================================================
// MUTED FRAMES PERSISTENCE
// ============================================================================

async function saveMutedFrames(): Promise<void> {
  try {
    // Convert Map to plain object for storage
    const obj: Record<string, 'skip' | 'keep'> = {};
    mutedFrames.forEach((action, name) => {
      obj[name] = action;
    });
    await figma.clientStorage.setAsync(MUTED_FRAMES_KEY, obj);
    console.log('✓ Muted frames saved:', obj);
  } catch (e) {
    console.error('Failed to save muted frames:', e);
  }
}

async function loadMutedFrames(): Promise<Record<string, 'skip' | 'keep'>> {
  try {
    const saved = await figma.clientStorage.getAsync(MUTED_FRAMES_KEY);
    if (saved && typeof saved === 'object') {
      // Restore to the global mutedFrames Map
      Object.entries(saved as Record<string, 'skip' | 'keep'>).forEach(([name, action]) => {
        mutedFrames.set(name, action);
      });
      console.log('✓ Muted frames loaded:', saved);
      return saved as Record<string, 'skip' | 'keep'>;
    }
  } catch (e) {
    console.error('Failed to load muted frames:', e);
  }
  return {};
}

// ============================================================================
// MANUAL FRAME HELPERS
// ============================================================================

/**
 * Get frame info for a single frame node
 */
function getFrameInfo(frame: FrameNode | SectionNode | InstanceNode): AvailableMobileFrame {
  let manualSectionCount = 0;

  if (hasChildren(frame)) {
    for (const child of frame.children) {
      if (child.name.toLowerCase().endsWith('- manual')) {
        manualSectionCount++;
      }
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    manualSectionCount,
  };
}

/**
 * Send info about currently selected frame (for "Add Selected Frame" button)
 */
function sendSelectedFrameInfo(): void {
  const selection = figma.currentPage.selection;

  // Get the first valid frame
  const validFrame = selection.find(
    node => node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'INSTANCE'
  ) as FrameNode | SectionNode | InstanceNode | undefined;

  if (validFrame) {
    const frameInfo = getFrameInfo(validFrame);
    sendToUI({ type: 'SELECTED_FRAME_INFO', frame: frameInfo });
    console.log(`✓ Selected frame: ${frameInfo.name} (${frameInfo.manualSectionCount} manual sections)`);
  } else {
    sendToUI({ type: 'SELECTED_FRAME_INFO' });
    console.log('⊗ No valid frame selected');
  }
}

/**
 * Send info about multiple frames by their IDs (for restoring saved settings)
 */
function sendManualFramesInfo(frameIds: string[]): void {
  const frames: AvailableMobileFrame[] = [];

  for (const frameId of frameIds) {
    try {
      const node = figma.getNodeById(frameId);
      if (node && (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'INSTANCE')) {
        frames.push(getFrameInfo(node as FrameNode | SectionNode | InstanceNode));
      }
    } catch (e) {
      console.warn(`⊗ Frame with ID ${frameId} not found`);
    }
  }

  sendToUI({ type: 'MANUAL_FRAMES_INFO', frames });
  console.log(`✓ Loaded ${frames.length} manual frames from saved settings`);
}

/**
 * Send detailed node info for Inspector tab
 */
async function sendNodeInfo(): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'NODE_INFO',
      hasSelection: false
    });
    return;
  }

  const node = selection[0];

  // Build node JSON structure
  const nodeJson = buildNodeJson(node);

  // Get preview image
  let previewImage: string | null = null;
  try {
    if ('exportAsync' in node) {
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'WIDTH', value: 300 }
      });
      const base64 = figma.base64Encode(bytes);
      previewImage = `data:image/png;base64,${base64}`;
    }
  } catch (e) {
    console.log('Failed to export preview:', e);
  }

  // Get position and size
  const x = 'x' in node ? Math.round(node.x) : undefined;
  const y = 'y' in node ? Math.round(node.y) : undefined;
  const width = 'width' in node ? Math.round(node.width) : undefined;
  const height = 'height' in node ? Math.round(node.height) : undefined;

  // Get padding (only for frames with auto-layout)
  let paddingLeft: number | undefined;
  let paddingRight: number | undefined;
  let paddingTop: number | undefined;
  let paddingBottom: number | undefined;

  if ('paddingLeft' in node) {
    paddingLeft = (node as FrameNode).paddingLeft;
    paddingRight = (node as FrameNode).paddingRight;
    paddingTop = (node as FrameNode).paddingTop;
    paddingBottom = (node as FrameNode).paddingBottom;
  }

  figma.ui.postMessage({
    type: 'NODE_INFO',
    hasSelection: true,
    nodeName: node.name,
    nodeType: node.type,
    x,
    y,
    width,
    height,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    previewImage,
    nodeJson
  });
}

/**
 * Build JSON representation of a node and its children
 */
function buildNodeJson(node: SceneNode, depth: number = 0): any {
  const MAX_DEPTH = 5; // Limit depth to avoid huge JSON

  const json: any = {
    name: node.name,
    type: node.type,
  };

  // Add position and size
  if ('x' in node) json.x = Math.round(node.x);
  if ('y' in node) json.y = Math.round(node.y);
  if ('width' in node) json.width = Math.round(node.width);
  if ('height' in node) json.height = Math.round(node.height);

  // Add layout properties for frames
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frameNode = node as FrameNode;

    if (frameNode.layoutMode !== 'NONE') {
      json.layoutMode = frameNode.layoutMode;
      json.primaryAxisSizingMode = frameNode.primaryAxisSizingMode;
      json.counterAxisSizingMode = frameNode.counterAxisSizingMode;
      json.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
      json.counterAxisAlignItems = frameNode.counterAxisAlignItems;
      json.itemSpacing = frameNode.itemSpacing;
      json.paddingLeft = frameNode.paddingLeft;
      json.paddingRight = frameNode.paddingRight;
      json.paddingTop = frameNode.paddingTop;
      json.paddingBottom = frameNode.paddingBottom;
    }

    if ('layoutSizingHorizontal' in frameNode) {
      json.layoutSizingHorizontal = frameNode.layoutSizingHorizontal;
      json.layoutSizingVertical = frameNode.layoutSizingVertical;
    }

    if ('layoutPositioning' in frameNode) {
      json.layoutPositioning = frameNode.layoutPositioning;
    }

    if ('constraints' in frameNode) {
      json.constraints = frameNode.constraints;
    }
  }

  // Add text properties
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    json.characters = textNode.characters.substring(0, 100) + (textNode.characters.length > 100 ? '...' : '');
    if (typeof textNode.fontSize === 'number') {
      json.fontSize = textNode.fontSize;
    }
  }

  // Add children (with depth limit), skip hidden nodes
  if (depth < MAX_DEPTH && 'children' in node) {
    const children = (node as FrameNode).children.filter(child => child.visible !== false);
    if (children.length > 0) {
      json.children = children.map(child => buildNodeJson(child, depth + 1));
    }
  } else if (depth >= MAX_DEPTH && 'children' in node) {
    const visibleChildren = (node as FrameNode).children.filter(child => child.visible !== false);
    if (visibleChildren.length > 0) {
      json.childrenCount = visibleChildren.length;
      json._note = 'Children truncated (max depth reached)';
    }
  }

  return json;
}

// ============================================================================
// SELECTION HANDLING
// ============================================================================

function sendSelectionInfo(): void {
  const selection = figma.currentPage.selection;

  // Debug: Log selection types
  console.log('Selection count:', selection.length);
  selection.forEach((node, i) => {
    console.log(`Node ${i}: name="${node.name}", type="${node.type}"`);
  });

  // Filter valid frame types (FRAME, SECTION, COMPONENT, INSTANCE)
  const validFrames = selection.filter(
    node => node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  // Check for text node selection
  const textNodes = selection.filter(node => node.type === 'TEXT');
  const hasTextNode = textNodes.length > 0;
  const textNode = hasTextNode ? textNodes[0] as TextNode : null;

  console.log('Valid frames count:', validFrames.length);

  if (validFrames.length > 0) {
    const frame = validFrames[0] as FrameNode | SectionNode | InstanceNode;
    sendToUI({
      type: 'SELECTION_INFO',
      hasSelection: true,
      frameName: validFrames.length === 1
        ? frame.name
        : `${validFrames.length} frames selected`,
      frameWidth: Math.round(frame.width),
      frameHeight: Math.round(frame.height),
      selectedCount: validFrames.length,
      textNodeSelected: hasTextNode,
      textNodeName: textNode?.name,
      textNodeChars: textNode?.characters.length,
    });
  } else {
    sendToUI({
      type: 'SELECTION_INFO',
      hasSelection: false,
      textNodeSelected: hasTextNode,
      textNodeName: textNode?.name,
      textNodeChars: textNode?.characters.length,
    });
  }
}

sendSelectionInfo();
figma.on('selectionchange', () => {
  sendSelectionInfo();
  // Also update Inspector tab when selection changes
  sendNodeInfo();
  // Also update GIF tab when selection changes
  handleGifGetSelectionInfo();
});

// ============================================================================
// PATTERN MATCH CONFIRMATION
// ============================================================================

// Store for pending pattern match confirmations
const pendingConfirmations: Map<string, {
  resolve: (skipMatching: boolean) => void;
}> = new Map();

// Cache for remembered choices: frameName -> skipMatching (true = convert to vertical)
const rememberedChoices: Map<string, boolean> = new Map();

// Permanently muted frames: frameName -> action ('skip' = convert, 'keep' = keep layout)
// These persist across conversions until user unmutes them
const mutedFrames: Map<string, 'skip' | 'keep'> = new Map();

let confirmationIdCounter = 0;

/**
 * Clear remembered choices (call at start of each conversion)
 * Note: Does NOT clear mutedFrames - those persist until user unmutes
 */
function clearRememberedChoices(): void {
  rememberedChoices.clear();
  console.log('🧹 Cleared remembered pattern match choices (muted frames preserved)');
}

/**
 * Request confirmation from UI for a pattern match
 * Returns true if user wants to skip matching (convert to vertical)
 * Priority: 1. Muted frames (permanent) 2. Remembered choices (session) 3. Ask user
 */
function requestPatternMatchConfirmation(
  frameName: string,
  pattern: string,
  currentLayout: string,
  willBecome: string
): Promise<boolean> {
  // 1. Check if frame is permanently muted
  if (mutedFrames.has(frameName)) {
    const action = mutedFrames.get(frameName)!;
    const skipMatching = action === 'skip';
    console.log(`🔇 Using muted setting for "${frameName}": ${skipMatching ? 'skip matching (convert)' : 'keep layout'}`);
    return Promise.resolve(skipMatching);
  }

  // 2. Check if we already have a remembered choice for this frame name (session)
  if (rememberedChoices.has(frameName)) {
    const cachedChoice = rememberedChoices.get(frameName)!;
    console.log(`📋 Using remembered choice for "${frameName}": ${cachedChoice ? 'skip matching (convert)' : 'keep layout'}`);
    return Promise.resolve(cachedChoice);
  }

  // 3. Ask user
  return new Promise((resolve) => {
    const matchId = `match_${++confirmationIdCounter}`;

    // Wrap resolve to also remember the choice
    const resolveAndRemember = (skipMatching: boolean) => {
      rememberedChoices.set(frameName, skipMatching);
      console.log(`💾 Remembered choice for "${frameName}": ${skipMatching ? 'skip matching (convert)' : 'keep layout'}`);
      resolve(skipMatching);
    };

    pendingConfirmations.set(matchId, { resolve: resolveAndRemember });

    sendToUI({
      type: 'PATTERN_MATCH_CONFIRM',
      matchId,
      frameName,
      pattern,
      currentLayout,
      willBecome
    });
  });
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

figma.ui.onmessage = async (msg: PluginMessage) => {
  switch (msg.type) {
    case 'CONVERT':
      await handleConvert(msg.config);
      break;

    case 'GET_SELECTION':
      sendSelectionInfo();
      break;

    case 'GET_SELECTED_FRAME_FOR_MANUAL':
      sendSelectedFrameInfo();
      break;

    case 'GET_MANUAL_FRAMES_INFO':
      sendManualFramesInfo(msg.frameIds);
      break;

    case 'SAVE_SETTINGS':
      await saveSettings(msg.config);
      break;

    case 'GET_NODE_INFO':
      await sendNodeInfo();
      break;

    case 'PATTERN_MATCH_RESPONSE':
      // Handle confirmation response from UI
      const pending = pendingConfirmations.get(msg.matchId);
      if (pending) {
        pending.resolve(msg.skipMatching);
        pendingConfirmations.delete(msg.matchId);
      }
      break;

    case 'MUTE_FRAME':
      // Add frame to muted list and persist
      mutedFrames.set(msg.frameName, msg.action);
      saveMutedFrames();
      console.log(`🔇 Muted frame "${msg.frameName}" with action: ${msg.action}`);
      break;

    case 'UNMUTE_FRAME':
      // Remove frame from muted list and persist
      mutedFrames.delete(msg.frameName);
      saveMutedFrames();
      console.log(`🔊 Unmuted frame "${msg.frameName}"`);
      break;

    case 'CONVERT_DARK_MODE':
      handleConvertDarkMode(msg.skipFrames || []);
      break;

    case 'EXPORT_ALL_IMAGES':
      handleExportAllImages(
        msg.buttonPatterns, msg.buttonFormat, msg.buttonScale, msg.buttonPadding,
        msg.pngPatterns, msg.pngScale,
        msg.jpgPatterns, msg.jpgScale
      );
      break;

    case 'EXPORT_BUTTON_IMAGE':
      handleExportButtonImage(msg.id, msg.name, msg.textContent, msg.scale, msg.padding, msg.format);
      break;

    // Export for Compare messages
    case 'GET_COMPARE_FRAME_INFO':
      handleGetCompareFrameInfo(msg.frameType);
      break;

    case 'EXPORT_COMPARE_DATA':
      handleExportCompareData(msg.projectName, msg.desktopFrameId, msg.mobileFrameId);
      break;

    // QA Checker messages
    case 'QA_SCAN':
      handleQAScan(msg.config, msg.scope);
      break;

    case 'QA_FIX_ISSUE':
      handleQAFixIssue(msg.issue);
      break;

    case 'QA_FIX_ALL':
      handleQAFixAll(msg.category, msg.issues);
      break;

    case 'QA_EXTRACT_TOKENS':
      handleQAExtractTokens(msg.scope);
      break;

    case 'QA_SAVE_CONFIG':
      await saveQAConfig(msg.config);
      break;

    case 'QA_SAVE_REPORT':
      await saveQAReport(msg.result);
      break;

    case 'QA_SAVE_TOKENS':
      await saveQATokens(msg.tokens);
      break;

    case 'QA_SELECT_NODE':
      handleQASelectNode(msg.nodeId);
      break;

    case 'QA_EXTRACT_STYLES':
      handleQAExtractStyles();
      break;

    case 'QA_EXTRACT_VARIABLES':
      handleQAExtractVariables();
      break;

    case 'QA_EXTRACT_TYPOGRAPHY_STYLES':
      handleQAExtractTypographyStyles();
      break;

    case 'QA_REQUEST_CONFIG':
      // UI is ready, send config
      (async () => {
        const qaConfig = await loadQAConfig();
        sendToUI({ type: 'QA_CONFIG_LOADED', config: qaConfig });

        const qaReport = await loadQAReport();
        sendToUI({ type: 'QA_REPORT_LOADED', result: qaReport });

        const qaTokens = await loadQATokens();
        sendToUI({ type: 'QA_TOKENS_LOADED', tokens: qaTokens });
      })();
      break;

    case 'CANCEL':
      figma.closePlugin();
      break;

    // Export GIF messages
    case 'GIF_GET_SELECTION_INFO':
      handleGifGetSelectionInfo();
      break;

    case 'GIF_EXPORT_FRAMES':
      handleGifExportFrames(msg.config);
      break;

    // Copy Content messages
    case 'GET_TEXT_STYLE_INFO':
      handleGetTextStyleInfo();
      break;
  }
};

// ============================================================================
// COPY CONTENT HANDLERS
// ============================================================================

/**
 * Get text style information from selected text node
 */
function handleGetTextStyleInfo(): void {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendToUI({ type: 'TEXT_STYLE_INFO', info: null });
    return;
  }

  const node = selection[0];

  // Check if it's a text node
  if (node.type !== 'TEXT') {
    sendToUI({ type: 'TEXT_STYLE_ERROR', error: 'Please select a text layer' });
    return;
  }

  try {
    const textNode = node as TextNode;

    // Get text content
    const content = textNode.characters;

    // Get font size (handle mixed fonts)
    let fontSize = 16;
    if (typeof textNode.fontSize === 'number') {
      fontSize = textNode.fontSize;
    } else {
      // Mixed fonts - get the first segment's font size
      const firstChar = textNode.getRangeFontSize(0, 1);
      if (typeof firstChar === 'number') {
        fontSize = firstChar;
      }
    }

    // Get line height in px
    let lineHeight = fontSize * 1.2; // default
    if (textNode.lineHeight !== figma.mixed) {
      const lh = textNode.lineHeight as LineHeight;
      if (lh.unit === 'PIXELS') {
        lineHeight = lh.value;
      } else if (lh.unit === 'PERCENT') {
        lineHeight = (lh.value / 100) * fontSize;
      }
      // AUTO will use the default
    }

    // Get font weight
    let fontWeight = 400;
    if (textNode.fontWeight !== figma.mixed) {
      fontWeight = textNode.fontWeight as number;
    } else {
      const firstWeight = textNode.getRangeFontWeight(0, 1);
      if (typeof firstWeight === 'number') {
        fontWeight = firstWeight;
      }
    }

    // Get letter spacing
    let letterSpacing = 0;
    if (textNode.letterSpacing !== figma.mixed) {
      const ls = textNode.letterSpacing as LetterSpacing;
      if (ls.unit === 'PIXELS') {
        letterSpacing = ls.value;
      } else if (ls.unit === 'PERCENT') {
        letterSpacing = (ls.value / 100) * fontSize;
      }
    }

    // Get color (first fill)
    let color = '#000000';
    const fills = textNode.fills;
    if (Array.isArray(fills) && fills.length > 0) {
      const fill = fills[0];
      if (fill.type === 'SOLID') {
        const r = Math.round(fill.color.r * 255);
        const g = Math.round(fill.color.g * 255);
        const b = Math.round(fill.color.b * 255);
        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }

    // Get font family
    let fontFamily = 'Arial';
    if (textNode.fontName !== figma.mixed) {
      fontFamily = (textNode.fontName as FontName).family;
    } else {
      const firstFont = textNode.getRangeFontName(0, 1);
      if (firstFont !== figma.mixed) {
        fontFamily = (firstFont as FontName).family;
      }
    }

    // Get text alignment
    let textAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
    const alignment = textNode.textAlignHorizontal;
    if (alignment === 'CENTER') {
      textAlign = 'center';
    } else if (alignment === 'RIGHT') {
      textAlign = 'right';
    } else if (alignment === 'JUSTIFIED') {
      textAlign = 'justify';
    }

    sendToUI({
      type: 'TEXT_STYLE_INFO',
      info: {
        content,
        fontSize,
        lineHeight: Math.round(lineHeight * 100) / 100,
        fontWeight,
        letterSpacing: Math.round(letterSpacing * 100) / 100,
        wordSpacing: 0, // Figma doesn't have word-spacing, default to 0
        color,
        fontFamily,
        textAlign
      }
    });
  } catch (error) {
    sendToUI({ type: 'TEXT_STYLE_ERROR', error: `Failed to get text info: ${error}` });
  }
}

// ============================================================================
// EXPORT GIF HANDLERS
// ============================================================================

/**
 * Get information about selected frame for GIF export
 */
function handleGifGetSelectionInfo(): void {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendToUI({ type: 'GIF_SELECTION_INFO', info: null });
    return;
  }

  const node = selection[0];

  // Check if it's a valid frame type
  if (node.type !== 'FRAME' && node.type !== 'INSTANCE' && node.type !== 'COMPONENT') {
    sendToUI({ type: 'GIF_SELECTION_INFO', info: null });
    return;
  }

  const info: GifSelectionInfo = {
    frameId: node.id,
    frameName: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height),
    hasPrototype: false,
    isComponentInstance: node.type === 'INSTANCE',
    variantCount: 0,
    childFrameCount: 0,
    frameNames: [],
    delays: [],
    defaultDelay: 500,
    overlayLayers: [],
  };

  // Check for prototype reactions and extract delays
  if ('reactions' in node && node.reactions && node.reactions.length > 0) {
    info.hasPrototype = true;
  }

  // Helper function to extract delay from reactions
  const getDelayFromReactions = (frameNode: SceneNode): number => {
    if ('reactions' in frameNode && frameNode.reactions) {
      for (const reaction of frameNode.reactions) {
        // Check for "After delay" trigger
        if (reaction.trigger && reaction.trigger.type === 'AFTER_TIMEOUT') {
          // Figma timeout is in SECONDS, convert to milliseconds
          return Math.round(reaction.trigger.timeout * 1000);
        }
      }
    }
    return 0; // No delay found
  };

  // If it's an instance, check for variants
  if (node.type === 'INSTANCE') {
    try {
      const mainComponent = node.mainComponent;
      if (mainComponent && mainComponent.parent && mainComponent.parent.type === 'COMPONENT_SET') {
        const componentSet = mainComponent.parent;
        info.variantCount = componentSet.children.length;
        info.frameNames = componentSet.children.map(child => child.name);
        // Get delays from each variant's reactions
        info.delays = componentSet.children.map(child => getDelayFromReactions(child));
      }
    } catch (e) {
      console.error('Error accessing component set:', e);
    }
  }

  // Count child frames (for frame-based animation)
  if ('children' in node) {
    const childFrames = node.children.filter(
      child => child.type === 'FRAME' || child.type === 'INSTANCE' || child.type === 'COMPONENT'
    );
    info.childFrameCount = childFrames.length;
    if (info.frameNames.length === 0) {
      info.frameNames = childFrames.map(child => child.name);
    }
    // Get delays from each child frame's reactions
    if (info.delays.length === 0) {
      info.delays = childFrames.map(child => getDelayFromReactions(child));
    }
  }

  // Collect potential overlay layers from SIBLING nodes (same level as selected frame)
  // This allows selecting layers outside the animation frame
  if (node.parent && 'children' in node.parent) {
    info.overlayLayers = node.parent.children
      .filter(sibling => sibling.id !== node.id && sibling.visible && 'exportAsync' in sibling)
      .map(sibling => ({ id: sibling.id, name: sibling.name }));
  }

  // Calculate default delay from found delays (use first non-zero delay or 500ms)
  const foundDelay = info.delays.find(d => d > 0);
  if (foundDelay) {
    info.defaultDelay = foundDelay;
  }

  console.log('GIF Selection Info:', info);
  sendToUI({ type: 'GIF_SELECTION_INFO', info });
}

/**
 * Export frames for GIF generation
 */
async function handleGifExportFrames(config: GifExportConfig): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendToUI({ type: 'GIF_EXPORT_ERROR', error: 'No frame selected' });
    return;
  }

  const node = selection[0];

  if (node.type !== 'FRAME' && node.type !== 'INSTANCE' && node.type !== 'COMPONENT') {
    sendToUI({ type: 'GIF_EXPORT_ERROR', error: 'Please select a Frame, Instance, or Component' });
    return;
  }

  try {
    const frames: GifFrameData[] = [];
    let nodesToExport: SceneNode[] = [];

    // Determine which nodes to export
    if (node.type === 'INSTANCE') {
      // Try to get all variants from component set
      const mainComponent = node.mainComponent;
      if (mainComponent && mainComponent.parent && mainComponent.parent.type === 'COMPONENT_SET') {
        const componentSet = mainComponent.parent;
        nodesToExport = [...componentSet.children];
      } else {
        // Just export the instance itself
        nodesToExport = [node];
      }
    } else if ('children' in node) {
      // Export child frames
      const childFrames = node.children.filter(
        child => child.type === 'FRAME' || child.type === 'INSTANCE' || child.type === 'COMPONENT'
      );
      if (childFrames.length > 0) {
        nodesToExport = childFrames as SceneNode[];
      } else {
        // Just export the frame itself
        nodesToExport = [node];
      }
    } else {
      nodesToExport = [node];
    }

    const overlayCount = config.overlayFrameIds?.length || 0;
    const total = nodesToExport.length + overlayCount;
    console.log(`Exporting ${nodesToExport.length} frames for GIF...`);

    for (let i = 0; i < nodesToExport.length; i++) {
      const exportNode = nodesToExport[i];

      sendToUI({ type: 'GIF_EXPORT_PROGRESS', current: i + 1, total });

      // Export as PNG
      const bytes = await (exportNode as FrameNode | InstanceNode | ComponentNode).exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: config.scale },
      });

      // Convert to base64
      const base64 = figma.base64Encode(bytes);

      // Get opacity from node (default to 1 if not available)
      const nodeOpacity = 'opacity' in exportNode ? (exportNode as FrameNode).opacity : 1;

      frames.push({
        index: i,
        name: exportNode.name,
        imageData: base64,
        width: Math.round(exportNode.width * config.scale),
        height: Math.round(exportNode.height * config.scale),
        opacity: nodeOpacity,
      });
    }

    // Export overlay layers if specified (multiple overlays supported)
    // Overlays are SIBLINGS of the selected frame (same parent level)
    const overlayDataList: GifFrameData[] = [];
    if (config.overlayFrameIds && config.overlayFrameIds.length > 0) {
      // Reference position is always the selected frame's position
      // because overlays are siblings of the selected frame
      const referenceX = node.x;
      const referenceY = node.y;

      for (let i = 0; i < config.overlayFrameIds.length; i++) {
        const overlayId = config.overlayFrameIds[i];
        const overlayNode = figma.getNodeById(overlayId) as SceneNode;
        if (overlayNode && 'exportAsync' in overlayNode) {
          sendToUI({ type: 'GIF_EXPORT_PROGRESS', current: nodesToExport.length + i + 1, total });
          console.log(`Exporting overlay layer ${i + 1}: ${overlayNode.name}`);

          const overlayBytes = await (overlayNode as FrameNode | InstanceNode | ComponentNode | GroupNode).exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: config.scale },
          });

          // Calculate overlay position relative to the selected frame
          // Both overlay and selected frame are siblings with positions relative to same parent
          const relativeX = Math.round((overlayNode.x - referenceX) * config.scale);
          const relativeY = Math.round((overlayNode.y - referenceY) * config.scale);

          overlayDataList.push({
            index: i,
            name: overlayNode.name,
            imageData: figma.base64Encode(overlayBytes),
            width: Math.round(overlayNode.width * config.scale),
            height: Math.round(overlayNode.height * config.scale),
            x: relativeX,
            y: relativeY,
          });
        }
      }
    }

    console.log(`Exported ${frames.length} frames successfully`);
    sendToUI({ type: 'GIF_FRAMES_DATA', frames, config, overlayDataList: overlayDataList.length > 0 ? overlayDataList : undefined });

  } catch (e) {
    console.error('Error exporting frames:', e);
    sendToUI({ type: 'GIF_EXPORT_ERROR', error: String(e) });
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSelection(): ValidationResult {
  const errors: { nodeId: string; nodeName: string; code: string; message: string }[] = [];
  const warnings: { nodeId: string; nodeName: string; code: string; message: string }[] = [];

  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    errors.push({
      nodeId: '',
      nodeName: '',
      code: 'NO_SELECTION',
      message: 'Please select a frame to convert.',
    });
    return { isValid: false, errors, warnings };
  }

  // Check if all selected items are valid frame types
  const validFrames = selection.filter(
    node => node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  if (validFrames.length === 0) {
    errors.push({
      nodeId: '',
      nodeName: '',
      code: 'NO_VALID_FRAMES',
      message: 'Please select at least one Frame, Section, Component, or Instance.',
    });
    return { isValid: false, errors, warnings };
  }

  // If some selections are invalid, add a warning
  if (validFrames.length < selection.length) {
    warnings.push({
      nodeId: '',
      nodeName: '',
      code: 'INVALID_SELECTIONS',
      message: `${selection.length - validFrames.length} invalid item(s) will be skipped. Only Frames, Sections, Components, and Instances can be converted.`,
    });
  }

  return { isValid: true, errors, warnings };
}

// ============================================================================
// DARK MODE CONVERSION (FOR EMAIL)
// ============================================================================

/**
 * Check if a color is "light" (brightness > 0.5)
 */
function isLightColor(r: number, g: number, b: number): boolean {
  // Calculate relative luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5;
}

/**
 * Check if a color is grayscale (r, g, b values are similar)
 */
function isGrayscale(r: number, g: number, b: number): boolean {
  const tolerance = 0.05; // 5% tolerance
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max - min) < tolerance;
}

/**
 * Check if a color is near white (light grayscale)
 */
function isNearWhite(r: number, g: number, b: number): boolean {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return isGrayscale(r, g, b) && luminance > 0.75;
}

/**
 * Convert background color for dark mode
 * Light/white backgrounds → dark backgrounds
 */
function convertBackgroundColor(r: number, g: number, b: number): { r: number; g: number; b: number } | null {
  if (isNearWhite(r, g, b)) {
    // White/light gray → dark gray (#1a1a1a)
    return { r: 0.1, g: 0.1, b: 0.1 };
  } else if (isGrayscale(r, g, b) && isLightColor(r, g, b)) {
    // Light gray → medium dark gray
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const newLuminance = 0.15 + (1 - luminance) * 0.1;
    return { r: newLuminance, g: newLuminance, b: newLuminance };
  }
  // Non-grayscale colors or dark colors → keep as is
  return null;
}

/**
 * Convert text color for dark mode
 * Black/dark/medium gray text → white text
 * Colored text (red, blue, etc.) → keep as is
 */
function convertTextColor(r: number, g: number, b: number): { r: number; g: number; b: number } | null {
  // Check if grayscale (including #707070 which is ~0.44 luminance)
  if (isGrayscale(r, g, b)) {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Convert all dark and medium gray text to white (luminance < 0.6)
    // This includes: black, dark gray, #707070 (~0.44), etc.
    if (luminance < 0.6) {
      return { r: 1, g: 1, b: 1 };
    }
  }
  // Colored text (red, blue, etc.) → keep as is
  // Light gray text → keep as is (already visible on dark bg)
  return null;
}

/**
 * Convert fills to dark mode (for backgrounds)
 */
function convertFillsToDarkMode(fills: readonly Paint[] | typeof figma.mixed): Paint[] {
  if (fills === figma.mixed || !fills) return [];

  return fills.map(fill => {
    if (fill.type === 'SOLID') {
      const converted = convertBackgroundColor(fill.color.r, fill.color.g, fill.color.b);
      if (converted) {
        return {
          ...fill,
          color: converted
        };
      }
    }
    return fill;
  });
}

/**
 * Convert text fills to dark mode
 */
function convertTextFillsToDarkMode(fills: readonly Paint[]): Paint[] {
  if (!fills || fills.length === 0) return [];

  const newFills: Paint[] = [];
  for (const fill of fills) {
    if (fill.type === 'SOLID') {
      const { r, g, b } = fill.color;
      const converted = convertTextColor(r, g, b);
      if (converted) {
        // Color was converted (dark/gray → white)
        newFills.push({
          ...fill,
          color: converted
        });
      } else {
        // Keep original (colored text or already light)
        newFills.push(fill);
      }
    } else {
      newFills.push(fill);
    }
  }
  return newFills;
}

/**
 * Check if a node should be skipped during dark mode conversion
 * Skips: VECTOR nodes, GROUP containing VECTORs, and user-specified frame names (exact match)
 */
function shouldSkipDarkModeConversion(node: SceneNode, skipFrameNames: string[]): boolean {
  // Skip VECTOR nodes entirely (actual vector graphics)
  if (node.type === 'VECTOR') {
    return true;
  }

  // Check if GROUP contains VECTOR children (likely an icon/logo)
  if (node.type === 'GROUP' && hasChildren(node)) {
    for (const child of node.children) {
      if (child.type === 'VECTOR' || child.type === 'GROUP') {
        return true;
      }
    }
  }

  // Check user-specified skip frame names - EXACT MATCH only (case-insensitive)
  // Only apply to non-TEXT nodes
  if (node.type !== 'TEXT') {
    const nodeName = node.name.toLowerCase().trim();
    for (const skipName of skipFrameNames) {
      if (skipName && nodeName === skipName.toLowerCase().trim()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Convert text node fills to dark mode (handles mixed fills)
 */
async function convertTextNodeToDarkMode(textNode: TextNode): Promise<void> {
  const textLength = textNode.characters.length;
  if (textLength === 0) return;

  console.log(`[DarkMode] Processing TEXT node: "${textNode.name.substring(0, 50)}...", length: ${textLength}, fills mixed: ${textNode.fills === figma.mixed}`);

  // Load all fonts used in this text node first
  try {
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName as FontName);
      console.log(`[DarkMode] Loaded single font`);
    } else {
      // If fontName is mixed, load fonts for each character range
      const fontsToLoad = new Set<string>();
      for (let i = 0; i < textLength; i++) {
        try {
          const fontName = textNode.getRangeFontName(i, i + 1);
          if (fontName && typeof fontName === 'object' && 'family' in fontName) {
            fontsToLoad.add(JSON.stringify(fontName));
          }
        } catch {
          // Skip
        }
      }
      console.log(`[DarkMode] Loading ${fontsToLoad.size} fonts for mixed text`);
      for (const fontStr of fontsToLoad) {
        try {
          await figma.loadFontAsync(JSON.parse(fontStr));
        } catch (e) {
          console.log(`[DarkMode] Failed to load font: ${fontStr}`, e);
        }
      }
    }
  } catch (e) {
    console.log(`[DarkMode] Font loading error:`, e);
  }

  // Now convert fills
  if (textNode.fills === figma.mixed) {
    console.log(`[DarkMode] Converting mixed fills for ${textLength} characters`);
    let convertedCount = 0;
    // Handle styled text with mixed fills - convert each character range
    for (let i = 0; i < textLength; i++) {
      try {
        const rangeFills = textNode.getRangeFills(i, i + 1);
        if (rangeFills !== figma.mixed && rangeFills && rangeFills.length > 0) {
          const newFills = convertTextFillsToDarkMode(rangeFills);
          if (newFills.length > 0) {
            textNode.setRangeFills(i, i + 1, newFills);
            convertedCount++;
          }
        }
      } catch (e) {
        if (i === 0) console.log(`[DarkMode] setRangeFills error at char ${i}:`, e);
      }
    }
    console.log(`[DarkMode] Converted ${convertedCount}/${textLength} character ranges`);
  } else {
    const fills = textNode.fills as readonly Paint[];
    console.log(`[DarkMode] Converting single fills, count: ${fills.length}`);
    if (fills.length > 0) {
      const firstFill = fills[0];
      if (firstFill.type === 'SOLID') {
        console.log(`[DarkMode] First fill color: r=${firstFill.color.r.toFixed(3)}, g=${firstFill.color.g.toFixed(3)}, b=${firstFill.color.b.toFixed(3)}`);
      }
      const newFills = convertTextFillsToDarkMode(fills);
      if (newFills.length > 0) {
        textNode.fills = newFills;
        console.log(`[DarkMode] Applied new fills`);
      }
    }
  }
}

/**
 * Recursively convert node colors to dark mode
 */
async function convertNodeToDarkMode(node: SceneNode, skipFrameNames: string[] = []): Promise<void> {
  // Skip VECTOR nodes, icon/logo groups, and user-specified frames
  if (shouldSkipDarkModeConversion(node, skipFrameNames)) {
    console.log(`[DarkMode] SKIPPING node: "${node.name}" (type: ${node.type})`);
    return;
  }

  console.log(`[DarkMode] Processing node: "${node.name.substring(0, 40)}..." (type: ${node.type})`);

  // Convert text colors (use text-specific conversion)
  if (node.type === 'TEXT') {
    await convertTextNodeToDarkMode(node as TextNode);
  } else {
    // Convert fills (background colors) - skip text nodes
    if ('fills' in node && node.fills !== figma.mixed) {
      const fills = node.fills as readonly Paint[];
      if (fills.length > 0) {
        const newFills = convertFillsToDarkMode(fills);
        if (newFills.length > 0) {
          (node as GeometryMixin).fills = newFills;
        }
      }
    }
  }

  // Convert strokes (keep same logic for borders)
  if ('strokes' in node && node.strokes) {
    const strokes = node.strokes as readonly Paint[];
    if (strokes.length > 0) {
      const newStrokes = convertFillsToDarkMode(strokes);
      if (newStrokes.length > 0) {
        (node as GeometryMixin).strokes = newStrokes;
      }
    }
  }

  // Recurse into children
  if (hasChildren(node)) {
    for (const child of node.children) {
      await convertNodeToDarkMode(child, skipFrameNames);
    }
  }
}

/**
 * Handle dark mode conversion for email
 */
async function handleConvertDarkMode(skipFrameNames: string[] = []): Promise<void> {
  try {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      sendToUI({ type: 'DARK_MODE_ERROR', error: 'Please select a frame first' });
      return;
    }

    const sourceFrame = selection[0];
    if (sourceFrame.type !== 'FRAME' && sourceFrame.type !== 'COMPONENT' && sourceFrame.type !== 'INSTANCE') {
      sendToUI({ type: 'DARK_MODE_ERROR', error: 'Please select a Frame, Component, or Instance' });
      return;
    }

    // Clone the frame
    let newFrame = sourceFrame.clone();

    // If it's an instance, detach it
    if (newFrame.type === 'INSTANCE') {
      newFrame = newFrame.detachInstance();
    }

    // Detach all nested instances so we can modify their fills
    detachAllInstances(newFrame);

    // Rename with dark mode suffix
    newFrame.name = `${sourceFrame.name} - Dark Mode`;

    // Position next to original (like breakpoint generation)
    newFrame.x = sourceFrame.x + sourceFrame.width + 100;
    newFrame.y = sourceFrame.y;

    // Convert all colors to dark mode
    await convertNodeToDarkMode(newFrame, skipFrameNames);

    // Select the new frame
    figma.currentPage.selection = [newFrame];
    figma.viewport.scrollAndZoomIntoView([newFrame]);

    sendToUI({ type: 'DARK_MODE_COMPLETE', frameName: newFrame.name });
    figma.notify(`✓ Created dark mode version: ${newFrame.name}`, { timeout: 2000 });

  } catch (error) {
    console.error('Dark mode conversion error:', error);
    sendToUI({ type: 'DARK_MODE_ERROR', error: String(error) });
  }
}

// ============================================================================
// EXPORT BUTTONS
// ============================================================================

/**
 * Get text content from a node (finds first TEXT node within)
 */
function getTextContent(node: SceneNode): string {
  if (node.type === 'TEXT') {
    return node.characters;
  }
  if (hasChildren(node)) {
    for (const child of node.children) {
      const text = getTextContent(child);
      if (text) return text;
    }
  }
  return '';
}

/**
 * Find all buttons matching the patterns within a frame (exact match, case-insensitive)
 */
function findButtonsByPattern(node: SceneNode, patterns: string[]): Array<{ id: string; name: string; textContent: string }> {
  const buttons: Array<{ id: string; name: string; textContent: string }> = [];

  // Normalize patterns to lowercase for case-insensitive exact match
  const patternsLower = patterns.map(p => p.toLowerCase().trim());

  const searchNode = (n: SceneNode) => {
    const nameLower = n.name.toLowerCase().trim();
    // Exact match (case-insensitive)
    const matchesPattern = patternsLower.includes(nameLower);

    if (matchesPattern && (n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'GROUP')) {
      const textContent = getTextContent(n);
      buttons.push({
        id: n.id,
        name: n.name,
        textContent: textContent || n.name,
      });
    }

    // Continue searching children
    if (hasChildren(n)) {
      for (const child of n.children) {
        searchNode(child);
      }
    }
  };

  searchNode(node);
  return buttons;
}

/**
 * Handle export all images request - find all frames matching Button, PNG, and JPG patterns
 * Each group has its own format, scale, and padding settings
 */
function handleExportAllImages(
  buttonPatterns: string[], buttonFormat: string, buttonScale: number, buttonPadding: number,
  pngPatterns: string[], pngScale: number,
  jpgPatterns: string[], jpgScale: number
): void {
  try {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      sendToUI({ type: 'EXPORT_BUTTONS_ERROR', error: 'Please select a frame first' });
      return;
    }

    // Combine all patterns and find matching frames from ALL selected frames
    const allPatterns = [...new Set([...buttonPatterns, ...pngPatterns, ...jpgPatterns])];
    let allButtons: Array<{ id: string; name: string; textContent: string }> = [];

    // Loop through all selected frames
    for (const sourceFrame of selection) {
      const buttonsInFrame = findButtonsByPattern(sourceFrame, allPatterns);
      allButtons = allButtons.concat(buttonsInFrame);
    }

    // Add format, scale, and padding info to each button based on which pattern list it matches
    interface ExportInfo {
      format: string;
      scale: number;
      padding: number;
    }

    const buttons = allButtons.map(button => {
      const exports: ExportInfo[] = [];
      const nameLower = button.name.toLowerCase();

      // Check Button patterns (user-selected format with padding)
      if (buttonPatterns.some(p => nameLower === p.toLowerCase())) {
        exports.push({ format: buttonFormat || 'PNG', scale: buttonScale || 2, padding: buttonPadding || 0 });
      }
      // Check PNG patterns (no padding)
      if (pngPatterns.some(p => nameLower === p.toLowerCase())) {
        exports.push({ format: 'PNG', scale: pngScale || 2, padding: 0 });
      }
      // Check JPG patterns (no padding)
      if (jpgPatterns.some(p => nameLower === p.toLowerCase())) {
        exports.push({ format: 'JPG', scale: jpgScale || 2, padding: 0 });
      }

      return { ...button, exports };
    });

    console.log(`[Export All Images] Found ${buttons.length} frames. Button(${buttonFormat}): ${buttonPatterns}, PNG: ${pngPatterns}, JPG: ${jpgPatterns}`);

    sendToUI({ type: 'EXPORT_BUTTONS_FOUND', buttons });

  } catch (error) {
    console.error('Export all images error:', error);
    sendToUI({ type: 'EXPORT_BUTTONS_ERROR', error: String(error) });
  }
}

/**
 * Handle export single button image with scale, padding and format
 */
async function handleExportButtonImage(
  id: string,
  name: string,
  textContent: string,
  scale: number,
  padding: number,
  format: 'PNG' | 'SVG' | 'JPG'
): Promise<void> {
  try {
    const node = figma.getNodeById(id) as SceneNode;

    if (!node) {
      console.error(`[Export] Node not found: ${id}`);
      return;
    }

    let exportNode: SceneNode = node;
    let tempFrame: FrameNode | null = null;

    // If padding > 0 and format is not SVG, create a temporary frame with transparent background
    // SVG doesn't support padding via temp frame approach
    if (padding > 0 && format !== 'SVG') {
      const nodeWidth = 'width' in node ? (node as FrameNode).width : 100;
      const nodeHeight = 'height' in node ? (node as FrameNode).height : 100;

      // Create temporary frame with padding
      tempFrame = figma.createFrame();
      tempFrame.name = '__temp_export_frame__';
      tempFrame.resize(nodeWidth + padding * 2, nodeHeight + padding * 2);
      tempFrame.x = node.x - 1000; // Move off-screen
      tempFrame.y = node.y - 1000;
      tempFrame.fills = []; // Transparent background
      tempFrame.clipsContent = false;

      // Clone the node and add to temp frame
      const clonedNode = node.clone();
      tempFrame.appendChild(clonedNode);
      clonedNode.x = padding;
      clonedNode.y = padding;

      exportNode = tempFrame;
    }

    // Build export settings based on format
    let exportSettings: ExportSettings;
    let fileExtension: string;

    if (format === 'SVG') {
      exportSettings = { format: 'SVG' };
      fileExtension = 'svg';
    } else if (format === 'JPG') {
      exportSettings = {
        format: 'JPG',
        constraint: { type: 'SCALE', value: scale },
      };
      fileExtension = 'jpg';
    } else {
      // PNG (default)
      exportSettings = {
        format: 'PNG',
        constraint: { type: 'SCALE', value: scale },
      };
      fileExtension = 'png';
    }

    const bytes = await exportNode.exportAsync(exportSettings);

    // Clean up temporary frame
    if (tempFrame) {
      tempFrame.remove();
    }

    // Convert to base64
    const base64 = figma.base64Encode(bytes);

    // Create filename from text content (sanitize for filesystem)
    const sanitizedName = textContent
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '_')            // Replace spaces with underscore
      .substring(0, 50)                 // Limit length
      || name;                          // Fallback to node name

    const fileName = `${sanitizedName}.${fileExtension}`;

    sendToUI({
      type: 'EXPORT_BUTTON_DATA',
      id,
      fileName,
      data: base64,
      format,
    });

  } catch (error) {
    console.error(`[Export] Error exporting button ${id}:`, error);
    sendToUI({ type: 'EXPORT_BUTTONS_ERROR', error: `Failed to export ${name}: ${String(error)}` });
  }
}

// ============================================================================
// EXPORT FOR COMPARE (DOCX vs Design)
// ============================================================================

/**
 * Get frame info for compare export
 */
function handleGetCompareFrameInfo(frameType: 'desktop' | 'mobile'): void {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    sendToUI({ type: 'COMPARE_FRAME_INFO', frameType, frame: null });
    return;
  }

  const node = selection[0];
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    sendToUI({ type: 'COMPARE_FRAME_INFO', frameType, frame: null });
    return;
  }

  const frame = node as FrameNode;
  sendToUI({
    type: 'COMPARE_FRAME_INFO',
    frameType,
    frame: {
      id: frame.id,
      name: frame.name,
      width: Math.round(frame.width),
      height: Math.round(frame.height),
    },
  });
}

/**
 * Export JSON structure and screenshot for compare
 */
async function handleExportCompareData(
  projectName: string,
  desktopFrameId: string,
  mobileFrameId: string
): Promise<void> {
  try {
    const desktopNode = figma.getNodeById(desktopFrameId) as FrameNode;
    const mobileNode = figma.getNodeById(mobileFrameId) as FrameNode;

    if (!desktopNode || !mobileNode) {
      sendToUI({ type: 'COMPARE_EXPORT_ERROR', error: 'One or more frames not found' });
      return;
    }

    // Extract JSON structure for both frames
    const desktopJson = extractNodeStructure(desktopNode);
    const mobileJson = extractNodeStructure(mobileNode);

    // Export screenshots
    const desktopScreenshot = await desktopNode.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });
    const mobileScreenshot = await mobileNode.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });

    // Convert to base64
    const desktopScreenshotBase64 = figma.base64Encode(desktopScreenshot);
    const mobileScreenshotBase64 = figma.base64Encode(mobileScreenshot);

    sendToUI({
      type: 'COMPARE_EXPORT_COMPLETE',
      success: true,
      projectName,
      desktopJson: JSON.stringify(desktopJson, null, 2),
      mobileJson: JSON.stringify(mobileJson, null, 2),
      desktopScreenshot: desktopScreenshotBase64,
      mobileScreenshot: mobileScreenshotBase64,
    });

  } catch (error) {
    console.error('Export compare data error:', error);
    sendToUI({ type: 'COMPARE_EXPORT_ERROR', error: String(error) });
  }
}

/**
 * Extract node structure for JSON export (similar to inspector but simplified for compare)
 */
function extractNodeStructure(node: SceneNode): object {
  const result: Record<string, unknown> = {
    name: node.name,
    type: node.type,
  };

  // Add position and size
  if ('x' in node) result.x = node.x;
  if ('y' in node) result.y = node.y;
  if ('width' in node) result.width = node.width;
  if ('height' in node) result.height = node.height;

  // Add fills info
  if ('fills' in node && Array.isArray(node.fills)) {
    result.fills = (node.fills as Paint[]).map(fill => {
      const fillInfo: Record<string, unknown> = { type: fill.type };
      if (fill.type === 'SOLID') {
        const solidFill = fill as SolidPaint;
        if (solidFill.boundVariables?.color) {
          const variable = figma.variables.getVariableById(solidFill.boundVariables.color.id);
          if (variable) {
            fillInfo.name = variable.name;
          }
        }
        fillInfo.hex = rgbToHex(solidFill.color.r, solidFill.color.g, solidFill.color.b);
      }
      return fillInfo;
    });
  }

  // Add text content for TEXT nodes
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    result.characters = textNode.characters;
    result.fontSize = textNode.fontSize;
    result.fontName = textNode.fontName;
    result.textAlignHorizontal = textNode.textAlignHorizontal;
    result.textAlignVertical = textNode.textAlignVertical;
    result.lineHeight = textNode.lineHeight;
  }

  // Add layout info for frames
  if ('layoutMode' in node) {
    const frameNode = node as FrameNode;
    result.layoutMode = frameNode.layoutMode;
    result.primaryAxisSizingMode = frameNode.primaryAxisSizingMode;
    result.counterAxisSizingMode = frameNode.counterAxisSizingMode;
    result.primaryAxisAlignItems = frameNode.primaryAxisAlignItems;
    result.counterAxisAlignItems = frameNode.counterAxisAlignItems;
    if (frameNode.paddingTop) result.paddingTop = frameNode.paddingTop;
    if (frameNode.paddingRight) result.paddingRight = frameNode.paddingRight;
    if (frameNode.paddingBottom) result.paddingBottom = frameNode.paddingBottom;
    if (frameNode.paddingLeft) result.paddingLeft = frameNode.paddingLeft;
    if (frameNode.itemSpacing) result.itemSpacing = frameNode.itemSpacing;
  }

  // Recursively process children
  if ('children' in node) {
    const children = (node as FrameNode).children;
    result.children = children.map(child => extractNodeStructure(child));
  }

  return result;
}

// ============================================================================
// CONVERSION
// ============================================================================

async function handleConvert(config: PluginConfig): Promise<void> {
  // Clear remembered choices from previous conversion
  clearRememberedChoices();

  const validation = validateSelection();

  if (!validation.isValid) {
    sendToUI({ type: 'VALIDATION_FAILED', result: validation });
    return;
  }

  // Show warnings if any
  if (validation.warnings.length > 0) {
    figma.notify(validation.warnings[0].message, { timeout: 3000 });
  }

  // Filter valid frame types
  const selection = figma.currentPage.selection;
  const validFrames = selection.filter(
    node => node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  ) as (FrameNode | SectionNode | InstanceNode)[];

  // Get all widths to generate (use mobileWidths if available, otherwise single mobileWidth)
  const widthsToGenerate = config.mobileWidths && config.mobileWidths.length > 0
    ? config.mobileWidths
    : [config.mobileWidth];

  // Convert all valid frames for all selected widths
  const results: TransformResult[] = [];
  const newFrames: (FrameNode | SectionNode | InstanceNode)[] = [];

  // Track cumulative offset for positioning multiple breakpoints
  // Gap between breakpoints is 100px
  const GAP = 100;
  let previousWidthsTotal = 0;

  for (let widthIndex = 0; widthIndex < widthsToGenerate.length; widthIndex++) {
    const targetWidth = widthsToGenerate[widthIndex];

    // Find individual breakpoint settings for this width
    const breakpointConfig = config.breakpoints?.find((bp: { width: number; padding: number; maxSpacing: number }) => bp.width === targetWidth);
    const containerPadding = breakpointConfig?.padding ?? config.containerPadding;
    const maxSpacing = breakpointConfig?.maxSpacing ?? config.maxSpacing;

    // Create config for this specific width with positioning info
    const widthConfig = {
      ...config,
      mobileWidth: targetWidth,
      containerPadding,
      maxSpacing,
      widthIndex,
      previousWidthsTotal,
    };

    for (const frame of validFrames) {
      if (widthConfig.generateMultipleVersions) {
        // Generate 3 versions with different strategies
        const versionConfigs = [
          { ...widthConfig, version: 1, layoutStrategy: 'conservative' as const },  // Ver1: Keep layout as is
          { ...widthConfig, version: 2, layoutStrategy: 'balanced' as const },      // Ver2: Add spacing when converting to vertical
          { ...widthConfig, version: 3, layoutStrategy: 'aggressive' as const },    // Ver3: More aggressive layout conversion
        ];

        const versionResults: TransformResult[] = [];
        const versionFrameIds: string[] = [];

        for (const versionConfig of versionConfigs) {
          const result = await generateBreakpoint(frame, versionConfig);
          versionResults.push(result);

          if (result.success && result.mobileFrameId) {
            versionFrameIds.push(result.mobileFrameId);
            const newFrame = figma.getNodeById(result.mobileFrameId);
            if (newFrame) {
              newFrames.push(newFrame as FrameNode | SectionNode | InstanceNode);
            }
          }
        }

        // Add a combined result for all versions
        const firstSuccessResult = versionResults.find(r => r.success);
        const combinedResult: TransformResult = {
          success: versionResults.some(r => r.success),
          mobileFrameId: firstSuccessResult?.mobileFrameId,
          mobileFrameName: `${frame.name} - ${targetWidth}px (3 versions)`,
          mobileFrameIds: versionFrameIds,
          errors: versionResults.flatMap(r => r.errors),
          stats: {
            nodesProcessed: versionResults.reduce((sum, r) => sum + r.stats.nodesProcessed, 0),
            textsScaled: versionResults.reduce((sum, r) => sum + r.stats.textsScaled, 0),
            textStylesMapped: versionResults.reduce((sum, r) => sum + r.stats.textStylesMapped, 0),
          },
        };
        results.push(combinedResult);
      } else {
        // Single version generation
        const result = await generateBreakpoint(frame, widthConfig);
        results.push(result);

        if (result.success && result.mobileFrameId) {
          const newFrame = figma.getNodeById(result.mobileFrameId);
          if (newFrame) {
            newFrames.push(newFrame as FrameNode | SectionNode | InstanceNode);
          }
        }
      }
    }

    // Update cumulative offset for next width
    // If generateMultipleVersions, each width produces 3 frames side by side
    if (config.generateMultipleVersions) {
      previousWidthsTotal += (targetWidth + GAP) * 3;
    } else {
      previousWidthsTotal += targetWidth + GAP;
    }
  }

  // Collect all errors
  const allErrors = results.flatMap(r => r.errors);

  // Select all new frames
  if (newFrames.length > 0) {
    figma.currentPage.selection = newFrames;
    figma.viewport.scrollAndZoomIntoView(newFrames);
  }

  // Send summary to UI
  const successCount = results.filter(r => r.success).length;
  if (successCount > 0) {
    let message: string;
    const widthsList = widthsToGenerate.join(', ');

    if (config.generateMultipleVersions) {
      message = `✓ Created ${successCount * 3} versions at ${widthsList}px`;
    } else if (widthsToGenerate.length > 1) {
      message = `✓ Created ${successCount} breakpoints at ${widthsList}px`;
    } else {
      message = validFrames.length === 1
        ? `✓ Created ${widthsToGenerate[0]}px breakpoint`
        : `✓ Created ${successCount} breakpoints at ${widthsToGenerate[0]}px`;
    }
    figma.notify(message, { timeout: 2000 });

    // Send first successful result to UI
    const firstSuccess = results.find(r => r.success);
    if (firstSuccess) {
      sendToUI({ type: 'CONVERSION_COMPLETE', result: firstSuccess });
    }
  }

  if (allErrors.length > 0) {
    sendToUI({ type: 'CONVERSION_ERROR', errors: allErrors });
  }
}

async function generateBreakpoint(
  sourceFrame: FrameNode | SectionNode | InstanceNode,
  config: PluginConfig
): Promise<TransformResult> {
  const stats: TransformStats = {
    nodesProcessed: 0,
    textsScaled: 0,
    textStylesMapped: 0,
  };
  const errors: string[] = [];

  // Store original width for comparison
  const originalWidth = sourceFrame.width;

  // Total steps for progress tracking
  const totalSteps = 15;
  let currentStep = 0;

  try {
    // Step 0: Initialize - show progress bar immediately
    console.log('📊 PROGRESS: Step 0/15 - Starting...');
    sendToUI({ type: 'PROGRESS_UPDATE', current: 0, total: totalSteps, stepName: 'Starting...' });

    // Delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 1: Store image aspect ratios from SOURCE frame (desktop) BEFORE cloning
    // This preserves the original desktop proportions
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Analyzing images`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Analyzing images' });
    const imageAspectRatios = storeImageAspectRatios(sourceFrame);
    console.log('Stored aspect ratios:', imageAspectRatios);

    // Store icon sizes BEFORE cloning - icons should not be scaled
    const iconSizes = storeIconSizes(sourceFrame);
    console.log('Stored icon sizes:', iconSizes.size, 'icons');

    // Store media container sizes (video, image frames with fixed height)
    // These should preserve their aspect ratio or fixed height
    const mediaContainerSizes = storeMediaContainerSizes(sourceFrame);
    console.log('Stored media containers:', mediaContainerSizes.size, 'containers');

    // Small delay between steps
    await new Promise(resolve => setTimeout(resolve, 50));

    // Step 2: Clone the frame
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Cloning frame`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Cloning frame' });
    await new Promise(resolve => setTimeout(resolve, 30));
    let newFrame = sourceFrame.clone();

    // Step 3: If cloned frame is an instance, detach it immediately
    // This prevents issues with accessing children later
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Detaching instances`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Detaching instances' });
    await new Promise(resolve => setTimeout(resolve, 30));
    if (newFrame.type === 'INSTANCE') {
      newFrame = newFrame.detachInstance();
    }

    // Step 4: Rename - Keep source name + width suffix + version
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Setting up frame`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Setting up frame' });
    await new Promise(resolve => setTimeout(resolve, 30));
    const versionSuffix = config.version ? ` - ver${config.version}` : '';
    const mobileSuffix = ` - ${config.mobileWidth}px${versionSuffix}`;
    newFrame.name = `${sourceFrame.name}${mobileSuffix}`;

    // Step 5: Position next to original - align top, 100px to the right
    // For multiple versions, position them side by side
    // For multiple widths, offset by previousWidthsTotal
    const versionOffset = config.version ? (config.version - 1) * (config.mobileWidth + 50) : 0;
    const widthOffset = config.previousWidthsTotal || 0;
    newFrame.x = sourceFrame.x + sourceFrame.width + 100 + widthOffset + versionOffset;
    newFrame.y = sourceFrame.y; // Align top with source frame

    // Step 6: Detach all nested instances so we can modify their layout
    // Instances in Figma don't allow modifying children's layout
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Processing instances`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Processing instances' });
    await new Promise(resolve => setTimeout(resolve, 30));
    detachAllInstances(newFrame, config.preservedComponentNames);

    // Step 6a: Ungroup all GROUP nodes
    // GROUPs don't have auto-layout, so children can't use FILL sizing
    // By ungrouping, children become direct children of parent frame and can resize properly
    console.log(`📊 Ungrouping GROUP nodes...`);
    ungroupAllGroups(newFrame);

    // Step 7: Convert horizontal layouts to vertical where needed (BEFORE resize)
    // This handles cases like card grids that need to stack on mobile
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Converting layouts`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Converting layouts' });
    await new Promise(resolve => setTimeout(resolve, 30));
    const layoutStrategy = config.layoutStrategy || 'balanced';
    const uiControlPatterns = config.uiControlPatterns || ['button', 'btn', 'cta', 'input', 'field', 'search', 'tab', 'icon'];
    const sliderConfig = config.isSlider && config.sliderItemPattern
      ? { isSlider: config.isSlider, sliderItemPattern: config.sliderItemPattern }
      : undefined;
    await convertHorizontalToVertical(newFrame, config.mobileWidth, stats, layoutStrategy, config.maxSpacing, uiControlPatterns, sliderConfig);

    // NOTE: We don't need adjustVerticalLayoutSpacing anymore
    // because convertHorizontalToVertical already adjusts spacing for converted layouts
    // and we want to keep original spacing for layouts that were already vertical

    // Step 8: Resize width (only for FrameNode/ComponentNode, SectionNode doesn't support resize)
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Resizing frame`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Resizing frame' });
    await new Promise(resolve => setTimeout(resolve, 30));
    if ('resize' in newFrame) {
      newFrame.resize(config.mobileWidth, newFrame.height);
    }

    // Step 9: Fix child frames that still have original width
    // (frames with fixed width that don't respond to parent resize)
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Fixing child widths`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Fixing child widths' });
    await new Promise(resolve => setTimeout(resolve, 30));
    fixFullWidthChildren(newFrame, originalWidth, config.mobileWidth, stats);

    // Step 10: Apply container padding - adjust padding for sections
    // and fix oversized elements to fit within mobile width
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Applying padding`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Applying padding' });
    await new Promise(resolve => setTimeout(resolve, 30));
    applyContainerPadding(newFrame, config.mobileWidth, config.containerPadding, stats);

    // Step 10.5: Fix absolute positioned content that overflows
    // This centers content that was positioned with desktop coordinates
    fixAbsolutePositionedContent(newFrame, config.mobileWidth, config, stats);

    // Step 10.6: Process spacing variables - apply target breakpoint values
    // If spacing uses Figma Variables with modes (Desktop/Mobile/Tablet),
    // update to the corresponding mode value for the target width
    console.log(`📊 Processing spacing variables for ${config.mobileWidth}px breakpoint...`);
    await processSpacingVariables(newFrame, config.mobileWidth, stats);

    // Step 10.7: Process slider/carousel frames
    // If slider mode is enabled, resize slider items to fit mobile width
    // instead of stacking them vertically
    if (config.isSlider && config.sliderItemPattern) {
      console.log(`📊 Processing slider frames with pattern: "${config.sliderItemPattern}"`);
      processSliderFrames(newFrame, config, stats);
    }

    // Step 11: Fix vertical layouts to have auto height (hug content)
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Fixing layouts`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Fixing layouts' });
    await new Promise(resolve => setTimeout(resolve, 30));
    fixVerticalLayoutHeights(newFrame, stats, config.version);

    // Step 12: Restore image aspect ratios to preserve desktop proportions
    // Pass the mobile suffix so we can strip it when matching paths
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Restoring images`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Restoring images' });
    await new Promise(resolve => setTimeout(resolve, 30));
    restoreImageAspectRatios(newFrame, imageAspectRatios, mobileSuffix, stats);

    // Step 12.5: Restore icon sizes - icons should NOT be scaled with parent frame
    restoreIconSizes(newFrame, iconSizes, mobileSuffix, stats);

    // Step 12.6: Restore media container sizes (video frames, etc.)
    restoreMediaContainerSizes(newFrame, mediaContainerSizes, mobileSuffix, config.mobileWidth, config.containerPadding, stats);

    // Step 13: Handle fonts based on mode
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Processing fonts`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Processing fonts' });
    if (config.fontMode !== 'keep') {
      await processTextNodes(newFrame, config, stats);
    }

    // Step 14: Replace manual sections from old mobile frame
    // Look for "Mobile - {width}px" frame and merge manual sections
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - ${config.enableManualReplacement ? 'Searching' : 'Skipping'} manual sections`);
    if (config.enableManualReplacement) {
      sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Searching manual sections' });
      replaceManualSections(newFrame, sourceFrame, config.mobileWidth, config.manualSourceFrameIds, stats);
    } else {
      sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Skipping manual sections' });
      console.log('⊗ Manual section replacement disabled');
    }

    // Step 15: Final step - Set root frame to auto height if it's a vertical layout
    // Do this LAST to ensure all children are properly sized first
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Finalizing`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Finalizing' });
    if ('layoutMode' in newFrame && newFrame.layoutMode === 'VERTICAL') {
      if ('primaryAxisSizingMode' in newFrame) {
        newFrame.primaryAxisSizingMode = 'AUTO';
        console.log('Set root frame to AUTO height');
      }
    }

    // FIX CONTENT ALIGNMENT: Ensure content doesn't overflow frame bounds
    // This fixes the issue where content is slightly offset from x=0, y=0
    if ('clipsContent' in newFrame) {
      newFrame.clipsContent = true;
      console.log('✓ Set clipsContent = true to prevent overflow');
    }

    // For auto-layout frames, ensure alignment and children are properly set
    if ('layoutMode' in newFrame && newFrame.layoutMode !== 'NONE') {
      // Ensure horizontal alignment is STRETCH or MIN to prevent centering issues
      if ('counterAxisAlignItems' in newFrame) {
        console.log(`📐 Root frame counterAxisAlignItems: ${newFrame.counterAxisAlignItems}`);
        // Keep current alignment but log it for debugging
      }

      // Ensure padding is consistent
      console.log(`📐 Root frame padding: L=${newFrame.paddingLeft || 0}, R=${newFrame.paddingRight || 0}, T=${newFrame.paddingTop || 0}, B=${newFrame.paddingBottom || 0}`);

      // Fix any misaligned children
      fixChildrenAlignment(newFrame, stats);
    }

    // Fix ALL frames with layoutMode: NONE (absolute positioning) in the tree
    // This handles nested absolute positioned content, not just root frame
    console.log(`📐 Fixing all absolute positioned frames in tree...`);
    fixAllAbsoluteFrames(newFrame, config.mobileWidth, stats);

    // Debug: Log children positions to identify misalignment
    if (hasChildren(newFrame)) {
      console.log(`📐 Root frame children positions after fix:`);
      for (const child of newFrame.children) {
        if ('x' in child && 'y' in child) {
          console.log(`  - "${child.name}": x=${child.x}, y=${child.y}, width=${child.width}`);
          if (child.x !== 0 || child.y !== 0) {
            console.warn(`  ⚠️ Child still has non-zero position!`);
          }
        }
      }
    }

    // Step 15: Select and zoom to new frame (skip for multi-version, handled by handleConvert)
    if (!config.version) {
      figma.currentPage.selection = [newFrame];
      figma.viewport.scrollAndZoomIntoView([newFrame]);
      figma.notify(`✓ Created ${config.mobileWidth}px breakpoint`, { timeout: 2000 });
    }

    return {
      success: true,
      mobileFrameId: newFrame.id,
      mobileFrameName: newFrame.name,
      errors,
      stats,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    figma.notify(`✗ Error: ${errorMsg}`, { timeout: 3000, error: true });

    return { success: false, errors, stats };
  }
}

// ============================================================================
// DETACH INSTANCES
// ============================================================================

/**
 * Recursively detach all instances in the tree so we can modify their layout
 * This is necessary because Instance children's layout cannot be modified
 * @param node - The node to process
 * @param preservedComponentNames - Array of component names that should NOT be detached
 */
function detachAllInstances(node: SceneNode, preservedComponentNames: string[] = []): void {
  // Safety check: verify node still exists before processing
  try {
    // Try to access a property to verify node exists
    const nodeExists = node.id && node.type;
    if (!nodeExists) {
      console.warn(`⚠️ Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ Node access failed, skipping: ${e}`);
    return;
  }

  // If this is an instance, check if it should be preserved
  if (node.type === 'INSTANCE') {
    // Check if this instance should be preserved
    // For nested instances or instances with deleted components, only check node name
    let shouldPreserve = false;
    const nodeName = node.name.toLowerCase();

    console.log(`🔍 Checking instance: "${node.name}" (id: ${node.id})`);
    console.log(`  📋 preservedComponentNames: [${preservedComponentNames.join(', ')}]`);

    // Always check node name first
    shouldPreserve = preservedComponentNames.some(preservedName => {
      const preserved = preservedName.toLowerCase();
      const matches = nodeName.includes(preserved);
      console.log(`    Checking nodeName "${nodeName}" includes "${preserved}": ${matches}`);
      return matches;
    });

    if (shouldPreserve) {
      console.log(`  ✅ Preserved by node name: "${node.name}"`);
    }

    // If not preserved by node name, try to check component name (may fail for nested instances)
    if (!shouldPreserve) {
      try {
        // Check if mainComponent exists before accessing it
        // Note: For nested instances (sublayers), mainComponent may throw an error
        console.log(`  🔍 Attempting to access mainComponent for instance "${node.name}" (id: ${node.id})...`);

        // Check if this is a sublayer instance (ID contains semicolon)
        const isSublayerInstance = node.id.includes(';');
        if (isSublayerInstance) {
          console.log(`  ⚠️ This is a sublayer instance (nested), skipping mainComponent check`);
        } else if ('mainComponent' in node && node.mainComponent !== null) {
          console.log(`  ✅ mainComponent exists, getting name...`);
          const componentName = node.mainComponent.name || '';
          console.log(`  📝 Component name: "${componentName}"`);
          shouldPreserve = preservedComponentNames.some(preservedName => {
            const preserved = preservedName.toLowerCase();
            const matches = componentName.toLowerCase().includes(preserved);
            console.log(`    Checking componentName "${componentName}" includes "${preserved}": ${matches}`);
            return matches;
          });
          if (shouldPreserve) {
            console.log(`  ✅ Preserved by component name: "${componentName}"`);
          }
        } else {
          console.log(`  ⚠️ mainComponent is null or doesn't exist`);
        }
      } catch (e) {
        console.error(`  ❌ Error accessing mainComponent for "${node.name}" (id: ${node.id}): ${e}`);
      }
    }

    // Final decision log
    console.log(`  🎯 Final decision for "${node.name}": ${shouldPreserve ? '✅ PRESERVE' : '❌ DETACH'}`);
    if (!shouldPreserve && preservedComponentNames.length === 0) {
      console.warn(`  ⚠️ WARNING: preservedComponentNames is EMPTY - all instances will be detached!`);
    }

    if (shouldPreserve) {
      // Don't detach preserved instances, and DON'T recurse into their children!
      // Recursing into children of a preserved instance can cause the parent to be destroyed
      // when we try to detach nested instances inside it.
      console.log(`  ⏭️ Skipping children of preserved instance "${node.name}" to keep it intact`);
      return;
    }

    // Detach the instance
    try {
      const detached = node.detachInstance();
      // After detaching, recurse into the new frame's children
      if (hasChildren(detached)) {
        for (const child of detached.children) {
          detachAllInstances(child, preservedComponentNames);
        }
      }
      return;
    } catch (e) {
      // Some instances can't be detached, continue with children
    }
  }

  // Recurse into children
  if (hasChildren(node)) {
    // Create array copy since detaching may modify the children array
    const childrenCopy = [...node.children];
    for (const child of childrenCopy) {
      try {
        detachAllInstances(child, preservedComponentNames);
      } catch (e) {
        console.error(`❌ Error processing child "${child.name}" (id: ${child.id}): ${e}`);
      }
    }
  }
}

// ============================================================================
// UNGROUP ALL GROUPS
// ============================================================================

/**
 * Ungroup all GROUP nodes recursively
 * GROUPs don't have auto-layout, so children inside them can't use FILL sizing
 * By ungrouping, children become direct children of the parent frame and can properly resize
 */
function ungroupAllGroups(node: SceneNode): void {
  if (!hasChildren(node)) {
    return;
  }

  // Process children in reverse order to handle index changes when ungrouping
  const childrenCopy = [...node.children];
  for (let i = childrenCopy.length - 1; i >= 0; i--) {
    const child = childrenCopy[i];

    if (child.type === 'GROUP') {
      try {
        const group = child as GroupNode;
        const parent = group.parent;

        if (parent && 'children' in parent) {
          // Get the index of the group in parent
          const groupIndex = parent.children.indexOf(group);

          // Move all children of the group to the parent at the same position
          const groupChildren = [...group.children];
          for (let j = groupChildren.length - 1; j >= 0; j--) {
            const groupChild = groupChildren[j];
            try {
              // Insert child at the group's position
              (parent as FrameNode | GroupNode).insertChild(groupIndex, groupChild);
              console.log(`  📦 Ungrouped "${groupChild.name}" from GROUP "${group.name}"`);

              // Recursively process the ungrouped child
              ungroupAllGroups(groupChild);
            } catch (e) {
              console.warn(`  ⚠️ Could not ungroup child "${groupChild.name}": ${e}`);
            }
          }

          // Remove the now-empty group (it should be auto-removed when empty)
          // But try to remove it explicitly just in case
          try {
            if (group.children.length === 0 || group.removed) {
              // Group is already removed or empty
            } else {
              group.remove();
            }
          } catch (e) {
            // Group may already be removed
          }
        }
      } catch (e) {
        console.warn(`  ⚠️ Could not ungroup "${child.name}": ${e}`);
        // Still try to process children inside the group
        ungroupAllGroups(child);
      }
    } else {
      // Recurse into non-GROUP children
      ungroupAllGroups(child);
    }
  }
}

// ============================================================================
// CONVERT HORIZONTAL TO VERTICAL (STACK)
// ============================================================================

/**
 * Convert horizontal auto-layouts to vertical when children won't fit in target width
 * This handles card grids, button rows, etc. that need to stack on mobile
 */
async function convertHorizontalToVertical(
  node: SceneNode,
  targetWidth: number,
  stats: TransformStats,
  strategy: 'conservative' | 'balanced' | 'aggressive' = 'balanced',
  maxSpacing: number = 40,
  uiControlPatterns: string[] = ['button', 'btn', 'cta', 'input', 'field', 'search', 'tab', 'icon'],
  sliderConfig?: { isSlider: boolean; sliderItemPattern: string }
): Promise<void> {
  // Safety check: verify node still exists
  try {
    if (!node.id || !node.type) {
      console.warn(`⚠️ convertHorizontalToVertical: Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ convertHorizontalToVertical: Node access failed: ${e}`);
    return;
  }

  // Process any node that has children - recurse first, then process
  if (hasChildren(node)) {
    for (const child of node.children) {
      try {
        await convertHorizontalToVertical(child, targetWidth, stats, strategy, maxSpacing, uiControlPatterns, sliderConfig);
      } catch (e) {
        console.error(`❌ convertHorizontalToVertical error on child "${child.name}" (id: ${child.id}): ${e}`);
      }
    }
  }

  // Now check if THIS node is a horizontal auto-layout that needs conversion
  if (!isAutoLayoutFrame(node)) {
    return;
  }

  // Check if this is a slider container - skip conversion to keep HORIZONTAL
  if (sliderConfig?.isSlider && sliderConfig?.sliderItemPattern) {
    const frame = node as FrameNode | ComponentNode | InstanceNode;
    if (frame.layoutMode === 'HORIZONTAL' && hasChildren(frame)) {
      const pattern = sliderConfig.sliderItemPattern.toLowerCase();
      const matchingChildren = frame.children.filter(child =>
        child.name.toLowerCase().includes(pattern)
      );
      if (matchingChildren.length > 0) {
        console.log(`🎠 Skipping slider container "${frame.name}" - will process separately`);
        return; // Skip conversion, keep HORIZONTAL for slider
      }
    }
  }

  // Cast to appropriate type - for INSTANCE, we need to check if we can modify it
  let frame: FrameNode | ComponentNode | InstanceNode;

  if (node.type === 'INSTANCE') {
    // Instance nodes may have restrictions on modifying layout
    // But we can still try to change layoutMode
    frame = node as InstanceNode;
  } else {
    frame = node as FrameNode;
  }

  const children = frame.children;
  if (children.length <= 1) {
    return;
  }

  // ============================================================================
  // HANDLE EXISTING VERTICAL LAYOUTS
  // Even if frame is already VERTICAL, ensure children fill width on mobile
  // ============================================================================
  if (frame.layoutMode === 'VERTICAL') {
    console.log(`🔍 "${frame.name}" is already VERTICAL (${children.length} children), ensuring children fill width...`);
    console.log(`   Frame padding: left=${frame.paddingLeft || 0}, right=${frame.paddingRight || 0}`);
    console.log(`   Target width: ${targetWidth}px`);

    for (const child of children) {
      try {
        const childWidth = child.width;
        const childName = child.name.toLowerCase();
        const childType = child.type;

        console.log(`  📦 Child: "${child.name}" (type=${childType}, width=${childWidth}px)`);

        // Check if child is an auto-layout frame
        if ('layoutSizingHorizontal' in child) {
          const childFrame = child as FrameNode | InstanceNode | ComponentNode;
          const currentSizing = childFrame.layoutSizingHorizontal;

          console.log(`     Has layoutSizingHorizontal: ${currentSizing}`);

          // Check if this is a UI control (button, input, etc.)
          // UI controls should ALWAYS keep their natural size, regardless of children count
          const isUIControl =
            uiControlPatterns.some(pattern => childName.includes(pattern.toLowerCase())) ||
            (childWidth < 150 && currentSizing === 'HUG');

          if (!isUIControl && currentSizing !== 'FILL') {
            // Set content blocks and lists to FILL
            if ((currentSizing === 'FIXED' && childWidth >= 100) ||
                (currentSizing === 'HUG')) {  // HUG lists should also fill
              try {
                childFrame.layoutSizingHorizontal = 'FILL';
                console.log(`     ✅ Changed to FILL (was ${currentSizing} ${childWidth}px)`);
              } catch (e) {
                // FILL can only be set on children of auto-layout frames
                console.log(`     ⚠️ Could not set FILL: ${e}`);
              }
            } else {
              console.log(`     ⊘ Not eligible for FILL (${currentSizing}, width=${childWidth}px)`);
            }
          } else if (isUIControl) {
            console.log(`     ⊘ Skipped (UI control)`);
          } else {
            console.log(`     ⊘ Already FILL`);
          }
        } else {
          console.log(`     ⚠️ NO layoutSizingHorizontal property (regular frame)`);

          // Regular frame (no auto-layout) - resize directly
          const isCard = childName.includes('card') || childWidth >= 100;
          console.log(`     isCard check: name.includes('card')=${childName.includes('card')}, width>=100=${childWidth >= 100}, result=${isCard}`);

          if (isCard && 'resize' in child) {
            const parentPadding = (frame.paddingLeft || 0) + (frame.paddingRight || 0);
            const availableWidth = targetWidth - parentPadding;

            console.log(`     🔧 Attempting resize: ${childWidth}px → ${availableWidth}px`);

            try {
              child.resize(availableWidth, child.height);
              console.log(`     ✅ Resized successfully!`);
            } catch (e) {
              console.log(`     ❌ Resize FAILED: ${e}`);
            }
          } else {
            console.log(`     ⊘ Not resizing (isCard=${isCard}, hasResize=${'resize' in child})`);
          }
        }
      } catch (e) {
        console.log(`     ❌ Error processing child: ${e}`);
      }
    }
    console.log(`✓ Done processing VERTICAL frame "${frame.name}"`);
    return; // Done processing VERTICAL frame
  }

  // ============================================================================
  // CONVERT HORIZONTAL LAYOUTS TO VERTICAL
  // ============================================================================

  // Only convert HORIZONTAL layouts from here
  if (frame.layoutMode !== 'HORIZONTAL') {
    return;
  }

  console.log(`📐 Processing HORIZONTAL frame: "${frame.name}" (${children.length} children, layoutMode=${frame.layoutMode})`);
  console.log(`   Frame size: ${frame.width}x${frame.height}, padding: L=${frame.paddingLeft || 0}, R=${frame.paddingRight || 0}`);

  // ============================================================================
  // SKIP CONVERSION for UI controls and elements with "- keep mobile" suffix
  // ============================================================================
  const shouldSkipConversion = async (frame: FrameNode | InstanceNode): Promise<boolean> => {
    const name = frame.name.toLowerCase();

    // 1. Check for custom "- keep mobile" suffix (no confirmation needed)
    if (name.includes('- keep mobile')) {
      console.log(`⊗ Skipping "${frame.name}" - has "- keep mobile" suffix`);
      return true;
    }

    // 2. Check by name patterns (UI controls that should stay horizontal)
    // Uses uiControlPatterns from config, plus 'nav' which is always skipped
    // Use word boundary matching to avoid false positives (e.g., "tab" matching "Tablet")

    // First, check if this is a container (not a UI control)
    // Containers should be converted to vertical even if they contain UI control keywords
    // Note: "row" is NOT in this list because rows typically need to stay horizontal
    const containerPatterns = ['wrapper', 'list', 'grid', 'section', 'group', 'column', 'stack'];
    const isContainer = containerPatterns.some(containerPattern => {
      const containerRegex = new RegExp(`(?:^|[^a-z])${containerPattern}(?:[^a-z]|$)`, 'i');
      return containerRegex.test(name);
    });

    // Check if "container" is in the name
    const hasContainerInName = /(?:^|[^a-z])container(?:[^a-z]|$)/i.test(name);

    // For frames named "Container", check if it's a small row-style layout
    // Small containers with few children (like accordion headers) should stay HORIZONTAL
    if (hasContainerInName) {
      const isSmallRowStyle = frame.height < 150 && children.length <= 3;
      if (isSmallRowStyle) {
        console.log(`⊗ "${frame.name}" is a small row-style container (h=${frame.height}px, ${children.length} children) - keeping HORIZONTAL`);
        return true; // Skip conversion, keep horizontal
      }
      // Large containers with many children should convert
      console.log(`⊗ "${frame.name}" is a large container - will convert to VERTICAL`);
      return false;
    }

    if (isContainer) {
      console.log(`⊗ "${frame.name}" is a container - will convert to VERTICAL (ignoring UI control patterns)`);
      return false; // Don't skip, convert containers to vertical
    }

    const skipPatterns = [...uiControlPatterns.map(p => p.toLowerCase()), 'nav'];
    for (const pattern of skipPatterns) {
      // Word boundary regex: pattern must be surrounded by non-word characters or start/end
      const regex = new RegExp(`(?:^|[^a-z])${pattern}(?:[^a-z]|$)`, 'i');
      if (regex.test(name)) {
        console.log(`⊗ Pattern match found: "${frame.name}" matches "${pattern}"`);

        // Ask user for confirmation
        const skipMatching = await requestPatternMatchConfirmation(
          frame.name,
          pattern,
          'HORIZONTAL',
          'Keep HORIZONTAL'
        );

        if (skipMatching) {
          console.log(`✓ User chose to skip matching - will convert "${frame.name}" to VERTICAL`);
          return false; // Don't skip, convert to vertical
        } else {
          console.log(`⊗ User chose to keep layout - skipping "${frame.name}"`);
          return true; // Skip conversion
        }
      }
    }

    // 3. Small frames with few children (likely UI controls) - no confirmation needed
    if (frame.height < 100 && children.length <= 3) {
      console.log(`⊗ Skipping "${frame.name}" - small UI control (h=${frame.height}px, ${children.length} children)`);
      return true;
    }

    return false;
  };

  if (await shouldSkipConversion(frame)) {
    return; // Keep HORIZONTAL layout
  }

  // Check if children are using FILL (flex: 1 0 0) sizing
  // If so, we need to check if they would fit based on their minimum/natural width
  const hasFlexChildren = children.some((c) => {
    if ('layoutSizingHorizontal' in c) {
      return (c as FrameNode | InstanceNode | ComponentNode).layoutSizingHorizontal === 'FILL';
    }
    return false;
  });

  // For FILL children, we should convert if there are multiple children
  // and they're meant to be equal-width columns (common pattern for card grids)
  // For fixed-width children, check if total width exceeds target
  let shouldConvert = false;

  // Strategy-based conversion thresholds
  const conversionThresholds = {
    conservative: 1.0,  // Ver1: Convert if content exceeds available space (same as balanced for conversion decision)
    balanced: 1.0,      // Ver2: Convert if content exceeds available space
    aggressive: 0.75,   // Ver3: Convert even if content is 75% of available space
  };
  const threshold = conversionThresholds[strategy];

  if (hasFlexChildren && children.length > 1) {
    // For flex children (cards in a grid), convert if more than 1 child
    // This is a common pattern where cards should stack on mobile
    const horizontalPadding = (frame.paddingLeft || 0) + (frame.paddingRight || 0);
    const availableWidth = targetWidth - horizontalPadding;
    const totalSpacing = (children.length - 1) * (frame.itemSpacing || 0);

    // Estimate: each child needs at least 200px to be readable on mobile
    const minChildWidth = 200;
    const minNeededWidth = (minChildWidth * children.length) + totalSpacing;

    shouldConvert = minNeededWidth > (availableWidth * threshold);
    console.log(`🔍 FLEX children check for "${frame.name}": availableWidth=${availableWidth}, minNeededWidth=${minNeededWidth}, threshold=${threshold}, shouldConvert=${shouldConvert}`);
  } else {
    // For fixed-width children, use actual widths
    const totalChildrenWidth = children.reduce((sum, c) => sum + c.width, 0);
    const totalSpacing = (children.length - 1) * (frame.itemSpacing || 0);
    const horizontalPadding = (frame.paddingLeft || 0) + (frame.paddingRight || 0);
    const totalNeededWidth = totalChildrenWidth + totalSpacing + horizontalPadding;

    shouldConvert = totalNeededWidth > (targetWidth * threshold);
  }

  console.log(`   Decision for "${frame.name}": shouldConvert=${shouldConvert}`);

  if (shouldConvert) {
    console.log(`   ✅ Converting "${frame.name}" from HORIZONTAL to VERTICAL`);
    // IMPORTANT: Store children's original heights BEFORE converting layout
    // When switching from HORIZONTAL to VERTICAL, children with FILL vertical sizing
    // will collapse because they no longer have a reference height
    const childrenHeights = new Map<string, number>();
    for (const child of children) {
      if ('height' in child) {
        childrenHeights.set(child.name, child.height);
        console.log(`  📏 Storing height for "${child.name}": ${child.height}px`);
      }
    }

    // Convert to vertical stack
    frame.layoutMode = 'VERTICAL';

    // Set height to AUTO so it grows with content
    frame.primaryAxisSizingMode = 'AUTO';

    // IMPORTANT: When converting to VERTICAL, the frame should fill parent width
    // This ensures lists/grids take full width on mobile instead of hugging content
    if ('layoutSizingHorizontal' in frame) {
      const currentHorizontalSizing = frame.layoutSizingHorizontal;
      if (currentHorizontalSizing === 'HUG') {
        try {
          frame.layoutSizingHorizontal = 'FILL';
          console.log(`   → Changed frame horizontal sizing from HUG to FILL`);
        } catch (e) {
          // FILL can only be set on children of auto-layout frames
          console.log(`   ⚠️ Could not change frame to FILL: ${e}`);
        }
      }
    }

    // Store original alignment for logging
    const originalAlignment = 'primaryAxisAlignItems' in frame ? frame.primaryAxisAlignItems : 'UNKNOWN';

    // IMPORTANT: Change alignment from SPACE_BETWEEN to MIN
    // SPACE_BETWEEN ignores itemSpacing and distributes items evenly
    // We need MIN (top-aligned) to use itemSpacing properly
    if ('primaryAxisAlignItems' in frame) {
      frame.primaryAxisAlignItems = 'MIN';
    }

    // Set appropriate spacing for mobile stacks based on strategy
    const currentSpacing = frame.itemSpacing || 0;
    console.log(`Converting "${frame.name}": desktop spacing = ${currentSpacing}px, alignment = ${originalAlignment}, strategy = ${strategy}`);

    // Strategy-based spacing when converting to vertical
    let newSpacing: number;
    if (strategy === 'conservative') {
      // Ver1: Minimal spacing when converting to vertical
      // If desktop had 0 spacing (SPACE_BETWEEN), use 16px as base
      newSpacing = currentSpacing === 0 ? 16 : Math.max(currentSpacing, 16);
    } else if (strategy === 'balanced') {
      // Ver2: Add moderate spacing when converting to vertical
      // If desktop had 0 spacing (SPACE_BETWEEN), use 32px as base
      newSpacing = currentSpacing === 0 ? 32 : Math.max(currentSpacing + 16, 32);
    } else {
      // Ver3 (aggressive): Add significant spacing for clear separation
      // If desktop had 0 spacing (SPACE_BETWEEN), use 40px as base
      newSpacing = currentSpacing === 0 ? 40 : Math.max(currentSpacing + 24, 40);
    }

    // IMPORTANT: Cap maximum spacing to avoid huge gaps
    // If desktop had very large spacing (e.g. 239px for visual separation),
    // we don't want to preserve that on mobile
    if (newSpacing > maxSpacing) {
      console.log(`⚠️ Capping spacing from ${newSpacing}px → ${maxSpacing}px for "${frame.name}" (desktop had ${currentSpacing}px)`);
      newSpacing = maxSpacing;
    }

    frame.itemSpacing = newSpacing;
    console.log(`✓ Set mobile spacing to ${newSpacing}px for "${frame.name}" (strategy: ${strategy}, desktop: ${currentSpacing}px)`);


    // Handle children sizing - preserve their original width behavior
    // DON'T force all children to FILL width, as this breaks buttons/inputs
    for (const child of children) {
      try {
        const childWidth = child.width;
        const childName = child.name.toLowerCase();

        // Check if child is an auto-layout frame (has layoutSizingHorizontal property)
        if ('layoutSizingHorizontal' in child) {
          const childFrame = child as FrameNode | InstanceNode | ComponentNode;
          const currentSizing = childFrame.layoutSizingHorizontal;

          console.log(`  Child "${child.name}": horizontal=${currentSizing}, width=${childWidth}, vertical=${childFrame.layoutSizingVertical}`);

          // Check if this is a UI control that should NOT fill width
          // Uses uiControlPatterns from config
          const isUIControl =
            uiControlPatterns.some(pattern => childName.includes(pattern.toLowerCase())) ||
            (childWidth < 150 && currentSizing === 'HUG'); // Small HUG elements are likely buttons

          if (isUIControl) {
            // Keep UI controls at their natural size
            console.log(`  → Keeping as ${currentSizing} (UI control)`);
          } else {
            // For content blocks (cards, sections), set to FILL width
            // This ensures cards/items stretch to full width on mobile
            // Wrap in try-catch because FILL can only be set on children of auto-layout frames
            try {
              if (currentSizing === 'FILL') {
                // Already FILL, keep it
                childFrame.layoutSizingHorizontal = 'FILL';
              } else if (currentSizing === 'FIXED') {
                // FIXED width content blocks should become FILL
                // Exception: very small fixed elements (< 100px) might be icons or small UI
                if (childWidth >= 100) {
                  childFrame.layoutSizingHorizontal = 'FILL';
                  console.log(`  → Changed to FILL (was FIXED ${childWidth}px)`);
                }
              } else if (currentSizing === 'HUG') {
                // HUG content should fill if it's a large content block
                // Small HUG elements (buttons, inputs < 150px) stay HUG
                if (childWidth >= 150) {
                  childFrame.layoutSizingHorizontal = 'FILL';
                  console.log(`  → Changed to FILL (was HUG ${childWidth}px)`);
                }
              }
            } catch (e) {
              // FILL can only be set on children of auto-layout frames
              console.log(`  ⚠️ Could not set FILL on "${child.name}": ${e}`);
            }
          }

          // Set vertical sizing - need to handle FILL children specially
          if ('layoutSizingVertical' in child) {
            const childVertical = (child as FrameNode | InstanceNode | ComponentNode).layoutSizingVertical;
            const currentHeight = 'height' in child ? (child as any).height : 0;
            const originalHeight = childrenHeights.get(child.name) || currentHeight;
            console.log(`  → Original vertical sizing: ${childVertical}, current height: ${currentHeight}, stored height: ${originalHeight}`);

            // For children with FIXED height, ALWAYS preserve their height
            // This includes small UI elements like icons, buttons, etc.
            if (childVertical === 'FIXED') {
              console.log(`  → Keeping FIXED vertical for "${child.name}" (height=${originalHeight}px)`);
              // Keep FIXED - don't change
            }
            // For children with FILL vertical sizing, they will collapse in vertical layout
            // We need to convert them to FIXED and set their original height
            else if (childVertical === 'FILL' && originalHeight >= 100) {
              console.log(`  → Converting FILL to FIXED for "${child.name}" (restoring height=${originalHeight}px)`);
              try {
                (child as FrameNode | InstanceNode | ComponentNode).layoutSizingVertical = 'FIXED';
                // Resize to restore original height
                if ('resize' in child) {
                  (child as any).resize(child.width, originalHeight);
                  console.log(`  → Restored height to ${originalHeight}px`);
                }
              } catch (e) {
                console.log(`  → Failed to restore height: ${e}`);
              }
            } else if (childVertical === 'HUG') {
              // Already HUG, keep it
              console.log(`  → Keeping HUG vertical for "${child.name}"`);
            } else {
              // For other cases (FILL with small height), convert to HUG
              (child as FrameNode | InstanceNode | ComponentNode).layoutSizingVertical = 'HUG';
              console.log(`  → Changed vertical to HUG for "${child.name}"`);
            }
          }
        } else {
          // Child is NOT an auto-layout frame (regular frame without layoutSizing properties)
          // For content cards in a vertical stack, resize them to fill parent width
          const isCard = childName.includes('card') || childWidth >= 100;

          if (isCard && 'resize' in child) {
            // Calculate full width (parent width minus padding)
            const parentPadding = (frame.paddingLeft || 0) + (frame.paddingRight || 0);
            const availableWidth = targetWidth - parentPadding;

            console.log(`  Child "${child.name}": regular frame, width=${childWidth}, resizing to ${availableWidth}px`);

            try {
              child.resize(availableWidth, child.height);
              console.log(`  → Resized regular frame to full width ${availableWidth}px`);
            } catch (e) {
              console.log(`  → Failed to resize: ${e}`);
            }
          }
        }
      } catch (e) {
        // Some nodes don't support these properties
      }
    }

    stats.nodesProcessed++;
  }
}

/**
 * Check if node is a frame/component/instance with auto-layout
 */
function isAutoLayoutFrame(node: SceneNode): node is FrameNode | ComponentNode | InstanceNode {
  return (
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') &&
    (node as FrameNode).layoutMode !== 'NONE'
  );
}

// ============================================================================
// SLIDER/CAROUSEL PROCESSING
// ============================================================================

/**
 * Process slider/carousel frames - resize items to fit mobile width
 * instead of converting to vertical layout
 *
 * @param node - Root node to search for sliders
 * @param config - Plugin configuration with slider settings
 * @param stats - Transform statistics
 */
function processSliderFrames(
  node: SceneNode,
  config: PluginConfig,
  stats: TransformStats
): void {
  // Skip if slider mode is not enabled
  if (!config.isSlider || !config.sliderItemPattern) {
    return;
  }

  const pattern = config.sliderItemPattern.toLowerCase();
  const itemsVisible = config.sliderItemsVisible || 1;
  const peekEnabled = config.sliderPeekNextItem || false;
  const peekAmount = config.sliderPeekAmount || 20;

  console.log(`🎠 Processing sliders: pattern="${pattern}", itemsVisible=${itemsVisible}, peek=${peekEnabled ? peekAmount + 'px' : 'off'}`);

  // Recursively find and process slider containers
  processSliderNode(node, pattern, itemsVisible, peekEnabled, peekAmount, config, stats);
}

/**
 * Recursively search for slider containers and process them
 */
function processSliderNode(
  node: SceneNode,
  pattern: string,
  itemsVisible: number,
  peekEnabled: boolean,
  peekAmount: number,
  config: PluginConfig,
  stats: TransformStats
): void {
  // Safety check
  try {
    if (!node.id || !node.type) return;
  } catch (e) {
    return;
  }

  // Check if this is a frame with children
  if (!hasChildren(node)) return;

  // Check if this frame contains slider items (children matching pattern)
  const frame = node as FrameNode | ComponentNode | InstanceNode;

  // Only process HORIZONTAL auto-layout frames
  if ('layoutMode' in frame && frame.layoutMode === 'HORIZONTAL') {
    // Check if children match the slider item pattern
    const matchingChildren = frame.children.filter(child =>
      child.name.toLowerCase().includes(pattern)
    );

    if (matchingChildren.length > 0) {
      console.log(`🎠 Found slider container: "${frame.name}" with ${matchingChildren.length} items matching "${pattern}"`);

      // Calculate new item width
      // Available width = frame width - padding - gaps - peek amount
      const paddingLeft = frame.paddingLeft || 0;
      const paddingRight = frame.paddingRight || 0;
      const itemSpacing = frame.itemSpacing || 0;
      const totalPadding = paddingLeft + paddingRight;
      const totalGaps = itemSpacing * (itemsVisible - 1);
      const peekSpace = peekEnabled ? peekAmount : 0;

      // Frame width should already be set to target width by now
      const availableWidth = frame.width - totalPadding - totalGaps - peekSpace;
      const newItemWidth = Math.floor(availableWidth / itemsVisible);

      console.log(`  📐 Calculating: frameWidth=${frame.width}, padding=${totalPadding}, gaps=${totalGaps}, peek=${peekSpace}`);
      console.log(`  📐 Available width: ${availableWidth}px, new item width: ${newItemWidth}px`);

      // Resize all matching children (slider items)
      for (const child of matchingChildren) {
        if ('resize' in child) {
          const originalWidth = child.width;
          const originalHeight = child.height;

          try {
            // Calculate new height maintaining aspect ratio (optional) or keep original height
            child.resize(newItemWidth, originalHeight);

            // If child is auto-layout, ensure it doesn't stretch
            if ('layoutSizingHorizontal' in child) {
              const childFrame = child as FrameNode | ComponentNode | InstanceNode;
              // Set to FIXED so it doesn't try to FILL parent
              childFrame.layoutSizingHorizontal = 'FIXED';
            }

            console.log(`  ✅ Resized "${child.name}": ${originalWidth}px → ${newItemWidth}px`);
            stats.nodesProcessed++;
          } catch (e) {
            console.log(`  ❌ Failed to resize "${child.name}": ${e}`);
          }
        }
      }

      // Also resize any non-matching children that are similar width (likely also slider items)
      const tolerance = 50; // 50px tolerance
      const referenceWidth = matchingChildren[0]?.width;
      if (referenceWidth) {
        for (const child of frame.children) {
          if (!matchingChildren.includes(child) && 'resize' in child) {
            // Check if this child has similar width to matching children
            if (Math.abs(child.width - referenceWidth) < tolerance) {
              try {
                child.resize(newItemWidth, child.height);
                if ('layoutSizingHorizontal' in child) {
                  (child as FrameNode | ComponentNode | InstanceNode).layoutSizingHorizontal = 'FIXED';
                }
                console.log(`  ✅ Also resized similar item "${child.name}": ${child.width}px → ${newItemWidth}px`);
                stats.nodesProcessed++;
              } catch (e) {
                console.log(`  ⚠️ Could not resize "${child.name}": ${e}`);
              }
            }
          }
        }
      }

      // Keep the frame as HORIZONTAL (don't convert to VERTICAL)
      // This is already handled by the pattern - we just mark it processed
      console.log(`  ✓ Slider "${frame.name}" processed, keeping HORIZONTAL layout`);

      return; // Don't recurse into slider items
    }
  }

  // Recurse into children to find nested sliders
  for (const child of frame.children) {
    processSliderNode(child, pattern, itemsVisible, peekEnabled, peekAmount, config, stats);
  }
}

// ============================================================================
// FIX FULL-WIDTH CHILDREN
// ============================================================================

/**
 * Find and fix child frames/groups that have width equal or close to original width
 * These are likely full-width sections that should scale to new width
 */
function fixFullWidthChildren(
  node: SceneNode,
  originalWidth: number,
  targetWidth: number,
  stats: TransformStats
): void {
  // Safety check: verify node still exists
  try {
    if (!node.id || !node.type) {
      console.warn(`⚠️ fixFullWidthChildren: Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ fixFullWidthChildren: Node access failed: ${e}`);
    return;
  }

  // Tolerance: consider "full width" if within 5% of original
  const tolerance = originalWidth * 0.05;
  const minWidth = originalWidth - tolerance;

  // Check if this node needs resizing
  if (isResizableNode(node)) {
    const nodeWidth = node.width;

    // IMPORTANT: Skip nodes that are already set to FILL
    // These will automatically scale with their parent
    // Resizing them would convert FILL -> FIXED which breaks responsive layout
    if ('layoutSizingHorizontal' in node &&
        (node as FrameNode | InstanceNode | ComponentNode).layoutSizingHorizontal === 'FILL') {
      console.log(`  ⊙ Skipping "${node.name}" - already FILL (will auto-scale)`);
      // Still process children
      if (hasChildren(node)) {
        for (const child of node.children) {
          fixFullWidthChildren(child, originalWidth, targetWidth, stats);
        }
      }
      return;
    }

    // If node width is close to original width, resize it
    if (nodeWidth >= minWidth && nodeWidth <= originalWidth) {
      // Calculate proportional new width
      const ratio = nodeWidth / originalWidth;
      const newWidth = Math.round(targetWidth * ratio);

      try {
        node.resize(newWidth, node.height);
        stats.nodesProcessed++;
      } catch (e) {
        // Some nodes can't be resized, skip them
      }
    }
  }

  // Recursively process children
  if (hasChildren(node)) {
    for (const child of node.children) {
      fixFullWidthChildren(child, originalWidth, targetWidth, stats);
    }
  }
}

/**
 * Check if a node can be resized
 */
function isResizableNode(node: SceneNode): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return (
    node.type === 'FRAME' ||
    node.type === 'GROUP' ||
    node.type === 'COMPONENT' ||
    node.type === 'INSTANCE'
  );
}

// ============================================================================
// FIX ABSOLUTE POSITIONED CONTENT
// ============================================================================

/**
 * Fix absolute positioned content (layoutMode: NONE) that overflows on mobile
 * Centers content that was positioned with desktop coordinates
 */
function fixAbsolutePositionedContent(
  node: SceneNode,
  targetWidth: number,
  config: PluginConfig,
  stats: TransformStats
): void {
  // Safety check: verify node still exists
  try {
    if (!node.id || !node.type) {
      console.warn(`⚠️ fixAbsolutePositionedContent: Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ fixAbsolutePositionedContent: Node access failed: ${e}`);
    return;
  }

  // Check if this node has children with absolute positioning
  if (!hasChildren(node)) {
    return;
  }

  // Check if this is a frame with layoutMode: NONE (absolute positioning)
  if (node.type === 'FRAME' && node.layoutMode === 'NONE') {
    const parent = node as FrameNode;
    const parentWidth = parent.width;
    // For absolute positioned frames, use config.containerPadding instead of parent padding
    const containerPadding = config.containerPadding * 2; // left + right
    const availableWidth = parentWidth - containerPadding;

    console.log(`🔍 Checking absolute positioned frame: "${parent.name}"`);
    console.log(`   Parent width: ${parentWidth}px`);
    console.log(`   Container padding: ${config.containerPadding}px (left + right = ${containerPadding}px)`);
    console.log(`   Available width: ${availableWidth}px`);
    console.log(`   Children count: ${parent.children.length}`);

    for (const child of parent.children) {
      // Check if child overflows parent bounds
      if ('x' in child && 'width' in child) {
        const childX = child.x;
        const childWidth = child.width;
        const childRight = childX + childWidth;
        const childName = child.name.toLowerCase();

        console.log(`  📦 Child "${child.name}": x=${childX}, width=${childWidth}, right=${childRight}, parent width=${parentWidth}`);

        // Check if this is a background image
        // Background images should fill parent width and be centered
        let hasImageFill = false;
        if ('fills' in child && Array.isArray(child.fills)) {
          hasImageFill = child.fills.some((fill: any) => fill.type === 'IMAGE');
          console.log(`     🔍 fills check: ${child.fills.length} fills, hasImageFill=${hasImageFill}`);
        }

        const isRectangle = child.type === 'RECTANGLE';
        const hasHeroName = childName.includes('hero');
        const hasImageName = childName.includes('image');
        const hasBgName = childName.includes('background') || childName.includes('bg');

        console.log(`     🔍 Background checks:`);
        console.log(`        - isRectangle: ${isRectangle}`);
        console.log(`        - hasHeroName: ${hasHeroName}`);
        console.log(`        - hasImageName: ${hasImageName}`);
        console.log(`        - hasBgName: ${hasBgName}`);
        console.log(`        - hasImageFill: ${hasImageFill}`);

        const isBackground =
          isRectangle ||
          hasHeroName ||
          hasImageName ||
          hasBgName ||
          hasImageFill;

        console.log(`     🎯 isBackground = ${isBackground}`);

        if (isBackground) {
          console.log(`     🎨 Background detected! Processing...`);

          // Background should cover parent (like CSS background-size: cover; background-position: center center)
          // Calculate aspect ratio and resize to COVER parent dimensions
          if ('resize' in child) {
            try {
              const childHeight = (child as any).height;
              const parentHeight = parent.height;

              // Store original aspect ratio
              const aspectRatio = childWidth / childHeight;
              const parentAspectRatio = parentWidth / parentHeight;

              console.log(`     📐 Original: ${childWidth}x${childHeight} (ratio: ${aspectRatio.toFixed(2)})`);
              console.log(`     📐 Parent: ${parentWidth}x${parentHeight} (ratio: ${parentAspectRatio.toFixed(2)})`);

              // Calculate cover dimensions (fill parent while maintaining aspect ratio)
              let newWidth: number;
              let newHeight: number;

              if (parentAspectRatio > aspectRatio) {
                // Parent is wider - fit to width
                newWidth = parentWidth;
                newHeight = Math.round(parentWidth / aspectRatio);
              } else {
                // Parent is taller - fit to height
                newHeight = parentHeight;
                newWidth = Math.round(parentHeight * aspectRatio);
              }

              console.log(`     🎯 Cover size: ${newWidth}x${newHeight}`);

              // Resize to cover dimensions
              child.resize(newWidth, newHeight);
              console.log(`     ✅ Resized background: ${childWidth}x${childHeight} → ${newWidth}x${newHeight}`);

              // Center background (CSS: background-position: center center)
              const newX = Math.round((parentWidth - newWidth) / 2);
              const newY = Math.round((parentHeight - newHeight) / 2);

              child.x = newX;
              child.y = newY;
              console.log(`     ✅ Centered background: x=${newX}, y=${newY}`);
            } catch (e) {
              console.log(`     ❌ Background resize/position failed: ${e}`);
            }
          }

          continue; // Skip further processing for backgrounds
        }

        // Check if this is a button or button group (should keep natural size, only resize if overflows)
        const isButton = childName.includes('button') || childName.includes('btn');
        const isButtonGroup = childName.includes('button') && (childName.includes('group') || hasChildren(child));

        console.log(`     🔍 Element check: isButton=${isButton}, isButtonGroup=${isButtonGroup}`);

        // If child width exceeds AVAILABLE width (accounting for padding), resize it
        if (childWidth > availableWidth && 'resize' in child) {
          console.log(`     ⚠️ Child width (${childWidth}px) > available width (${availableWidth}px)`);

          if (isButton || isButtonGroup) {
            // For buttons/button groups: resize to fit but keep them at left with padding
            console.log(`     🔧 Resizing button/group to fit: ${availableWidth}px`);
            try {
              child.resize(availableWidth, (child as any).height);
              stats.nodesProcessed++;
              console.log(`     ✅ Resized button successfully!`);

              // Position at left with containerPadding
              child.x = config.containerPadding;
              console.log(`     ✅ Positioned button at x=${config.containerPadding}`);
            } catch (e) {
              console.log(`     ❌ Button resize FAILED: ${e}`);
            }
          } else {
            // For content blocks: resize to full available width
            console.log(`     🔧 Resizing content to ${availableWidth}px`);
            try {
              child.resize(availableWidth, (child as any).height);
              stats.nodesProcessed++;
              console.log(`     ✅ Resized successfully!`);

              // After resize, position considering containerPadding
              child.x = config.containerPadding;
              console.log(`     ✅ Positioned at x=${config.containerPadding} (respecting containerPadding)`);
            } catch (e) {
              console.log(`     ❌ Resize FAILED: ${e}`);
            }
          }
        }
        // If child extends beyond parent width (right edge overflow), reposition it
        else if (childRight > parentWidth) {
          if (isButton || isButtonGroup) {
            // For buttons: keep natural size, just reposition to fit
            console.log(`     ⚠️ Button overflows parent! Repositioning to x=${config.containerPadding}`);
            try {
              child.x = config.containerPadding;
              stats.nodesProcessed++;
              console.log(`     ✅ Repositioned button successfully!`);
            } catch (e) {
              console.log(`     ❌ Failed to reposition button: ${e}`);
            }
          } else {
            // For content: center within available space
            const newX = config.containerPadding + Math.max(0, (availableWidth - childWidth) / 2);
            console.log(`     ⚠️ Content overflows! Moving from x=${childX} → x=${newX} (centered)`);
            try {
              child.x = newX;
              stats.nodesProcessed++;
              console.log(`     ✅ Repositioned successfully!`);
            } catch (e) {
              console.log(`     ❌ Failed to reposition: ${e}`);
            }
          }
        } else {
          console.log(`     ✓ Child fits within parent, no adjustment needed`);
        }
      }
    }
  }

  // Recursively process children
  for (const child of node.children) {
    fixAbsolutePositionedContent(child, targetWidth, config, stats);
  }
}

// ============================================================================
// FIX VERTICAL LAYOUT HEIGHTS
// ============================================================================

/**
 * Fix vertical layouts to have auto height so they grow with content
 * This prevents items from overlapping when stacked
 */
function fixVerticalLayoutHeights(
  node: SceneNode,
  stats: TransformStats,
  version?: number
): void {
  // Safety check: verify node still exists
  try {
    if (!node.id || !node.type) {
      console.warn(`⚠️ fixVerticalLayoutHeights: Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ fixVerticalLayoutHeights: Node access failed: ${e}`);
    return;
  }

  // Process children first
  if (hasChildren(node)) {
    for (const child of node.children) {
      try {
        fixVerticalLayoutHeights(child, stats, version);
      } catch (e) {
        console.error(`❌ fixVerticalLayoutHeights error on child: ${e}`);
      }
    }
  }

  // Check if this is an auto-layout frame
  if (!isAutoLayoutFrame(node)) {
    return;
  }

  const frame = node as FrameNode;

  // For VERTICAL layouts, ensure height is AUTO (hug content)
  if (frame.layoutMode === 'VERTICAL') {
    try {
      if (frame.primaryAxisSizingMode === 'FIXED') {
        const currentHeight = frame.height;

        // Ver 1: Preserve FIXED height for small UI elements (icons, buttons < 100px)
        // Ver 2, 3: Always convert to AUTO (original behavior)
        if (version === 1 && currentHeight < 100) {
          console.log(`  → [Ver1] Keeping FIXED primaryAxisSizingMode for "${frame.name}" (small UI element, height=${currentHeight}px)`);

          // Also ensure small icon frames are centered (common pattern for icon containers)
          if (frame.primaryAxisAlignItems !== 'CENTER') {
            console.log(`  → [Ver1] Setting primaryAxisAlignItems to CENTER for "${frame.name}" (icon container)`);
            frame.primaryAxisAlignItems = 'CENTER';
          }
        } else {
          frame.primaryAxisSizingMode = 'AUTO';
          stats.nodesProcessed++;
          console.log(`  → Changed primaryAxisSizingMode to AUTO for "${frame.name}" (height=${currentHeight}px)`);
        }
      }
    } catch (e) {
      // Some frames can't be modified
    }
  }
}

// ============================================================================
// FIX CHILDREN ALIGNMENT
// ============================================================================

/**
 * Recursively find and fix ALL frames with layoutMode: NONE in the tree
 * This ensures nested absolute positioned content is also fixed
 */
function fixAllAbsoluteFrames(
  node: SceneNode,
  targetWidth: number,
  stats: TransformStats
): void {
  // Safety check
  try {
    if (!node.id || !node.type) return;
  } catch (e) {
    return;
  }

  // If this is a frame with layoutMode: NONE, fix its children
  if (node.type === 'FRAME' && (node as FrameNode).layoutMode === 'NONE') {
    console.log(`📐 Found absolute positioned frame: "${node.name}"`);
    fixAbsoluteChildrenBounds(node as FrameNode, node.width, stats);
  }

  // Recurse into children
  if (hasChildren(node)) {
    for (const child of node.children) {
      fixAllAbsoluteFrames(child, targetWidth, stats);
    }
  }
}

/**
 * Fix absolute positioned children that extend outside parent bounds
 * This handles the case where content is slightly offset from x=0, y=0
 * Also fixes constraints that cause "snap back" behavior
 */
function fixAbsoluteChildrenBounds(
  parent: FrameNode,
  targetWidth: number,
  stats: TransformStats
): void {
  if (!hasChildren(parent)) return;

  console.log(`🔧 Fixing absolute children bounds in "${parent.name}" (targetWidth=${targetWidth})`);

  for (const child of parent.children) {
    if (!('x' in child) || !('width' in child)) continue;

    const childX = child.x;
    const childWidth = child.width;
    const childRight = childX + childWidth;

    console.log(`  📦 "${child.name}": x=${childX}, width=${childWidth}, right=${childRight}`);

    // Log and fix constraints - these cause the "snap back" behavior
    if ('constraints' in child) {
      const constraints = (child as FrameNode).constraints;
      console.log(`    📐 Constraints: horizontal=${constraints.horizontal}, vertical=${constraints.vertical}`);

      // If horizontal constraint is CENTER or SCALE, the element will snap back
      // Change to LEFT to allow manual positioning
      if (constraints.horizontal === 'CENTER' || constraints.horizontal === 'SCALE') {
        console.log(`    🔄 Changing horizontal constraint from ${constraints.horizontal} to MIN (left)`);
        try {
          (child as FrameNode).constraints = {
            horizontal: 'MIN',  // MIN = Left constraint
            vertical: constraints.vertical
          };
          console.log(`    ✅ Changed constraints to LEFT`);
        } catch (e) {
          console.log(`    ❌ Failed to change constraints: ${e}`);
        }
      }
    }

    // Check if child starts before x=0 (negative x)
    if (childX < 0) {
      console.log(`    ⚠️ Child has negative x (${childX}), moving to x=0`);
      try {
        child.x = 0;
        stats.nodesProcessed++;
      } catch (e) {
        console.log(`    ❌ Failed to move: ${e}`);
      }
    }

    // Check if child extends beyond parent right edge
    if (childRight > targetWidth && childX >= 0) {
      // Child overflows to the right
      // Center it within the parent
      const newX = Math.max(0, (targetWidth - childWidth) / 2);
      console.log(`    ⚠️ Child overflows right (right=${childRight}), centering at x=${newX}`);
      try {
        child.x = newX;
        stats.nodesProcessed++;
      } catch (e) {
        console.log(`    ❌ Failed to move: ${e}`);
      }
    }

    // Recurse into children if it's a frame with absolute positioning
    if (child.type === 'FRAME' && (child as FrameNode).layoutMode === 'NONE') {
      fixAbsoluteChildrenBounds(child as FrameNode, child.width, stats);
    }
  }
}

/**
 * Fix children alignment in auto-layout frames
 * In auto-layout, children's x/y positions are managed by the layout engine
 * But sometimes cloned frames have residual x/y offsets that cause misalignment
 * This function recursively fixes any misaligned children
 */
function fixChildrenAlignment(
  node: SceneNode,
  stats: TransformStats
): void {
  // Safety check
  try {
    if (!node.id || !node.type) return;
  } catch (e) {
    return;
  }

  if (!hasChildren(node)) return;

  // Check if this is an auto-layout frame
  const isAutoLayout = 'layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE';

  // Get parent's content area width (for auto-layout frames with padding)
  let parentContentWidth = 0;
  if (isAutoLayout && 'width' in node) {
    const parentFrame = node as FrameNode;
    const paddingLeft = parentFrame.paddingLeft || 0;
    const paddingRight = parentFrame.paddingRight || 0;
    parentContentWidth = parentFrame.width - paddingLeft - paddingRight;
    console.log(`  📐 Parent "${node.name}" width=${parentFrame.width}, padding L=${paddingLeft} R=${paddingRight}, content area=${parentContentWidth}`);
  }

  for (const child of node.children) {
    // For auto-layout parents, children should be managed by layout
    // If a child has constraints that cause offset, we need to fix it
    if (isAutoLayout && 'layoutPositioning' in child) {
      const childFrame = child as FrameNode | InstanceNode | ComponentNode;

      // Log detailed info for debugging
      console.log(`  📦 Checking child in auto-layout: "${child.name}"`);
      console.log(`     layoutPositioning: ${childFrame.layoutPositioning}`);

      // Log constraints if available
      if ('constraints' in child) {
        const constraints = (child as any).constraints;
        console.log(`     constraints: horizontal=${constraints?.horizontal}, vertical=${constraints?.vertical}`);
      }

      // If child is set to ABSOLUTE positioning within auto-layout,
      // it can have x/y offsets that cause misalignment
      if (childFrame.layoutPositioning === 'ABSOLUTE') {
        console.log(`  🔧 Found ABSOLUTE positioned child in auto-layout: "${child.name}"`);

        if ('x' in child && 'width' in child) {
          console.log(`    📐 Position: x=${child.x}, width=${child.width}`);
        }

        // Check if this is a background element that should KEEP ABSOLUTE positioning
        // Background elements are typically named "BG", "bg", "background", etc.
        const backgroundPatterns = ['bg', 'background', 'backdrop', 'overlay'];
        const childNameLower = child.name.toLowerCase().trim();
        const isBackgroundElement = backgroundPatterns.some(pattern => {
          // Match exact name or name with prefix/suffix separators
          const regex = new RegExp(`(?:^|[\\s_-])${pattern}(?:[\\s_-]|$)`, 'i');
          return childNameLower === pattern || regex.test(childNameLower);
        });

        if (isBackgroundElement) {
          console.log(`    🎨 PRESERVING ABSOLUTE positioning - detected background element by name: "${child.name}"`);
          // Keep ABSOLUTE positioning for background elements
          // They need to stay behind content, not become stacked items

          // Also fix children inside the BG frame that might have offset positions
          fixBackgroundFrameChildren(childFrame, stats);
        } else {
          // Change ABSOLUTE to AUTO for non-background children in auto-layout
          // This prevents the "snap back" behavior and offset issues
          console.log(`    🔄 Changing from ABSOLUTE to AUTO positioning...`);
          try {
            childFrame.layoutPositioning = 'AUTO';
            console.log(`    ✅ Changed to AUTO positioning`);
            stats.nodesProcessed++;
          } catch (e) {
            console.log(`    ❌ Failed to change positioning: ${e}`);
          }
        }
      }
    }
    // Also check for children that DON'T have layoutPositioning property but are in auto-layout
    // These might be regular frames/groups that somehow have x/y offset
    else if (isAutoLayout && 'x' in child && child.x !== 0) {
      console.log(`  ⚠️ Child "${child.name}" has x=${child.x} in auto-layout parent (should be 0)`);

      // Check if this child has layoutPositioning (might be ABSOLUTE even without the check above)
      if ('layoutPositioning' in child) {
        const childWithPos = child as FrameNode | InstanceNode | ComponentNode;
        console.log(`    layoutPositioning = ${childWithPos.layoutPositioning}`);

        if (childWithPos.layoutPositioning === 'ABSOLUTE') {
          // Check if this is a background element that should KEEP ABSOLUTE positioning
          const backgroundPatterns = ['bg', 'background', 'backdrop', 'overlay'];
          const childNameLower = child.name.toLowerCase().trim();
          const isBackgroundElement = backgroundPatterns.some(pattern => {
            const regex = new RegExp(`(?:^|[\\s_-])${pattern}(?:[\\s_-]|$)`, 'i');
            return childNameLower === pattern || regex.test(childNameLower);
          });

          if (isBackgroundElement) {
            console.log(`    🎨 PRESERVING ABSOLUTE positioning - detected background element: "${child.name}"`);
            // Also fix children inside the BG frame that might have offset positions
            fixBackgroundFrameChildren(childWithPos, stats);
          } else {
            console.log(`    🔄 Changing from ABSOLUTE to AUTO...`);
            try {
              childWithPos.layoutPositioning = 'AUTO';
              console.log(`    ✅ Changed to AUTO`);
              stats.nodesProcessed++;
            } catch (e) {
              console.log(`    ❌ Failed: ${e}`);
            }
          }
        }
      } else {
        console.log(`    ⚠️ No layoutPositioning property - this is unexpected in auto-layout`);
      }
    }

    // Fix children with FIXED width that overflow parent content area
    // When parent has padding, child with FIXED width = parent width will overflow
    // Change such children to FILL so they auto-fit the content area
    if (isAutoLayout && parentContentWidth > 0 && 'layoutSizingHorizontal' in child && 'width' in child) {
      const childWithSizing = child as FrameNode | InstanceNode | ComponentNode;
      const childWidth = (child as any).width;

      // Check if child has FIXED sizing and width >= parent content area
      // This means the child will overflow the padding
      if (childWithSizing.layoutSizingHorizontal === 'FIXED' && childWidth >= parentContentWidth) {
        console.log(`  🔧 Child "${child.name}" has FIXED width ${childWidth} >= parent content area ${parentContentWidth}`);
        console.log(`    🔄 Changing layoutSizingHorizontal from FIXED to FILL...`);
        try {
          childWithSizing.layoutSizingHorizontal = 'FILL';
          console.log(`    ✅ Changed to FILL - child will now auto-fit parent content area`);
          stats.nodesProcessed++;
        } catch (e) {
          console.log(`    ❌ Failed to change sizing: ${e}`);
        }
      }
    }

    // Recurse into children
    fixChildrenAlignment(child, stats);
  }
}

// ============================================================================
// BACKGROUND FRAME FIX
// ============================================================================

/**
 * Fix children inside background frames (BG, background, etc.)
 * These children often have offset positions (negative y) that need to be reset
 * so the background image displays correctly after conversion
 */
function fixBackgroundFrameChildren(bgFrame: FrameNode | InstanceNode | ComponentNode, stats: TransformStats): void {
  if (!('children' in bgFrame)) return;

  const parentWidth = bgFrame.width;
  const parentHeight = bgFrame.height;

  console.log(`  🖼️ Fixing background frame children: "${bgFrame.name}" (${parentWidth}x${parentHeight})`);

  for (const child of bgFrame.children) {
    // Check if child has position properties
    if ('x' in child && 'y' in child && 'width' in child && 'height' in child) {
      const childX = (child as any).x;
      const childY = (child as any).y;
      const childWidth = (child as any).width;
      const childHeight = (child as any).height;

      console.log(`    📍 Child "${child.name}": x=${childX}, y=${childY}, size=${childWidth}x${childHeight}`);

      // If child has negative offset or is positioned outside the frame, reset to 0,0
      if (childX !== 0 || childY !== 0) {
        console.log(`    🔄 Resetting position from (${childX}, ${childY}) to (0, 0)`);
        try {
          (child as any).x = 0;
          (child as any).y = 0;
          stats.nodesProcessed++;
        } catch (e) {
          console.log(`    ❌ Failed to reset position: ${e}`);
        }
      }

      // Resize child to fill the background frame
      if ('resize' in child) {
        // Resize to fill parent dimensions
        if (childWidth !== parentWidth || childHeight !== parentHeight) {
          console.log(`    🔄 Resizing from ${childWidth}x${childHeight} to ${parentWidth}x${parentHeight}`);
          try {
            (child as SceneNode & { resize: (w: number, h: number) => void }).resize(parentWidth, parentHeight);
            console.log(`    ✅ Resized to fill background frame`);
            stats.nodesProcessed++;
          } catch (e) {
            console.log(`    ❌ Failed to resize: ${e}`);
          }
        }
      }
    }
  }
}

// ============================================================================
// IMAGE ASPECT RATIOS
// ============================================================================

/**
 * Store aspect ratios of all image frames before resizing
 * Returns a Map of node.name -> aspect ratio
 * Uses name as key since IDs change after cloning
 */
function storeImageAspectRatios(node: SceneNode): Map<string, number> {
  const aspectRatios = new Map<string, number>();

  function traverse(n: SceneNode, path: string): void {
    // Create a unique path for this node (parent names + node name)
    const currentPath = path ? `${path}/${n.name}` : n.name;

    // Look for any node that can have image fills (FRAME, RECTANGLE, ELLIPSE, etc.)
    if ('fills' in n && 'width' in n && 'height' in n) {
      const hasImageFill = n.fills !== figma.mixed &&
                           Array.isArray(n.fills) &&
                           n.fills.some(fill => fill.type === 'IMAGE');

      if (hasImageFill && n.width > 0) {
        // Store aspect ratio (height / width) with path as key
        aspectRatios.set(currentPath, n.height / n.width);
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
  return aspectRatios;
}

/**
 * Restore image aspect ratios after resizing
 * Uses the stored aspect ratios to calculate correct heights
 */
function restoreImageAspectRatios(
  node: SceneNode,
  aspectRatios: Map<string, number>,
  mobileSuffix: string,
  stats: TransformStats
): void {
  function traverse(n: SceneNode, path: string): void {
    // Strip mobile suffix from node name for path matching
    const nodeName = n.name.replace(mobileSuffix, '');
    const currentPath = path ? `${path}/${nodeName}` : nodeName;

    // Check if this node can have image fills and was stored
    if ('fills' in n && 'width' in n && 'height' in n && 'resize' in n) {
      const storedRatio = aspectRatios.get(currentPath);

      if (storedRatio !== undefined) {
        // Calculate new height based on current width and stored aspect ratio
        const newHeight = Math.round(n.width * storedRatio);

        console.log(`Restoring ${currentPath}: width=${n.width}, ratio=${storedRatio}, newHeight=${newHeight}`);

        try {
          // Check if parent is auto-layout - if so, we need to be careful
          // Don't force FIXED height on images inside auto-layout cards
          const parent = n.parent;
          const parentIsAutoLayout = parent && 'layoutMode' in parent && parent.layoutMode !== 'NONE';

          if (parentIsAutoLayout) {
            // For images in auto-layout (like card images), just resize
            // Let the parent manage the sizing mode
            n.resize(n.width, newHeight);
            console.log(`✓ Resized ${currentPath} (in auto-layout parent)`);
          } else {
            // For standalone images, set FIXED sizing
            if ('layoutSizingVertical' in n) {
              (n as FrameNode | InstanceNode | ComponentNode).layoutSizingVertical = 'FIXED';
            }
            n.resize(n.width, newHeight);
            console.log(`✓ Resized ${currentPath} (standalone)`);
          }

          stats.nodesProcessed++;
        } catch (e) {
          console.log(`Failed to resize ${currentPath}:`, e);
        }
      } else {
        // Debug: log when we can't find the path
        const hasImageFill = n.fills !== figma.mixed &&
                             Array.isArray(n.fills) &&
                             n.fills.some(fill => fill.type === 'IMAGE');
        if (hasImageFill) {
          console.log(`Image NOT FOUND in map: ${currentPath}`);
        }
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
}

// ============================================================================
// ICON SIZE PRESERVATION
// ============================================================================

interface IconChildSize {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface IconSize {
  width: number;
  height: number;
  // Flattened map of all descendants (key = name, for VECTOR nodes with same name, use index suffix)
  allDescendants: Map<string, IconChildSize>;
}

/**
 * Store sizes of icon frames before resize
 * Icons are small frames (typically ≤120px) that should NOT be scaled
 * They often contain Vector or Group elements
 */
function storeIconSizes(node: SceneNode): Map<string, IconSize> {
  const iconSizes = new Map<string, IconSize>();

  function traverse(n: SceneNode, path: string): void {
    const currentPath = path ? `${path}/${n.name}` : n.name;

    // Detect icon frames: small frames that contain Vector/Group
    if (n.type === 'FRAME' && 'width' in n && 'height' in n) {
      const frame = n as FrameNode;
      const isSmallFrame = frame.width <= 120 && frame.height <= 120;

      // Check if contains Vector or Group (typical icon content)
      let containsVectorOrGroup = false;
      if (hasChildren(frame)) {
        for (const child of frame.children) {
          if (child.type === 'VECTOR' || child.type === 'GROUP') {
            containsVectorOrGroup = true;
            break;
          }
        }
      }

      // Also check by name pattern
      const nameLower = n.name.toLowerCase();
      const isIconByName = nameLower.includes('icon') || nameLower.includes('logo');

      if (isSmallFrame && (containsVectorOrGroup || isIconByName)) {
        // Flatten all descendants (VECTOR, LINE, etc.) regardless of GROUP structure
        const allDescendants = new Map<string, IconChildSize>();
        const nameCounters = new Map<string, number>();

        function collectAllDescendants(parent: SceneNode): void {
          if (!hasChildren(parent)) return;
          for (const child of (parent as any).children) {
            // Store VECTOR, LINE, ELLIPSE, RECTANGLE, POLYGON, STAR nodes
            if (child.type === 'VECTOR' || child.type === 'LINE' ||
                child.type === 'ELLIPSE' || child.type === 'RECTANGLE' ||
                child.type === 'POLYGON' || child.type === 'STAR') {
              if ('width' in child && 'height' in child && 'x' in child && 'y' in child) {
                // Use counter for duplicate names (e.g., multiple "Vector" nodes)
                const count = nameCounters.get(child.name) || 0;
                const key = count === 0 ? child.name : `${child.name}_${count}`;
                nameCounters.set(child.name, count + 1);

                allDescendants.set(key, {
                  width: child.width,
                  height: child.height,
                  x: child.x,
                  y: child.y
                });
              }
            }
            // Recurse into GROUP to get nested VECTORs
            if (child.type === 'GROUP' && hasChildren(child)) {
              collectAllDescendants(child);
            }
          }
        }

        collectAllDescendants(frame);

        iconSizes.set(currentPath, {
          width: frame.width,
          height: frame.height,
          allDescendants
        });

        console.log(`📦 Stored icon: "${currentPath}" (${frame.width}x${frame.height}) with ${allDescendants.size} vector descendants`);
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
  return iconSizes;
}

/**
 * Restore icon sizes after frame resize
 * This prevents icons from being scaled down with the parent frame
 */
function restoreIconSizes(
  node: SceneNode,
  iconSizes: Map<string, IconSize>,
  mobileSuffix: string,
  stats: TransformStats
): void {
  function traverse(n: SceneNode, path: string): void {
    // Strip mobile suffix from node name for path matching
    const nodeName = n.name.replace(mobileSuffix, '');
    const currentPath = path ? `${path}/${nodeName}` : nodeName;

    // Check if this is a stored icon frame
    if (n.type === 'FRAME' && 'resize' in n) {
      const storedIcon = iconSizes.get(currentPath);

      if (storedIcon) {
        const frame = n as FrameNode;
        console.log(`🔧 Restoring icon: "${currentPath}" from ${frame.width}x${frame.height} to ${storedIcon.width}x${storedIcon.height}`);

        try {
          // Restore frame size
          frame.resize(storedIcon.width, storedIcon.height);

          // Collect all current vector descendants in the frame (after ungroup, they're direct children)
          const currentVectors: SceneNode[] = [];
          const nameCounters = new Map<string, number>();

          if (hasChildren(frame)) {
            for (const child of frame.children) {
              if (child.type === 'VECTOR' || child.type === 'LINE' ||
                  child.type === 'ELLIPSE' || child.type === 'RECTANGLE' ||
                  child.type === 'POLYGON' || child.type === 'STAR') {
                currentVectors.push(child);
              }
            }
          }

          // Restore each vector using same naming convention as store
          for (const vector of currentVectors) {
            const count = nameCounters.get(vector.name) || 0;
            const key = count === 0 ? vector.name : `${vector.name}_${count}`;
            nameCounters.set(vector.name, count + 1);

            const storedSize = storedIcon.allDescendants.get(key);
            if (storedSize) {
              // Restore position
              if ('x' in vector && 'y' in vector) {
                const currentX = (vector as any).x;
                const currentY = (vector as any).y;
                if (currentX !== storedSize.x || currentY !== storedSize.y) {
                  console.log(`  ↳ Restoring position "${key}" from (${currentX},${currentY}) to (${storedSize.x},${storedSize.y})`);
                  try {
                    (vector as any).x = storedSize.x;
                    (vector as any).y = storedSize.y;
                  } catch (e) {
                    console.log(`  ❌ Failed to restore position: ${e}`);
                  }
                }
              }

              // Restore size
              if ('resize' in vector) {
                const currentWidth = (vector as any).width;
                const currentHeight = (vector as any).height;
                if (currentWidth !== storedSize.width || currentHeight !== storedSize.height) {
                  console.log(`  ↳ Restoring size "${key}" from ${currentWidth}x${currentHeight} to ${storedSize.width}x${storedSize.height}`);
                  try {
                    (vector as any).resize(storedSize.width, storedSize.height);
                  } catch (e) {
                    console.log(`  ❌ Failed to restore size: ${e}`);
                  }
                }
              }
            }
          }

          stats.nodesProcessed++;
          console.log(`✓ Restored icon: "${currentPath}" with ${currentVectors.length} vectors`);
        } catch (e) {
          console.log(`❌ Failed to restore icon "${currentPath}":`, e);
        }
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
}

// ============================================================================
// MEDIA CONTAINER SIZE PRESERVATION
// ============================================================================

interface MediaContainerSize {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Store sizes of media containers (video frames, image containers) before resize
 * These are frames that:
 * - Have names containing 'video', 'media', 'player', 'thumbnail'
 * - Have layoutSizingVertical: FIXED with significant height
 * - Contain image fills or rectangles (likely video thumbnails)
 */
function storeMediaContainerSizes(node: SceneNode): Map<string, MediaContainerSize> {
  const mediaContainers = new Map<string, MediaContainerSize>();

  function traverse(n: SceneNode, path: string): void {
    const currentPath = path ? `${path}/${n.name}` : n.name;

    if (n.type === 'FRAME' && 'width' in n && 'height' in n) {
      const frame = n as FrameNode;
      const nameLower = n.name.toLowerCase();

      // Detect media containers by name or structure
      const isMediaByName = nameLower.includes('video') ||
                           nameLower.includes('media') ||
                           nameLower.includes('player') ||
                           nameLower.includes('thumbnail') ||
                           nameLower.includes('preview');

      // Or detect by having FIXED vertical sizing with significant height
      const hasFixedHeight = 'layoutSizingVertical' in frame &&
                            frame.layoutSizingVertical === 'FIXED' &&
                            frame.height >= 150;

      // Or has FILL vertical (will collapse when parent changes to VERTICAL)
      const hasFillVertical = 'layoutSizingVertical' in frame &&
                             frame.layoutSizingVertical === 'FILL' &&
                             frame.height >= 150;

      // Check if contains image-like content (RECTANGLE with fills, or image)
      let hasImageContent = false;
      if (hasChildren(frame)) {
        for (const child of frame.children) {
          if (child.type === 'RECTANGLE') {
            hasImageContent = true;
            break;
          }
        }
      }

      // Only store if:
      // 1. Has media-related name (video, media, player, etc.) - most reliable
      // 2. OR has FIXED/FILL height >= 150px, contains RECTANGLE, AND has layoutMode: NONE
      //    (auto-layout frames with RECTANGLE are likely cards, not video containers)
      const hasNoAutoLayout = frame.layoutMode === 'NONE';
      const isLikelyMediaContainer = isMediaByName ||
        ((hasFixedHeight || hasFillVertical) && hasImageContent && hasNoAutoLayout);

      if (isLikelyMediaContainer) {
        mediaContainers.set(currentPath, {
          width: frame.width,
          height: frame.height,
          aspectRatio: frame.height / frame.width
        });
        console.log(`📹 Stored media container: "${currentPath}" (${frame.width}x${frame.height}, layoutMode=${frame.layoutMode})`);
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
  return mediaContainers;
}

/**
 * Restore media container sizes after frame resize
 * Calculates new height based on original aspect ratio and new width
 */
function restoreMediaContainerSizes(
  node: SceneNode,
  mediaContainers: Map<string, MediaContainerSize>,
  mobileSuffix: string,
  targetWidth: number,
  containerPadding: number,
  stats: TransformStats
): void {
  function traverse(n: SceneNode, path: string): void {
    // Strip mobile suffix from node name for path matching
    const nodeName = n.name.replace(mobileSuffix, '');
    const currentPath = path ? `${path}/${nodeName}` : nodeName;

    if (n.type === 'FRAME' && 'resize' in n) {
      const storedMedia = mediaContainers.get(currentPath);

      if (storedMedia) {
        const frame = n as FrameNode;
        const currentWidth = frame.width;
        const currentHeight = frame.height;

        // Calculate new dimensions
        // Use full available width (target width minus padding)
        const availableWidth = targetWidth - (containerPadding * 2);
        const newWidth = Math.min(availableWidth, storedMedia.width);
        const newHeight = Math.round(newWidth * storedMedia.aspectRatio);

        console.log(`📹 Restoring media container: "${currentPath}"`);
        console.log(`   Current: ${currentWidth}x${currentHeight}`);
        console.log(`   Target: ${newWidth}x${newHeight} (aspect ratio: ${storedMedia.aspectRatio.toFixed(3)})`);

        try {
          // Set to FILL width and FIXED height
          if ('layoutSizingHorizontal' in frame) {
            frame.layoutSizingHorizontal = 'FILL';
          }
          if ('layoutSizingVertical' in frame) {
            frame.layoutSizingVertical = 'FIXED';
          }

          // Resize to new dimensions
          frame.resize(newWidth, newHeight);

          // Also resize children (thumbnails/images) to fit the container
          // They may have been scaled incorrectly during parent resize
          if (hasChildren(frame)) {
            for (const child of frame.children) {
              if (child.type === 'RECTANGLE' && 'resize' in child) {
                // Resize image to fill the container
                console.log(`   ↳ Resizing child "${child.name}" to ${newWidth}x${newHeight}`);
                try {
                  (child as RectangleNode).resize(newWidth, newHeight);
                  // Position at 0,0
                  if ('x' in child) child.x = 0;
                  if ('y' in child) child.y = 0;
                } catch (e) {
                  console.log(`     ❌ Failed to resize child: ${e}`);
                }
              }
            }
          }

          // Clip content to prevent overflow
          if ('clipsContent' in frame) {
            frame.clipsContent = true;
          }

          stats.nodesProcessed++;
          console.log(`   ✓ Restored to ${newWidth}x${newHeight}`);
        } catch (e) {
          console.log(`   ❌ Failed to restore: ${e}`);
        }
      }
    }

    // Recurse into children
    if (hasChildren(n)) {
      for (const child of n.children) {
        traverse(child, currentPath);
      }
    }
  }

  traverse(node, '');
}

// ============================================================================
// MANUAL SECTIONS REPLACEMENT
// ============================================================================

/**
 * Replace auto-generated sections with manual sections from selected mobile frames
 * Uses manualSourceFrameIds from config to find manual sections
 * Falls back to searching all frames if no frames are selected
 */
function replaceManualSections(
  newFrame: FrameNode | SectionNode | InstanceNode,
  sourceFrame: FrameNode | SectionNode | InstanceNode,
  mobileWidth: number,
  manualSourceFrameIds: string[],
  stats: TransformStats
): void {
  // Only process frames with children
  if (!hasChildren(newFrame) || newFrame.children.length === 0) {
    return;
  }

  // Helper: Strip suffix from name to get base name
  const getBaseName = (name: string): string => {
    return name
      .replace(/ - manual$/i, '')    // Remove "- manual"
      .replace(/ - \d+px$/i, '');     // Remove "- 414px"
  };

  let sourceMobileFrames: (FrameNode | SectionNode | InstanceNode)[] = [];

  // METHOD 1: Use selected frames if provided
  if (manualSourceFrameIds.length > 0) {
    console.log(`✓ Using ${manualSourceFrameIds.length} selected manual source frame(s)`);

    for (const frameId of manualSourceFrameIds) {
      const frame = figma.getNodeById(frameId);
      if (frame && (frame.type === 'FRAME' || frame.type === 'SECTION' || frame.type === 'INSTANCE')) {
        sourceMobileFrames.push(frame as FrameNode | SectionNode | InstanceNode);
        console.log(`  ✓ Using manual source: "${frame.name}"`);
      } else {
        console.log(`  ⊗ Frame ID ${frameId} not found or invalid type`);
      }
    }
  }

  // METHOD 2: Fallback - search all mobile frames with matching width
  if (sourceMobileFrames.length === 0) {
    console.log('⊗ No manual source frames selected, searching all mobile frames...');

    const mobileFrameSuffix = ` - ${mobileWidth}px`;
    sourceMobileFrames = figma.currentPage.findAll(
      node => node.name.endsWith(mobileFrameSuffix) &&
              node.id !== newFrame.id && // Exclude the newly created frame
              (node.type === 'FRAME' || node.type === 'SECTION' || node.type === 'INSTANCE')
    ) as (FrameNode | SectionNode | InstanceNode)[];

    console.log(`✓ Found ${sourceMobileFrames.length} mobile frame(s) with suffix "${mobileFrameSuffix}"`);
  }

  if (sourceMobileFrames.length === 0) {
    console.log('⊗ No source mobile frames found');
    return;
  }

  // Build map of manual sections from source frames: baseName -> manual section node
  const manualSections = new Map<string, SceneNode>();

  for (const mobileFrame of sourceMobileFrames) {
    if (!hasChildren(mobileFrame)) continue;

    console.log(`\nSearching in "${mobileFrame.name}" (${mobileFrame.children.length} children):`);

    for (const child of mobileFrame.children) {
      const lowerName = child.name.toLowerCase();
      const endsWithManual = lowerName.endsWith('- manual');

      if (endsWithManual) {
        const baseName = getBaseName(child.name);
        const baseNameLower = baseName.toLowerCase();

        // Only add if not already in map (first found wins)
        if (!manualSections.has(baseNameLower)) {
          manualSections.set(baseNameLower, child);
          console.log(`  ✓ Found manual section: "${child.name}" (base: "${baseName}") from "${mobileFrame.name}"`);
        } else {
          console.log(`  ⊗ Skipping "${child.name}" - already have manual section for "${baseName}"`);
        }
      }
    }
  }

  if (manualSections.size === 0) {
    console.log('\n⊗ No manual sections found in any mobile frames');
    return;
  }

  console.log(`\n✓ Total manual sections found: ${manualSections.size}`);

  // Replace auto sections with manual sections
  let replacedCount = 0;
  const childrenArray = [...newFrame.children]; // Copy array since we'll modify it

  console.log(`\nChecking ${childrenArray.length} children in new frame "${newFrame.name}" for replacement:`);
  for (let i = 0; i < childrenArray.length; i++) {
    const autoChild = childrenArray[i];
    const baseName = getBaseName(autoChild.name);
    console.log(`  [${i}] "${autoChild.name}" → base: "${baseName}"`);

    const manualSection = manualSections.get(baseName.toLowerCase());

    if (manualSection) {
      console.log(`    ↻ Replacing with "${manualSection.name}"`);

      // Clone manual section
      const cloned = manualSection.clone();

      // Insert at same position
      const parent = autoChild.parent;
      if (parent && 'insertChild' in parent) {
        parent.insertChild(i, cloned);

        // Remove auto section
        autoChild.remove();

        console.log(`    ✓ Replaced at index ${i}`);
        replacedCount++;
      }
    } else {
      console.log(`    ⊗ No manual section found for base name "${baseName}"`);
    }
  }

  if (replacedCount > 0) {
    console.log(`\n✓ Replaced ${replacedCount} section(s) with manual versions`);
    stats.nodesProcessed += replacedCount;
  } else {
    console.log(`\n⊗ No sections were replaced`);
  }
}

// ============================================================================
// CONTAINER PADDING
// ============================================================================

/**
 * Apply container padding to sections and fix oversized elements
 * - For auto-layout frames that are direct children: set padding left/right
 * - For elements wider than mobile width: set to FILL or resize
 */
function applyContainerPadding(
  node: SceneNode,
  mobileWidth: number,
  containerPadding: number,
  stats: TransformStats
): void {
  // Safety check: verify node still exists
  try {
    if (!node.id || !node.type) {
      console.warn(`⚠️ applyContainerPadding: Node no longer exists, skipping`);
      return;
    }
  } catch (e) {
    console.warn(`⚠️ applyContainerPadding: Node access failed: ${e}`);
    return;
  }

  // Process children first
  if (hasChildren(node)) {
    for (const child of node.children) {
      try {
        applyContainerPadding(child, mobileWidth, containerPadding, stats);
      } catch (e) {
        console.error(`❌ applyContainerPadding error on child: ${e}`);
      }
    }
  }

  // Check if this is an auto-layout frame
  if (!isAutoLayoutFrame(node)) {
    return;
  }

  const frame = node as FrameNode;

  // If this frame's width equals mobile width, it's likely a section container
  // Apply container padding to it
  if (Math.abs(frame.width - mobileWidth) < 5) {
    const currentPaddingLeft = frame.paddingLeft || 0;
    const currentPaddingRight = frame.paddingRight || 0;

    // Apply container padding if current is larger (reduce desktop padding)
    // or if there's no padding at all
    const shouldApplyPadding =
      currentPaddingLeft > containerPadding ||
      currentPaddingRight > containerPadding ||
      (currentPaddingLeft === 0 && currentPaddingRight === 0);

    if (shouldApplyPadding) {
      frame.paddingLeft = containerPadding;
      frame.paddingRight = containerPadding;
      stats.nodesProcessed++;
    }
  }

  // Fix children that are wider than mobile width
  for (const child of frame.children) {
    if (child.width > mobileWidth) {
      try {
        if ('layoutSizingHorizontal' in child) {
          (child as FrameNode).layoutSizingHorizontal = 'FILL';
          stats.nodesProcessed++;
        } else if (isResizableNode(child)) {
          const resizable = child as FrameNode | GroupNode | ComponentNode | InstanceNode;
          resizable.resize(mobileWidth, resizable.height);
          stats.nodesProcessed++;
        }
      } catch (e) {
        // Some nodes can't be modified
      }
    }
  }
}

// ============================================================================
// SPACING VARIABLE PROCESSING
// ============================================================================

/**
 * Get the target mode ID based on breakpoint width
 * Maps common breakpoint widths to mode names
 */
function getTargetModeForWidth(collection: VariableCollection, targetWidth: number): string | null {
  const modes = collection.modes;

  // Common mappings: width -> mode name patterns
  const modePatterns: { [key: string]: string[] } = {
    'mobile': ['mobile', 'mb', 'phone', 'sm', 'small'],
    'tablet': ['tablet', 'tb', 'ipad', 'md', 'medium'],
    'desktop': ['desktop', 'dt', 'pc', 'lg', 'large', 'default'],
  };

  // Determine which mode type based on width
  let targetModeType: string;
  if (targetWidth <= 480) {
    targetModeType = 'mobile';
  } else if (targetWidth <= 1024) {
    targetModeType = 'tablet';
  } else {
    targetModeType = 'desktop';
  }

  // Find matching mode
  const patterns = modePatterns[targetModeType];
  for (const mode of modes) {
    const modeName = mode.name.toLowerCase();
    for (const pattern of patterns) {
      if (modeName.includes(pattern)) {
        return mode.modeId;
      }
    }
  }

  // If no match found, return first mode as fallback
  return modes.length > 0 ? modes[0].modeId : null;
}

/**
 * Process spacing variables in a frame and update to target breakpoint values
 * This reads boundVariables for spacing properties and applies the corresponding mode value
 */
async function processSpacingVariables(
  node: SceneNode,
  targetWidth: number,
  stats: TransformStats
): Promise<void> {
  // Process children first (depth-first)
  if ('children' in node) {
    for (const child of (node as FrameNode).children) {
      await processSpacingVariables(child, targetWidth, stats);
    }
  }

  // Only process frames with auto-layout
  if (!isAutoLayoutFrame(node)) {
    return;
  }

  const frame = node as FrameNode;

  // Check for bound variables on spacing properties
  const boundVars = frame.boundVariables;
  if (!boundVars) {
    return;
  }

  // Spacing properties to check
  const spacingProps: (keyof typeof boundVars)[] = [
    'itemSpacing',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
  ];

  for (const prop of spacingProps) {
    const binding = boundVars[prop];
    if (!binding || !('id' in binding)) {
      continue;
    }

    try {
      // Get the variable
      const variable = await figma.variables.getVariableByIdAsync(binding.id);
      if (!variable) {
        continue;
      }

      // Get the variable's collection to access modes
      const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      if (!collection) {
        continue;
      }

      // Find target mode based on breakpoint width
      const targetModeId = getTargetModeForWidth(collection, targetWidth);
      if (!targetModeId) {
        continue;
      }

      // Get value for target mode
      const valuesByMode = variable.valuesByMode;
      const targetValue = valuesByMode[targetModeId];

      if (targetValue === undefined || typeof targetValue !== 'number') {
        continue;
      }

      // Get current value for comparison
      const currentValue = frame[prop as keyof FrameNode] as number;

      // Only update if value is different
      if (currentValue !== targetValue) {
        console.log(`📐 Spacing variable: ${variable.name} on "${frame.name}" - ${prop}: ${currentValue} → ${targetValue}`);

        // Apply the new value
        switch (prop) {
          case 'itemSpacing':
            frame.itemSpacing = targetValue;
            break;
          case 'paddingTop':
            frame.paddingTop = targetValue;
            break;
          case 'paddingRight':
            frame.paddingRight = targetValue;
            break;
          case 'paddingBottom':
            frame.paddingBottom = targetValue;
            break;
          case 'paddingLeft':
            frame.paddingLeft = targetValue;
            break;
        }

        stats.nodesProcessed++;
      }
    } catch (e) {
      console.warn(`⚠️ Error processing spacing variable for ${prop}:`, e);
    }
  }
}

// ============================================================================
// TEXT PROCESSING
// ============================================================================

async function processTextNodes(
  frame: FrameNode | SectionNode | InstanceNode,
  config: PluginConfig,
  stats: TransformStats
): Promise<void> {
  const textNodes = findAllTextNodes(frame);
  const totalTexts = textNodes.length;

  for (let i = 0; i < textNodes.length; i++) {
    const textNode = textNodes[i];

    // Send progress update every 5 nodes or on first/last node
    if (i === 0 || i === textNodes.length - 1 || i % 5 === 0) {
      sendToUI({
        type: 'PROGRESS_UPDATE',
        current: 13,
        total: 15,
        stepName: `Processing fonts (${i + 1}/${totalTexts})`
      });
    }

    stats.nodesProcessed++;

    if (config.fontMode === 'map') {
      await mapTextStyle(textNode, stats);
    } else if (config.fontMode === 'scale') {
      await scaleTextSize(textNode, config.textScale, stats);
    }
  }
}

function findAllTextNodes(node: SceneNode): TextNode[] {
  const textNodes: TextNode[] = [];

  if (isTextNode(node)) {
    textNodes.push(node);
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      textNodes.push(...findAllTextNodes(child));
    }
  }

  return textNodes;
}

/**
 * Map text style from Desktop/X to Mobile/X
 */
async function mapTextStyle(textNode: TextNode, stats: TransformStats): Promise<void> {
  // Get current text style
  const styleId = textNode.textStyleId;

  if (!styleId || styleId === figma.mixed) {
    return; // No style or mixed styles - skip
  }

  const currentStyle = figma.getStyleById(styleId as string) as TextStyle | null;
  if (!currentStyle) return;

  const styleName = currentStyle.name;

  // Try to find Mobile variant
  // Pattern: "Desktop/H1" -> "Mobile/H1" or "desktop/h1" -> "mobile/h1"
  let mobileStyleName: string | null = null;

  if (styleName.toLowerCase().startsWith('desktop/')) {
    mobileStyleName = 'Mobile/' + styleName.substring(8);
  } else if (styleName.toLowerCase().startsWith('desktop ')) {
    mobileStyleName = 'Mobile ' + styleName.substring(8);
  }

  if (!mobileStyleName) return;

  // Find the mobile style
  const allTextStyles = figma.getLocalTextStyles();
  const mobileStyle = allTextStyles.find(
    (s) => s.name.toLowerCase() === mobileStyleName!.toLowerCase()
  );

  if (mobileStyle) {
    // Load fonts before applying
    try {
      await figma.loadFontAsync(mobileStyle.fontName);
      textNode.textStyleId = mobileStyle.id;
      stats.textStylesMapped++;
    } catch (e) {
      // Font not available, skip
    }
  }
}

/**
 * Scale text size by a factor
 */
async function scaleTextSize(
  textNode: TextNode,
  scale: number,
  stats: TransformStats
): Promise<void> {
  try {
    // Handle mixed fonts
    if (textNode.fontName === figma.mixed) {
      // Process character by character for mixed fonts
      const length = textNode.characters.length;
      for (let i = 0; i < length; i++) {
        const fontName = textNode.getRangeFontName(i, i + 1);
        if (fontName !== figma.mixed) {
          await figma.loadFontAsync(fontName as FontName);
          const fontSize = textNode.getRangeFontSize(i, i + 1);
          if (typeof fontSize === 'number') {
            const newSize = Math.max(10, Math.round(fontSize * scale));
            textNode.setRangeFontSize(i, i + 1, newSize);
          }
        }
      }
    } else {
      // Single font
      await figma.loadFontAsync(textNode.fontName as FontName);

      const currentSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 16;
      const newSize = Math.max(10, Math.round(currentSize * scale));
      textNode.fontSize = newSize;
    }

    stats.textsScaled++;
  } catch (e) {
    // Font loading failed, skip this node
  }
}

// ============================================================================
// QA CHECKER - UTILITIES
// ============================================================================

const QA_CONFIG_KEY = 'qaConfig';
const QA_REPORT_KEY = 'qaReport';
const QA_TOKENS_KEY = 'qaTokens';

/**
 * Convert RGB to hex color string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null;
}

/**
 * Calculate relative luminance (WCAG formula)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if text is considered "large" for WCAG
 * Large text: >= 18pt (24px) or >= 14pt (18.67px) bold
 */
function isLargeText(fontSize: number, fontWeight: number): boolean {
  if (fontSize >= 24) return true;
  if (fontSize >= 18.67 && fontWeight >= 700) return true;
  return false;
}

/**
 * Find nearest value in scale
 */
function findNearestInScale(value: number, scale: number[]): number {
  let nearest = scale[0];
  let minDiff = Math.abs(value - nearest);

  for (const s of scale) {
    const diff = Math.abs(value - s);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = s;
    }
  }

  return nearest;
}

/**
 * Generate unique issue ID
 */
function generateIssueId(): string {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// QA CHECKER - BACKGROUND DETECTION
// ============================================================================

/**
 * Get effective background color for a node
 * Traverses siblings and parents to find the actual background
 */
function getBackgroundColor(node: SceneNode): { color: RGB; nodeName: string } | null {
  // Check previous siblings first (elements rendered before this one, visually behind)
  if (node.parent && 'children' in node.parent) {
    const siblings = node.parent.children;
    const nodeIndex = siblings.indexOf(node as SceneNode);

    // Check siblings before this node (rendered behind)
    for (let i = nodeIndex - 1; i >= 0; i--) {
      const sibling = siblings[i];
      if (nodeOverlaps(node, sibling)) {
        const siblingBg = getNodeFillColor(sibling);
        if (siblingBg) {
          return { color: siblingBg, nodeName: sibling.name };
        }
      }
    }
  }

  // Check parent chain
  let current: BaseNode | null = node.parent;
  while (current) {
    if ('fills' in current) {
      const fillColor = getNodeFillColor(current as SceneNode);
      if (fillColor) {
        return { color: fillColor, nodeName: current.name };
      }
    }
    current = current.parent;
  }

  // Default to white if no background found
  return { color: { r: 1, g: 1, b: 1 }, nodeName: 'Page (default white)' };
}

/**
 * Check if two nodes overlap
 */
function nodeOverlaps(node1: SceneNode, node2: SceneNode): boolean {
  if (!('absoluteBoundingBox' in node1) || !('absoluteBoundingBox' in node2)) {
    return false;
  }

  const box1 = node1.absoluteBoundingBox;
  const box2 = node2.absoluteBoundingBox;

  if (!box1 || !box2) return false;

  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Get fill color from a node
 */
function getNodeFillColor(node: SceneNode): RGB | null {
  if (!('fills' in node)) return null;

  const fills = node.fills;
  if (!fills || fills === figma.mixed || !Array.isArray(fills)) return null;

  for (const fill of fills) {
    if (fill.type === 'SOLID' && fill.visible !== false) {
      return fill.color;
    }
  }

  return null;
}

// ============================================================================
// QA CHECKER - SCANNING
// ============================================================================

/**
 * Main QA scan handler
 */
async function handleQAScan(config: QAConfig, scope: 'page' | 'selection'): Promise<void> {
  const startTime = Date.now();
  const issues: QAIssue[] = [];

  try {
    // Get nodes to scan
    let nodesToScan: SceneNode[] = [];
    let frameName: string | undefined;

    if (scope === 'selection') {
      nodesToScan = [...figma.currentPage.selection];
      if (nodesToScan.length === 1) {
        frameName = nodesToScan[0].name;
      }
    } else {
      nodesToScan = [...figma.currentPage.children];
    }

    if (nodesToScan.length === 0) {
      sendToUI({
        type: 'QA_SCAN_ERROR',
        error: scope === 'selection' ? 'No selection. Please select a frame to scan.' : 'No frames found on this page.',
      });
      return;
    }

    // Collect all nodes to process, skipping nodes whose names match skipLayerNames (and their children)
    const allNodes: SceneNode[] = [];
    const skipLayerNamesSet = new Set(config.skipLayerNames?.map(s => s.toLowerCase()) || []);
    const collectNodes = (nodes: readonly SceneNode[], parentSkipped: boolean = false) => {
      for (const node of nodes) {
        // Check if this node should be skipped (exact match, case-insensitive)
        const shouldSkip = parentSkipped || skipLayerNamesSet.has(node.name.toLowerCase());
        if (!shouldSkip) {
          allNodes.push(node);
        }
        if (hasChildren(node)) {
          collectNodes(node.children, shouldSkip);
        }
      }
    };
    collectNodes(nodesToScan);

    const totalNodes = allNodes.length;
    let processed = 0;

    // Track nodes to ignore for border radius check (including their children)
    const borderRadiusIgnoredNodes = new Set<string>();

    // Process each node
    for (const node of allNodes) {
      processed++;

      // Send progress update every 50 nodes
      if (processed % 50 === 0 || processed === totalNodes) {
        sendToUI({
          type: 'QA_SCAN_PROGRESS',
          current: processed,
          total: totalNodes,
          step: `Scanning ${node.name.substring(0, 30)}...`,
        });
      }

      // Text node checks
      if (isTextNode(node)) {
        // Typography checks (font-size, line-height, text-size)
        if (config.checkFontSize !== false || config.checkLineHeight !== false || config.checkTextSize !== false) {
          checkTypography(node, config, issues);
        }

        // Text Style check
        if (config.checkTextStyle !== false) {
          checkTextStyle(node, issues);
        }

        // Font Family check (check if font is in allowed list from Typography Settings)
        if (config.checkFontFamily !== false) {
          checkFontFamily(node, config, issues);
        }

        // Typography Style Match check
        if (config.checkTypographyMatch !== false) {
          checkTypographyStyleMatch(node, config, issues);
        }

        // Contrast check
        if (config.checkContrast !== false) {
          checkContrast(node, issues);
        }
      }

      // Color checks
      if (config.checkColor !== false && config.colorPalette.length > 0) {
        checkColors(node, config, issues);
      }

      // Border Radius check (for email compatibility)
      if (config.checkBorderRadius !== false) {
        checkBorderRadius(node, config, issues, borderRadiusIgnoredNodes);
      }
    }

    // Filter issues based on enabled categories
    const filteredIssues = issues.filter((issue) => {
      switch (issue.category) {
        case 'typography-match':
          return config.checkTypographyMatch !== false;
        case 'text-style':
          return config.checkTextStyle !== false;
        case 'font-family':
          return config.checkFontFamily !== false;
        case 'font-size':
          return config.checkFontSize !== false;
        case 'line-height':
          return config.checkLineHeight !== false;
        case 'contrast':
          return config.checkContrast !== false;
        case 'text-size':
          return config.checkTextSize !== false;
        case 'color':
          return config.checkColor !== false;
        case 'border-radius':
          return config.checkBorderRadius !== false;
        default:
          return true;
      }
    });

    // Group issues by category
    const issueGroups = groupIssues(filteredIssues);

    // Calculate totals
    const totalErrors = filteredIssues.filter((i) => i.severity === 'error').length;
    const totalWarnings = filteredIssues.filter((i) => i.severity === 'warning').length;

    const result: QAScanResult = {
      timestamp: Date.now(),
      scanType: scope,
      frameName,
      issues: filteredIssues,
      issueGroups,
      totalErrors,
      totalWarnings,
      totalNodes,
      scanDuration: Date.now() - startTime,
    };

    sendToUI({ type: 'QA_SCAN_COMPLETE', result });
  } catch (error) {
    sendToUI({
      type: 'QA_SCAN_ERROR',
      error: `Scan failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Check typography issues
 */
function checkTypography(node: TextNode, config: QAConfig, issues: QAIssue[]): void {
  // Check font size
  const fontSize = node.fontSize;
  if (typeof fontSize === 'number') {
    // ADA check: font size <= 12px is too small
    if (config.checkTextSize !== false && fontSize <= 12) {
      issues.push({
        id: generateIssueId(),
        nodeId: node.id,
        nodeName: node.name,
        category: 'text-size',
        severity: 'error',
        message: `Font size ${fontSize}px is too small (ADA)`,
        details: 'Minimum recommended size is 14px for accessibility',
        currentValue: fontSize,
        suggestedValue: 14,
        fixable: true,
        fixType: 'fontSize',
      });
    }

    // Font size scale check
    if (config.checkFontSize !== false && !config.fontSizeScale.includes(fontSize)) {
      const nearest = findNearestInScale(fontSize, config.fontSizeScale);
      const diff = Math.abs(fontSize - nearest);
      const threshold = config.fontSizeThreshold;

      // Only report if difference is significant (> threshold% of the value)
      if (diff > 0 && (diff / fontSize) * 100 <= threshold) {
        issues.push({
          id: generateIssueId(),
          nodeId: node.id,
          nodeName: node.name,
          category: 'font-size',
          severity: 'warning',
          message: `Font size ${fontSize}px not in scale`,
          details: `Nearest value: ${nearest}px`,
          currentValue: fontSize,
          suggestedValue: nearest,
          fixable: true,
          fixType: 'fontSize',
        });
      }
    }
  }

  // Check line height
  if (config.checkLineHeight !== false) {
    const lineHeight = node.lineHeight;
    if (lineHeight !== figma.mixed && typeof lineHeight === 'object') {
      if (lineHeight.unit === 'PERCENT') {
        const value = lineHeight.value;

        // Check if value is in scale
        const inScale = config.lineHeightScale.some((s) => s === value || s === 'auto');

        if (!inScale) {
          // Find nearest
          const numericScale = config.lineHeightScale.filter((s) => typeof s === 'number') as number[];
          const nearest = findNearestInScale(value, numericScale);

          issues.push({
            id: generateIssueId(),
            nodeId: node.id,
            nodeName: node.name,
            category: 'line-height',
            severity: 'warning',
            message: `Line height ${value}% not in scale`,
            details: `Nearest value: ${nearest}%`,
            currentValue: value,
            suggestedValue: nearest,
            fixable: true,
            fixType: 'lineHeight',
          });
        }
      }
    }
  }
}

/**
 * Check if font family is in the allowed list from Typography Settings
 */
function checkFontFamily(node: TextNode, config: QAConfig, issues: QAIssue[]): void {
  // Whitelist fonts - always allowed (system/fallback fonts)
  const whitelistFonts = new Set(['helvetica', 'arial']);

  // Get allowed font families from typography styles
  const allowedFontFamilies = new Set(
    config.typographyStyles.map(style => style.fontFamily.toLowerCase())
  );

  // If no typography styles defined, skip check
  if (allowedFontFamilies.size === 0) {
    return;
  }

  // Check function that considers both whitelist and allowed list
  const isFontAllowed = (fontKey: string): boolean => {
    return whitelistFonts.has(fontKey) || allowedFontFamilies.has(fontKey);
  };

  const fontFamily = node.fontName;
  if (fontFamily === figma.mixed) {
    // Handle mixed fonts - check each segment
    const len = node.characters.length;
    const checkedFonts = new Set<string>();

    for (let i = 0; i < len; i++) {
      const font = node.getRangeFontName(i, i + 1) as FontName;
      const fontKey = font.family.toLowerCase();

      // Skip if already checked this font
      if (checkedFonts.has(fontKey)) continue;
      checkedFonts.add(fontKey);

      if (!isFontAllowed(fontKey)) {
        issues.push({
          id: generateIssueId(),
          nodeId: node.id,
          nodeName: node.name,
          category: 'font-family',
          severity: 'error',
          message: `Font family "${font.family}" not in allowed list`,
          details: `Allowed: ${Array.from(allowedFontFamilies).join(', ')}`,
          currentValue: font.family,
          suggestedValue: config.typographyStyles[0]?.fontFamily || '',
          fixable: false,
        });
      }
    }
  } else {
    // Single font
    const fontKey = fontFamily.family.toLowerCase();
    if (!isFontAllowed(fontKey)) {
      issues.push({
        id: generateIssueId(),
        nodeId: node.id,
        nodeName: node.name,
        category: 'font-family',
        severity: 'error',
        message: `Font family "${fontFamily.family}" not in allowed list`,
        details: `Allowed: ${Array.from(allowedFontFamilies).join(', ')}`,
        currentValue: fontFamily.family,
        suggestedValue: config.typographyStyles[0]?.fontFamily || '',
        fixable: false,
      });
    }
  }
}

/**
 * Check contrast issues (WCAG AA)
 */
function checkContrast(node: TextNode, issues: QAIssue[]): void {
  // Get text color
  const fills = node.fills;
  if (!fills || fills === figma.mixed || !Array.isArray(fills)) return;

  let textColor: RGB | null = null;
  for (const fill of fills) {
    if (fill.type === 'SOLID' && fill.visible !== false) {
      textColor = fill.color;
      break;
    }
  }

  if (!textColor) return;

  // Get background color
  const background = getBackgroundColor(node);
  if (!background) return;

  // Calculate contrast
  const textLuminance = getLuminance(textColor.r, textColor.g, textColor.b);
  const bgLuminance = getLuminance(background.color.r, background.color.g, background.color.b);
  const contrast = getContrastRatio(textLuminance, bgLuminance);

  // Determine required ratio
  const fontSize = typeof node.fontSize === 'number' ? node.fontSize : 16;
  const fontWeight = getFontWeight(node);
  const large = isLargeText(fontSize, fontWeight);
  const requiredRatio = large ? 3.0 : 4.5;

  if (contrast < requiredRatio) {
    const textHex = rgbToHex(textColor.r, textColor.g, textColor.b);
    const bgHex = rgbToHex(background.color.r, background.color.g, background.color.b);

    issues.push({
      id: generateIssueId(),
      nodeId: node.id,
      nodeName: node.name,
      category: 'contrast',
      severity: 'error',
      message: `Contrast ratio ${contrast.toFixed(2)}:1 fails WCAG AA`,
      details: `Required: ${requiredRatio}:1 for ${large ? 'large' : 'normal'} text`,
      textColor: textHex,
      backgroundColor: bgHex,
      backgroundNodeName: background.nodeName,
      contrastRatio: contrast,
      requiredRatio,
      fixable: false,
    });
  }
}

/**
 * Get font weight from text node
 */
function getFontWeight(node: TextNode): number {
  const fontName = node.fontName;
  if (fontName === figma.mixed) return 400;

  const style = (fontName as FontName).style.toLowerCase();
  if (style.includes('black')) return 900;
  if (style.includes('extrabold') || style.includes('extra bold')) return 800;
  if (style.includes('bold')) return 700;
  if (style.includes('semibold') || style.includes('semi bold')) return 600;
  if (style.includes('medium')) return 500;
  if (style.includes('light')) return 300;
  if (style.includes('thin')) return 100;
  return 400;
}

/**
 * Check text style issues - text not using Text Style or Variable
 */
function checkTextStyle(node: TextNode, issues: QAIssue[]): void {
  // Check if text has a text style applied
  const textStyleId = node.textStyleId;

  // If no text style is applied (or mixed styles)
  if (!textStyleId || textStyleId === figma.mixed || textStyleId === '') {
    issues.push({
      id: generateIssueId(),
      nodeId: node.id,
      nodeName: node.name,
      category: 'text-style',
      severity: 'warning',
      message: 'Text not using Text Style',
      details: 'Consider applying a Text Style for consistency',
      fixable: false,
    });
  }
}

/**
 * Check typography style match - compare text properties against defined styles
 */
function checkTypographyStyleMatch(node: TextNode, config: QAConfig, issues: QAIssue[]): void {
  if (!config.typographyCheckRules.checkTypographyStyle) return;
  if (config.typographyStyles.length === 0) return;

  // Get current text properties
  const fontSize = node.fontSize;
  const fontName = node.fontName;
  const lineHeight = node.lineHeight;
  const letterSpacing = node.letterSpacing;

  // Skip if mixed values
  if (fontSize === figma.mixed || fontName === figma.mixed) return;

  const currentFontSize = fontSize as number;
  const currentFontFamily = (fontName as FontName).family;
  const currentFontWeight = getFontWeight(node);

  // Get line height as percentage
  let currentLineHeight = 150; // default
  if (lineHeight !== figma.mixed && typeof lineHeight === 'object') {
    if (lineHeight.unit === 'PERCENT') {
      currentLineHeight = lineHeight.value;
    } else if (lineHeight.unit === 'PIXELS' && currentFontSize > 0) {
      currentLineHeight = (lineHeight.value / currentFontSize) * 100;
    }
  }

  // Get letter spacing in px
  let currentLetterSpacing = 0;
  if (letterSpacing !== figma.mixed && typeof letterSpacing === 'object') {
    if (letterSpacing.unit === 'PIXELS') {
      currentLetterSpacing = Math.round(letterSpacing.value * 100) / 100;
    } else if (letterSpacing.unit === 'PERCENT') {
      currentLetterSpacing = Math.round((letterSpacing.value / 100) * currentFontSize * 100) / 100;
    }
  }

  // Figma doesn't have word spacing, so default to 0
  const currentWordSpacing = 0;

  // Find best matching style
  let bestMatch: {
    style: typeof config.typographyStyles[0];
    matchPercentage: number;
    matches: { fontFamily: boolean; fontSize: boolean; fontWeight: boolean; lineHeight: boolean; letterSpacing: boolean; wordSpacing: boolean };
  } | null = null;

  for (const style of config.typographyStyles) {
    const matches = {
      fontFamily: !config.typographyCheckRules.checkFontFamily || currentFontFamily.toLowerCase() === style.fontFamily.toLowerCase(),
      fontSize: !config.typographyCheckRules.checkFontSize || currentFontSize === style.fontSize,
      fontWeight: !config.typographyCheckRules.checkFontWeight || currentFontWeight === style.fontWeight,
      lineHeight: !config.typographyCheckRules.checkLineHeight || Math.abs(currentLineHeight - style.lineHeight) <= 5,
      letterSpacing: !config.typographyCheckRules.checkLetterSpacing || Math.abs(currentLetterSpacing - (style.letterSpacing || 0)) <= 0.5,
      wordSpacing: !config.typographyCheckRules.checkWordSpacing || Math.abs(currentWordSpacing - (style.wordSpacing || 0)) <= 0.5,
    };

    // Count matching properties
    const matchCount = Object.values(matches).filter(Boolean).length;
    const totalChecks = Object.values(config.typographyCheckRules).filter(Boolean).length - 1; // -1 for checkTypographyStyle
    const matchPercentage = totalChecks > 0 ? Math.round((matchCount / totalChecks) * 100) : 0;

    if (!bestMatch || matchPercentage > bestMatch.matchPercentage) {
      bestMatch = { style, matchPercentage, matches };
    }
  }

  // If no exact match found (100%), report as issue
  if (bestMatch && bestMatch.matchPercentage < 100) {
    // Get text content (truncated)
    const textContent = node.characters.substring(0, 30) + (node.characters.length > 30 ? '...' : '');

    issues.push({
      id: generateIssueId(),
      nodeId: node.id,
      nodeName: node.name,
      category: 'typography-match',
      severity: 'warning',
      message: `Typography does not match any defined style. Text: "${textContent}"`,
      details: `Closest match: "${bestMatch.style.name}" (${bestMatch.matchPercentage}%)`,
      fixable: true,
      fixType: 'typographyStyle',
      textContent,
      currentTypography: {
        fontFamily: currentFontFamily,
        fontSize: currentFontSize,
        fontWeight: currentFontWeight,
        lineHeight: Math.round(currentLineHeight),
        letterSpacing: currentLetterSpacing,
        wordSpacing: currentWordSpacing,
      },
      closestMatch: {
        styleName: bestMatch.style.name,
        matchPercentage: bestMatch.matchPercentage,
        fontFamily: bestMatch.style.fontFamily,
        fontSize: bestMatch.style.fontSize,
        fontWeight: bestMatch.style.fontWeight,
        lineHeight: bestMatch.style.lineHeight,
        letterSpacing: bestMatch.style.letterSpacing || 0,
        wordSpacing: bestMatch.style.wordSpacing || 0,
      },
    });
  }
}

/**
 * Check color issues
 */
function checkColors(node: SceneNode, config: QAConfig, issues: QAIssue[]): void {
  if (!('fills' in node)) return;

  const fills = node.fills;
  if (!fills || fills === figma.mixed || !Array.isArray(fills)) return;

  for (const fill of fills) {
    if (fill.type === 'SOLID' && fill.visible !== false) {
      const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);

      if (!config.colorPalette.includes(hex) && !config.colorPalette.includes(hex.toLowerCase())) {
        issues.push({
          id: generateIssueId(),
          nodeId: node.id,
          nodeName: node.name,
          category: 'color',
          severity: 'warning',
          message: `Color ${hex} not in palette`,
          details: 'This color is not defined in your color palette',
          currentValue: hex,
          fixable: false,
        });
      }
    }
  }
}

/**
 * Check border radius (not supported in email)
 */
function checkBorderRadius(
  node: SceneNode,
  config: QAConfig,
  issues: QAIssue[],
  ignoredNodes: Set<string>
): void {
  // Check if this node or any parent is in ignored list
  if (ignoredNodes.has(node.id)) {
    return;
  }

  // Check if node name matches ignore list (case-insensitive)
  const ignoreNames = config.borderRadiusIgnoreNames || [];
  const nodeLowerName = node.name.toLowerCase();
  const isIgnored = ignoreNames.some(name => nodeLowerName === name.toLowerCase());

  if (isIgnored) {
    // Add this node and all its children to ignored set
    ignoredNodes.add(node.id);
    if ('children' in node) {
      const addChildrenToIgnored = (parentNode: SceneNode) => {
        if ('children' in parentNode) {
          for (const child of (parentNode as FrameNode).children) {
            ignoredNodes.add(child.id);
            addChildrenToIgnored(child);
          }
        }
      };
      addChildrenToIgnored(node);
    }
    return;
  }

  // Check if parent is ignored
  let parent = node.parent;
  while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
    if (ignoredNodes.has(parent.id)) {
      ignoredNodes.add(node.id);
      return;
    }
    parent = parent.parent;
  }

  // Check if node has cornerRadius property
  if (!('cornerRadius' in node)) {
    return;
  }

  const frameNode = node as FrameNode | RectangleNode | ComponentNode | InstanceNode;

  // Check for any border radius
  let hasBorderRadius = false;
  let radiusValue: string = '';

  if (typeof frameNode.cornerRadius === 'number' && frameNode.cornerRadius > 0) {
    hasBorderRadius = true;
    radiusValue = `${frameNode.cornerRadius}px`;
  } else if (frameNode.cornerRadius === figma.mixed) {
    // Check individual corners
    const corners = [
      frameNode.topLeftRadius,
      frameNode.topRightRadius,
      frameNode.bottomLeftRadius,
      frameNode.bottomRightRadius,
    ];
    const nonZeroCorners = corners.filter(c => c > 0);
    if (nonZeroCorners.length > 0) {
      hasBorderRadius = true;
      radiusValue = `${frameNode.topLeftRadius}/${frameNode.topRightRadius}/${frameNode.bottomRightRadius}/${frameNode.bottomLeftRadius}px`;
    }
  }

  if (hasBorderRadius) {
    issues.push({
      id: generateIssueId(),
      nodeId: node.id,
      nodeName: node.name,
      category: 'border-radius',
      severity: 'warning',
      message: `Border radius ${radiusValue} not supported in email`,
      details: 'Most email clients do not support border-radius CSS property',
      currentValue: radiusValue,
      fixable: false,
    });
  }
}

/**
 * Group issues by category
 */
function groupIssues(issues: QAIssue[]): IssueGroup[] {
  const categories: { category: IssueCategory; label: string; icon: string }[] = [
    { category: 'typography-match', label: 'Typography Style Match', icon: '📝' },
    { category: 'text-style', label: 'Text Style (Variable)', icon: '🎨' },
    { category: 'font-family', label: 'Font Family', icon: '🔤' },
    { category: 'font-size', label: 'Font Size', icon: '✍️' },
    { category: 'line-height', label: 'Line Height', icon: '📏' },
    { category: 'contrast', label: 'Contrast (ADA AA)', icon: '🌈' },
    { category: 'text-size', label: 'Text Size (ADA)', icon: '📱' },
    { category: 'color', label: 'Color', icon: '🎨' },
    { category: 'border-radius', label: 'Border Radius (Email)', icon: '⬜' },
  ];

  return categories
    .map(({ category, label, icon }) => {
      const categoryIssues = issues.filter((i) => i.category === category);
      return {
        category,
        label,
        icon,
        issues: categoryIssues,
        errorCount: categoryIssues.filter((i) => i.severity === 'error').length,
        warningCount: categoryIssues.filter((i) => i.severity === 'warning').length,
      };
    })
    .filter((group) => group.issues.length > 0);
}

// ============================================================================
// QA CHECKER - FIX ISSUES
// ============================================================================

/**
 * Fix a single issue
 */
async function handleQAFixIssue(issue: QAIssue): Promise<void> {
  try {
    const node = figma.getNodeById(issue.nodeId);
    if (!node || !('type' in node)) {
      sendToUI({
        type: 'QA_FIX_COMPLETE',
        issueId: issue.id,
        success: false,
        message: 'Node not found',
      });
      return;
    }

    const sceneNode = node as SceneNode;
    let success = false;

    switch (issue.fixType) {
      case 'fontSize':
        if (isTextNode(sceneNode) && typeof issue.suggestedValue === 'number') {
          await figma.loadFontAsync(sceneNode.fontName as FontName);
          sceneNode.fontSize = issue.suggestedValue;
          success = true;
        }
        break;

      case 'lineHeight':
        if (isTextNode(sceneNode) && typeof issue.suggestedValue === 'number') {
          await figma.loadFontAsync(sceneNode.fontName as FontName);
          sceneNode.lineHeight = { value: issue.suggestedValue, unit: 'PERCENT' };
          success = true;
        }
        break;

      case 'spacing':
        if ('layoutMode' in node && node.layoutMode !== 'NONE') {
          const frame = node as FrameNode;
          if (typeof issue.suggestedValue === 'number') {
            // Determine what spacing property to fix based on the message
            const msg = issue.message.toLowerCase();
            if (msg.includes('gap')) {
              frame.itemSpacing = issue.suggestedValue;
            } else if (msg.includes('padding-top')) {
              frame.paddingTop = issue.suggestedValue;
            } else if (msg.includes('padding-bottom')) {
              frame.paddingBottom = issue.suggestedValue;
            } else if (msg.includes('padding-left')) {
              frame.paddingLeft = issue.suggestedValue;
            } else if (msg.includes('padding-right')) {
              frame.paddingRight = issue.suggestedValue;
            }
            success = true;
          }
        }
        break;
    }

    sendToUI({
      type: 'QA_FIX_COMPLETE',
      issueId: issue.id,
      success,
      message: success ? 'Fixed successfully' : 'Unable to fix this issue',
    });
  } catch (error) {
    sendToUI({
      type: 'QA_FIX_COMPLETE',
      issueId: issue.id,
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * Fix all issues in a category
 */
async function handleQAFixAll(category: IssueCategory, issues: QAIssue[]): Promise<void> {
  let fixedCount = 0;
  let failedCount = 0;

  for (const issue of issues) {
    if (!issue.fixable) {
      failedCount++;
      continue;
    }

    try {
      const node = figma.getNodeById(issue.nodeId);
      if (!node || !('type' in node)) {
        failedCount++;
        continue;
      }

      const sceneNode = node as SceneNode;
      let success = false;

      switch (issue.fixType) {
        case 'fontSize':
          if (isTextNode(sceneNode) && typeof issue.suggestedValue === 'number') {
            await figma.loadFontAsync(sceneNode.fontName as FontName);
            sceneNode.fontSize = issue.suggestedValue;
            success = true;
          }
          break;

        case 'lineHeight':
          if (isTextNode(sceneNode) && typeof issue.suggestedValue === 'number') {
            await figma.loadFontAsync(sceneNode.fontName as FontName);
            sceneNode.lineHeight = { value: issue.suggestedValue, unit: 'PERCENT' };
            success = true;
          }
          break;

        case 'spacing':
          if ('layoutMode' in sceneNode && sceneNode.layoutMode !== 'NONE') {
            const frame = sceneNode as FrameNode;
            if (typeof issue.suggestedValue === 'number') {
              const msg = issue.message.toLowerCase();
              if (msg.includes('gap')) {
                frame.itemSpacing = issue.suggestedValue;
              } else if (msg.includes('padding-top')) {
                frame.paddingTop = issue.suggestedValue;
              } else if (msg.includes('padding-bottom')) {
                frame.paddingBottom = issue.suggestedValue;
              } else if (msg.includes('padding-left')) {
                frame.paddingLeft = issue.suggestedValue;
              } else if (msg.includes('padding-right')) {
                frame.paddingRight = issue.suggestedValue;
              }
              success = true;
            }
          }
          break;
      }

      if (success) {
        fixedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  sendToUI({
    type: 'QA_FIX_ALL_COMPLETE',
    category,
    fixedCount,
    failedCount,
  });
}

// ============================================================================
// QA CHECKER - TOKEN EXTRACTION
// ============================================================================

/**
 * Extract design tokens from nodes
 */
async function handleQAExtractTokens(scope: 'page' | 'selection'): Promise<void> {
  try {
    let nodesToScan: SceneNode[] = [];

    if (scope === 'selection') {
      nodesToScan = [...figma.currentPage.selection];
    } else {
      nodesToScan = [...figma.currentPage.children];
    }

    if (nodesToScan.length === 0) {
      sendToUI({
        type: 'QA_SCAN_ERROR',
        error: 'No nodes to extract tokens from',
      });
      return;
    }

    // Collect all nodes
    const allNodes: SceneNode[] = [];
    const collectNodes = (nodes: readonly SceneNode[]) => {
      for (const node of nodes) {
        allNodes.push(node);
        if (hasChildren(node)) {
          collectNodes(node.children);
        }
      }
    };
    collectNodes(nodesToScan);

    // Extract tokens with node info
    const colorMap = new Map<string, { value: string; type: string; count: number; nodeId: string; nodeName: string }>();
    const fontFamilyMap = new Map<string, { style: string; count: number; nodeId: string; nodeName: string }>();
    const fontSizeMap = new Map<number, { count: number; nodeId: string; nodeName: string }>();
    const fontWeightMap = new Map<number, Map<string, number>>();
    const lineHeightMap = new Map<string, { value: number | 'auto'; count: number; nodeId: string; nodeName: string }>();
    const spacingMap = new Map<string, { value: number; type: string; count: number; nodeId: string; nodeName: string }>();
    const borderRadiusMap = new Map<number, { count: number; nodeId: string; nodeName: string }>();

    for (const node of allNodes) {
      // Extract colors
      if ('fills' in node) {
        const fills = node.fills;
        if (fills && fills !== figma.mixed && Array.isArray(fills)) {
          for (const fill of fills) {
            if (fill.type === 'SOLID' && fill.visible !== false) {
              const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
              const existing = colorMap.get(hex);
              if (existing) {
                existing.count++;
              } else {
                colorMap.set(hex, {
                  value: hex,
                  type: isTextNode(node) ? 'text' : 'fill',
                  count: 1,
                  nodeId: node.id,
                  nodeName: node.name,
                });
              }
            }
          }
        }
      }

      // Extract typography
      if (isTextNode(node)) {
        const fontName = node.fontName;
        if (fontName !== figma.mixed) {
          const fn = fontName as FontName;
          const key = `${fn.family}|${fn.style}`;
          const existing = fontFamilyMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            fontFamilyMap.set(key, { style: fn.style, count: 1, nodeId: node.id, nodeName: node.name });
          }

          // Font weight
          const weight = getFontWeight(node);
          if (!fontWeightMap.has(weight)) {
            fontWeightMap.set(weight, new Map());
          }
          const weightFonts = fontWeightMap.get(weight)!;
          weightFonts.set(fn.family, (weightFonts.get(fn.family) || 0) + 1);
        }

        const fontSize = node.fontSize;
        if (typeof fontSize === 'number') {
          const existingSize = fontSizeMap.get(fontSize);
          if (existingSize) {
            existingSize.count++;
          } else {
            fontSizeMap.set(fontSize, { count: 1, nodeId: node.id, nodeName: node.name });
          }
        }

        const lineHeight = node.lineHeight;
        if (lineHeight !== figma.mixed && typeof lineHeight === 'object') {
          let lhKey: string;
          let lhValue: number | 'auto';
          if (lineHeight.unit === 'AUTO') {
            lhKey = 'auto';
            lhValue = 'auto';
          } else if (lineHeight.unit === 'PERCENT') {
            lhKey = String(lineHeight.value);
            lhValue = lineHeight.value;
          } else {
            lhKey = '';
            lhValue = 0;
          }
          if (lhKey) {
            const existingLh = lineHeightMap.get(lhKey);
            if (existingLh) {
              existingLh.count++;
            } else {
              lineHeightMap.set(lhKey, { value: lhValue, count: 1, nodeId: node.id, nodeName: node.name });
            }
          }
        }
      }

      // Extract spacing
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        const frame = node as FrameNode;

        if (frame.itemSpacing > 0) {
          const key = `gap-${frame.itemSpacing}`;
          const existing = spacingMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            spacingMap.set(key, { value: frame.itemSpacing, type: 'gap', count: 1, nodeId: node.id, nodeName: node.name });
          }
        }

        const paddings = [
          { value: frame.paddingTop, type: 'padding-top' },
          { value: frame.paddingBottom, type: 'padding-bottom' },
          { value: frame.paddingLeft, type: 'padding-left' },
          { value: frame.paddingRight, type: 'padding-right' },
        ];

        for (const { value, type } of paddings) {
          if (value > 0) {
            const key = `${type}-${value}`;
            const existing = spacingMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              spacingMap.set(key, { value, type, count: 1, nodeId: node.id, nodeName: node.name });
            }
          }
        }
      }

      // Extract border radius
      if ('cornerRadius' in node) {
        const radius = node.cornerRadius;
        if (typeof radius === 'number' && radius > 0) {
          const existingRadius = borderRadiusMap.get(radius);
          if (existingRadius) {
            existingRadius.count++;
          } else {
            borderRadiusMap.set(radius, { count: 1, nodeId: node.id, nodeName: node.name });
          }
        }
      }
    }

    // Build tokens object
    const tokens: DesignTokens = {
      colors: Array.from(colorMap.values())
        .map((c) => ({ value: c.value, type: c.type as ColorToken['type'], count: c.count, nodeId: c.nodeId, nodeName: c.nodeName }))
        .sort((a, b) => b.count - a.count),
      typography: {
        fontFamilies: Array.from(fontFamilyMap.entries())
          .map(([key, data]) => ({
            value: key.split('|')[0],
            style: data.style,
            count: data.count,
            nodeId: data.nodeId,
            nodeName: data.nodeName,
          }))
          .sort((a, b) => b.count - a.count),
        fontSizes: Array.from(fontSizeMap.entries())
          .map(([value, data]) => ({ value, count: data.count, nodeId: data.nodeId, nodeName: data.nodeName }))
          .sort((a, b) => a.value - b.value),
        fontWeights: Array.from(fontWeightMap.entries())
          .map(([weight, fonts]) => ({
            weight,
            fonts: Array.from(fonts.entries()).map(([family, count]) => ({ family, count })),
          }))
          .sort((a, b) => a.weight - b.weight),
        lineHeights: Array.from(lineHeightMap.values())
          .sort((a, b) => {
            if (a.value === 'auto') return -1;
            if (b.value === 'auto') return 1;
            return (a.value as number) - (b.value as number);
          }),
      },
      spacing: Array.from(spacingMap.values()).sort((a, b) => a.value - b.value),
      borderRadius: Array.from(borderRadiusMap.entries())
        .map(([value, data]) => ({ value, count: data.count, nodeId: data.nodeId, nodeName: data.nodeName }))
        .sort((a, b) => a.value - b.value),
    };

    sendToUI({ type: 'QA_TOKENS_EXTRACTED', tokens });
  } catch (error) {
    sendToUI({
      type: 'QA_SCAN_ERROR',
      error: `Token extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ============================================================================
// QA CHECKER - SETTINGS & NAVIGATION
// ============================================================================

/**
 * Save QA configuration
 */
async function saveQAConfig(config: QAConfig): Promise<void> {
  try {
    await figma.clientStorage.setAsync(QA_CONFIG_KEY, config);
    console.log('✓ QA Config saved:', config);
  } catch (e) {
    console.error('Failed to save QA config:', e);
  }
}

/**
 * Load QA configuration
 */
async function loadQAConfig(): Promise<QAConfig> {
  try {
    const config = await figma.clientStorage.getAsync(QA_CONFIG_KEY);
    if (config) {
      return config as QAConfig;
    }
  } catch (e) {
    console.error('Failed to load QA config:', e);
  }
  return DEFAULT_QA_CONFIG;
}

/**
 * Save QA scan report
 */
async function saveQAReport(result: QAScanResult): Promise<void> {
  try {
    await figma.clientStorage.setAsync(QA_REPORT_KEY, result);
    console.log('✓ QA Report saved');
  } catch (e) {
    console.error('Failed to save QA report:', e);
  }
}

/**
 * Load QA scan report
 */
async function loadQAReport(): Promise<QAScanResult | null> {
  try {
    const result = await figma.clientStorage.getAsync(QA_REPORT_KEY);
    if (result) {
      return result as QAScanResult;
    }
  } catch (e) {
    console.error('Failed to load QA report:', e);
  }
  return null;
}

/**
 * Save QA tokens
 */
async function saveQATokens(tokens: DesignTokens): Promise<void> {
  try {
    await figma.clientStorage.setAsync(QA_TOKENS_KEY, tokens);
    console.log('✓ QA Tokens saved');
  } catch (e) {
    console.error('Failed to save QA tokens:', e);
  }
}

/**
 * Load QA tokens
 */
async function loadQATokens(): Promise<DesignTokens | null> {
  try {
    const tokens = await figma.clientStorage.getAsync(QA_TOKENS_KEY);
    if (tokens) {
      return tokens as DesignTokens;
    }
  } catch (e) {
    console.error('Failed to load QA tokens:', e);
  }
  return null;
}

/**
 * Select node in Figma
 */
function handleQASelectNode(nodeId: string): void {
  const node = figma.getNodeById(nodeId);
  if (node && 'type' in node) {
    figma.currentPage.selection = [node as SceneNode];
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
  }
}

/**
 * Extract color styles from document
 */
function handleQAExtractStyles(): void {
  const colors: { name: string; hex: string }[] = [];
  const paintStyles = figma.getLocalPaintStyles();
  let noNameCounter = 1;

  for (const style of paintStyles) {
    for (const paint of style.paints) {
      if (paint.type === 'SOLID') {
        const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
        const name = style.name || `No name ${noNameCounter++}`;
        // Only add if hex not already in list
        if (!colors.some(c => c.hex === hex)) {
          colors.push({ name, hex });
        }
      }
    }
  }

  sendToUI({ type: 'QA_STYLES_EXTRACTED', colors });
}

/**
 * Extract color variables from document
 */
function handleQAExtractVariables(): void {
  const colors: { name: string; hex: string }[] = [];
  let noNameCounter = 1;

  try {
    const collections = figma.variables.getLocalVariableCollections();

    for (const collection of collections) {
      for (const variableId of collection.variableIds) {
        const variable = figma.variables.getVariableById(variableId);
        if (variable && variable.resolvedType === 'COLOR') {
          // Get value from first mode
          const modeId = collection.modes[0]?.modeId;
          if (modeId) {
            const value = variable.valuesByMode[modeId];
            if (value && typeof value === 'object' && 'r' in value) {
              const rgb = value as RGB;
              const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
              const name = variable.name || `No name ${noNameCounter++}`;
              // Only add if hex not already in list
              if (!colors.some(c => c.hex === hex)) {
                colors.push({ name, hex });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('Variables API not available or error:', e);
  }

  sendToUI({ type: 'QA_VARIABLES_EXTRACTED', colors });
}

/**
 * Extract typography styles from Figma text styles
 */
function handleQAExtractTypographyStyles(): void {
  const styles: { name: string; fontFamily: string; fontSize: number; fontWeight: number; lineHeight: number; letterSpacing: number; wordSpacing: number }[] = [];

  try {
    const textStyles = figma.getLocalTextStyles();

    for (const style of textStyles) {
      const fontName = style.fontName;
      const fontSize = style.fontSize;
      const lineHeight = style.lineHeight;
      const letterSpacing = style.letterSpacing;

      // Get font weight from style name
      let fontWeight = 400;
      const styleName = fontName.style.toLowerCase();
      if (styleName.includes('black')) fontWeight = 900;
      else if (styleName.includes('extrabold') || styleName.includes('extra bold')) fontWeight = 800;
      else if (styleName.includes('bold')) fontWeight = 700;
      else if (styleName.includes('semibold') || styleName.includes('semi bold')) fontWeight = 600;
      else if (styleName.includes('medium')) fontWeight = 500;
      else if (styleName.includes('light')) fontWeight = 300;
      else if (styleName.includes('thin')) fontWeight = 100;

      // Get line height as percentage
      let lineHeightPercent = 150;
      if (typeof lineHeight === 'object') {
        if (lineHeight.unit === 'PERCENT') {
          lineHeightPercent = Math.round(lineHeight.value);
        } else if (lineHeight.unit === 'PIXELS' && fontSize > 0) {
          lineHeightPercent = Math.round((lineHeight.value / fontSize) * 100);
        }
      }

      // Get letter spacing in px (convert from percentage if needed)
      let letterSpacingPx = 0;
      if (typeof letterSpacing === 'object') {
        if (letterSpacing.unit === 'PIXELS') {
          letterSpacingPx = Math.round(letterSpacing.value * 100) / 100;
        } else if (letterSpacing.unit === 'PERCENT') {
          // Convert percentage to px (percentage of font size)
          letterSpacingPx = Math.round((letterSpacing.value / 100) * fontSize * 100) / 100;
        }
      }

      styles.push({
        name: style.name,
        fontFamily: fontName.family,
        fontSize: fontSize,
        fontWeight: fontWeight,
        lineHeight: lineHeightPercent,
        letterSpacing: letterSpacingPx,
        wordSpacing: 0, // Figma doesn't have word spacing property
      });
    }
  } catch (e) {
    console.log('Error extracting typography styles:', e);
  }

  sendToUI({ type: 'QA_TYPOGRAPHY_STYLES_EXTRACTED', styles });
}

// Load QA config, report, and tokens on startup
(async () => {
  const qaConfig = await loadQAConfig();
  sendToUI({ type: 'QA_CONFIG_LOADED', config: qaConfig });

  const qaReport = await loadQAReport();
  sendToUI({ type: 'QA_REPORT_LOADED', result: qaReport });

  const qaTokens = await loadQATokens();
  sendToUI({ type: 'QA_TOKENS_LOADED', tokens: qaTokens });
})();

// ============================================================================
// UTILITIES
// ============================================================================

function sendToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
}
