# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Adobe InDesign UXP Plugin (Manifest v5) — dạng panel dockable.  
**Không có build process** — chỉnh sửa file và reload trong UXP Developer Tools là đủ.

**Reload plugin:** UXP Developer Tools → tìm plugin → nhấn **Reload**  
**Clear cache nếu lỗi lạ:** `rm -rf ~/Library/Caches/Adobe/UXP/`

---

## Architecture

Toàn bộ plugin gồm 2 file chính:

- **`index.html`** — UI + toàn bộ CSS inline (dark theme, hard-coded hex, không dùng Spectrum variables)
- **`index.js`** — toàn bộ business logic, wrapped trong một `DOMContentLoaded` listener duy nhất

Không có module system, không có dependencies ngoài UXP runtime.

### State (index.js)

```javascript
let selectedTextFrame    = null;  // InDesign TextFrame object
let selectedImageFrame   = null;  // InDesign Rectangle object
let selectedNewImageFile = null;  // UXP File object
let anchorMap = [];               // anchored objects trong text frame hiện tại
```

### Flow chính

```
app.selection[0]
  → constructor.name === "TextFrame"   → buildAnchorMap() → mở textReplaceModal
  → constructor.name === "Rectangle"  → mở imageReplaceModal
```

**Text replace** dùng `texts.item(0).contents = newText` (giữ formatting).  
Nếu frame có anchored objects (inline icon/AI), `buildAnchorMap()` convert chúng thành `{{IMG_n}}` placeholder — `replaceTextSegments()` replace từng đoạn text xung quanh anchor chars, không đụng tới anchor char `￼`.

**Image replace** chạy bên trong `app.doScript(..., UndoModes.ENTIRE_SCRIPT)`:  
`place()` → `FRAME_TO_CONTENT` → đọc native size → tính scale → set `geometricBounds` mới → `FILL_PROPORTIONALLY`.

---

## UXP Constraints — BẮT BUỘC phải tuân theo

1. **`require()` phải gọi bên trong function** — top-level gây "Unhandled promise rejection"
2. **`window.confirm()` / `window.alert()` không hoạt động** — phải build inline UI bằng DOM
3. **`inset: 0` không hoạt động** — UXP dùng WebKit cũ. Phải viết đầy đủ: `top:0; left:0; right:0; bottom:0; width:100%; height:100%`
4. **Spectrum CSS variables không hoạt động** — dùng hard-coded hex
5. **`innerHTML` trên button/interactive element** có thể phá hit-testing trong UXP — dùng `createElement` + `addEventListener`

---

## InDesign API Quirks

- `geometricBounds` = `[y1, x1, y2, x2]` — **không phải** `[x1, y1, x2, y2]`
- Image frame type là `"Rectangle"` — không phải `"Image"` hay `"ImageFrame"`
- `recompose()` phải chạy **TRƯỚC** khi restore `textFramePreferences` — ngược lại InDesign override lại
- Luôn check `isValid` trước mọi thao tác với frame reference (có thể bị xóa)
- Không dùng `FRAME_TO_CONTENT` để auto-fit text overflow — sẽ thay đổi geometry, phá layout

---

## Modal System

- `body.modal-open .panel { pointer-events: none }` — panel bị block khi modal mở
- `.modal-overlay.active *` có `pointer-events: auto` riêng — textarea và button trong modal vẫn hoạt động
- Mọi inline warning/confirm UI (file lớn >50MB, xóa anchor placeholder) đều render vào `replaceImageStatus` / `replaceStatus` div — không dùng native dialog

---

## Roadmap chưa implement

- Batch replace, CSV import
