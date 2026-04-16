# Banner Cloner Pro - Photoshop UXP Plugin

Plugin Photoshop UXP giúp clone artboard nguồn thành nhiều banner sizes khác nhau.
Dùng cho workflow tạo banner ads nhiều kích thước từ 1 design gốc.

## Các file
- manifest.json  — UXP plugin config
- index.html     — UI panel layout
- styles.css     — Dark theme styles
- main.js        — All plugin logic

## Setup trên máy mới

### Yêu cầu
- **Photoshop** 23.0.0 trở lên (2022+)
- **Adobe Creative Cloud Desktop** (để cài UXP Developer Tool)
- macOS hoặc Windows

### Bước 1 — Cài UXP Developer Tool
1. Mở **Creative Cloud Desktop** → tab **Apps**
2. Tìm **UXP Developer Tool** (trong mục Extensions & Plugins / Desktop Apps) → Install
   - Nếu không thấy: tải trực tiếp tại https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/installation/
3. Mở UXP Developer Tool sau khi cài xong

### Bước 2 — Clone / copy plugin về máy
```
git clone <repo-url> Photoshop-UXP-Plugin-BannerCloner
```
Hoặc copy cả folder plugin này sang máy mới (cần có `manifest.json`, `index.html`, `main.js`, `styles.css`, `icon.png`, `icon@2x.png`).

### Bước 3 — Add plugin vào UXP Dev Tool
1. Mở **Photoshop** trước (Dev Tool cần Photoshop đang chạy)
2. Mở **UXP Developer Tool** → click **Add Plugin...**
3. Chọn file `manifest.json` trong folder plugin
4. Plugin xuất hiện trong list với tên "Banner Cloner Pro"

### Bước 4 — Load vào Photoshop
1. Trong UXP Dev Tool, click nút **••• (Actions)** bên cạnh plugin
2. Chọn **Load** → panel sẽ hiện trong Photoshop
3. Mở panel tại menu **Plugins > Banner Cloner Pro** (hoặc **Window > Extensions**)

### Bước 5 — Pin panel (optional)
- Kéo panel vào workspace, save workspace để lần sau mở Photoshop là có sẵn
- Mỗi lần khởi động lại Photoshop, cần **Load** lại từ UXP Dev Tool (development mode)

### Troubleshooting
- **Plugin không hiện trong menu**: check manifest.json hợp lệ, Photoshop version ≥ 23.0.0
- **Lỗi "manifest invalid"**: mở manifest.json trong UXP Dev Tool → xem log error
- **Panel blank/trắng**: right-click panel → **Debug** → mở DevTools xem console
- **Reload sau khi sửa code**: click **Reload** trong UXP Dev Tool (không cần Load lại)

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
