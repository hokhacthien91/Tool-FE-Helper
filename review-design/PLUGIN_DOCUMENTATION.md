# Plugin Documentation

Table of Contents

- Introduction
- Installation
- Main Tabs
  - Tab 1: Breakpoint Generator
  - Tab 2: For Email
  - Tab 3: Export JSON
  - Tab 4: QA Checker
  - Tab 5: Export GIF
- Detailed Workflows (screenshot placeholders)
- Troubleshooting & FAQ
- Changelog

---

## Introduction

Plugin này giúp hỗ trợ quy trình kiểm tra thiết kế và xuất assets từ Figma/ứng dụng tương thích. Mục tiêu chính: tự động hoá breakpoint, tối ưu email, xuất JSON cho dev, kiểm tra QA nhanh và tạo GIF minh hoạ.

## Installation

Prerequisites:

- Node.js (nếu plugin dùng build step)
- Quyền truy cập file/design từ Figma (nếu áp dụng)

Steps:

1. Tải plugin vào Figma hoặc copy thư mục vào environment của bạn.
2. Nếu có build step, chạy:


## Tab 4: QA Checker

Purpose

Check design consistency with defined rules and extract tokens for developer handoff.

Features

1. Scan Controls

| Option | Description |
|---|---|
| Scan Page | Scan entire current page |
| Scan Selection | Only scan selected frame |
| Run QA Scan | Start scanning and find issues |
| Extract Tokens | Extract design tokens from selection |

![QA Scan UI](image-20260113-081342.png)

2. Sub-tabs

- Issues Tab: Displays list of found issues, grouped by category (Typography Style Match, Font Size, Line Height, Contrast (ADA AA), Text Size (ADA), Color). Filter controls: search by node name, severity filter (All / Errors / Warnings).
- Design Tokens Tab: Displays extracted tokens: Colors (by type: text, background, border), Typography (font family, size, weight, line height), Spacing, Border radius.
- Settings Tab: Enable/disable checks and configure rules (font size scale, line height scale, baseline min, color palette, typography styles, skip layer names).

Settings examples:

| Rule | Default |
|---|---|
| Typography Style Match | On |
| Text Style (Variable) | On |
| Font Size | On |
| Line Height | On |
| Contrast (ADA AA) | On |
| Text Size (ADA) | On |

Font Size Scale (example): `12,14,16,18,20,24,32,40,48,64`.

![Design Tokens](image-20260113-081502.png)
![Settings Tab](image-20260113-081530.png)

Results & Output

- Issues list with severity, node path, message and `Goto` link.
- Export QA report as JSON for CI integration.

---

## Tab 5: Export GIF

Purpose

Create GIF animation from component variants or child frames.

Requirements

Select a Component Instance with multiple variants, OR select a Frame containing multiple child frames.

Configuration

| Setting | Description | Default |
|---|---:|---:|
| Width | Output width | 600px |
| Height | Output height | 400px |
| Scale | Export scale (0.5x - 3x) | 2x |
| FPS | Frames per second | 25 |
| Delay | Delay between frames (ms) | 500ms |
| Pad X | Left/right padding | 0 |
| Pad Y | Top/bottom padding | 0 |
| Background | Background color | #FFFFFF |
| Loop | Loop forever | On |

Overlay Layers: Select layers at the same level as frame to overlay on GIF (e.g., cursor, highlight).

![GIF Settings](image-20260113-081804.png)

Export GIF Workflow

1. Select component instance or frame containing animations
2. Plugin displays number of frames
3. Adjust settings (size, delay, scale)
4. (Optional) Select overlay layers
5. Click "Preview" to preview
6. Click "Download" to download GIF

![GIF Preview](image-20260113-081816.png)

---

## Detailed Workflows

Below are the primary workflows with steps and placeholders for screenshots.

### Workflow 1: Convert Desktop to Mobile

[Select Desktop Frame] -> Open Plugin > Breakpoint Generator Tab -> Select Target Breakpoints: 414, 768, 1024 -> Adjust Padding & Max Gap -> Click Generate -> Review Results -> [OK | Needs Fix]

If Needs Fix: Manual Adjust in Figma.

### Workflow 2: Email Development

Design Desktop Email -> Export Images (For Email Tab) -> Copy Content + Styles for each section -> Generate Dark Mode Simulation -> Review Dark Mode -> Export for Compare (DOCX)

### Workflow 3: QA Check Design

Select Frame to Check -> Open Plugin > QA Checker Tab -> Configure Settings (Font Scale, Colors, Typography) -> Click Run QA Scan -> Review Issues -> [Auto Fix | Manual Fix in Figma] -> Verify -> Re-scan

---

## Troubleshooting

Issue 1: Icons are distorted/scaled after generate

Cause: Icon not properly identified

Solution:

- Ensure icon is in frame ≤ 120px
- Icon frame must contain VECTOR or GROUP nodes
- Or name frame containing "icon" or "logo"

Issue 2: Frame width still larger than mobile

Cause: GROUP nodes exist or constraints are wrong

Solution:

- Plugin auto-ungroups - verify again
- Check constraints of children

Issue 3: Layout doesn't convert to vertical

Cause: Frame matches UI control pattern

Solution:

- When modal appears, select "Skip Matching" to convert to vertical
- Or modify UI Control Patterns in Advanced Settings

Issue 4: Manual sections not replaced

Checklist:

- [ ] Section name has suffix `- manual` (space before dash)
- [ ] Added frame containing mobile sections
- [ ] Enabled checkbox "Enable Manual Section Replacement"

Issue 5: QA Scan doesn't find issues

Solution:

- Check `Settings > Check Rules` are enabled
- Check Font Scale and Color Palette are configured
- Try scanning entire Page instead of Selection

Contact & Support

Version: 2.0

Author: Thien Ho

Issues: [Report bugs here]
3. Click "Add Selected Frame" to add frame containing mobile sections.
4. Enable checkbox "Enable manual section replacement".

![Manual Sections](image-20260113-074510.png)

5. Advanced Settings

| Setting | Description |
|---|---|
| Preserved Components | List of component names that won't be detached (keep instance intact) |
| UI Control Patterns | Patterns to identify UI controls (will keep horizontal layout) |
| Muted Frames | Frames that selected "Don't ask again" - will auto-apply previous choice |

![Advanced Settings](image-20260113-074525.png)

6. Font Size Options

| Option | Description |
|---|---|
| Keep font size | Keep original font sizes unchanged |
| Map text styles | Convert Desktop/H1 -> Mobile/H1 (if style exists) |
| Scale font size | Multiply font size by factor (default: 0.85) |

![Font Options](image-20260113-074553.png)

Generate Breakpoint Workflow

1. Select desktop frame on canvas
2. Plugin displays frame information
3. Select target breakpoints (414, 768, 1024)
4. Adjust padding and max gap for each breakpoint
5. (Optional) Configure slider mode
6. (Optional) Add manual source frames
7. Click "Generate" or "Generate X Breakpoints"
8. Plugin creates new frames next to original frame

Automatic Features (Behind the Scenes)
When you click "Generate", the plugin automatically performs these optimizations:

Layout Conversion

| Feature | Description |
|---|---|
| Horizontal → Vertical | Auto-convert HORIZONTAL layouts to VERTICAL when children don't fit in target width |
| FILL width | Children are set to layoutSizingHorizontal: FILL for responsive sizing |
| Spacing adjustment | Auto-adjust itemSpacing when converting layout (capped by Max Gap setting) |
| Ungroup GROUPs | Auto-ungroup all GROUP nodes so children can resize properly |
| Auto height | VERTICAL frames set to primaryAxisSizingMode: AUTO to grow with content |

Font/Text Processing

| Feature | Description |
|---|---|
| Map text styles | Auto-map Desktop/H1 → Mobile/H1 (if Mobile style exists in Figma) |
| Scale font size | Multiply font size by scale factor (default: 0.85), minimum 10px |
| Mixed fonts support | Handle text with multiple fonts (styled text) character by character |

Figma Variables Support

| Feature | Description |
|---|---|
| Auto-detect modes | Detect Figma Variables with modes (Desktop/Mobile/Tablet) |
| Apply target mode | Auto-apply spacing values from the mode matching target breakpoint |
| Properties processed | itemSpacing, paddingTop, paddingRight, paddingBottom, paddingLeft |

Image & Media Handling

| Feature | Description |
|---|---|
| Store aspect ratios | Save original image aspect ratios from desktop frame BEFORE cloning |
| Restore aspect ratios | Restore image aspect ratios after frame resize |
| Background cover | Background images resize using background-size: cover; background-position: center logic |
| Media containers | Preserve aspect ratio or fixed height for video/image frames |

Icon Preservation

| Feature | Description |
|---|---|
| Icon detection | Identify icons: frame ≤ 120px containing VECTOR/GROUP, or name contains "icon"/"logo" |
| Store icon sizes | Save icon sizes BEFORE cloning |
| Restore icon sizes | Restore icon sizes after resize (icons are NOT scaled with parent) |

Instance/Component Handling

| Feature | Description |
|---|---|
| Auto-detach instances | Auto-detach all nested instances to allow layout modifications |
| Preserved Components | Components in "Preserved" list will NOT be detached |

UI Controls Detection

| Feature | Description |
|---|---|
| Pattern matching | Identify UI controls (button, btn, cta, input, tab, search...) |
| Keep horizontal | UI controls keep HORIZONTAL layout instead of converting to VERTICAL |
| Keep natural size | UI controls keep their natural size (no FILL width) |

Absolute Positioning Fix

| Feature | Description |
|---|---|
| Overflow detection | Detect absolute-positioned content that overflows |
| Auto-center | Auto-center overflowing content within available width |
| Constraint fix | Change constraint from CENTER/SCALE to MIN (left) to prevent "snap back" |


Details & Behavior:

- Inputs accepted: single frame, multiple selected frames, hoặc toàn bộ artboard folder. Nếu không có selection, plugin gợi ý chọn artboard.
- Breakpoint naming: hỗ trợ templates (ví dụ `sm`, `md`, `lg`) hoặc custom names. Có preview cho mỗi tên.
- Units: `px` và `rem`. Khi chọn `rem`, plugin chuyển giá trị theo base font-size do user nhập (mặc định 16px).
- Output formats:

Purpose

Provide tools to support HTML email development: copy content, inline styles, dark-mode simulation, and bulk image export.

Features

1. Copy Content

Select a text layer on canvas and use the buttons to copy various email-friendly outputs.

| Button | Output |
|---|---|
| Copy Content | Copy plain text content |
| Copy TD Style | Copy inline CSS for `<td>` tag |
| Copy Content + Style | Copy text with full inline style |
| Copy HTML Image | Copy `<img>` tag with src placeholder |
| Copy HTML Banner + Header (HPS) | Copy HTML for banner + header structure |
| Copy HTML TD Background | Copy `<td>` with background image |

![Copy Content UI](image-20260113-080822.png)

2. Dark Mode Simulation

Clone frame and invert colors to simulate email in dark mode.

How to use:

1. Select email frame
2. Enter names of frames not to convert (e.g., Logo, Social icons)
3. Click "Convert to Dark Mode"
4. Plugin creates new frame with `-dark` suffix

Skip Frames: Enter frame names (case-insensitive), one name per line.

![Dark Mode](image-20260113-081035.png)

3. Export for Compare (DOCX vs Design)

Export JSON structure and screenshot to compare with DOCX.

How to use:

1. Enter Project Name (e.g., `mail1`)
2. Click "+ Add Desktop Frame" after selecting desktop frame
3. Click "+ Add Mobile Frame" after selecting mobile frame
4. Click "Export for Compare"

![Export for Compare](image-20260113-081126.png)

4. Export All Images

Export all images in frame by pattern name.

| Image Type | Config |
|---|---|
| Button/Icon | Pattern, Format (PNG/SVG/JPG), Scale, Padding |
| PNG | Pattern, Scale |
| JPG | Pattern, Scale |

Pattern matching: Frames with exact name (case-insensitive) will be exported.

Example Pattern:

```
Button
aton/Buttons
```

Frames named "Button" or "aton/Buttons" will be exported.

![Export Images](image-20260113-081234.png)

---

## Tab 3: Export JSON

Purpose

View and copy JSON structure of selected node, useful for debugging and design analysis.

Interface

| Section | Description |
|---|---|
| Selected Node | Name and type of selected node |
| Preview | Preview image of node |
| Node Structure (JSON) | JSON tree of node and children |
| Properties | Details about position, size, padding |

![Export JSON UI](image-20260113-081307.png)

JSON Output Options

- Minify JSON output: Reduce JSON size by removing whitespace

Displayed Properties

| Property | Description |
|---|---|
| x, y | Node position |
| width, height | Dimensions |
| paddingLeft/Right/Top/Bottom | Padding (only for auto-layout frames) |

1. Chọn frame/artboard email.
2. Điều chỉnh settings (width, inline images).
3. Nhấn `Export` → nhận HTML sẵn dùng copy/paste.

Details & Behavior:

- Output HTML được tối ưu cho client email: tất cả style chính (layout, padding, widths) được chuyển thành inline CSS khi chọn `Inline CSS`.
- Image handling:
  - `Embed Images`: convert ảnh thành base64 và nhúng vào `src` nếu kích thước < threshold (mặc định 50KB). Có tùy chọn force-embed.
  - Nếu hình lớn hơn threshold, plugin gợi ý host externally và tạo placeholder URL list.
- Table-based layout: bật `Use Tables` để xuất layout dạng bảng (nên dùng cho Outlook legacy).
- Fonts: thay font-family custom bằng fallback hoặc gợi ý sử dụng web-safe fonts (tùy chọn `Replace non-webfonts`).
- Sanitization: loại bỏ script, font-face phức tạp và các thuộc tính CSS không hỗ trợ mail client (ví dụ `position: absolute`).

Validation & Notes:

- Kiểm tra width: nếu frame width > 1200px plugin cảnh báo (email thường dùng < 700px).
- Nếu có linked components/variants phức tạp, kết quả có thể khác so với rendering trong Figma.

---

## Tab 3: Export JSON

Purpose:

- Xuất dữ liệu design (tokens, màu, spacing, typography) dưới dạng JSON cho dev.

UI & Controls:

- Selections: `Tokens`, `Colors`, `Spacing`, `Typography`.
- Options: flatten hierarchy, include raw values, naming convention.

Output Structure (ví dụ):

```json
{
  "colors": { "primary": "#FF0000" },
  "typography": { "h1": {"size": 32, "weight": 700} }
}
```

Workflow:

1. Chọn các category cần export.
2. Chọn format/option.
3. Nhấn `Export JSON` → tải file hoặc copy nội dung.

Details & Schema:

- Categories exported:
  - `tokens` (design tokens grouped by category),
  - `colors` (with hex and optional rgba/alpha),
  - `spacing` (numeric values + unit),
  - `typography` (font-family, weight, size, lineHeight, letterSpacing),
  - `assets` (image references: name + path + exportedSizes).
- Options explained:
  - `Flatten hierarchy`: bỏ nested groups, xuất thành key path (e.g. `button.primary.bg`).
  - `Include raw values`: giữ cả giá trị gốc từ Figma (px) và normalized values (rem, percentage).
  - `Naming convention`: hỗ trợ `kebab-case`, `camelCase`, `snake_case`.
- JSON Schema (short):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "colors": {"type":"object"},
    "typography": {"type":"object"}
  }
}
```

Error handling:

- Nếu token duplicate (cùng tên khác value), plugin sẽ warn và thêm suffix `_dupN` nếu user cho phép auto-rename.
- Nếu có value undefined (ví dụ color node bị xóa), sẽ skip và báo trong log.

---

## Tab 4: QA Checker

Purpose:

- Tự động kiểm tra các vấn đề phổ biến trong design trước khi chuyển cho dev hoặc gửi QA.

Checks (có thể tuỳ chỉnh):

- Contrast ratio (WCAG), color contrast warnings.
- Spacing consistency (grid/column misalignment).
- Missing fonts or fallback fonts.
- Images without alt / missing assets.

UI & Controls:

- Toggler cho từng rule, `Run Check` button, results panel với mức độ `Error/Warning/Info`.

Interpreting results:

- Results hiển thị danh sách items, mỗi item có `Goto` để highlight trong design.

Detailed Rules & Thresholds:

- Contrast ratio:
  - Default threshold: 4.5:1 for normal text, 3:1 for large text.
  - Option to set custom thresholds per project.
- Spacing consistency:
  - Detects deviations from base spacing value (mặc định 8px). Report items with spacing not multiple of base hoặc exceeding tolerance (tolerance default 2px).
- Typography consistency:
  - Detects fonts sizes not aligning to scale (e.g., 12, 14, 16, 20...). User có thể import a font-size scale to check.
- Missing assets:
  - Flags images with no export settings or missing linking.
- Accessibility:
  - Detects low-contrast icons, color-only indicators, và missing focus state (if interactive components annotated).

Results panel:

- Items grouped by rule, mỗi item includes: severity (Error/Warning/Info), node path, suggested fix, `Goto` button để highlight node.

Automation / CI:

- Plugin có thể export QA report as JSON cho CI consumption: list of issues with node IDs and rule keys.

Limitations:

- QA Checker relies on static inspection of design nodes; dynamic interactions may not be fully validated.

---

## Tab 5: Export GIF

Purpose:

- Xuất interaction/sequence thành GIF để demo animation hoặc flow.

UI & Controls:

- Timeline selector: chọn frames sequence hoặc record interaction.
- Settings: FPS, looping, resolution, background color.
- Buttons: `Record`, `Preview`, `Export GIF`.

Workflow:

1. Chọn các frames/sequence.
2. Chỉnh FPS và kích thước.
3. Nhấn `Export GIF` → tải file.

Details & Options:

- Input sources:
  - Sequence of frames/artboards (ordered by user),
  - Recorded interactions (recording captures viewport changes and component variant changes).
- Output settings:
  - FPS range: 1–60 (default 15).
  - Resolution: original frame size hoặc scaled down (0.25, 0.5, 1). Scaled up unsupported.
  - Background: solid color hoặc transparent (transparent GIF support limited; PNG sequence + external encoder recommended).
  - Looping: on/off and loop count.
- Encoding:
  - For efficiency, plugin có thể export as optimized GIF (dither/quantize) hoặc as PNG sequence + user can use external tool to encode higher-quality GIF/MP4.
- Performance notes:
  - Long sequences (>100 frames) hoặc high resolution có thể chậm và tốn bộ nhớ; plugin hiển thị estimated size trước export.

Examples & Use-cases:

- Generate a 3-step onboarding animation for marketing.
- Record a component interaction (hover → active) để giới thiệu cho stakeholders.

---

## Detailed Workflows

Mỗi workflow dưới đây có thể đính kèm screenshot — tôi để placeholder để bạn chèn ảnh sau.

1) Tạo breakpoint từ frame

- Step 1: Mở tab `Breakpoint Generator`.
- Step 2: Chọn frame → [screenshot: breakpoint-select-frame.png]
- Step 3: Thêm breakpoint, đặt tên → [screenshot: breakpoint-add.png]
- Step 4: Nhấn `Generate` → download CSS/JSON → [screenshot: breakpoint-result.png]

2) Chuẩn hoá layout cho email

- Step 1: Mở tab `For Email`.
- Step 2: Chọn frame email → [screenshot: email-select.png]
- Step 3: Bật `Inline CSS`, chọn width 600px → [screenshot: email-settings.png]
- Step 4: Nhấn `Export` → copy HTML → [screenshot: email-result.png]

3) Export JSON tokens

- Step 1: Mở `Export JSON`.
- Step 2: Chọn `colors`, `typography` → [screenshot: json-select.png]
- Step 3: Chọn `flatten hierarchy` nếu cần → [screenshot: json-options.png]
- Step 4: Nhấn `Export JSON` → [screenshot: json-result.png]

4) Chạy QA Checker

- Step 1: Mở `QA Checker`.
- Step 2: Bật các rules cần check → [screenshot: qa-rules.png]
- Step 3: Run check → xem results và `Goto` items để sửa → [screenshot: qa-results.png]

5) Export GIF

- Step 1: Mở `Export GIF`.
- Step 2: Chọn frames/record interaction → [screenshot: gif-select.png]
- Step 3: Chọn FPS, resolution → [screenshot: gif-settings.png]
- Step 4: Export → [screenshot: gif-result.png]

---

## Troubleshooting & FAQ

- Không thấy plugin trong Figma: kiểm tra manifest và import đúng folder.
- Export JSON bị thiếu giá trị: kiểm tra naming tokens trong design.
- GIF bị mờ: tăng resolution hoặc FPS.

- Không thấy plugin trong Figma: kiểm tra `manifest.json` có đầy đủ `id`, `name`, `api` fields và folder đã được import vào `Plugins` của Figma.
- Export JSON bị thiếu giá trị: kiểm tra naming tokens trong design và đảm bảo các layer có `Export` settings nếu là assets.
- GIF bị mờ: tăng resolution hoặc FPS, hoặc xuất PNG sequence rồi encode bằng công cụ chuyên dụng.
- Breakpoint overlap warning: chỉnh lại ranges hoặc bật auto-sort trong settings.
- Email layout khác so với preview: email clients khác nhau render CSS khác nhau; thử bật `Use Tables` và `Inline CSS` để tăng tương thích.

FAQ (ngắn):

- Q: Plugin có hỗ trợ multi-page export không?
  - A: Có, chọn nhiều frames/artboards; với JSON export, mỗi artboard được group theo key.
- Q: Có thể tích hợp CI để chạy QA tự động?
  - A: Có thể export QA report JSON; CI script cần parse file này để fail/pass pipeline.

## Changelog

- v1.0.0 - Initial documentation and core features.

---

If you want, I can also:

- Convert this to `README.md` and link from the repo root.
- Insert screenshot files into a `docs/screenshots/` folder with suggested filenames.

---

End of document.
