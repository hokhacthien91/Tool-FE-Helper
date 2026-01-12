// ============================================================================
// TYPES & INTERFACES
// Breakpoint Generator Plugin
// ============================================================================

/**
 * Plugin configuration from UI
 */
export interface PluginConfig {
  mobileWidth: number;       // Target width (primary/first selected)
  mobileWidths?: number[];   // All selected target widths (for multi-breakpoint generation)
  breakpoints?: { width: number; padding: number; maxSpacing: number }[];  // Individual settings per breakpoint
  widthIndex?: number;       // Index of current width being generated (for positioning)
  previousWidthsTotal?: number;  // Total width of all previous breakpoints (for positioning)
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
  forEmail?: boolean;        // For Email mode enabled
  darkModeSkipFrames?: string[];  // Frame names to skip during dark mode conversion
  activeTab?: string;        // Currently active tab (generator, email, inspector)
  buttonNamePatterns?: string[];  // Patterns for Button export
  buttonExportFormat?: 'PNG' | 'SVG' | 'JPG';  // Export format for buttons (default PNG)
  buttonExportScale?: number;     // Export scale for buttons (default 2)
  buttonExportPadding?: number;   // Export padding for buttons (default 0)
  pngNamePatterns?: string[];     // Patterns for PNG export
  pngExportScale?: number;        // Export scale for PNG (default 2)
  jpgNamePatterns?: string[];     // Patterns for JPG export
  jpgExportScale?: number;        // Export scale for JPG (default 2)
  // Slider configuration
  isSlider?: boolean;             // Enable slider mode
  sliderItemPattern?: string;     // Name pattern to find slider items (e.g., "Cards")
  sliderItemsVisible?: number;    // Number of items visible in slider
  sliderPeekNextItem?: boolean;   // Show partial next item
  sliderPeekAmount?: number;      // Amount of next item to show (px)
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
  forEmail: false,
  darkModeSkipFrames: [],
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
  | { type: 'UNMUTE_FRAME'; frameName: string }
  | { type: 'CONVERT_DARK_MODE'; skipFrames?: string[] }
  | { type: 'EXPORT_BUTTONS'; patterns: string[]; scale: number; padding: number; format: 'PNG' | 'SVG' | 'JPG' }
  | { type: 'EXPORT_BUTTON_IMAGE'; id: string; name: string; textContent: string; scale: number; padding: number; format: 'PNG' | 'SVG' | 'JPG' }
  // QA Checker messages
  | { type: 'QA_SCAN'; config: QAConfig; scope: 'page' | 'selection' }
  | { type: 'QA_FIX_ISSUE'; issue: QAIssue }
  | { type: 'QA_FIX_ALL'; category: IssueCategory; issues: QAIssue[] }
  | { type: 'QA_EXTRACT_TOKENS'; scope: 'page' | 'selection' }
  | { type: 'QA_SAVE_CONFIG'; config: QAConfig }
  | { type: 'QA_SAVE_REPORT'; result: QAScanResult }
  | { type: 'QA_SAVE_TOKENS'; tokens: DesignTokens }
  | { type: 'QA_SELECT_NODE'; nodeId: string }
  | { type: 'QA_EXTRACT_STYLES' }
  | { type: 'QA_EXTRACT_VARIABLES' }
  | { type: 'QA_EXTRACT_TYPOGRAPHY_STYLES' }
  | { type: 'QA_REQUEST_CONFIG' }
  // Export GIF messages
  | { type: 'GIF_GET_SELECTION_INFO' }
  | { type: 'GIF_EXPORT_FRAMES'; config: GifExportConfig }
  // Copy Content messages
  | { type: 'GET_TEXT_STYLE_INFO' };

export type UIMessage =
  | { type: 'CONVERSION_COMPLETE'; result: TransformResult }
  | { type: 'CONVERSION_ERROR'; errors: string[] }
  | { type: 'VALIDATION_FAILED'; result: ValidationResult }
  | { type: 'SELECTION_INFO'; hasSelection: boolean; frameName?: string; frameWidth?: number; frameHeight?: number; selectedCount?: number; textNodeSelected?: boolean; textNodeName?: string; textNodeChars?: number }
  | { type: 'SELECTED_FRAME_INFO'; frame?: AvailableMobileFrame }
  | { type: 'MANUAL_FRAMES_INFO'; frames: AvailableMobileFrame[] }
  | { type: 'SETTINGS_LOADED'; config: PluginConfig }
  | { type: 'PROGRESS_UPDATE'; current: number; total: number; stepName: string }
  | { type: 'PATTERN_MATCH_CONFIRM'; matchId: string; frameName: string; pattern: string; currentLayout: string; willBecome: string }
  | { type: 'MUTED_FRAMES_LOADED'; mutedFrames: Record<string, 'skip' | 'keep'> }
  | { type: 'DARK_MODE_COMPLETE'; frameName: string }
  | { type: 'DARK_MODE_ERROR'; error: string }
  | { type: 'EXPORT_BUTTONS_FOUND'; buttons: Array<{ id: string; name: string; textContent: string }> }
  | { type: 'EXPORT_BUTTON_DATA'; id: string; fileName: string; data: string }
  | { type: 'EXPORT_BUTTONS_ERROR'; error: string }
  // QA Checker messages
  | { type: 'QA_SCAN_PROGRESS'; current: number; total: number; step: string }
  | { type: 'QA_SCAN_COMPLETE'; result: QAScanResult }
  | { type: 'QA_SCAN_ERROR'; error: string }
  | { type: 'QA_FIX_COMPLETE'; issueId: string; success: boolean; message?: string }
  | { type: 'QA_FIX_ALL_COMPLETE'; category: IssueCategory; fixedCount: number; failedCount: number }
  | { type: 'QA_TOKENS_EXTRACTED'; tokens: DesignTokens }
  | { type: 'QA_CONFIG_LOADED'; config: QAConfig }
  | { type: 'QA_REPORT_LOADED'; result: QAScanResult | null }
  | { type: 'QA_TOKENS_LOADED'; tokens: DesignTokens | null }
  | { type: 'QA_STYLES_EXTRACTED'; colors: { name: string; hex: string }[] }
  | { type: 'QA_VARIABLES_EXTRACTED'; colors: { name: string; hex: string }[] }
  | { type: 'QA_TYPOGRAPHY_STYLES_EXTRACTED'; styles: TypographyStyle[] }
  // Export GIF messages
  | { type: 'GIF_SELECTION_INFO'; info: GifSelectionInfo | null }
  | { type: 'GIF_FRAMES_DATA'; frames: GifFrameData[]; config: GifExportConfig; overlayDataList?: GifFrameData[] }
  | { type: 'GIF_EXPORT_PROGRESS'; current: number; total: number }
  | { type: 'GIF_EXPORT_ERROR'; error: string }
  // Copy Content messages
  | { type: 'TEXT_STYLE_INFO'; info: TextStyleInfo | null }
  | { type: 'TEXT_STYLE_ERROR'; error: string };

/**
 * Text style information for Copy Content feature
 */
export interface TextStyleInfo {
  content: string;
  fontSize: number;
  lineHeight: number;  // in px
  fontWeight: number;
  letterSpacing: number;
  wordSpacing: number;
  color: string;  // hex color
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
}

// ============================================================================
// EXPORT GIF TYPES
// ============================================================================

/**
 * GIF Export Configuration
 */
export interface GifExportConfig {
  width: number;           // Output width
  height: number;          // Output height
  fps: number;             // Frames per second (for smooth animation)
  frameDelay: number;      // Delay between frames in ms
  scale: number;           // Export scale (1x, 2x, etc.)
  loop: boolean;           // Loop forever or play once
  overlayFrameIds?: string[]; // Optional: IDs of static layers to overlay on top of each frame
  paddingX: number;        // Left/Right padding (transparent) - default 0
  paddingY: number;        // Top/Bottom padding (transparent) - default 0
}

/**
 * Information about selected frame for GIF export
 */
export interface GifSelectionInfo {
  frameId: string;
  frameName: string;
  width: number;
  height: number;
  hasPrototype: boolean;
  isComponentInstance: boolean;
  variantCount: number;
  childFrameCount: number;  // For non-component frames with multiple children
  frameNames: string[];     // Names of variants or child frames
  delays: number[];         // Delay for each frame from Figma interactions (ms)
  defaultDelay: number;     // Default delay if no interaction found (ms)
  overlayLayers: { id: string; name: string }[];  // Available layers that can be used as overlay
}

/**
 * Single frame data for GIF generation
 */
export interface GifFrameData {
  index: number;
  name: string;
  imageData: string;  // Base64 encoded PNG
  width: number;
  height: number;
  x?: number;  // X position relative to parent (for overlays)
  y?: number;  // Y position relative to parent (for overlays)
  opacity?: number;  // Frame opacity (0-1), used for simulating transparency
}

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

// ============================================================================
// QA CHECKER TYPES
// ============================================================================

/**
 * Typography Style definition for style matching
 */
export interface TypographyStyle {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number; // percentage, e.g. 120 for 120%
  letterSpacing: number; // in px or percentage
  wordSpacing: number; // in px
}

/**
 * Typography check rules
 */
export interface TypographyCheckRules {
  checkTypographyStyle: boolean;
  checkFontFamily: boolean;
  checkFontSize: boolean;
  checkFontWeight: boolean;
  checkLineHeight: boolean;
  checkLetterSpacing: boolean;
  checkWordSpacing: boolean;
}

/**
 * Color palette item with name
 */
export interface ColorPaletteItem {
  name: string;
  hex: string;
}

/**
 * QA Configuration
 */
export interface QAConfig {
  fontSizeScale: number[];
  fontSizeThreshold: number;
  lineHeightScale: (number | 'auto')[];
  lineHeightThreshold: number;
  lineHeightBaseline: number;
  spacingScale: number[];
  spacingThreshold: number;
  colorPalette: string[]; // Legacy: hex only
  colorPaletteItems: ColorPaletteItem[]; // New: with names
  // Issue category checks - enable/disable each category
  checkTypographyMatch: boolean;  // Typography Style Match
  checkTextStyle: boolean;        // Text Style (Variable)
  checkFontSize: boolean;         // Font Size
  checkLineHeight: boolean;       // Line Height
  checkContrast: boolean;         // Contrast (ADA AA)
  checkTextSize: boolean;         // Text Size (ADA)
  checkColor: boolean;            // Color
  // Legacy checks (keep for backward compatibility)
  checkTypography: boolean;
  checkColors: boolean;
  checkNaming: boolean;
  checkAutoLayout: boolean;
  checkSpacing: boolean;
  // Typography style matching
  typographyStyles: TypographyStyle[];
  typographyCheckRules: TypographyCheckRules;
  // Skip layer names - layers matching these names will be skipped during QA scan
  skipLayerNames: string[];
}

/**
 * Default QA configuration
 */
export const DEFAULT_QA_CONFIG: QAConfig = {
  fontSizeScale: [12, 14, 16, 18, 20, 24, 32, 40, 48, 64],
  fontSizeThreshold: 100,
  lineHeightScale: ['auto', 100, 120, 140, 150, 160, 180, 200],
  lineHeightThreshold: 300,
  lineHeightBaseline: 120,
  spacingScale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  spacingThreshold: 100,
  colorPalette: [],
  colorPaletteItems: [],
  // Issue category checks - all enabled by default
  checkTypographyMatch: true,
  checkTextStyle: true,
  checkFontSize: true,
  checkLineHeight: true,
  checkContrast: true,
  checkTextSize: true,
  checkColor: true,
  // Legacy checks
  checkTypography: true,
  checkColors: true,
  checkNaming: true,
  checkAutoLayout: true,
  checkSpacing: true,
  // Typography style matching defaults
  typographyStyles: [
    { name: 'H1', fontFamily: 'Inter', fontSize: 48, fontWeight: 700, lineHeight: 120, letterSpacing: 0, wordSpacing: 0 },
    { name: 'H2', fontFamily: 'Inter', fontSize: 36, fontWeight: 700, lineHeight: 130, letterSpacing: 0, wordSpacing: 0 },
    { name: 'H3', fontFamily: 'Inter', fontSize: 30, fontWeight: 100, lineHeight: 130, letterSpacing: 0, wordSpacing: 0 },
    { name: 'H4', fontFamily: 'Inter', fontSize: 24, fontWeight: 100, lineHeight: 140, letterSpacing: 0, wordSpacing: 0 },
    { name: 'H5', fontFamily: 'Inter', fontSize: 20, fontWeight: 100, lineHeight: 140, letterSpacing: 0, wordSpacing: 0 },
    { name: 'H6', fontFamily: 'Inter', fontSize: 16, fontWeight: 100, lineHeight: 150, letterSpacing: 0, wordSpacing: 0 },
    { name: 'Body', fontFamily: 'Inter', fontSize: 14, fontWeight: 400, lineHeight: 150, letterSpacing: 0, wordSpacing: 0 },
  ],
  typographyCheckRules: {
    checkTypographyStyle: true,
    checkFontFamily: true,
    checkFontSize: true,
    checkFontWeight: true,
    checkLineHeight: true,
    checkLetterSpacing: true,
    checkWordSpacing: true,
  },
  skipLayerNames: ['vector'],
};

/**
 * Issue severity levels
 */
export type IssueSeverity = 'error' | 'warning';

/**
 * Issue categories
 */
export type IssueCategory = 'typography-match' | 'text-style' | 'font-size' | 'line-height' | 'contrast' | 'text-size' | 'color';

/**
 * QA Issue
 */
export interface QAIssue {
  id: string;
  nodeId: string;
  nodeName: string;
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  details?: string;
  currentValue?: string | number;
  suggestedValue?: string | number;
  fixable: boolean;
  fixType?: 'fontSize' | 'lineHeight' | 'color' | 'spacing' | 'typographyStyle';
  // For contrast issues
  textColor?: string;
  backgroundColor?: string;
  backgroundNodeName?: string;
  contrastRatio?: number;
  requiredRatio?: number;
  // For typography match issues
  textContent?: string;
  currentTypography?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
  };
  closestMatch?: {
    styleName: string;
    matchPercentage: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    wordSpacing: number;
  };
}

/**
 * Issue group for UI display
 */
export interface IssueGroup {
  category: IssueCategory;
  label: string;
  icon: string;
  issues: QAIssue[];
  errorCount: number;
  warningCount: number;
}

/**
 * QA Scan result
 */
export interface QAScanResult {
  timestamp: number;
  scanType: 'page' | 'selection';
  frameName?: string;
  issues: QAIssue[];
  issueGroups: IssueGroup[];
  totalErrors: number;
  totalWarnings: number;
  totalNodes: number;
  scanDuration: number;
}

/**
 * Design token - Color
 */
export interface ColorToken {
  value: string;
  type: 'text' | 'background' | 'border' | 'shadow' | 'fill';
  count: number;
  nodeId: string;
  nodeName: string;
}

/**
 * Design token - Typography
 */
export interface TypographyTokens {
  fontFamilies: { value: string; style: string; count: number; nodeId: string; nodeName: string }[];
  fontSizes: { value: number; count: number; nodeId: string; nodeName: string }[];
  fontWeights: { weight: number; fonts: { family: string; count: number }[] }[];
  lineHeights: { value: number | 'auto'; count: number; nodeId: string; nodeName: string }[];
}

/**
 * Design tokens collection
 */
export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyTokens;
  spacing: { value: number; type: string; count: number; nodeId: string; nodeName: string }[];
  borderRadius: { value: number; count: number; nodeId: string; nodeName: string }[];
}

/**
 * Contrast check result
 */
export interface ContrastResult {
  nodeId: string;
  nodeName: string;
  textColor: string;
  backgroundColor: string;
  backgroundNodeName: string;
  contrastRatio: number;
  isLargeText: boolean;
  requiredRatio: number;
  passes: boolean;
}
