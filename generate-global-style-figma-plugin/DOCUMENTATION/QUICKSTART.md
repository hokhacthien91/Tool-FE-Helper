# Quickstart — Generate Global Style (Short)

1) Install the plugin in Figma (dev):

- Open Figma Desktop → Plugins → Development → Import plugin from manifest... → select this repository's `manifest.json` (path: `manifest.json`).
- After import, run it from Plugins → Development → Generate Global Style.

2) Basic usage flow:

- Open plugin UI.
- Choose to `Import Tokens` (upload JSON token files) or paste a single Global Style JSON object.
- Configure options:
  - `prefix`: optional project prefix to namespace collections/styles.
  - `createVariables`: create Figma Variables/Text Styles from tokens.
  - `generateLayout`: create the visual `Global Style` frame in the canvas.
  - `duplicateAction`: `skip` or `overwrite` when items already exist.
- Click `Generate` / `Import`.

3) Duplicate flow:

- If duplicates are detected the plugin will send `duplicatesFound` to the UI and prompt you to choose `skip` or `overwrite`.

4) Reverse-export (generate from Figma):

- Use `Generate from Figma` to create a preview frame from the current Figma Variables and Text Styles.

5) Export tokens:

- Use `Export Tokens` in the plugin UI to get a JSON export of existing tokens (colors, typography, spacing, shadows, borders, breakpoints, buttons).

Notes & tips:
- If a font used by a text style is not available in Figma, the plugin will attempt fallbacks and notify via UI.
- For reliable imports, use token JSON that follows the project's expected schema; the parser handles several common shapes but validation is recommended.
