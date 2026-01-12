# Guideline: Compare DOCX Content với Figma Design

## 0. QUY TRÌNH BẮT BUỘC - PHẢI THỰC HIỆN ĐÚNG THỨ TỰ

### ⚠️ CRITICAL: Đọc rule.md để xác định project TRƯỚC KHI làm bất cứ việc gì

**BƯỚC 0: Đọc file `rule.md` trong thư mục `compare-docx-width-design/`**
- Tìm config `project: {tên_project}` để biết project cần compare
- Chỉ compare project được chỉ định trong rule.md
- KHÔNG compare các project khác

### ⚠️ CRITICAL: Luôn extract data MỚI NHẤT trước khi compare

**KHÔNG BAO GIỜ** sử dụng data cũ hoặc sample data trong guideline. **LUÔN LUÔN** extract fresh data từ source files.

### Bước 1: Extract ALL text từ DOCX (BẮT BUỘC)
```bash
# Extract text từ DOCX - chạy command này TRƯỚC
cd {project}/docx && unzip -p "*.docx" word/document.xml | sed 's/<\/w:p>/\n/g' | sed 's/<[^>]*>//g' | grep -v '^$'
```

### Bước 2: Extract ALL text từ JSON files (BẮT BUỘC)
```bash
# Extract từ Desktop JSON
cat {project}/json/desktop.json | grep -o '"characters":"[^"]*"' | sed 's/"characters":"//g' | sed 's/"$//g'

# Extract từ Mobile JSON
cat {project}/json/mobile.json | grep -o '"characters":"[^"]*"' | sed 's/"characters":"//g' | sed 's/"$//g'
```

### Bước 3: So sánh TỪNG ITEM một cách CHÍNH XÁC
- So sánh **character by character**
- Chú ý: dấu chấm (.), dấu phẩy (,), spaces, số thừa
- KHÔNG được bỏ qua bất kỳ sự khác biệt nào

### Bước 4: Xem screenshot để verify visual
- Đọc file screenshot desktop.png và mobile.png
- Cross-check với JSON data

---

## 1. Mục đích
So sánh nội dung text từ Copy Deck (DOCX) với Design (Figma) để đảm bảo content được implement đúng.

## 2. Folder Structure & Config

### 2.1 Cấu trúc thư mục

```
compare-docx-width-design/
├── rule.md                 # Config file
├── guideline/              # Guidelines & templates
│   └── compare-guideline.md
├── mail1/                  # Project folder
│   ├── json/
│   │   ├── desktop.json
│   │   └── mobile.json
│   ├── screenshot/
│   │   ├── desktop.png
│   │   └── Mobile.png
│   └── docx/
│       └── [filename].docx
└── mail2/                  # Another project
    ├── json/
    ├── screenshot/
    └── docx/
```

### 2.2 Config File (rule.md)

```markdown
# Input Config

Json: {project}/json/
Screenshot: {project}/screenshot/
docx: {project}/docx/

guideline: guideline/

# Output: trả lời trực tiếp trong chat
<!-- compare DOCX Content với Figma Design @compare-docx-width-design/guideline/compare-guideline.md -->
```

### 2.3 Input Files

| Input | Path | Format |
|-------|------|--------|
| DOCX | `{project}/docx/*.docx` | .docx |
| Screenshot Desktop | `{project}/screenshot/desktop.png` | .png |
| Screenshot Mobile | `{project}/screenshot/Mobile.png` | .png |
| JSON Desktop | `{project}/json/desktop.json` | .json |
| JSON Mobile | `{project}/json/mobile.json` | .json |

## 3. Các loại content cần compare

### 3.1 TẤT CẢ Content phải khớp 100%
- Headlines / Titles
- CTA buttons text
- Legal/Disclaimer text
- Brand names, Product names
- Subheadlines
- Body copy
- Connector words
- Case sensitivity (uppercase/lowercase)

### 3.2 ⚠️ KHÔNG CÓ "Acceptable Variations"
**MỌI SỰ KHÁC BIỆT ĐỀU LÀ ERROR**, bao gồm:
- "and" vs "+" vs "&" → ❌ ERROR
- "Like" vs "like" (case khác) → ❌ ERROR
- "CRF450R" vs "2026 CRF450R" → ❌ ERROR
- Bất kỳ thay đổi nào dù nhỏ → ❌ ERROR

## 4. Quy tắc Compare

### 4.1 Exact Match - CHỈ CÓ 1 KẾT QUẢ PASS
```
DOCX: "See Honda HRC Progressive in Action"
Design: "See Honda HRC Progressive in Action"
Result: ✅ PASS
```

### 4.2 Mismatch - MỌI KHÁC BIỆT ĐỀU LÀ ERROR
```
DOCX: "Ride Like Jett and Hunter"
Design: "Ride like Jett + Hunter"
Result: ❌ ERROR - "Like" → "like", "and" → "+"
```

```
DOCX: "CRF450R"
Design: "2026 CRF450R"
Result: ❌ ERROR - thêm "2026"
```

```
DOCX: "Buy Tickets Now"
Design: "Get Tickets"
Result: ❌ ERROR - text không khớp
```

## 5. Checklist Compare

### Module Header/Hero
- [ ] Headline text
- [ ] Subheadline text (nếu có)
- [ ] CTA button(s) text

### Product Modules
- [ ] Product name
- [ ] Product subhead/descriptor
- [ ] Year (nếu có)

### Footer
- [ ] Legal disclaimer
- [ ] Social links presence
- [ ] Unsubscribe text

## 6. Output Report Format

### 6.1 Full Report Template

```markdown
## Compare Report - [Template Name]

### 1. DOCX vs Design

| # | Content Type | DOCX (Source) | Desktop | Mobile | Status |
|---|--------------|---------------|---------|--------|--------|
| 1 | Headline | "Text from DOCX" | "Text in Desktop" | "Text in Mobile" | ✅ Match |
| 2 | CTA #1 | "Text from DOCX" | "Text in Desktop" | "Text in Mobile" | ❌ Error |
| 3 | ... | ... | ... | ... | ❌ Error |

### 2. Desktop vs Mobile

| # | Content Type | Desktop | Mobile | Status |
|---|--------------|---------|--------|--------|
| 1 | Headline | "Desktop text" | "Mobile text" | ✅ Identical |
| 2 | ... | ... | ... | ... |

### 3. Summary

| Metric | DOCX vs Design | Desktop vs Mobile |
|--------|----------------|-------------------|
| Total Items | X | X |
| ✅ Match/Identical | X | X |
| ❌ Error | X | X |
| Missing | X | X |

**Kết luận:** [Tóm tắt kết quả]
```

### 6.2 Sample Report

⚠️ **KHÔNG SỬ DỤNG SAMPLE DATA** - Luôn extract data mới từ source files theo Bước 0.

Report phải được generate từ data thực tế, không copy từ đây.

## 7. Lưu ý đặc biệt

### 7.1 Dynamic Content (Variables)
- DOCX có thể chứa placeholders: `%%VARIABLE%%`, `{{variable}}`
- Design thường hiển thị sample data
- Chỉ compare static text, bỏ qua variables

### 7.2 Responsive Differences
- Desktop và Mobile có thể có text khác nhau
- Compare riêng cho từng breakpoint

### 7.3 ❌ TẤT CẢ KHÁC BIỆT ĐỀU LÀ ERROR
| DOCX | Design | Status |
|------|--------|--------|
| "and" | "+" hoặc "&" | ❌ ERROR |
| "Number" | "#" | ❌ ERROR |
| "Like" | "like" | ❌ ERROR |
| "CRF450R" | "2026 CRF450R" | ❌ ERROR |
| Uppercase/lowercase khác | - | ❌ ERROR |
| Bất kỳ thay đổi nào | - | ❌ ERROR |

### 7.4 ❌ Các loại Error phổ biến - PHẢI BÁO CÁO
| Issue | Example | Status |
|-------|---------|--------|
| Thiếu/thừa dấu chấm | "Action." vs "Action" | ❌ Mismatch |
| Thiếu/thừa dấu phẩy | "Chance," vs "Chance" | ❌ Mismatch |
| Số thừa trong text | "Team2" vs "Team" | ❌ DOCX Typo |
| Thiếu space | "TicketsNow" vs "Tickets Now" | ❌ DOCX Typo |
| Ký tự lạ | "or- alcohol" vs "or alcohol" | ❌ DOCX Typo |
| Content missing | Có trong Design, không có DOCX | ❌ Missing |

### 7.5 So sánh chính xác - Checklist
Khi compare, PHẢI check:
- [ ] Dấu chấm cuối câu (.)
- [ ] Dấu phẩy (,)
- [ ] Spaces giữa các từ
- [ ] Số hoặc ký tự thừa
- [ ] Ký tự đặc biệt (-, _, etc.)
- [ ] Content có trong cả 3 sources (DOCX, Desktop, Mobile)

## 8. Compare Desktop vs Mobile Design

### 8.1 Mục đích
Đảm bảo content giữa Desktop và Mobile design đồng nhất, phát hiện các trường hợp:
- Text bị thiếu trên 1 breakpoint
- Text khác nhau giữa 2 breakpoint
- Text bị cắt ngắn không đúng cách

### 8.2 Quy tắc Compare Desktop vs Mobile

#### 8.2.1 Bắt buộc giống nhau (Critical)
| Content Type | Desktop | Mobile | Phải giống? |
|-------------|---------|--------|-------------|
| Headlines | ✓ | ✓ | ✅ Bắt buộc |
| CTA text | ✓ | ✓ | ✅ Bắt buộc |
| Product names | ✓ | ✓ | ✅ Bắt buộc |
| Legal footer | ✓ | ✓ | ✅ Bắt buộc |
| Brand names | ✓ | ✓ | ✅ Bắt buộc |

#### 8.2.2 KHÔNG cho phép khác nhau
| Content Type | Status |
|-------------|--------|
| Body copy length | ❌ ERROR nếu khác |
| Line breaks trong text | ❌ ERROR nếu khác |
| Mọi text content | ❌ ERROR nếu khác |

### 8.3 Output Report Format - Desktop vs Mobile

```markdown
## Desktop vs Mobile Compare Report

### Summary
- Total content items: X
- Identical: X
- Different: X
- Missing on Desktop: X
- Missing on Mobile: X

### ✅ Identical Content
| Content | Desktop | Mobile |
|---------|---------|--------|
| Headline | "See Honda HRC Progressive in Action" | "See Honda HRC Progressive in Action" |

### ❌ Different Content (ERROR)
| Content | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Body copy | "Full text..." | "Shortened..." | ❌ ERROR |

### ❌ Missing Content
| Content | Desktop | Mobile | Issue |
|---------|---------|--------|-------|
| Promo text | "Special offer" | - | Missing on Mobile |
```

### 8.4 Compare Script - Desktop vs Mobile

```javascript
function compareDesktopMobile(desktopJson, mobileJson) {
  const desktopTexts = extractTexts(desktopJson[0]);
  const mobileTexts = extractTexts(mobileJson[0]);

  const report = {
    identical: [],
    different: [],
    missingOnDesktop: [],
    missingOnMobile: []
  };

  // Normalize và compare
  const desktopMap = new Map(
    desktopTexts.map(t => [normalize(t.text), t])
  );
  const mobileMap = new Map(
    mobileTexts.map(t => [normalize(t.text), t])
  );

  // Find identical & different
  for (const [key, desktop] of desktopMap) {
    if (mobileMap.has(key)) {
      report.identical.push({ desktop, mobile: mobileMap.get(key) });
    } else {
      report.missingOnMobile.push(desktop);
    }
  }

  // Find missing on desktop
  for (const [key, mobile] of mobileMap) {
    if (!desktopMap.has(key)) {
      report.missingOnDesktop.push(mobile);
    }
  }

  return report;
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[+&]/g, 'and')
    .trim();
}
```

## 9. Cách extract text từ Figma JSON

### 9.1 Text nodes
Tìm tất cả nodes có `type: "TEXT"` và lấy field `characters`

```javascript
function extractTexts(node, texts = []) {
  if (node.type === 'TEXT' && node.characters) {
    texts.push({
      name: node.name,
      text: node.characters,
      fontSize: node.fontSize
    });
  }
  if (node.children) {
    node.children.forEach(child => extractTexts(child, texts));
  }
  return texts;
}
```

### 9.2 Compare flow
1. Extract text từ DOCX (parse XML)
2. Extract text từ Figma JSON (parse nodes)
3. Compare EXACT match - character by character
4. Báo cáo MỌI khác biệt là ERROR

## 9. Sample Compare Script

```javascript
// Node.js script to compare DOCX vs Figma JSON
const mammoth = require('mammoth'); // for DOCX
const fs = require('fs');

async function compare(docxPath, jsonPath) {
  // 1. Extract from DOCX
  const docxResult = await mammoth.extractRawText({path: docxPath});
  const docxText = docxResult.value;

  // 2. Extract from JSON
  const json = JSON.parse(fs.readFileSync(jsonPath));
  const designTexts = extractTexts(json[0]);

  // 3. Compare
  const report = {
    matched: [],
    mismatched: [],
    missing: []
  };

  // ... compare logic
  return report;
}
```
