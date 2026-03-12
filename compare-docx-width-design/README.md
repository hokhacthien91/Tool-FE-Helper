# Compare DOCX with Design

So sánh nội dung text từ file DOCX (Word) với Figma Design JSON để kiểm tra copywriting khớp với design.

## Tính năng

- Parse nội dung text từ file DOCX (extract từ `word/document.xml`)
- Parse text từ Figma Design JSON export
- So sánh và phát hiện khác biệt giữa 2 nguồn
- Hỗ trợ phân chia theo section (MAIN MODULE, LEGAL FOOTER,...)
- Xuất báo cáo so sánh vào folder `output/`

## Cài đặt

```bash
npm install
```

## Cách chạy

```bash
# Dùng config mặc định
npm run compare

# Dùng file config tùy chỉnh
npm run compare:config config.json
```

Cấu hình đường dẫn file DOCX và JSON trong `config.json`.
