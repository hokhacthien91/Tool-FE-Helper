# Design Helper - Figma Plugin

## Muc luc
1. [Gioi thieu](#gioi-thieu)
2. [Cai dat](#cai-dat)
3. [Cac tab chinh](#cac-tab-chinh)
   - [Tab 1: Breakpoint Generator](#tab-1-breakpoint-generator)
   - [Tab 2: For Email](#tab-2-for-email)
   - [Tab 3: Export JSON](#tab-3-export-json)
   - [Tab 4: QA Checker](#tab-4-qa-checker)
   - [Tab 5: Export GIF](#tab-5-export-gif)
4. [Workflow chi tiet](#workflow-chi-tiet)
5. [Troubleshooting](#troubleshooting)

---

## Gioi thieu

**Design Helper** la mot Figma Plugin da nang, ho tro chuyen doi design tu desktop sang mobile breakpoints voi nhieu tinh nang nang cao cho email development va design QA.

### Cac tinh nang chinh:
- Chuyen doi layout tu Desktop sang Mobile tu dong
- Ho tro email development (dark mode, export images, copy content)
- QA Checker de kiem tra design consistency
- Export GIF tu component variants
- Inspector de xem JSON structure cua node

---

## Cai dat

### Buoc 1: Import Plugin vao Figma

1. Mo Figma Desktop
2. Vao **Menu > Plugins > Development > Import plugin from manifest...**
3. Chon file `desktop-to-mobile-breakpoint-converter/manifest.json`

*[Screenshot: Menu import plugin]*

### Buoc 2: Mo Plugin

1. Chon frame can xu ly tren canvas
2. Vao **Menu > Plugins > Development > Design Helper**

*[Screenshot: Mo plugin tu menu]*

---

## Cac tab chinh

Plugin co **5 tab** chinh, moi tab phuc vu mot muc dich rieng:

| Tab | Chuc nang chinh |
|-----|-----------------|
| **Breakpoint Generator** | Chuyen doi desktop frame sang mobile breakpoints |
| **For Email** | Cac cong cu ho tro lam email (dark mode, export images) |
| **Export JSON** | Xem va copy JSON structure cua node |
| **QA Checker** | Kiem tra design consistency (typography, colors, contrast) |
| **Export GIF** | Tao GIF tu component variants hoac child frames |

*[Screenshot: Giao dien plugin voi 5 tabs]*

---

## Tab 1: Breakpoint Generator

### Muc dich
Chuyen doi mot frame desktop sang cac mobile/tablet breakpoints voi cac tuy chon tu dong hoa layout.

### Giao dien

*[Screenshot: Tab Breakpoint Generator]*

### Cau hinh

#### 1. Selected Frame
Hien thi thong tin frame dang chon:
- Ten frame
- Kich thuoc (width x height)

#### 2. Target Breakpoints

Chon mot hoac nhieu target widths:

| Breakpoint | Width | Default Padding | Default Max Gap |
|------------|-------|-----------------|-----------------|
| Mobile | 414px | 24px | 40px |
| Tablet | 768px | 48px | 60px |
| Tablet Large | 1024px | 48px | 60px |

**Cac tuy chon:**
- **Padding**: Left/right padding cho container (ap dung cho root frame)
- **Max Gap**: Gioi han toi da spacing khi chuyen layout

*[Screenshot: Breakpoint selection UI]*

#### 3. Slider/Carousel Mode

Khi bat che do nay, plugin se giu nguyen horizontal layout cho cac frame match pattern.

| Setting | Mo ta |
|---------|-------|
| **Item name pattern** | Ten frame con se duoc nhan dien la slider item (vd: "Cards", "slide-item") |
| **Items visible** | So item hien thi cung luc |
| **Peek next item** | Hien thi mot phan item tiep theo (px) |

*[Screenshot: Slider configuration]*

#### 4. Manual Sections Source (Optional)

Cho phep thay the cac section bang phien ban mobile da thiet ke san.

**Cach su dung:**
1. Trong desktop design, dat ten section voi suffix `- manual`
   - Vi du: `Hero Section - manual`
2. Tao mobile version cua section do trong mot frame khac
3. Click **"Add Selected Frame"** de them frame chua mobile sections
4. Bat checkbox **"Enable manual section replacement"**

*[Screenshot: Manual sections config]*

#### 5. Advanced Settings

| Setting | Mo ta |
|---------|-------|
| **Preserved Components** | Danh sach ten component khong bi detach (giu nguyen instance) |
| **UI Control Patterns** | Patterns de nhan dien UI controls (se giu nguyen layout horizontal) |
| **Muted Frames** | Frames da chon "Don't ask again" - se tu dong ap dung lua chon truoc |

*[Screenshot: Advanced settings expanded]*

#### 6. Font Size Options

| Option | Mo ta |
|--------|-------|
| **Keep font size** | Giu nguyen font size goc |
| **Map text styles** | Chuyen Desktop/H1 -> Mobile/H1 (neu style ton tai) |
| **Scale font size** | Nhan font size voi he so (default: 0.85) |

### Cac tinh nang tu dong (Behind the Scenes)

Khi click "Generate", plugin tu dong thuc hien cac toi uu hoa sau:

#### Chuyen doi Layout
| Tinh nang | Mo ta |
|-----------|-------|
| **Horizontal → Vertical** | Tu dong chuyen layout HORIZONTAL sang VERTICAL khi children khong du cho trong target width |
| **FILL width** | Children duoc set `layoutSizingHorizontal: FILL` de responsive |
| **Dieu chinh spacing** | Tu dong dieu chinh `itemSpacing` khi chuyen layout (gioi han boi Max Gap) |
| **Go nhom GROUP** | Tu dong go tat ca GROUP nodes de children co the resize dung |
| **Auto height** | VERTICAL frames duoc set `primaryAxisSizingMode: AUTO` de grow theo content |

#### Xu ly Font/Text
| Tinh nang | Mo ta |
|-----------|-------|
| **Map text styles** | Tu dong map `Desktop/H1` → `Mobile/H1` (neu Mobile style ton tai trong Figma) |
| **Scale font size** | Nhan font size voi he so (default: 0.85), toi thieu 10px |
| **Ho tro mixed fonts** | Xu ly text co nhieu font khac nhau (styled text) theo tung ky tu |

#### Ho tro Figma Variables
| Tinh nang | Mo ta |
|-----------|-------|
| **Tu dong phat hien modes** | Phat hien Figma Variables co modes (Desktop/Mobile/Tablet) |
| **Ap dung target mode** | Tu dong ap dung gia tri spacing tu mode tuong ung voi target breakpoint |
| **Cac thuoc tinh xu ly** | `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` |

#### Xu ly Image & Media
| Tinh nang | Mo ta |
|-----------|-------|
| **Luu aspect ratios** | Luu ty le anh goc tu desktop frame TRUOC khi clone |
| **Khoi phuc aspect ratios** | Khoi phuc ty le anh sau khi resize frame |
| **Background cover** | Background images resize theo logic `background-size: cover; background-position: center` |
| **Media containers** | Giu nguyen aspect ratio hoac fixed height cho video/image frames |

#### Bao toan Icon
| Tinh nang | Mo ta |
|-----------|-------|
| **Nhan dien icon** | Nhan dien icons: frame ≤ 120px chua VECTOR/GROUP, hoac ten chua "icon"/"logo" |
| **Luu kich thuoc icon** | Luu kich thuoc icons TRUOC khi clone |
| **Khoi phuc kich thuoc icon** | Khoi phuc kich thuoc icons sau khi resize (icons KHONG bi scale theo parent) |

#### Xu ly Instance/Component
| Tinh nang | Mo ta |
|-----------|-------|
| **Tu dong detach instances** | Tu dong detach tat ca nested instances de co the modify layout |
| **Preserved Components** | Cac component trong danh sach "Preserved" se KHONG bi detach |

#### Nhan dien UI Controls
| Tinh nang | Mo ta |
|-----------|-------|
| **Pattern matching** | Nhan dien UI controls (button, btn, cta, input, tab, search...) |
| **Giu horizontal** | UI controls giu nguyen layout HORIZONTAL thay vi chuyen sang VERTICAL |
| **Giu kich thuoc tu nhien** | UI controls giu kich thuoc tu nhien (khong FILL width) |

#### Sua loi Absolute Positioning
| Tinh nang | Mo ta |
|-----------|-------|
| **Phat hien overflow** | Phat hien content absolute-positioned bi overflow |
| **Tu dong center** | Tu dong center content overflow trong available width |
| **Sua constraint** | Doi constraint tu CENTER/SCALE sang MIN (left) de tranh "snap back" |

### Workflow Generate Breakpoint

```
1. Chon frame desktop tren canvas
2. Plugin hien thi thong tin frame
3. Chon target breakpoints (414, 768, 1024)
4. Dieu chinh padding va max gap cho moi breakpoint
5. (Optional) Cau hinh slider mode
6. (Optional) Them manual source frames
7. Click "Generate" hoac "Generate X Breakpoints"
8. Plugin tao cac frame moi ben canh frame goc
```

*[Screenshot: Before/After generate]*

---

## Tab 2: For Email

### Muc dich
Cung cap cac cong cu ho tro phat trien email HTML.

### Cac tinh nang

#### 1. Copy Content

Chon mot text layer tren canvas va su dung cac nut:

| Button | Output |
|--------|--------|
| **Copy Content** | Copy noi dung text thuan |
| **Copy TD Style** | Copy inline CSS cho `<td>` tag |
| **Copy Content + Style** | Copy text voi inline style day du |
| **Copy HTML Image** | Copy `<img>` tag voi src placeholder |
| **Copy HTML Banner + Header (HPS)** | Copy HTML cho banner + header structure |
| **Copy HTML TD Background** | Copy `<td>` voi background image |

*[Screenshot: Copy Content section]*

#### 2. Dark Mode Simulation

Clone frame va dao nguoc mau de mo phong email trong dark mode.

**Cach su dung:**
1. Chon frame email
2. Nhap ten cac frame khong muon chuyen doi (vd: Logo, Social icons)
3. Click **"Convert to Dark Mode"**
4. Plugin tao frame moi voi ten `-dark`

**Skip Frames:** Nhap ten frame (case-insensitive), moi ten 1 dong

*[Screenshot: Dark mode result]*

#### 3. Export for Compare (DOCX vs Design)

Export JSON structure va screenshot de so sanh voi DOCX.

**Cach su dung:**
1. Nhap **Project Name** (vd: mail1)
2. Click **"+ Add Desktop Frame"** sau khi chon frame desktop
3. Click **"+ Add Mobile Frame"** sau khi chon frame mobile
4. Click **"Export for Compare"**

*[Screenshot: Compare export UI]*

#### 4. Export All Images

Export tat ca images trong frame theo pattern name.

| Image Type | Config |
|------------|--------|
| **Button** | Pattern, Format (PNG/SVG/JPG), Scale, Padding |
| **PNG** | Pattern, Scale |
| **JPG** | Pattern, Scale |

**Pattern matching:** Frames co ten **chinh xac** (case-insensitive) se duoc export.

**Vi du Pattern:**
```
Button
aton/Buttons
```
-> Cac frame ten "Button" hoac "aton/Buttons" se duoc export

*[Screenshot: Export images config]*

---

## Tab 3: Export JSON

### Muc dich
Xem va copy JSON structure cua node dang chon, huu ich cho debug va phan tich design.

### Giao dien

| Section | Mo ta |
|---------|-------|
| **Selected Node** | Ten va type cua node dang chon |
| **Preview** | Hinh anh preview cua node |
| **Node Structure (JSON)** | JSON tree cua node va children |
| **Properties** | Chi tiet ve position, size, padding |

*[Screenshot: Inspector tab]*

### JSON Output Options

- **Minify JSON output**: Giam kich thuoc JSON bang cach loai bo whitespace

### Properties hien thi

| Property | Mo ta |
|----------|-------|
| x, y | Position cua node |
| width, height | Kich thuoc |
| paddingLeft/Right/Top/Bottom | Padding (chi co voi auto-layout frames) |

---

## Tab 4: QA Checker

### Muc dich
Kiem tra design consistency voi cac quy tac da dinh nghia.

### Cac tinh nang

#### 1. Scan Controls

| Option | Mo ta |
|--------|-------|
| **Scan Page** | Quet toan bo page hien tai |
| **Scan Selection** | Chi quet frame dang chon |
| **Run QA Scan** | Bat dau quet va tim issues |
| **Extract Tokens** | Trích xuat design tokens tu selection |

*[Screenshot: QA scan controls]*

#### 2. Sub-tabs

##### Issues Tab
Hien thi danh sach issues tim duoc, nhom theo category:

| Category | Mo ta |
|----------|-------|
| **Typography Style Match** | Text khong match voi style da dinh nghia |
| **Text Style (Variable)** | Text khong dung Figma text style |
| **Font Size** | Font size khong nam trong scale |
| **Line Height** | Line height khong dat chuan |
| **Contrast (ADA AA)** | Contrast ratio khong du (< 4.5:1) |
| **Text Size (ADA)** | Text qua nho cho mobile (< 12px) |
| **Color** | Mau khong nam trong palette |

**Filter controls:**
- Search box: Tim kiem theo node name hoac message
- Severity: All / Errors / Warnings

*[Screenshot: Issues list]*

##### Design Tokens Tab
Hien thi cac tokens trích xuat duoc:
- Colors (theo loai: text, background, border)
- Typography (font family, size, weight, line height)
- Spacing
- Border radius

*[Screenshot: Tokens tab]*

##### Settings Tab

**Check Rules:** Bat/tat tung loai check

| Rule | Default |
|------|---------|
| Typography Style Match | On |
| Text Style (Variable) | On |
| Font Size | On |
| Line Height | On |
| Contrast (ADA AA) | On |
| Text Size (ADA) | On |
| Color | On |

**Font Size Scale:** Dinh nghia cac gia tri font size hop le
- Input: `12, 14, 16, 18, 20, 24, 32, 40, 48, 64`
- Threshold: Gia tri tren nguong se pass (default: 100)

**Line Height Scale:** Dinh nghia cac gia tri line height hop le
- Input: `auto, 100, 120, 140, 150, 160, 180, 200`
- Baseline Min: Gia tri toi thieu (default: 120%)

**Color Palette:** Dinh nghia cac mau hop le
- Nhap hex codes: `#000000, #FFFFFF, #FF0000`
- Hoac click "Extract Styles" / "Extract Variables" tu Figma

**Typography Styles:** Dinh nghia cac text style chuan

| Column | Mo ta |
|--------|-------|
| Style Name | Ten style (vd: H1, H2, Body) |
| Font Family | Font family (vd: Inter) |
| Size (px) | Font size |
| Weight | Font weight (100-900) |
| Line Height | Tinh theo % |
| Letter Sp. | Letter spacing (px) |
| Word Sp. | Word spacing (px) |

**Skip Layer Names:** Danh sach ten layer bo qua khi scan

*[Screenshot: QA Settings]*

---

## Tab 5: Export GIF

### Muc dich
Tao GIF animation tu component variants hoac child frames.

### Yeu cau
- Chon mot **Component Instance** co nhieu variants, HOAC
- Chon mot **Frame** chua nhieu child frames

### Cau hinh

| Setting | Mo ta | Default |
|---------|-------|---------|
| **Width** | Chieu rong output | 600px |
| **Height** | Chieu cao output | 400px |
| **Scale** | Ti le export (0.5x - 3x) | 2x |
| **FPS** | Frames per second | 25 |
| **Delay** | Delay giua cac frame (ms) | 500ms |
| **Pad X** | Padding trai/phai | 0 |
| **Pad Y** | Padding tren/duoi | 0 |
| **Background** | Mau nen | #FFFFFF |
| **Loop** | Lap vo han | On |

**Overlay Layers:** Chon cac layer o cung level voi frame de overlay len GIF (vd: cursor, highlight)

*[Screenshot: GIF export settings]*

### Workflow Export GIF

```
1. Chon component instance hoac frame chua animations
2. Plugin hien thi so luong frames
3. Dieu chinh settings (size, delay, scale)
4. (Optional) Chon overlay layers
5. Click "Preview" de xem truoc
6. Click "Download" de tai GIF
```

*[Screenshot: GIF preview]*

---

## Workflow chi tiet

### Workflow 1: Chuyen doi Desktop sang Mobile

```
[Chon Desktop Frame]
         |
         v
[Mo Plugin > Tab Breakpoint Generator (Design Helper)]
         |
         v
[Chon Target Breakpoints: 414, 768, 1024]
         |
         v
[Dieu chinh Padding & Max Gap]
         |
         v
[Click Generate]
         |
         v
[Review ket qua]
         |
    +----+----+
    |         |
[OK]       [Can fix]
    |         |
    v         v
[Done]   [Manual adjust trong Figma]
```

### Workflow 2: Email Development

```
[Thiet ke Desktop Email]
         |
         v
[Generate Mobile Breakpoint]
         |
         v
[Export Images (Tab For Email)]
         |
         v
[Copy Content + Styles cho tung section]
         |
         v
[Generate Dark Mode Simulation]
         |
         v
[Review Dark Mode]
         |
         v
[Export for Compare (DOCX)]
```

### Workflow 3: QA Check Design

```
[Chon Frame can check]
         |
         v
[Mo Plugin > Tab QA Checker]
         |
         v
[Cau hinh Settings (Font Scale, Colors, Typography)]
         |
         v
[Click Run QA Scan]
         |
         v
[Review Issues]
         |
    +----+----+
    |         |
[Auto Fix] [Manual Fix trong Figma]
    |         |
    v         v
[Verify lai] ----> [Re-scan]
```

---

## Troubleshooting

### Van de 1: Icons bi meo/scale sau khi generate

**Nguyen nhan:** Icon khong duoc nhan dien dung

**Giai phap:**
- Dam bao icon nam trong frame <= 120px
- Icon frame phai chua VECTOR hoac GROUP nodes
- Hoac dat ten frame chua "icon" hoac "logo"

### Van de 2: Frame width van lon hon mobile

**Nguyen nhan:** Co GROUP nodes hoac constraints sai

**Giai phap:**
- Plugin tu dong ungroup - kiem tra lai
- Kiem tra constraints cua children

### Van de 3: Layout khong chuyen thanh vertical

**Nguyen nhan:** Frame match UI control pattern

**Giai phap:**
- Khi modal xuat hien, chon "Skip Matching" de chuyen vertical
- Hoac chinh sua UI Control Patterns trong Advanced Settings

### Van de 4: Manual sections khong duoc thay the

**Checklist:**
- [ ] Ten section co suffix `- manual` (co space truoc dash)
- [ ] Da add frame chua mobile sections
- [ ] Da bat checkbox "Enable Manual Section Replacement"

### Van de 5: QA Scan khong tim thay issues

**Giai phap:**
- Kiem tra Settings > Check Rules da bat
- Kiem tra Font Scale va Color Palette da cau hinh
- Thu scan toan Page thay vi Selection

---

## Lien he & Ho tro

- **Version:** 2.0
- **Author:** FE Helper Team
- **Issues:** [Bao cao loi o day]

---

*Tài liệu được cập nhật lần cuối: [DATE]*

**Lưu ý:** Các vị trí `[Screenshot: ...]` cần được bổ sung hình ảnh minh họa tương ứng.
