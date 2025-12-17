## Overview
**Design QA Checker** is a Figma plugin for **Gravity Global** design QA. It automatically detects design issues and warnings, and can also extract design tokens.

---

## Core features

### 1. Design Quality Scan (Run Scan)
Scan and detect issues in your design:

#### A. Naming Convention
- Frame/Component: Warn if the name contains **"Frame"** or **"Group"** (default Figma naming)
- Text: Validate against patterns like `Title`, `Desc`, `Label`, `Caption`, `Heading`, `Body`, `Link`, `Button-text`, `Content`

#### B. Structure & Layout
- Groups: Warn when using `GROUP` (prefer `FRAME` + Auto Layout)
  - Exception: icon-only groups (children are vectors/shapes) are **allowed** (no Auto Layout requirement)
- Nested Groups: Detect nested groups (except valid patterns such as button/icon-only patterns)
- Auto Layout: Require Auto Layout for frames/components based on common UI patterns and heuristics
- Empty Frames: Detect empty or redundant frames
- Duplicate Frames: Detect potential duplicates (hash-based)

#### C. Spacing System
- Gap (`itemSpacing`): **Error** if not in the custom spacing scale (with threshold)
- Padding: **Error** if `paddingLeft/Right/Top/Bottom` is not in the custom spacing scale (with threshold)
- Custom scale: Provide a comma-separated scale (example: `0, 4, 8, 12, 16, 24, 32, 40, 48, 64`)
- Threshold: Values **greater than threshold** are treated as pass (special-case)

#### D. Typography
- Font size: Validate against the typography scale (default: `32, 24, 20, 18, 16, 14, 12`)
- Custom font-size scale: Provide your own font-size scale
- Text Style: Warn if text does not use a Text Style (style variable)
- Line Height:
  - Validate line-height against the configured scale (percent-based)
  - Supports `"auto"` (if included in the custom scale)
  - **Error** if below the baseline threshold (default: 120%)
  - Custom scale example: `auto, 100, 120, 140, 150, 160, 180, 200`
- Text too small (Mobile ADA):
  - Only applies when the text is inside a “mobile” frame (width ≤ 768px)
  - **Error** if `fontSize ≤ 12px`

#### E. Color Contrast (Accessibility - WCAG AA)
- Text contrast: Check contrast ratio between text and background
- WCAG AA thresholds:
  - Normal text: ≥ 4.5
  - Large text (≥18px or ≥14px bold): ≥ 3.0
- Supports: semi-transparent backgrounds, gradient backgrounds (average-color approximation), nested backgrounds

#### F. Componentization
- Component reuse: Warn when a frame should be componentized if used ≥ 2 times
- Component patterns: Checks common patterns like `Card`, `Button`, `Header-item`, `CTA`, `Input`, `Select`, etc.

#### G. Position Issues
- Negative position: Warn when a child has negative coordinates (x < 0 or y < 0)

---

### 2. Extract Design Tokens
Extract and aggregate design tokens:

#### A. Colors
- Solid colors: All solid colors (hex / rgba)
- Color types: Categorized by usage:
  - `text`: text color
  - `background`: background color
  - `border`: stroke/border color
  - `shadow`: shadow/effect color
  - `fill`: generic fill color

#### B. Gradients
- Linear, radial, angular, diamond gradients
- Exports gradient strings including color stops

#### C. Typography Tokens
- Font family: All font families (with style)
- Font weight: All font “weights” (derived from font style)
  - Note: shows a per-weight breakdown of `font-family` usage with counts
- Font size: All font sizes
- Line height: All line-heights (percent-based)

#### D. Spacing Tokens
- Border radius: All border-radius values

---

### 3. UI Features

#### A. Scope Selection
- Scan Page: scan the entire current page
- Scan Selection: scan only selected elements

#### B. Customizable Settings
- Spacing scale: input a custom spacing scale
- Font-size scale: input a custom font-size scale
- Line-height scale: input a custom line-height scale (supports `"auto"`)
- Thresholds: configure thresholds for each category

#### C. Filtering & Search
- Filter by Severity: `All`, `Errors`, `Warnings`
- Search: search by message, node name, type, or value
- Color type filter: filter tokens by color type (text/background/border/shadow/fill)

#### D. Results Display
- Grouped issues: issues are grouped by type
- Collapsible groups: expand/collapse each group
- Node selection: click **Select** to select & focus the node in Figma
- Usage count: shows usage counts for tokens
- Font-family breakdown: for **Font Weight** tokens, shows a list of font families + counts
- Token groups are always shown (including `0`); empty groups show “No tokens in this group.”

#### E. Export Reports
- Export HTML: export a standalone HTML report
  - Collapsible groups (default: collapsed)
  - Issue filter: `All / Errors / Warnings` (default: `All`)
- Export PDF: export via browser print flow (opens report for printing)
- Export JSON: export raw report data (issues/tokens)

#### F. Scan History
- Stores the last 10 scans
- Restore and view previous results
- Persists via `figma.clientStorage` (survives plugin reload/unload)
- Auto-restores the most recent report on plugin startup (issues or tokens)

---

### 4. Smart Features

#### A. Issue Grouping
- Groups similar issues to reduce duplicates
- Contrast issues: grouped by ratio + colors
- Component issues: driven by usage count

#### B. Node Traversal
- Skips hidden nodes
- Skips nodes named “Sticky Note” and “Not check design”
- Recursively traverses all children

#### C. Background Detection
- Automatically detects background color for text contrast checks
- Supports semi-transparent backgrounds
- Supports gradient backgrounds (average-color approximation)

---

## Code structure

- `code.js`: Core logic (scan rules, token extraction, persistence via `figma.clientStorage`)
- `ui.html`: UI rendering, export (HTML/PDF/JSON), history + auto-restore
- `manifest.json`: Plugin configuration

---

## Use Cases

1. Design review: validate design quality before handoff
2. Design system audit: enforce consistency with the design system
3. Token extraction: extract tokens for engineering handoff / DS tooling
4. Accessibility check: verify color contrast (WCAG AA)
5. Quality guardrails: naming, structure, spacing, typography consistency