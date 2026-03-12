# Figma Prototype to GIF

Ghi lại Figma prototype (interactive flow) và xuất thành file GIF/video.

## Tính năng

- Ghi prototype Figma thông qua Puppeteer
- Xuất GIF animated và MOV video
- Tùy chỉnh FPS, thời lượng, viewport, quality
- Hỗ trợ retina (scale 2x)
- Giữ lại PNG frames để debug

## Cài đặt

```bash
npm install
```

Cần cài Chrome/Chromium trên máy.

## Cách chạy

```bash
node record.js <prototype-url> [options]
```

### Options

| Option | Default | Mô tả |
|--------|---------|-------|
| `--fps` | 15 | Frames per second |
| `--duration` | 20 | Thời lượng ghi (giây) |
| `--width` | 600 | Viewport width (px) |
| `--height` | 600 | Viewport height (px) |
| `--scale` | 1 | Device scale (1 hoặc 2 cho retina) |
| `--wait` | 8 | Chờ trước khi ghi (giây) |
| `--output` | prototype | Tên file output |
| `--quality` | 10 | Chất lượng GIF (1=tốt nhất, 20=kém nhất) |
| `--keep-frames` | false | Giữ lại PNG frames |

### Ví dụ

```bash
node record.js "https://figma.com/proto/..." --fps 15 --duration 20
node record.js "https://figma.com/proto/..." --width 600 --height 600 --scale 2
```
