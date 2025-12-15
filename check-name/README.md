# Check Name Tool

Tool để scan các trang web và lấy tất cả tên (accessible names) của các elements: links, buttons, checkboxes, radio buttons, và text elements, sau đó export ra file Excel.

## Cài đặt

```bash
npm install
```

## Sử dụng

1. Thêm danh sách URLs vào file `urls.txt` (mỗi URL một dòng)
2. Chạy lệnh:

```bash
npm run scan
```

Hoặc:

```bash
node scan-elements.js
```

## Output

Tool sẽ tạo:
- Thư mục report với format: `report-HHMM-day-month-year`
- File Excel `element-names.xlsx` chứa:
  - Sheet "All Elements": Tất cả elements từ tất cả URLs
  - Các sheet riêng cho từng URL: Elements của từng trang

## Format Excel

Mỗi row trong Excel có các cột:
- **#**: Số thứ tự
- **Type**: Loại element (Link, Button, Checkbox, Radio, Text)
- **Name**: Tên accessible của element
- **URL**: URL của trang chứa element

## Cách lấy accessible name

Tool sẽ lấy accessible name theo thứ tự ưu tiên:
1. `aria-label`
2. `aria-labelledby` (resolve element được reference)
3. `title` attribute
4. Text content (cho links, buttons, text elements)
5. `alt` (cho images)
6. `value` (cho input buttons)
7. `placeholder` (cho inputs)
8. Associated `label` element

