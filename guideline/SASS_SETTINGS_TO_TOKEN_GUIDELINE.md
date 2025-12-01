# Guideline: Chuyển đổi từ Sass Settings sang Component Tokens

## Tổng quan

Guideline này mô tả quy trình chuyển đổi các biến từ Sass Settings files sang Component Tokens trong Style Dictionary, dựa trên best practices và các ví dụ thực tế từ project.

---

## Mục tiêu

- ✅ **Single source of truth**: Tất cả config ở tokens, không còn Sass Settings
- ✅ **Theme override tự động**: Style Dictionary tự động handle override cho từng theme
- ✅ **Dễ maintain**: Chỉ cần maintain ở một nơi (tokens)
- ✅ **Tái sử dụng tokens có sẵn**: Sử dụng global tokens khi phù hợp

---

## Quy trình chuyển đổi

### Bước 1: Phân tích Sass Settings File

Đọc file `{component-name}.settings.scss` và liệt kê tất cả các biến:

```scss
// base/6-components/ampersand-box/_ampersand-box.settings.scss
$ampersand-box__color: tokens.$base-color-basic-white !default;
$ampersand-box__icon-arrow-color: tokens.$base-color-primary-300 !default;
$ampersand-box__decorative-number-color: tokens.$base-color-primary-100 !default;
$ampersand-box__title-font-variation-settings: 'opsz' 18 !default;
$ampersand-box__last-arrow-transform: rotate(90deg) !default;
// ... các biến khác
```

### Bước 2: Quyết định giá trị nào cần Token

**⚠️ QUY TẮC QUAN TRỌNG:** Chỉ tạo component token khi biến đó **ĐƯỢC OVERRIDE trong theme settings** (có khai báo trong `with()` clause).

#### ✅ **CẦN Token** khi:
- **Biến được override trong theme settings file** (có trong `@use ... with (...)` clause)
- Giá trị thay đổi giữa các theme
- Cần component-specific override

**Ví dụ:**
```scss
// infracapital/6-components/ampersand-box/_ampersand-box.settings.scss
@use '../../../base/6-components/ampersand-box/ampersand-box.settings' with (
  $ampersand-box__icon-arrow-color: tokens.$base-color-orange-100, // ✅ Override → CẦN token
  $ampersand-box__decorative-number-color: tokens.$base-color-orange-100, // ✅ Override → CẦN token
  $ampersand-box__color: tokens.$base-color-basic-white // ⚠️ Giữ nguyên → KHÔNG CẦN token
);
```

#### ❌ **KHÔNG CẦN Token** (code trực tiếp hoặc global token) khi:
- Biến **KHÔNG được override** trong theme settings
- Giá trị đơn giản, không thay đổi (grid columns: `repeat(12, minmax(0, 1fr))`)
- Giá trị có thể dùng global tokens có sẵn (spacing, font-size, colors)
- Giá trị giữ nguyên trong tất cả theme (kể cả khi có khai báo nhưng giá trị giữ nguyên)

**Ví dụ:**
```scss
// ✅ Nên có token (có thể override theo theme)
$ampersand-box__icon-arrow-color: tokens.$base-color-primary-300 !default;

// ❌ Không cần token (code trực tiếp)
grid-template-columns: repeat(12, minmax(0, 1fr)); // Không thay đổi
color: tokens.$base-color-basic-white; // Dùng global token trực tiếp
```

#### ⚠️ **TRƯỜNG HỢP ĐẶC BIỆT: CSS Variables cho Responsive Spacing**

**⚠️ QUAN TRỌNG:** Nếu settings file dùng CSS variables `var(--spacer-spacing-X)` và **KHÔNG có theme override**, thì:

1. **KHÔNG tạo component token** (vì không có theme override)
2. **GIỮ NGUYÊN CSS variables** trong SCSS (không thay bằng SCSS tokens)
3. **XÓA settings file** và dùng CSS variables trực tiếp trong component SCSS

**Lý do:**
- CSS variables `var(--spacer-spacing-X)` là **responsive** theo breakpoint (mobile/tablet/desktop)
- SCSS tokens `tokens.$base-spacing-X` là giá trị **cố định**, không responsive
- Thay thế sẽ làm mất responsive behavior

**Ví dụ:**

```scss
// Settings file (TRƯỚC migration)
$tagged-in__header-sub-title-margin-bottom: var(--spacer-spacing-2) !default;
$tagged-in__header-margin-bottom: var(--spacer-spacing-5) !default;

// ❌ SAI: Thay bằng SCSS tokens (mất responsive behavior)
margin-bottom: tokens.$base-spacing-2; // Giá trị cố định

// ✅ ĐÚNG: Giữ nguyên CSS variables trong SCSS (giữ responsive behavior)
margin-bottom: var(--spacer-spacing-2); // Responsive theo breakpoint
```

**Pattern đúng:**
```scss
// Component SCSS (SAU migration)
.tagged-in {
  .search-page {
    &__header-sub-title {
      margin-bottom: var(--spacer-spacing-2); // ✅ CSS variable (responsive)
    }
    &__header {
      margin-bottom: var(--spacer-spacing-5); // ✅ CSS variable (responsive)
    }
  }
}
```

**Lưu ý:** Pattern này chỉ áp dụng khi:
- Settings file dùng CSS variables `var(--spacer-spacing-X)`
- **KHÔNG có theme override** (không có theme settings file override các biến này)
- Cần giữ responsive behavior theo breakpoint

### Bước 3: Kiểm tra Global Tokens có sẵn

Trước khi tạo component token mới, kiểm tra xem đã có global token phù hợp chưa:

#### Spacing Tokens
```scss
// ❌ Không cần token nếu đã có global token khớp
padding-bottom: functions.pxToRem(56); // 56px = 3.5rem
// ✅ Dùng token có sẵn
padding-bottom: tokens.$base-spacing-7; // 3.5rem/56px
```

#### Font-size Tokens
```scss
// ❌ Không cần token nếu đã có global token khớp
font-size: functions.pxToRem(32); // 32px = 2rem
// ✅ Dùng token có sẵn
font-size: tokens.$base-font-size-h6-lg; // 2rem/32px
```

#### Color Tokens
```scss
// ✅ Có thể dùng global token trực tiếp
color: tokens.$base-color-basic-white;
color: tokens.$base-color-primary-300;
```

### Bước 4: Tạo Base Component Token JSON

**⚠️ QUY TẮC:** Chỉ tạo token cho các biến **ĐƯỢC OVERRIDE trong theme settings**.

**Bước 4.1: Xác định các biến được override**

Kiểm tra theme settings file để xác định biến nào được override:

```scss
// infracapital/6-components/ampersand-box/_ampersand-box.settings.scss
@use '../../../base/6-components/ampersand-box/ampersand-box.settings' with (
  $ampersand-box__icon-arrow-color: tokens.$base-color-orange-100, // ✅ Override → Tạo token
  $ampersand-box__decorative-number-color: tokens.$base-color-orange-100, // ✅ Override → Tạo token
  $ampersand-box__color: tokens.$base-color-basic-white // ❌ Giữ nguyên → KHÔNG tạo token
);
```

**Bước 4.2: Tạo file token JSON**

Chỉ tạo token cho các biến được override:

```json
{
  "base": {
    "component": {
      "ampersand-box": {
        "icon-arrow-color": {
          "value": "{base.color.primary.300}",
          "comment": "Icon arrow color"
        },
        "decorative-number-color": {
          "value": "{base.color.primary.100}",
          "comment": "Decorative number color"
        }
      }
    }
  }
}
```

**❌ KHÔNG tạo token cho:**
- Biến không được override trong theme settings
- Biến được khai báo nhưng giữ nguyên giá trị (như `$ampersand-box__color`)
- Biến có thể dùng global token trực tiếp

**Quy tắc đặt tên token:**
- Chuyển từ BEM format (`$component__element-property`) sang kebab-case (`element-property`)
- Loại bỏ prefix `$component__`
- Ví dụ: `$ampersand-box__icon-arrow-color` → `icon-arrow-color`

**Format giá trị:**
- Colors: Reference global tokens: `"{base.color.primary.300}"`
- Spacing: Reference global tokens: `"{base.spacing.3}"`
- Font sizes: Reference global tokens: `"{base.fonts.font-size.h1-lg}"`
- Custom values: Viết trực tiếp: `"'opsz' 18"`, `"rotate(90deg)"`

**Lưu ý quan trọng:**
- Chỉ tạo token cho biến được override trong theme settings
- Nếu không có theme override, dùng global token trực tiếp hoặc code trực tiếp

### Bước 5: Update Component SCSS

#### Trường hợp 1: Dùng Component Token (KHI ĐÃ TẠO COMPONENT TOKEN)

**⚠️ QUAN TRỌNG:** Nếu đã tạo component token trong JSON, **PHẢI** dùng component token trong SCSS để theme override hoạt động đúng.

```scss
// Trước (Sass Settings)
@use './ampersand-box.settings' as settings;
color: settings.$ampersand-box__icon-arrow-color;

// ✅ Đúng: Dùng component token (theme override sẽ hoạt động)
@use '../../1-settings/tokens';
color: tokens.$base-component-ampersand-box-icon-arrow-color;

// ❌ SAI: Dùng global token trực tiếp (theme override KHÔNG hoạt động)
color: tokens.$base-color-primary-300; // Theme override sẽ không apply!
```

**Lý do:**
- Component token: Base theme dùng `primary.300`, Infracapital theme override thành `orange.100` ✅
- Global token trực tiếp: Tất cả theme đều dùng `primary.300`, không thể override ❌

#### Trường hợp 2: Code trực tiếp (không cần token)
```scss
// Giá trị đơn giản, không thay đổi
grid-template-columns: repeat(12, minmax(0, 1fr));
transform: rotate(90deg);
font-variation-settings: 'opsz' 18;
```

#### Trường hợp 3: Dùng Global Token trực tiếp (KHI KHÔNG CẦN OVERRIDE)

Chỉ dùng global token trực tiếp khi:
- Giá trị không thay đổi giữa các theme
- Không cần component-specific override

```scss
// ✅ Đúng: Dùng global token khi không cần override
color: tokens.$base-color-basic-white; // Giữ nguyên trong tất cả theme
padding-bottom: tokens.$base-spacing-7; // Giữ nguyên trong tất cả theme
font-size: tokens.$base-font-size-h6-lg; // Giữ nguyên trong tất cả theme
```

#### Trường hợp 4: Dùng CSS Variables cho Responsive Spacing (KHI SETTINGS DÙNG CSS VARIABLES)

**⚠️ QUAN TRỌNG:** Nếu settings file dùng CSS variables `var(--spacer-spacing-X)` và **KHÔNG có theme override**:

```scss
// Trước (Sass Settings)
@use './tagged-in.settings' as settings;
margin-bottom: settings.$tagged-in__header-sub-title-margin-bottom;

// ✅ Đúng: Giữ nguyên CSS variables trong SCSS (responsive behavior)
margin-bottom: var(--spacer-spacing-2);

// ❌ SAI: Thay bằng SCSS tokens (mất responsive behavior)
margin-bottom: tokens.$base-spacing-2; // Giá trị cố định, không responsive
```

**Lý do:**
- CSS variables `var(--spacer-spacing-X)` được generate từ spacing utilities và **responsive** theo breakpoint
- SCSS tokens `tokens.$base-spacing-X` là giá trị **cố định**, không responsive
- Thay thế sẽ làm mất responsive behavior

**Pattern đúng:**
```scss
// Component SCSS (SAU migration - không có settings file)
.tagged-in {
  .search-page {
    &__header-sub-title {
      margin-bottom: var(--spacer-spacing-2); // ✅ CSS variable (responsive)
    }
    &__header {
      margin-bottom: var(--spacer-spacing-5); // ✅ CSS variable (responsive)
    }
  }
}
```

### Bước 6: Xử lý Theme Overrides

**Bước 6.1: Kiểm tra Theme Settings**

Chỉ tạo theme token JSON cho các biến được override trong theme settings file:

```scss
// infracapital/6-components/ampersand-box/_ampersand-box.settings.scss
@use '../../../base/6-components/ampersand-box/ampersand-box.settings' with (
  $ampersand-box__icon-arrow-color: tokens.$base-color-orange-100, // ✅ Override → Tạo theme token
  $ampersand-box__decorative-number-color: tokens.$base-color-orange-100, // ✅ Override → Tạo theme token
  $ampersand-box__color: tokens.$base-color-basic-white // ❌ Giữ nguyên → KHÔNG tạo theme token
);
```

**Bước 6.2: Tạo Theme Token JSON**

Chỉ tạo token cho các biến được override với giá trị khác:

```json
{
  "infracapital": {
    "component": {
      "ampersand-box": {
        "icon-arrow-color": {
          "value": "{base.color.orange.100}",
          "comment": "{base.component.ampersand-box.icon-arrow-color.comment}"
        },
        "decorative-number-color": {
          "value": "{base.color.orange.100}",
          "comment": "{base.component.ampersand-box.decorative-number-color.comment}"
        }
      }
    }
  }
}
```

**Lưu ý:**
- ✅ Chỉ override các token thực sự khác với base (giá trị khác)
- ✅ Giữ nguyên comment từ base token: `"{base.component.ampersand-box.token-name.comment}"`
- ❌ Không cần override token giữ nguyên giá trị (như `$ampersand-box__color`)
- ❌ Không tạo token cho biến không có trong `with()` clause

### Bước 7: Cleanup

1. Xóa import của settings file trong component SCSS
2. Xóa file settings (base và theme)
3. Xóa import settings trong `components-settings-imports.scss`
4. Build Style Dictionary và test

### Bước 8: Kiểm tra và Tối ưu Global Tokens

**⚠️ QUAN TRỌNG:** Sau khi migration, kiểm tra lại xem có giá trị nào có thể thay bằng global tokens không.

#### Kiểm tra Font-size

Tìm tất cả `functions.pxToRem()` dùng cho font-size và so sánh với global font-size tokens:

```scss
// ❌ Trước khi tối ưu
font-size: functions.pxToRem(20); // 1.25rem = 20px
font-size: functions.pxToRem(14); // 0.875rem = 14px
font-size: functions.pxToRem(18); // 1.125rem = 18px
font-size: functions.pxToRem(24); // 1.5rem = 24px (icon size)

// ✅ Sau khi tối ưu
font-size: tokens.$base-font-size-h10; // 1.25rem/20px
font-size: tokens.$base-font-size-sm; // 0.875rem/14px
font-size: tokens.$base-font-size-large-lg; // 1.125rem/18px
font-size: tokens.$base-font-size-h7; // 1.5rem/24px (icon size)
```

**⚠️ QUAN TRỌNG:** Không phân biệt text font-size hay icon font-size - nếu giá trị khớp với token thì thay thế:

**Các font-size tokens phổ biến:**
- `0.875rem/14px` → `tokens.$base-font-size-sm` hoặc `tokens.$base-font-size-btn`
- `1rem/16px` → `tokens.$base-font-size-base`
- `1.125rem/18px` → `tokens.$base-font-size-large-lg`
- `1.25rem/20px` → `tokens.$base-font-size-h10`
- `1.5rem/24px` → `tokens.$base-font-size-h7` hoặc `tokens.$base-font-size-h9-lg`
- `1.75rem/28px` → `tokens.$base-font-size-h6` hoặc `tokens.$base-font-size-h8`

#### Kiểm tra Spacing

Tìm tất cả `functions.pxToRem()` dùng cho spacing (margin, padding, gap, top, bottom, left, right) và so sánh với global spacing tokens:

```scss
// ❌ Trước khi tối ưu
padding: functions.pxToRem(8) functions.pxToRem(12); // 0.5rem, 0.75rem
top: calc(100% + #{functions.pxToRem(12)}); // 0.75rem

// ✅ Sau khi tối ưu
padding: tokens.$base-spacing-1 tokens.$base-spacing-half-gap; // 0.5rem, 0.75rem
top: calc(100% + #{tokens.$base-spacing-half-gap}); // 0.75rem
```

**⚠️ QUAN TRỌNG:** Cũng kiểm tra size values (width, height, min-width, min-height, max-width, max-height) - có thể dùng spacing tokens nếu giá trị khớp:

```scss
// ❌ Trước khi tối ưu
width: functions.pxToRem(48); // 3rem = 48px
height: functions.pxToRem(72); // 4.5rem = 72px
min-height: functions.pxToRem(72); // 4.5rem = 72px

// ✅ Sau khi tối ưu
width: tokens.$base-spacing-6; // 3rem/48px
height: tokens.$base-spacing-9; // 4.5rem/72px
min-height: tokens.$base-spacing-9; // 4.5rem/72px
```

**Các spacing tokens phổ biến:**
- `0.5rem/8px` → `tokens.$base-spacing-1`
- `0.75rem/12px` → `tokens.$base-spacing-half-gap`
- `1rem/16px` → `tokens.$base-spacing-2`
- `1.5rem/24px` → `tokens.$base-spacing-3`
- `2rem/32px` → `tokens.$base-spacing-4`
- `2.5rem/40px` → `tokens.$base-spacing-5`
- `3rem/48px` → `tokens.$base-spacing-6`
- `3.5rem/56px` → `tokens.$base-spacing-7`
- `4rem/64px` → `tokens.$base-spacing-8`
- `4.5rem/72px` → `tokens.$base-spacing-9`

**Lưu ý:**
- ✅ Thay thế cho spacing values (margin, padding, gap)
- ✅ Thay thế cho positioning values (top, bottom, left, right) khi là spacing
- ✅ **CÓ THỂ thay thế cho size values (width, height, min-width, min-height, max-width, max-height)** nếu giá trị khớp với spacing tokens
- ✅ **CÓ THỂ thay thế cho icon font-sizes** nếu giá trị khớp với font-size tokens

#### Kiểm tra Border-radius Tokens

**⚠️ QUAN TRỌNG:** Luôn dùng border-radius tokens thay vì hardcode giá trị hoặc CSS variables:

```scss
// ❌ Trước khi tối ưu
border-radius: 0;
border-radius: var(--spacer-spacing-1); // 0.5rem/8px
border-radius: functions.pxToRem(8); // 0.5rem/8px

// ✅ Sau khi tối ưu
border-radius: tokens.$base-border-radius-none; // 0
border-radius: tokens.$base-border-radius-sm; // 0.5rem/8px
border-radius: tokens.$base-border-radius-sm; // 0.5rem/8px
```

**Các border-radius tokens:**
- `0` → `tokens.$base-border-radius-none`
- `0.25rem/4px` → `tokens.$base-border-radius-xs`
- `0.5rem/8px` → `tokens.$base-border-radius-sm` (hoặc `var(--spacer-spacing-1)` nếu là responsive spacing)
- `1rem/16px` → `tokens.$base-border-radius-md`
- `1.5rem/24px` → `tokens.$base-border-radius-lg`
- `2rem/32px` → `tokens.$base-border-radius-xl`
- `2.5rem/40px` → `tokens.$base-border-radius-2xl`
- `50%` → `tokens.$base-border-radius-circle`
- `62.4375rem/999px` → `tokens.$base-border-radius-full`

**Lưu ý:**
- ✅ **LUÔN** dùng `tokens.$base-border-radius-none` thay vì `border-radius: 0;`
- ✅ **LUÔN** dùng `tokens.$base-border-radius-sm` thay vì `border-radius: var(--spacer-spacing-1);` (trừ khi cần responsive behavior)
- ✅ Thay thế cho tất cả border-radius properties: `border-radius`, `border-top-left-radius`, `border-bottom-right-radius`, etc.

#### Kiểm tra Opacity Tokens

**⚠️ QUAN TRỌNG:** Luôn dùng opacity tokens thay vì hardcode giá trị:

```scss
// ❌ Trước khi tối ưu
opacity: 0;
opacity: 1;

// ✅ Sau khi tối ưu
opacity: tokens.$base-opacity-0; // Fully transparent
opacity: tokens.$base-opacity-100; // Fully opaque
```

**Các opacity tokens phổ biến:**
- `0` → `tokens.$base-opacity-0` (Fully transparent)
- `1` → `tokens.$base-opacity-100` (Fully opaque)
- `0.1` → `tokens.$base-opacity-10`
- `0.2` → `tokens.$base-opacity-20`
- `0.25` → `tokens.$base-opacity-25`
- `0.3` → `tokens.$base-opacity-30`
- `0.5` → `tokens.$base-opacity-50`
- `0.8` → `tokens.$base-opacity-80`
- `0.9` → `tokens.$base-opacity-90`
- `0.95` → `tokens.$base-opacity-95`

**Lưu ý:**
- ✅ **LUÔN** dùng `tokens.$base-opacity-0` thay vì `opacity: 0;`
- ✅ **LUÔN** dùng `tokens.$base-opacity-100` thay vì `opacity: 1;`
- ✅ Kiểm tra tất cả opacity values trong code và thay bằng tokens khi có match

**Ví dụ:**
```scss
// ✅ Đúng: Thay spacing
padding: functions.pxToRem(8) → tokens.$base-spacing-1
margin-bottom: functions.pxToRem(12) → tokens.$base-spacing-half-gap
top: calc(100% + #{functions.pxToRem(8)}) → calc(100% + #{tokens.$base-spacing-1})

// ✅ Đúng: Thay size values nếu khớp với spacing tokens
width: functions.pxToRem(48) → tokens.$base-spacing-6 // 3rem/48px
height: functions.pxToRem(72) → tokens.$base-spacing-9 // 4.5rem/72px
min-height: functions.pxToRem(72) → tokens.$base-spacing-9 // 4.5rem/72px

// ✅ Đúng: Thay icon font-size nếu khớp với font-size tokens
font-size: functions.pxToRem(24) → tokens.$base-font-size-h7 // 1.5rem/24px
font-size: functions.pxToRem(28) → tokens.$base-font-size-h6 // 1.75rem/28px

// ❌ Giữ nguyên: Component-specific sizes không khớp với tokens
width: functions.pxToRem(54); // Không có token khớp - component-specific
height: functions.pxToRem(110); // Không có token khớp - component-specific
font-size: functions.pxToRem(13); // Không có token khớp - component-specific
```

---

## Ví dụ thực tế: Ampersand Box

### Trước khi chuyển đổi

**Base Settings:**
```scss
// base/6-components/ampersand-box/_ampersand-box.settings.scss
$ampersand-box__color: tokens.$base-color-basic-white !default;
$ampersand-box__icon-arrow-color: tokens.$base-color-primary-300 !default;
$ampersand-box__decorative-number-color: tokens.$base-color-primary-100 !default;
$ampersand-box__title-font-variation-settings: 'opsz' 18 !default;
$ampersand-box__last-arrow-transform: rotate(90deg) !default;
$ampersand-box__container-grid-template-columns: repeat(12, minmax(0, 1fr)) !default;
// ... nhiều biến khác
```

**Component SCSS:**
```scss
@use './ampersand-box.settings' as settings;

.cmp-ampersand-box {
  color: settings.$ampersand-box__color;
}
```

### Sau khi chuyển đổi

**Bước 1: Kiểm tra Theme Settings**

```scss
// infracapital/6-components/ampersand-box/_ampersand-box.settings.scss
@use '...' with (
  $ampersand-box__icon-arrow-color: tokens.$base-color-orange-100, // ✅ Override → Cần token
  $ampersand-box__decorative-number-color: tokens.$base-color-orange-100, // ✅ Override → Cần token
  $ampersand-box__color: tokens.$base-color-basic-white // ❌ Giữ nguyên → KHÔNG cần token
);
```

**Bước 2: Tạo Base Token JSON (chỉ cho các biến được override)**

```json
{
  "base": {
    "component": {
      "ampersand-box": {
        "icon-arrow-color": {
          "value": "{base.color.primary.300}",
          "comment": "Icon arrow color"
        },
        "decorative-number-color": {
          "value": "{base.color.primary.100}",
          "comment": "Decorative number color"
        }
      }
    }
  }
}
```

**Lưu ý:** Không tạo token cho `color` vì nó giữ nguyên giá trị trong theme settings.

**Component SCSS:**
```scss
@use '../../1-settings/tokens';

.cmp-ampersand-box {
  color: tokens.$base-color-basic-white; // Dùng global token trực tiếp (không cần override)
}

.ampersand-box__icon-arrow {
  // ✅ Đúng: Dùng component token (có override trong theme)
  color: tokens.$base-component-ampersand-box-icon-arrow-color;
  // Base: primary.300, Infracapital: orange.100
}

.ampersand-box__decorative-number {
  // ✅ Đúng: Dùng component token (có override trong theme)
  color: tokens.$base-component-ampersand-box-decorative-number-color;
  // Base: primary.100, Infracapital: orange.100
}

.ampersand-box__container {
  grid-template-columns: repeat(12, minmax(0, 1fr)); // Code trực tiếp (không thay đổi)
}
```

**⚠️ Lưu ý quan trọng:**
- Nếu đã tạo component token trong JSON, **PHẢI** dùng component token trong SCSS
- Không được dùng global token trực tiếp nếu muốn theme override hoạt động
- Ví dụ: `tokens.$base-color-primary-300` → `tokens.$base-component-ampersand-box-icon-arrow-color`

**Các giá trị đã xử lý:**
- ✅ `color`: Dùng global token trực tiếp (`tokens.$base-color-basic-white`)
- ✅ `icon-arrow-color`: Component token (có override trong theme)
- ✅ `container-grid-template-columns`: Code trực tiếp (không thay đổi)
- ✅ `font-variation-settings`: Code trực tiếp (`'opsz' 18`)
- ✅ `transform`: Code trực tiếp (`rotate(90deg)`)

---

## Ví dụ thực tế: Tagged In (CSS Variables)

### Trước khi chuyển đổi

**Base Settings:**
```scss
// base/6-components/tagged-in/_tagged-in.settings.scss
$tagged-in__header-sub-title-margin-bottom: var(--spacer-spacing-2) !default;
$tagged-in__header-margin-bottom: var(--spacer-spacing-5) !default;
```

**Component SCSS:**
```scss
@use './tagged-in.settings' as settings;

.tagged-in {
  .search-page__header-sub-title {
    margin-bottom: settings.$tagged-in__header-sub-title-margin-bottom;
  }
  .search-page__header {
    margin-bottom: settings.$tagged-in__header-margin-bottom;
  }
}
```

**Kiểm tra Theme Settings:**
- ❌ Không có theme settings file cho `tagged-in`
- ❌ Không có theme override

### Sau khi chuyển đổi

**Phân tích:**
- Settings file dùng CSS variables `var(--spacer-spacing-X)`
- **KHÔNG có theme override** → KHÔNG CẦN component token
- CSS variables là responsive → GIỮ NGUYÊN CSS variables trong SCSS

**Component SCSS:**
```scss
// ✅ Đúng: Giữ nguyên CSS variables (responsive behavior)
.tagged-in {
  .search-page {
    display: block;
    &__header-sub-title {
      margin-bottom: var(--spacer-spacing-2); // ✅ CSS variable (responsive)
    }
    &__header {
      margin-bottom: var(--spacer-spacing-5); // ✅ CSS variable (responsive)
    }
  }
}
```

**⚠️ Lưu ý quan trọng:**
- ❌ KHÔNG thay bằng SCSS tokens: `tokens.$base-spacing-2` (mất responsive behavior)
- ✅ GIỮ NGUYÊN CSS variables: `var(--spacer-spacing-2)` (giữ responsive behavior)
- ✅ XÓA settings file (không cần thiết)

**Kết quả:**
- ✅ Responsive behavior được giữ nguyên (mobile/tablet/desktop)
- ✅ Không có settings file (cleanup)
- ✅ Code đơn giản hơn, dễ maintain

---

## Ví dụ thực tế: Search Box (Tối ưu Global Tokens)

### Sau khi migration cơ bản

**Component SCSS (sau migration cơ bản):**
```scss
.searchbox {
  &__input-label {
    font-size: functions.pxToRem(20); // ❌ Có thể thay bằng token
    padding: functions.pxToRem(11) functions.pxToRem(90) functions.pxToRem(11) var(--spacer-spacing-3);
  }

  &__input {
    font-size: functions.pxToRem(20); // ❌ Có thể thay bằng token
    min-height: functions.pxToRem(54);
  }

  &__clear {
    font-size: functions.pxToRem(14); // ❌ Có thể thay bằng token
  }

  &__button-label--icon {
    font-size: functions.pxToRem(28);
  }
}

.suggestions-container {
  top: calc(100% + #{functions.pxToRem(8)}); // ❌ Có thể thay bằng token
}

.search-box {
  &:not(&--small-desktop) {
    @include breakpoints.media-breakpoint-up(md) {
      .suggestions-container {
        top: calc(100% + #{functions.pxToRem(12)}); // ❌ Có thể thay bằng token
      }
    }
  }

  &--large-desktop {
    @include breakpoints.media-breakpoint-up(md) {
      .searchbox {
        &__input {
          font-size: functions.pxToRem(18); // ❌ Có thể thay bằng token
        }
      }
    }
  }
}
```

### Sau khi tối ưu Global Tokens

**Component SCSS (sau tối ưu):**
```scss
.searchbox {
  &__input-label {
    font-size: tokens.$base-font-size-h10; // ✅ 1.25rem/20px
    padding: functions.pxToRem(11) functions.pxToRem(90) functions.pxToRem(11) var(--spacer-spacing-3);
  }

  &__input {
    font-size: tokens.$base-font-size-h10; // ✅ 1.25rem/20px
    min-height: functions.pxToRem(54); // Giữ nguyên - không có token khớp
  }

  &__clear {
    font-size: tokens.$base-font-size-sm; // ✅ 0.875rem/14px
  }

  &__button-label--icon {
    font-size: functions.pxToRem(28); // Giữ nguyên - không có token khớp (hoặc có thể dùng tokens.$base-font-size-h6 nếu muốn)
  }

  &__button--submit {
    width: tokens.$base-spacing-5; // ✅ 2.5rem/40px
    height: tokens.$base-spacing-5; // ✅ 2.5rem/40px
  }
}

.suggestions-container {
  top: calc(100% + #{tokens.$base-spacing-1}); // ✅ 0.5rem/8px
}

.search-box {
  &:not(&--small-desktop) {
    @include breakpoints.media-breakpoint-up(md) {
      .searchbox {
        &__input {
          min-height: tokens.$base-spacing-9; // ✅ 4.5rem/72px
        }
        &__button--submit {
          width: tokens.$base-spacing-6; // ✅ 3rem/48px
          height: tokens.$base-spacing-6; // ✅ 3rem/48px
          &:after {
            font-size: tokens.$base-font-size-h7; // ✅ 1.5rem/24px
          }
        }
      }
      .suggestions-container {
        top: calc(100% + #{tokens.$base-spacing-half-gap}); // ✅ 0.75rem/12px
      }
    }
  }

  &--large-desktop {
    @include breakpoints.media-breakpoint-up(md) {
      .searchbox {
        &__input {
          height: tokens.$base-spacing-9; // ✅ 4.5rem/72px
          font-size: tokens.$base-font-size-large-lg; // ✅ 1.125rem/18px
        }
      }
    }
  }
}
```

**Kết quả:**
- ✅ Đã thay thế các giá trị có thể dùng global tokens
- ✅ Giữ nguyên các giá trị component-specific (sizes, icon font-sizes)
- ✅ Code nhất quán hơn, dễ maintain
- ✅ Tận dụng được global tokens system

---

## Best Practices

### 1. Ưu tiên Global Tokens

Luôn kiểm tra global tokens có sẵn trước khi tạo component token mới:

```scss
// ✅ Tốt: Dùng global token
padding-bottom: tokens.$base-spacing-7; // 3.5rem/56px
font-size: tokens.$base-font-size-h6-lg; // 2rem/32px
color: tokens.$base-color-primary-300;

// ❌ Tránh: Tạo component token không cần thiết
padding-bottom: tokens.$base-component-ampersand-box-padding-bottom-lg;
```

**⚠️ QUAN TRỌNG:** Sau khi migration, **LUÔN** kiểm tra lại xem có giá trị nào có thể thay bằng global tokens không:

```scss
// ❌ Trước khi tối ưu
font-size: functions.pxToRem(20); // 1.25rem
padding: functions.pxToRem(8) functions.pxToRem(12); // 0.5rem, 0.75rem
border-radius: 0;
border-radius: var(--spacer-spacing-1); // 0.5rem/8px
opacity: 0;
opacity: 1;

// ✅ Sau khi tối ưu
font-size: tokens.$base-font-size-h10; // 1.25rem/20px
padding: tokens.$base-spacing-1 tokens.$base-spacing-half-gap; // 0.5rem, 0.75rem
border-radius: tokens.$base-border-radius-none; // 0
border-radius: tokens.$base-border-radius-sm; // 0.5rem/8px
opacity: tokens.$base-opacity-0; // Fully transparent
opacity: tokens.$base-opacity-100; // Fully opaque
```

**Các giá trị cần kiểm tra sau migration:**
- ✅ Font-size: `functions.pxToRem()` → `tokens.$base-font-size-*`
- ✅ Spacing: `functions.pxToRem()` → `tokens.$base-spacing-*` (bao gồm width/height nếu khớp)
- ✅ Border-radius: `0`, `var(--spacer-spacing-X)` → `tokens.$base-border-radius-*`
- ✅ Opacity: `0`, `1` → `tokens.$base-opacity-0`, `tokens.$base-opacity-100`
- ✅ Border-width: `functions.pxToRem()` → `tokens.$base-border-width-*`

### 2. Chỉ tạo Token khi có Override trong Theme Settings - VÀ PHẢI DÙNG COMPONENT TOKEN

**⚠️ QUAN TRỌNG:**
1. **Chỉ tạo token** khi biến được override trong theme settings (có trong `with()` clause)
2. **PHẢI dùng component token** trong SCSS khi đã tạo token, không dùng global token trực tiếp

**Quy trình:**
```scss
// Bước 1: Kiểm tra theme settings
// infracapital/.../ampersand-box.settings.scss
@use '...' with (
  $ampersand-box__icon-arrow-color: tokens.$base-color-orange-100, // ✅ Có override → Tạo token
  $ampersand-box__decorative-number-color: tokens.$base-color-orange-100, // ✅ Có override → Tạo token
  // Không có override cho các biến khác → KHÔNG tạo token
);

// Bước 2: Tạo token JSON chỉ cho các biến được override
// tokens/base/component/ampersand-box.json
{
  "icon-arrow-color": { "value": "{base.color.primary.300}" },
  "decorative-number-color": { "value": "{base.color.primary.100}" }
}

// Bước 3: Dùng component token trong SCSS
// ✅ Đúng: Dùng component token
color: tokens.$base-component-ampersand-box-icon-arrow-color;
// Base theme: primary.300, Infracapital theme: orange.100 ✅

// ❌ SAI: Dùng global token trực tiếp (theme override KHÔNG hoạt động)
color: tokens.$base-color-primary-300;
// Tất cả theme: primary.300 ❌

// ❌ Không tạo token: Biến không có override trong theme settings
grid-template-columns: repeat(12, minmax(0, 1fr)); // Code trực tiếp
```

### 3. Code trực tiếp cho giá trị đơn giản

```scss
// ✅ Code trực tiếp
grid-column: span 6 / span 6;
grid-column-start: 2;
transform: rotate(90deg);
font-variation-settings: 'opsz' 18;

// ❌ Không cần token cho những giá trị này
```

### 4. Sử dụng Interpolation cho Grid Values

```scss
// ✅ Đúng: Dùng interpolation cho grid column values
grid-column: span 6 / span 6;
grid-column: #{tokens.$base-component-ampersand-box-content-grid-column-lg};

// ❌ Sai: Không cần interpolation cho số đơn giản
grid-column-start: 2; // Không cần interpolation
```

### 5. Comment trong Token JSON

Luôn thêm comment mô tả rõ ràng:

```json
{
  "icon-arrow-color": {
    "value": "{base.color.primary.300}",
    "comment": "Icon arrow color - used in navigation arrows"
  }
}
```

### 6. Theme Override Format

Khi override trong theme, giữ nguyên comment từ base:

```json
{
  "infracapital": {
    "component": {
      "ampersand-box": {
        "icon-arrow-color": {
          "value": "{base.color.orange.100}",
          "comment": "{base.component.ampersand-box.icon-arrow-color.comment}"
        }
      }
    }
  }
}
```

---

## Checklist Migration

Khi chuyển đổi một component, đảm bảo:

- [ ] Đã phân tích tất cả biến trong settings file
- [ ] **QUAN TRỌNG:** Đã kiểm tra theme settings để xác định biến nào được override (có trong `with()` clause)
- [ ] **QUAN TRỌNG:** Đã kiểm tra xem settings file có dùng CSS variables `var(--spacer-spacing-X)` không
  - Nếu có CSS variables và KHÔNG có theme override → Giữ nguyên CSS variables trong SCSS
  - Nếu có CSS variables và CÓ theme override → Tạo component token và dùng trong SCSS
- [ ] Đã kiểm tra global tokens có sẵn
- [ ] Đã quyết định giá trị nào cần token (chỉ các biến được override trong theme)
- [ ] Đã tạo base component token JSON (chỉ cho các biến được override)
- [ ] Đã update component SCSS (xóa import settings, dùng tokens hoặc CSS variables)
- [ ] **QUAN TRỌNG:** Đã dùng component tokens thay vì global tokens trực tiếp trong SCSS (khi có theme override)
- [ ] **QUAN TRỌNG:** Đã giữ nguyên CSS variables trong SCSS (khi settings dùng CSS variables và không có theme override)
- [ ] Đã tạo theme token JSON cho các biến được override (chỉ các biến có giá trị khác)
- [ ] Đã xóa settings files (base và theme)
- [ ] Đã xóa import settings trong `components-settings-imports.scss`
- [ ] **QUAN TRỌNG:** Đã kiểm tra và thay thế các giá trị có thể dùng global tokens
  - [ ] Đã kiểm tra font-size: thay `functions.pxToRem()` bằng `tokens.$base-font-size-*` khi khớp (bao gồm cả icon font-sizes)
  - [ ] Đã kiểm tra spacing: thay `functions.pxToRem()` bằng `tokens.$base-spacing-*` khi khớp (bao gồm cả width/height nếu khớp)
  - [ ] Đã kiểm tra border-width: thay `functions.pxToRem()` bằng `tokens.$base-border-width-*` khi khớp
  - [ ] Đã kiểm tra size values (width, height, min-width, min-height): thay bằng spacing tokens nếu khớp
  - [ ] **QUAN TRỌNG:** Đã kiểm tra border-radius: thay `border-radius: 0;` và `border-radius: var(--spacer-spacing-X);` bằng `tokens.$base-border-radius-*` khi khớp
  - [ ] **QUAN TRỌNG:** Đã kiểm tra opacity: thay `opacity: 0;` và `opacity: 1;` bằng `tokens.$base-opacity-0` và `tokens.$base-opacity-100`
- [ ] Đã build Style Dictionary và test
- [ ] Đã verify theme overrides hoạt động đúng (kiểm tra cả base và theme)
- [ ] Đã verify responsive behavior hoạt động đúng (nếu dùng CSS variables)

---

## Troubleshooting

### Token không được generate

- Kiểm tra file JSON có đúng format không
- Kiểm tra tên token có đúng convention không
- Rebuild Style Dictionary: `npm run build:tokens`

### Theme override không hoạt động

**Nguyên nhân phổ biến nhất:** Dùng global token trực tiếp thay vì component token trong SCSS.

```scss
// ❌ SAI: Theme override không hoạt động
color: tokens.$base-color-primary-300; // Global token trực tiếp

// ✅ ĐÚNG: Theme override hoạt động
color: tokens.$base-component-ampersand-box-icon-arrow-color; // Component token
```

**Các bước kiểm tra:**
1. ✅ Kiểm tra SCSS đã dùng component token chưa: `tokens.$base-component-{component-name}-{token-name}`
2. ✅ Kiểm tra file theme token JSON có đúng path không
3. ✅ Kiểm tra tên token có khớp với base token không
4. ✅ Kiểm tra reference format: `"{base.component.component-name.token-name.comment}"`
5. ✅ Rebuild Style Dictionary: `npm run build:tokens`
6. ✅ Kiểm tra token đã được generate trong `_tokens.scss`: `grep "base-component-{component-name}" _tokens.scss`

### SCSS không compile

- Kiểm tra đã import tokens: `@use '../../1-settings/tokens';`
- Kiểm tra tên token variable: `tokens.$base-component-{component-name}-{token-name}`
- Kiểm tra format: dấu gạch ngang trong JSON → dấu gạch ngang trong SCSS variable

### Mất responsive behavior sau khi migration

**Nguyên nhân:** Thay thế CSS variables `var(--spacer-spacing-X)` bằng SCSS tokens cố định.

**Giải pháp:**
```scss
// ❌ SAI: Mất responsive behavior
margin-bottom: tokens.$base-spacing-2; // Giá trị cố định

// ✅ ĐÚNG: Giữ responsive behavior
margin-bottom: var(--spacer-spacing-2); // Responsive theo breakpoint
```

**Khi nào dùng CSS variables:**
- Settings file ban đầu dùng `var(--spacer-spacing-X)`
- **KHÔNG có theme override** (không có theme settings file)
- Cần giữ responsive behavior theo breakpoint

**Khi nào dùng SCSS tokens:**
- Settings file dùng SCSS tokens trực tiếp (`tokens.$base-spacing-X`)
- Hoặc có theme override và cần component token

---

## Tài liệu tham khảo

- [TOKEN_APPROACH_COMPARISON.md](./TOKEN_APPROACH_COMPARISON.md) - So sánh các approaches
- [Style Dictionary Documentation](https://amzn.github.io/style-dictionary/)
- Component examples: `content-tile`, `ampersand-box`

---

## Liên hệ

Nếu có thắc mắc hoặc cần hỗ trợ trong quá trình migration, vui lòng liên hệ team lead hoặc tham khảo các examples trong project.

