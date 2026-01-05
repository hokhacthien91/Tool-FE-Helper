// ============================================================================
// MAIN PLUGIN CODE
// Breakpoint Generator - Simple resize with optional font handling
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
} from './types';

// ============================================================================
// PLUGIN INITIALIZATION
// ============================================================================

figma.showUI(__html__, {
  width: 550,
  height: 460,
  title: 'Breakpoint Generator',
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

  // Add children (with depth limit)
  if (depth < MAX_DEPTH && 'children' in node) {
    const children = (node as FrameNode).children;
    if (children.length > 0) {
      json.children = children.map(child => buildNodeJson(child, depth + 1));
    }
  } else if (depth >= MAX_DEPTH && 'children' in node) {
    const childCount = (node as FrameNode).children.length;
    if (childCount > 0) {
      json.childrenCount = childCount;
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
    });
  } else {
    sendToUI({
      type: 'SELECTION_INFO',
      hasSelection: false,
    });
  }
}

sendSelectionInfo();
figma.on('selectionchange', () => {
  sendSelectionInfo();
  // Also update Inspector tab when selection changes
  sendNodeInfo();
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

    case 'CANCEL':
      figma.closePlugin();
      break;
  }
};

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

  // Convert all valid frames
  const results: TransformResult[] = [];
  const newFrames: (FrameNode | SectionNode | InstanceNode)[] = [];

  for (const frame of validFrames) {
    if (config.generateMultipleVersions) {
      // Generate 3 versions with different strategies
      const versionConfigs = [
        { ...config, version: 1, layoutStrategy: 'conservative' as const },  // Ver1: Keep layout as is
        { ...config, version: 2, layoutStrategy: 'balanced' as const },      // Ver2: Add spacing when converting to vertical
        { ...config, version: 3, layoutStrategy: 'aggressive' as const },    // Ver3: More aggressive layout conversion
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
        mobileFrameName: `${frame.name} - ${config.mobileWidth}px (3 versions)`,
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
      const result = await generateBreakpoint(frame, config);
      results.push(result);

      if (result.success && result.mobileFrameId) {
        const newFrame = figma.getNodeById(result.mobileFrameId);
        if (newFrame) {
          newFrames.push(newFrame as FrameNode | SectionNode | InstanceNode);
        }
      }
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
    if (config.generateMultipleVersions) {
      message = validFrames.length === 1
        ? `✓ Created 3 versions at ${config.mobileWidth}px`
        : `✓ Created ${successCount * 3} versions at ${config.mobileWidth}px`;
    } else {
      message = validFrames.length === 1
        ? `✓ Created ${config.mobileWidth}px breakpoint`
        : `✓ Created ${successCount} breakpoint${successCount > 1 ? 's' : ''} at ${config.mobileWidth}px`;
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
    const versionOffset = config.version ? (config.version - 1) * (config.mobileWidth + 50) : 0;
    newFrame.x = sourceFrame.x + sourceFrame.width + 100 + versionOffset;
    newFrame.y = sourceFrame.y; // Align top with source frame

    // Step 6: Detach all nested instances so we can modify their layout
    // Instances in Figma don't allow modifying children's layout
    currentStep++;
    console.log(`📊 PROGRESS: Step ${currentStep}/15 - Processing instances`);
    sendToUI({ type: 'PROGRESS_UPDATE', current: currentStep, total: totalSteps, stepName: 'Processing instances' });
    await new Promise(resolve => setTimeout(resolve, 30));
    detachAllInstances(newFrame, config.preservedComponentNames);

    // Step 6b: Ungroup all GROUP nodes
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
    await convertHorizontalToVertical(newFrame, config.mobileWidth, stats, layoutStrategy, config.maxSpacing, uiControlPatterns);

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
  uiControlPatterns: string[] = ['button', 'btn', 'cta', 'input', 'field', 'search', 'tab', 'icon']
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
        await convertHorizontalToVertical(child, targetWidth, stats, strategy, maxSpacing, uiControlPatterns);
      } catch (e) {
        console.error(`❌ convertHorizontalToVertical error on child "${child.name}" (id: ${child.id}): ${e}`);
      }
    }
  }

  // Now check if THIS node is a horizontal auto-layout that needs conversion
  if (!isAutoLayoutFrame(node)) {
    return;
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
                (currentSizing === 'HUG')) {  // Changed: HUG lists should also fill
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

interface IconSize {
  width: number;
  height: number;
  childSizes: Map<string, { width: number; height: number }>;
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
        // Store this icon frame's size
        const childSizes = new Map<string, { width: number; height: number }>();

        // Store sizes of all children (especially Group/Vector)
        if (hasChildren(frame)) {
          for (const child of frame.children) {
            if ('width' in child && 'height' in child) {
              childSizes.set(child.name, {
                width: (child as any).width,
                height: (child as any).height
              });
            }
          }
        }

        iconSizes.set(currentPath, {
          width: frame.width,
          height: frame.height,
          childSizes
        });

        console.log(`📦 Stored icon: "${currentPath}" (${frame.width}x${frame.height})`);
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

          // Restore children sizes (especially Group/Vector)
          if (hasChildren(frame)) {
            for (const child of frame.children) {
              const storedChildSize = storedIcon.childSizes.get(child.name);
              if (storedChildSize && 'resize' in child) {
                const childWidth = (child as any).width;
                const childHeight = (child as any).height;

                if (childWidth !== storedChildSize.width || childHeight !== storedChildSize.height) {
                  console.log(`  ↳ Restoring child "${child.name}" from ${childWidth}x${childHeight} to ${storedChildSize.width}x${storedChildSize.height}`);
                  try {
                    (child as any).resize(storedChildSize.width, storedChildSize.height);
                  } catch (e) {
                    console.log(`  ❌ Failed to restore child: ${e}`);
                  }
                }
              }
            }
          }

          stats.nodesProcessed++;
          console.log(`✓ Restored icon: "${currentPath}"`);
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
          child.resize(mobileWidth, child.height);
          stats.nodesProcessed++;
        }
      } catch (e) {
        // Some nodes can't be modified
      }
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
// UTILITIES
// ============================================================================

function sendToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
}
