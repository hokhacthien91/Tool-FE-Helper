# InDesign → Photoshop Migration Notes

So sánh toàn bộ chức năng giữa plugin InDesign và bản Photoshop.

---

## Tổng quan

| | InDesign plugin | Photoshop plugin |
|---|---|---|
| **File** | `Indesign-UXP-resize/` | `photoshop-uxp-resize/` |
| **Host** | InDesign >= 19.0 | Photoshop >= 24.0 |
| **Manifest ID** | `com.toolstudio.pageguidesinspector` | `com.toolstudio.pageguidesinspector.ps` |
| **Unit mặc định** | in (inches) | px (pixels) |
| **Undo block** | `UndoModes.ENTIRE_SCRIPT` | `core.executeAsModal` |
| **Persistence** | `doc.insertLabel` (trong INDD file) | `localStorage` (machine-local) |

---

## Section 1: Document / Page Setup

| # | Chức năng | INDD | PSD | Ghi chú |
|---|---|---|---|---|
| 1.1 | Đọc canvas W × H | `doc.documentPreferences.pageWidth/Height` (pt) | `doc.width/height` (px) | Đơn vị khác nhau |
| 1.2 | Hiển thị Resolution | ❌ Không có | ✅ `doc.resolution` (read-only) | Tính năng mới trong PS |
| 1.3 | Unit selector (in/mm/cm/pt) | ✅ | ✅ + thêm **px** option | — |
| 1.4 | Live unit conversion | ✅ | ✅ | Logic giữ nguyên, đổi pt↔px |
| 1.5 | Đọc Bleed (T/B/I/O) | ✅ `doc.documentBleed*Offset` (native) | ❌ Removed — not native to PS | |
| 1.6 | Đọc Margin (T/B/L/R) | ✅ `page.marginPreferences` (native) | ⚠️ `localStorage` | PS không có native margin |
| 1.7 | Đọc Columns (count + gutter) | ✅ `page.marginPreferences.columnCount` (native) | ❌ Removed — not native to PS | |
| 1.8 | Live column width hint | ✅ | ❌ Removed | Cùng lý do columns |
| 1.9 | Apply canvas/page size | ✅ ghi `documentPreferences` | ✅ `batchPlay canvasSize` | PS dùng batchPlay |
| 1.10 | Apply Bleed | ✅ ghi `documentBleed*` | ❌ Removed — not native to PS | |
| 1.11 | Apply Margin | ✅ ghi `page.marginPreferences` | ⚠️ lưu `localStorage` only | PS không ghi vào file |
| 1.12 | Apply Columns | ✅ ghi `page.marginPreferences` | ❌ Removed — not native to PS | |
| 1.13 | Enter to apply | ✅ | ✅ | Giữ nguyên |
| 1.14 | Revert setup | ✅ | ✅ | Revert canvas size + local values |
| 1.15 | Snapshot (auto khi load) | ✅ | ✅ | — |
| 1.16 | Scope: "Active page" | ✅ per-page margin/col | ⚠️ → đổi thành **"Canvas"** | PS không có pages |
| 1.17 | Scope: "All pages" | ✅ list tất cả pages + info | ⚠️ → đổi thành **"Layers info"** | Hiển thị canvas size + layer count |
| 1.18 | Page picker dropdown | ✅ chọn page | ❌ Ẩn hoàn toàn | PS không có pages |
| 1.19 | Collapsible "Page setup" section | ✅ | ✅ | Giữ nguyên |

**Legend:**
- ✅ Implement đầy đủ
- ⚠️ Implement với giới hạn / khác biệt
- ❌ Không implement được

---

## Section 2: Airbus Spacing

| # | Chức năng | INDD | PSD | Ghi chú |
|---|---|---|---|---|
| 2.1 | 7 name inputs | ✅ | ✅ | Giữ nguyên |
| 2.2 | "Set" button — gán tên vào object | ✅ `item.name = newName` | ✅ `layer.name = newName` | Tương đương |
| 2.3 | Badge "by name / id / not set" | ✅ | ✅ | Giữ nguyên |
| 2.4 | Input vàng khi name not found | ✅ `doc.allPageItems` search | ✅ recursive `doc.layers` | Search logic khác nhau |
| 2.5 | Disable comp group khi not found | ✅ | ✅ | Giữ nguyên |
| 2.6 | 6 checkboxes bật/tắt component | ✅ | ✅ | Giữ nguyên |
| 2.7 | Anchor H / V per component | ✅ | ✅ | Giữ nguyên |
| 2.8 | A count H / V (1–5) per component | ✅ | ✅ | Giữ nguyên |
| 2.9 | Ref H / V (Trim/Margin/component) | ✅ | ✅ | Giữ nguyên |
| 2.10 | Scale Logo → column width | ✅ `geometricBounds = [...]` | ✅ `setLayerGeometricBounds()` | API khác, kết quả tương đương |
| 2.11 | Scale URL = ½ logo width | ✅ | ✅ | Tương đương |
| 2.12 | Scale QR height = 2×A | ✅ | ✅ | Tương đương |
| 2.13 | QR `fit(FILL_PROPORTIONALLY)` | ✅ `item.fit(FitOptions.FILL_PROPORTIONALLY)` | ⚠️ Không cần | PS: bounds đã đúng, không có content/frame distinction |
| 2.14 | Reposition Main/Camp/Sub | ✅ set `geometricBounds` (w/h giữ nguyên) | ✅ `translate()` only | Text layer safe — không scale |
| 2.15 | 2-pass positioning | ✅ | ✅ | Logic giữ nguyên 100% |
| 2.16 | Clone A guides | ✅ `item.duplicate()` | ✅ `await layer.duplicate()` | Async trong PS |
| 2.17 | Guide container | ✅ Layer "Guide" | ✅ Group "Guide" | Layer → Group |
| 2.18 | Auto-create Guide container | ✅ `doc.layers.add({name})` | ✅ `doc.createLayerGroup({name})` | API khác |
| 2.19 | Wipe Guide trước khi apply | ✅ `item.remove()` | ✅ `await layer.delete()` | Async trong PS |
| 2.20 | A clone opacity 50% | ✅ `transparencySettings.blendingSettings.opacity = 50` | ✅ `clone.opacity = 50` | PS đơn giản hơn |
| 2.21 | Move clone vào Guide | ✅ `clone.itemLayer = guideLayer` | ✅ `clone.move(group, PLACEATEND)` | Sync trong PS |
| 2.22 | Undo toàn bộ = 1 step | ✅ `UndoModes.ENTIRE_SCRIPT` | ✅ `executeAsModal({commandName})` | Tương đương |
| 2.23 | Reset options button | ✅ | ✅ | Giữ nguyên |
| 2.24 | Collapsible "Airbus spacing" | ✅ | ✅ | Giữ nguyên |

---

## Section 3: Persistence & UX

| # | Chức năng | INDD | PSD | Ghi chú |
|---|---|---|---|---|
| 3.1 | Lưu settings vào document | ✅ `doc.insertLabel(key, json)` (embedded trong INDD) | ⚠️ `localStorage` (machine-local) | **Gap lớn nhất** |
| 3.2 | Restore settings khi reload | ✅ `doc.extractLabel(key)` | ✅ `localStorage.getItem(key)` | — |
| 3.3 | Per-document isolation | ✅ vì embedded trong file | ✅ key = `doc.path` | Mất khi đổi máy |
| 3.4 | Lưu collapse state sections | ✅ | ✅ | Giữ nguyên |
| 3.5 | Lưu unit preference | ✅ | ✅ | Giữ nguyên |
| 3.6 | Status bar | ✅ | ✅ | Giữ nguyên |
| 3.7 | Refresh button (↻) | ✅ | ✅ | Giữ nguyên |
| 3.8 | Auto-retry khi app chưa ready | ✅ | ✅ | Giữ nguyên |

---

## API Mapping Table

| InDesign API | Photoshop UXP Equivalent | Async? |
|---|---|---|
| `require("indesign")` | `require("photoshop")` | — |
| `id.app` | `ps.app` | — |
| `app.doScript(fn, ..., ENTIRE_SCRIPT, name)` | `ps.core.executeAsModal(async fn, {commandName: name})` | ✅ async |
| `doc.documentPreferences.pageWidth/Height` | `doc.width / doc.height` (read-only, px) | — |
| `dp.pageWidth = val` | `batchPlay([{_obj: "canvasSize", ...}])` | ✅ async |
| `doc.documentBleed*Offset` | N/A → `localStorage` | — |
| `page.marginPreferences.*` | N/A → `localStorage` | — |
| `doc.allPageItems` | recursive `doc.layers` traversal | — |
| `item.geometricBounds` (get) | `[b.top, b.left, b.bottom, b.right]` từ `layer.bounds` | — |
| `item.geometricBounds = [y1,x1,y2,x2]` (set) | `setLayerGeometricBounds(layer, y1, x1, y2, x2)` | ✅ async |
| `item.isValid` | `isLayerValid(layer)` (try-catch) | — |
| `item.duplicate()` | `await layer.duplicate()` | ✅ async |
| `clone.transparencySettings.blendingSettings.opacity = N` | `clone.opacity = N` | — |
| `clone.itemLayer = guideLayer` | `clone.move(group, ElementPlacement.PLACEATEND)` | ❌ sync |
| `item.remove()` | `await layer.delete()` | ✅ async |
| `item.fit(FitOptions.FILL_PROPORTIONALLY)` | N/A — bounds đã được tính chính xác | — |
| `doc.insertLabel(k, v)` | `localStorage.setItem(key, v)` | — |
| `doc.extractLabel(k)` | `localStorage.getItem(key)` | — |
| `doc.layers.add({name})` | `await doc.createLayerGroup({name})` | ✅ async |
| `layer.allPageItems` | `Array.from(layer.layers)` | — |
| `group.pageItems.item(i)` | `group.layers[i]` | — |
| `item.constructor.name === "Group"` | `layer.layers !== undefined` (heuristic) | — |
| `ptPerUnit(unit)` | `pxPerUnit(unit)` với `docResolution` | — |
| `ptToDisplay(pt)` | `pxToDisplay(px)` | — |
| `displayToPt(str)` | `displayToPx(str)` | — |

---

## Known Gaps (không thể port hoàn toàn)

### 1. Persistence không embedded trong PSD
- **INDD:** settings được lưu trong file INDD → mở file ở bất kỳ máy nào đều có settings.
- **PSD:** dùng `localStorage` → chỉ có trên máy đã set. Nếu share file PSD với người khác, họ phải set lại component names.
- **Fix tương lai:** Photoshop XMP metadata API (hiện bị broken từ PS 27.0). Theo dõi Adobe developer notes.

### 2. Bleed / Columns đã xóa; Margin còn lại nhưng không native
- **Bleed & Columns:** Đã xóa khỏi plugin — không native trong PS và không ảnh hưởng chức năng nào.
- **Margin:** Vẫn có trong plugin vì Airbus spacing cần `marginBounds` để tính vị trí component. Lưu qua `localStorage`, không visible trong PS UI.
- **Fix tương lai Margin:** Tự động tạo Photoshop ruler guides tương ứng với giá trị margin nhập.

### 3. Page picker / Multiple pages
- **INDD:** có thể chọn từng page, margin/col per-page.
- **PSD:** Photoshop không có pages. Artboards là tính năng tương tự nhưng chưa được support trong plugin này.
- **Fix tương lai:** Artboard support — detect `layer.isArtboard` (qua batchPlay) và cho phép chọn artboard.

### 4. QR fit(FILL_PROPORTIONALLY)
- **INDD:** `qrItem.fit(FitOptions.FILL_PROPORTIONALLY)` + `FitOptions.CENTER_CONTENT` để fit content vào frame.
- **PSD:** PS không có content/frame distinction như InDesign. Layer là layer, không có container/content. `setLayerGeometricBounds` resize layer trực tiếp — kết quả tương đương vì QR là thường là smart object.

---

## Code đã giữ nguyên 100% (không đổi API)

Các function sau hoàn toàn độc lập với host API:

```
computeComponentBounds()        // tính [y1,x1,y2,x2] theo anchor + padding + ref
computeLogoGuideZones()         // A guide zones cho Logo
pushZonesForPseudoComponent()   // A guide zones cho URL/Main
pushZonesFixed2AColumn()        // A guide zones cho QR/Camp/Sub (fixed 2A column)
pushZonesFixed2AColumn opts.forceHBottom // Camp & Sub force-bottom
projectLetterAToNewLogo()       // project letter-A position sau scale
computeFittedBounds()           // tính scale về 1 dimension (width/height)
computeContentWidthPx()         // content width = pageW - marginL - marginR
2-pass plan logic               // pass1: container refs, pass2: component refs
populateCountSelect()           // dropdown 1-5
populateRefSelect()             // dropdown Trim/Margin/components
getRefOptions()                 // list ref options
formatNumber()                  // trim trailing zeros
```

---

## Testing Checklist sau khi port

Xem file `test-cases.md` để có toàn bộ test cases chi tiết.

Nhanh nhất để verify port thành công:
1. ✅ Panel load không lỗi, đọc đúng canvas W × H
2. ✅ Unit conversion px ↔ in đúng (1920px ÷ 72PPI = 26.667 in)
3. ✅ Apply canvas resize → PS canvas thực sự thay đổi + undo 1 step
4. ✅ Apply spacing với Logo 400×200px, margin 50px mỗi bên → Logo width = 1820px (content width = 1920-50-50)
5. ✅ Guide clones được tạo trong group "Guide" với opacity 50%
6. ✅ Reload plugin → settings restored từ localStorage
