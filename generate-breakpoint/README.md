# Breakpoint Generator - Figma Plugin

Plugin Figma giúp tự động chuyển đổi desktop frame sang mobile breakpoints với khả năng xử lý layout thông minh.

## Tính năng chính

### 1. Chuyển đổi Layout tự động
- **Horizontal → Vertical**: Tự động chuyển layout ngang sang dọc phù hợp với mobile
- **FILL width**: Các children được set `layoutSizingHorizontal: FILL` để responsive
- **Smart spacing**: Tự động giảm spacing khi chuyển sang mobile (có thể cấu hình max spacing)
- **Padding tự động**: Áp dụng container padding cho root frame

### 2. Multi-breakpoint Generation
- Chọn nhiều target widths cùng lúc (toggle select)
- Các breakpoints được đặt cạnh nhau với khoảng cách 100px
- Preset có sẵn: 414px, 390px, 375px, 768px, 1024px

### 3. Icon Preservation
- Tự động detect icon frames (≤120px chứa VECTOR/GROUP)
- Giữ nguyên kích thước và vị trí icon sau khi chuyển đổi
- Hỗ trợ các icon phức tạp có nhiều VECTOR nodes

### 4. Manual Section Replacement
- Đánh dấu sections với suffix `- manual` để thay thế bằng mobile version
- Thêm mobile frames làm source cho manual sections
- Hữu ích cho các sections cần thiết kế riêng cho mobile

### 5. UI Control Pattern Matching
- Nhận diện UI controls (button, input, tab...) để giữ nguyên layout
- Có thể cấu hình patterns trong Advanced Settings
- "Don't ask again" option để mute frames đã quyết định

### 6. Font Handling
- **Keep**: Giữ nguyên font size
- **Scale**: Scale font theo tỷ lệ cấu hình (default 0.85)
- **Map**: Map font sizes (chưa implement đầy đủ)

## Cài đặt

### Development

```bash
# Clone repository
cd generate-breakpoint

# Install dependencies
npm install

# Build plugin
npm run build

# Watch mode (auto rebuild)
npm run watch

# Type check
npm run typecheck
```

### Import vào Figma

1. Mở Figma Desktop
2. Menu → Plugins → Development → Import plugin from manifest...
3. Chọn file `desktop-to-mobile-breakpoint-converter/manifest.json`

## Sử dụng

### Basic Usage

1. Chọn một frame desktop trên canvas
2. Mở plugin (Plugins → Development → Breakpoint Generator)
3. Chọn target width(s) - có thể chọn nhiều
4. Điều chỉnh Container Padding nếu cần
5. Click "Generate" hoặc "Generate X Breakpoints"

### Advanced Settings

Click vào "Advanced Settings" để truy cập:

#### Preserved Components
Danh sách component names sẽ không bị detach (mỗi dòng một tên):
```
button
btn
icon
```

#### UI Control Patterns
Patterns để nhận diện UI controls - sẽ giữ nguyên layout horizontal:
```
button
btn
cta
input
field
search
tab
icon
```

#### Muted Frames
Quản lý frames đã được mute (không hỏi lại):
- Xem danh sách frames đã mute
- Remove để hỏi lại lần sau

### Manual Section Replacement

1. Trong design desktop, đặt tên section với suffix `- manual`:
   - Ví dụ: `Hero Section - manual`
2. Tạo mobile version của section đó trong một frame khác
3. Trong plugin, click "Add Selected Frame" để thêm frame chứa mobile sections
4. Enable "Enable Manual Section Replacement"
5. Generate breakpoint - các sections manual sẽ được thay thế

### Inspector Tab

Chuyển sang tab "Inspector" để:
- Xem JSON structure của node đang chọn
- Copy JSON để debug hoặc phân tích
- Xem preview và properties của node

## Cấu trúc Project

```
generate-breakpoint/
├── src/
│   ├── code.ts          # Main plugin logic
│   └── types.ts         # TypeScript interfaces
├── ui.html              # Plugin UI
├── build.mjs            # Build script (esbuild)
├── manifest.json        # Figma plugin manifest
├── package.json
├── tsconfig.json
└── desktop-to-mobile-breakpoint-converter/
    ├── code.js          # Built plugin code
    ├── ui.html          # Copied UI
    └── manifest.json    # Copied manifest
```

## Technical Details

### Layout Conversion Flow

1. **Store original data**: Lưu icon sizes, media container sizes trước khi convert
2. **Clone frame**: Clone source frame
3. **Detach instances**: Detach tất cả component instances để có thể modify
4. **Ungroup GROUPs**: Flatten GROUP nodes để children có thể sử dụng auto-layout
5. **Convert layouts**: Chuyển HORIZONTAL → VERTICAL, apply FILL sizing
6. **Resize frame**: Resize root frame theo target width
7. **Fix children**: Sửa children widths, apply container padding
8. **Restore icons**: Khôi phục icon sizes về original
9. **Restore media**: Khôi phục media container sizes với aspect ratio

### Key Functions

| Function | Description |
|----------|-------------|
| `generateBreakpoint()` | Main conversion function |
| `convertHorizontalToVertical()` | Convert horizontal layouts to vertical |
| `ungroupAllGroups()` | Flatten GROUP nodes |
| `storeIconSizes()` / `restoreIconSizes()` | Preserve icon dimensions |
| `applyContainerPadding()` | Apply left/right padding |
| `fixFullWidthChildren()` | Ensure children use FILL sizing |
| `replaceManualSections()` | Replace manual sections with mobile versions |

### Storage

Plugin sử dụng `figma.clientStorage` để persist:
- **Settings**: Cấu hình user (padding, patterns, etc.)
- **Muted Frames**: Frames đã được mute

## Troubleshooting

### Icons bị méo/scale
- Đảm bảo icon nằm trong frame ≤120px
- Icon frame phải chứa VECTOR hoặc GROUP nodes
- Hoặc tên frame chứa "icon" hoặc "logo"

### Frame width vẫn lớn hơn mobile
- Kiểm tra có GROUP nodes không - plugin tự động ungroup
- Kiểm tra constraints của children

### Layout không chuyển vertical
- Frame có thể match UI control pattern → mở modal để quyết định
- Kiểm tra Advanced Settings → UI Control Patterns

### Manual sections không được thay thế
- Đảm bảo tên section có suffix `- manual` (có space trước dash)
- Đảm bảo đã add frame chứa mobile sections
- Enable checkbox "Enable Manual Section Replacement"

## Version History

### v2.0
- Multi-breakpoint generation
- Icon preservation với flatten approach
- Muted frames persistence
- Inspector tab với JSON output
- UI Control pattern matching với modal confirmation

### v1.0
- Basic desktop to mobile conversion
- Manual section replacement
- Font scaling options

## License

MIT
