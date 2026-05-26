# 🔄 Content & Image Replacer

> Adobe InDesign UXP Plugin for batch content and image replacement

## 📦 Plugin Information

- **Name:** Content & Image Replacer
- **Version:** 1.0.0 - Phase 7 (60% Complete)
- **Platform:** Adobe InDesign 2026 (v21.3.0.60)
- **Framework:** Vanilla JavaScript + UXP
- **Manifest Version:** 5

## ✨ Features

### ✅ Phase 1-6: Core Features (100% Complete)

- **📋 Document Scanning**
  - Scan all text frames and image frames across all pages
  - Recursive scanning inside groups
  - Frame metadata extraction (name, content, page, size)
  - Search/filter frames by name or content

- **✏️ Text Replacement**
  - Click-to-select frames from list
  - Preview current content
  - Replace with new text
  - Auto-navigate to frame on canvas
  - Selection handles display

- **🖼️ Image Replacement**
  - File picker integration
  - Image format support (JPEG, PNG, TIFF, PSD, AI, PDF)
  - File size validation (max 50MB)
  - Fit options: Proportionally, Fill Frame, Fit Frame to Content
  - Auto-navigate and select on canvas

- **🎨 Modern UI**
  - Dual-tab interface (Text / Image frames)
  - Modal popups for replace operations
  - Frame count badges
  - Search/filter inputs
  - Active tab visual indicators
  - Loading states and error handling

- **✅ Quality of Life**
  - Undo button after successful replace
  - Stale frame detection
  - Real-time frame list updates
  - Success/error notifications
  - HTML escaping for security

### 🔄 Phase 7: Advanced Features (60% Complete)

- ✅ **Undo Button** - Quick revert after replace
- ✅ **Search/Filter** - Find frames by name or content  
- ✅ **Frame Labels** - Custom labels with size/page info
- ⏳ **Keyboard Shortcuts** - Ctrl+F (search), Enter (replace), Esc (cancel)
- ⏳ **Batch Operations** - Multi-select and replace multiple frames

## 📂 Project Structure

```
tool-replace-indesign/
├── manifest.json       # UXP plugin manifest v5
├── index.html         # UI with modal system
├── index.js           # InDesign API integration
├── icons/
│   └── icon.png       # Plugin icon
└── README.md          # Documentation
```

## 🚀 Installation

### Prerequisites

- Adobe InDesign 2024 or later (tested on InDesign 2026 v21.3.0.60)
- Adobe UXP Developer Tools v2.0+ (tested on v2.2.1)

### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/thucnguyengravityglobal/tool-helper-replace-studio.git
   cd tool-helper-replace-studio
   ```

2. **Open UXP Developer Tools**
   - Launch: `/Applications/Adobe UXP Developer Tools/Adobe UXP Developer Tools.app`

3. **Add Plugin**
   - Click **"Add Plugin"**
   - Select the cloned directory
   - Click **"Load"** or **"Load & Watch"**

4. **Launch InDesign**
   - Open InDesign
   - Open a document (.indd file)
   - Access plugin via: **Plugins → Replace Tool**

## 📖 Usage

### Basic Workflow

1. **📄 Open Document**
   - Open an InDesign document (.indd)
   - Make sure document window is active

2. **🔍 Scan Document**
   - Click **"Scan Document"** button
   - Plugin will scan all pages for text/image frames
   - Frame counts appear in tab badges

3. **✏️ Replace Text**
   - Switch to **"Text Frames"** tab
   - Click any frame in the list
   - InDesign navigates to that frame
   - Modal opens with current text
   - Enter new text → Click **"Replace Text"**
   - Use **"Undo"** button to revert if needed

4. **🖼️ Replace Image**
   - Switch to **"Image Frames"** tab
   - Click any frame in the list
   - InDesign navigates to that frame
   - Click **"Choose Image File..."**
   - Select new image (JPEG, PNG, TIFF, PSD, AI, PDF)
   - Choose fit option → Click **"Replace Image"**
   - Use **"Undo"** button to revert if needed

### Tips

- **Search/Filter:** Use the filter input to quickly find frames
- **Frame Labels:** Shows frame name, page number, and dimensions
- **Active Selection:** Clicked frames are automatically selected on canvas
- **Page Navigation:** Plugin auto-navigates to the correct page
- **Stale Detection:** Plugin warns if frame no longer exists

## 🛠️ Technical Stack

- **Language:** Vanilla JavaScript (ES6+)
- **Platform:** Adobe UXP (Unified Extensibility Platform)
- **UI:** Spectrum Web Components + Custom CSS
- **API:** InDesign DOM API
- **Build:** No build process required (vanilla JS)

## ⚠️ Known Issues

1. **"No document is open" error**
   - **Solution:** Reload plugin after opening document
   - Or: Open document BEFORE loading plugin

2. **Modal overlay z-index issues**
   - **Fixed:** Search inputs now hidden when modal opens

3. **API timing issues**
   - **Solution:** Wait 1-2 seconds after opening document before scanning

## 🔮 Roadmap

### Phase 8: Advanced Operations
- CSV import for bulk text replacement
- Batch replace (select multiple frames)
- Find & Replace with regex support
- Replace history panel
- Export frame data to CSV

### Phase 9: Performance & Polish
- Optimize for 500+ frames
- User preferences persistence
- Keyboard shortcuts
- Copy frame info to clipboard
- Dark mode support

## 📄 License

MIT License

## 👤 Author

**Thuc Nguyen**
- GitHub: [@thucnguyengravityglobal](https://github.com/thucnguyengravityglobal)
- Company: Gravity Global

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Phase 1-6: Complete core features
- 🔄 Phase 7: 60% complete (Undo, Search, Labels)
- 🎨 Modern UI with modal system
- 🔍 Click-to-select canvas integration
- ⚡ Robust error handling

5. **Mở InDesign**
   - Open Adobe InDesign 2026
   - Plugin sẽ tự động kết nối

6. **Open Panel**
   - Go to **Window → Replace Tool**
   - Panel xuất hiện bên phải

### Test Plugin (Phase 1 & 2)

1. Open any `.indd` document (or create new)

2. In **Replace Tool** panel:

**Phase 1 - Test Connection:**
- Click **"Test Connection"**
- See document info: name, pages, text frames count

**Phase 2 - Scan Document:**
- Click **"Scan Document"**
- See full scan results:
  ```
  ✅ Scanned document: sample.indd (5 pages)
  Found 12 text frames and 4 image frames
  ```
- **Text Frames list** shows:
  - Frame name
  - Content preview (first 50 characters)
  - Page number
  - If in Group
- **Image Frames list** shows:
  - Frame name
  - Image file path (or "Empty frame")
  - Page number
- **Click any item** to select it (highlighted in blue)

**Phase 3 - Replace Text Content:**

**Method 1: Select from list**
1. Scan document first
2. Click a text frame from the list
3. **Replace Text section** appears showing:
   - Selected frame info
   - Current content (read-only)
   - New content textarea
4. Enter new text in "New Content" field
5. Click **"Replace Text"** → Done! ✅

**Method 2: Select from canvas**
1. Select a text frame on InDesign canvas
2. Click **"Use Selection"** button in Replace Text section
3. Frame info populates automatically
4. Enter new text and click **"Replace Text"**

**Features:**
- ✅ **Preserves text styling** (font, color, size, formatting)
- ✅ **Auto-handles overflow** - frame expands if text too long
- ✅ **Confirmation for empty text** - asks before clearing content
- ✅ **Works with grouped frames** - no problem!
- ✅ **Live preview** - current content shown before replace

**Without document open:**
```
❌ No document is currently open. Please open an InDesign document first.
```

## 🎯 Features by Phase

### Phase 1 ✅
- ✅ UXP Plugin manifest v5 (compatible with InDesign 21.3)
- ✅ InDesign API connection (`require("indesign")`)
- ✅ Read active document information
- ✅ Count pages and text frames
- ✅ Error handling (no document open)
- ✅ UI with Spectrum button
- ✅ Result display with success/error states
- ✅ Console logging for debugging

### Phase 2 ✅ (Current)
- ✅ **Scan Document** button
- ✅ Scan **ALL pages** for text frames
- ✅ Scan **ALL pages** for image frames (rectangles with graphics)
- ✅ **Recursive scanning** - find text/image frames inside Groups
- ✅ Display **scrollable lists** (max-height 250px)
- ✅ **Text frames list:** name, preview (50 chars), page number
- ✅ **Image frames list:** name, image path, page number
- ✅ **Clickable items** - select frame from list (blue highlight)
- ✅ Distinguish frames in groups vs. regular frames
- ✅ Handle empty image frames (no graphic)
- ✅ Store frame references for Phase 3 (replace operations)

### Phase 3 ✅ (Current)
- ✅ **Replace Text section** - appears when text frame selected
- ✅ **Display current content** - read-only textarea
- ✅ **New content textarea** - user input
- ✅ **Replace Text button** - execute replacement
- ✅ **Use Selection button** - select frame from canvas (`app.activeDocument.selection`)
- ✅ **Preserve text styling** - font, color, size kept intact
- ✅ **Critical replace logic:** `while (textFrame.contents.length > 0) { textFrame.contents = "" }` then write new
- ✅ **Handle text overflow** - auto-fit frame with `FitOptions.frameToContent`
- ✅ **Recompose after replace** - `textFrame.recompose()`
- ✅ **Empty content confirmation** - prompt before clearing
- ✅ **Error handling** - stale frame references, document closed, etc.
- ✅ **Works with grouped frames** - no issues
- ✅ **Live UI updates** - current content refreshes after replace

## 🔧 Technical Details

### Manifest Format (v5)
```json
{
  "manifestVersion": 5,
  "id": "com.toolstudio.contentreplacer",
  "name": "Content & Image Replacer",
  "host": [
    {
      "app": "ID",
      "minVersion": "19.0.0"
    }
  ],
  "entrypoints": [
    {
      "type": "panel",
      "id": "replaceTool"
    }
  ]
}
```

### InDesign APIs Used

**Phase 1:**
- `app.activeDocument` - Get active document
- `doc.name` - Document filename
- `doc.pages.length` - Total page count
- `page.textFrames.everyItem().getElements()` - Get all text frames

**Phase 2:**
- `page.rectangles.everyItem().getElements()` - Get all rectangles on page
- `page.groups.everyItem().getElements()` - Get all groups on page
- `group.allPageItems` - Get all items inside group (for recursion)
- `item.constructor.name` - Check item type ("TextFrame", "Rectangle", "Group")
- `textFrame.contents` - Get text content
- `textFrame.name` / `textFrame.label` - Get frame identifier
- `rectangle.allGraphics` - Get graphics in rectangle
- `graphic.itemLink.filePath` - Get linked image file path

**Phase 3:**
- `app.activeDocument.selection` - Get selected items on canvas
- `textFrame.contents = ""` - Clear content (use in while loop!)
- `textFrame.contents = "new text"` - Set new content
- `textFrame.overflows` - Check if text exceeds frame
- `textFrame.fit(FitOptions.frameToContent)` - Auto-fit frame to content
- `textFrame.recompose()` - Re-render text frame after changes
- `FitOptions.frameToContent` - Fit option constant

### Key Implementation Details
- ✅ `require("indesign")` called **inside function** (not top-level)
- ✅ Script tag placed **at end of body** (after DOM elements)
- ✅ All InDesign API calls wrapped in **try-catch**
- ✅ User-friendly error messages in UI
- ✅ Console logging for debugging
- ✅ **Recursive scanning** using `group.allPageItems` to find nested frames
- ✅ **Frame references stored** in arrays for later use (Phase 3+)
- ✅ **Click handlers** on list items for selection
- ✅ **Scrollable lists** with max-height 250px + overflow-y auto
- ✅ **Visual feedback** - selected item highlighted with blue background
- ✅ **CRITICAL replace logic:** Use `while` loop to clear old content before writing new
  ```javascript
  while (textFrame.contents.length > 0) {
    textFrame.contents = "";
  }
  textFrame.contents = newContent;
  ```
- ✅ **Overflow handling** - check `textFrame.overflows` and auto-fit if needed
- ✅ **Recompose after edit** - call `textFrame.recompose()` to re-render
- ✅ **Hard-coded CSS colors** - Spectrum CSS variables don't work in UXP

## 🚨 Troubleshooting

### Plugin doesn't load / Timeout error

**Fix:**
1. Quit InDesign
2. Clear cache: `rm -rf ~/Library/Caches/Adobe/UXP/`
3. Load plugin in UXP Developer Tools FIRST
4. THEN open InDesign

### "Unhandled promise rejection" error

**Cause:** JavaScript error or InDesign API called at wrong time

**Fix:** Already fixed in current version - `require("indesign")` is inside function

### Panel doesn't appear in Window menu

**Fix:**
1. Ensure plugin State = "Loaded" (green) in UXP Developer Tools
2. Restart InDesign
3. Check Window menu again

For detailed troubleshooting, see **VERSION-INFO.md**

## 📝 Next Steps

**Phase 4** will add:
- Replace image in selected image frame
- File picker to choose new image (jpg, png, psd, ai, pdf, tiff)
- Fit options dropdown (Proportionally, Fill Frame, Frame to Content)
- Handle empty frames (place new image)
- "Use Selection" for image frames from canvas

---

## 📚 Documentation

- **VERSION-INFO.md** - System versions, manifest format, troubleshooting guide
- **Master Prompt** - Full project specification (6 phases)

---

**Status:** ✅ Phase 3 Complete - Ready for Phase 4  
**Last Updated:** April 27, 2026  
**InDesign:** 21.3.0.60 | **UXP:** 2.2.1

