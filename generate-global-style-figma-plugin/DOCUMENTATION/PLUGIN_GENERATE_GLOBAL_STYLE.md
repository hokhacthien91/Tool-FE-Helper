# Generate Global Style - Figma Plugin

# Generate Global Style - Figma Plugin

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Main Tabs](#main-tabs)
   - [Tab 1: From JSON / Figma](#tab-1-from-json--figma)
   - [Tab 2: Import Tokens](#tab-2-import-tokens)
   - [Tab 3: Export Tokens](#tab-3-export-tokens)
4. [Token JSON Format](#token-json-format)
5. [Detailed Workflows](#detailed-workflows)
6. [Automatic Features](#automatic-features)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

**Generate Global Style** is a Figma Plugin that helps design teams create comprehensive Global Style guides from design tokens. It bridges the gap between design tokens (JSON) and Figma's native Variables & Text Styles system.

**Key Features:**

- Generate visual style guide (Colors, Typography, Spacing) from JSON tokens
- Generate style guide from existing Figma Variables & Styles
- Import multi-file design tokens (colors, typography, spacing, shadow, border, breakpoints, buttons)
- Export Figma Variables & Styles back to JSON token files
- Create Figma Variables and Text Styles automatically from tokens
- Duplicate detection with per-item skip/overwrite controls
- Font fallback system for missing fonts
- Button & Text Link component generation from tokens

---

## Installation

### Step 1: Import Plugin to Figma

1. Open Figma Desktop
2. Go to **Menu > Plugins > Development > Import plugin from manifest...**
3. Select the file `generate-global-style-figma-plugin/manifest.json`

<!-- [Screenshot: Import plugin from manifest menu] -->

### Step 2: Open Plugin

1. Go to **Menu > Plugins > Development > Generate Global Style**

<!-- [Screenshot: Opening the plugin from Plugins menu] -->

---

## Main Tabs

The plugin has **3 main tabs**, each serving a specific purpose:

| Tab                   | Main Function                                                    |
| --------------------- | ---------------------------------------------------------------- |
| **From JSON / Figma** | Generate style guide from JSON file or existing Figma Variables  |
| **Import Tokens**     | Import multiple token JSON files to create Variables & Layout    |
| **Export Tokens**     | Export Figma Variables & Styles to downloadable JSON token files |

<!-- [Screenshot: Plugin UI showing 3 tabs] -->

---

## Tab 1: From JSON / Figma

### Purpose

Generate a visual Global Style frame and optionally create Figma Variables & Text Styles from a JSON file or from existing Figma data.

### Interface

The tab has two option cards side by side:

<!-- [Screenshot: Tab 1 interface with two option cards] -->

### Option 1: From JSON File

Upload a JSON file containing your design system tokens to generate a style guide.

#### Configuration

1. **File Input**
   - Upload a `.json` file containing design tokens
   - Supports the legacy single-file format (see [JSON Format](#token-json-format))

2. **Create Variables & Text Styles** (Checkbox)
   - When enabled, the plugin will create Figma Variables (COLOR, FLOAT) and Text Styles from the JSON data
   - This creates actual reusable Figma assets, not just visual preview

3. **Prefix** (Input, appears when checkbox is enabled)
   - Optional project prefix to namespace collections and styles
   - Prevents conflicts when multiple projects exist in the same Figma file
   - Example: prefix `MG` creates collections named `Colors - MG`, text styles like `MG/H1`

| Setting                              | Description                                        |
| ------------------------------------ | -------------------------------------------------- |
| **File Input**                       | Upload `.json` file with design tokens             |
| **Create Variables & Text Styles**   | Create Figma Variables and Text Styles from tokens |
| **Prefix**                           | Optional namespace prefix (e.g., `MG`, `NewQuest`) |

<!-- [Screenshot: Option 1 card with file input, checkbox, and prefix field] -->

#### Generate from JSON Workflow

```
1. Upload JSON file
2. (Optional) Enable "Create Variables & Text Styles"
3. (Optional) Enter prefix
4. Click "Generate"
5. If duplicates found → Duplicate modal appears (see below)
6. Plugin creates "Global Style" frame on canvas
```

### Option 2: From Figma Variables & Styles

Generate a style guide from existing Variables and Styles already in your Figma file.

#### Requirements

- Local Color Variables (for colors section)
- Local Text Styles (for typography section)
- Local Number Variables (for spacing section, optional)

#### Workflow

```
1. Ensure Figma file has local Variables and/or Styles
2. Click "Generate"
3. Plugin creates "Global Style from Figma" frame on canvas
```

<!-- [Screenshot: Generated Global Style frame on Figma canvas] -->

### What Gets Generated

The plugin creates a frame containing these sections:

#### Color Palette
- Organized color swatches with hex codes
- Grouped by category (Primary, Secondary, Neutral, etc.)
- Automatically binds to Figma Variables or Paint Styles if they exist

<!-- [Screenshot: Colors section with swatches and hex codes] -->

#### Typography Styles
- Preview text with actual font styles applied
- Shows font family, size, line height, and letter spacing
- Supports breakpoint-based organization (Desktop/Tablet/Mobile)
- Font fallback warning when fonts are not available

<!-- [Screenshot: Typography section with preview text] -->

#### Spacing Scale
- Visual table of spacing values
- Supports multiple breakpoints (Desktop/Tablet/Mobile)
- Values extracted from Number Variables

<!-- [Screenshot: Spacing section with scale table] -->

### Duplicate Detection Modal

When "Create Variables & Text Styles" is enabled and existing items are found with the same names, a modal appears:

| Action              | Description                                     |
| ------------------- | ----------------------------------------------- |
| **Skip All**        | Skip all duplicate items, keep existing          |
| **Overwrite All**   | Overwrite all existing items with new values     |
| **Apply Selection** | Apply per-item choices (skip or overwrite each)  |
| **Cancel**          | Cancel the operation entirely                    |

Each duplicate item shows radio buttons for individual skip/overwrite selection.

<!-- [Screenshot: Duplicate confirmation modal with per-item controls] -->

---

## Tab 2: Import Tokens

### Purpose

Import multiple token JSON files (following the multi-file token format) to create Figma Variables, Text Styles, and a visual layout preview.

### Interface

<!-- [Screenshot: Tab 2 Import Tokens interface] -->

### Configuration

| Setting                              | Description                                            |
| ------------------------------------ | ------------------------------------------------------ |
| **File Input** (multiple)            | Select multiple `.json` token files at once             |
| **Create Variables & Text Styles**   | Create Figma Variables and Text Styles (default: on)    |
| **Generate Layout Preview**          | Create visual preview frame on canvas (default: on)     |
| **Project Prefix**                   | Prefix for collection names (e.g., `Project A`)         |

### Supported Token Files

| File               | Token Type  | Description                                     |
| ------------------ | ----------- | ----------------------------------------------- |
| `colors.json`      | color       | Color palette with groups and values             |
| `typography.json`  | typography  | Text styles with breakpoint variants             |
| `spacing.json`     | spacing     | Spacing scale with Desktop/Tablet/Mobile values  |
| `shadow.json`      | shadow      | Box shadow definitions                           |
| `border.json`      | border      | Border radius and width values                   |
| `breakpoints.json` | breakpoint  | Responsive breakpoint definitions                |
| `button.json`      | button      | Button component variants and styles             |

The plugin auto-detects token type from filename or from the `$type` field in the JSON.

### Import Workflow

```
1. Select multiple token JSON files
2. Selected files are listed in the UI
3. (Optional) Adjust checkboxes and prefix
4. Click "Import Tokens"
5. Plugin reads and parses all files
6. If duplicates found → Duplicate modal appears
7. Variables/Styles created + Layout frame generated
```

### What Gets Created

When **Create Variables & Text Styles** is enabled:

| Token Type  | Figma Asset Created                                            |
| ----------- | -------------------------------------------------------------- |
| Colors      | Color Variables in collection `Colors - <prefix>`              |
| Typography  | Text Styles named `<prefix>/Desktop/H1`, `<prefix>/Mobile/H1` |
| Spacing     | Number Variables with modes: Desktop, Tablet, Mobile           |
| Shadow      | Effect Styles                                                  |
| Border      | Number Variables for radius and width                          |
| Breakpoints | Number Variables for breakpoint and container values            |

When **Generate Layout Preview** is enabled:
- A comprehensive frame is created showing all token categories visually
- Colors as swatches, Typography as text previews, Spacing as scale tables
- Button and Text Link component sets if `button.json` is included

<!-- [Screenshot: Generated layout preview from imported tokens] -->

---

## Tab 3: Export Tokens

### Purpose

Export existing Figma Variables & Styles to downloadable JSON token files, packaged as a ZIP.

### Interface

<!-- [Screenshot: Tab 3 Export Tokens interface] -->

### Configuration

#### Token Types (Checkboxes)

Select which token types to export:

| Checkbox    | Output File        | Source in Figma                     |
| ----------- | ------------------ | ----------------------------------- |
| Colors      | `colors.json`      | Local Color Variables               |
| Typography  | `typography.json`  | Local Text Styles                   |
| Spacing     | `spacing.json`     | Local Number Variables (spacing)    |
| Shadow      | `shadow.json`      | Local Effect Styles                 |
| Border      | `border.json`      | Local Number Variables (border)     |
| Breakpoints | `breakpoints.json` | Local Number Variables (breakpoint) |
| Button      | `button.json`      | Button Component Sets / Grid layouts|

#### Project Name

- Used for the `$project` field in exported JSON files
- Also used for ZIP filename
- Example: `Project A — Corporate / Enterprise`

### Export Workflow

```
1. Select token types to export (checkboxes)
2. Enter Project Name
3. Click "Export & Download"
4. Plugin reads Variables, Styles, and Components from Figma
5. ZIP file downloaded containing selected token files
```

### Exported JSON Structure

Each exported file follows this structure:

```json
{
  "$schema": "https://gravity-flex.dev/schemas/tokens.json",
  "$type": "<token-type>",
  "$project": "<project-name>",
  "<token-type>": {
    ...
  }
}
```

<!-- [Screenshot: Downloaded ZIP file contents] -->

---

## Token JSON Format

### Single-File Format (Tab 1: From JSON)

Used with Tab 1's "From JSON File" option:

```json
[
  {
    "name": "Project Name",
    "values": {
      "colorNameMap": {
        "#00205C": "Primary/Navy",
        "#EE283B": "Primary/Red"
      },
      "typographyStyles": [
        {
          "name": "Desktop/H1",
          "fontFamily": "Lato",
          "fontSize": 48,
          "fontWeight": "Bold",
          "lineHeight": "120%",
          "letterSpacing": "0%"
        }
      ],
      "spacingScale": "0, 4, 8, 16, 24, 32, 40, 48"
    }
  }
]
```

### Multi-File Format (Tab 2: Import Tokens)

Each token type is a separate JSON file.

#### colors.json

```json
{
  "$type": "color",
  "$project": "Project A",
  "color": {
    "primary": {
      "100": { "value": "#9dcef0", "description": "Primary tint" },
      "200": { "value": "#6fb7e8", "description": "Primary light" },
      "300": { "value": "#4a9fdc", "description": "Primary base" }
    },
    "semantic": {
      "success": { "value": "#2e7d32", "description": "Success state" },
      "error": { "value": "#c62828", "description": "Error state" }
    }
  }
}
```

#### typography.json

```json
{
  "$type": "typography",
  "$project": "Project A",
  "textStyles": {
    "h1": {
      "mobile": {
        "fontSize": "60px",
        "lineHeight": "120%",
        "fontWeight": "semibold",
        "letterSpacing": "1px"
      },
      "desktop": {
        "fontSize": "64px"
      }
    },
    "body": {
      "mobile": {
        "fontSize": "16px",
        "lineHeight": "150%",
        "fontWeight": "regular",
        "fontFamily": "Lato"
      }
    }
  },
  "linksColors": {
    "color": "#4a9fdc",
    "underline": "none",
    "hover": {
      "color": "#2b7cba",
      "underline": "underline"
    }
  }
}
```

Note: Desktop/Tablet styles inherit from Mobile if not specified. Only override properties that differ.

#### spacing.json

```json
{
  "$type": "spacing",
  "$project": "Project A",
  "spacing": {
    "1": {
      "desktop": { "value": "8px" },
      "tablet": { "value": "8px" },
      "mobile": { "value": "8px" }
    },
    "4": {
      "desktop": { "value": "32px" },
      "tablet": { "value": "24px" },
      "mobile": { "value": "24px" }
    }
  }
}
```

#### shadow.json

```json
{
  "$type": "shadow",
  "$project": "Project A",
  "shadow": {
    "sm": { "value": "0 1px 3px 0 rgb(0 0 0 / 0.1)", "description": "Small shadow" },
    "md": { "value": "0 4px 6px -1px rgb(0 0 0 / 0.1)", "description": "Medium shadow" }
  }
}
```

#### border.json

```json
{
  "$type": "border",
  "$project": "Project A",
  "border": {
    "radius": {
      "sm": { "value": "0.125rem", "description": "Small (2px)" },
      "base": { "value": "0.25rem", "description": "Base (4px)" },
      "full": { "value": "9999px", "description": "Pill shape" }
    },
    "width": {
      "thin": { "value": "1px", "description": "Thin border" },
      "base": { "value": "2px", "description": "Base border width" }
    }
  }
}
```

#### breakpoints.json

```json
{
  "$type": "breakpoint",
  "$project": "Project A",
  "breakpoint": {
    "sm": { "value": "481px", "max": "767px", "description": "Small devices" },
    "md": { "value": "768px", "max": "991px", "description": "Tablets" },
    "lg": { "value": "992px", "max": "1199px", "description": "Desktops" }
  },
  "container": {
    "md": { "value": "720px", "description": "Container on medium" },
    "lg": { "value": "960px", "description": "Container on large" }
  }
}
```

#### button.json

```json
{
  "config": {
    "examples": { "defaultText": "Button", "textLinkText": "Text link" },
    "icons": { "default": "arrow--right" }
  },
  "button": {
    "variants": {
      "state": ["default", "hover", "disabled"],
      "color": ["primary", "secondary"],
      "size": ["large", "small"],
      "type": ["fill", "outline"]
    },
    "base": {
      "borderRadius": 4,
      "font": { "family": "Lato", "weight": 600, "size": { "large": 16, "small": 14 } }
    },
    "sizes": {
      "large": { "padding": { "x": 24, "y": 12 } },
      "small": { "padding": { "x": 16, "y": 8 } }
    },
    "styles": {
      "fill": {
        "primary": {
          "default": { "text": "color.white", "background": "color.primary.300", "border": "color.primary.300" },
          "hover": { "text": "color.white", "background": "color.primary.400", "border": "color.primary.400" }
        }
      }
    }
  }
}
```

Note: Color references in button styles (e.g., `color.primary.300`) are resolved from the imported `colors.json`.

---

## Detailed Workflows

### Workflow 1: Generate from JSON

```
[Upload JSON File]
        |
        v
[Open Plugin > Tab "From JSON / Figma"]
        |
        v
[Select JSON file]
        |
        v
[(Optional) Enable "Create Variables & Text Styles"]
        |
        v
[(Optional) Enter Prefix]
        |
        v
[Click "Generate"]
        |
        v
[Checking for duplicates...]
        |
   +----+----+
   |         |
[No Dupes]  [Duplicates Found]
   |              |
   v              v
[Generate]  [Show Modal → Choose Skip/Overwrite]
   |              |
   v              v
["Global Style" frame created on canvas]
```

### Workflow 2: Generate from Figma Variables

```
[Ensure Figma file has local Variables & Text Styles]
        |
        v
[Open Plugin > Tab "From JSON / Figma"]
        |
        v
[Click "Generate" (Option 2)]
        |
        v
[Plugin reads all local Variables, Text Styles, Number Variables]
        |
        v
["Global Style from Figma" frame created on canvas]
```

### Workflow 3: Import Multi-File Tokens

```
[Prepare token JSON files (colors.json, typography.json, etc.)]
        |
        v
[Open Plugin > Tab "Import Tokens"]
        |
        v
[Select multiple files]
        |
        v
[Configure: prefix, create variables, generate layout]
        |
        v
[Click "Import Tokens"]
        |
        v
[Plugin parses all token files]
        |
   +----+----+
   |         |
[No Dupes]  [Duplicates Found]
   |              |
   v              v
[Import]    [Show Modal → Choose per-item]
   |              |
   v              v
[Variables & Styles created + Layout preview generated]
```

### Workflow 4: Export Tokens from Figma

```
[Figma file with Variables, Styles, Components]
        |
        v
[Open Plugin > Tab "Export Tokens"]
        |
        v
[Select token types (checkboxes)]
        |
        v
[Enter Project Name]
        |
        v
[Click "Export & Download"]
        |
        v
[Plugin reads Figma data and generates JSON]
        |
        v
[ZIP file downloaded with all token files]
```

---

## Automatic Features

### Font Fallback System

When a font specified in tokens is not available in Figma:

| Step | Action                                                                          |
| ---- | ------------------------------------------------------------------------------- |
| 1    | Try to load the requested font family + style                                   |
| 2    | Try alternative weights (Regular -> Medium -> Bold)                             |
| 3    | Fallback to Inter Regular if font family not found                              |
| 4    | Display warning in preview: `(check font-family manual: expected [Font Name])`  |

The plugin continues generating without crashing. Missing fonts are clearly marked for manual review.

**Example output:**
```
H1: Lorem ipsum dolor sit amet... (check font-family manual: expected Utopia Std Semibold)
```

### Variable Collection Naming

Collections are created with the prefix pattern:

| Token Type  | Collection Name                    | Modes                   |
| ----------- | ---------------------------------- | ----------------------- |
| Colors      | `Colors - <prefix>` or `Colors`    | Single mode             |
| Spacing     | `Spacing - <prefix>` or `Spacing`  | Desktop, Tablet, Mobile |
| Border      | `Border - <prefix>` or `Border`    | Single mode             |
| Breakpoints | `Breakpoint - <prefix>`            | Single mode             |

### Text Style Naming

Text Styles are created following the pattern: `<prefix>/<breakpoint>/<style-name>`

Examples:
- `Project A/Desktop/H1`
- `Project A/Mobile/Body`
- `Project A/Desktop/Body-large`

### Token Path Mapping

Token paths with `/` separators become grouped names in Figma:
- Token path: `primary/300` -> Variable name: `primary/300`
- Token path: `semantic/success` -> Variable name: `semantic/success`

### Breakpoint Inheritance (Typography)

When only `mobile` breakpoint is specified in typography tokens, the plugin uses the mobile values as the base for all breakpoints. Only properties that differ need to be specified for `tablet` and `desktop`.

### Button Color Resolution

Button styles reference colors using dot-path notation (e.g., `color.primary.300`). These are resolved at import time from the color tokens. Both `colors.json` and `button.json` should be imported together for correct color binding.

---

## Troubleshooting

### Issue 1: "No data found in JSON" error

**Cause:** JSON file doesn't match the expected format.

**Solution:**
- For Tab 1: Ensure JSON is an array with `[{ "name": "...", "values": {...} }]` structure
- For Tab 2: Ensure each file has `$type` field or filename matches expected pattern (e.g., `colors.json`)

### Issue 2: Font fallback warning appears in generated preview

**Cause:** Font specified in tokens is not installed in Figma.

**Solution:**
1. Install the required font on your system
2. Restart Figma Desktop
3. Re-run the plugin
4. The warning text `(check font-family manual: expected ...)` will disappear

### Issue 3: Duplicate modal keeps appearing

**Cause:** Variables or Text Styles with the same names already exist in your Figma file.

**Solution:**
- Use a unique **Prefix** to namespace your imports (e.g., `v2`, `ProjectB`)
- Choose **Overwrite All** to replace existing items
- Choose **Skip All** to keep existing items unchanged

### Issue 4: Spacing variables don't have breakpoint modes

**Cause:** Spacing tokens don't include `desktop`, `tablet`, `mobile` keys.

**Solution:**
Ensure your `spacing.json` has the multi-breakpoint format:
```json
{
  "spacing": {
    "1": {
      "desktop": { "value": "8px" },
      "tablet": { "value": "8px" },
      "mobile": { "value": "8px" }
    }
  }
}
```

### Issue 5: Button styles show wrong colors

**Cause:** Button token references colors that don't exist in `colors.json`.

**Solution:**
- Ensure `colors.json` is included when importing `button.json`
- Color references like `color.primary.300` must match the color token paths exactly

### Issue 6: Export ZIP is empty or missing files

**Cause:** No matching Variables/Styles found in Figma for the selected token types.

**Solution:**
- Ensure your Figma file has **local** Variables (not from external libraries)
- Check that the token type checkboxes match what exists in your file
- For Button export: ensure Button Component Sets exist on the canvas

### Issue 7: Text Styles not found when generating from JSON

**Cause:** Text style names in JSON don't match Figma text style names exactly.

**Solution:**
- Verify exact naming (case-sensitive)
- Use the prefix consistently between import and generate steps

### Issue 8: Variables not showing in generated layout

**Cause:** Using library Variables instead of local Variables.

**Solution:**
- The plugin reads **Local Variables** only
- If tokens come from a library, import them locally first using Tab 2

---

## Contact & Support

- **Version:** 2.0
- **Author:** Thien Ho
