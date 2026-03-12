# Design Global Style - Design Token Storage

Chứa các file JSON design tokens cho các project, dùng kết hợp với plugin `generate-global-style-figma-plugin`.

## Tính năng

- Lưu trữ design tokens dạng JSON: colors, typography, spacing
- Dùng làm input cho plugin Generate Global Style
- Hỗ trợ nhiều project khác nhau

## Cấu trúc JSON

```json
[
  {
    "name": "Project Name",
    "values": {
      "colorNameMap": { "#HEX": "Category/Name" },
      "typographyStyles": [
        { "name": "Desktop/H1", "fontFamily": "...", "fontSize": 48 }
      ],
      "spacingScale": "0, 4, 8, 16, 24, 32, 40, 48"
    }
  }
]
```

## Cách dùng

1. Tạo hoặc chỉnh sửa file JSON theo cấu trúc trên
2. Import vào plugin `generate-global-style-figma-plugin` để tạo visual Global Style guide trong Figma
