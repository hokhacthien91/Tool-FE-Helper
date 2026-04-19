============================================
  Banner Cloner — Illustrator CEP Plugin
============================================

Clone an Illustrator artboard to multiple banner sizes, with smart
auto-layout (proportional repositioning + background "cover" scaling)
and optional per-element rules from a JSON config.

Compatible with Illustrator 2020+ (CC v24 and newer).

────────────────────────────────────────────
1. INSTALL
────────────────────────────────────────────

macOS:
  Double-click  install-mac.command
  (Enables CEP debug mode + creates a symlink to this folder)

Windows:
  Right-click   install-win.bat → Run as administrator
  (Same: enables debug mode + creates symlink)

Then quit Illustrator and reopen it.
Open the panel from:  Window > Extensions > Banner Cloner

────────────────────────────────────────────
2. QUICK START
────────────────────────────────────────────

  1. Open an .ai file with one source artboard sized like a banner.
  2. Make sure that artboard is the ACTIVE artboard
     (click its name in the Artboards panel, or click on it).
  3. In the Banner Cloner panel:
       - Pick target sizes (preset chips or type "300x250 728x90")
       - (optional) Settings tab → Import JSON for per-element rules
       - Click "Clone Artboards"
  4. Review the new artboards (placed to the right of existing ones).
  5. Click "Export" to save JPG + .ai to a folder of your choice.

────────────────────────────────────────────
3. NAMING CONVENTIONS
────────────────────────────────────────────

The smart-layout engine uses LAYER/GROUP NAMES to match elements.
The conventions are inherited from the Photoshop sister plugin:

  Top-level groups inside the source artboard:
    content              — wrapper group (smart layout descends into it)
    gg-background        — background group (scaled "cover" to fill canvas)
    <other top-level groups are kept as-is>

  Inside the "content" group:
    gg-headline          — repositioned by relative center
    gg-tagline           — repositioned by relative center
    gg-cta               — repositioned by relative center
    gg-logo              — repositioned by relative center
    gg-rectangle-1       — repositioned by relative center
    ...etc.

The "gg-" prefix is configurable in Settings (or leave empty to disable
the prefix filter and process all named groups).

The background-group name is configurable in Settings (default
"gg-background"). Any group with that name is treated as the background
and scaled cover.

────────────────────────────────────────────
4. JSON RULES (optional)
────────────────────────────────────────────

Reuses the same format as the Photoshop BannerCloner plugin:

  {
    "moduleName": "banner-html-v1-foo",
    "sizes": [
      {
        "name": "300x250",
        "width": 300,
        "height": 250,
        "elements": {
          "gg-headline": {
            "fontSize": "20px",
            "top": "30px",
            "left": "20px"
          },
          "gg-cta": {
            "width": "120px",
            "height": "32px",
            "top": "180px",
            "left": "20px"
          },
          "gg-logo": {
            "width": "80px",
            "top": "10px",
            "left": "10px"
          }
        }
      }
    ]
  }

Recognized fields (per element):
  fontSize        — pt / px (text only; AI uses pt natively)
  width, height   — px (non-uniform if both given, uniform-by-W if only W)
  widthElement, heightElement   — same as width/height (alt name)
  top, left, right, bottom      — px from artboard edge
  scale           — multiplier (e.g. 1.5)
  opacity         — 0..1 or 0..100

Elements with rules SKIP smart layout. Background group with a rule
SKIPS the cover scaling (the rule wins).

────────────────────────────────────────────
5. EXPORT
────────────────────────────────────────────

Output folder layout:

  <chosen-folder>/<source-base-name>-output-working-file-<timestamp>/
    output/
      300x250.jpg
      728x90.jpg
      ...
    working-file/
      <source-base-name>.ai

JPG quality is 80 by default.

────────────────────────────────────────────
6. DEBUGGING
────────────────────────────────────────────

The panel uses CEP, which lets you inspect it in Chrome DevTools:

  Open Chrome → http://localhost:8093

Logs from the host script (host.jsx) are streamed to the panel's "Logs"
section after each operation.

Common issues:
  - "EvalScript error" → syntax error in host.jsx; check DevTools console.
  - "Source: No document open" → open an .ai file first, then "Refresh".
  - Items not detected as belonging to source artboard → check that the
    item's geometric center is INSIDE the artboard rectangle.

────────────────────────────────────────────
7. KNOWN LIMITS (v0.1)
────────────────────────────────────────────

  - Documents mode (split each artboard to a separate .ai) — not yet.
  - Assets extraction — not yet.
  - Cloning preserves grouped items as units; if your structure has
    items at the layer top level (not grouped), each one is duplicated
    individually. Group your "content"/"gg-background" before cloning
    for best results.
