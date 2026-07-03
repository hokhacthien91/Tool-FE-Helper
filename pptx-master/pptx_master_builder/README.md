# PPTX Master Builder

Turn a PowerPoint file with **approved slide designs** into a file with reusable **slide layouts** — where text and images become editable — instead of rebuilding masters by hand.

## What it does

Given a `.pptx` (slides already approved), the tool:

1. **Classifies** slides by layout (Title, Single Image, Multiple Image, Image Grid, Divider, Thank You…) and **groups** slides that share a layout.
2. **Creates a slide layout** for each group. For every element you decide:
   - **Fixed** — stays in the layout, shown by default on new slides (edit it in *View → Slide Master*).
   - **Editable** — becomes a placeholder: text keeps its original wording + style (type to replace), images become an *Insert Picture* slot.
3. **Keeps the original slides as sample slides** (real text + images) — duplicate one and edit it.
4. Lets you **rename layouts**, **skip layouts**, and **delete stray/overlapping layers** per layout.

Result: a `.pptx` with your layouts in the Slide Master gallery + sample slides to duplicate.

## Run

### Option 1 — Double-click (Mac, recommended for the Studio team)
Double-click **`Start-Mac.command`**. It opens the browser at `http://localhost:8765`.
> First run: if macOS blocks it, right-click → *Open* → *Open*. It auto-installs `python-pptx` if missing.

### Option 2 — Command line
```bash
python3 app.py                        # open the Web UI
python3 build.py input.pptx out.pptx  # build directly, no UI
```

## Using the Web UI

1. **Drag & drop** a `.pptx`.
2. Each layout shows every element (image + text) with a thumbnail, size, and a **Fixed / Editable** toggle. Collapse a layout with the chevron; untick **Create** to skip it; use the trash icon to drop a stray layer.
3. Rename layouts if you want.
4. Click **Build master slides** → **Download .pptx**.

The download is named `{original}_master_{date}.pptx`.

## Requirements
- macOS (preview rendering uses built-in Quick Look; no external app needed)
- Python 3.9+
- `python-pptx` (auto-installed by `Start-Mac.command`, or `pip install python-pptx`)
- Pillow (for preview transparency — usually preinstalled)

## Code structure
| File | Role |
|---|---|
| `classify.py` | Group slides by layout; tag each element (image/text, size, default fixed/editable) |
| `promote.py` | Copy shapes (fix ids, remap images incl. SVG), build title/picture placeholders with original style |
| `layout.py` | Create a new slideLayout part + wire it into the master (globally-unique ids) |
| `build.py` | Orchestrator: classify → build layouts per user choices → keep sample slides |
| `preview.py` | Render slide/element thumbnails via Quick Look (converts SVG icons → PNG) |
| `verify.py` | Sanity-check output (duplicate ids, image refs, placeholder types) |
| `app.py` | Local Web UI (pure Python stdlib — no Flask) |

## Notes & limits
- **New Slide vs Duplicate:** picking a layout from *New Slide* gives editable placeholders (single-color prompt). To keep full formatting (e.g. multi-color titles) and all content, **duplicate a sample slide** instead.
- **Fixed images** show on every slide using that layout but are edited in the Slide Master (shared across slides). **Editable images** are per-slide placeholders.
- The **preview** in the UI is for identifying layouts; the downloaded file always contains the full-fidelity content.
- Tuned for sales-deck style decks (images + text). Complex charts/tables are kept on the sample slide, not turned into layout elements.
- Handles decks with multiple masters, charts, SVG icons, and comments without triggering PowerPoint repair.
