# Plan: Fix Typography Export to Match Import Format

## So sánh 2 files

### File Import (`tokens/project-a/typography.json`):
- ✅ `body/mobile` có: `fontSize`, `lineHeight`, `fontWeight`, **`fontFamily: "Lato"`**, **`color: "#000000"`**
- ✅ `body/mobile` có nested breakpoints: **`tablet`** và **`desktop`** với `fontSize`
- ✅ `h2/mobile` có: **`fontFamily: "Inter"`**
- ✅ `quote-small` và `quote-large` có: **`fontWeight: "semibold italic"`**
- ✅ `h1/mobile` có nested breakpoint: **`desktop`** với `fontSize`
- ❌ Không có: `large`, `medium`, `small`, `links`, `default`, `hover`, `focus`

### File Export (`project-a---corporate---enterprise-tokens/typography.json`):
- ❌ `body/mobile` chỉ có: `fontSize`, `lineHeight`, `fontWeight` (thiếu `fontFamily` và `color`)
- ❌ `body/mobile` không có nested breakpoints (`tablet`, `desktop`)
- ✅ `h2/mobile` có: `fontFamily: "Inter"` (đúng)
- ❌ `quote-small` và `quote-large` có: `fontWeight: "medium"` (sai, phải là `"semibold italic"`)
- ❌ `h1/mobile` không có nested breakpoint `desktop`
- ❌ Có thêm: `large`, `medium`, `small`, `links`, `default`, `hover`, `focus` (các styles này không có trong import)

---

## Các vấn đề cần fix

### 1. Body style thiếu `fontFamily`
**Vấn đề:** Trong `buildStyleObject()` (dòng 1379-1390), logic chỉ include `fontFamily` nếu nó khác với `bodyFontFamily`. Nhưng với body style, nó sẽ không include vì nó bằng với `bodyFontFamily`.

**Fix:** 
- Luôn include `fontFamily` cho body style (khi `styleName === 'body'`)
- Hoặc: Luôn include `fontFamily` nếu style có `fontName.family`, không cần so sánh với `bodyFontFamily`

**Code location:** `code.js` line 1379-1390

### 2. Body style thiếu `color`
**Vấn đề:** Logic extract color từ `fills` (dòng 1439-1450) có vẻ đúng, nhưng có thể body style không có fills trong Figma.

**Fix:**
- Kiểm tra xem body style có fills không
- Nếu không có fills, có thể color được lưu ở đâu khác? (có thể trong description hoặc metadata)
- Đảm bảo extract được color nếu có

**Code location:** `code.js` line 1439-1450

### 3. Body style thiếu nested breakpoints (`tablet`, `desktop`)
**Vấn đề:** Logic ở dòng 973-986 có vẻ đúng, nhưng có thể không hoạt động đúng với cách `parseTextStyleName` parse nested breakpoints.

**Fix:**
- Kiểm tra lại logic xử lý nested breakpoints
- Đảm bảo rằng nếu có style "Body/Mobile/Tablet" và "Body/Mobile/Desktop", chúng sẽ được parse đúng và tạo nested structure

**Code location:** `code.js` line 973-986, `parseTextStyleName` line 3043-3074

### 4. H1 style thiếu nested breakpoint `desktop`
**Vấn đề:** Tương tự như body, h1 có nested breakpoint `desktop` trong import nhưng không có trong export.

**Fix:** Tương tự như fix #3

### 5. Quote styles có `fontWeight` sai (`medium` thay vì `semibold italic`)
**Vấn đề:** Logic ở dòng 1320-1333 có vẻ đúng để detect italic, nhưng có thể font style name không đúng hoặc không được parse đúng.

**Fix:**
- Kiểm tra lại logic detect italic trong `buildStyleObject()`
- Đảm bảo rằng nếu font style name có "Semibold Italic" hoặc "SemiboldItalic", nó sẽ được map thành `"semibold italic"`

**Code location:** `code.js` line 1316-1377

### 6. Export có thêm các styles không có trong import
**Vấn đề:** Export có thêm: `large`, `medium`, `small`, `links`, `default`, `hover`, `focus`. Các styles này có thể được tạo trong Figma nhưng không có trong file import gốc.

**Fix:**
- Option 1: Giữ nguyên (nếu user muốn export tất cả styles trong Figma)
- Option 2: Filter ra các styles không có trong import (nếu user muốn export chỉ các styles đã import)
- **Recommendation:** Giữ nguyên vì đây là các styles thực tế trong Figma, không nên filter ra

---

## Implementation Plan

### Step 1: Fix `fontFamily` trong body style
- Sửa `buildStyleObject()` để luôn include `fontFamily` cho body style
- Hoặc: Luôn include `fontFamily` nếu style có `fontName.family`, không cần so sánh với `bodyFontFamily`

### Step 2: Fix `color` trong body style
- Kiểm tra xem body style có fills không
- Nếu có, extract color từ fills
- Nếu không có, có thể color được lưu ở đâu khác? (description, metadata)

### Step 3: Fix nested breakpoints
- Kiểm tra lại logic xử lý nested breakpoints trong `exportTypographyTokens()`
- Đảm bảo rằng nếu có style "Body/Mobile/Tablet" và "Body/Mobile/Desktop", chúng sẽ được parse đúng và tạo nested structure
- Test với các cases:
  - "Body/Mobile/Tablet" → `body.mobile.tablet`
  - "Body/Mobile/Desktop" → `body.mobile.desktop`
  - "H1/Mobile/Desktop" → `h1.mobile.desktop`

### Step 4: Fix quote styles `fontWeight`
- Kiểm tra lại logic detect italic trong `buildStyleObject()`
- Đảm bảo rằng nếu font style name có "Semibold Italic" hoặc "SemiboldItalic", nó sẽ được map thành `"semibold italic"`

### Step 5: Test và verify
- Export lại typography tokens
- So sánh với file import gốc
- Đảm bảo tất cả các fields đều match

---

## Code Changes Summary

1. **`buildStyleObject()` function:**
   - Fix logic include `fontFamily` cho body style
   - Fix logic extract `color` từ fills
   - Fix logic detect italic trong fontWeight

2. **`exportTypographyTokens()` function:**
   - Fix logic xử lý nested breakpoints
   - Đảm bảo nested breakpoints được tạo đúng structure

3. **`parseTextStyleName()` function:**
   - Có thể cần update để parse nested breakpoints đúng hơn

---

## Expected Result

Sau khi fix, file export sẽ có:
- ✅ `body/mobile` có: `fontSize`, `lineHeight`, `fontWeight`, `fontFamily: "Lato"`, `color: "#000000"`
- ✅ `body/mobile` có nested breakpoints: `tablet` và `desktop` với `fontSize`
- ✅ `h1/mobile` có nested breakpoint: `desktop` với `fontSize`
- ✅ `quote-small` và `quote-large` có: `fontWeight: "semibold italic"`
- ✅ Các styles khác giữ nguyên (bao gồm cả các styles thêm vào như `large`, `medium`, `small`, `links`, `default`, `hover`, `focus`)

