# Design QA Checker - Figma Plugin

## Design QA Checker - Figma Plugin

### Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Overview](#overview)
4. [Scan Controls](#scan-controls)
5. [Sub-tabs](#sub-tabs)
   - [Issues Tab](#issues-tab)
   - [Design Tokens Tab](#design-tokens-tab)
   - [Animations Tab](#animations-tab)
   - [Settings Tab](#settings-tab)
6. [Issue Types](#issue-types)
7. [Fix Operations](#fix-operations)
8. [Export Features](#export-features)
9. [Settings Management](#settings-management)
10. [History & Restore](#history--restore)
11. [Detailed Workflows](#detailed-workflows)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

**Design QA Checker** is a Figma Plugin that helps design teams verify design consistency, extract design tokens, and ensure accessibility compliance.

**Key Features:**

- QA scan for typography, colors, spacing, structure, and accessibility issues
- Design tokens extraction (colors, typography, spacing, border radius)
- Interaction/animation scanning and documentation
- Auto-fix and suggest-fix for detected issues
- Export QA reports as HTML or JSON
- Settings management with presets and import/export
- Scan history with restore capability

---

## Installation

### Step 1: Import Plugin to Figma

1. Open Figma Desktop
2. Go to **Menu > Plugins > Development > Import plugin from manifest...**
3. Select the file `review-design/manifest.json`

### Step 2: Open Plugin

1. Select the frame or page to check on canvas
2. Go to **Menu > Plugins > Development > Design QA Checker**

> [Screenshot: Plugin menu showing Design QA Checker]

---

## Overview

The plugin provides a single-purpose QA interface with **4 sub-tabs** for organized content:

| Tab | Main Function |
|---|---|
| **Issues** | Display and manage detected design issues |
| **Design Tokens** | View extracted design tokens |
| **Animations** | List all interactions and animations |
| **Settings** | Configure check rules and design scales |

> [Screenshot: Plugin overview showing tabs and scan controls]

---

## Scan Controls

### Scan Scope

| Option | Description |
|---|---|
| **Scan Page** | Scan the entire current Figma page |
| **Scan Selection** | Only scan the selected frame(s) |

### Scan Actions

| Button | Description |
|---|---|
| **Run Scan Design** | Start QA scanning and detect issues |
| **Extract Tokens** | Extract design tokens from the design |
| **Scan Interactions** | Scan all interactions and animations |

> [Screenshot: Scan controls area with scope toggle and action buttons]

### Scan Progress

During scanning, a progress bar displays:
- Current progress percentage
- Node count (current / total)
- Cancel button to stop the scan

> [Screenshot: Scan progress bar during scanning]

---

## Sub-tabs

### Issues Tab

Displays the list of detected issues, grouped by category.

#### Issue Categories

| Category | Icon | Description |
|---|---|---|
| **Typography Style Match** | | Text doesn't match any defined typography style |
| **Text Style (Variable)** | | Text doesn't use a Figma text style |
| **Font Size** | | Font size not in the defined scale |
| **Line Height** | | Line height doesn't meet the defined standard |
| **Color** | | Color not in the defined palette |
| **Color Variable** | | Color not bound to a Figma variable |
| **Contrast (ADA AA)** | | Insufficient contrast ratio (< 4.5:1 normal, < 3:1 large text) |
| **Text Size (ADA)** | | Text too small for mobile (< 16px normal, < 14px bold) |
| **Spacing** | | Gap or padding not following the spacing scale |
| **Auto Layout** | | Frame missing auto-layout |
| **Group** | | Use of Group instead of Frame + Auto-layout |
| **Empty Frame** | | Empty or redundant frame detected |
| **Position** | | Negative or problematic positioning |
| **Naming** | | Layer naming convention violation |
| **Duplicate** | | Possible duplicate frames that should be componentized |
| **Component** | | Frame that should be turned into a reusable component |

#### Filter Controls

- **Search box**: Search issues by node name or message
- **Severity filter**: All / Errors / Warnings

#### Issue Header

Each issue group shows:
- Category icon and name
- Issue count badge
- **Fix all now** button (for fixable categories)
- Expand/collapse toggle

#### Individual Issue Actions

Each issue item shows:
- Node name and path
- Issue description with current vs expected values
- **Select** button - highlight the node in Figma canvas
- **Fix** or **Suggest Fix** button - apply or choose a fix
- **Ignore** button - mark issue as ignored

> [Screenshot: Issues tab showing grouped issues with badges and filter controls]

> [Screenshot: Expanded issue group showing individual issues with action buttons]

---

### Design Tokens Tab

Displays extracted design tokens organized by type.

#### Token Types

| Token Type | Description |
|---|---|
| **Colors** | All colors used (text, background, border, shadow) with hex values |
| **Gradients** | Linear, radial, angular gradient definitions |
| **Font Size** | All font sizes used, sorted by value |
| **Font Weight** | Font weights with family breakdown |
| **Line Height (%)** | Line heights converted to percentages |
| **Font Family** | All font families with style variants |
| **Spacing** | Gap and padding values used |
| **Border Radius** | Corner radius values used |

Each token shows:
- Token value
- Usage count (number of nodes using this token)
- Click to expand and see all nodes using the token

> [Screenshot: Design Tokens tab showing color tokens with usage counts]

> [Screenshot: Design Tokens tab showing typography and spacing tokens]

---

### Animations Tab

Lists all interactions and animations found in the design.

#### Animation Categories

| Category | Description |
|---|---|
| **Click** | Triggered on tap/click |
| **Hover** | Triggered on mouse hover |
| **Drag** | Triggered on drag gesture |
| **Scroll** | Triggered on scroll |
| **Auto** | Triggered automatically (After Timeout) |
| **Keyboard** | Triggered by keyboard events |
| **Other** | Other trigger types |

Each animation entry shows:
- Trigger type (Click, Hover, Drag, Scroll, After Timeout, etc.)
- Action type (Navigate, Change Frame, etc.)
- Target frame/page
- Transition type and duration
- Easing function
- Delay (for timed triggers)
- Click to select the source node in Figma

> [Screenshot: Animations tab showing list of interactions grouped by category]

---

### Settings Tab

Configure all check rules and design scales.

#### Check Rules

Enable or disable each check type:

| Rule | Default |
|---|---|
| Typography Style Match | On |
| Text Style (Variable) | On |
| Font Size | On |
| Line Height | On |
| Contrast (ADA AA) | On |
| Text Size (ADA) | On |
| Color | On |
| Spacing | On |
| Auto Layout | On |
| Group | On |
| Empty Frame | On |
| Position | On |
| Naming | On |

> [Screenshot: Check Rules toggles in Settings tab]

#### Spacing Scale

Define valid spacing values used in the design.

- **Input**: Comma-separated pixel values (e.g., `0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96`)
- **Threshold**: Values above this are ignored (default: `100`)
- **Use tokens**: Auto-fill from extracted design tokens

> [Screenshot: Spacing scale configuration]

#### Font Size Scale

Define valid font size values.

- **Input**: Comma-separated pixel values (e.g., `12, 14, 16, 18, 20, 24, 32, 40, 48, 64`)
- **Threshold**: Values above this are ignored (default: `100`)
- **Use tokens**: Auto-fill from extracted tokens
- **Use Typography**: Auto-fill from typography styles table

> [Screenshot: Font size scale configuration]

#### Line Height Scale

Define valid line height values.

- **Input**: Comma-separated percentage values (e.g., `auto, 100, 120, 140, 150, 160, 180, 200`)
- **Baseline Min**: Minimum line height value (default: `120%`)
- **Use tokens**: Auto-fill from extracted tokens
- **Use Typography**: Auto-fill from typography styles table

> [Screenshot: Line height scale configuration]

#### Color Palette

Define valid colors used in the design.

- **Input**: Comma-separated hex codes (e.g., `#000000, #FFFFFF, #FF0000`)
- **Use tokens**: Auto-fill from extracted color tokens
- **Extract Styles**: Import all Figma Paint Styles
- **Extract Variables**: Import all Figma Color Variables
- **Color preview panel**: Visual display of configured colors with hex values and names

> [Screenshot: Color palette configuration with color preview swatches]

#### Typography Styles

Define standard text styles for the design system.

| Column | Description |
|---|---|
| **Style Name** | Style name (e.g., H1, H2, Body) |
| **Font Family** | Font family (e.g., Inter, Roboto) |
| **Size (px)** | Font size in pixels |
| **Weight** | Font weight (100-900) |
| **Line Height** | Calculated as percentage (%) |
| **Letter Sp.** | Letter spacing in pixels |
| **Word Sp.** | Word spacing in pixels |

**Typography Check Rules** (toggles):
- Check Typography Style (100% match with defined styles)
- Check Font Family
- Check Font Size
- Check Font Weight
- Check Line Height
- Check Letter Spacing
- Check Word Spacing

**Quick Actions:**
- **+ Add Style**: Add a new typography style row
- **Desktop**: Extract text styles for desktop breakpoint
- **Tablet**: Extract text styles for tablet breakpoint
- **Mobile**: Extract text styles for mobile breakpoint
- **All**: Extract all text styles (all breakpoints)
- **Reset**: Reset to default typography styles

> [Screenshot: Typography styles table with check rules and quick actions]

#### Skip Layer Names

List of layer names to skip during QA scan (one per line or comma-separated).

Default: `not check design, sticky note, vector, Clip path group, Clip path`

Layers containing these substrings will be completely ignored.

> [Screenshot: Skip layer names configuration]

---

## Issue Types

### Structure & Organization Issues

#### Group
- **Severity**: Warning
- **Description**: A Group node is used instead of Frame + Auto-layout
- **Why it matters**: Groups don't support auto-layout and responsive behavior
- **Fix**: Convert group to frame with auto-layout

#### Auto Layout
- **Severity**: Warning
- **Description**: A frame is missing auto-layout
- **Why it matters**: Frames without auto-layout require manual positioning
- **Fix**: Enable auto-layout on the frame

#### Empty Frame
- **Severity**: Warning
- **Description**: An empty or redundant frame is detected
- **Why it matters**: Empty frames add unnecessary complexity
- **Fix**: Remove the empty frame

#### Position
- **Severity**: Warning
- **Description**: A node has negative or problematic positioning
- **Why it matters**: Negative positions can cause layout overflow
- **Fix**: Reset position to (0, 0) or remove the layer

#### Naming
- **Severity**: Info
- **Description**: Layer naming doesn't follow conventions
- **Why it matters**: Consistent naming helps developer handoff
- **Fix**: Rename the layer

#### Duplicate
- **Severity**: Info
- **Description**: Multiple similar frames that could be a component
- **Why it matters**: Duplicates increase maintenance overhead
- **Fix**: Create a reusable component

#### Component
- **Severity**: Info
- **Description**: A frame that should be turned into a component
- **Why it matters**: Components enable reuse and consistency
- **Fix**: Convert to component

### Typography Issues

#### Typography Style Match
- **Severity**: Error
- **Description**: Text properties don't match any defined typography style
- **Shows**: Current font properties vs closest matching style with similarity percentage
- **Fix**: Apply the suggested matching style

#### Text Style (Variable)
- **Severity**: Warning
- **Description**: Text node doesn't use a Figma text style
- **Why it matters**: Text styles ensure typography consistency
- **Fix**: Apply a matching Figma text style

#### Font Size
- **Severity**: Warning
- **Description**: Font size is not in the defined font size scale
- **Shows**: Current size vs nearest valid sizes
- **Fix**: Change to the nearest valid font size

#### Line Height
- **Severity**: Warning
- **Description**: Line height doesn't match the defined scale or is below baseline minimum
- **Shows**: Current line height vs nearest valid values
- **Fix**: Change to the nearest valid line height

### Color & Accessibility Issues

#### Color
- **Severity**: Warning
- **Description**: Color fill or stroke is not in the defined color palette
- **Shows**: Current color vs nearest palette color
- **Fix**: Change to the nearest palette color

#### Color Variable
- **Severity**: Warning
- **Description**: Color is not bound to a Figma variable
- **Shows**: Current color and matching variable (if found)
- **Fix**: Bind the color to the matching variable

#### Contrast (ADA AA)
- **Severity**: Error
- **Description**: Text contrast ratio fails WCAG AA standards
- **Standards**: Normal text minimum 4.5:1, Large text (>=18pt or >=14pt bold) minimum 3:1
- **Shows**: Current contrast ratio and background/text colors
- **Fix**: Adjust text or background color to meet contrast requirements

#### Text Size (ADA)
- **Severity**: Warning
- **Description**: Text size is too small for mobile accessibility
- **Standards**: Minimum 16px for normal text, 14px for bold text
- **Fix**: Increase font size to meet minimum

### Spacing Issues

#### Spacing
- **Severity**: Warning
- **Description**: Gap (itemSpacing) or padding values don't follow the spacing scale
- **Shows**: Current spacing vs nearest valid values
- **Fix**: Change to the nearest valid spacing value

---

## Fix Operations

### Header "Fix all now" Button

Located at the top of the issues list, this button auto-fixes:

1. **Typography 100% matches**: Applies the text style when a node's properties match a defined style 100%
2. **Color variable bindings**: Binds colors to matching Figma variables

The button shows a count of fixable issues and is hidden when count is 0.

### Group-level "Fix all now" Buttons

Each issue group with fixable issues shows its own "Fix all now" button. These process issues sequentially with a modal for each, allowing you to:
- **Apply** the suggested fix
- **Skip** to the next issue
- **Cancel** to stop processing

### Individual Fix Buttons

Each issue has a **Suggest Fix** button that opens a modal with:
- Current value vs suggested value
- Preview of the change
- Apply / Skip / Cancel options

### Progress Bar

During batch fix operations, a progress bar shows:
- Current progress (X / Total)
- Progress percentage bar
- Cancel button to stop the operation

> [Screenshot: Fix all now button with progress bar during batch operation]

> [Screenshot: Suggest fix modal for typography issue]

> [Screenshot: Suggest fix modal for spacing issue]

> [Screenshot: Suggest fix modal for color issue]

---

## Export Features

### Export HTML Report

Generates a self-contained HTML report with:
- Scan context (file name, page name, timestamp)
- All issues grouped by category
- Issue severity, node name, and description
- Styled for easy reading and sharing

### Export JSON Report

Generates a machine-readable JSON file with:
- Complete issue data with all properties
- Scan metadata and context
- Suitable for CI/CD integration

Access via the **Export** dropdown at the bottom of the Issues tab.

> [Screenshot: Export dropdown showing HTML and JSON options]

---

## Settings Management

### Save & Load Settings

| Action | Description |
|---|---|
| **Save Settings** | Save current configuration as a named preset |
| **Select Settings** | Load a previously saved preset |
| **Export Settings** | Export settings to a JSON file for sharing |
| **Import Settings** | Import settings from a JSON file |
| **Reset All** | Reset all settings to defaults and clear history |

Settings include all check rules, scales, color palette, typography styles, and skip names.

> [Screenshot: Settings management buttons (Save, Select, Export, Import, Reset)]

---

## History & Restore

### Scan History

- Plugin stores the **last 10 scans** with full data
- Access via the **History** button
- Each entry shows:
  - Timestamp
  - Scan scope (Page / Selection)
  - Scan context (file name, page name, selected frames)
  - Issue count

### Auto-Restore

- On plugin startup, the last scan is automatically restored
- User settings are preserved between sessions
- Issue ignore list is maintained across scans

> [Screenshot: History panel showing recent scans]

---

## Detailed Workflows

### Workflow 1: Run QA Check

```
[Select Frame to Check]
        |
        v
[Open Plugin > Design QA Checker]
        |
        v
[Configure Settings (Scales, Colors, Typography)]
        |
        v
[Click "Run Scan Design"]
        |
        v
[Review Issues]
        |
    +----+----+
    |         |
[Auto Fix]  [Manual Fix in Figma]
    |         |
    v         v
[Verify] ----> [Re-scan]
```

> [Screenshot: Complete QA workflow from scan to fix]

### Workflow 2: Extract Design Tokens

```
[Select Frame or Page]
        |
        v
[Click "Extract Tokens"]
        |
        v
[Switch to Design Tokens Tab]
        |
        v
[Review Tokens (Colors, Typography, Spacing, etc.)]
        |
        v
[Use "Use tokens" buttons to populate Settings]
```

> [Screenshot: Token extraction workflow]

### Workflow 3: Scan Interactions

```
[Select Frame or Page]
        |
        v
[Click "Scan Interactions"]
        |
        v
[Switch to Animations Tab]
        |
        v
[Review Interactions grouped by category]
        |
        v
[Click items to select source nodes in Figma]
```

> [Screenshot: Interactions scanning workflow]

### Workflow 4: Export QA Report

```
[Run QA Scan]
        |
        v
[Review and Fix Issues]
        |
        v
[Click Export dropdown]
        |
    +----+----+
    |         |
[HTML]     [JSON]
    |         |
    v         v
[Share with   [Integrate
 team]        with CI/CD]
```

> [Screenshot: Export workflow]

---

## Troubleshooting

### Issue 1: QA Scan doesn't find issues

**Cause:** Check rules may be disabled or scales not configured.

**Solution:**
- Go to **Settings** tab and verify Check Rules are enabled
- Ensure Font Size Scale, Line Height Scale, and Color Palette are configured
- Try **Scan Page** instead of **Scan Selection**

### Issue 2: Typography Style Match shows too many issues

**Cause:** Typography styles table may not match your design system.

**Solution:**
- Use **Extract Styles** buttons (Desktop / Tablet / Mobile / All) to import styles from Figma
- Verify the typography styles table matches your design system
- Disable specific check rules (e.g., Letter Spacing, Word Spacing) if not needed

### Issue 3: Color check shows false positives

**Cause:** Color palette may be incomplete.

**Solution:**
- Use **Extract Styles** to import Figma Paint Styles
- Use **Extract Variables** to import Figma Color Variables
- Use **Use tokens** after extracting tokens to auto-fill the palette

### Issue 4: Scan is slow on large designs

**Cause:** Scanning a page with many nodes takes time.

**Solution:**
- Use **Scan Selection** to scan specific frames instead of the entire page
- The plugin shows a warning for designs with >5000 nodes
- Use the Cancel button to stop if needed

### Issue 5: Fix operations don't work

**Cause:** Some fixes require specific conditions.

**Solution:**
- **Typography fix**: Requires a text style to exist in Figma that matches the defined style
- **Color variable fix**: Requires a matching Figma variable to exist
- **Contrast fix**: Opens a color picker to choose a compliant color
- Check the Figma console for error messages

### Issue 6: Settings are lost between sessions

**Cause:** Settings may not have been saved.

**Solution:**
- Click **Save Settings** to create a named preset
- Use **Export Settings** to save configuration as a JSON file
- Settings are auto-restored on plugin startup, but explicit saves ensure persistence

---

## Contact & Support

- **Version**: 2.0
- **Author**: Thien Ho
- **Plugin ID**: design-qa-checker

---
