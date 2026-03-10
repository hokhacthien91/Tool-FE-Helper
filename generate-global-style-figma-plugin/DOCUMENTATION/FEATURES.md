
# Generate Global Style — Tài liệu chức năng (One-page)

Mục đích: mô tả chi tiết các chức năng chính của plugin "Generate Global Style" — tài liệu tham khảo nhanh cho designers, design-ops, và developers.

Đối tượng: Designers, Design System Engineers, Design Ops, Developers tích hợp token → Figma.

Tổng quan ngắn:
- Plugin đọc JSON token (hoặc nhiều file tokens) hoặc trực tiếp đọc từ Figma, tạo preview layout (Colors, Typography, Spacing) và (tuỳ chọn) tạo Figma Variables & Text Styles.
- Hỗ trợ import/export tokens, kiểm tra trùng lặp, và generate từ Figma (reverse-export).

Chi tiết chức năng (mở rộng)

1) Kiểm tra trùng lặp (Check duplicates)
- Mục: phát hiện tên biến / text style / spacing đã tồn tại để tránh ghi đè không mong muốn.
- Input: JSON tokens / parsed tokens, optional `prefix`.
- Output: object chứa arrays của items trùng (colors, spacing, textStyles, borders, breakpoints).
- Ví dụ payload từ UI:
	- { type: 'checkDuplicates', data: <parsedJson>, prefix: 'Project A', createVariables: true }
- Hành vi: trả về `duplicatesFound` (chi tiết) hoặc `noDuplicates`.
- Edge-cases: nếu token name mapping không khớp, plugin log và hiển thị tên gốc.

2) Tạo Global Style từ JSON (Generate)
- Mục: sinh Frame `Global Style` trong Figma gồm các card/section:
	- Colors: swatches, tên, hex/rgba, binding variable/paint style nếu có.
	- Typography: danh sách text styles, preview text, áp dụng `textStyleId` nếu tìm thấy.
	- Spacing: bảng hiển thị các spacing value (Mobile/Tablet/Desktop).
- Tuỳ chọn: `createVariables` để đồng thời tạo Variables & Text Styles.
- Ví dụ payload từ UI:
	- { type: 'generate', data: <json>, createVariables: true, prefix: 'Project A', duplicateAction: 'skip' }
- Output: Frame mới trong Figma, message `status` sau khi hoàn thành.

3) Tạo Variables & Text Styles tự động
- Mục: tạo Figma Variables (COLOR, FLOAT) và Text Styles từ token JSON.
- Behaviour:
	- Tạo variable collection tên: e.g., `Colors - <prefix>` (hoặc `Colors` nếu prefix rỗng).
	- Tạo modes cho spacing collection: `Mobile`, `Tablet`, `Desktop`.
	- Hỗ trợ `duplicateAction`: `skip` hoặc `overwrite`.
- Hàm chính: `ft` (colors), `dt` (spacing), `gt` (typography), gọi từ `createVariablesAndStyles`.

4) Import Tokens (multi-file import)
- Flows:
	- `importTokens`: parse tất cả files, kiểm tra trùng lặp; nếu có, gửi `duplicatesFound` về UI.
	- `importTokensWithAction`: tiếp tục tạo variables/generate layout dựa trên lựa chọn user.
	- `importTokensWithSelections`: user chọn import có chọn lọc (ví dụ chỉ colors + spacing).
- Tuỳ chọn: `createVariables`, `generateLayout`, `prefix`, `duplicateAction`, `selections`.

5) Generate từ Figma (reverse-export)
- Mục: đọc tồn tại trong Figma (variables, paint styles, text styles, number variables) và tạo Frame `Global Style from Figma` để preview và hỗ trợ xuất JSON.
- Hàm chính: `at`, `lt` (colors), `rt` (typography), `mt` (spacing).

6) Export Tokens từ Figma
- Mục: xuất tokens hiện có trong Figma (color, typography, spacing, shadow, border, breakpoint, button, textLink).
- Output event: `tokensExported` kèm JSON tokens.
- Hàm chính: `ve`, `ke`, `Fe`, `Be`, `Pe`, `He`, `Ve`, `Xe`.

7) Support Buttons & Text Links
- Mục: parse các component sets / grids để tạo token structure cho Button và Text Link.
- Kết quả: variants, base, sizes, styles, properties.
- Notes: parser cố gắng xử lý cả Component Set (variants) và grid-based layout.

8) Xử lý font & preview text
- Behaviour:
	- Tự động cố gắng load fonts được yêu cầu trong typography JSON.
	- Fallback sequence: requested style → Regular/Medium → Inter Regular.
	- Nếu font không load được, plugin báo UI và dùng fallback để hiển thị preview.

9) Mapping, Naming & Prefix rules
- Mapping token path → display name: token path có dấu `/` sẽ trở thành nhóm/tên con (ví dụ `Primary/Teal`).
- Prefix: khi có `prefix`, tên collection và text style sẽ được tạo theo pattern `Colors - <prefix>` hoặc `<prefix>/<style>` để tránh xung đột giữa project.

10) Validation & Parsing
- Plugin có parser/normalizer hỗ trợ nhiều format tokens; có validator cho button tokens (`xt`) và nhiều helper để chuyển giá trị (color → hex, spacing → px, lineHeight conversions...).

11) UI messaging & Error handling
- Các message types:
	- Incoming: `checkDuplicates`, `generate`, `generateFromFigma`, `importTokens`, `importTokensWithAction`, `importTokensWithSelections`, `generateWithSelections`, `exportTokens`.
	- Outgoing: `duplicatesFound`, `noDuplicates`, `status`, `tokensExported`.
- Error flows: plugin gửi `status` với `error:true` khi gặp lỗi, và log chi tiết vào console.

Các tính năng đề xuất (nên thêm trong roadmap tài liệu):
- Dry-run mode: mô phỏng tạo variables/styles mà không thay đổi Figma (preview changes + report).
- Rollback / undo assistant: tự động lưu danh sách thay đổi để có thể revert nếu cần.
- Progress reporting: gửi trạng thái nhiều bước về UI (percent / step names).
- Schema validation UI: hiển thị lỗi schema khi import token JSON không hợp lệ.

Screenshots (placeholder + hướng dẫn)
- Mục: tài liệu nên kèm ảnh minh hoạ từng phần để người dùng hiểu nhanh.
- File names (đề xuất đặt trong `DOCUMENTATION/images`):
	- `colors.png` — section Colors (swatches + names).
	- `typography.png` — Typography card (previews + applied styles).
	- `spacing.png` — Spacing table (Mobile/Tablet/Desktop).
	- `duplicates_dialog.png` — Dialog/Modal khi phát hiện trùng lặp.
	- `import_flow.png` — Flow import tokens (file selection → duplicate prompt → result).
	- `settings_panel.png` — UI panel with `prefix`, `createVariables`, `duplicateAction` options.
- Kích thước đề xuất: 1200×700 hoặc width ~1200 để hiển thị rõ layout.
- Hiện tại file ảnh chưa có — tạo thư mục `DOCUMENTATION/images` và đặt ảnh theo tên trên. Nếu muốn, tôi có thể thêm placeholder SVG/PNG hoặc chèn ảnh mẫu.

Hướng dẫn chụp và thêm ảnh (nằm ở `DOCUMENTATION/images/README.md`)
- Bước: mở Figma canvas sau khi generate, chụp vùng frame `Global Style` hoặc modal, lưu theo tên file đề xuất.
- Định dạng: PNG 1200×700, tối ưu hóa kích thước < 500KB nếu được.

Tệp tham khảo code
- Entry source: `code.js`  
- Plugin bundle: `plugin-generate-global-style-figma/code.js`  
- Manifest: `manifest.json`

Next steps gợi ý
- Thêm ảnh minh hoạ vào `DOCUMENTATION/images`.
- Tạo `DOCUMENTATION/QUICKSTART.md` (Quickstart) và `DOCUMENTATION/API.md` (liệt kê message payloads chi tiết).

