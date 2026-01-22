# Typography Export vs Import Comparison Report

## Tổng quan

**File Import:** `tokens/project-a/typography.json`  
**File Export:** `project-a---corporate---enterprise-tokens 2/typography.json`

---

## ✅ Đã Fix (So với lần trước)

1. ✅ **Body style có `fontFamily: "Lato"`** - Đã có trong export
2. ✅ **Body style có nested breakpoints `tablet` và `desktop`** - Đã có trong export
3. ✅ **H1 style có nested breakpoint `desktop`** - Đã có trong export

---

## ❌ Các vấn đề còn lại

### 1. Body style thiếu `color: "#000000"` trong mobile
**Import:**
```json
"body": {
  "mobile": {
    "fontSize": "16px",
    "lineHeight": "150%",
    "fontWeight": "regular",
    "fontFamily": "Lato",
    "color": "#000000",  // ← Thiếu trong export
    "tablet": { ... },
    "desktop": { ... }
  }
}
```

**Export:**
```json
"body": {
  "mobile": {
    "fontSize": "16px",
    "lineHeight": "150%",
    "fontWeight": "regular",
    "fontFamily": "Lato",
    // ← Thiếu color
    "tablet": { ... },
    "desktop": { ... }
  }
}
```

**Nguyên nhân:** Body style trong Figma có thể không có fills được set, hoặc logic extract color chưa hoạt động đúng.

---

### 2. Quote styles có `fontWeight` sai: `"medium"` thay vì `"semibold italic"`
**Import:**
```json
"quote-small": {
  "mobile": {
    "fontSize": "24px",
    "lineHeight": "160%",
    "fontWeight": "semibold italic"  // ← Đúng
  }
}
```

**Export:**
```json
"quote-small": {
  "mobile": {
    "fontSize": "24px",
    "lineHeight": "160%",
    "fontWeight": "medium"  // ← Sai
  }
}
```

**Nguyên nhân:** Font style trong Figma có thể là "Medium Italic" hoặc "Medium" thay vì "Semibold Italic", hoặc logic detect italic chưa hoạt động đúng.

---

### 3. Nested breakpoints có quá nhiều properties (không match với import)

#### 3.1. Display style có nested breakpoints (không có trong import)
**Import:** Chỉ có `mobile`, không có `tablet` và `desktop`
**Export:** Có `mobile.tablet` và `mobile.desktop` với đầy đủ properties

#### 3.2. H1 nested breakpoints có quá nhiều properties
**Import:**
```json
"h1": {
  "mobile": {
    "fontSize": "60px",
    "lineHeight": "120%",
    "fontWeight": "semibold",
    "letterSpacing": "1px"
  },
  "desktop": {
    "fontSize": "64px"  // ← Chỉ có fontSize
  }
}
```

**Export:**
```json
"h1": {
  "mobile": {
    "fontSize": "60px",
    "lineHeight": "120%",
    "fontWeight": "semibold",
    "letterSpacing": "1px",
    "tablet": {
      "fontSize": "60px",
      "lineHeight": "120%",
      "fontWeight": "semibold",
      "letterSpacing": "1px"  // ← Có đầy đủ properties
    },
    "desktop": {
      "fontSize": "64px",
      "lineHeight": "120%",
      "fontWeight": "semibold",
      "letterSpacing": "1px"  // ← Có đầy đủ properties, không chỉ fontSize
    }
  }
}
```

**Nguyên nhân:** Logic export đang include tất cả properties từ base style vào nested breakpoints, nhưng import chỉ include properties thay đổi.

#### 3.3. Body nested breakpoints có quá nhiều properties
**Import:**
```json
"body": {
  "mobile": {
    "fontSize": "16px",
    "lineHeight": "150%",
    "fontWeight": "regular",
    "fontFamily": "Lato",
    "color": "#000000",
    "tablet": {
      "fontSize": "17px"  // ← Chỉ có fontSize
    },
    "desktop": {
      "fontSize": "18px"  // ← Chỉ có fontSize
    }
  }
}
```

**Export:**
```json
"body": {
  "mobile": {
    "fontSize": "16px",
    "lineHeight": "150%",
    "fontWeight": "regular",
    "fontFamily": "Lato",
    "tablet": {
      "fontSize": "17px",
      "lineHeight": "150%",
      "fontWeight": "regular",
      "fontFamily": "Lato"  // ← Có đầy đủ properties
    },
    "desktop": {
      "fontSize": "18px",
      "lineHeight": "150%",
      "fontWeight": "regular",
      "fontFamily": "Lato"  // ← Có đầy đủ properties
    }
  }
}
```

**Nguyên nhân:** Tương tự như h1, logic export đang include tất cả properties từ base style.

#### 3.4. H2 có nested breakpoints (không có trong import)
**Import:** Chỉ có `mobile`
**Export:** Có `mobile.tablet` và `mobile.desktop`

#### 3.5. H3-H10 có nested breakpoints (không có trong import)
**Import:** Chỉ có `mobile` cho tất cả
**Export:** Có `mobile.tablet` và `mobile.desktop` cho tất cả

#### 3.6. Body-large, body-small, micro-text có nested breakpoints (không có trong import)
**Import:** Chỉ có `mobile`
**Export:** Có `mobile.tablet` và `mobile.desktop`

#### 3.7. Quote và numeric styles có nested breakpoints (không có trong import)
**Import:** Chỉ có `mobile`
**Export:** Có `mobile.tablet` và `mobile.desktop`

---

### 4. Export có thêm các styles không có trong import
- `large` - có trong export, không có trong import
- `medium` - có trong export, không có trong import
- `small` - có trong export, không có trong import
- `links` - có trong export, không có trong import
- `default` - có trong export, không có trong import
- `hover` - có trong export, không có trong import
- `focus` - có trong export, không có trong import

**Note:** Đây có thể là các styles thực tế trong Figma nhưng không có trong file import gốc. Có thể giữ nguyên hoặc filter ra tùy theo yêu cầu.

---

## 📋 Tóm tắt các vấn đề cần fix

### Priority 1 (Critical - Khác biệt về data):
1. ❌ Body style thiếu `color: "#000000"` trong mobile
2. ❌ Quote styles có `fontWeight: "medium"` thay vì `"semibold italic"`

### Priority 2 (Structure - Nested breakpoints):
3. ❌ Nested breakpoints có quá nhiều properties (chỉ nên include properties thay đổi)
   - H1 desktop chỉ nên có `fontSize`
   - Body tablet/desktop chỉ nên có `fontSize`
   - Các styles khác không nên có nested breakpoints nếu không có trong import

### Priority 3 (Extra styles):
4. ⚠️ Export có thêm các styles không có trong import
   - `large`, `medium`, `small`, `links`, `default`, `hover`, `focus`
   - Có thể giữ nguyên nếu đây là styles thực tế trong Figma

---

## 🔧 Plan để fix

### Fix 1: Body style thiếu color
- Kiểm tra xem body style trong Figma có fills không
- Nếu không có, có thể cần set default color hoặc extract từ đâu khác
- Update logic extract color để đảm bảo body style có color

### Fix 2: Quote styles fontWeight
- Kiểm tra font style name trong Figma cho quote styles
- Nếu là "Medium Italic", cần map thành "semibold italic" hoặc update font style trong Figma
- Hoặc cải thiện logic detect italic để handle các trường hợp đặc biệt

### Fix 3: Nested breakpoints chỉ include properties thay đổi
- Update `buildStyleObject()` để chỉ include properties khác với base style
- So sánh từng property giữa nested breakpoint và base style
- Chỉ include properties có giá trị khác

### Fix 4: Filter nested breakpoints không có trong import
- Option 1: Chỉ export nested breakpoints nếu có trong import gốc
- Option 2: Export tất cả nested breakpoints có trong Figma (giữ nguyên hiện tại)
- **Recommendation:** Option 2 - giữ nguyên vì đây là data thực tế trong Figma

---

## 📝 Notes

- File export có nhiều nested breakpoints hơn import vì đây là data thực tế trong Figma
- Có thể cần quyết định: export chính xác như import (chỉ include những gì có trong import) hay export tất cả data trong Figma
- Color trong body style có thể cần được set trong Figma hoặc có logic default

