# Claude Code to Figma

Chuyển HTML/web page (do Claude Code generate) sang Figma design thông qua Figma MCP html-to-design.

## Tính năng

- Render HTML + Tailwind CSS trong browser
- Capture sang Figma design qua Figma MCP script
- Dùng để import UI do Claude Code tạo vào Figma để chỉnh sửa tiếp

## Cách dùng

1. Tạo hoặc chỉnh sửa file HTML (dùng Tailwind CSS)
2. Đảm bảo file có include script capture:

```html
<script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
```

3. Mở file HTML trong browser
4. Sử dụng Figma MCP để capture trang web vào Figma
