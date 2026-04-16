# Replace Matching Layers — Photoshop UXP Plugin

Plugin cho Adobe Photoshop giúp thay hàng loạt các layer/group **tương ứng** với một source mà bạn đã chỉnh sửa xong, giữ nguyên **vị trí, parent, layer order** của target cũ.

## Cài đặt (Developer mode)

1. Tải [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/) (UDT) từ Creative Cloud Desktop.
2. Mở UDT, chọn **Add Plugin…**, trỏ tới file `manifest.json` trong thư mục này.
3. Bấm **Load** trên dòng plugin để mount panel vào Photoshop.
4. Trong Photoshop: `Plugins ▸ Replace Matching Layers ▸ Replace Matching Layers` để mở panel.

> Yêu cầu: Photoshop 23.0+.

## Cách dùng cơ bản

1. Chọn đúng **một** layer hoặc group trong Photoshop (đây là source).
2. Trong panel, bấm **Refresh** ở section *Source*.
3. Cấu hình **Match rules** (mặc định: name + type — an toàn).
4. Chọn **Scope**: current document / selected artboards / opened documents.
5. Bấm **Find Matches** → review danh sách target ở khung Preview.
6. Tick/untick từng target nếu cần. Có thể **Dry Run** để xem log trước.
7. Bấm **Apply Replace**. Toàn bộ batch nằm trong một lần Undo.

## Match rules

- **Exact name** — `target.name === source.name`.
- **Same type** — cùng kind (group, text, pixel, shape, smartObject, …).
- **Same parent path** — đường dẫn phân cấp tương đối **trong artboard** trùng nhau.
- **Same artboard name** — chỉ match nếu cùng tên artboard.

Presets:
- **Safe Default**: name + type.
- **Name only**: dễ overmatch — panel sẽ cảnh báo nếu match nhiều.
- **Strict**: name + type + parent path.

## Position modes

- **Keep target bounds** (mặc định): scale + translate duplicate sao cho bounds trùng target cũ.
- **Keep target anchor**: giữ scale của source, chỉ dịch theo anchor (top-left / center / bottom-left).
- **Use source position**: giữ nguyên vị trí source.

## Risk flags

| Flag | Ý nghĩa |
| --- | --- |
| `SAFE` | không phát hiện rủi ro |
| `LOCKED` | target bị lock — bị skip nếu *Skip locked targets* bật |
| `TYPE_MISMATCH` | source và target khác type (chỉ xảy ra khi tắt rule *Same type*) |
| `CLIPPING_RISK` | target nằm trong clipping chain |
| `MASK_RISK` | target có layer/vector mask mà source có thể không có |
| `SMART_OBJECT_RISK` | smart object lồng — render có thể đổi theo context |

## Phạm vi V1 / Roadmap

| Tính năng | Trạng thái |
| --- | --- |
| Current document scope | ✅ |
| Selected artboards scope | ✅ |
| All opened documents scope | ✅ |
| Choose PSD files / folder recursive | ⏳ V2 |
| Match rules (name / type / path / artboard) | ✅ |
| Position modes (3 mode) | ✅ |
| Preserve options | ✅ |
| Risk flags | ✅ |
| Preview + filter + select all/none | ✅ |
| Batch undo (1 history step) | ✅ |
| Logging + clipboard export | ✅ |

## Cấu trúc code

```
manifest.json
index.html
index.js                — UI controller
styles.css
src/
  types.js              — LayerType + Risk constants
  ps.js                 — wrapper an toàn quanh Photoshop UXP API
  sourceInspector.js    — đọc selection thành LayerNodeMeta
  treeScanner.js        — walk document/artboard/group tree
  matcher.js            — apply match rules, exclude source subtree
  previewModel.js       — risk flags, group cho UI
  positioning.js        — keepBounds / keepAnchor / useSource
  replaceEngine.js      — duplicate → move → reposition → delete
  fileScopeManager.js   — resolve scope thành root nodes
  logger.js             — INFO/WARN/ERROR + DOM render
```

## Ghi chú an toàn

- Source **không bao giờ bị xóa**.
- Target chỉ bị xóa **sau khi** duplicate source đã thành công. Nếu delete fail, plugin cố gắng cleanup duplicate.
- Toàn bộ replace nằm trong `executeAsModal` + `suspendHistory` → một lần Undo gom lại tất cả thay đổi (khi API hỗ trợ).
