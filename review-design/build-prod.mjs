import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { build as esbuild } from "esbuild";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = ROOT;
const DIST_DIR = path.join(ROOT, "Plugin-check-design-Figma");

const SRC = {
  code: path.join(SRC_DIR, "code.js"),
  uiJsPreferred: path.join(SRC_DIR, "scripts", "main.js"),
  uiJsFallback: path.join(SRC_DIR, "javascript", "main.js"),
  ui: path.join(SRC_DIR, "ui.html"),
  manifest: path.join(SRC_DIR, "manifest.json"),
  scss: path.join(SRC_DIR, "styles", "style.scss")
};

const DIST = {
  code: path.join(DIST_DIR, "code.js"),
  ui: path.join(DIST_DIR, "ui.html"),
  manifest: path.join(DIST_DIR, "manifest.json")
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function writeFile(file, contents) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, contents, "utf8");
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function buildOnce() {
  await ensureDir(DIST_DIR);

  // Bundle plugin main JS
  await esbuild({
    entryPoints: [SRC.code],
    outfile: DIST.code,
    bundle: true,
    minify: true,
    target: ["es2017"],
    format: "iife",
    platform: "browser",
    legalComments: "none"
  });

  // Compile SCSS -> CSS
  let cssContent = "";
  let sassMod = null;
  try {
    sassMod = await import("sass");
  } catch {
    sassMod = null;
  }
  
  if (await fileExists(SRC.scss)) {
    if (sassMod && sassMod.compile) {
      cssContent = sassMod.compile(SRC.scss, {
        style: "compressed",
        loadPaths: [path.join(SRC_DIR, "styles")]
      }).css || "";
    } else {
      process.stdout.write("[build-prod] WARN: sass not installed; CSS will be empty\n");
    }
  }

  // Bundle UI JS
  let jsContent = "";
  let uiEntry = null;
  if (await fileExists(SRC.uiJsPreferred)) uiEntry = SRC.uiJsPreferred;
  else if (await fileExists(SRC.uiJsFallback)) uiEntry = SRC.uiJsFallback;

  if (uiEntry) {
    const uiJsIn = await fs.readFile(uiEntry, "utf8");
    if (uiJsIn.trim().length > 0) {
      // Build JS to a temporary file first, then read it
      const tempJsFile = path.join(DIST_DIR, "ui.temp.js");
      await esbuild({
        entryPoints: [uiEntry],
        outfile: tempJsFile,
        bundle: true,
        minify: true,
        target: ["es2017"],
        format: "iife",
        platform: "browser",
        legalComments: "none"
      });
      jsContent = await fs.readFile(tempJsFile, "utf8");
      // Clean up temp file
      await fs.unlink(tempJsFile);
      
      // Pre-escape problematic patterns in minified code
      // This must be done after minification but before inlining into HTML
      // CRITICAL: Escape </script> first (most critical - will close script tag)
      // Use split/join for guaranteed replacement
      while (jsContent.includes('</script>')) {
        jsContent = jsContent.split('</script>').join('<\\/script>');
      }
      
      // CRITICAL: Escape </body> - must handle ALL variations including </body>&
      // The issue is that even <\/body>& can be problematic
      // Escape </body>& first by replacing & with \x26 (hex escape) to avoid HTML parsing issues
      let bodyCount = 0;
      while (jsContent.includes('</body>&')) {
        bodyCount++;
        // Replace </body>& with <\/body>\x26 (hex escape for &)
        // This prevents HTML parser from seeing </body> followed by &
        jsContent = jsContent.split('</body>&').join('<\\/body>\\x26');
        if (bodyCount > 100) {
          console.error('[build-prod] ERROR: Infinite loop detected while escaping </body>&');
          break;
        }
      }
      // Then escape standalone </body>
      while (jsContent.includes('</body>')) {
        bodyCount++;
        jsContent = jsContent.split('</body>').join('<\\/body>');
        if (bodyCount > 200) {
          console.error('[build-prod] ERROR: Infinite loop detected while escaping </body>');
          break;
        }
      }
      if (bodyCount > 0) {
        console.log(`[build-prod] Escaped ${bodyCount} instances of </body> patterns`);
      }
      
      // Log for debugging
      if (jsContent.includes('</body>') || jsContent.includes('</script>')) {
        console.warn('[build-prod] WARNING: Some problematic patterns may remain after escape');
        console.warn('[build-prod] Remaining </body>:', jsContent.includes('</body>'));
        console.warn('[build-prod] Remaining </script>:', jsContent.includes('</script>'));
      }
    }
  }

  // Read HTML template
  const htmlIn = await fs.readFile(SRC.ui, "utf8");

  // Remove existing CSS links and script tags
  let htmlOut = htmlIn
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "")
    .replace(/<script[^>]*src=["'][^"']*\.css[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script[^>]*src=["'][^"']*ui\.js[^"']*["'][^>]*><\/script>/gi, "")
    .replace(/<script[^>]*src=["'][^"']*http[^"']*["'][^>]*><\/script>/gi, "");

  // Inject CSS into <head>
  if (cssContent) {
    const cssTag = `\n    <style>${cssContent}</style>`;
    if (htmlOut.includes("</head>")) {
      htmlOut = htmlOut.replace("</head>", `${cssTag}\n  </head>`);
    } else if (htmlOut.includes("<head>")) {
      htmlOut = htmlOut.replace("<head>", `<head>${cssTag}`);
    } else {
      // No head tag, add one
      htmlOut = `<head>${cssTag}\n  </head>\n${htmlOut}`;
    }
  }

  // Inject JS before </body>
  // Note: jsContent has already been pre-escaped after minification
  if (jsContent) {
    // Final safety check: ensure all problematic patterns are escaped
    // Use split/join for guaranteed replacement (more reliable than regex)
    let escapedJs = jsContent;
    
    // CRITICAL: Escape </script> - must be done first
    // Loop until all instances are replaced
    let prev = '';
    while (prev !== escapedJs && escapedJs.includes('</script>')) {
      prev = escapedJs;
      escapedJs = escapedJs.split('</script>').join('<\\/script>');
    }
    
    // CRITICAL: Escape </body> - must catch ALL instances including </body>&
    // First escape </body> followed by & (most specific pattern first)
    prev = '';
    while (prev !== escapedJs && escapedJs.includes('</body>&')) {
      prev = escapedJs;
      escapedJs = escapedJs.split('</body>&').join('<\\/body>&');
    }
    // Then escape standalone </body>
    prev = '';
    while (prev !== escapedJs && escapedJs.includes('</body>')) {
      prev = escapedJs;
      escapedJs = escapedJs.split('</body>').join('<\\/body>');
    }
    
    // Verify escape worked
    if (escapedJs.includes('</body>') || escapedJs.includes('</script>')) {
      console.error('[build-prod] ERROR: Failed to escape all problematic patterns!');
      console.error('[build-prod] Remaining </body>:', escapedJs.includes('</body>'));
      console.error('[build-prod] Remaining </script>:', escapedJs.includes('</script>'));
      // Force escape one more time as last resort
      escapedJs = escapedJs.split('</body>').join('<\\/body>');
      escapedJs = escapedJs.split('</script>').join('<\\/script>');
    }
    
    // Use string concatenation instead of template string to avoid any unescaping
    const jsTag = '\n    <script>' + escapedJs + '</script>';
    if (htmlOut.includes("</body>")) {
      htmlOut = htmlOut.replace("</body>", jsTag + '\n  </body>');
    } else {
      // No body tag, append at end
      htmlOut = htmlOut + jsTag;
    }
    
    // Final safety check: escape any remaining </body> or </script> in the final HTML
    // This is a last resort to catch anything that might have been missed
    // Process ALL script tags, not just the first one
    let scriptStart = 0;
    while (true) {
      scriptStart = htmlOut.indexOf('<script>', scriptStart);
      if (scriptStart === -1) break;
      
      const scriptEnd = htmlOut.indexOf('</script>', scriptStart + 8);
      if (scriptEnd === -1) break;
      
      const beforeScript = htmlOut.substring(0, scriptStart);
      const scriptContent = htmlOut.substring(scriptStart + 8, scriptEnd);
      const afterScript = htmlOut.substring(scriptEnd);
      
      // Escape ALL problematic patterns in script content
      let fixedScriptContent = scriptContent;
      
      // Escape </body>& first (most specific)
      // Use hex escape \x26 for & to avoid HTML parsing issues
      while (fixedScriptContent.includes('</body>&')) {
        fixedScriptContent = fixedScriptContent.split('</body>&').join('<\\/body>\\x26');
      }
      
      // Escape </body> (general case)
      while (fixedScriptContent.includes('</body>')) {
        fixedScriptContent = fixedScriptContent.split('</body>').join('<\\/body>');
      }
      
      // Escape </script> (critical)
      while (fixedScriptContent.includes('</script>')) {
        fixedScriptContent = fixedScriptContent.split('</script>').join('<\\/script>');
      }
      
      htmlOut = beforeScript + '<script>' + fixedScriptContent + afterScript;
      scriptStart = scriptStart + 8 + fixedScriptContent.length; // Move past this script tag
    }
  }

  // Write final HTML
  await writeFile(DIST.ui, htmlOut);

  // Copy manifest.json
  const manifest = await readJson(SRC.manifest);
  await writeFile(DIST.manifest, JSON.stringify(manifest, null, 2));

  process.stdout.write(
    `[build-prod] ✅ Built production files:\n`
  );
  process.stdout.write(
    `  - ${path.relative(ROOT, DIST.code)}\n`
  );
  process.stdout.write(
    `  - ${path.relative(ROOT, DIST.ui)} (with inline CSS and JS)\n`
  );
  process.stdout.write(
    `  - ${path.relative(ROOT, DIST.manifest)}\n`
  );
}

buildOnce().catch((err) => {
  console.error(err);
  process.exit(1);
});

