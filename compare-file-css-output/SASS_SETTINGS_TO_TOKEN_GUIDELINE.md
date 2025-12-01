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
- [ ] Đã kiểm tra global tokens có sẵn
- [ ] Đã quyết định giá trị nào cần token (chỉ các biến được override trong theme)
- [ ] Đã tạo base component token JSON (chỉ cho các biến được override)
- [ ] Đã update component SCSS (xóa import settings, dùng tokens)
- [ ] **QUAN TRỌNG:** Đã dùng component tokens thay vì global tokens trực tiếp trong SCSS
- [ ] Đã tạo theme token JSON cho các biến được override (chỉ các biến có giá trị khác)
- [ ] Đã xóa settings files (base và theme)
- [ ] Đã xóa import settings trong `components-settings-imports.scss`
- [ ] Đã build Style Dictionary và test
- [ ] Đã verify theme overrides hoạt động đúng (kiểm tra cả base và theme)

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

---

## Tài liệu tham khảo

- [TOKEN_APPROACH_COMPARISON.md](./TOKEN_APPROACH_COMPARISON.md) - So sánh các approaches
- [Style Dictionary Documentation](https://amzn.github.io/style-dictionary/)
- Component examples: `content-tile`, `ampersand-box`

---

## Liên hệ

Nếu có thắc mắc hoặc cần hỗ trợ trong quá trình migration, vui lòng liên hệ team lead hoặc tham khảo các examples trong project.

