# Banner Cloner Pro - Photoshop UXP Plugin

## Overview
Plugin Photoshop UXP giup clone artboard nguon thanh nhieu banner sizes khac nhau. Dung cho workflow tao banner ads nhieu kich thuoc tu 1 design goc.

## Tech Stack
- **Platform**: Adobe UXP (Unified Extensibility Platform) for Photoshop
- **API**: Photoshop batchPlay API (action module), apiVersion 2
- **UI**: Vanilla HTML/CSS/JS (khong co build step, khong framework)
- **Manifest**: UXP manifest v5, min Photoshop 23.0.0

## Project Structure
```
manifest.json   — UXP plugin config (panel entrypoint)
index.html      — UI panel layout
styles.css      — Dark theme styles (CSS variables)
main.js         — All plugin logic (batchPlay commands, UI handlers)
```

## How It Works
1. User chon 1 artboard trong Photoshop
2. Nhap target sizes (vd: 300x250, 160x600) hoac chon tu preset chips
3. Click "Clone Artboards" -> plugin duplicate artboard goc, resize frame, rename, xep ke nhau (gap 80px)

## Key Functions (main.js)
- `resolveSelectedArtboard()` — Tim artboard goc tu layer dang chon (traverse len parent)
- `duplicateArtboardById()` — Duplicate artboard bang batchPlay
- `setArtboardRect()` — Set artboard frame size (khong resize content)
- `cloneAll()` — Main flow: loop qua targets, duplicate + rename + resize
- `bp()` — Wrapper cho `action.batchPlay()` voi synchronousExecution

## Preset Sizes
10 standard ad sizes: 300x250, 160x600, 728x90, 970x250, 300x600, 320x50, 320x100, 336x280, 250x250, 200x200

## Development
1. Install Adobe UXP Developer Tool
2. Add plugin folder trong UXP Dev Tool
3. Load vao Photoshop
4. Panel xuat hien o menu Plugins > Banner Cloner Pro

## Known Limitations
- Chi resize artboard frame, chua auto-layout content ben trong
- Checkbox "Giu vi tri content" (`keepOffset`) chua duoc implement trong code
- Chua co export batch PNG/JPG
- Chua co layer mapping (logo, headline, CTA)

## Conventions
- Tat ca logic nam trong 1 file `main.js` (single-file architecture)
- UI text mix tieng Viet va tieng Anh
- Dung batchPlay thay vi DOM API cua Photoshop UXP de co nhieu control hon
- Modal execution via `core.executeAsModal()` cho cac thao tac thay doi document
