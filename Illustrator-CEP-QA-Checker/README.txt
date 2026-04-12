QA Checker — Adobe Illustrator CEP Extension
=============================================

Font & Color inspector (WhatFont-style) for Illustrator.
Built with CEP (Common Extensibility Platform) vi UXP chua support Illustrator day du.

INSTALL (macOS)
---------------
1. Enable PlayerDebugMode (chi can lam 1 lan):
   Mo Terminal, chay:
     defaults write com.adobe.CSXS.10 PlayerDebugMode 1
     defaults write com.adobe.CSXS.11 PlayerDebugMode 1
     defaults write com.adobe.CSXS.12 PlayerDebugMode 1

2. Copy (hoac symlink) folder "Illustrator-CEP-QA-Checker" vao:
     ~/Library/Application Support/Adobe/CEP/extensions/

   Symlink cho dev (thay doi code tu dong apply sau khi reload panel):
     mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
     ln -s "/Users/thien.ho/Projects/Tool-FE-Helper/Illustrator-CEP-QA-Checker" \
           ~/Library/Application\ Support/Adobe/CEP/extensions/Illustrator-CEP-QA-Checker

3. Restart Illustrator.

4. Mo panel: Window > Extensions > QA Checker

INSTALL (Windows)
-----------------
1. Enable debug mode: regedit > HKEY_CURRENT_USER\Software\Adobe\CSXS.11 (hoac .10/.12)
   Them String value: PlayerDebugMode = 1
2. Copy folder vao: %APPDATA%\Adobe\CEP\extensions\
3. Restart Illustrator.

USAGE
-----
[ Live tab ] — WhatFont mode
  - Panel poll selection moi 500ms.
  - Click 1 text frame tren canvas → panel tu dong hien font info.
  - Multi-run support: text co nhieu style trong 1 frame → liet ke day du.

[ Scan tab ]
  - Scope: "Toan document" (default) hoac "Selection".
  - Click Scan → hien:
    • Summary: group theo (font + size + color), click row → select het text matching tren canvas.
    • Details: tung text frame va cac run ben trong.
  - Missing font → vien do + badge "MISSING".
  - Export CSV: luu report cho QC.

STRUCTURE
---------
CSXS/manifest.xml   — CEP config
host/host.jsx       — ExtendScript backend (runs in Illustrator)
js/CSInterface.js   — Minimal CEP bridge
js/main.js          — Panel UI logic
index.html          — Panel layout
styles.css          — Dark theme

TEST FILE
---------
/Users/thien.ho/Projects/Tool-FE-Helper/QA-AI/1-HCP reduction Polisher Solutions_green.ai

DEBUG
-----
- JS console: Chrome mo http://localhost:8092 (port co the khac, check .debug file neu can).
- ExtendScript errors: View menu > Info > (hoac) dung alert() trong host.jsx de debug nhanh.
- Neu panel khong xuat hien: check Console.app "CEP", hoac xem
  ~/Library/Logs/CSXS/ cho error logs.

KNOWN LIMITATIONS
-----------------
- Text trong Symbol, Placed files → chua detect.
- CMYK → RGB la gan dung (chua dung ICC profile).
- Gradient/Pattern fill → hien label, khong extract stops.
- Live mode poll 500ms (CEP khong co native selection event).
