# Merge Conflict Resolution Guide

## Nguyên tắc chung

Khi resolve merge conflicts giữa `HEAD` và `origin/develop`:

1. **⚠️ develop LUÔN LÀ CODE MỚI NHẤT**: `origin/develop` chứa code mới nhất, bug fixes và updates. Luôn ưu tiên logic từ develop
2. **Xóa code không có trong develop**: Nếu HEAD có code mà develop không có, phải XÓA code đó (không phải code mới, mà là code cũ đã bị xóa trong develop)
3. **Follow token structure**: Migrate tất cả settings variables sang token structure (tokens, functions.pxToRem(), hoặc CSS variables)
4. **Đảm bảo CSS output giống nhau**: Sau khi resolve, CSS output cuối cùng phải giống hệt với `origin/develop`

## Quy trình resolve conflict

### Bước 1: Xác định conflict

```bash
# Tìm tất cả conflicts
git diff --name-only --diff-filter=U

# Hoặc
grep -r "<<<<<<< HEAD" .
```

### Bước 2: Phân tích conflict

1. So sánh logic giữa `HEAD` và `origin/develop`
2. Xác định các settings variables được sử dụng trong develop
3. Kiểm tra xem có theme override không

### Bước 3: Resolve conflict theo token structure

#### 3.1. Xóa settings import

Nếu develop sử dụng settings file, xóa import sau khi đã migrate:

```scss
// XÓA dòng này sau khi migrate
@use './component-name.settings' as componentSettings;
```

#### 3.2. Migrate settings variables

**Quy tắc migration:**

| develop sử dụng | Migrate thành | Điều kiện |
|----------------|---------------|-----------|
| `settings.$variable` = `var(--spacer-spacing-X)` | Giữ nguyên `var(--spacer-spacing-X)` | Không có theme override |
| `settings.$variable` = `functions.pxToRem(X)` | Dùng `functions.pxToRem(X)` trực tiếp | Không có theme override |
| `settings.$variable` = `tokens.$base-*` | Dùng `tokens.$base-*` trực tiếp | Global token |
| `settings.$variable` = giá trị hardcoded | Tạo component token hoặc dùng giá trị trực tiếp | Có theme override → token, không → giá trị |

**Ví dụ:**

```scss
// develop
@use './ampersand-box.settings' as ampersandBoxSettings;

.ampersand-box {
  &__image {
    padding-top: ampersandBoxSettings.$ampersand-box__image-padding-top;
  }
}

// HEAD (sau khi resolve)
@use '../../1-settings/tokens';
@use '../../2-tools/functions';

.ampersand-box {
  &__image {
    padding-top: var(--spacer-spacing-5); // Nếu settings.$variable = var(--spacer-spacing-5)
  }
}
```

#### 3.3. Giữ nguyên logic từ develop

- **⚠️ QUAN TRỌNG**: develop là code mới nhất, HEAD có thể có code cũ đã bị xóa
- Giữ nguyên structure và nesting từ develop
- Giữ nguyên breakpoints và responsive logic từ develop
- Giữ nguyên các variants và modifiers từ develop
- Giữ nguyên comments và documentation từ develop
- **XÓA code không có trong develop**: Nếu HEAD có code mà develop không có → XÓA (đây là code cũ đã bị xóa)

### Bước 4: Xử lý token overrides

#### 4.1. Kiểm tra theme override

```bash
# Kiểm tra xem có token override trong theme không
find style-dictionary/tokens -name "component-name.json" -type f
```

#### 4.2. Nếu có override trong theme

- **Nếu giá trị giống base**: Xóa file override (inherit từ base)
- **Nếu giá trị khác base**: Giữ file override với giá trị từ develop

**Ví dụ:**

```json
// style-dictionary/tokens/infracapital/components/text-image.json
// Nếu develop dùng 1.5 và base cũng là 1.5 → XÓA file này
// Nếu develop dùng calc(122/81) nhưng base là 1.5 → GIỮ file với giá trị từ develop
```

#### 4.3. Build lại tokens

```bash
npm run style-dictionary:build
```

### Bước 5: Verify CSS output

```bash
# Build CSS
npm run build:css

# So sánh CSS output
npm run compare:css
```

## Các trường hợp thường gặp

### Case 1: Settings variable → CSS variable

```scss
// develop
padding: settings.$component__padding;

// Sau khi check settings file:
// $component__padding: var(--spacer-spacing-3) !default;

// HEAD (resolved)
padding: var(--spacer-spacing-3);
```

### Case 2: Settings variable → functions.pxToRem()

```scss
// develop
font-size: settings.$component__font-size;

// Sau khi check settings file:
// $component__font-size: functions.pxToRem(16) !default;

// HEAD (resolved)
@use '../../2-tools/functions';
font-size: functions.pxToRem(16);
```

### Case 3: Settings variable → Global token

```scss
// develop
color: settings.$component__color;

// Sau khi check settings file:
// $component__color: tokens.$base-color-primary-100 !default;

// HEAD (resolved)
@use '../../1-settings/tokens';
color: tokens.$base-color-primary-100;
```

### Case 4: Settings variable → Component token

```scss
// develop
color: settings.$component__special-color;

// Sau khi check settings file:
// $component__special-color: #ff0000 !default;

// Kiểm tra theme override:
// - Có override trong infracapital → Tạo component token
// - Không có override → Dùng giá trị trực tiếp

// HEAD (resolved - có override)
@use '../../1-settings/tokens';
color: tokens.$base-component-component-name-special-color;

// HEAD (resolved - không có override)
color: #ff0000;
```

### Case 5: Grid properties

```scss
// develop
grid-template-columns: settings.$component__grid-columns;

// Sau khi check settings file:
// $component__grid-columns: repeat(12, minmax(0, 1fr)) !default;

// HEAD (resolved)
grid-template-columns: repeat(12, minmax(0, 1fr));
```

### Case 6: Transform values

```scss
// develop
transform: settings.$component__transform;

// Sau khi check settings file:
// $component__transform: rotate(90deg) !default;

// HEAD (resolved)
transform: rotate(90deg);
```

### Case 7: Aspect ratio

```scss
// develop
aspect-ratio: settings.$component__aspect-ratio;

// Sau khi check settings file:
// $component__aspect-ratio: 1.5 !default;

// HEAD (resolved)
@use '../../1-settings/tokens';
aspect-ratio: tokens.$base-component-component-name-aspect-ratio;

// Nếu có theme override, check JSON token:
// - Giống base → Xóa override file
// - Khác base → Giữ với giá trị từ develop
```

## Checklist

Trước khi commit:

- [ ] Đã xóa tất cả settings imports
- [ ] Đã migrate tất cả settings variables sang token structure
- [ ] Đã giữ nguyên logic từ develop
- [ ] Đã kiểm tra và xử lý theme overrides
- [ ] Đã build lại tokens nếu có thay đổi JSON
- [ ] Đã verify CSS output giống với develop
- [ ] Không có linter errors

## Lưu ý quan trọng

1. **⚠️ develop LUÔN LÀ CODE MỚI NHẤT**: Nếu HEAD có code mà develop không có → XÓA (không phải code mới, mà là code cũ)
2. **KHÔNG hardcode values** nếu có thể dùng token hoặc CSS variable
3. **KHÔNG thay đổi logic** từ develop, chỉ migrate structure
4. **LUÔN verify CSS output** sau khi resolve
5. **XÓA settings file imports** sau khi đã migrate hết variables
6. **KIỂM TRA theme overrides** trước khi quyết định dùng token hay giá trị trực tiếp
7. **XÓA code không có trong develop**: Kiểm tra kỹ, nếu develop không có → xóa

## Ví dụ hoàn chỉnh

### Trước khi resolve

```scss
// develop
@use './ampersand-box.settings' as ampersandBoxSettings;

.ampersand-box {
  &__image {
    padding-top: ampersandBoxSettings.$ampersand-box__image-padding-top;
    padding-bottom: ampersandBoxSettings.$ampersand-box__image-padding-bottom;
  }

  &__title {
    font-size: ampersandBoxSettings.$ampersand-box__title-font-size;
    color: ampersandBoxSettings.$ampersand-box__title-color;
  }
}

// HEAD
@use '../../1-settings/tokens';

.ampersand-box {
  &__image {
    padding-top: var(--spacer-spacing-2);
  }
}
```

### Sau khi resolve

```scss
// HEAD (resolved)
@use '../../1-settings/tokens';
@use '../../2-tools/functions';

.ampersand-box {
  &__image {
    padding-top: var(--spacer-spacing-5); // Từ settings: var(--spacer-spacing-5)
    padding-bottom: var(--spacer-spacing-3); // Từ settings: var(--spacer-spacing-3)
  }

  &__title {
    font-size: functions.pxToRem(47); // Từ settings: functions.pxToRem(47)
    color: tokens.$base-color-basic-white; // Từ settings: tokens.$base-color-basic-white
  }
}
```

## Tools hỗ trợ

```bash
# Tìm tất cả conflicts
grep -r "<<<<<<< HEAD" .

# Check settings file trong develop
git show origin/develop:path/to/component.settings.scss

# So sánh CSS output
npm run compare:css

# Build tokens
npm run style-dictionary:build
```

