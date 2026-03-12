# Compare CSS Output

So sánh file CSS trước và sau migration (vd: SASS -> CSS mới) để đảm bảo không có thay đổi ngoài ý muốn.

## Tính năng

- Parse CSS cả dạng minified và formatted
- So sánh selector, properties giữa 2 file CSS
- Xử lý media query với context preservation
- Normalize selector để so sánh chính xác

## Cài đặt

Không cần cài thêm dependencies (Pure Node.js).

```bash
npm install
```

## Cách chạy

```bash
npm run compare
# hoặc
npm run compare-css
```

Cấu hình đường dẫn file CSS cần so sánh trong `compare-css.js`.
