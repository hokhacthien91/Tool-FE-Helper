# Banner Cloner Pro - Photoshop UXP Plugin

Plugin Photoshop UXP giúp clone artboard nguồn thành nhiều banner sizes khác nhau.
Dùng cho workflow tạo banner ads nhiều kích thước từ 1 design gốc.

## Các file
- manifest.json  — UXP plugin config
- index.html     — UI panel layout
- styles.css     — Dark theme styles
- main.js        — All plugin logic

## Cách cài
1. Cài Adobe UXP Developer Tool
2. Add plugin folder trong UXP Dev Tool
3. Load vào Photoshop
4. Panel xuất hiện ở menu Plugins > Banner Cloner Pro

## Tính năng

### 2 chế độ clone (tab)
- **Documents** — Mỗi size tạo 1 document riêng (workflow cũ)
- **Artboards** — Tất cả sizes tạo artboard trong cùng 1 document, xếp cạnh nhau

### Preset sizes
10 standard ad sizes: 300x250, 160x600, 728x90, 970x250, 300x600, 320x50, 320x100, 336x280, 250x250, 200x200

### Smart Layout
Plugin tự động xử lý content khi resize:
- **background** group: scale cover + center (giống CSS background-size: cover)
- **content** group: scale + reposition theo vị trí tương đối từ source
  - Mỗi child group (logo, headline, cta) được scale riêng để fit canvas
  - Vị trí giữ tương đối (%) so với source artboard
  - Tự động clamp để không vượt ra ngoài canvas
- Layers ngoài content/background: fit vào canvas (scale + push vào)

### Layer naming convention (để smart layout hoạt động tốt)
```
Artboard
  |-- outline        -> border (skip)
  |-- guideline      -> guides (skip)
  |-- content        -> wrapper group
  |   |-- logo       -> logo
  |   |-- headline   -> text group
  |   |-- cta        -> CTA button group
  |-- background     -> bg group (scale cover)
```

### Export
- **Export** button: chọn folder -> tạo folder structure:
  ```
  {baseName}-output-working-file-{HHmm-ddMMyyyy}/
    |-- output/        -> JPG files
    |-- working-file/  -> PSD files
  ```
- Export tất cả documents đang mở (PSD + JPG)

### Split to Documents (tab Artboards)
- Tách mỗi artboard thành 1 document riêng + save PSD
- Chỉ hiện ở tab Artboards

## Key Functions (main.js)
- `resolveSelectedArtboard()` — Tìm artboard gốc từ layer đang chọn
- `captureContentLayout()` — Đọc vị trí tương đối của content groups từ source
- `smartLayoutContent()` — Scale + reposition content groups theo vị trí tương đối
- `scaleBgCover()` — Scale background group kiểu cover + center
- `cloneAsArtboards()` — Clone trong cùng document (tab Artboards)
- `cloneAll()` — Clone ra document riêng (tab Documents)
- `exportAll()` — Export tất cả documents thành JPG + PSD
- `splitToDocuments()` — Tách artboards thành documents riêng + save PSD
- `bp()` / `bpSafe()` — Wrapper cho batchPlay (sync/async)

## Development
1. Install Adobe UXP Developer Tool
2. Add plugin folder trong UXP Dev Tool
3. Load vào Photoshop
4. Panel xuất hiện ở menu Plugins > Banner Cloner Pro

## Lưu ý
- Tất cả logic nằm trong 1 file main.js (single-file architecture)
- Dùng batchPlay API thay vì DOM API để có nhiều control hơn
- Modal execution via core.executeAsModal() cho các thao tác thay đổi document
- Smart layout hoạt động tốt nhất khi layer được đặt tên theo convention (content, logo, headline, cta, background)
