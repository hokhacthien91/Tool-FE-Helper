# CLAUDE.md — Page Guides Inspector (Photoshop UXP)

Hướng dẫn cho Claude Code khi làm việc với plugin Photoshop UXP này.

---

## Project Overview

Adobe Photoshop UXP Plugin (Manifest v5) — dạng panel dockable.
Clone từ plugin InDesign "Page Guides Inspector", chuyển toàn bộ API sang Photoshop UXP.

**Không có build process** — chỉnh sửa file và reload trong UXP Developer Tools là đủ.

**Reload plugin:** UXP Developer Tools → tìm plugin → nhấn **Reload**
**Clear cache nếu lỗi lạ:** `rm -rf ~/Library/Caches/Adobe/UXP/`
**Host:** Photoshop >= 24.0 | Plugin ID: `com.toolstudio.pageguidesinspector.ps`

---

## Architecture

Toàn bộ plugin gồm 3 file chính:

- **`index.html`** — UI structure (scope toggle Canvas/Layers info, page setup card, airbus spacing card)
- **`index.js`** — toàn bộ business logic, wrapped trong một `DOMContentLoaded` listener duy nhất
- **`styles.css`** — dark theme, hard-coded hex, copy từ InDesign version

Không có module system, không có dependencies ngoài UXP runtime.

### State (index.js)

```javascript
let currentDoc      = null;  // Photoshop Document object
let currentPage     = null;  // alias cho currentDoc (PS không có pages)
let displayUnitName = "px";  // "px" | "in" | "mm" | "cm" | "pt"
let scopeMode       = "active"; // "active" | "all"
let snapshot        = null;  // for canvas setup revert
let docResolution   = 72;    // PPI — dùng cho unit conversion
let aW_global       = 0;     // letter-A width (px) sau logo scale — dùng bởi zone helpers
let aH_global       = 0;     // letter-A height (px) sau logo scale
```

### Airbus spacing state

```javascript
let fitTargetId    = null;          // layer id của Logo (cache)
let fitTargetName  = "Logo-airbus";
let letterRefName  = "letter-A";
let urlBlockName   = "URL-block";
let qrBlockName    = "QR-code";
let mainName       = "Main-headline";
let campName       = "campaign-line";
let subName        = "Sub-headline";
```

### Flow chính

```
refresh()
  → require("photoshop").app.activeDocument
  → docResolution = doc.resolution
  → readIntoInputs() → doc.width/height + loadLocalPageState() cho bleed/margin/col
  → loadFitTarget() → loadLocalPageState().fitTarget → restore UI

applyChanges() [async]
  → validate inputs
  → executeAsModal → batchPlay canvasSize (resize canvas)
  → saveLocalPageState({bleedT, marginL, colCount, ...})

applyAirbusLayout() [async]
  → findItemByName() [recursive layer search]
  → computeColumnWidthPx()
  → tính logo scale, aW, aH
  → 2-pass computeComponentBounds()
  → executeAsModal:
      setLayerGeometricBounds() [scale + translate]
      layer.duplicate() + layer.opacity + layer.move()
```

---

## UXP Constraints — BẮT BUỘC phải tuân theo

1. **`require()` phải gọi bên trong function** — top-level gây "Unhandled promise rejection"
2. **Mọi layer modification phải trong `executeAsModal`** — không exception
3. **`window.confirm()` / `window.alert()` không hoạt động** — phải build inline UI bằng DOM
4. **`inset: 0` không hoạt động** — UXP dùng WebKit cũ. Phải viết đầy đủ: `top:0; left:0; right:0; bottom:0; width:100%; height:100%`
5. **Spectrum CSS variables không hoạt động** — dùng hard-coded hex
6. **`innerHTML` trên button/interactive element** có thể phá hit-testing trong UXP — dùng `createElement` + `addEventListener`

---

## Photoshop API — Những điểm khác InDesign

### Module
```javascript
// KHÔNG dùng require("indesign") — dùng:
function getPhotoshop() {
  const ps = require("photoshop"); // gọi TRONG function
  return ps;
}
// Access: ps.app, ps.core, ps.action, ps.Constants
```

### Units
```javascript
// InDesign: points (pt). Photoshop: PIXELS.
// Conversion qua docResolution (PPI):
function pxPerUnit(unitName) {
  const res = docResolution || 72;
  // "px": 1, "in": 1/res, "mm": 25.4/res, "cm": 2.54/res, "pt": 72/res
}
```

### Undo block
```javascript
// InDesign: app.doScript(fn, ..., UndoModes.ENTIRE_SCRIPT, "name")
// Photoshop:
await ps.core.executeAsModal(async () => {
  // tất cả operations ở đây = 1 undo step
}, { commandName: "Apply Airbus layout" });
```

### Canvas resize
```javascript
// Không có direct setter. Dùng batchPlay:
await ps.action.batchPlay([{
  _obj: "canvasSize",
  width:  { _unit: "pixelsUnit", _value: Math.round(newW) },
  height: { _unit: "pixelsUnit", _value: Math.round(newH) },
  canvasSizeAnchor: { _enum: "quadCenterState", _value: "QCSCenter" }
}], { synchronousExecution: false });
```

### Bounds (đọc)
```javascript
// InDesign: item.geometricBounds → [y1, x1, y2, x2]
// Photoshop:
const b = layer.bounds; // {left, top, right, bottom} in PIXELS
const [y1, x1, y2, x2] = [b.top, b.left, b.bottom, b.right];
```

### Bounds (ghi) — QUAN TRỌNG
```javascript
// InDesign: item.geometricBounds = [y1, x1, y2, x2]
// Photoshop: KHÔNG có direct setter. Dùng hàm mới:
async function setLayerGeometricBounds(layer, ty1, tx1, ty2, tx2) {
  // Scale nếu cần (skip nếu scale = 100%)
  await layer.scale(scaleX%, scaleY%, Constants.AnchorPosition.TOPLEFT);
  // Translate về đúng vị trí
  await layer.translate(tx1 - newBounds.left, ty1 - newBounds.top);
}
// Với text layers (Main/Camp/Sub): chỉ translate() không scale()
// vì scale() trên text layer gây distort.
```

### Layer search
```javascript
// InDesign: doc.allPageItems (flat list)
// Photoshop: phải traverse recursive:
function findItemByName(doc, keyword) {
  function search(layers) {
    for (layer of layers) {
      if (layer.name.includes(kw)) return layer;
      if (layer.layers) { const found = search(layer.layers); if (found) return found; }
    }
  }
  return search(doc.layers);
}
```

### Validity check
```javascript
// InDesign: item.isValid
// Photoshop: không có .isValid
function isLayerValid(layer) {
  try { const _ = layer.name; return true; } catch(_) { return false; }
}
```

### Create group
```javascript
// InDesign: doc.layers.add({name: "Guide"})
// Photoshop: (trong executeAsModal)
const group = await doc.createLayerGroup({ name: "Guide" });
```

### Duplicate + opacity + move
```javascript
// InDesign: clone = item.duplicate(); clone.transparencySettings...opacity = 50; clone.itemLayer = guideLayer;
// Photoshop:
const clone = await layer.duplicate();           // async
clone.opacity = 50;                              // sync, direct property
clone.move(guideGroup, Constants.ElementPlacement.PLACEATEND); // sync, no await
```

### Persistence
```javascript
// InDesign: doc.insertLabel(key, value) / doc.extractLabel(key)
// Photoshop: localStorage (không embedded trong PSD)
function getPageStateKey() {
  return "pageGuides.ps.page." + (doc.path || doc.title || "untitled");
}
window.localStorage.setItem(key, JSON.stringify(data));
window.localStorage.getItem(key);
```

---

## Lưu ý khi sửa code

### Margin/Bleed values
Bleed, Margin, Columns KHÔNG có trong Photoshop natively. Chúng được:
- Lưu vào `localStorage` khi user bấm Apply
- Đọc từ `localStorage` khi `readIntoInputs()`
- Dùng trực tiếp từ input fields khi tính Airbus layout (`displayToPx(inpMarginL.value)`)
- **Không đọc từ localStorage khi apply layout** — luôn dùng giá trị input field hiện tại

### aW_global / aH_global
Hai biến module-level này được set trong `applyAirbusLayout()` và dùng bởi các zone helper functions (`computeLogoGuideZones`, `pushZonesForPseudoComponent`, `pushZonesFixed2AColumn`). Phải set trước khi gọi các helper đó.

### Async flow
`applyAirbusLayout()` và `applyChanges()` là async. Event listeners wrap chúng:
```javascript
btnApplyLayout.addEventListener("click", () => {
  applyAirbusLayout().catch(e => setStatus("...", "err"));
});
```

### Scale vs Translate cho text layers
`setLayerGeometricBounds()` tự skip `scale()` nếu `|scaleX - 100| < 0.01` và `|scaleY - 100| < 0.01`. Main/Camp/Sub giữ nguyên w/h (kế thừa từ InDesign logic), nên chúng chỉ cần translate — scale call bị skip tự động, tránh distort text.

### Logic tính layout — giữ nguyên từ InDesign
Các function sau **không phụ thuộc InDesign API**, logic giữ nguyên 100%:
- `computeComponentBounds()` — tính [y1,x1,y2,x2] cho 1 component
- `computeLogoGuideZones()` — A guide zones cho Logo/URL/Main
- `pushZonesFixed2AColumn()` — A guide zones cho QR/Camp/Sub
- `pushZonesForPseudoComponent()` — wrapper cho non-logo components
- `projectLetterAToNewLogo()` — project letter-A position sau logo scale
- 2-pass plan logic (pass1: container refs, pass2: component refs)

---

## Roadmap chưa implement

- Persistence nhúng vào PSD (XMP broken từ PS 27.0 — theo dõi Adobe release notes)
- Auto-create PS guide lines cho margin/bleed values
- Artboard support cho page picker
- Resolution editing
- Batch apply, CSV import
