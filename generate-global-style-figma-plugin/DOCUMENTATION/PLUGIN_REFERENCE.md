# Generate Global Style — Tài liệu tham khảo (One-page, chi tiết)

Phiên bản: 2.0
Tác giả: Thien Ho

Mục đích: Tài liệu một trang mô tả chi tiết giao diện, cấu hình và quy trình chính của plugin "Generate Global Style" dành cho designer, design-ops, và developer.

-----------

Tab 1: Global Style Generator

Purpose
- Tạo bản preview và/hoặc tạo Figma Variables & Text Styles từ JSON token hoặc từ dữ liệu parsed.

Interface
- Panel cho upload/paste JSON, tuỳ chọn prefix, checkbox `createVariables`, `generateLayout`, `duplicateAction` (skip/overwrite), và nút `Check duplicates` / `Generate`.

Configuration
1) Selected Source
- Hiển thị: nguồn token (uploaded file name hoặc "From Figma"), detected schema, số mục (colors, typography, spacing).

2) Namespace / Prefix
- Input: `prefix` string — sẽ được thêm vào tên collection/text styles (ví dụ `Colors - <prefix>`).

3) Create Options
- `createVariables`: tạo Figma Variables (COLOR/FLOAT) và Text Styles.
- `generateLayout`: tạo Frame preview `Global Style` trong canvas.
- `duplicateAction`: `skip` | `overwrite` — hành vi khi trùng tên.

4) Font Handling
- `loadFonts`: auto-load fonts required bởi typography JSON with fallback logic.
- `fontScale`: optional multiplier for font sizes when generating preview.

Generate Workflow
1. Upload/paste JSON → optional `Check duplicates`.
2. Nếu duplicates: plugin trả `duplicatesFound`, UI hiển thị chi tiết và yêu cầu `skip`/`overwrite`.
3. Chọn options → Click `Generate`.
4. Kết quả: Frame `Global Style` xuất hiện bên cạnh canvas hiện tại; nếu `createVariables` bật thì tạo variable collections.

Automatic Features (Behind the Scenes)
- Group colors theo tên, bind paint styles hoặc variables khi tồn tại.
- Typography: cố gắng áp `textStyleId`; nếu không, tạo preview với fallback fonts.
- Spacing: render bảng Mobile/Tablet/Desktop nếu token có breakpoints.

Screenshots (placeholders)
- `DOCUMENTATION/images/colors.svg` — Colors card
- `DOCUMENTATION/images/typography.svg` — Typography card
- `DOCUMENTATION/images/spacing.svg` — Spacing card

-----------

Tab 2: Tokens Import / Export

Purpose
- Import nhiều file token, parse/merge, tạo variables, và export token JSON từ Figma.

Import Options
- `tokenFiles`: upload multiple files.
- `createVariables`, `generateLayout`, `prefix`, `duplicateAction`.
- `selections`: cho phép chọn chỉ import màu / typography / spacing / borders / shadows / buttons.

Duplicate Flow
- Plugin kiểm tra tồn tại variables/text styles bằng tên; trả `duplicatesFound` nếu tìm thấy.
- UI cho phép chọn hành động (skip/overwrite) từng mục hoặc áp dụng global.

Export Tokens
- Chọn token types (color, typography, spacing, shadow, border, breakpoint, button) → plugin trả `tokensExported` JSON.

Export Notes
- Buttons/TextLink export cố gắng parse component sets và grid layouts (variants, styles, properties).

-----------

Tab 3: Export JSON (Node Inspector)

Purpose
- Xem và sao chép JSON structure của node đã chọn để debug hoặc phân tích.

Interface
- Selected Node: tên + type
- Preview: ảnh preview của node
- Node Structure (JSON): tree bao gồm children và thuộc tính
- Properties: position (x,y), size (width,height), padding (auto-layout)

Options
- `Minify JSON`: remove whitespace
- `Displayed Properties`: chọn thuộc tính hiển thị (x,y,width,height,padding...)

-----------

Tab 4: QA Checker

Purpose
- Quét thiết kế để phát hiện các vấn đề về style, accessibility và consistency với design tokens/rules.

Features
- Scan Page / Scan Selection
- Rules: Typography Style Match, Text uses Text Style, Font Size in scale, Line Height threshold, Contrast (AA), Color in palette.
- Extract Tokens: tạo list colors/typography/spacing cho export.

Issues Tab
- Liệt kê vấn đề theo category: typography, color, contrast, spacing, etc.
- Filter: search by node name, severity.

Design Tokens Tab
- Extracted tokens grouped by type.

Settings Tab
- Bật/tắt từng rule, nhập font size scale (12,14,16,...), line-height scale, color palette hex list, skip layer names.

Auto-fix (limited)
- Một số fixes có thể tự động áp dụng (việc đổi text style, adjust contrast suggestion), user cần review.

-----------

Tab 5: Email Helpers

Purpose
- Hỗ trợ chuyển thiết kế thành nội dung HTML/email: copy content, inline styles, dark-mode preview, export images.

Copy Tools
- Copy Content (plain text)
- Copy TD Style (inline CSS for `<td>`)
- Copy Content + Style (full inline styles)
- Copy HTML Image (`<img>` tag placeholder)

Dark Mode Simulation
- Clone frame → invert colors (skip list supported). Output frame named `-dark`.

Export for Compare
- Export JSON structure + screenshot for DOCX vs design comparison. Add desktop/mobile frames, click `Export for Compare`.

Export All Images
- Export images by name pattern with format, scale and padding options.

-----------

Tab 6: Export GIF (Optional)

Purpose
- Tạo GIF từ component variants hoặc child frames.

Config
- Width/Height, Scale, FPS, Delay, Padding, Background, Loop, Overlay layers.

Workflow
- Select component instance or frame → Preview → Download GIF.

-----------

Detailed Workflows

Workflow A — Generate Global Style from JSON
1. Open plugin → Tab Global Style
2. Upload/Paste JSON → `Check duplicates`
3. Resolve duplicates → set `prefix`, `createVariables`, `generateLayout`
4. Click `Generate` → review frame + variables created

Workflow B — Import tokens (multi-file)
1. Tab Import/Export → Upload files
2. Plugin parses and shows summary
3. Resolve duplicates per-type → `Import`
4. Optional: `Generate Layout`

Workflow C — QA Scan and Fix
1. Tab QA Checker → Select frame/page
2. Configure rules → `Run QA Scan`
3. Review Issues → auto-fix possible items or manual corrections

-----------

Automatic behaviors & implementation notes

- Font loading: plugin attempts to load fonts used by token styles; falls back to Inter Regular/Medium.
- Variable collections: created as `Colors - <prefix>`, `Spacing - <prefix>` with modes for Mobile/Tablet/Desktop.
- Duplicate detection: compares token display names to existing variable/style names; returns lists per-type.
- Buttons/TextLink parsing: handles both component sets and grid-based layouts; output includes variants/sizes/styles.

Troubleshooting

- Icons distorted after generate: ensure icon frames ≤120px and contain VECTOR/GROUP or include "icon"/"logo" in name.
- Frame still wide after conversion: check for GROUP nodes or wrong constraints; plugin attempts ungrouping but review is required.
- Layout refuses to convert (UI control pattern): adjust `UI Control Patterns` in Settings or choose `Skip Matching` when prompted.
- Manual sections not replaced: ensure section names end with ` - manual`, add mobile section frames using `Add Selected Frame`, enable replacement checkbox.

Contact & Support

- Issues / feedback: Report bugs to repository issues.
- Author: Thien Ho

-----------

Files referenced
- Code (entry): `code.js`
- Bundled plugin: `plugin-generate-global-style-figma/code.js`
- Manifest: `manifest.json`
- Screenshots folder: `DOCUMENTATION/images`

Next steps
- Add real screenshots into `DOCUMENTATION/images` (replace SVG placeholders).
- Split this page into subpages: Quickstart, API, Examples, Troubleshooting if needed.
