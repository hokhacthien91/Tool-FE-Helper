# Thien Assist - Figma Plugin

## Project Overview

"Thien Assist" is a multi-purpose Figma plugin for FE developers. Core capabilities: responsive design conversion (desktop → mobile breakpoints), QA checking, GIF export, image export, dark mode conversion, and design inspection.

Part of the `Tool-FE-Helper` monorepo containing 3 Figma plugins + 6 dev automation tools.

## Directory Structure

```
generate-breakpoint/
├── src/
│   ├── code.ts              # Main plugin logic (~6,179 lines)
│   └── types.ts             # TypeScript interfaces, message types, defaults
├── ui.html                  # Plugin UI (317KB, pre-built web app)
├── build.mjs                # esbuild build config
├── manifest.json            # Figma plugin manifest
├── package.json
├── tsconfig.json            # ES2020, strict, bundler resolution
├── desktop-to-mobile-breakpoint-converter/  # Built output folder
│   ├── code.js
│   ├── ui.html
│   └── manifest.json
└── tinypng-proxy/           # Express server for TinyPNG image compression
    ├── server.js            # Port 3001, endpoints: POST /compress, GET /usage
    └── package.json
```

## Tech Stack & Build

- **Language**: TypeScript
- **Bundler**: esbuild (IIFE format, ES6 target)
- **API**: Figma Plugin API 1.0.0
- **Plugin manifest**: name "Thien Assist", id "Thien-Assist", capabilities: inspect, editorType: figma + dev
- **Network access**: CDN cloudflare + localhost:3001

### Build Commands

```bash
npm run build      # Build plugin once
npm run watch      # Watch mode with auto-rebuild
npm run typecheck  # TypeScript type checking only
```

## Architecture

### Message-Based Communication

UI and Plugin communicate via `figma.ui.postMessage` / `figma.ui.onmessage`:

- **PluginMessage** (UI → Plugin): 20+ message types defined in `types.ts`
  - `CONVERT`, `QA_SCAN`, `GIF_EXPORT_FRAMES`, `EXPORT_ALL_IMAGES`, `CONVERT_DARK_MODE`, `GET_NODE_INFO`, `GET_TEXT_STYLE_INFO`, `EXPORT_COMPARE_DATA`, etc.
- **UIMessage** (Plugin → UI): 25+ message types
  - `CONVERSION_COMPLETE`, `QA_SCAN_COMPLETE`, `GIF_FRAMES_DATA`, `PROGRESS_UPDATE`, `EXPORT_BUTTON_DATA`, etc.

### Settings Persistence

- `figma.clientStorage` with keys: `pluginSettings`, `mutedFrames`
- Settings loaded on plugin init and sent to UI via `SETTINGS_LOADED` message

### Plugin Initialization

```typescript
figma.showUI(__html__, { width: 550, height: 600, title: 'Thien Assist', themeColors: true });
```

## Core Features

### 1. Desktop → Mobile Breakpoint Conversion

**Entry**: `handleConvert()` (line ~1774) → `generateBreakpoint()` (line ~1929)

15-step conversion process:
1. Store image aspect ratios, icon sizes, media container sizes from source frame
2. Clone the source frame
3. Detach component instances (respects `preservedComponentNames` like button, btn, icon)
4. Rename with width suffix (e.g., "Frame - 375px")
5. Position next to original (100px gap, multi-breakpoint offset)
6. Ungroup GROUP nodes (`ungroupAllGroups`) - GROUPs don't support auto-layout
7. Convert horizontal → vertical layouts (`convertHorizontalToVertical`)
8. Resize frame to target width
9. Fix child frame widths that still have original desktop width (`fixFullWidthChildren`)
10. Apply container padding (`applyContainerPadding`)
11. Fix absolute positioned content that overflows
12. Process spacing variables - apply Figma Variable mode values for target breakpoint
13. Process slider/carousel frames (keep horizontal, resize items)
14. Fix vertical layout heights (hug content)
15. Restore images, icons, media containers to original proportions

**Multi-breakpoint generation**: Generate 375/390/414/768/1024px simultaneously with individual padding/maxSpacing per breakpoint.

**Multi-version generation**: Create 3 layout strategy versions side by side:
- Conservative (ver1): Keep layout as-is
- Balanced (ver2): Add spacing when converting to vertical
- Aggressive (ver3): More aggressive layout conversion

**Font handling modes**:
- `keep`: No font changes
- `scale`: Scale all fonts by factor (default 0.85)
- `map`: Map font sizes to defined scale

**Manual section replacement**: Replace specific sections with mobile-optimized versions from reference frames. Sections marked with "- manual" suffix in child name.

**UI control detection**: Patterns like button/btn/cta/input/field/search/tab/icon preserve their natural size instead of stretching to fill.

**Muted frames**: User decisions to skip or keep specific frame layouts, persisted across sessions.

### 2. QA Checker

**Entry**: `handleQAScan()` (line ~4894)

**9 issue categories** (`IssueCategory` type):
- `typography-match` - Text doesn't match any defined typography style (H1-H6, Body)
- `text-style` - Text not using Figma Text Style variable
- `font-family` - Font not in allowed list from Typography Settings
- `font-size` - Font size not in defined scale [12, 14, 16, 18, 20, 24, 32, 40, 48, 64]
- `line-height` - Line height not in defined scale [auto, 100, 120, 140, 150, 160, 180, 200]
- `contrast` - WCAG AA contrast ratio failure (4.5:1 normal text, 3:1 large text)
- `text-size` - Text too small for ADA compliance
- `color` - Color not in approved palette
- `border-radius` - Border radius present (not supported in email)

**Features**:
- Scan scope: entire page or current selection
- Fix single issue or fix all issues in a category
- Skip layers by name pattern (default: 'vector')
- Each check category can be individually enabled/disabled
- Progress updates during scan (~50 nodes at a time)
- Issues grouped by category with error/warning counts

### 3. Design Token Extraction

**Entry**: `handleQAExtractTokens()` (line ~5724)

**Extracts from page or selection**:
- **Colors**: Hex values with usage type (text/background/border/shadow/fill) and count
- **Typography**: Font families + styles, font sizes, font weights with associated families, line heights
- **Spacing**: Item spacing (gaps) and padding values
- **Border Radius**: All corner radius values

**Additional extraction**:
- `QA_EXTRACT_STYLES` - Local paint styles (name + hex)
- `QA_EXTRACT_VARIABLES` - Color variables (name + hex)
- `QA_EXTRACT_TYPOGRAPHY_STYLES` - Typography styles (name, family, size, weight, lineHeight, letterSpacing, wordSpacing)

### 4. GIF Export

**Entry**: `handleGifExportFrames()` (line ~899)

**Configuration** (`GifExportConfig`):
- FPS, frame delay (global or per-frame individual delays)
- Export scale (1x, 2x, etc.)
- Loop or play once
- Padding X/Y (transparent border)
- Overlay frame IDs (static layers composited on top of each frame)
- Smooth transitions from Figma prototype (SMART_ANIMATE, DISSOLVE, easing types)

**Flow**: Plugin exports frames as base64 PNG → sends to UI → UI assembles GIF using gif.js library in ui.html.

### 5. Dark Mode Conversion

**Entry**: `handleConvertDarkMode()` (line ~1348)

**Process**: Clone selected frame → detach all instances → recursively invert colors via `convertNodeToDarkMode()` → rename with " - Dark Mode" suffix → position 100px right of original.

**Config**: `darkModeSkipFrames` array to exclude specific frame names.

### 6. Image Export

**Entry**: `handleExportAllImages()` (line ~1456), `handleExportButtonImage()` (line ~1519)

**Three pattern-based export types**:
- Button patterns → export as PNG/SVG/JPG with configurable scale and padding
- PNG patterns → export as PNG with configurable scale
- JPG patterns → export as JPG with configurable scale

**Features**: Name-based matching (case-insensitive), transparent padding around images, filename derived from text content, batch export of all matching frames.

### 7. Compare Export

**Entry**: `handleGetCompareFrameInfo()` (line ~1624), `handleExportCompareData()` (line ~1654)

**Purpose**: Export desktop vs mobile frame data for side-by-side comparison.

**Output**: Recursive JSON structure containing layout properties, text content, fill colors (with Figma Variable names if bound), children hierarchy + 1x PNG screenshots of both frames.

### 8. Node Inspector

**Entry**: `sendNodeInfo()` (line ~189)

**Purpose**: JSON viewer for currently selected node.

**Shows**: Preview image (300px wide PNG), recursive node structure (max depth 5) with position, dimensions, layout properties, text content (truncated at 100 chars), visibility-filtered children.

### 9. Copy Content / Text Style Info

**Entry**: `handleGetTextStyleInfo()` (line ~632)

**Extracts from selected text node**: content, fontSize, lineHeight (px), fontWeight, letterSpacing, wordSpacing, color (hex), fontFamily, textAlign.

**Handles**: Mixed fonts/weights/colors (uses first segment), PERCENT-based lineHeight and letterSpacing → pixel conversion.

### 10. Slider/Carousel Support

**Entry**: `processSliderFrames()` (line ~2901)

**Config**: `sliderItemPattern` (name pattern), `sliderItemsVisible` (count), `sliderPeekNextItem` (boolean), `sliderPeekAmount` (px).

**Logic**: Keeps container horizontal (skips vertical conversion), calculates item width = (frameWidth - padding - gaps - peek) / itemsVisible, resizes matching children with FIXED sizing.

## Key Types (types.ts)

| Type | Purpose |
|------|---------|
| `PluginConfig` | All conversion settings (width, padding, font mode, slider, export patterns, breakpoints) |
| `QAConfig` | QA check settings (scales, palette, typography styles, check toggles, skip layers) |
| `GifExportConfig` | GIF settings (fps, delays, transitions, overlay, padding) |
| `QAIssue` | Individual QA issue (category, severity, fixable, contrast details, typography match info) |
| `QAScanResult` | Full scan result (issues, groups, counts, duration) |
| `DesignTokens` | Extracted tokens (colors, typography, spacing, borderRadius) |
| `TransformResult` / `TransformStats` | Conversion results and processing statistics |
| `TextStyleInfo` | Extracted text styling (font, size, weight, color, alignment) |
| `GifSelectionInfo` / `GifFrameData` | GIF frame information and exported image data |

## Default Values

```typescript
// Conversion defaults
mobileWidth: 375
containerPadding: 20
fontMode: 'keep'
textScale: 0.85
maxSpacing: 40
preservedComponentNames: ['button', 'btn', 'icon']
uiControlPatterns: ['button', 'btn', 'cta', 'input', 'field', 'search', 'tab', 'icon']

// QA defaults
fontSizeScale: [12, 14, 16, 18, 20, 24, 32, 40, 48, 64]
lineHeightScale: ['auto', 100, 120, 140, 150, 160, 180, 200]
spacingScale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
scanScope: 'selection'
skipLayerNames: ['vector']
borderRadiusIgnoreNames: ['button', 'atom/buttons']
```

## TinyPNG Proxy Server

- **Location**: `tinypng-proxy/`
- **Stack**: Express.js + cors + tinify
- **Port**: 3001
- **Endpoints**:
  - `POST /compress` - Compress image via TinyPNG API
  - `GET /usage` - Get API usage statistics

## Sibling Projects in Monorepo

| Project | Purpose | Tech |
|---------|---------|------|
| `generate-global-style-figma-plugin/` | Design token visualization Figma plugin | JS, esbuild, SASS |
| `review-design/` | Design QA checker Figma plugin | JS, esbuild |
| `check-name/` | Accessibility name scanner | Puppeteer → Excel |
| `screenshot/` | Web page screenshot capture | Puppeteer |
| `LHCI/` | Lighthouse CI performance audits | Lighthouse → Excel |
| `compare-docx-width-design/` | DOCX vs Figma JSON comparison | Node.js |
| `compare-file-css-output/` | CSS migration comparison | Node.js |
| `sync-code-MG/` | Code sync between M&G projects | Node.js, fs-extra |
| `guideline/` | SCSS/BEM/JS review guidelines | Markdown docs |
