const fs = require('fs');
const path = require('path');

// File paths
const htmlPath = path.join(__dirname, 'Plugin-check-design-Figma/ui.html');
const cssPath = path.join(__dirname, 'Plugin-check-design-Figma/styles.css');
const jsPath = path.join(__dirname, 'Plugin-check-design-Figma/ui.js');

// Read files
console.log('📖 Reading files...');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');

// Remove unnecessary lines
console.log('🧹 Removing unnecessary lines...');
const lines = htmlContent.split('\n');
let removedCount = 0;
const cleanedLines = lines.filter(line => {
  const trimmed = line.trim();
  if (trimmed.includes('<script src="http://127.0.0.1:8080') || 
      trimmed.includes('<link rel="stylesheet" href="http://127.0.0.1:8080') ||
      trimmed.includes('<script src="ui.js"></script>') ||
      trimmed.includes('<link rel="stylesheet" href="styles.css">')) {
    removedCount++;
    return false;
  }
  return true;
});

if (removedCount > 0) {
  htmlContent = cleanedLines.join('\n');
  console.log(`   ✅ Removed ${removedCount} unnecessary line(s)`);
} else {
  console.log('   ℹ️  No lines found to remove');
}

// Find and replace content after comment "<!-- Import styles -->"
const stylesMarker = '<!-- Import styles -->';
const stylesIndex = htmlContent.indexOf(stylesMarker);

if (stylesIndex === -1) {
  console.error('❌ Comment "<!-- Import styles -->" not found in HTML file');
  process.exit(1);
}

// Find the end position of the line containing styles comment
const stylesLineEnd = htmlContent.indexOf('\n', stylesIndex);
if (stylesLineEnd === -1) {
  console.error('❌ End of line after styles comment not found');
  process.exit(1);
}

// Create CSS content with <style> tag and appropriate indentation
const stylesInjection = `  <style>\n${cssContent.split('\n').map(line => '    ' + line).join('\n')}\n  </style>\n`;

// Find and replace content after comment "<!-- import script -->"
const scriptMarker = '<!-- import script -->';
const scriptIndex = htmlContent.indexOf(scriptMarker);

if (scriptIndex === -1) {
  console.error('❌ Comment "<!-- import script -->" not found in HTML file');
  process.exit(1);
}

// Find the end position of the line containing script comment
const scriptLineEnd = htmlContent.indexOf('\n', scriptIndex);
if (scriptLineEnd === -1) {
  console.error('❌ End of line after script comment not found');
  process.exit(1);
}

// Create JS content with <script> tag and appropriate indentation
const scriptInjection = `  <script>\n${jsContent.split('\n').map(line => '    ' + line).join('\n')}\n  </script>\n`;

// Rebuild HTML content
// Split HTML into 3 parts: before styles, between styles and script, after script
const beforeStyles = htmlContent.substring(0, stylesLineEnd + 1);
const betweenStylesAndScript = htmlContent.substring(stylesLineEnd + 1, scriptLineEnd + 1);
const afterScript = htmlContent.substring(scriptLineEnd + 1);

// Join back with injected content
const newHtmlContent = beforeStyles + stylesInjection + betweenStylesAndScript + scriptInjection + afterScript;

// Write HTML file back
console.log('💾 Writing HTML file...');
fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');

console.log('✅ HTML file updated successfully!');
console.log(`   - Injected ${cssContent.split('\n').length} CSS line(s)`);
console.log(`   - Injected ${jsContent.split('\n').length} JavaScript line(s)`);
console.log(`\n📄 File updated: ${htmlPath}`);

