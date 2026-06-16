# Test Cases — Page Guides Inspector (Photoshop UXP)

Tất cả test cases để verify plugin PSD hoạt động đúng với chức năng tương đương InDesign version.

**Setup chung:**
- Photoshop >= 24.0
- Load plugin qua UXP Developer Tools (UDT) → Add Plugin → chọn `manifest.json`
- Sau mỗi lần sửa code: UDT → Reload

---

## TC-01: Load plugin và đọc document

**Setup:** Mở PSD 1920×1080px, 72 PPI.

| # | Hành động | Expected result | INDD equivalent |
|---|---|---|---|
| 1.1 | Load plugin qua UDT → Load | Panel xuất hiện, không có lỗi đỏ | ✓ giống |
| 1.2 | Kiểm tra header | Hiển thị "Page Guides Inspector (PS)" | tên khác |
| 1.3 | Kiểm tra doc name | Tên file PSD hiển thị đúng | ✓ giống |
| 1.4 | Kiểm tra Canvas Width | 1920 px | INDD hiển thị in/mm/pt |
| 1.5 | Kiểm tra Canvas Height | 1080 px | — |
| 1.6 | Kiểm tra Resolution field | 72 | Không có trong INDD |
| 1.7 | Kiểm tra unit selector default | "px" được chọn | INDD default là "in" |
| 1.8 | Status bar | "Loaded." | ✓ giống |

**Pass criteria:** Panel load không crash, đọc đúng canvas size và resolution.

---

## TC-02: Unit conversion

**Setup:** PSD 1920×1080px, 72 PPI.

| # | Hành động | Expected result | Công thức |
|---|---|---|---|
| 2.1 | Đổi unit → "in" | Width = 26.6667, Height = 15 | 1920/72 = 26.6667 |
| 2.2 | Đổi unit → "mm" | Width ≈ 677.3333, Height = 381 | 1920/72*25.4 |
| 2.3 | Đổi unit → "cm" | Width ≈ 67.7333, Height = 38.1 | — |
| 2.4 | Đổi unit → "pt" | Width = 1920, Height = 1080 | 72 PPI → 1px = 1pt |
| 2.5 | Đổi lại → "px" | Quay về 1920 × 1080 | — |
| 2.6 | Đổi unit khi đang có Margin = 50px → sang "in" | Margin hiển thị 0.6944 | 50/72 |
| 2.7 | Resolution field khi đổi unit | Không thay đổi (vẫn hiển thị 72) | read-only, không convert |

**Pass criteria:** Tất cả conversions đúng, round-trip px→in→px không mất data.

---

## TC-03: Apply canvas size

**Setup:** PSD 1920×1080px.

| # | Hành động | Expected result |
|---|---|---|
| 3.1 | Width = 2400, Height = 1350 → Apply | Canvas PS resize thành 2400×1350 (kiểm tra Image → Image Size) |
| 3.2 | Kiểm tra PS History panel | 1 history step "Update canvas size" |
| 3.3 | Cmd+Z | Canvas trở về 1920×1080 |
| 3.4 | Panel inputs sau undo | Panel vẫn hiển thị 2400×1350 (plugin không tự refresh sau undo) |
| 3.5 | Bấm ↻ Refresh | Panel đọc lại 1920×1080 |
| 3.6 | Status bar sau Apply | "Applied." |
| 3.7 | Width = 0 → Apply | "Page size must be positive." |
| 3.8 | Width = -100 → Apply | "Page size must be positive." |
| 3.9 | Width = "abc" → Apply | Error message (invalid value) |
| 3.10 | Enter key trong Width input | Trigger apply (không cần click button) |

**Pass criteria:** Canvas resize thực sự xảy ra trong Photoshop, undo works, validation blocks bad input.

---

## TC-04: Revert canvas setup

**Setup:** PSD 1920×1080px. Load plugin để tạo snapshot.

| # | Hành động | Expected result |
|---|---|---|
| 4.1 | Apply width=2000, height=1200 | Canvas resize |
| 4.2 | Bấm "Revert page setup" | Canvas trở về 1920×1080 |
| 4.3 | PS History panel | 1 history step "Revert canvas size" |
| 4.4 | Bấm Revert lần 2 (sau khi đã revert) | Canvas giữ nguyên 1920×1080 (không bị lỗi) |
| 4.5 | Apply → Apply lại giá trị khác → Revert | Revert về lần apply gần nhất (snapshot update sau mỗi Apply) |

**Pass criteria:** Revert khôi phục đúng canvas size từ snapshot.

---

## TC-05: Margin — persist qua localStorage

**Setup:** Plugin đã load.

| # | Hành động | Expected result |
|---|---|---|
| 5.1 | Margin Top = 20, Left = 30 → Apply | Status "Applied." |
| 5.2 | UDT → Reload plugin | Margin Top vẫn = 20, Left = 30 |
| 5.3 | Mở PSD khác → Load → Kiểm tra margin | Margin về "0" (khác document, key khác) |
| 5.4 | Quay lại PSD ban đầu | Margin Top = 20 restored |
| 5.5 | Đổi unit → "in" sau khi đã lưu margin "20" (px) | Margin hiển thị đúng giá trị converted |

**Pass criteria:** Margin persist per-document, không leak sang documents khác.

**Lưu ý khác với INDD:** Margin KHÔNG visible natively trong PS — lưu qua localStorage, dùng để tính layout Airbus spacing. Bleed và Columns đã bị xóa (không native trong PS).

---

## TC-06: Layers info tab

**Setup:** PSD với nhiều layers (ít nhất 5 top-level layers).

| # | Hành động | Expected result |
|---|---|---|
| 6.1 | Bấm tab "Layers info" | Tab active, allPagesView visible |
| 6.2 | Kiểm tra doc title | Đúng tên file |
| 6.3 | Kiểm tra W × H | Khớp với canvas (trong display unit hiện tại) |
| 6.4 | Kiểm tra Resolution | Đúng PPI |
| 6.5 | Kiểm tra "Layers (top level)" | Khớp với số top-level layers trong PS Layers panel |
| 6.6 | Bấm tab "Canvas" | Quay về page setup view, allPagesView ẩn |
| 6.7 | Resize canvas → bấm "Layers info" | W × H update đúng (sau khi đã refresh) |

**Pass criteria:** Tab switch đúng, document info hiển thị chính xác.

**Khác INDD:** INDD list tất cả pages với margin/col của từng page. PS chỉ hiển thị 1 canvas info.

---

## TC-07: Set component names

**Setup:** PSD có layer (ở bất kỳ depth nào) tên "Logo-airbus".

| # | Hành động | Expected result |
|---|---|---|
| 7.1 | Gõ "Logo-airbus" vào Logo name input | Input không vàng, checkbox Logo enabled |
| 7.2 | Gõ "logo" (lowercase) | Tìm thấy (case-insensitive partial match) |
| 7.3 | Gõ "xyz-does-not-exist" | Input vàng, comp group disabled, checkbox unchecked |
| 7.4 | Layer nằm sâu trong group (depth 3) | Plugin vẫn tìm thấy (recursive search) |
| 7.5 | Select layer "Logo-airbus" → bấm "Set" bên Logo | Layer name được set (verify trong PS Layers panel) |
| 7.6 | Select 2 layers → bấm Set | "Select exactly one layer." |
| 7.7 | Không select gì → bấm Set | "Select a layer first." |
| 7.8 | Input empty → bấm Set | "Name is empty." |
| 7.9 | Letter-A name field không tìm thấy | Input vàng nhưng KHÔNG có checkbox/group disabled (vì letterRef không có checkbox) |

**Pass criteria:** Name search hoạt động recursive, Set button gán tên đúng.

---

## TC-08: Apply Airbus Spacing — cơ bản

**Setup:** PSD 1920×1080px, 72 PPI.

Tạo layers với properties sau:
- "Logo-airbus" — pixel layer hoặc smart object, **400×200px**
- "letter-A" — layer bất kỳ, **50×60px**
- "URL-block" — layer bất kỳ, **200×60px**
- "QR-code" — layer bất kỳ, **150×150px**
- "Main-headline" — text layer, **800×80px** (hoặc pixel layer)
- "campaign-line" — text layer, **600×50px**
- "Sub-headline" — text layer, **400×40px**

Panel settings: Margin Left = 50px, Margin Right = 50px.
→ Content width = 1920 - 50 - 50 = **1820px** (dùng để scale Logo)

| # | Hành động | Expected result | Công thức |
|---|---|---|---|
| 8.1 | Kiểm tra 7 name inputs | Tất cả không vàng | — |
| 8.2 | Bấm "Apply spacing" | Status "Spacing applied: ..." không có error | — |
| 8.3 | Logo width sau apply | **1820px** | column width = 1820 |
| 8.4 | Logo height sau apply | 200 × (1820/400) = **910px** | proportional scale |
| 8.5 | URL width sau apply | **910px** | ½ logo width |
| 8.6 | URL height sau apply | 60 × (910/200) = **273px** | proportional scale |
| 8.7 | logoScale = 1820/400 = 4.55; aW = 50×4.55 = **227.5px**, aH = 60×4.55 = **273px** | Verify trong status bar: "A: 227.5×273 px" | — |
| 8.8 | QR height sau apply | 2 × 273 = **546px** | QR H = 2×aH |
| 8.9 | QR width sau apply | 150 × (546/150) = **546px** (square) | proportional from 546 height |
| 8.10 | Main-headline width | **800px** (không đổi) | text frame giữ nguyên size |
| 8.11 | Main-headline height | **80px** (không đổi) | — |
| 8.12 | PS History panel | 1 history state "Apply Airbus layout" | undo 1 step |
| 8.13 | Cmd+Z | Tất cả layers trở về vị trí cũ, Guide group biến mất | 1 undo step |
| 8.14 | Apply lần 2 | Guide wiped → A clones mới | — |
| 8.15 | Group "Guide" | Tồn tại trong Layers panel | auto-created |
| 8.16 | A clones trong "Guide" | Opacity = 50% | — |

**Pass criteria:** Logo về đúng column width, URL = ½ logo, QR = 2A height, text layers giữ size nhưng repositioned.

---

## TC-09: Anchor variants

**Setup:** Cùng PSD như TC-08. Col=1, margin mỗi bên 50px.

| # | Config | Expected Logo position |
|---|---|---|
| 9.1 | Logo Anchor R/B, A count 2/2, Ref Trim/Trim | Logo góc dưới phải: x2 = 1920-50 - 2×aW, y2 = 1080-50 - 2×aH |
| 9.2 | Logo Anchor L/T, A count 1/1, Ref Trim/Trim | Logo góc trên trái: x1 = 0 + 1×aW, y1 = 0 + 1×aH |
| 9.3 | Logo Anchor R/T, A count 2/2, Ref Margin/Margin | Logo góc trên phải trong Margin: x2 = (1920-50) - 2×aW, y1 = 50 + 2×aH |
| 9.4 | Camp Ref V = Main | Campaign-line đặt dưới Main: campBounds[0] = mainBounds[2] + padV |
| 9.5 | Sub Ref H = QR | Sub-headline đặt cạnh QR: subBounds[1] = qrBounds[3] + padH |
| 9.6 | A count 5 / 5 | Padding = 5×aW và 5×aH |

**Pass criteria:** 2-pass dependency resolution đúng — Camp/Sub nhận ref từ component đã positioned.

---

## TC-10: Guide zone clones

**Setup:** Cùng PSD như TC-08. Apply spacing.

| # | Kiểm tra | Expected |
|---|---|---|
| 10.1 | Số A clones trong "Guide" | > 0 (tùy A count settings) |
| 10.2 | Opacity của mỗi clone | 50% |
| 10.3 | Clone tên | "A-guide-clone" |
| 10.4 | Apply lần 2 | Guide wipe → old clones removed → new clones created |
| 10.5 | Logo A count H=2, V=2 → count zones | 2 H zones + 2 V zones = 4 zones cho Logo + zones cho URL/QR/Main/Camp/Sub |
| 10.6 | Camp A clones | force-bottom: H clones bắt đầu từ mép dưới camp |
| 10.7 | Sub A clones | force-bottom: H clones bắt đầu từ mép dưới sub |

---

## TC-11: Persistence — Airbus settings

| # | Hành động | Expected result |
|---|---|---|
| 11.1 | Đổi Logo anchor = L/T, A count H = 3 | UI thay đổi |
| 11.2 | UDT → Reload | Logo anchor vẫn L/T, A count H vẫn 3 |
| 11.3 | Đổi tên Logo = "MyLogo" → input turns yellow (nếu không có layer đó) | — |
| 11.4 | Reload | Logo name vẫn "MyLogo" (persist kể cả khi not found) |
| 11.5 | Bấm "Reset options" | Anchor về R/B default, A count về 2, Refs về defaults |
| 11.6 | Reload | Reset values được persist |
| 11.7 | Ref dropdowns sau reset | Camp Ref V = Main, Sub Ref H = QR (per REF_DEFAULTS) |

---

## TC-12: Reset options

| # | Hành động | Expected result |
|---|---|---|
| 12.1 | Thay đổi tất cả 6 anchor dropdowns | Values thay đổi |
| 12.2 | Bấm "Reset options" | Logo: R/B 2/2 Trim/Trim |
| 12.3 | — | URL: R/T 2/2 Trim/Trim |
| 12.4 | — | QR: L/B 2/2 Trim/Trim |
| 12.5 | — | Main: L/T 2/2 Trim/Trim |
| 12.6 | — | Camp: L/T 2/2 Trim/Main (Camp Ref V = Main) |
| 12.7 | — | Sub: L/B 1/2 QR/Trim (Sub Ref H = QR, A cnt H = 1) |
| 12.8 | Kiểm tra name inputs | Không thay đổi sau Reset |
| 12.9 | Kiểm tra checkboxes | Không thay đổi sau Reset |

---

## TC-13: Collapsible sections

| # | Hành động | Expected result |
|---|---|---|
| 13.1 | Click header "Page setup" | Section body collapse, caret rotate |
| 13.2 | UDT → Reload | Section vẫn collapsed |
| 13.3 | Click header lại | Section expand |
| 13.4 | Click header "Airbus spacing" | Section collapse |
| 13.5 | UDT → Reload | Section vẫn collapsed |
| 13.6 | Cả 2 sections collapse → Reload | Cả 2 vẫn collapsed |

---

## TC-14: Enter key shortcut

| # | Hành động | Expected result |
|---|---|---|
| 14.1 | Click Width input, gõ 2000, Enter | Canvas resize ngay |
| 14.2 | Click Margin Top input, gõ 30, Enter | Apply page setup (save margin) |

---

## TC-15: Edge cases

| # | Hành động | Expected result |
|---|---|---|
| 15.1 | Load plugin khi không có PSD open | "Open a Photoshop document first." |
| 15.2 | Mở PSD mới khi panel đang mở | Bấm ↻ → panel update sang doc mới |
| 15.3 | 2 layers trùng tên "Logo-airbus" | Tìm thấy layer đầu tiên (depth-first) |
| 15.4 | Logo layer size = 0px | "Logo has zero size." |
| 15.5 | letter-A layer không tìm thấy | 'Letter reference "..." not found.' |
| 15.6 | Logo checkbox unchecked nhưng vẫn apply | Logo không resize, nhưng aW/aH vẫn tính từ letter-A sau scale |
| 15.7 | Tất cả checkboxes unchecked → Apply spacing | "Logo 'X' not found" hoặc tất cả skip |
| 15.8 | Guide group bị lock trong PS | Apply spacing fails với lỗi rõ ràng |
| 15.9 | Margin Left + Margin Right > Canvas Width → Apply spacing | "Content width invalid." |
| 15.10 | Apply canvas với value rất nhỏ (10×10px) | Canvas resize về 10×10 (không crash) |

---

## TC-16: Ref dropdown — no self-reference

| # | Hành động | Expected result |
|---|---|---|
| 16.1 | Mở Logo Ref H dropdown | Không có option "Logo-airbus" (no self) |
| 16.2 | Mở Camp Ref H dropdown | Không có option "campaign-line" (no self) |
| 16.3 | Tất cả Ref dropdowns | Có Trim, Margin, và 5 components khác (7 options - 1 self = 6 options) |
| 16.4 | Đổi tên Logo → "MyLogo" | Ref dropdowns cập nhật label "MyLogo" thay vì "Logo-airbus" |

---

## TC-17: Performance — layer search với document lớn

**Setup:** PSD với 100+ layers nested nhiều levels.

| # | Hành động | Expected result |
|---|---|---|
| 17.1 | Gõ tên vào Logo input | Availability check không freeze UI |
| 17.2 | Apply spacing với document lớn | Hoàn thành trong vòng 10 giây |
| 17.3 | Cloning nhiều A zones (A count = 5/5) | Không crash |

---

## Comparison checklist — PSD vs INDD

Sau khi chạy hết test cases, verify bảng sau:

| Chức năng | INDD | PSD | Status |
|---|---|---|---|
| Load panel | ✅ | ✅ | |
| Read canvas size | ✅ | ✅ | |
| Unit conversion | ✅ | ✅ | |
| Apply canvas resize | ✅ | ✅ | |
| Revert canvas | ✅ | ✅ | |
| Bleed inputs | ✅ native | ❌ Removed (not native to PS) | |
| Margin inputs | ✅ native | ⚠️ local only | |
| Columns inputs | ✅ native | ❌ Removed (not native to PS) | |
| Column width hint | ✅ | ❌ Removed | |
| Page picker | ✅ | ❌ ẩn | |
| All pages list | ✅ | ⚠️ layers info | |
| Component name inputs | ✅ | ✅ | |
| Set name button | ✅ | ✅ | |
| Name not found highlight | ✅ | ✅ | |
| Scale Logo | ✅ | ✅ | |
| Scale URL | ✅ | ✅ | |
| Scale QR | ✅ | ✅ | |
| Reposition Main/Camp/Sub | ✅ | ✅ | |
| 2-pass positioning | ✅ | ✅ | |
| A guide clones | ✅ | ✅ | |
| Guide layer/group | ✅ | ✅ | |
| Undo 1 step | ✅ | ✅ | |
| Reset options | ✅ | ✅ | |
| Persist settings | ✅ in-file | ⚠️ localStorage | |
| Collapsible sections | ✅ | ✅ | |
| Enter to apply | ✅ | ✅ | |

**Legend:**
- ✅ Feature implemented
- ⚠️ Implemented with known limitation
- ❌ Not implemented (by design or PS limitation)
