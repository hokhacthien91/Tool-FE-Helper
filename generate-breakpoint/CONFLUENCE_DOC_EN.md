# Thien Assist - Figma Plugin

## Table of Contents
1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Main Tabs](#main-tabs)
   - [Tab 1: Breakpoint Generator](#tab-1-breakpoint-generator)
   - [Tab 2: For Email](#tab-2-for-email)
   - [Tab 3: Export JSON](#tab-3-export-json)
   - [Tab 4: QA Checker](#tab-4-qa-checker)
   - [Tab 5: Export GIF](#tab-5-export-gif)
4. [Detailed Workflows](#detailed-workflows)
5. [Troubleshooting](#troubleshooting)

---

## Introduction

**Thien Assist** is a multi-purpose Figma Plugin that helps convert desktop designs to mobile breakpoints with advanced features for email development and design QA.

### Key Features:
- Automatic layout conversion from Desktop to Mobile
- Email development support (dark mode, export images, copy content)
- QA Checker for design consistency verification
- Export GIF from component variants
- Inspector to view JSON structure of nodes

---

## Installation

### Step 1: Import Plugin to Figma

1. Open Figma Desktop
2. Go to **Menu > Plugins > Development > Import plugin from manifest...**
3. Select the file `desktop-to-mobile-breakpoint-converter/manifest.json`

*[Screenshot: Plugin import menu]*

### Step 2: Open Plugin

1. Select the frame to process on canvas
2. Go to **Menu > Plugins > Development > Thien Assist**

*[Screenshot: Open plugin from menu]*

---

## Main Tabs

The plugin has **5 main tabs**, each serving a specific purpose:

| Tab | Main Function |
|-----|---------------|
| **Breakpoint Generator** | Convert desktop frame to mobile breakpoints |
| **For Email** | Email development tools (dark mode, export images) |
| **Export JSON** | View and copy JSON structure of nodes |
| **QA Checker** | Check design consistency (typography, colors, contrast) |
| **Export GIF** | Create GIF from component variants or child frames |

*[Screenshot: Plugin interface with 5 tabs]*

---

## Tab 1: Breakpoint Generator

### Purpose
Convert a desktop frame to mobile/tablet breakpoints with automated layout options.

### Interface

*[Screenshot: Breakpoint Generator Tab]*

### Configuration

#### 1. Selected Frame
Displays information about the currently selected frame:
- Frame name
- Dimensions (width x height)

#### 2. Target Breakpoints

Select one or more target widths:

| Breakpoint | Width | Default Padding | Default Max Gap |
|------------|-------|-----------------|-----------------|
| Mobile | 414px | 24px | 40px |
| Tablet | 768px | 48px | 60px |
| Tablet Large | 1024px | 48px | 60px |

**Options:**
- **Padding**: Left/right padding for container (applied to root frame)
- **Max Gap**: Maximum spacing limit when converting layout

*[Screenshot: Breakpoint selection UI]*

#### 3. Slider/Carousel Mode

When enabled, the plugin will preserve horizontal layout for frames matching the pattern.

| Setting | Description |
|---------|-------------|
| **Item name pattern** | Child frame names to be identified as slider items (e.g., "Cards", "slide-item") |
| **Items visible** | Number of items displayed simultaneously |
| **Peek next item** | Show partial next item (px) |

*[Screenshot: Slider configuration]*

#### 4. Manual Sections Source (Optional)

Allows replacing sections with pre-designed mobile versions.

**How to use:**
1. In desktop design, name sections with suffix `- manual`
   - Example: `Hero Section - manual`
2. Create mobile version of that section in another frame
3. Click **"Add Selected Frame"** to add frame containing mobile sections
4. Enable checkbox **"Enable manual section replacement"**

*[Screenshot: Manual sections config]*

#### 5. Advanced Settings

| Setting | Description |
|---------|-------------|
| **Preserved Components** | List of component names that won't be detached (keep instance intact) |
| **UI Control Patterns** | Patterns to identify UI controls (will keep horizontal layout) |
| **Muted Frames** | Frames that selected "Don't ask again" - will auto-apply previous choice |

*[Screenshot: Advanced settings expanded]*

#### 6. Font Size Options

| Option | Description |
|--------|-------------|
| **Keep font size** | Keep original font sizes unchanged |
| **Map text styles** | Convert Desktop/H1 -> Mobile/H1 (if style exists) |
| **Scale font size** | Multiply font size by factor (default: 0.85) |

### Automatic Features (Behind the Scenes)

When you click "Generate", the plugin automatically performs these optimizations:

#### Layout Conversion
| Feature | Description |
|---------|-------------|
| **Horizontal → Vertical** | Auto-convert HORIZONTAL layouts to VERTICAL when children don't fit in target width |
| **FILL width** | Children are set to `layoutSizingHorizontal: FILL` for responsive sizing |
| **Spacing adjustment** | Auto-adjust `itemSpacing` when converting layout (capped by Max Gap setting) |
| **Ungroup GROUPs** | Auto-ungroup all GROUP nodes so children can resize properly |
| **Auto height** | VERTICAL frames set to `primaryAxisSizingMode: AUTO` to grow with content |

#### Font/Text Processing
| Feature | Description |
|---------|-------------|
| **Map text styles** | Auto-map `Desktop/H1` → `Mobile/H1` (if Mobile style exists in Figma) |
| **Scale font size** | Multiply font size by scale factor (default: 0.85), minimum 10px |
| **Mixed fonts support** | Handle text with multiple fonts (styled text) character by character |

#### Figma Variables Support
| Feature | Description |
|---------|-------------|
| **Auto-detect modes** | Detect Figma Variables with modes (Desktop/Mobile/Tablet) |
| **Apply target mode** | Auto-apply spacing values from the mode matching target breakpoint |
| **Properties processed** | `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` |

#### Image & Media Handling
| Feature | Description |
|---------|-------------|
| **Store aspect ratios** | Save original image aspect ratios from desktop frame BEFORE cloning |
| **Restore aspect ratios** | Restore image aspect ratios after frame resize |
| **Background cover** | Background images resize using `background-size: cover; background-position: center` logic |
| **Media containers** | Preserve aspect ratio or fixed height for video/image frames |

#### Icon Preservation
| Feature | Description |
|---------|-------------|
| **Icon detection** | Identify icons: frame ≤ 120px containing VECTOR/GROUP, or name contains "icon"/"logo" |
| **Store icon sizes** | Save icon sizes BEFORE cloning |
| **Restore icon sizes** | Restore icon sizes after resize (icons are NOT scaled with parent) |

#### Instance/Component Handling
| Feature | Description |
|---------|-------------|
| **Auto-detach instances** | Auto-detach all nested instances to allow layout modifications |
| **Preserved Components** | Components in "Preserved" list will NOT be detached |

#### UI Controls Detection
| Feature | Description |
|---------|-------------|
| **Pattern matching** | Identify UI controls (button, btn, cta, input, tab, search...) |
| **Keep horizontal** | UI controls keep HORIZONTAL layout instead of converting to VERTICAL |
| **Keep natural size** | UI controls keep their natural size (no FILL width) |

#### Absolute Positioning Fix
| Feature | Description |
|---------|-------------|
| **Overflow detection** | Detect absolute-positioned content that overflows |
| **Auto-center** | Auto-center overflowing content within available width |
| **Constraint fix** | Change constraint from CENTER/SCALE to MIN (left) to prevent "snap back" |

### Generate Breakpoint Workflow

```
1. Select desktop frame on canvas
2. Plugin displays frame information
3. Select target breakpoints (414, 768, 1024)
4. Adjust padding and max gap for each breakpoint
5. (Optional) Configure slider mode
6. (Optional) Add manual source frames
7. Click "Generate" or "Generate X Breakpoints"
8. Plugin creates new frames next to original frame
```

*[Screenshot: Before/After generate]*

---

## Tab 2: For Email

### Purpose
Provide tools to support HTML email development.

### Features

#### 1. Copy Content

Select a text layer on canvas and use the buttons:

| Button | Output |
|--------|--------|
| **Copy Content** | Copy plain text content |
| **Copy TD Style** | Copy inline CSS for `<td>` tag |
| **Copy Content + Style** | Copy text with full inline style |
| **Copy HTML Image** | Copy `<img>` tag with src placeholder |
| **Copy HTML Banner + Header (HPS)** | Copy HTML for banner + header structure |
| **Copy HTML TD Background** | Copy `<td>` with background image |

*[Screenshot: Copy Content section]*

#### 2. Dark Mode Simulation

Clone frame and invert colors to simulate email in dark mode.

**How to use:**
1. Select email frame
2. Enter names of frames not to convert (e.g., Logo, Social icons)
3. Click **"Convert to Dark Mode"**
4. Plugin creates new frame with `-dark` suffix

**Skip Frames:** Enter frame names (case-insensitive), one name per line

*[Screenshot: Dark mode result]*

#### 3. Export for Compare (DOCX vs Design)

Export JSON structure and screenshot to compare with DOCX.

**How to use:**
1. Enter **Project Name** (e.g., mail1)
2. Click **"+ Add Desktop Frame"** after selecting desktop frame
3. Click **"+ Add Mobile Frame"** after selecting mobile frame
4. Click **"Export for Compare"**

*[Screenshot: Compare export UI]*

#### 4. Export All Images

Export all images in frame by pattern name.

| Image Type | Config |
|------------|--------|
| **Button** | Pattern, Format (PNG/SVG/JPG), Scale, Padding |
| **PNG** | Pattern, Scale |
| **JPG** | Pattern, Scale |

**Pattern matching:** Frames with **exact name** (case-insensitive) will be exported.

**Example Pattern:**
```
Button
aton/Buttons
```
-> Frames named "Button" or "aton/Buttons" will be exported

*[Screenshot: Export images config]*

---

## Tab 3: Export JSON

### Purpose
View and copy JSON structure of selected node, useful for debugging and design analysis.

### Interface

| Section | Description |
|---------|-------------|
| **Selected Node** | Name and type of selected node |
| **Preview** | Preview image of node |
| **Node Structure (JSON)** | JSON tree of node and children |
| **Properties** | Details about position, size, padding |

*[Screenshot: Inspector tab]*

### JSON Output Options

- **Minify JSON output**: Reduce JSON size by removing whitespace

### Displayed Properties

| Property | Description |
|----------|-------------|
| x, y | Node position |
| width, height | Dimensions |
| paddingLeft/Right/Top/Bottom | Padding (only for auto-layout frames) |

---

## Tab 4: QA Checker

### Purpose
Check design consistency with defined rules.

### Features

#### 1. Scan Controls

| Option | Description |
|--------|-------------|
| **Scan Page** | Scan entire current page |
| **Scan Selection** | Only scan selected frame |
| **Run QA Scan** | Start scanning and find issues |
| **Extract Tokens** | Extract design tokens from selection |

*[Screenshot: QA scan controls]*

#### 2. Sub-tabs

##### Issues Tab
Display list of found issues, grouped by category:

| Category | Description |
|----------|-------------|
| **Typography Style Match** | Text doesn't match defined style |
| **Text Style (Variable)** | Text doesn't use Figma text style |
| **Font Size** | Font size not in scale |
| **Line Height** | Line height doesn't meet standard |
| **Contrast (ADA AA)** | Insufficient contrast ratio (< 4.5:1) |
| **Text Size (ADA)** | Text too small for mobile (< 12px) |
| **Color** | Color not in palette |

**Filter controls:**
- Search box: Search by node name or message
- Severity: All / Errors / Warnings

*[Screenshot: Issues list]*

##### Design Tokens Tab
Display extracted tokens:
- Colors (by type: text, background, border)
- Typography (font family, size, weight, line height)
- Spacing
- Border radius

*[Screenshot: Tokens tab]*

##### Settings Tab

**Check Rules:** Enable/disable each check type

| Rule | Default |
|------|---------|
| Typography Style Match | On |
| Text Style (Variable) | On |
| Font Size | On |
| Line Height | On |
| Contrast (ADA AA) | On |
| Text Size (ADA) | On |
| Color | On |

**Font Size Scale:** Define valid font size values
- Input: `12, 14, 16, 18, 20, 24, 32, 40, 48, 64`
- Threshold: Values above threshold will pass (default: 100)

**Line Height Scale:** Define valid line height values
- Input: `auto, 100, 120, 140, 150, 160, 180, 200`
- Baseline Min: Minimum value (default: 120%)

**Color Palette:** Define valid colors
- Enter hex codes: `#000000, #FFFFFF, #FF0000`
- Or click "Extract Styles" / "Extract Variables" from Figma

**Typography Styles:** Define standard text styles

| Column | Description |
|--------|-------------|
| Style Name | Style name (e.g., H1, H2, Body) |
| Font Family | Font family (e.g., Inter) |
| Size (px) | Font size |
| Weight | Font weight (100-900) |
| Line Height | Calculated as % |
| Letter Sp. | Letter spacing (px) |
| Word Sp. | Word spacing (px) |

**Skip Layer Names:** List of layer names to skip during scan

*[Screenshot: QA Settings]*

---

## Tab 5: Export GIF

### Purpose
Create GIF animation from component variants or child frames.

### Requirements
- Select a **Component Instance** with multiple variants, OR
- Select a **Frame** containing multiple child frames

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| **Width** | Output width | 600px |
| **Height** | Output height | 400px |
| **Scale** | Export scale (0.5x - 3x) | 2x |
| **FPS** | Frames per second | 25 |
| **Delay** | Delay between frames (ms) | 500ms |
| **Pad X** | Left/right padding | 0 |
| **Pad Y** | Top/bottom padding | 0 |
| **Background** | Background color | #FFFFFF |
| **Loop** | Loop forever | On |

**Overlay Layers:** Select layers at the same level as frame to overlay on GIF (e.g., cursor, highlight)

*[Screenshot: GIF export settings]*

### Export GIF Workflow

```
1. Select component instance or frame containing animations
2. Plugin displays number of frames
3. Adjust settings (size, delay, scale)
4. (Optional) Select overlay layers
5. Click "Preview" to preview
6. Click "Download" to download GIF
```

*[Screenshot: GIF preview]*

---

## Detailed Workflows

### Workflow 1: Convert Desktop to Mobile

```
[Select Desktop Frame]
         |
         v
[Open Plugin > Breakpoint Generator Tab (Thien Assist)]
         |
         v
[Select Target Breakpoints: 414, 768, 1024]
         |
         v
[Adjust Padding & Max Gap]
         |
         v
[Click Generate]
         |
         v
[Review Results]
         |
    +----+----+
    |         |
  [OK]    [Needs Fix]
    |         |
    v         v
[Done]   [Manual Adjust in Figma]
```

### Workflow 2: Email Development

```
[Design Desktop Email]
         |
         v
[Generate Mobile Breakpoint]
         |
         v
[Export Images (For Email Tab)]
         |
         v
[Copy Content + Styles for each section]
         |
         v
[Generate Dark Mode Simulation]
         |
         v
[Review Dark Mode]
         |
         v
[Export for Compare (DOCX)]
```

### Workflow 3: QA Check Design

```
[Select Frame to Check]
         |
         v
[Open Plugin > QA Checker Tab]
         |
         v
[Configure Settings (Font Scale, Colors, Typography)]
         |
         v
[Click Run QA Scan]
         |
         v
[Review Issues]
         |
    +----+----+
    |         |
[Auto Fix] [Manual Fix in Figma]
    |         |
    v         v
[Verify] ----> [Re-scan]
```

---

## Troubleshooting

### Issue 1: Icons are distorted/scaled after generate

**Cause:** Icon not properly identified

**Solution:**
- Ensure icon is in frame <= 120px
- Icon frame must contain VECTOR or GROUP nodes
- Or name frame containing "icon" or "logo"

### Issue 2: Frame width still larger than mobile

**Cause:** GROUP nodes exist or constraints are wrong

**Solution:**
- Plugin auto-ungroups - verify again
- Check constraints of children

### Issue 3: Layout doesn't convert to vertical

**Cause:** Frame matches UI control pattern

**Solution:**
- When modal appears, select "Skip Matching" to convert to vertical
- Or modify UI Control Patterns in Advanced Settings

### Issue 4: Manual sections not replaced

**Checklist:**
- [ ] Section name has suffix `- manual` (space before dash)
- [ ] Added frame containing mobile sections
- [ ] Enabled checkbox "Enable Manual Section Replacement"

### Issue 5: QA Scan doesn't find issues

**Solution:**
- Check Settings > Check Rules are enabled
- Check Font Scale and Color Palette are configured
- Try scanning entire Page instead of Selection

---

## Contact & Support

- **Version:** 2.0
- **Author:** FE Helper Team
- **Issues:** [Report bugs here]

---

*Document last updated: [DATE]*

**Note:** Positions marked `[Screenshot: ...]` need to be supplemented with corresponding illustrations.
