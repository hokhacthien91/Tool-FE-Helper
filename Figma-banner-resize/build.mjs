import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { build as esbuild } from "esbuild";
import chokidar from "chokidar";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = ROOT;
const DIST_DIR = path.join(ROOT, "Plugin-banner-resize");

const SRC = {
  code: path.join(SRC_DIR, "code.js"),
  uiJs: path.join(SRC_DIR, "scripts", "main.js"),
  ui: path.join(SRC_DIR, "ui.html"),
  manifest: path.join(SRC_DIR, "manifest.json"),
  scss: path.join(SRC_DIR, "styles", "style.scss")
};

const DIST = {
  code: path.join(DIST_DIR, "code.js"),
  uiJs: path.join(DIST_DIR, "ui.js"),
  css: path.join(DIST_DIR, "styles.css"),
  ui: path.join(DIST_DIR, "ui.html"),
  manifest: path.join(DIST_DIR, "manifest.json")
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeFile(file, contents) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, contents, "utf8");
}

async function fileExists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

function injectInlineScript(html, jsContent) {
  const tag = `<script>\n${jsContent}\n</script>`;
  const idx = html.lastIndexOf("</body>");
  if (idx !== -1) return html.slice(0, idx) + tag + "\n" + html.slice(idx);
  return `${html}\n${tag}`;
}

function injectInlineStyle(html, cssContent) {
  const tag = `<style>\n${cssContent}\n</style>`;
  if (html.includes("</head>")) return html.replace("</head>", `${tag}\n</head>`);
  return `${tag}\n${html}`;
}

async function buildOnce() {
  await ensureDir(DIST_DIR);

  await esbuild({
    entryPoints: [SRC.code],
    outfile: DIST.code,
    bundle: true, minify: true,
    target: ["es2017"], format: "iife", platform: "browser",
    legalComments: "none"
  });

  let shouldInjectUiJs = false;
  if (await fileExists(SRC.uiJs)) {
    const src = await fs.readFile(SRC.uiJs, "utf8");
    if (src.trim().length > 0) {
      shouldInjectUiJs = true;
      await esbuild({
        entryPoints: [SRC.uiJs],
        outfile: DIST.uiJs,
        bundle: true, minify: true,
        target: ["es2017"], format: "iife", platform: "browser",
        legalComments: "none"
      });
    }
  }

  let sassMod = null;
  try { sassMod = await import("sass"); } catch { sassMod = null; }
  if (await fileExists(SRC.scss)) {
    if (sassMod && sassMod.compile) {
      const css = sassMod.compile(SRC.scss, {
        style: "compressed",
        loadPaths: [path.join(SRC_DIR, "styles")]
      }).css || "";
      await writeFile(DIST.css, css);
    } else {
      process.stdout.write("[build] WARN: sass not installed; wrote empty styles.css\n");
      await writeFile(DIST.css, "");
    }
  } else {
    await writeFile(DIST.css, "");
  }

  const htmlIn = await fs.readFile(SRC.ui, "utf8");
  let htmlOut = htmlIn;

  const cssContent = await fileExists(DIST.css) ? await fs.readFile(DIST.css, "utf8") : "";
  if (cssContent.trim()) htmlOut = injectInlineStyle(htmlOut, cssContent);

  if (shouldInjectUiJs) {
    const jsContent = await fs.readFile(DIST.uiJs, "utf8");
    if (jsContent.trim()) htmlOut = injectInlineScript(htmlOut, jsContent);
  }

  await writeFile(DIST.ui, htmlOut);

  const manifest = await readJson(SRC.manifest);
  await writeFile(DIST.manifest, JSON.stringify(manifest, null, 2));

  process.stdout.write(`[build] Done → ${path.relative(ROOT, DIST_DIR)}/\n`);
}

async function main() {
  const watch = process.argv.includes("--watch");
  await buildOnce();
  if (!watch) return;

  process.stdout.write("[watch] Watching for changes...\n");
  const watcher = chokidar.watch([
    SRC.code, SRC.ui, SRC.manifest, SRC.scss,
    path.join(SRC_DIR, "styles", "**/*.scss"),
    path.join(SRC_DIR, "scripts", "**/*.js")
  ], { ignoreInitial: true });

  let building = false, queued = false;
  const rebuild = async () => {
    if (building) { queued = true; return; }
    building = true;
    try { await buildOnce(); } finally {
      building = false;
      if (queued) { queued = false; await rebuild(); }
    }
  };
  watcher.on("add", rebuild).on("change", rebuild).on("unlink", rebuild);
}

main().catch((err) => { console.error(err); process.exit(1); });
