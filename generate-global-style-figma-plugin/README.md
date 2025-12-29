# Generate Global Style Plugin

A Figma plugin that generates comprehensive Global Style guides from JSON files or existing Figma Variables & Styles.

## Features

### 🎨 **Two Generation Modes**

#### 1. Generate from JSON
- Upload a JSON file containing your design system
- Automatically creates visual style guide
- Supports custom color palettes, typography, and spacing scales

#### 2. Generate from Figma Variables & Styles
- Extracts existing Figma local variables and text styles
- Generates style guide from your current Figma file
- Automatically organizes by breakpoints (Desktop/Tablet/Mobile)

### 📊 **What It Generates**

- **Color Palette**:
  - Organized color swatches with hex codes
  - Grouped by category (Primary, Secondary, Neutral, etc.)
  - Automatically binds to Figma Variables or Paint Styles

- **Typography Styles**:
  - Preview text with actual font styles
  - Supports breakpoint-based organization (Desktop/Tablet/Mobile)
  - Shows font family, size, line height, and letter spacing
  - **Font Fallback Warning**: Automatically detects missing fonts and displays warning text

- **Spacing Scale**:
  - Visual table of spacing values
  - Supports multiple breakpoints
  - Extracted from Figma Number Variables

### ⚠️ **Font Fallback System**

When a font is not available in Figma, the plugin will:
1. Try to load alternative weights (Regular → Medium → Bold)
2. Fallback to Inter Regular if font family not found
3. Display warning text in preview: `(check font-family manual: expected [Font Name] [Style])`
4. Continue generating without crashing

**Example output:**
```
H1: Lorem ipsum dolor sit amet... (check font-family manual: expected Utopia Std Semibold Subhead)
```

This helps you quickly identify which fonts need to be installed in Figma.

## Installation

1. **Open Figma Desktop App**
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file in this directory
4. Plugin is now available in **Plugins > Development > Generate Global Style**

## Usage

### Option 1: Generate from JSON

1. Run the plugin **Generate Global Style**
2. Click **Choose File** and select your JSON file (e.g., `global.json`)
3. Click **Generate from JSON**
4. Plugin will create a "Global Style" frame with all design tokens visualized

### Option 2: Generate from Figma Variables & Styles

1. Ensure your Figma file has:
   - Local Color Variables (for colors)
   - Local Text Styles (for typography)
   - Local Number Variables (for spacing, optional)
2. Run the plugin **Generate Global Style**
3. Click **Generate from Figma Variables & Styles**
4. Plugin will create a "Global Style from Figma" frame

## JSON File Format

See example files in `/design-global-style/` directory:
- `newquest_website_development__copy_-settings.json`
- `hps_ride_red_sweepstakes_email-settings.json`

### Basic Structure

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

## File Structure

- `manifest.json` - Plugin configuration
- `ui.html` - User interface with dual-mode buttons
- `code.js` - Main plugin logic
  - Font loading with fallback system
  - JSON parsing and Figma node generation
  - Figma Variables & Styles extraction

## Troubleshooting

### Missing Fonts

If you see warning text like `(check font-family manual: expected ...)`:
1. Install the required font in your system
2. Restart Figma
3. Re-run the plugin

The plugin will still generate the style guide using fallback fonts.

### Text Styles Not Found

For JSON mode: Ensure your text style names in JSON match exactly with Figma text style names.

### Variables Not Showing

For Figma Variables mode: Make sure you're using **Local Variables** (not from libraries).

