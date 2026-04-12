QA Checker — Adobe Illustrator CEP Extension
=============================================
Version: 0.1.0
Platform: CEP (Common Extensibility Platform)
Host: Adobe Illustrator 2020+ (v24.0+)


TỔNG QUAN
---------
Plugin giúp QC kiểm tra nhanh font, color, style của tất cả elements
trong file .ai — thay vì phải click từng object rồi đọc manual trong
Character/Color panel của Illustrator.

3 tab chính:
  - Live : Click bất kỳ item nào trên canvas → hiện info ngay trong panel
  - Scan : Quét toàn bộ document → liệt kê tất cả text styles + filter/sort
  - Color: So sánh màu trong file với brand palette → báo match/no-match


CÁC FILE TRONG PLUGIN
----------------------
Illustrator-CEP-QA-Checker/
  CSXS/
    manifest.xml        CEP config (host, version, panel size, permissions)
  host/
    host.jsx            ExtendScript — chạy trong Illustrator, truy cập DOM
                        (doc.textFrames, characterAttributes, fillColor, v.v.)
  js/
    CSInterface.js      Bridge để panel HTML gọi vào host.jsx qua evalScript
    main.js             Toàn bộ UI logic (tabs, cards, profiles, export, v.v.)
  index.html            Panel layout (3 tabs + logs)
  styles.css            Dark theme CSS
  .debug                Dev debug config (Chrome DevTools port 8092)
  sample-palette.json   File JSON mẫu để test Import palette
  README.txt            File này


FLOW CỦA PLUGIN
----------------

1) LIVE TAB — Inspect nhanh (WhatFont-style)
   User click 1 hoặc nhiều item trên canvas
   → Panel poll selection mỗi 500ms (qaGetSelection trong host.jsx)
   → Nếu là text frame:
      - Đọc từng character, gom thành "runs" (nhóm chars cùng attributes)
      - Hiện card với: font-family, font-weight (số CSS), font-style,
        font-size, line-height, letter-spacing, color (hex + swatch)
      - Nếu 1 frame có nhiều runs khác nhau → highlight dòng khác biệt (màu cam)
      - Click vào bất kỳ giá trị nào → copy to clipboard
   → Nếu là shape/path:
      - Hiện fill color + stroke color (hex + swatch + CMYK/RGB info)
      - Click hex → copy

2) SCAN TAB — Quét toàn bộ document
   User chọn scope (Entire document / Current selection) → click Scan
   → host.jsx duyệt tất cả textFrames (kể cả trong groups)
   → Trích xuất runs tương tự Live tab
   → Trả về 2 view:
      Summary: gom theo (font + size + color), đếm count, click row → select
               trên canvas. Có filter (search) và sort (Count/Font/Size).
      Details: từng text frame và các runs bên trong.
   → Missing font: quét qua app.textFonts.getByName() → nếu không có → đỏ
   → Badge trên tab: xanh (OK) hoặc đỏ (có missing font)
   → Export Report (.xls): xuất file Excel với 2 sheets:
      Sheet 1 "Font Check": #, Text, Font Family, weight, style, size,
              line-height, letter-spacing, Color Hex, Color Model, Missing
      Sheet 2 "Color Check": Status, Hex, Model, Sources, Items, Name, Tint
      Header đen trắng, row OFF-PALETTE/MISSING → nền hồng chữ đỏ.

3) COLOR TAB — Kiểm tra màu theo brand palette
   a) Setup palette (1 lần cho mỗi brand):
      - Tạo Profile mới (tên mặc định = tên document)
      - Nhập palette bằng 1 trong 3 cách:
        * Paste hex vào textarea (mỗi dòng 1 hex, có thể có tên trước):
            // Primary
            black  #021C42
            #195ED5
            semantic/error  #C62828
        * Import JSON: click "Import JSON" → chọn file .json
          (xem sample-palette.json để biết format)
        * Pick from file: click "Pick from file" → plugin tự động
          extract tất cả màu unique từ file .ai đang mở → điền vào textarea
      - Click Save → lưu vào localStorage (profile persistent qua các session)
      - Hover swatch → tooltip hiện tên + hex
      - Click × trên swatch → xoá màu đó khỏi textarea
      - Đổi profile → warning nếu có unsaved changes

   b) Check (mỗi file .ai):
      - Chọn scope → click "Check Colors"
      - Plugin scan tất cả: text fill, text stroke, path fill, path stroke,
        gradient stops. Spot color → convert về base hex 100% để so sánh.
      - So sánh exact hex match với palette:
        * Tất cả khớp → "Color match" (xanh) + badge xanh trên tab
        * Có màu không khớp → "Color no match" (đỏ) + list OFF-PALETTE
      - Click row OFF-PALETTE → select items dùng màu đó trên canvas
      - Matched section: collapsed mặc định, click expand để xem
      - Export chung với Font Check trong 1 file .xls


=======================================================================
HƯỚNG DẪN CÀI ĐẶT TRÊN MÁY MỚI (macOS)
=======================================================================

BƯỚC 1: Copy plugin
--------------------
Copy toàn bộ folder "Illustrator-CEP-QA-Checker" vào máy mới.
Đặt ở đâu cũng được, ví dụ:
  ~/Documents/Illustrator-CEP-QA-Checker/

Hoặc clone từ git (nếu đã push):
  git clone <repo-url>


BƯỚC 2: Bật Debug Mode (chỉ cần làm 1 lần)
--------------------------------------------
Mở Terminal.app, chạy 3 lệnh này (copy paste nguyên khối):

  defaults write com.adobe.CSXS.10 PlayerDebugMode 1
  defaults write com.adobe.CSXS.11 PlayerDebugMode 1
  defaults write com.adobe.CSXS.12 PlayerDebugMode 1

Giải thích: Adobe mặc định chỉ cho load extension đã ký (signed).
Lệnh này bật "debug mode" để Illustrator chấp nhận extension chưa ký.
- An toàn, chỉ ảnh hưởng Adobe apps, không cần sudo.
- Muốn tắt lại: defaults delete com.adobe.CSXS.11 PlayerDebugMode


BƯỚC 3: Đặt plugin vào thư mục extensions
------------------------------------------
Cách A — Symlink (khuyến nghị cho dev, edit code → reload là thấy):

  mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
  ln -s "/đường/dẫn/đến/Illustrator-CEP-QA-Checker" \
        ~/Library/Application\ Support/Adobe/CEP/extensions/QA-Checker

Cách B — Copy (cho máy production, không cần edit code):

  cp -r /đường/dẫn/đến/Illustrator-CEP-QA-Checker \
        ~/Library/Application\ Support/Adobe/CEP/extensions/QA-Checker

Lưu ý: Thư mục ~/Library bị ẩn mặc định.
Để mở: Finder → menu Go → giữ Option → chọn Library.
Hoặc paste đường dẫn vào Terminal.


BƯỚC 4: Khởi động lại Illustrator
----------------------------------
QUAN TRỌNG: Phải tắt hẳn Illustrator (Cmd+Q) rồi mở lại.
Chỉ đóng file hay đóng window KHÔNG ĐỦ — Illustrator vẫn giữ trạng thái cũ.


BƯỚC 5: Mở plugin
------------------
Trong Illustrator:
  Menu → Window → Extensions → QA Checker

Panel sẽ xuất hiện bên phải (có thể dock/float tuỳ ý).
Nếu không thấy "QA Checker" trong menu Extensions:
  - Kiểm tra lại Bước 2 (debug mode)
  - Kiểm tra lại Bước 3 (đúng thư mục, đúng tên)
  - Xem log: ~/Library/Logs/CSXS/ hoặc mở Console.app tìm "CEP"


BƯỚC 6 (tuỳ chọn): Setup Color palette
---------------------------------------
- Tab Color → click "New" → nhập tên (vd: "TF Sales Pitch Deck")
- Import JSON hoặc paste hex list
- Click Save
- Palette sẽ lưu persistent, lần sau mở Illustrator vẫn còn.


=======================================================================
HƯỚNG DẪN CÀI ĐẶT TRÊN MÁY MỚI (Windows)
=======================================================================

BƯỚC 1: Copy plugin
--------------------
Copy folder "Illustrator-CEP-QA-Checker" vào máy.

BƯỚC 2: Bật Debug Mode
-----------------------
Mở Registry Editor (Win+R → gõ regedit):
  HKEY_CURRENT_USER\Software\Adobe\CSXS.11
  (nếu không có thì tạo key CSXS.11)
  Thêm String value: PlayerDebugMode = 1
  Làm tương tự cho CSXS.10 và CSXS.12.

BƯỚC 3: Copy vào thư mục extensions
------------------------------------
Copy folder vào:
  %APPDATA%\Adobe\CEP\extensions\QA-Checker

(Paste %APPDATA%\Adobe\CEP\extensions vào thanh địa chỉ Explorer)

BƯỚC 4: Khởi động lại Illustrator
----------------------------------
Tắt hẳn (không phải chỉ đóng file) rồi mở lại.

BƯỚC 5: Mở plugin
------------------
Window → Extensions → QA Checker


=======================================================================
DEBUG / KHẮC PHỤC SỰ CỐ
=======================================================================

Panel không xuất hiện trong menu Extensions:
  - Kiểm tra debug mode: mở Terminal chạy
      defaults read com.adobe.CSXS.11 PlayerDebugMode
    Phải trả về 1.
  - Kiểm tra folder:
      ls ~/Library/Application\ Support/Adobe/CEP/extensions/QA-Checker/
    Phải thấy CSXS/, host/, js/, index.html, v.v.
  - Xem CSXS version: Illustrator 2024+ dùng CSXS.11 hoặc .12.
    Thử set debug mode cho cả 3 version (10, 11, 12).

Panel trắng / không hiện gì:
  - Mở Chrome → http://localhost:8092 (xem file .debug cho port)
  - Xem Console tab để biết lỗi JS
  - Cmd+R trong DevTools để reload panel

Live tab không detect selection:
  - Kiểm tra checkbox "Auto detect selection" đã bật
  - Thử click trực tiếp vào text frame (không phải double-click vào edit mode)
  - Nếu select nhiều items: vẫn hiện tất cả

Export lỗi:
  - Kiểm tra log trong panel (expand Logs section)
  - Thử save vào Desktop (tránh folder có permission hạn chế)
  - File .xls là Excel XML format, mở được bằng Excel/Numbers/LibreOffice

Color check sai:
  - Kiểm tra palette đã Save chưa (click Save, phải thấy toast "Saved")
  - Exact hex match — CMYK file convert sang hex có thể chênh 1-2 giá trị
    so với palette hex. Nên dùng cùng color mode.
  - Spot color: plugin dùng base color 100% để match, bỏ qua tint %.


=======================================================================
GIỚI HẠN HIỆN TẠI
=======================================================================
- Text trong Symbol, Placed items có thể không detect được.
- CMYK → RGB là gần đúng (không dùng ICC profile, sai 1-3 giá trị hex).
- Gradient/Pattern fill: scan được gradient stops, không decompose pattern.
- Live mode poll mỗi 500ms (CEP không có native selection event).
- Export .xls là Excel XML Spreadsheet — một số tính năng Excel nâng cao
  không support (pivot, chart, v.v.), nhưng đủ cho QC report.
- evalScript có giới hạn độ dài string (~1MB) — file rất lớn (500+ items)
  có thể gặp lỗi khi export.
