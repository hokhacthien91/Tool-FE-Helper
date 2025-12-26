# Generate Global Style Plugin

This is a Figma plugin to generate a Global Style guide from a JSON file.

## Usage

1. **Open Figma Desktop App**.
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select the `manifest.json` file in this directory.
4. Run the plugin **Generate Global Style**.
5. Click **Choose File** and select your `global.json` file.
6. Click **Generate**.

## Features

- Generates Color Palette with swatches and hex codes.
- Generates Typography sections for Desktop and Mobile/Tablet.
- Generates Spacing scale visualization.

## Structure

- `manifest.json`: Plugin configuration.
- `ui.html`: The UI for file upload.
- `code.js`: Main logic for parsing JSON and creating Figma nodes.

