# Review Design - Design QA Checker

Figma plugin kiểm tra chất lượng design tự động: phát hiện lỗi naming, layout, spacing, typography, accessibility.

## Tính năng

- Scan toàn bộ page hoặc selection
- Phát hiện 9 loại issue:
  - **typography-match**: Text không khớp typography style
  - **text-style**: Thiếu Figma Text Style variable
  - **font-family**: Font không nằm trong danh sách cho phép
  - **font-size**: Font size không đúng scale (12, 14, 16, 18, 20, 24, 32, 40, 48, 64)
  - **line-height**: Line height không đúng scale
  - **contrast**: Không đạt WCAG AA color contrast
  - **text-size**: Text quá nhỏ (ADA compliance)
  - **color**: Màu không nằm trong palette
  - **border-radius**: Có border-radius (không hỗ trợ trong email)
- Tùy chỉnh rules và scales
- Trích xuất design tokens (colors, typography, spacing, border-radius)
- Nhóm issues theo error/warning

## Cài đặt

```bash
npm install
```

## Cách chạy

Build plugin:

```bash
npm run build       # Build 1 lần
npm run watch       # Auto-rebuild khi thay đổi code
npm run prod        # Build + inject assets
```

Load vào Figma:
1. Figma > Plugins > Development > Import plugin from manifest...
2. Chọn file `manifest.json` trong folder này
