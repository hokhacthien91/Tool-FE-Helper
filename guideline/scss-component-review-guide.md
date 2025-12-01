# SCSS Component Code Review Guide

## 📋 Mục đích
File guide này giúp team review code SCSS component một cách nhất quán và đảm bảo tuân thủ SCSS Variable Naming Guideline với BEM methodology.

---

## 🔍 Review Checklist

### **1. Variable & CSS Class Naming Convention**

#### ✅ **Phải kiểm tra:**

##### **SCSS Variables:**
- [ ] **BEM Structure**: Tất cả biến component follow `$block__element-property--modifier`
- [ ] **Kebab-case**: Tên biến dùng lowercase với dấu gạch ngang `-`
- [ ] **Tiếng Anh**: Tất cả tên biến bằng tiếng Anh
- [ ] **!default flag**: Mọi biến đều có `!default`
- [ ] **Descriptive names**: Tên biến mô tả rõ ràng chức năng
- [ ] **Length limit**: Tên biến không quá 40 ký tự

##### **CSS Classes:**
- [ ] **BEM Structure**: Tất cả CSS classes follow `.block__element--modifier`
- [ ] **Kebab-case**: Class names dùng lowercase với dấu gạch ngang `-`
- [ ] **Semantic naming**: Class names mô tả chức năng, không mô tả visual
- [ ] **Component consistency**: Block name consistent với component name

#### ❌ **Red Flags:**
```scss
// BAD - Variables không follow BEM
$graphicCount-fontSize-large: functions.pxToRem(102);
$my_component_color: #fff;
$componentPadding: functions.pxToRem(20);

// BAD - Thiếu !default
$graphic-count__counter-font-size: functions.pxToRem(84);

// BAD - Tên không rõ nghĩa hoặc quá dài (>40 ký tự)
$gc__cs: 84px !default;
$comp__x: 20px !default;
$graphic-count__container-padding-top-for-large-screen-desktop: functions.pxToRem(100) !default; // 70+ ký tự

// BAD - CSS Classes không follow BEM
.graphicCount { } // PascalCase
.graphic_count { } // snake_case
.graphic-count-large-red { } // Mô tả visual thay vì semantic
.red-button { } // Mô tả màu sắc thay vì chức năng
```

#### ✅ **Good Examples:**
```scss
// GOOD - Variables follow BEM với !default (trong 40 ký tự)
$graphic-count__counter-font-size: functions.pxToRem(84) !default;           // 36 ký tự
$graphic-count__counter-font-size--large: functions.pxToRem(102) !default;   // 43 ký tự - acceptable
$graphic-count__container-padding-y--md: functions.pxToRem(84) !default;     // 40 ký tự - tối đa
$button__background-color--primary: tokens.$blue-500 !default;               // 38 ký tự

// GOOD - CSS Classes follow BEM semantic
.graphic-count { }                    // Block
.graphic-count__counter { }           // Element
.graphic-count__counter--large { }    // Element with modifier
.button--primary { }                  // Block with modifier
.navigation__item--active { }         // Element with state modifier
```

---

### **2. Font-Size Variables**

#### ✅ **Phải kiểm tra:**
- [ ] Font-size với giá trị px phải dùng `functions.pxToRem()`
- [ ] Import `@use '../../2-tools/functions';` ở đầu file
- [ ] Syntax đúng: `functions.pxToRem(84)` không phải `pxToRem(84)`

#### ❌ **Common Mistakes:**
```scss
// BAD - Font-size dùng px trực tiếp
$component__title-font-size: 24px !default;

// BAD - Thiếu functions namespace
$component__title-font-size: pxToRem(24) !default;

// BAD - Font-size không phải px thì không cần pxToRem
$component__title-font-size: functions.pxToRem(1.5em) !default; // Wrong!
```

#### ✅ **Correct Usage:**
```scss
// GOOD - Font-size với px dùng functions.pxToRem
$component__title-font-size: functions.pxToRem(24) !default;
$component__subtitle-font-size: functions.pxToRem(16) !default;

// GOOD - Font-size với em/rem thì không cần pxToRem
$component__title-line-height: 1.4 !default;
$component__subtitle-font-size: 1rem !default;
```

---

### **3. Forbidden Variables**

#### ❌ **NEVER Create Variables For:**
- [ ] **Z-index values with hardcoded numbers**: Chỉ dùng số trực tiếp hoặc z-index từ tokens
- [ ] **Zero values**: Dùng `0` trực tiếp thay vì tạo biến
- [ ] **One-time use values**: Chỉ tạo biến khi dùng lặp lại

```scss
// BAD - Hardcoded z-index
$component__z-index: 100 !default;
$component__margin-zero: 0 !default;
$component__border-none: none !default;

// GOOD - Z-index from tokens is ALLOWED
$component__z-index: tokens.$base-z-index-ui-dropdown !default;

// GOOD - Use directly in SCSS for hardcoded values
.component {
  z-index: 100;     // Direct number when no token available
  margin: 0;        // Direct zero
  border: none;     // Direct value
}
```

---

### **4. File Structure & Imports**

#### ✅ **Phải kiểm tra:**
- [ ] File settings đặt tên: `<componentName>.settings.scss`
- [ ] Import functions nếu dùng pxToRem: `@use '../../2-tools/functions';`
- [ ] **component-imports.scss import main component file và các variant files**
- [ ] **Print files được import tập trung trong components-print-imports.scss**
- [ ] **Settings files chỉ import khi file khác cần dùng**
- [ ] Không import không cần thiết

#### ✅ **Correct Import Pattern:**

**1. component-imports.scss (Import main file + variants):**
```scss
// navigation-imports.scss - Ví dụ component có nhiều variants
@use 'navigation-base';           // Main component file
@use 'navigation-fund-page';      // Variant file
@use 'navigation-footer-primary'; // Variant file
@use 'navigation-layout';         // Variant file

// article-header-imports.scss - Component đơn giản
@use 'article-header'; // Chỉ main component nếu không có variants
```

**2. Main Component File (Import settings khi cần):**
```scss
// _article-header.scss
@use '../../2-tools/breakpoints';
@use '../../1-settings/tokens';
@use './article-header.settings' as settings; // Import settings khi cần
```

**3. Settings File (Import tools khi cần):**
```scss
// _article-header.settings.scss
@use '../../2-tools/functions';
@use '../../1-settings/tokens';

// Component variables follow BEM
$article-header__padding-top: functions.pxToRem(199) !default;
```

**4. Print Files (Không import trong component-imports.scss):**
```scss
// Print files được import tập trung trong components-print-imports.scss
@use 'article-header/article-header.print';
@use 'button/button.print';
// ... other print imports
```

#### ❌ **Wrong Import Patterns:**
```scss
// BAD - Imports file không được import settings/print
// component-imports.scss
@use 'component.settings'; // WRONG - Settings chỉ import khi cần
@use 'component.print';    // WRONG - Print import tập trung
@use 'component';

// BAD - Import settings không cần thiết
// _component.scss (không dùng settings variables)
@use './component.settings' as settings; // WRONG - Không dùng thì không import
```

---

### **5. BEM Structure Deep Dive**

#### ✅ **Valid BEM Patterns:**
```scss
// Pattern 1: $block__property
$graphic-count__gap: functions.pxToRem(32) !default;
$graphic-count__font-weight-bold: 700 !default;

// Pattern 2: $block__element-property
$graphic-count__counter-font-size: functions.pxToRem(84) !default;
$graphic-count__label-margin-top: functions.pxToRem(8) !default;
$graphic-count__container-padding-y: functions.pxToRem(40) !default;

// Pattern 3: $block__element-property--modifier
$graphic-count__counter-font-size--large: functions.pxToRem(102) !default;
$graphic-count__container-padding-y--medium: functions.pxToRem(72) !default;
$graphic-count__counter-wrapper-separator-color--grey: color.$hover-secondary-800 !default;
```

#### ❌ **Invalid BEM:**
```scss
// BAD - Không theo structure
$graphic-count-font-size-large: functions.pxToRem(102) !default;
$graphicCountCounterSize: functions.pxToRem(84) !default;
$gc__counter__font__size: functions.pxToRem(84) !default; // Too many underscores
```

---

### **6. Modifier Validation**

#### ✅ **Standard Modifiers:**
- **Size**: `--large`, `--medium`, `--small`, `--xl`, `--xs`
- **State**: `--active`, `--hover`, `--disabled`, `--focus`, `--selected`
- **Theme**: `--dark`, `--light`, `--primary`, `--secondary`
- **Color**: `--grey`, `--teal`, `--white`, `--green`, `--coral`
- **Responsive**: `--mobile`, `--tablet`, `--desktop`
- **Orientation**: `--horizontal`, `--vertical`
- **Variant**: `--thin`, `--thick`, `--solid`, `--dashed`

#### ⚠️ **Custom Modifiers:**
Nếu dùng modifier không có trong danh sách trên, cần justify tại sao cần thiết.

---

### **7. Global Variables**

#### ✅ **Valid Global Prefixes:**
- `$ds-` (design system)
- `$color-`, `$color-semantic-` (colors)
- `$theme-group--` (theme)
- `$spacing-`, `$padding-`, `margin-`, `$grid-`, `$gap-` (layout)
- `$animation-`, `$transition-`, `$easing-`, `$duration-` (animations)

#### ❌ **Review Points:**
```scss
// Question: Should this be global or component-specific?
$button-primary-color: #007bff !default; // Maybe component-specific?

// Better as:
$button__background-color--primary: #007bff !default;
```

---

### **8. File & Folder Naming Convention**

#### ✅ **Phải kiểm tra:**
- [ ] **File naming**: Follow kebab-case cho tất cả SCSS files
- [ ] **Component files**: Follow standard structure với required files
- [ ] **Folder structure**: Consistent với project structure
- [ ] **Import paths**: Relative paths chính xác

#### 📁 **Standard Component Structure:**

| File | Required | Description |
|------|----------|-------------|
| `_component-name.scss` | ✅ Yes | Main style definitions for the component |
| `_component-name.settings.scss` | ✅ Yes | SCSS variables and configuration settings |
| `_component-name.print.scss` | ✅ Yes | Print-specific styles for the component |
| `component-name-imports.scss` | ✅ Yes | Imports for all SCSS files related to component |
| `_component-name-variant.scss` | ❌ No | Optional: Styles for different visual variants |

#### ✅ **Example: Accordion Component Structure:**
```
📁 accordion/
├── _accordion.scss                 ← Main styles (Required)
├── _accordion.settings.scss        ← Variables/settings (Required)
├── _accordion.print.scss          ← Print styles (Required)
├── accordion-imports.scss         ← Import file (Required)
└── _accordion-variant.scss        ← Variants (Optional)
```

#### ❌ **Wrong Naming & Structure:**
```scss
// BAD - File naming
📁 GraphicCount/
├── GraphicCount.scss              // Wrong: PascalCase
├── graphic_count.settings.scss    // Wrong: snake_case
└── graphiccount.print.scss        // Wrong: no separator

// BAD - Missing required files
📁 accordion/
├── _accordion.scss                // Missing settings file
└── _accordion.print.scss          // Missing imports file

// BAD - Folder structure
/components/GraphicCount/           // Wrong: PascalCase
/components/graphic_Count/          // Wrong: mixed case
```

#### ✅ **Correct Naming & Structure:**
```scss
// GOOD - File naming & complete structure
📁 graphic-count/
├── _graphic-count.scss            // Main styles
├── _graphic-count.settings.scss   // Variables
├── _graphic-count.print.scss      // Print styles
├── graphic-count-imports.scss     // Import file
└── _graphic-count-variant.scss    // Optional variants

// GOOD - Imports file content (ONLY import main component)
// graphic-count-imports.scss
@use 'graphic-count';

// IMPORTANT: Print files are imported centrally in components-print-imports.scss
// Settings files are only imported by files that need them (main component SCSS)
```

---

### **9. Stylelint Compliance**

#### ✅ **Phải kiểm tra:**
- [ ] **Pass all stylelint rules**: Code phải pass stylelint mà không có errors
- [ ] **No global stylelint disable**: Không disable stylelint cho toàn bộ file
- [ ] **Line-specific disable only**: Chỉ disable stylelint cho từng dòng cụ thể khi cần thiết
- [ ] **Justify disable comments**: Mọi stylelint disable phải có comment giải thích

#### ❌ **Wrong Stylelint Usage:**
```scss
/* stylelint-disable */  // BAD - Global disable
.component {
  color: red;
}

/* stylelint-disable-next-line property-no-unknown */  // BAD - No explanation
unknown-property: value;
```

#### ✅ **Correct Stylelint Usage:**
```scss
.component {
  /* stylelint-disable-next-line property-no-unknown -- Using custom CSS property for third-party plugin */
  -webkit-custom-property: value;

  color: red;
}
```

---

### **10. Pixel to Rem Conversion**

#### ✅ **Phải kiểm tra:**
- [ ] **All px values use pxToRem**: Tất cả giá trị px phải dùng `functions.pxToRem()`
- [ ] **CSS custom properties allowed**: Spacing có thể dùng `var(--spacer-spacing-X)` hoặc `functions.pxToRem()`
- [ ] **No direct px values**: Không dùng px trực tiếp cho spacing/font-size
- [ ] **Exception documentation**: Border, shadow có thể dùng px với comment giải thích

#### ❌ **Wrong Usage:**
```scss
$component__padding: 16px !default;        // BAD - Direct px
$component__margin: 1rem !default;         // BAD - Direct rem without conversion
$component__font-size: 14px !default;      // BAD - Font-size phải dùng pxToRem
```

#### ✅ **Correct Usage:**
```scss
// Option 1: Use pxToRem for calculated values
$component__padding: functions.pxToRem(16) !default;
$component__margin: functions.pxToRem(8) !default;
$component__font-size: functions.pxToRem(14) !default;

// Option 2: Use CSS custom properties for spacing tokens
$component__gap: var(--spacer-spacing-3) !default;
$component__margin-top: var(--spacer-spacing-5) !default;

// Option 3: Mixed approach is ACCEPTABLE
$component__padding: var(--spacer-spacing-4) !default;        // Spacing token
$component__font-size: functions.pxToRem(18) !default;        // Font conversion

// Exception: Border có thể dùng px
$component__border-width: 1px !default; // OK - Border thường dùng px
```

---

### **11. Token Usage from Config**

#### ✅ **Phải kiểm tra:**
- [ ] **Use tokens for colors**: Dùng `tokens.$color-name` thay vì hardcode colors
- [ ] **Use tokens for spacing**: Dùng spacing tokens khi có sẵn
- [ ] **Use tokens for typography**: Dùng typography tokens thay vì hardcode
- [ ] **No hardcoded values**: Avoid magic numbers, dùng tokens

#### ❌ **Wrong Token Usage:**
```scss
$component__background-color: #007bff !default;     // BAD - Hardcoded color
$component__padding: functions.pxToRem(16) !default; // BAD - Should use spacing token
$component__font-family: 'Arial', sans-serif !default; // BAD - Hardcoded font
```

#### ✅ **Correct Token Usage:**
```scss
$component__background-color: tokens.$primary-500 !default;
$component__padding: tokens.$spacing-md !default;
$component__font-family: tokens.$font-family-base !default;
```

---

### **12. Breakpoint Management**

#### ✅ **Phải kiểm tra:**
- [ ] **No hardcoded breakpoints**: Không hardcode breakpoint values
- [ ] **Use mixin for media queries**: Dùng mixins hoặc functions cho responsive
- [ ] **Consistent breakpoint names**: Dùng standard breakpoint naming

#### ❌ **Wrong Breakpoint Usage:**
```scss
// BAD - Hardcoded breakpoints
@media (max-width: 768px) {
  .component { font-size: 14px; }
}

@media (min-width: 1024px) {
  .component { padding: 20px; }
}
```

#### ✅ **Correct Breakpoint Usage:**
```scss
// GOOD - Use mixins or tokens
@include breakpoint.down('md') {
  .component { font-size: functions.pxToRem(14); }
}

@include breakpoint.up('lg') {
  .component { padding: functions.pxToRem(20); }
}
```

---

### **13. Important Declaration Management**

#### ✅ **Phải kiểm tra:**
- [ ] **Avoid !important**: Tránh sử dụng `!important` trong code
- [ ] **Justify !important usage**: Nếu bắt buộc dùng phải có comment giải thích
- [ ] **Specificity over !important**: Ưu tiên tăng specificity thay vì dùng !important

#### ❌ **Wrong !important Usage:**
```scss
.component {
  color: red !important;           // BAD - No justification
  font-size: 16px !important;      // BAD - Can be avoided
}
```

#### ✅ **Justified !important Usage:**
```scss
.component {
  /* Override third-party plugin styles that use !important */
  color: red !important;

  /* Required for accessibility contrast compliance */
  background-color: white !important;
}
```

---

### **14. Asset Path Management**

#### ✅ **Phải kiểm tra:**
- [ ] **Component-specific assets**: Images chỉ load từ folder component hiện tại
- [ ] **No cross-component dependencies**: Không load assets từ component khác
- [ ] **Relative paths**: Dùng relative paths cho assets trong component
- [ ] **Asset organization**: Images/assets tổ chức theo component structure

#### ❌ **Wrong Asset Paths:**
```scss
// BAD - Loading from other component
.graphic-count {
  background-image: url('../hero/images/bg.jpg');
}

// BAD - Absolute paths
.component {
  background-image: url('/src/components/other/image.jpg');
}
```

#### ✅ **Correct Asset Paths:**
```scss
// GOOD - Load from own component folder
.graphic-count {
  background-image: url('./images/bg.jpg');
  background-image: url('../graphic-count/images/icon.svg');
}
```

---

### **15. File Cleanup**

#### ✅ **Phải kiểm tra:**
- [ ] **Remove empty files**: Xóa files không có content
- [ ] **Remove unused files**: Xóa files không được import/sử dụng
- [ ] **Remove empty rules**: Xóa CSS rules không có properties
- [ ] **Remove unused imports**: Xóa imports không sử dụng trong file
- [ ] **Remove unused variables**: Xóa variables được khai báo nhưng không sử dụng

#### 🔍 **Cách kiểm tra Unused Imports:**
```scss
// BAD - Import nhưng không dùng
@use '../../2-tools/functions';     // functions. không xuất hiện trong file
@use '../../1-settings/color';      // color. không xuất hiện trong file
@use '../../1-settings/breakpoint'; // breakpoint. không xuất hiện trong file

// Kiểm tra: Search "functions.", "color.", "breakpoint." trong file
// Nếu không tìm thấy = unused import → REMOVE
```

#### 🔍 **Cách kiểm tra Unused Variables:**
```scss
// BAD - Variables khai báo nhưng không dùng
$component__padding: functions.pxToRem(16) !default;    // Không được reference
$component__color: tokens.$primary-500 !default;        // Không được sử dụng
$component__margin: functions.pxToRem(8) !default;      // Chỉ khai báo

// Trong file SCSS component
.component {
  font-size: functions.pxToRem(14);  // Không dùng variable $component__font-size
  // $component__padding, $component__color, $component__margin không được reference
}

// Kiểm tra: Search "$component__padding", "$component__color" trong toàn bộ codebase
// Nếu chỉ xuất hiện 1 lần (tại khai báo) = unused → REMOVE
```

#### 🛠️ **Tools để kiểm tra:**
```bash
# 1. Kiểm tra unused imports
grep -n "functions\." component.scss   # Should find usage
grep -n "color\." component.scss       # Should find usage
grep -n "@use.*functions" component.scss  # Find import line

# 2. Kiểm tra unused variables
grep -r "\$component__padding" .       # Should find multiple references
grep -r "\$component__color" .         # Should find usage beyond declaration

# 3. Kiểm tra empty files
find . -name "*.scss" -size 0          # Find empty files
```

#### ❌ **Files to Remove:**
```scss
// Empty file - DELETE
/* No content */

// Unused imports - REMOVE
@use '../../tools/functions';  // functions. not used in file
@use '../../settings/colors';  // color. not used in file

// Unused variables - REMOVE
$component__unused-padding: functions.pxToRem(16) !default; // No references
$component__unused-color: tokens.$red-500 !default;        // No references

// Empty rules - REMOVE
.component {
  // No properties
}

.component__element {
  /* Empty rule */
}
```

#### ✅ **Clean Files:**
```scss
// Only necessary imports
@use '../../2-tools/functions';  // Used: functions.pxToRem()

// Only used variables
$component__font-size: functions.pxToRem(16) !default;  // Used below

// Only rules with content
.component {
  font-size: $component__font-size;  // Variable được sử dụng
}
```

#### 📝 **Checklist cho Clean up:**
- [ ] Search each `@use` import xem có được sử dụng không
- [ ] Search each variable `$name` xem có references ngoài khai báo không
- [ ] Check CSS rules có properties không
- [ ] Scan for commented out code → remove
- [ ] Check for TODO/FIXME comments → resolve hoặc remove

---

### **16. Mathematical Calculations & Comments**

#### ✅ **Phải kiểm tra:**
- [ ] **Complex calculation comments**: Chỉ complex calculations (calc(), multi-step formulas) phải có comment giải thích
- [ ] **Simple px-to-rem conversions**: functions.pxToRem(value) KHÔNG cần comment - đây là conversion đơn giản
- [ ] **Complex formulas**: Các công thức phức tạp phải explain step-by-step
- [ ] **Magic numbers**: Không dùng số lạ trong complex calculations mà không giải thích
- [ ] **Business logic**: Comment explain business requirements đằng sau complex calculations

#### ❌ **Wrong Calculation Usage:**
```scss
// BAD - Complex calculations không có explanation
$component__width: calc(100% - 32px);
$component__height: 100vh - 80px;
$component__margin: functions.pxToRem(24 * 2 + 8);

// BAD - Magic numbers trong complex calculations
$component__offset: calc(50% - 23px);        // Why 23px?

// BAD - Complex formula không explain
$component__responsive-width: calc(
  (100vw - 240px) * 0.75 + 60px
);
```

#### ✅ **Correct Calculation Usage:**
```scss
// GOOD - Simple px-to-rem conversions KHÔNG cần comment
$component__padding: functions.pxToRem(16) !default;
$component__margin: functions.pxToRem(24) !default;
$component__border-width: functions.pxToRem(1.5) !default;
$component__font-size: functions.pxToRem(18) !default;

// GOOD - Complex calculations có clear explanations
// Header height (80px) subtracted from full viewport height
$component__content-height: calc(100vh - functions.pxToRem(80));

// Container width minus left/right padding (16px each side = 32px total)
$component__inner-width: calc(100% - functions.pxToRem(32));

// Font size calculation: Base size (16px) + size increment (8px) for large variant
$component__font-size--large: functions.pxToRem(16 + 8);

// GOOD - Step-by-step complex calculations
// Responsive container width calculation:
// 1. Full viewport width minus sidebar (240px)
// 2. Multiply by content ratio (75%)
// 3. Add minimum padding (60px)
$component__responsive-width: calc(
  (100vw - functions.pxToRem(240)) * 0.75 + functions.pxToRem(60)
);

// GOOD - Business logic explanation
// Marketing banner height based on design requirements:
// Mobile: 120px, Desktop: 180px, calculation for smooth transition
$banner__height: clamp(
  functions.pxToRem(120),  // Minimum mobile height
  8vw,                      // Responsive scaling
  functions.pxToRem(180)   // Maximum desktop height
);
```

#### 🔍 **Calculation Review Checklist:**
- [ ] Simple `functions.pxToRem(value)` conversions KHÔNG cần comment
- [ ] Complex `calc()`, multi-step mathematical operations có explanatory comment
- [ ] Magic numbers trong complex calculations được giải thích (where they come from)
- [ ] Business requirements documented for complex formulas
- [ ] Step-by-step breakdown for multi-part calculations
- [ ] Units consistency (all px converted to rem with functions.pxToRem)

---

## 🚨 **Critical Review Questions**

### **Before Approving Code:**

1. **Variable Purpose**:
   - Giá trị này có dùng lặp lại không?
   - Có thể thay đổi theo theme/brand không?
   - Có cần override cho responsive không?

2. **BEM Compliance**:
   - Tên biến có reflect đúng HTML structure không?
   - Element và modifier có đúng context không?

3. **Maintainability**:
   - Team khác có hiểu được tên biến không?
   - Code có dễ refactor không?
   - Có biến nào thừa, không dùng không?

4. **Performance**:
   - Import có tối ưu không?
   - Có duplicate variables không?

---

## 📝 **Review Process**

### **Step 1: File & Structure Check**
- [ ] File naming follows kebab-case convention
- [ ] **Required files present**: `_component.scss`, `_component.settings.scss`, `_component.print.scss`, `component-imports.scss`
- [ ] **Imports file structure**: component-imports.scss import main component file và các variant files (KHÔNG import settings/print)
- [ ] **Print import check**: Print files được import trong components-print-imports.scss (KHÔNG trong component-imports.scss)
- [ ] **Settings import check**: Settings chỉ được import bởi files thực sự cần dùng
- [ ] Folder structure consistent với project standard
- [ ] No empty files or unused files
- [ ] Import paths correct và relative
- [ ] Remove unused imports

### **Step 2: Stylelint Compliance**
- [ ] Code passes all stylelint rules
- [ ] No global stylelint disable
- [ ] Line-specific disables have explanatory comments
- [ ] Remove any unnecessary stylelint disables

### **Step 3: Variable & CSS Class BEM Structure**
- [ ] Tất cả variables có `!default`
- [ ] Variable BEM structure correct: `$block__element-property--modifier`
- [ ] CSS class BEM structure correct: `.block__element--modifier`
- [ ] Block name matches component name (cả variable và CSS class)
- [ ] Element names reflect HTML structure
- [ ] Modifiers follow standard conventions
- [ ] Variable names không quá 40 ký tự
- [ ] CSS class names semantic (không mô tả visual)
- [ ] No z-index hoặc zero value variables
- [ ] Remove unused variables

### **Step 4: Pixel to Rem & Token Usage**
- [ ] All px values use `functions.pxToRem()`
- [ ] Consistent conversion (no mixing px/rem)
- [ ] Use tokens from config instead of hardcoded values
- [ ] Colors use `tokens.$color-name`
- [ ] Spacing uses spacing tokens when available
- [ ] Typography uses typography tokens

### **Step 5: Technical Standards**
- [ ] No hardcoded breakpoints (use mixins/tokens)
- [ ] Avoid `!important` (or justify with comments)
- [ ] Asset paths are component-specific (no cross-component loading)
- [ ] Font-size variables dùng functions.pxToRem đúng cách
- [ ] Imports necessary và sufficient

### **Step 6: Mathematical Calculations**
- [ ] All calculations have explanatory comments
- [ ] Complex formulas explained step-by-step
- [ ] No magic numbers without explanation
- [ ] Business logic documented for calculations
- [ ] Units consistent trong calculations

### **Step 7: Code Cleanup**
- [ ] Remove empty CSS rules
- [ ] Clean up unused code
- [ ] No empty or placeholder content
- [ ] Variables make sense trong context của component
- [ ] Consistent với existing design system
- [ ] Override strategy rõ ràng với `@use ... with (...)`

---

## ✅ **Approval Criteria**

Code được approve khi:
- [ ] **File structure & naming**: Follow conventions, no empty/unused files
- [ ] **Stylelint compliance**: Pass all rules, justified disables only
- [ ] **Variable BEM structure**: Proper $block__element-property--modifier
- [ ] **CSS class BEM structure**: Proper .block__element--modifier
- [ ] **Variable length limit**: Names không quá 40 ký tự
- [ ] **CSS semantic naming**: Class names mô tả chức năng, không visual
- [ ] **Token usage**: Use config tokens thay vì hardcoded values
- [ ] **Pixel conversion**: All px use functions.pxToRem()
- [ ] **Calculation comments**: All math operations have explanations
- [ ] **Responsive**: Use breakpoint mixins, no hardcoded values
- [ ] **Clean code**: No !important (or justified), no unused code
- [ ] **Asset paths**: Component-specific, no cross-dependencies
- [ ] **Variable quality**: Naming intuitive, consistent, ready for override

---

## 🔧 **Common Review Comments**

### **File Structure & Naming:**
```
"File name should use kebab-case: component-name.scss"
"Remove empty file - no content found"
"Import path is incorrect - use relative paths"
"Remove unused import: @use '../../settings/unused'"
```

### **Import Pattern Issues:**
```
"component-imports.scss should import main component file and variants: @use 'component-name'; @use 'component-variant';"
"Print files should be imported in components-print-imports.scss, not in component-imports.scss"
"Settings file should only be imported by files that actually use the variables"
"Remove settings import from component-imports.scss - settings are imported by main component file when needed"
"Print import should be removed from component-imports.scss - centralized in components-print-imports.scss"
```

### **Stylelint Issues:**
```
"Fix stylelint errors before review"
"Remove global stylelint-disable - use line-specific only"
"Add explanation comment for stylelint disable"
"/* stylelint-disable-next-line rule-name -- Reason for disable */"
```

### **Variable & CSS Class Naming:**
```
"Variable name should follow BEM: $component__element-property--modifier"
"CSS class name should follow BEM: .component__element--modifier"
"Use kebab-case instead of camelCase or snake_case"
"Variable name too long - max 40 characters allowed"
"Variable name should be more descriptive"
"CSS class name should describe function, not visual appearance"
"Element name should reflect HTML structure"
"Modifier doesn't follow standard conventions"
"Block name should match component name (both variable and CSS class)"
"Replace visual descriptors like 'red', 'large-font' with semantic names"
```

### **Pixel & Token Usage:**
```
"Use functions.pxToRem() instead of px: functions.pxToRem(16)"
"Use tokens instead of hardcoded colors: tokens.$primary-500"
"Use spacing tokens: tokens.$spacing-md or var(--spacer-spacing-X) instead of hardcoded values"
"Mixing var(--spacer-spacing-X) with functions.pxToRem() is acceptable"
"Avoid direct px values - use functions.pxToRem() or CSS custom properties"
```

### **Technical Standards:**
```
"Font-size variable with px value should use functions.pxToRem()"
"Add !default flag to allow override"
"Don't create variables for z-index - use direct numbers"
"Use breakpoint mixin instead of hardcoded @media queries"
"Remove !important or justify with explanatory comment"
"Asset path should be component-specific - don't load from other components"
```

### **Mathematical Calculations:**
```
"Simple functions.pxToRem(value) conversions do not need comments"
"Add explanatory comment for complex calc() formulas"
"Explain magic numbers in complex calculations only"
"Break down complex formula into step-by-step comments"
"Document business requirements behind complex calculations"
"Use consistent units - convert px values with functions.pxToRem()"
"Complex calculations need explanation - simple conversions don't"
```

### **Code Cleanup:**
```
"Remove unused variables from settings file"
"Remove empty CSS rules"
"Remove this unused file"
"Clean up commented code"
```

---

## 🎯 **Best Practices Summary**

1. **Follow file naming conventions** - Use kebab-case consistently
2. **Pass stylelint first** - Fix all linting issues before review
3. **Follow BEM religiously** - Consistency với structure là key cho cả variables và CSS classes
4. **Use semantic naming** - CSS classes mô tả chức năng, không mô tả visual appearance
5. **Keep names concise** - Variable names không quá 40 ký tự
6. **Use tokens over hardcoding** - Colors, spacing, typography từ config
7. **Convert px to rem** - Use functions.pxToRem() for all px values
8. **Document complex calculations** - Complex formulas need comments, simple functions.pxToRem() không cần
9. **No hardcoded breakpoints** - Use mixins và tokens for responsive
10. **Avoid !important** - Use specificity, justify với comments nếu cần
11. **Component-specific assets** - Keep images trong own folder
12. **Clean unused code** - Remove variables, files, rules not being used
13. **Think about reusability** - Variables should serve multiple purposes
14. **Document exceptions** - Explain why breaking rules if necessary
15. **Keep it simple** - Don't over-engineer variable structure
16. **Consider theme override** - All variables should be theme-ready

---

**Happy Reviewing! 🚀**

*File này là living document - update khi có thêm patterns hoặc edge cases mới.*
