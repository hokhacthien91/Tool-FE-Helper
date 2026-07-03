<?php
// ============================================================
// Clone Banner UI
// Run: php -S localhost:8080
// ============================================================

$baseDir = __DIR__;

// ---- Handle AJAX: Clone Size ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'clone') {
    header('Content-Type: application/json');

    $sourceFolder = trim($_POST['source'] ?? '');
    $newSizesRaw = trim($_POST['sizes'] ?? '');

    if (!$sourceFolder || !$newSizesRaw) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
        exit;
    }

    $sourcePath = $baseDir . '/' . $sourceFolder;
    if (!is_dir($sourcePath)) {
        echo json_encode(['success' => false, 'message' => "Source folder not found: $sourceFolder"]);
        exit;
    }

    if (!preg_match('/(\d+x\d+)/', $sourceFolder, $matches)) {
        echo json_encode(['success' => false, 'message' => "Could not find size pattern in '$sourceFolder'."]);
        exit;
    }

    $oldSize = $matches[1];
    list($oldWidth, $oldHeight) = explode('x', $oldSize);
    $newSizes = preg_split('/[\s,]+/', $newSizesRaw, -1, PREG_SPLIT_NO_EMPTY);
    $results = [];

    foreach ($newSizes as $newSize) {
        $newSize = trim($newSize);
        if (!preg_match('/^\d+x\d+$/', $newSize)) {
            $results[] = ['size' => $newSize, 'status' => 'error', 'message' => 'Invalid format'];
            continue;
        }
        list($newWidth, $newHeight) = explode('x', $newSize);
        $destFolderName = str_replace($oldSize, $newSize, $sourceFolder);
        $destPath = $baseDir . '/' . $destFolderName;

        try {
            if (is_dir($destPath)) deleteFolder($destPath);
            mkdir($destPath, 0755, true);
            copyAndReplace($sourcePath, $destPath, $oldSize, $newSize, $oldWidth, $oldHeight, $newWidth, $newHeight);
            $results[] = ['size' => $newSize, 'folder' => $destFolderName, 'status' => 'success'];
        } catch (Exception $e) {
            $results[] = ['size' => $newSize, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    echo json_encode(['success' => true, 'results' => $results]);
    exit;
}

// ---- Handle AJAX: Preview Duplicate ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'preview_duplicate') {
    header('Content-Type: application/json');

    $sourceFolder = trim($_POST['source'] ?? '');
    $findText = $_POST['find'] ?? '';

    if (!$sourceFolder || $findText === '') {
        echo json_encode(['files' => []]);
        exit;
    }

    $sourcePath = $baseDir . '/' . $sourceFolder;
    if (!is_dir($sourcePath)) {
        echo json_encode(['files' => []]);
        exit;
    }

    $textExtensions = ['html', 'htm', 'json', 'xml', 'svg', 'txt'];
    $matchedFiles = [];
    scanForMatches($sourcePath, $sourcePath, $findText, $textExtensions, $matchedFiles);
    echo json_encode(['files' => $matchedFiles]);
    exit;
}

function scanForMatches($base, $dir, $find, $textExtensions, &$results) {
    $items = scandir($dir);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            if (strpos($item, 'gwd_preview_') === 0) continue;
            scanForMatches($base, $path, $find, $textExtensions, $results);
        } else {
            $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
            $isTextFile = in_array($ext, $textExtensions);
            $nameMatch = $isTextFile && stripos($item, $find) !== false;
            $contentMatch = false;
            if ($isTextFile) {
                $content = file_get_contents($path);
                $contentMatch = stripos($content, $find) !== false;
            }
            if ($nameMatch || $contentMatch) {
                $relativePath = substr($path, strlen($base) + 1);
                $results[] = [
                    'file' => $relativePath,
                    'name' => $nameMatch,
                    'content' => $contentMatch,
                ];
            }
        }
    }
}

// ---- Handle AJAX: Duplicate Version ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'duplicate') {
    header('Content-Type: application/json');

    $sourceFolder = trim($_POST['source'] ?? '');
    $destFolder = trim($_POST['dest'] ?? '');
    $findText = $_POST['find'] ?? '';
    $replaceText = $_POST['replace'] ?? '';

    if (!$sourceFolder || !$destFolder) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
        exit;
    }

    $sourcePath = $baseDir . '/' . $sourceFolder;
    if (!is_dir($sourcePath)) {
        echo json_encode(['success' => false, 'message' => "Source folder not found: $sourceFolder"]);
        exit;
    }

    $destPath = $baseDir . '/' . $destFolder;

    try {
        if (is_dir($destPath)) deleteFolder($destPath);
        mkdir($destPath, 0755, true);
        copyAndRenameOnly($sourcePath, $destPath, $findText, $replaceText);
        echo json_encode(['success' => true, 'folder' => $destFolder]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

// ---- Helper functions ----

function deleteFolder($folder) {
    $items = array_diff(scandir($folder), ['.', '..']);
    foreach ($items as $item) {
        $itemPath = $folder . DIRECTORY_SEPARATOR . $item;
        is_dir($itemPath) ? deleteFolder($itemPath) : unlink($itemPath);
    }
    rmdir($folder);
}

function copyAndReplace($source, $destination, $oldSize, $newSize, $oldWidth, $oldHeight, $newWidth, $newHeight) {
    $items = scandir($source);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $sourcePath = $source . DIRECTORY_SEPARATOR . $item;
        $destinationPath = $destination . DIRECTORY_SEPARATOR . str_replace($oldSize, $newSize, $item);

        if (is_dir($sourcePath)) {
            mkdir($destinationPath, 0755, true);
            copyAndReplace($sourcePath, $destinationPath, $oldSize, $newSize, $oldWidth, $oldHeight, $newWidth, $newHeight);
        } else {
            $content = file_get_contents($sourcePath);
            $content = str_replace($oldSize, $newSize, $content);
            $content = str_replace("width: {$oldWidth}px;", "width: {$newWidth}px;", $content);
            $content = str_replace("height: {$oldHeight}px;", "height: {$newHeight}px;", $content);
            $content = str_replace("data-gwd-width=\"{$oldWidth}px\"", "data-gwd-width=\"{$newWidth}px\"", $content);
            $content = str_replace("data-gwd-height=\"{$oldHeight}px\"", "data-gwd-height=\"{$newHeight}px\"", $content);
            $content = str_replace("minWidth\":{$oldWidth}", "minWidth\":{$newWidth}", $content);
            $content = str_replace("minHeight\":{$oldHeight}", "minHeight\":{$newHeight}", $content);
            $content = str_replace("maxWidth\":{$oldWidth}", "maxWidth\":{$newWidth}", $content);
            $content = str_replace("maxHeight\":{$oldHeight}", "maxHeight\":{$newHeight}", $content);
            $content = str_replace("\"viewport.width\":{$oldWidth}", "\"viewport.width\":{$newWidth}", $content);
            $content = str_replace("\"viewport.height\":{$oldHeight}", "\"viewport.height\":{$newHeight}", $content);
            $content = str_replace("width={$oldWidth},height={$oldHeight}", "width={$newWidth},height={$newHeight}", $content);
            file_put_contents($destinationPath, $content);
        }
    }
}

function copyAndRenameOnly($source, $destination, $find, $replace) {
    $items = scandir($source);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $sourcePath = $source . DIRECTORY_SEPARATOR . $item;
        $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
        $textExtensions = ['html', 'htm', 'json', 'xml', 'svg', 'txt'];
        $isTextFile = !is_dir($sourcePath) && in_array($ext, $textExtensions);
        $newName = ($find !== '' && (is_dir($sourcePath) || $isTextFile)) ? str_ireplace($find, $replace, $item) : $item;
        $destinationPath = $destination . DIRECTORY_SEPARATOR . $newName;

        if (is_dir($sourcePath)) {
            if (strpos($item, 'gwd_preview_') === 0) {
                // Copy gwd_preview_* folder as-is, no rename/replace
                mkdir($destinationPath, 0755, true);
                copyAndRenameOnly($sourcePath, $destinationPath, '', '');
            } else {
                mkdir($destinationPath, 0755, true);
                copyAndRenameOnly($sourcePath, $destinationPath, $find, $replace);
            }
        } else {
            if ($find !== '' && in_array($ext, $textExtensions)) {
                $content = file_get_contents($sourcePath);
                $content = str_ireplace($find, $replace, $content);
                file_put_contents($destinationPath, $content);
            } else {
                copy($sourcePath, $destinationPath);
            }
        }
    }
}

// ---- Scan folders ----
$folders = [];
if (is_dir($baseDir)) {
    $items = array_diff(scandir($baseDir), ['.', '..']);
    foreach ($items as $item) {
        if (is_dir($baseDir . '/' . $item)) {
            $folders[] = $item;
        }
    }
}
sort($folders);
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clone Banner</title>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 32px; width: 100%; max-width: 480px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #1a1a1a; }
    .subtitle { font-size: 13px; color: #888; margin-bottom: 20px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
    select, input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    select:focus, input:focus { border-color: #4a90d9; }
    .field { margin-bottom: 16px; }
    .hint { font-size: 12px; color: #999; margin-top: 4px; }
    .detected { font-size: 12px; color: #4a90d9; margin-top: 4px; font-weight: 500; }
    button { width: 100%; padding: 12px; background: #4a90d9; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #3a7bc8; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .results { margin-top: 20px; }
    .result-item { padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 13px; }
    .result-item.success { background: #e8f5e9; color: #2e7d32; }
    .result-item.error { background: #ffebee; color: #c62828; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .common-sizes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .size-tag { padding: 4px 10px; background: #f0f2f5; border: 1px solid #ddd; border-radius: 16px; font-size: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .size-tag:hover { background: #e3edf7; border-color: #4a90d9; }
    .size-tag.active { background: #4a90d9; color: #fff; border-color: #4a90d9; }

    /* Tabs */
    .tabs { display: flex; gap: 0; margin-bottom: 24px; border-bottom: 2px solid #eee; }
    .tab { padding: 10px 20px; font-size: 14px; font-weight: 600; color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .tab:hover { color: #666; }
    .tab.active { color: #4a90d9; border-bottom-color: #4a90d9; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Rename preview */
    .rename-preview { margin-top: 8px; padding: 10px 12px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
    .rename-preview .old { text-decoration: line-through; color: #999; }
    .rename-preview .new { color: #2e7d32; font-weight: 600; }
    .rename-preview .arrow { margin: 0 6px; color: #bbb; }

    .row { display: flex; gap: 12px; }
    .row .field { flex: 1; }
</style>
</head>
<body>
<div class="container">
    <h1>Clone Banner</h1>
    <p class="subtitle"><?= htmlspecialchars(basename($baseDir)) ?></p>

    <div class="tabs">
        <div class="tab active" data-tab="clone">Clone Size</div>
        <div class="tab" data-tab="duplicate">Duplicate Version</div>
    </div>

    <!-- Tab 1: Clone Size -->
    <div class="tab-content active" id="tab-clone">
        <form id="cloneForm">
            <div class="field">
                <label>Source Folder</label>
                <select id="source" name="source">
                    <option value="">-- Select --</option>
                    <?php foreach ($folders as $f): ?>
                    <option value="<?= htmlspecialchars($f) ?>"><?= htmlspecialchars($f) ?></option>
                    <?php endforeach; ?>
                </select>
                <div id="detectedSize" class="detected" style="display:none"></div>
            </div>

            <div class="field">
                <label>Target Sizes</label>
                <input type="text" id="sizes" name="sizes" placeholder="e.g. 300x250 160x600 970x250">
                <p class="hint">Separate by space or comma</p>
                <div class="common-sizes" id="commonSizes">
                    <span class="size-tag" data-size="300x250">300x250</span>
                    <span class="size-tag" data-size="160x600">160x600</span>
                    <span class="size-tag" data-size="728x90">728x90</span>
                    <span class="size-tag" data-size="970x250">970x250</span>
                    <span class="size-tag" data-size="300x600">300x600</span>
                    <span class="size-tag" data-size="320x50">320x50</span>
                    <span class="size-tag" data-size="320x100">320x100</span>
                    <span class="size-tag" data-size="336x280">336x280</span>
                    <span class="size-tag" data-size="250x250">250x250</span>
                    <span class="size-tag" data-size="200x200">200x200</span>
                </div>
            </div>

            <button type="submit" id="cloneBtn">Clone</button>
        </form>
        <div class="results" id="cloneResults"></div>
    </div>

    <!-- Tab 2: Duplicate Version -->
    <div class="tab-content" id="tab-duplicate">
        <form id="dupForm">
            <div class="field">
                <label>Source Folder</label>
                <select id="dupSource">
                    <option value="">-- Select --</option>
                    <?php foreach ($folders as $f): ?>
                    <option value="<?= htmlspecialchars($f) ?>"><?= htmlspecialchars($f) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="row">
                <div class="field">
                    <label>Find</label>
                    <input type="text" id="dupFind" placeholder="e.g. V1">
                </div>
                <div class="field">
                    <label>Replace with</label>
                    <input type="text" id="dupReplace" placeholder="e.g. V2">
                </div>
            </div>

            <div class="field">
                <label>Destination Folder</label>
                <input type="text" id="dupDest" readonly style="background: #f8f9fa; color: #555;">
            </div>

            <div id="renamePreview" class="rename-preview" style="display:none"></div>

            <button type="submit" id="dupBtn" style="margin-top: 16px">Duplicate</button>
        </form>
        <div class="results" id="dupResults"></div>
    </div>
</div>

<script>
// ---- Tabs ----
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ---- Tab 1: Clone Size ----
const sourceEl = document.getElementById('source');
const sizesEl = document.getElementById('sizes');
const detectedEl = document.getElementById('detectedSize');
const cloneResults = document.getElementById('cloneResults');
const cloneBtn = document.getElementById('cloneBtn');

sourceEl.addEventListener('change', function() {
    const match = this.value.match(/(\d+x\d+)/);
    if (match) {
        detectedEl.textContent = 'Detected size: ' + match[1];
        detectedEl.style.display = 'block';
        document.querySelectorAll('.size-tag').forEach(tag => {
            tag.style.display = tag.dataset.size === match[1] ? 'none' : '';
            tag.classList.remove('active');
        });
        sizesEl.value = '';
    } else {
        detectedEl.style.display = 'none';
    }
});

document.getElementById('commonSizes').addEventListener('click', function(e) {
    if (!e.target.classList.contains('size-tag')) return;
    e.target.classList.toggle('active');
    const activeSizes = [];
    document.querySelectorAll('.size-tag.active').forEach(tag => activeSizes.push(tag.dataset.size));
    sizesEl.value = activeSizes.join(' ');
});

sizesEl.addEventListener('input', function() {
    const typed = this.value.split(/[\s,]+/).filter(Boolean);
    document.querySelectorAll('.size-tag').forEach(tag => {
        tag.classList.toggle('active', typed.includes(tag.dataset.size));
    });
});

document.getElementById('cloneForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    cloneBtn.disabled = true;
    cloneBtn.innerHTML = '<span class="spinner"></span>Cloning...';
    cloneResults.innerHTML = '';

    const formData = new FormData();
    formData.append('action', 'clone');
    formData.append('source', sourceEl.value);
    formData.append('sizes', sizesEl.value);

    try {
        const res = await fetch('', { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.success) {
            cloneResults.innerHTML = '<div class="result-item error">' + data.message + '</div>';
        } else {
            let html = '';
            data.results.forEach(r => {
                html += r.status === 'success'
                    ? '<div class="result-item success">' + r.folder + '</div>'
                    : '<div class="result-item error">' + r.size + ': ' + r.message + '</div>';
            });
            cloneResults.innerHTML = html;
        }
    } catch (err) {
        cloneResults.innerHTML = '<div class="result-item error">Request failed: ' + err.message + '</div>';
    }
    cloneBtn.disabled = false;
    cloneBtn.textContent = 'Clone';
});

// ---- Tab 2: Duplicate Version ----
const dupSource = document.getElementById('dupSource');
const dupFind = document.getElementById('dupFind');
const dupReplace = document.getElementById('dupReplace');
const dupBtn = document.getElementById('dupBtn');
const dupResults = document.getElementById('dupResults');
const renamePreview = document.getElementById('renamePreview');

// Update preview on any change
[dupFind, dupReplace].forEach(el => el.addEventListener('input', updateRenamePreview));
dupSource.addEventListener('change', function() {
    document.getElementById('dupDest').value = this.value;
    // Auto-detect version prefix (e.g. v1, V2) from folder name
    const versionMatch = this.value.match(/^(v\d+)/i);
    if (versionMatch && !dupFind.value) {
        dupFind.value = versionMatch[1];
    }
    updateRenamePreview();
});

function updateRenamePreview() {
    const src = dupSource.value;
    const find = dupFind.value;
    const replace = dupReplace.value;

    if (!src || !replace) {
        document.getElementById('dupDest').value = src;
        renamePreview.style.display = 'none';
        return;
    }

    let destFolder;
    if (find) {
        const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        destFolder = src.replace(re, replace);
    } else {
        // No find text → replace prefix before size pattern
        const sizeMatch = src.match(/(\d+x\d+)/);
        if (sizeMatch) {
            const idx = src.indexOf(sizeMatch[1]);
            const prefix = src.substring(0, idx);
            const suffix = src.substring(idx + sizeMatch[1].length);
            if (prefix) {
                const sep = prefix.slice(-1); // separator: _ - space etc.
                destFolder = replace + sep + sizeMatch[1] + suffix;
            } else {
                destFolder = replace + '_' + sizeMatch[1] + suffix;
            }
        } else {
            destFolder = replace + '_' + src;
        }
    }
    document.getElementById('dupDest').value = destFolder;

    let previewHtml = '<b>Folder:</b> <span class="old">' + src + '</span><span class="arrow">&rarr;</span><span class="new">' + destFolder + '</span>';

    if (find) {
        previewHtml += '<br><b>Replace:</b> <span class="old">' + find + '</span><span class="arrow">&rarr;</span><span class="new">' + replace + '</span>';
        previewHtml += '<br><div class="file-list-loading" style="font-size:12px;color:#999;margin-top:4px;">Scanning files...</div>';
    } else {
        previewHtml += '<br><b>Filenames:</b> no change';
        previewHtml += '<br><b>File contents:</b> no change';
    }
    renamePreview.innerHTML = previewHtml;
    renamePreview.style.display = 'block';

    // Fetch matched files from backend
    if (find) {
        const formData = new FormData();
        formData.append('action', 'preview_duplicate');
        formData.append('source', src);
        formData.append('find', find);
        fetch('', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                const loadingEl = renamePreview.querySelector('.file-list-loading');
                if (!loadingEl) return;
                if (data.files.length === 0) {
                    loadingEl.innerHTML = '<span style="color:#999;">No matching files found.</span>';
                    return;
                }
                const re = new RegExp('(' + find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                let html = '<b>Affected files:</b><ul style="margin:4px 0 0 16px;padding:0;list-style:none;">';
                data.files.forEach(f => {
                    const details = [];
                    if (f.name) {
                        const newName = f.file.replace(re, replace);
                        details.push('<span class="old">' + f.file + '</span><span class="arrow">&rarr;</span><span class="new">' + newName + '</span>');
                    } else {
                        details.push(f.file);
                    }
                    if (f.content) details.push('<span style="color:#4a90d9;">content replaced</span>');
                    html += '<li style="font-size:12px;margin-bottom:3px;">' + details.join(' · ') + '</li>';
                });
                html += '</ul>';
                loadingEl.innerHTML = html;
            });
    }
}

document.getElementById('dupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const find = dupFind.value;
    const replace = dupReplace.value;
    if (!dupSource.value || !replace) {
        dupResults.innerHTML = '<div class="result-item error">Please select source and fill in Replace field.</div>';
        return;
    }

    const dest = document.getElementById('dupDest').value;

    dupBtn.disabled = true;
    dupBtn.innerHTML = '<span class="spinner"></span>Duplicating...';
    dupResults.innerHTML = '';

    const formData = new FormData();
    formData.append('action', 'duplicate');
    formData.append('source', dupSource.value);
    formData.append('dest', dest);
    formData.append('find', find);
    formData.append('replace', dupReplace.value);

    try {
        const res = await fetch('', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            dupResults.innerHTML = '<div class="result-item success">' + data.folder + '</div>';
        } else {
            dupResults.innerHTML = '<div class="result-item error">' + data.message + '</div>';
        }
    } catch (err) {
        dupResults.innerHTML = '<div class="result-item error">Request failed: ' + err.message + '</div>';
    }
    dupBtn.disabled = false;
    dupBtn.textContent = 'Duplicate';
});
</script>
</body>
</html>
