# Design QA Checker — Professional Design Review Plugin

> **Comprehensive Figma plugin for automated design quality assurance, accessibility validation, and design token extraction**

[![Figma Plugin](https://img.shields.io/badge/Figma-Plugin-FF7262?logo=figma&logoColor=white)](https://www.figma.com)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Design QA Checker** is a professional-grade Figma plugin developed for **Gravity Global** design teams. It automates design quality reviews, enforces design system standards, validates accessibility compliance (WCAG AA), and extracts design tokens for engineering handoff.

---

## Table of Contents

- [Key Features](#key-features)
- [Core Capabilities](#core-capabilities)
  - [1. Design Quality Scan](#1-design-quality-scan)
  - [2. Design Token Extraction](#2-design-token-extraction)
  - [3. Settings & Configuration](#3-settings--configuration)
  - [4. User Interface Features](#4-user-interface-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Feature Documentation](#feature-documentation)
- [Auto-Fix Capabilities](#auto-fix-capabilities)
- [Advanced Features](#advanced-features)
- [Technical Details](#technical-details)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Key Features

✅ **Automated Design QA** — Scans entire pages or selected elements for design issues
✅ **Accessibility Compliance** — WCAG AA contrast checking with intelligent background detection
✅ **Design System Enforcement** — Validates spacing, typography, colors against custom scales
✅ **Design Token Extraction** — Exports colors, gradients, typography, spacing tokens
✅ **Smart Auto-Fix** — One-click fixes for common issues (spacing, typography, colors)
✅ **Component Intelligence** — Detects reusable patterns and suggests componentization
✅ **Scan History** — Stores last 10 scans with auto-restore on plugin startup
✅ **Export Reports** — HTML/JSON export for documentation and engineering handoff
✅ **Settings Management** — Save, load, import/export settings configurations

---

## Core Capabilities

### 1. Design Quality Scan

Run comprehensive design quality checks across your Figma files. The plugin validates **8 major categories** of design issues:

#### A. Naming Convention Validation

Enforces consistent naming standards across your design:

- **Frames/Components**: Detects default Figma naming patterns (containing "Frame" or "Group")
- **Text Layers**: Validates against semantic patterns:
  - Approved patterns: `Title`, `Desc`, `Label`, `Caption`, `Heading`, `Body`, `Link`, `Button-text`, `Content`
  - Allows actual text content as names (3+ words)
  - Allows short button/link text (1-3 words, up to 50 characters)

**Example Issues:**
```
❌ Frame 123          → Should be renamed to semantic name like "Hero Section"
⚠️ Text 1             → Should use pattern like "Heading 1" or actual content
✅ Hero Title         → Correct semantic naming
✅ Get Started        → Allowed button text
```

#### B. Structure & Layout Issues

Ensures proper layer structure and layout best practices:

##### **Groups vs Frames**
- **Error**: Using `GROUP` instead of `FRAME` + Auto Layout
- **Exception**: Icon-only groups (containing only vectors/shapes) are allowed
- **Threshold**: Only flags groups with 2+ children

##### **Nested Groups**
- Detects problematic nested group structures
- Ignores valid patterns (button groups, icon-only patterns)

##### **Auto Layout Requirements**
Intelligent heuristics detect when frames should use Auto Layout:

- **Text + Icon alignment patterns**: Detects buttons, chips, badges
- **Multiple text elements**: With consistent vertical spacing
- **3+ aligned elements**: Horizontal or vertical alignment with even spacing
- **Card patterns**: Elements with consistent padding relationships
- **Overlap detection**: Flags overlapping vs aligned elements

##### **Empty/Redundant Frames**
- Detects frames with no visual content
- Flags single-child wrappers (redundant frames)

##### **Duplicate Detection**
- Hash-based comparison of frame structures
- Groups similar/identical frames for componentization

**Example Issues:**
```
❌ GROUP with 3 buttons          → Convert to FRAME with Auto Layout
⚠️ Nested GROUP inside GROUP     → Flatten structure
❌ FRAME with no Auto Layout      → Enable Auto Layout (detected pattern: 3 aligned items)
⚠️ Empty FRAME                    → Remove or add content
⚠️ FRAME with single child        → Remove redundant wrapper
```

#### C. Spacing System Validation

Validates spacing consistency against your design system:

##### **Gap Validation** (`itemSpacing`)
- Checks Auto Layout gap values against custom spacing scale
- **Error** if gap not in scale (e.g., 13px when scale is 0, 4, 8, 12, 16...)

##### **Padding Validation**
- Validates `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`
- **Error** if padding not in scale

##### **Threshold Support**
- Values **greater than threshold** automatically pass (special case)
- Example: If threshold = 100px, a 150px padding passes validation
- Useful for hero sections, large banners, etc.

##### **Default Spacing Scale**
```
0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96
```

**Example Issues:**
```
❌ Gap: 13px                      → Not in scale (expected: 12 or 16)
❌ Padding Left: 18px             → Not in scale (expected: 16 or 24)
✅ Gap: 16px                      → Correct (in scale)
✅ Padding: 150px                 → Pass (exceeds threshold)
```

#### D. Typography Validation

Comprehensive typography checks against your design system:

##### **Font Size Validation**
- Default scale: `32, 24, 20, 18, 16, 14, 12` (px)
- Custom scales supported
- Threshold support (values > threshold pass)

##### **Line Height Validation**
- Validates against percent-based scale
- Supports `"auto"` value
- **Baseline threshold**: Error if line height < 120% (configurable)
- Automatic pixel-to-percent conversion
- Default scale: `auto, 100, 120, 140, 150, 160, 180, 200` (%)

##### **Text Style Enforcement**
- Warns if text doesn't use Figma Text Styles
- Encourages design system adoption

##### **Typography Style Matching** (Advanced)
- Compares text properties against defined typography system
- Configurable properties: Font Family, Size, Weight, Line Height, Letter Spacing, Word Spacing
- **Scoring system**: Shows match percentage + detailed differences
- **Smart normalization**:
  - Font family substring matching
  - Font weight style name matching (e.g., "Bold" → 700)
  - Line height pixel-to-percent conversion
  - Letter spacing normalization (handles 0px/0%/0 equivalence)

##### **Mobile ADA Compliance**
- Applies to text inside "mobile" frames (width ≤ 768px)
- **Error** if font size ≤ 12px (accessibility requirement)

**Example Issues:**
```
❌ Font size: 15px                → Not in scale (expected: 14 or 16)
❌ Line height: 110%              → Below baseline (expected: ≥ 120%)
⚠️ Text missing Text Style        → Should use "Body / Regular" style
❌ Mobile text: 10px              → Too small for mobile (ADA requirement: > 12px)
✅ Font size: 18px                → Correct (in scale)
```

#### E. Color Validation

Validates color usage against design system:

##### **Color Checks**
- **Fills**: Background and text colors
- **Strokes**: Border colors
- **Effects**: Shadow colors (drop shadow, inner shadow)

##### **Color Categorization**
- `text`: TEXT node fills
- `background`: FRAME/COMPONENT/INSTANCE fills
- `border`: Stroke colors
- `shadow`: Effect colors
- `fill`: Generic fills

##### **Color Normalization**
- Converts all colors to uppercase hex (#RRGGBB)
- Handles rgba format for semi-transparent colors
- Case-insensitive comparison

##### **Color Sources**
- Manual hex input (comma-separated)
- Extract from **Color Styles** (Paint Styles)
- Extract from **Color Variables** (with mode resolution)

**Example Issues:**
```
❌ Fill: #1A2B3C                  → Not in color scale
❌ Stroke: #FF5733                → Not in color scale
✅ Fill: #000000                  → Correct (in scale)
```

#### F. Accessibility Validation (WCAG AA)

**Industry-leading contrast checking** with intelligent background detection:

##### **WCAG AA Standards**
- **Normal text**: Contrast ratio ≥ 4.5:1
- **Large text** (≥18px or ≥14px bold): Contrast ratio ≥ 3.0:1

##### **Advanced Background Detection**

The plugin uses a **multi-layer blending algorithm** to accurately determine text backgrounds:

1. **Semi-transparent backgrounds**: Blends alpha values with layers behind
2. **Gradient backgrounds**: Calculates weighted average color from gradient stops
3. **Sibling detection**: Finds background layers behind text (z-index aware, requires ≥50% overlap)
4. **Parent hierarchy traversal**: Searches up the DOM tree for backgrounds
5. **Canvas fallback**: Defaults to white (#FFFFFF) if no background found

##### **Issue Grouping**
- Groups similar contrast issues by ratio + color combination
- Shows usage count for repeated patterns

**Example Issues:**
```
❌ Contrast ratio: 2.8 (Text: #AAAAAA on #FFFFFF)  → Fails WCAG AA (needs ≥ 4.5)
⚠️ Contrast ratio: 3.2 (Large text: #777777 on #FFFFFF) → Fails large text (needs ≥ 3.0)
✅ Contrast ratio: 7.2 (Text: #000000 on #FFFFFF)  → Pass WCAG AA
```

#### G. Component Reusability

Identifies componentization opportunities:

- **Pattern detection**: Card, Button, Header-item, CTA, Input, Select, etc.
- **Usage threshold**: Warns when frame pattern appears ≥2 times
- **Component cache**: 5-minute cache, page-aware for performance

**Example Issues:**
```
⚠️ Frame "Product Card" used 8 times  → Should be componentized
⚠️ Button pattern detected 12 times   → Create reusable component
```

#### H. Position Issues

Detects layout problems:

- **Negative positions**: x < 0 or y < 0
- **Offscreen elements**: Elements outside visible canvas

**Example Issues:**
```
⚠️ Element at x: -10px            → Negative position (off-canvas)
⚠️ Element at y: -50px            → Negative position
```

---

### 2. Design Token Extraction

Extract comprehensive design tokens for engineering handoff and design system documentation.

#### A. Color Tokens

##### **Solid Colors**
- All solid colors in hex/rgba format
- Categorized by usage type:
  - `text` (TEXT node fills)
  - `background` (FRAME/COMPONENT/INSTANCE fills)
  - `border` (strokes)
  - `shadow` (DROP_SHADOW/INNER_SHADOW effects)
  - `fill` (generic fills)

##### **Color Sources**
- **Extract from design**: Scans all visible layers
- **Extract Color Styles**: Pulls all local Paint Styles
- **Extract Color Variables**: Pulls all local Color Variables (with mode resolution)

**Example Output:**
```json
{
  "colors": {
    "text": [
      { "value": "#000000", "count": 45 },
      { "value": "#333333", "count": 23 }
    ],
    "background": [
      { "value": "#FFFFFF", "count": 120 },
      { "value": "#F5F5F5", "count": 35 }
    ]
  }
}
```

#### B. Gradient Tokens

Extracts all gradient types with full stop information:

- **Linear gradients**
- **Radial gradients**
- **Angular gradients**
- **Diamond gradients**

**Example Output:**
```json
{
  "gradients": [
    {
      "type": "GRADIENT_LINEAR",
      "stops": [
        { "position": 0, "color": "#FF0000" },
        { "position": 1, "color": "#0000FF" }
      ],
      "count": 3
    }
  ]
}
```

#### C. Typography Tokens

##### **Font Family**
- All font families with style variants
- Includes font style (Regular, Bold, Italic, etc.)

##### **Font Weight**
- All font weights (100, 200, ..., 900)
- **Per-weight breakdown**: Shows font families using each weight with usage counts

##### **Font Size**
- All font sizes (descending order)
- Usage count for each size

##### **Line Height**
- All line heights (percent-based)
- Includes `"auto"` if used
- Usage count for each value

**Example Output:**
```json
{
  "typography": {
    "fontFamily": [
      { "value": "Inter", "style": "Regular", "count": 150 },
      { "value": "Inter", "style": "Bold", "count": 45 }
    ],
    "fontWeight": [
      {
        "weight": 400,
        "fonts": [
          { "family": "Inter Regular", "count": 150 }
        ]
      }
    ],
    "fontSize": [
      { "value": 32, "count": 12 },
      { "value": 24, "count": 34 }
    ],
    "lineHeight": [
      { "value": "auto", "count": 50 },
      { "value": "140%", "count": 80 }
    ]
  }
}
```

#### D. Spacing & Layout Tokens

##### **Spacing**
- `itemSpacing` (Auto Layout gap)
- All padding values (`paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`)
- Includes metadata about spacing type

##### **Border Radius**
- `cornerRadius` (uniform radius)
- `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius` (mixed radius)

**Example Output:**
```json
{
  "spacing": [
    { "value": 16, "type": "itemSpacing", "count": 85 },
    { "value": 24, "type": "paddingLeft", "count": 42 }
  ],
  "borderRadius": [
    { "value": 8, "count": 120 },
    { "value": 16, "count": 35 }
  ]
}
```

---

### 3. Settings & Configuration

Comprehensive settings management for design system customization:

#### A. Customizable Scales

##### **Spacing Scale**
- Input format: Comma-separated pixel values
- Default: `0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96`
- **Threshold**: Values > threshold automatically pass
- **Auto-fill**: Use extracted spacing tokens

##### **Font Size Scale**
- Input format: Comma-separated pixel values
- Default: `32, 24, 20, 18, 16, 14, 12`
- **Threshold**: Values > threshold automatically pass
- **Auto-fill**: Use extracted font size tokens or typography table

##### **Line Height Scale**
- Input format: Comma-separated percent values + "auto"
- Default: `auto, 100, 120, 140, 150, 160, 180, 200`
- **Baseline threshold**: Minimum line height (default: 120%)
- **Threshold**: Values > threshold automatically pass
- **Auto-fill**: Use extracted line height tokens or typography table

##### **Color Scale**
- Input format: Comma-separated hex values (#RRGGBB)
- Example: `#000000, #FFFFFF, #FF0000`
- **Auto-fill options**:
  - Use extracted color tokens
  - Extract Color Styles (Paint Styles)
  - Extract Color Variables

##### **Color Preview Panel**
- Visual swatches showing name, hex, and UI preview
- Collapsible panel for space efficiency

#### B. Typography Settings Panel

**Editable typography system** with complete control:

##### **Typography Table Columns**
- **Style Name**: Semantic name (e.g., "Heading 1", "Body / Regular")
- **Font Family**: Font family name (e.g., "Inter", "Roboto")
- **Font Size**: Size in pixels
- **Font Weight**: Weight value or name (400, "Regular", "Bold", etc.)
- **Line Height**: Percent, pixel, or "auto"
- **Letter Spacing**: Spacing value
- **Word Spacing**: Spacing value

##### **Configurable Check Rules**
Enable/disable specific typography validations:

- ☑️ **Check Typography Style**: Match 100% with defined styles
- ☑️ **Check Font Family**: Validate font family
- ☑️ **Check Font Size**: Validate font size
- ☑️ **Check Font Weight**: Validate font weight
- ☑️ **Check Line Height**: Validate line height
- ☐ **Check Letter Spacing**: Validate letter spacing (optional)
- ☐ **Check Word Spacing**: Validate word spacing (optional)

##### **Extract Text Styles**
One-click extraction from Figma Text Styles:

- **🖥️ Desktop**: Extract desktop styles (e.g., H1, H2, Body)
- **📱 Tablet**: Extract tablet styles (e.g., H1/Tablet, Body/Tablet)
- **📱 Mobile**: Extract mobile styles (e.g., H1/Mobile, Body/Mobile)
- **🌐 All**: Extract all styles (Desktop + Tablet + Mobile)

##### **Manual Entry**
- **➕ Add Style**: Manually add typography style rows
- **🔄 Reset**: Reset table to default typography styles

#### C. Settings Persistence

Complete settings lifecycle management:

##### **💾 Save Settings**
- Name and save current configuration
- Store unlimited settings profiles
- Quick-switch between projects/clients

##### **📂 Load Settings**
- Browse saved settings
- One-click load previous configurations
- Shows timestamp and setting name

##### **📤 Export Settings**
- Download as JSON file
- Share settings across team members
- Version control settings in git

##### **📥 Import Settings**
- Upload JSON file
- Merge or replace mode
- Validates settings structure

##### **🔄 Reset All**
- Reset all settings to defaults
- Clear scan history
- Fresh start option

##### **Auto-Fill Buttons**
Intelligent auto-population of scale inputs:

- **Use Tokens**: Fill from extracted design tokens
- **Use Typography**: Fill from typography table
- **Extract Styles**: Fill from Figma Color Styles
- **Extract Variables**: Fill from Figma Color Variables

---

### 4. User Interface Features

Professional UI with productivity-focused features:

#### A. Scan Controls

##### **Scan Scope**
- **Scan Page**: Scan entire current page
- **Scan Selection**: Scan only selected elements

##### **Scan Management**
- **🔍 Run Scan Design**: Start design quality scan
- **🎨 Extract Design Tokens**: Start token extraction
- **⛔ Cancel Scan**: Abort running operation

##### **Progress Tracking**
- Real-time progress bar (0-100%)
- Shows current/total nodes
- Non-blocking UI (yields every 2%)

##### **Validation Alerts**
- Yellow alert box for validation errors
- Closeable warnings
- Contextual error messages

#### B. Report Tabs

##### **📋 Issues Tab**
- Shows all detected issues
- Count badge (e.g., "Issues 42")
- Default active tab after scan

##### **🎨 Design Tokens Tab**
- Shows all extracted tokens
- Count badge (e.g., "Design Tokens 256")
- Default active tab after extraction

#### C. Filtering & Search

##### **Severity Filters**
- **All**: Show all issues (default)
- **❌ Errors**: Critical issues requiring immediate fix
- **⚠️ Warnings**: Issues that should be fixed

##### **Search Box**
- Real-time search across all fields
- Search by:
  - Issue message
  - Node name
  - Issue type
  - Value (e.g., "16px", "#FF0000")
- Clear button (✕) to reset search

##### **Color Type Filter** (Tokens tab only)
- Filter color tokens by usage:
  - All Color Types
  - Text
  - Background
  - Border
  - Shadow
  - Fill

#### D. Issue Grouping & Expansion

##### **Collapsible Groups**
- Issues grouped by category
- Expand/collapse controls (▶/▼)
- Shows group count (e.g., "Typography (12)")

##### **Issue Count Badges**
- Shows number of issues per group
- Shows usage count for repeated patterns
- Visual severity indicators (❌/⚠️)

#### E. Issue Actions

Each issue has contextual action buttons:

##### **🎯 Select Node**
- Click to select and focus node in Figma
- Zooms viewport to node
- Highlights selected node

##### **🔧 Fix Issue** (when available)
Auto-fix available for these issue types:

- **Typography**: Apply best-match typography style
- **Color**: Change to nearest color in scale
- **Spacing**: Adjust padding/gap to nearest scale value
- **Font Size**: Adjust to nearest font size
- **Contrast**: Open color picker with WCAG-compliant suggestions
- **Auto Layout**: Enable auto-layout with automatic direction
- **Groups**: Convert group to frame with auto-layout
- **Position**: Reset negative positions to 0
- **Empty Frames**: Remove empty frames
- **Component**: Create component or apply existing

##### **🔧 Fix All** (when available)
- Batch fix all issues of same type
- Shows confirmation dialog
- Progress indicator for bulk operations

##### **🔗 Create Component**
- Convert frame to component
- Automatically names component
- Adds to component library

##### **🔄 Apply Component**
- Replace with existing component
- Shows component picker
- Maintains position and size

##### **✏️ Rename Node**
- Inline rename functionality
- Validates against naming conventions
- Auto-suggests semantic names

##### **🗑️ Remove Layer**
- Delete problematic layers
- Confirmation for destructive actions
- Safe for empty/redundant frames

#### F. Export Features

##### **📄 Export HTML**
- Standalone HTML report
- Collapsible issue groups (default: collapsed)
- Filter controls (All/Errors/Warnings)
- Styled with embedded CSS
- Shareable with stakeholders

##### **📋 Export JSON**
- Raw JSON data structure
- Includes issues + tokens
- Engineering handoff format
- Version control friendly

##### **📑 Export PDF** (planned)
- Print-ready format
- Opens browser print dialog
- Professional formatting

#### G. History Panel

##### **📚 Scan History**
- Stores last 10 scans
- Shows scan context:
  - File name
  - Page name (or "Selection")
  - Timestamp
  - Scan type (Issues/Tokens)

##### **History Actions**
- **Click to restore**: Load previous scan results
- **Auto-restore**: Loads most recent scan on plugin startup
- **Clear all**: Delete entire history

##### **Persistence**
- Uses `figma.clientStorage`
- Survives plugin reload/unload
- Per-file storage

---

## Installation

### From Figma Community (Recommended)

1. Open Figma
2. Go to **Plugins** → **Browse plugins in Community**
3. Search for **"Design QA Checker"**
4. Click **"Install"**

### Manual Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/your-org/design-qa-checker.git
   cd design-qa-checker
   ```

2. In Figma:
   - Go to **Plugins** → **Development** → **Import plugin from manifest**
   - Select the `manifest.json` file from the cloned repository

3. The plugin is now available in **Plugins** → **Development** → **Design QA Checker**

---

## Quick Start

### Running Your First Scan

1. **Open your Figma file**

2. **Launch the plugin**:
   - Go to **Plugins** → **Design QA Checker**

3. **Choose scan scope**:
   - **Scan Page**: Entire current page
   - **Scan Selection**: Only selected elements

4. **Configure settings** (optional):
   - Expand **Panel Setting**
   - Adjust spacing/typography scales
   - Set thresholds

5. **Run the scan**:
   - Click **🔍 Run Scan Design**
   - Watch progress bar
   - Review results in **Issues** tab

6. **Fix issues**:
   - Click **🔧 Fix Issue** for auto-fix
   - Click **🎯 Select** to navigate to node
   - Filter by severity (Errors/Warnings)

### Extracting Design Tokens

1. **Launch the plugin**

2. **Click 🎨 Extract Design Tokens**

3. **Review tokens** in **Design Tokens** tab:
   - Colors (by usage type)
   - Gradients
   - Typography (font family, size, weight, line height)
   - Spacing (gap, padding)
   - Border radius

4. **Export tokens**:
   - Click **📄 Export Report** → **📋 Export JSON**
   - Use for engineering handoff or documentation

### Using Auto-Fill

Save time by auto-populating scales:

1. **Extract tokens first**: Click **🎨 Extract Design Tokens**

2. **Open Panel Setting**

3. **Click "Use Tokens" buttons**:
   - **Spacing**: Auto-fills spacing scale
   - **Font Size**: Auto-fills font size scale
   - **Line Height**: Auto-fills line height scale
   - **Color**: Auto-fills color scale

4. **Run scan** with populated scales

---

## Feature Documentation

### Typography System

The typography system provides **enterprise-grade typography validation**:

#### Configuration

1. **Open Panel Setting**
2. **Expand "✍️ Typography Settings"**
3. **Choose extraction method**:
   - **🖥️ Desktop**: Extract desktop-only styles
   - **📱 Tablet**: Extract tablet-specific styles
   - **📱 Mobile**: Extract mobile-specific styles
   - **🌐 All**: Extract all responsive styles

4. **Review typography table**:
   - Each row = one typography style
   - Edit values inline
   - Add custom styles with **➕ Add Style**

5. **Configure check rules**:
   - Enable checks: Typography Style, Font Family, Size, Weight, Line Height
   - Optional checks: Letter Spacing, Word Spacing

#### How It Works

The plugin uses a **scoring algorithm** to match text against defined styles:

1. **Exact match**: All enabled properties match → ✅ Pass
2. **Partial match**: Some properties match → Shows best match + differences
3. **No match**: No similar styles found → ❌ Error

**Example:**
```
Text properties:
  Font: Inter
  Size: 18px
  Weight: 600
  Line Height: 140%

Defined style "Heading 3":
  Font: Inter
  Size: 18px
  Weight: 700    ← Different
  Line Height: 140%

Result: ⚠️ Match 75% (weight differs: 600 vs 700)
Suggestion: Use "Heading 3" style or adjust weight to 700
```

### Color System

#### Extracting Color Styles

1. **Open Panel Setting**
2. **Scroll to "Color" section**
3. **Click one of**:
   - **📥 Extract Styles**: Pulls all Paint Styles
   - **📊 Extract Variables**: Pulls all Color Variables

4. **Preview colors**:
   - Expand **"List name color/hex/UI"** panel
   - Visual swatches with hex codes

5. **Use in validation**:
   - Automatically fills color scale input
   - Run scan to validate colors

#### Color Variables Mode Resolution

When extracting Color Variables with multiple modes:

- Plugin detects all modes (e.g., "Light", "Dark")
- Extracts values for current mode
- Falls back to first mode if current mode unavailable

### Contrast Checking

The plugin implements **advanced contrast checking** with multi-layer background detection:

#### Algorithm

1. **Text layer detected**

2. **Find background**:
   - Check parent frame fills
   - Check sibling layers (z-index aware, ≥50% overlap)
   - Traverse up hierarchy if no background found
   - Default to white canvas (#FFFFFF)

3. **Handle complex backgrounds**:
   - **Semi-transparent**: Blend with layers behind
   - **Gradients**: Calculate weighted average color
   - **Multiple layers**: Composite from bottom to top

4. **Calculate contrast ratio**:
   - Uses WCAG 2.1 formula
   - Returns ratio (e.g., 4.52:1)

5. **Compare to thresholds**:
   - Normal text: ≥ 4.5:1
   - Large text (≥18px or ≥14px bold): ≥ 3.0:1

#### Example

```
Text: #777777
Background: rgba(255, 255, 255, 0.5) over #000000

Steps:
1. Blend semi-transparent white with black: #808080
2. Calculate contrast: 2.83:1
3. Compare to threshold: 2.83 < 4.5 → ❌ Fail
```

---

## Auto-Fix Capabilities

The plugin can **automatically fix** many common issues:

### Typography Auto-Fix

**Fixes:** Font family, size, weight, line height, letter spacing

**How it works:**
1. Click **🔧 Fix Issue** on typography error
2. Plugin finds best-match typography style (highest score)
3. Applies all properties from matched style
4. Updates text layer

**Instance-aware:** If text is inside component instance, switches to main component for editing

### Color Auto-Fix

**Fixes:** Off-scale colors

**How it works:**
1. Click **🔧 Fix Issue** on color error
2. Plugin finds nearest color in scale (color distance algorithm)
3. Replaces current color with nearest match
4. Updates fill/stroke/effect

### Spacing Auto-Fix

**Fixes:** Gap and padding values

**How it works:**
1. Click **🔧 Fix Issue** on spacing error
2. Plugin finds nearest value in spacing scale
3. Rounds to nearest valid value
4. Updates `itemSpacing` or padding

**Example:**
```
Current: gap = 13px
Scale: 0, 4, 8, 12, 16, 24, 32
Nearest: 12px
Action: Set gap to 12px
```

### Contrast Auto-Fix

**Fixes:** Color contrast issues

**How it works:**
1. Click **🔧 Fix Issue** on contrast error
2. Opens **color picker modal**
3. Shows WCAG-compliant color suggestions
4. Select suggested color or pick custom color
5. Validates new contrast ratio
6. Applies color if compliant

### Auto Layout Auto-Fix

**Fixes:** Missing auto-layout

**How it works:**
1. Click **🔧 Fix Issue** on auto-layout error
2. Plugin detects layout direction:
   - Horizontal: Elements aligned in row
   - Vertical: Elements aligned in column
3. Enables auto-layout with detected direction
4. Preserves existing spacing (converts to gap)

### Group to Frame Conversion

**Fixes:** Groups (should be frames)

**How it works:**
1. Click **🔧 Fix Issue** on group error
2. Plugin detects layout direction
3. Replaces group with frame
4. Enables auto-layout
5. Preserves all children and properties

### Position Auto-Fix

**Fixes:** Negative positions

**How it works:**
1. Click **🔧 Fix Issue** on position error
2. Resets `x` or `y` to 0
3. Moves element into visible canvas

### Component Auto-Fix

**Fixes:** Non-componentized repeated patterns

**How it works:**

#### **Create Component**
1. Click **🔗 Create Component**
2. Plugin generates semantic name
3. Converts frame to component
4. Adds to component library

#### **Apply Component**
1. Click **🔄 Apply Component**
2. Shows component picker (lists all components)
3. Select target component
4. Replaces frame with component instance
5. Maintains position and size

---

## Advanced Features

### Instance-Aware Editing

The plugin intelligently handles **component instances**:

#### Detection

- Detects when node is inside component instance
- Identifies read-only properties

#### Editing Strategy

1. **Switch to main component**:
   - `instance.mainComponent` lookup
   - Navigate to main component

2. **Find corresponding node**:
   - By index (child position)
   - By name match

3. **Apply fix to main component**:
   - Changes propagate to all instances
   - Respects instance overrides

4. **Provide feedback**:
   - Shows which component was edited
   - Warns about instance limitations

### Component Caching

Optimize performance with intelligent caching:

#### Cache Strategy

- **Cache duration**: 5 minutes
- **Cache key**: Page name
- **Cache invalidation**: Page change, force refresh

#### Collection Strategy

- Scans current page (always)
- Scans up to 10 additional pages (to find components)
- Limits depth to 100 levels (prevents infinite recursion)
- Skips inaccessible nodes

#### Usage

```javascript
const components = collectAllComponents(); // Uses cache if valid
const components = collectAllComponents(true); // Force refresh
```

### Scan Progress & Cancellation

#### Progress Tracking

- **Progress bar**: Visual 0-100% indicator
- **Progress text**: "Scanning... 42%"
- **Node count**: "Processing 234/500 nodes"

#### Async Scanning

- **Yields control**: Every 2% progress (prevents UI freeze)
- **Batch processing**: Processes nodes in chunks
- **Responsive UI**: User can interact during scan

#### Cancellation

1. Click **⛔ Cancel Scan** during operation
2. Sets `cancelRequested = true` flag
3. Scan loop checks flag and aborts
4. Cleans up partial results
5. Shows "Scan cancelled" message

### Issue Grouping Algorithm

Reduces duplicate issues with intelligent grouping:

#### Grouping Keys

- **Issue type** (e.g., "typography", "spacing")
- **Severity** (error/warn)
- **Message** (normalized, removes node-specific details)
- **Node name** (optional, for context)

#### Contrast Issue Grouping

Special grouping for contrast issues:

- Groups by **ratio** (e.g., "2.8:1")
- Groups by **color pair** (text color + background color)
- Shows usage count

**Example:**
```
❌ Contrast ratio 2.8 (Text: #777777 on #FFFFFF) — 12 occurrences
  - "Hero Title" (src/Hero.tsx:42)
  - "Button Text" (src/Button.tsx:18)
  - ... 10 more
```

### Settings Storage Architecture

#### Storage Mechanism

Uses `figma.clientStorage` for persistence:

- **Async API**: All operations return Promises
- **File-scoped**: Settings stored per Figma file
- **Survives reload**: Persists across plugin sessions

#### Storage Schema

```javascript
{
  // Current scan results
  "lastScanReport": {
    "type": "issues" | "tokens",
    "timestamp": 1672531200000,
    "data": { /* issues or tokens */ },
    "context": "Hero Section"
  },

  // Scan history (last 10)
  "scanHistory": [
    {
      "type": "issues",
      "timestamp": 1672531200000,
      "data": { /* issues */ },
      "context": "Full page"
    },
    // ... up to 10 entries
  ],

  // Saved settings
  "savedSettings": {
    "Production Settings": {
      "timestamp": 1672531200000,
      "spacingScale": "0, 4, 8, 12, 16, 24, 32, 40, 48, 64",
      "fontSizeScale": "32, 24, 20, 18, 16, 14, 12",
      "lineHeightScale": "auto, 100, 120, 140, 150, 160, 180, 200",
      "colorScale": "#000000, #FFFFFF, #FF0000",
      "typographyTable": [ /* rows */ ],
      "typographyRules": { /* enabled checks */ }
    }
  },

  // Current input values
  "spacingScale": "0, 4, 8, 12, 16, 24, 32, 40, 48, 64",
  "fontSizeScale": "32, 24, 20, 18, 16, 14, 12",
  "lineHeightScale": "auto, 100, 120, 140, 150, 160, 180, 200",
  "colorScale": "#000000, #FFFFFF, #FF0000",
  "typographyTable": [ /* rows */ ],
  "typographyRules": { /* enabled checks */ }
}
```

---

## Technical Details

### File Structure

```
review-design/
├── code.js                   # Main plugin logic (6,122 lines)
│   ├── Scan algorithms
│   ├── Token extraction
│   ├── Auto-fix functions
│   ├── Storage management
│   └── Component caching
├── ui.html                   # UI interface (1,123 lines)
│   ├── Report rendering
│   ├── Filter controls
│   ├── Settings panels
│   ├── Export functionality
│   └── History management
├── ui.js                     # UI logic (embedded in ui.html)
├── styles.css                # Styling
├── manifest.json             # Plugin configuration
└── Readme.md                 # This file
```

### Plugin Configuration

**manifest.json:**
```json
{
  "name": "Design QA Checker",
  "id": "design-qa-checker",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma", "dev"],
  "capabilities": ["inspect"]
}
```

### Performance Optimizations

1. **Component caching**: 5-minute cache reduces repeated traversals
2. **Async scanning**: Yields control every 2% to prevent UI freeze
3. **Page limiting**: Scans max 10 pages to avoid freezing
4. **Depth limiting**: Max 100 levels to prevent infinite recursion
5. **Skip hidden nodes**: Ignores `visible: false` nodes
6. **Batch processing**: Processes nodes in chunks

### Browser Compatibility

- **Figma Plugin API**: 1.0.0+
- **JavaScript**: ES6+
- **CSS**: Modern browsers (Flexbox, Grid)

---

## Use Cases

### 1. Design Review Before Handoff

**Scenario:** Designer completes feature, needs QA before engineering handoff

**Workflow:**
1. Run **🔍 Run Scan Design** on final designs
2. Filter by **❌ Errors** (critical issues)
3. Fix all errors using **🔧 Fix Issue**
4. Export **📄 HTML Report** for review meeting
5. Extract **🎨 Design Tokens** for engineering
6. Export **📋 JSON** for design system documentation

**Benefits:**
- Catches issues before handoff
- Reduces engineering questions
- Professional, consistent deliverables

### 2. Design System Audit

**Scenario:** Audit existing designs for design system compliance

**Workflow:**
1. Load **📂 Load Settings** (design system scales)
2. Run **Scan Page** on key screens
3. Review **Typography** issues (off-scale fonts)
4. Review **Spacing** issues (inconsistent padding/gap)
5. Review **Color** issues (off-brand colors)
6. Use **🔧 Fix All** to batch-update
7. Export **📋 JSON** for design system team

**Benefits:**
- Identifies design debt
- Measures design system adoption
- Provides data-driven migration plan

### 3. Accessibility Compliance

**Scenario:** Ensure WCAG AA compliance for public-facing website

**Workflow:**
1. Run **🔍 Run Scan Design**
2. Filter by **"Contrast"** issues
3. Review all **❌ Contrast ratio** errors
4. Use **🔧 Fix Issue** to open color picker
5. Apply WCAG-compliant color suggestions
6. Re-scan to verify fixes
7. Export **📄 HTML Report** for accessibility audit

**Benefits:**
- Catch accessibility issues early
- Avoid costly post-launch fixes
- Meet legal compliance requirements

### 4. Token Extraction for Engineering

**Scenario:** Extract design tokens for CSS/SCSS generation

**Workflow:**
1. Click **🎨 Extract Design Tokens**
2. Review tokens in **Design Tokens** tab
3. Filter **Colors** by type (text/background/border)
4. Export **📋 JSON**
5. Use JSON in build pipeline (Style Dictionary, Theo, etc.)

**Example JSON Output:**
```json
{
  "tokens": {
    "colors": {
      "text": [
        { "value": "#000000", "count": 45, "name": "text-primary" },
        { "value": "#666666", "count": 23, "name": "text-secondary" }
      ]
    },
    "typography": {
      "fontSize": [
        { "value": 32, "count": 12, "name": "font-size-xxl" },
        { "value": 24, "count": 34, "name": "font-size-xl" }
      ]
    }
  }
}
```

**Benefits:**
- Single source of truth (Figma → Code)
- Automated token generation
- Reduces manual token updates

### 5. Quality Guardrails for Design Team

**Scenario:** Enforce quality standards across design team

**Workflow:**
1. Define **company design standards**:
   - Spacing scale: 8px grid
   - Typography scale: Modular scale (1.25)
   - Color palette: Brand colors only
2. **Save Settings** as "Company Standards"
3. Share settings JSON with team (git or Slack)
4. All designers **Import Settings** at project start
5. Run **Run Scan** before committing to design library
6. Review **Issues** tab for violations

**Benefits:**
- Consistent quality across team
- Self-service QA for designers
- Reduces design review time

### 6. Component Library Maintenance

**Scenario:** Identify componentization opportunities in design library

**Workflow:**
1. Run **Scan Page** on component library file
2. Filter by **"Component reuse"** issues
3. Review repeated patterns (cards, buttons, inputs)
4. Click **🔗 Create Component** to componentize
5. Or click **🔄 Apply Component** to use existing component
6. Re-scan to verify componentization

**Benefits:**
- Discovers reusable patterns
- Reduces component duplication
- Improves design system coverage

---

## Troubleshooting

### Common Issues

#### "No selection" error when using Scan Selection

**Solution:**
1. Select at least one layer in Figma
2. Switch to **Scan Page** if you want to scan everything

#### Auto-fix doesn't work for instance properties

**Reason:** Component instances have read-only properties

**Solution:**
- Plugin automatically switches to main component
- Changes propagate to all instances
- Check main component for updates

#### Extracted colors don't match visual appearance

**Reason:** Semi-transparent colors blend with backgrounds

**Solution:**
- Plugin extracts actual color values (rgba)
- Visual appearance depends on background
- Use Color Preview panel to see actual hex values

#### Progress bar stuck at 99%

**Reason:** Processing very large file or complex components

**Solution:**
- Wait for completion (may take 10-20 seconds)
- Click **⛔ Cancel Scan** if frozen
- Try **Scan Selection** on smaller portions

#### Settings not persisting across sessions

**Reason:** Figma storage quota exceeded

**Solution:**
- Click **🔄 Reset All** to clear storage
- Delete old scan history
- Export important settings to JSON

#### Contrast check shows false positives

**Reason:** Complex background detection (gradients, overlapping layers)

**Possible causes:**
- Gradient background (plugin uses average color)
- Semi-transparent layers (plugin blends colors)
- Text over image (plugin can't analyze images)

**Solution:**
- Manually verify contrast ratio using external tools
- Simplify background (solid colors)
- Use Figma's built-in contrast checker as reference

---

## Contributing

We welcome contributions from the community!

### How to Contribute

1. **Fork the repository**
   ```bash
   git fork https://github.com/your-org/design-qa-checker.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Add features or fix bugs
   - Follow existing code style
   - Add comments for complex logic

4. **Test thoroughly**
   - Test in Figma (Desktop + Web)
   - Test on various file sizes
   - Test edge cases (empty frames, deeply nested layers, etc.)

5. **Submit a pull request**
   - Describe your changes
   - Reference related issues
   - Include screenshots for UI changes

### Development Setup

1. Clone repository
2. Edit `code.js` or `ui.html`
3. In Figma: **Plugins** → **Development** → **Import plugin from manifest**
4. Test changes: **Plugins** → **Development** → **Design QA Checker**
5. Check console logs: **Plugins** → **Development** → **Open Console**

### Reporting Issues

Found a bug? Please create an issue with:

- **Title**: Short description (e.g., "Contrast check fails for gradients")
- **Description**: Detailed steps to reproduce
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Figma version**: Help → About Figma

---

## Roadmap

### Planned Features

- [ ] **Export PDF**: Print-ready reports
- [ ] **Custom rules engine**: Define custom validation rules
- [ ] **Design system sync**: Auto-sync with design system files
- [ ] **Image optimization**: Detect oversized images
- [ ] **Component documentation**: Generate component docs
- [ ] **Version comparison**: Compare designs across versions
- [ ] **Team analytics**: Track design quality metrics
- [ ] **Figma Variables integration**: Full variables support
- [ ] **Dark mode**: Dark UI theme
- [ ] **Internationalization**: Multi-language support

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Credits

**Developed by:** Gravity Global Design Team
**Maintained by:** [Your Name]
**Contributors:** [Contributors list]

---

## Support

Need help? Have questions?

- **📧 Email**: support@gravityglobal.com
- **💬 Slack**: #design-qa-checker
- **🐛 Issues**: [GitHub Issues](https://github.com/your-org/design-qa-checker/issues)
- **📖 Docs**: [Full Documentation](https://docs.gravityglobal.com/design-qa-checker)

---

**Made with ❤️ by Gravity Global Design Team**

---

## Version History

### v1.0.0 (2025-01-15)
- Initial release
- Design quality scanning (8 categories)
- Design token extraction (colors, gradients, typography, spacing)
- Auto-fix capabilities (typography, spacing, colors, contrast)
- Settings management (save, load, import, export)
- Scan history (last 10 scans)
- Export reports (HTML, JSON)
- Typography system with configurable rules
- Color extraction (styles, variables)
- WCAG AA contrast checking
- Component intelligence
- Instance-aware editing
- Progress tracking & cancellation
- Comprehensive UI (filters, search, tabs)

---

*Last updated: 2025-01-15*
