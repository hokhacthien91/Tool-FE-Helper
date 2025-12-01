#!/usr/bin/env node
/* eslint-disable */
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

// ==== CONFIG (có thể chỉnh) ====
const ORIGIN_ROOT = "/Users/thien.ho/Projects/mg-aemaacs-investments-frontend-07-2025/mandg-investments";
const DEST_ROOT   = "/Users/thien.ho/Projects/aemaacs-investments-azure-2/mandg-investments";

// Danh sách các path cần sync
const SYNC_PATHS = [
  "ui.frontend/.toolkit",
  "ui.frontend/jest",
  "ui.frontend/style-dictionary",
  "ui.frontend/.eslintrc",
  "ui.frontend/.gitignore",
  "ui.frontend/.npmignore",
  "ui.frontend/.nvmrc",
  "ui.frontend/.prettierignore",
  "ui.frontend/.prettierrc",
  "ui.frontend/.stylelintrc.js",
  "ui.frontend/babel.config.js",
  "ui.frontend/clientlib.config.js",
  "ui.frontend/custom.d.ts",
  "ui.frontend/jest.config.js",
  "ui.frontend/package.json",
  "ui.frontend/README.md",
  "ui.frontend/tsconfig.json",
  "ui.frontend/webpack.common.js",
  "ui.frontend/webpack.dev.js",
  "ui.frontend/webpack.prod.js",
  "ui.frontend/webpack.theme.config.js",
  "ui.frontend/src/html/layout/asset-nav-pin.hbs",
  // "ui.frontend/src/html/layout/head.hbs",
  "ui.frontend/src/html/layout/no-script.hbs",
  // "ui.frontend/src/html/layout/script.hbs",
  "ui.frontend/src/html/utilities",
  "ui.frontend/src/main/webpack/resources/AEM-core-static",
  "ui.frontend/src/main/webpack/resources/document",
  "ui.frontend/src/main/webpack/resources/fonts",
  "ui.frontend/src/main/webpack/resources/icons",
  "ui.frontend/src/main/webpack/resources/static",
  "ui.frontend/src/main/webpack/resources/videos",
  "ui.frontend/src/main/webpack/scss/base/1-settings",
  "ui.frontend/src/main/webpack/scss/base/2-tools",
  "ui.frontend/src/main/webpack/scss/base/3-generics",
  "ui.frontend/src/main/webpack/scss/base/4-elements",
  "ui.frontend/src/main/webpack/scss/base/5-objects",
  "ui.frontend/src/main/webpack/scss/base/7-utilities",
  "ui.frontend/src/main/webpack/scss/infracapital/1-settings",
  "ui.frontend/src/main/webpack/scss/infracapital/4-elements",
  "ui.frontend/src/main/webpack/scss/infracapital/7-utilities",
  "ui.frontend/src/main/webpack/scss/mg-investments/1-settings",
  "ui.frontend/src/main/webpack/site",
  "ui.frontend/src/main/webpack/static",
  "ui.frontend/src/main/webpack/js/base/1-settings",
  "ui.frontend/src/main/webpack/js/base/3-generics",
  "ui.frontend/src/main/webpack/js/base/7-utilities",
  "ui.frontend/src/main/webpack/js/types",
  "ui.frontend/src/main/webpack/js/react/base",
  "ui.frontend/src/main/webpack/js/react/search",
  "ui.frontend/src/main/webpack/js/react/types",
];

// Danh sách các thư mục (những cái còn lại là files)
const DIRECTORIES = [
  "ui.frontend/.toolkit",
  "ui.frontend/jest",
  "ui.frontend/style-dictionary",
  "ui.frontend/src/html/utilities",
  "ui.frontend/src/main/webpack/resources/AEM-core-static",
  "ui.frontend/src/main/webpack/resources/document",
  "ui.frontend/src/main/webpack/resources/fonts",
  "ui.frontend/src/main/webpack/resources/icons",
  "ui.frontend/src/main/webpack/resources/static",
  "ui.frontend/src/main/webpack/resources/videos",
  "ui.frontend/src/main/webpack/scss/base/1-settings",
  "ui.frontend/src/main/webpack/scss/base/2-tools",
  "ui.frontend/src/main/webpack/scss/base/3-generics",
  "ui.frontend/src/main/webpack/scss/base/4-elements",
  "ui.frontend/src/main/webpack/scss/base/5-objects",
  "ui.frontend/src/main/webpack/scss/base/7-utilities",
  "ui.frontend/src/main/webpack/scss/infracapital/1-settings",
  "ui.frontend/src/main/webpack/scss/infracapital/4-elements",
  "ui.frontend/src/main/webpack/scss/infracapital/7-utilities",
  "ui.frontend/src/main/webpack/scss/mg-investments/1-settings",
  "ui.frontend/src/main/webpack/site",
  "ui.frontend/src/main/webpack/static",
  "ui.frontend/src/main/webpack/js/base/1-settings",
  "ui.frontend/src/main/webpack/js/base/3-generics",
  "ui.frontend/src/main/webpack/js/base/7-utilities",
  "ui.frontend/src/main/webpack/js/types",
  // "ui.frontend/src/main/webpack/js/react/base",
  // "ui.frontend/src/main/webpack/js/react/search",
  // "ui.frontend/src/main/webpack/js/react/types"
];

// Kiểm tra xem path có phải là thư mục không
function isDirectory(filePath) {
  return DIRECTORIES.includes(filePath);
}

// ==== Core sync ====
function syncFile(src, dst) {
  const srcExists = fs.existsSync(src);
  const dstExists = fs.existsSync(dst);

  if (srcExists) {
    fse.ensureDirSync(path.dirname(dst));
    fse.copySync(src, dst, { overwrite: true, errorOnExist: false });
    console.log(`✅ Copied file: ${dst}`);
  } else if (dstExists) {
    fse.removeSync(dst);
    console.log(`🗑️❌ Removed file (not in origin): ${dst}`);
  } else {
    console.log(`⚪ Skip file (absent in both): ${dst}`);
  }
}

function syncDir(srcDir, dstDir) {
  const srcExists = fs.existsSync(srcDir);
  const dstExists = fs.existsSync(dstDir);

  if (!srcExists) {
    if (dstExists) {
      fse.removeSync(dstDir);
      console.log(`🗑️❌ Removed dir (not in origin): ${dstDir}`);
    } else {
      console.log(`⚪ Skip dir (absent in both): ${dstDir}`);
    }
    return;
  }

  // Bảo đảm thư mục đích tồn tại
  fse.ensureDirSync(dstDir);

  // 1) Copy/Update mọi thứ có trong origin
  const srcEntries = new Set(fs.readdirSync(srcDir));
  for (const entry of srcEntries) {
    const s = path.join(srcDir, entry);
    const d = path.join(dstDir, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      syncDir(s, d);
    } else {
      fse.copySync(s, d, { overwrite: true, errorOnExist: false });
      console.log(`✅ Copied file: ${d}`);
    }
  }

  // 2) Xóa mọi thứ ở dest mà không tồn tại ở origin
  if (fs.existsSync(dstDir)) {
    for (const entry of fs.readdirSync(dstDir)) {
      if (!srcEntries.has(entry)) {
        const d = path.join(dstDir, entry);
        fse.removeSync(d);
        console.log(`🗑️❌ Removed extra in dest: ${d}`);
      }
    }
  }
}

function syncPath(originPath, destPath, isDir) {
  if (isDir) {
    syncDir(originPath, destPath);
  } else {
    syncFile(originPath, destPath);
  }
}

// ==== Sync All Paths ====
function syncAllPaths() {
  console.log(`🔄 Starting sync from: ${ORIGIN_ROOT}`);
  console.log(`🔄 To destination: ${DEST_ROOT}\n`);

  for (const relativePath of SYNC_PATHS) {
    if (!relativePath.trim()) continue; // Skip empty paths
    
    const src = path.join(ORIGIN_ROOT, relativePath);
    const dst = path.join(DEST_ROOT, relativePath);
    const treatAsDir = isDirectory(relativePath);
    
    console.log(`📁 Processing: ${relativePath}`);
    syncPath(src, dst, treatAsDir);
  }
}

// ==== Run ====
console.log("🚀 Starting folder and file sync...\n");
syncAllPaths();
console.log("\n✅ Sync completed!");
