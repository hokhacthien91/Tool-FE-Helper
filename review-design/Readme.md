## Tổng quan
**Design QA Checker** là Figma plugin kiểm tra design theo chuẩn chuyên nghiệp, tự động phát hiện lỗi và cảnh báo, đồng thời trích xuất design tokens.

---

## Chức năng chính

### 1. Design Quality Scan (Run Scan)
Quét và phát hiện các vấn đề trong design:

#### A. Naming Convention
- Frame/Component: Cảnh báo nếu tên chứa "Frame" hoặc "Group" (tên mặc định)
- Text: Kiểm tra theo pattern: `Title`, `Desc`, `Label`, `Caption`, `Heading`, `Body`, `Link`, `Button-text`, `Content`
- Cho phép: text dài (>20 ký tự, ≥3 từ), text trùng với nội dung, button text ngắn (1-3 từ)

#### B. Structure & Layout
- Groups: Cảnh báo khi dùng Group (nên dùng Frame + Auto-layout)
- Nested Groups: Phát hiện Group lồng nhau
- Auto-layout: Yêu cầu bật Auto-layout cho Frame/Component có nhiều children
- Empty Frames: Phát hiện Frame trống hoặc thừa
- Duplicate Frames: Phát hiện Frame/Component trùng lặp (dựa trên hash)

#### C. Spacing System
- Gap (itemSpacing): Kiểm tra theo spacing scale tùy chỉnh
- Padding: Kiểm tra paddingLeft/Right/Top/Bottom theo scale
- Custom Scale: Nhập scale (ví dụ: `0, 4, 8, 12, 16, 24, 32, 40, 48, 64`)
- Threshold: Giá trị > threshold sẽ pass (case đặc biệt)

#### D. Typography
- Font Size: Kiểm tra theo typography scale (mặc định: `32, 24, 20, 18, 16, 14, 12`)
- Custom Font Size Scale: Nhập scale tùy chỉnh
- Text Style: Cảnh báo nếu text không dùng Text Style (key)
- Line Height:
  - Kiểm tra line-height theo scale (%)
  - Hỗ trợ "auto"
  - Cảnh báo nếu < baseline threshold (mặc định 120%)
  - Custom scale: `auto, 100, 120, 140, 150, 160, 180, 200`

#### E. Color Contrast (Accessibility - WCAG AA)
- Text Contrast: Kiểm tra contrast ratio giữa text và background
- WCAG AA: Normal text ≥ 4.5, Large text (≥18pt hoặc ≥14pt bold) ≥ 3.0
- Hỗ trợ: Semi-transparent backgrounds, gradient backgrounds, nested backgrounds

#### F. Componentization
- Component Reuse: Cảnh báo Frame nên component hóa nếu dùng ≥2 lần
- Component Patterns: Kiểm tra theo pattern: `Card`, `Button`, `Header-item`, `CTA`, `Input`, `Select`, etc.

#### G. Position Issues
- Negative Position: Cảnh báo nếu child có vị trí âm (x < 0 hoặc y < 0)

---

### 2. Extract Design Tokens
Trích xuất và tổng hợp design tokens:

#### A. Colors
- Solid Colors: Tất cả màu solid (RGB, RGBA)
- Color Types: Phân loại theo usage:
  - `text`: Màu text
  - `background`: Màu background
  - `border`: Màu border
  - `shadow`: Màu shadow/effect
  - `fill`: Màu fill

#### B. Gradients
- Linear, Radial, Angular, Diamond gradients
- Hiển thị gradient string với color stops

#### C. Typography Tokens
- Font Family: Tất cả font families (kèm style)
- Font Weight: Tất cả font weights
  - Note: Hiển thị danh sách font-family dùng weight đó + số lần dùng
- Font Size: Tất cả font sizes
- Line Height: Tất cả line-heights (dạng %)

#### D. Spacing Tokens
- Border Radius: Tất cả border radius values

---

### 3. UI Features

#### A. Scope Selection
- Scan Page: Quét toàn bộ page
- Scan Selection: Chỉ quét elements đã chọn

#### B. Customizable Settings
- Spacing Scale: Nhập scale tùy chỉnh
- Font Size Scale: Nhập scale tùy chỉnh
- Line Height Scale: Nhập scale tùy chỉnh (hỗ trợ "auto")
- Thresholds: Cấu hình threshold cho từng loại

#### C. Filtering & Search
- Filter by Severity: `All`, `Errors`, `Warnings`
- Search: Tìm kiếm theo message, node name, type, value
- Color Type Filter: Lọc tokens theo color type (text/background/border/shadow/fill)

#### D. Results Display
- Grouped Issues: Nhóm issues theo type
- Collapsible Groups: Expand/collapse từng nhóm
- Node Selection: Click "Select" để select node trong Figma
- Usage Count: Hiển thị số lần sử dụng cho tokens
- Font Family Breakdown: Với Font Weight, hiển thị list font-family + count

#### E. Export Reports
- Export HTML: Export báo cáo dạng HTML
- Export PDF: Export báo cáo dạng PDF
- Export JSON: Export dữ liệu dạng JSON

#### F. Scan History
- Lưu 10 scan gần nhất
- Xem lại kết quả cũ
- Hỗ trợ localStorage (fallback memory storage)

---

### 4. Smart Features

#### A. Issue Grouping
- Nhóm issues tương tự để tránh duplicate
- Contrast issues: Nhóm theo ratio + colors
- Component issues: Nhóm theo usage count

#### B. Node Traversal
- Bỏ qua hidden nodes
- Bỏ qua "Sticky Note" và "Not check design"
- Recursive traversal qua tất cả children

#### C. Background Detection
- Tự động detect background color cho text contrast
- Hỗ trợ semi-transparent backgrounds
- Hỗ trợ gradient backgrounds (tính average color)

---

## Cấu trúc code

- `code.js` (2194 lines): Logic chính, scan rules, token extraction
- `ui.html` (3031 lines): UI, rendering, export, history
- `manifest.json`: Plugin configuration

---

## Use Cases

1. Design Review: Kiểm tra design trước khi handoff
2. Design System Audit: Đảm bảo tuân thủ design system
3. Token Extraction: Trích xuất tokens để tạo design system
4. Accessibility Check: Kiểm tra color contrast (WCAG AA)
5. Code Quality: Đảm bảo naming, structure, spacing consistency