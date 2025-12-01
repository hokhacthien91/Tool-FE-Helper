#!/usr/bin/env node
/* eslint-disable */
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

// ==== CONFIG (có thể chỉnh) ====
const ORIGIN_ROOT = "/Users/thien.ho/Projects/mg-aemaacs-investments-frontend-07-2025/mandg-investments";
const DEST_ROOT   = "/Users/thien.ho/Projects/aemaacs-investments-azure-2/mandg-investments";

// Danh sách path theo yêu cầu (coi mục {name}; với thư mục không dùng /*)
const PATTERNS = [
  "ui.frontend/src/html/components/{name}.hbs",
  "ui.frontend/src/html/components/{name}",
  "ui.frontend/src/html/data/{name}.js",
  "ui.frontend/src/html/data/{name}s.js",
  "ui.frontend/src/html/data/components/{name}.js",
  "ui.frontend/src/main/webpack/js/react/search/appsRenderers/{name}.tsx",
  "ui.frontend/src/html/data/components/{name}",                 // folder
  "ui.frontend/src/html/templates/{name}.hbs",
  "ui.frontend/src/html/templates/{name}-component.hbs",
  "ui.frontend/src/html/templates/{name}-insights-listing.hbs",
  "ui.frontend/src/html/templates/{name}-experiencefragment.hbs",
  "ui.frontend/src/html/templates/{name}-with-bg-image.hbs",
  "ui.frontend/src/html/templates/{name}-with-ampersand-default.hbs",
  "ui.frontend/src/html/sections/section-{name}",                // folder
  "ui.frontend/src/main/webpack/resources/images/{name}",        // folder
  "ui.frontend/src/main/webpack/js/base/6-components/{name}",    // folder
  "ui.frontend/src/main/webpack/js/react/search/views/{name}",    // folder
  "ui.frontend/src/main/webpack/js/react/search/views/{name}Dynamic",    // folder
  // "ui.frontend/src/main/webpack/js/react/search/mocks/",    // folder
  "ui.frontend/src/main/webpack/js/react/search/views/{name}New",    // folder
  "ui.frontend/src/main/webpack/js/react/{name}",    // folder
  "ui.frontend/src/main/webpack/scss/base/6-components/{name}",  // folder
  "ui.frontend/src/main/webpack/scss/infracapital/6-components/{name}", // folder
  "ui.frontend/src/main/webpack/scss/mg-investments/6-components/{name}" // folder
];
// ==== Helpers tên ====
const toCamelCase = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const toPascalCase = s => {
  const c = toCamelCase(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

// Validate kebab-case format
function isValidKebabCase(str) {
  // Chỉ chấp nhận: chữ thường, số, dấu gạch ngang
  // Không bắt đầu/kết thúc bằng dấu gạch ngang
  // Không có hai dấu gạch ngang liền nhau
  const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return kebabCaseRegex.test(str);
}

// Áp dụng biến thể tên tại các path JS được nêu
function isVariantPath(relPath) {
  return (
    relPath.includes("ui.frontend/src/html/data/") ||
    relPath.includes("ui.frontend/src/html/data/components/") ||
    relPath.includes("ui.frontend/src/main/webpack/js/base/6-components/") ||
    relPath.includes("ui.frontend/src/main/webpack/js/react/search/appsRenderers/") ||
    relPath.includes("ui.frontend/src/main/webpack/js/react/search/views/")
  );
}

// Folder hay file? (dựa theo phần extension của {name}. Nếu không có ext -> folder)
function isDirectoryPattern(relPath) {
  // nếu pattern có .ext sau {name} thì là file
  // còn lại coi là folder
  return path.extname(relPath.replace("{name}", "placeholder")) === "";
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

function syncComponent(inputName) {
  const variants = [inputName, toCamelCase(inputName), toPascalCase(inputName)];

  for (const pattern of PATTERNS) {
    const treatAsDir = isDirectoryPattern(pattern);

    if (isVariantPath(pattern)) {
      // Kiểm cả 3 biến thể để dest không giữ lại biến thể thừa
      for (const v of variants) {
        const rel = pattern.replace(/{name}/g, v);
        const src = path.join(ORIGIN_ROOT, rel);
        const dst = path.join(DEST_ROOT, rel);
        syncPath(src, dst, treatAsDir);
      }
    } else {
      // Các path khác giữ nguyên tên input (kebab-case)
      const rel = pattern.replace(/{name}/g, inputName);
      const src = path.join(ORIGIN_ROOT, rel);
      const dst = path.join(DEST_ROOT, rel);
      syncPath(src, dst, treatAsDir);
    }
  }
}

// ==== Auto Import Functions ====

// Định nghĩa các file import và patterns
const IMPORT_FILES = [
  {
    file: "ui.frontend/src/main/webpack/scss/base/6-components/components-imports.scss",
    pattern: (name) => `@use '${name}/${name}-imports';`,
    checkFile: (name) => `ui.frontend/src/main/webpack/scss/base/6-components/${name}/${name}-imports.scss`
  },
  {
    file: "ui.frontend/src/main/webpack/scss/base/6-components/components-print-imports.scss", 
    pattern: (name) => `@use '${name}/${name}.print';`,
    checkFile: (name) => `ui.frontend/src/main/webpack/scss/base/6-components/${name}/_${name}.print.scss`
  },
  {
    file: "ui.frontend/src/main/webpack/scss/infracapital/6-components/components-settings-imports.scss",
    pattern: (name) => `@use '${name}/${name}.settings';`,
    checkFile: (name) => `ui.frontend/src/main/webpack/scss/infracapital/6-components/${name}/_${name}.settings.scss`
  },
  {
    file: "ui.frontend/src/main/webpack/scss/mg-investments/6-components/components-settings-imports.scss",
    pattern: (name) => `@use '${name}/${name}.settings';`, 
    checkFile: (name) => `ui.frontend/src/main/webpack/scss/mg-investments/6-components/${name}/_${name}.settings.scss`
  },
  {
    file: "ui.frontend/src/main/webpack/js/base/index.ts",
    pattern: (name, actualFolderName) => `import './6-components/${actualFolderName || name}';`,
    checkFile: (name) => null, // Will be handled specially
    isJS: true
  }
];

// Helper function để tìm folder name thực tế của JS component
function findJSComponentFolder(componentName) {
  const jsComponentsDir = path.join(DEST_ROOT, "ui.frontend/src/main/webpack/js/base/6-components");
  
  if (!fs.existsSync(jsComponentsDir)) {
    return null;
  }
  
  const variants = [componentName, toCamelCase(componentName), toPascalCase(componentName)];
  
  for (const variant of variants) {
    const folderPath = path.join(jsComponentsDir, variant);
    const indexPath = path.join(folderPath, "index.ts");
    
    if (fs.existsSync(indexPath)) {
      return variant;
    }
  }
  
  return null;
}

function checkAndAddImport(componentName) {
  for (const importConfig of IMPORT_FILES) {
    const importFilePath = path.join(DEST_ROOT, importConfig.file);
    
    // Check xem import file có tồn tại không
    if (!fs.existsSync(importFilePath)) {
      console.log(`⚪ Skip import: ${importFilePath} (import file not found)`);
      continue;
    }
    
    let componentFilePath = null;
    let actualFolderName = null;
    let importStatement = null;
    
    // Handle JS import đặc biệt
    if (importConfig.isJS) {
      actualFolderName = findJSComponentFolder(componentName);
      if (!actualFolderName) {
        console.log(`⚪ Skip import: ${importConfig.file} (JS component folder not found)`);
        continue;
      }
      
      componentFilePath = path.join(DEST_ROOT, `ui.frontend/src/main/webpack/js/base/6-components/${actualFolderName}/index.ts`);
      importStatement = importConfig.pattern(componentName, actualFolderName);
    } else {
      // Handle SCSS imports
      componentFilePath = path.join(DEST_ROOT, importConfig.checkFile(componentName));
      importStatement = importConfig.pattern(componentName);
      
      // Check xem component file có tồn tại không
      if (!fs.existsSync(componentFilePath)) {
        console.log(`⚪ Skip import: ${importConfig.file} (component file not found: ${componentFilePath})`);
        continue;
      }
    }
    
    // Đọc nội dung file import
    const importContent = fs.readFileSync(importFilePath, 'utf8');
    
    // Check xem import đã tồn tại chưa
    if (importContent.includes(importStatement)) {
      console.log(`✅ Import already exists: ${importFilePath}`);
      continue;
    }
    
    // Thêm import statement
    const trimmedContent = importContent.trim();
    const newContent = trimmedContent === '' 
      ? importStatement + '\n'  // File trống: import ở dòng đầu
      : trimmedContent + '\n' + importStatement + '\n';  // File có nội dung: thêm vào cuối
    fs.writeFileSync(importFilePath, newContent, 'utf8');
    console.log(`🆕 Added import: ${importFilePath}`);
    console.log(`   → ${importStatement}`);
    
    if (actualFolderName && actualFolderName !== componentName) {
      console.log(`   📁 Found JS folder: ${actualFolderName} (from input: ${componentName})`);
    }
  }
}

// ==== Run ====
const compName = process.argv[2];
if (!compName) {
  console.error("Usage: node sync-component.js <component-name>");
  console.error("Component name phải là kebab-case (ví dụ: 'list-of-links')");
  process.exit(1);
}

// Validate kebab-case format
if (!isValidKebabCase(compName)) {
  console.error(`❌ Lỗi: Component name "${compName}" không đúng format kebab-case!`);
  console.error("✅ Format đúng: kebab-case (chữ thường, phân cách bằng dấu gạch ngang)");
  console.error("✅ Ví dụ đúng: 'list-of-links', 'my-component', 'hero-banner'");
  console.error("❌ Ví dụ sai: 'List-Of-links', 'listof-links', 'ListOf-links', 'my_component', 'MyComponent'");
  console.error("\n💡 Vui lòng nhập lại component name đúng format kebab-case!");
  process.exit(1);
}

console.log(`\n🔄 Syncing component: ${compName}`);
syncComponent(compName);

console.log(`\n📝 Checking and adding imports for: ${compName}`);
checkAndAddImport(compName);

console.log(`\n✅ Done!`);
