// ============================================================================
// TYPES & INTERFACES
// Breakpoint Generator Plugin
// ============================================================================

/**
 * Plugin configuration from UI
 */
export interface PluginConfig {
  mobileWidth: number;       // Target width
  containerPadding: number;  // Left/right padding for mobile container (default 20px)
  fontMode: 'keep' | 'map' | 'scale';  // Font handling mode
  textScale: number;         // Scale factor (only used when fontMode = 'scale')
  manualSourceFrameIds: string[];  // IDs of mobile frames that contain manual sections
  enableManualReplacement: boolean;  // Enable/disable manual section replacement
  generateMultipleVersions: boolean;  // Generate 3 versions for comparison
  version?: number;          // Version number (1, 2, or 3) for multi-version generation
  layoutStrategy?: 'conservative' | 'balanced' | 'aggressive';  // Layout conversion strategy
  maxSpacing: number;        // Maximum spacing cap when converting layouts (default 40px)
  preservedComponentNames: string[];  // Component names to preserve (not detach)
  uiControlPatterns: string[];  // Patterns to identify UI controls that should NOT be resized to FILL
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: PluginConfig = {
  mobileWidth: 375,
  containerPadding: 20,
  fontMode: 'keep',
  textScale: 0.85,
  manualSourceFrameIds: [],
  enableManualReplacement: false,
  generateMultipleVersions: false,
  maxSpacing: 40,
  preservedComponentNames: ['button', 'btn', 'icon'],
  uiControlPatterns: ['button', 'btn', 'cta', 'input', 'field', 'search', 'tab', 'icon'],
};

/**
 * Transformation result
 */
export interface TransformResult {
  success: boolean;
  mobileFrameId?: string;
  mobileFrameName?: string;
  mobileFrameIds?: string[];  // For multiple versions
  errors: string[];
  stats: TransformStats;
}

/**
 * Statistics about the transformation
 */
export interface TransformStats {
  nodesProcessed: number;
  textsScaled: number;
  textStylesMapped: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  nodeId: string;
  nodeName: string;
  code: string;
  message: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  nodeId: string;
  nodeName: string;
  code: string;
  message: string;
}

/**
 * Available mobile frame for manual sections
 */
export interface AvailableMobileFrame {
  id: string;
  name: string;
  manualSectionCount: number;  // Number of sections with "- manual" suffix
}

/**
 * Message types for UI <-> Plugin communication
 */
export type PluginMessage =
  | { type: 'CONVERT'; config: PluginConfig }
  | { type: 'CANCEL' }
  | { type: 'GET_SELECTION' }
  | { type: 'GET_SELECTED_FRAME_FOR_MANUAL' }
  | { type: 'GET_MANUAL_FRAMES_INFO'; frameIds: string[] }
  | { type: 'SAVE_SETTINGS'; config: PluginConfig }
  | { type: 'GET_NODE_INFO' }
  | { type: 'PATTERN_MATCH_RESPONSE'; matchId: string; skipMatching: boolean; mute?: boolean }
  | { type: 'MUTE_FRAME'; frameName: string; action: 'skip' | 'keep' }
  | { type: 'UNMUTE_FRAME'; frameName: string };

export type UIMessage =
  | { type: 'CONVERSION_COMPLETE'; result: TransformResult }
  | { type: 'CONVERSION_ERROR'; errors: string[] }
  | { type: 'VALIDATION_FAILED'; result: ValidationResult }
  | { type: 'SELECTION_INFO'; hasSelection: boolean; frameName?: string; frameWidth?: number; frameHeight?: number; selectedCount?: number }
  | { type: 'SELECTED_FRAME_INFO'; frame?: AvailableMobileFrame }
  | { type: 'MANUAL_FRAMES_INFO'; frames: AvailableMobileFrame[] }
  | { type: 'SETTINGS_LOADED'; config: PluginConfig }
  | { type: 'PROGRESS_UPDATE'; current: number; total: number; stepName: string }
  | { type: 'PATTERN_MATCH_CONFIRM'; matchId: string; frameName: string; pattern: string; currentLayout: string; willBecome: string }
  | { type: 'MUTED_FRAMES_LOADED'; mutedFrames: Record<string, 'skip' | 'keep'> };

/**
 * Type guards for Figma nodes
 */
export function isFrameNode(node: SceneNode): node is FrameNode {
  return node.type === 'FRAME';
}

export function isTextNode(node: SceneNode): node is TextNode {
  return node.type === 'TEXT';
}

export function hasChildren(node: SceneNode): node is SceneNode & { children: readonly SceneNode[] } {
  return 'children' in node;
}
