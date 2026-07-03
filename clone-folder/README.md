# Clone Banner Tool

Clone and duplicate HTML banner folders. Two modes: **Clone Size** and **Duplicate Version**.

## Requirements

- PHP installed on your machine
  - **macOS**: `brew install php`
  - **Windows**: Download from https://windows.php.net/download

## How to Use

### 1. Start the tool

- **macOS**: Double-click `start-mac.command`
- **Windows**: Double-click `start-win.bat`

Browser will open automatically at `http://localhost:8080`.

### 2. Prepare source folder

Copy your banner folder into `clone-folder/`. Example:

```
clone-folder/
├── index.php
├── start-mac.command
├── start-win.bat
├── 728x90/            ← source folder
├── v1-728x90/         ← also works with prefix/suffix
└── 728x90-test/       ← also works
```

---

## Tab 1: Clone Size

Clone a banner folder to different sizes. Automatically replaces dimensions in file content and file/folder names.

1. Select source folder from dropdown
2. Pick target sizes (click tags or type manually)
3. Click **Clone**

Output folders are created with prefix/suffix preserved:

- `v1-728x90` → `v1-300x250`, `v1-160x600`
- `728x90-test` → `300x250-test`, `160x600-test`

### What gets replaced

In all files inside the source folder:

| Find | Replace |
|------|---------|
| `728x90` | `300x250` |
| `width: 728px;` | `width: 300px;` |
| `height: 90px;` | `height: 250px;` |
| `data-gwd-width="728px"` | `data-gwd-width="300px"` |
| `data-gwd-height="90px"` | `data-gwd-height="250px"` |
| `minWidth":728` | `minWidth":300` |
| `minHeight":90` | `minHeight":250` |
| `maxWidth":728` | `maxWidth":300` |
| `maxHeight":90` | `maxHeight":250` |
| `"viewport.width":728` | `"viewport.width":300` |
| `"viewport.height":90` | `"viewport.height":250` |
| `width=728,height=90` | `width=300,height=250` |

File and folder names containing the size pattern are also renamed.

---

## Tab 2: Duplicate Version

Duplicate a banner folder with version replacement (e.g. V1 → V2).

1. Select source folder — **Find** field auto-detects version prefix (e.g. `v1`)
2. Enter **Replace** value (e.g. `V2`)
3. Preview shows affected files, click **Duplicate**

### What gets changed

- **Folder name**: `v1_160x600` → `v2_160x600`
- **File names**: `V1-160x600.html` → `V2-160x600.html` (case-insensitive)
- **File contents**: all occurrences of find text replaced (case-insensitive)
  - Includes `publish.local.name`, `title`, and any matching text
  - Applies to: `.html`, `.htm`, `.json`, `.xml`, `.svg`, `.txt`
  - Skips: `.js`, `.css`, and other binary files

### What gets skipped

- `gwd_preview_*` folders: renamed (e.g. `gwd_preview_V1-160x600` → `gwd_preview_V2-160x600`) but contents inside are copied as-is, no replacement
