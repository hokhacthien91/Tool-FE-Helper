# Design QA Checker — Figma Plugin

Automatically review your designs for quality issues, extract design tokens, and batch-fix problems — all inside Figma.

## Features

### Design Scanning

Scan your entire page or a selection to detect **17 types of issues** across these categories:

**Layout & Structure**
- **autolayout** — Missing or improper Auto Layout
- **spacing** — Inconsistent spacing/padding (configurable scale & threshold)
- **position** — Negative positioning issues
- **empty-frame** — Empty frames that should be cleaned up
- **duplicate** — Duplicate frame detection

**Naming & Organization**
- **naming** — Layer naming violations
- **group** — Groups that should be frames
- **nested-group** — Nested groups detection
- **component** — Missing components where expected

**Typography**
- **typography-style** — Text style not applied
- **typography-check** — Typography doesn't match defined styles (font family, size, weight, line-height, letter spacing, word spacing)
- **line-height** — Inconsistent line heights

**Color**
- **color** — Off-palette color usage
- **color-variable** — Unbound color variables

**Accessibility (ADA / WCAG)**
- **contrast** — Text contrast fails WCAG AA
- **text-size-mobile** — Text too small for mobile (ADA compliance)

### Auto-Fix & Batch Operations

Don't just find issues — fix them:

- **"Fix all now"** per issue type with progress bar and cancel support
- **"Suggest Fix"** with visual comparison and similarity score
- **"Apply All"** to batch-apply suggested fixes
- Create missing text styles, color styles, and variables directly from issues
- Convert groups to frames, rename layers, bind color variables — all in one click
- Remove empty frames and clean up unused layers in bulk

### Design Token Extraction

Extract a complete token set from your file:

- **Colors** — Extract from Color Styles and Color Variables, with custom naming
- **Typography** — Extract text styles for Desktop, Tablet, Mobile, or All breakpoints
- **Spacing** — Auto-detect spacing scale from your layouts
- Fill your scan scales directly from extracted tokens

### Typography Style Management

Define and manage your typography rules with a full editable table:

- Style Name, Font Family, Font Size, Font Weight, Line Height, Letter Spacing, Word Spacing
- Toggle which properties to check per style
- Load fonts directly into your document

### Interaction / Animation Scanning

Scan and report all interactions and animations in your file — useful for design handoff and documentation.

### Settings & Configuration

- Customize scales and thresholds for spacing, font size, line height, and colors
- Define skip names to exclude specific layers from scanning
- **Save / Load / Import / Export** settings — share configurations across your team
- Settings history with restore support

### Reporting & Export

- Filter issues by severity (error / warning / all)
- Search issues by keyword
- **Export report to HTML** for sharing with stakeholders
- Scan history — save, load, and compare previous scan results
- Ignore individual issues with toggle state

## Installation

### From Figma Community (recommended)

1. Search for **"Design QA Checker"** in Figma → Plugins
2. Click **Install**

### For Development

```bash
npm install
```

Build the plugin:

```bash
npm run build       # Build once
npm run watch       # Auto-rebuild on code changes
npm run prod        # Production build + inject assets
```

Load into Figma:
1. Figma → Plugins → Development → **Import plugin from manifest...**
2. Select the `manifest.json` file from this folder

## How to Use

1. Open Figma → Plugins → **Design QA Checker**
2. Choose scan scope: **Entire Page** or **Selection**
3. Click **Scan Design** to run the audit
4. Review issues grouped by type and severity
5. Use **Suggest Fix** or **Fix all now** to resolve issues
6. Switch to **Tokens** tab to extract design tokens
7. Go to **Settings** to customize rules and scales for your project
