import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { build as esbuild } from "esbuild";
// NOTE: We intentionally avoid HTML minification here because ui.html contains large inline JS
// and some minifiers can choke on modern syntax or embedded templates.
// If you want minification later, we can add an opt-in flag and run a safer minifier.
import chokidar from "chokidar";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = ROOT;
const DIST_DIR = path.join(ROOT, "Plugin-check-design-Figma");

const SRC = {
  code: path.join(SRC_DIR, "code.js"),
  // UI entry (support imports). Prefer /scripts (your current structure), fallback to /javascript (legacy).
  uiJsPreferred: path.join(SRC_DIR, "scripts", "main.js"),
  uiJsFallback: path.join(SRC_DIR, "javascript", "main.js"),
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

function injectCssLink(html, href = "styles.css") {
  if (html.includes(`href="${href}"`) || html.includes(`href='${href}'`)) return html;
  const linkTag = `<link rel="stylesheet" href="${href}">`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${linkTag}\n</head>`);
  }
  return `${linkTag}\n${html}`;
}

function injectScriptTag(html, src = "ui.js") {
  if (html.includes(`src="${src}"`) || html.includes(`src='${src}'`)) return html;
  const tag = `<script src="${src}"></script>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${tag}\n</body>`);
  }
  return `${html}\n${tag}`;
}

async function buildOnce() {
  await ensureDir(DIST_DIR);

  // Bundle plugin main JS (supports imports). Figma runtime is conservative: target ES2017.
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

  // Bundle UI JS (optional; supports imports). Only emitted if entry exists.
  let shouldInjectUiJs = false;
  let uiEntry = null;
  if (await fileExists(SRC.uiJsPreferred)) uiEntry = SRC.uiJsPreferred;
  else if (await fileExists(SRC.uiJsFallback)) uiEntry = SRC.uiJsFallback;

  if (uiEntry) {
    const uiJsIn = await fs.readFile(uiEntry, "utf8");
    if (uiJsIn.trim().length > 0) {
      shouldInjectUiJs = true;
      await esbuild({
        entryPoints: [uiEntry],
        outfile: DIST.uiJs,
        bundle: true,
        minify: true,
        target: ["es2017"],
        format: "iife",
        platform: "browser",
        legalComments: "none"
      });
    }
  }

  // Compile SCSS -> CSS (supports imports across components)
  // Note: sass is an optional devDependency at runtime; if it's missing we still build JS/HTML.
  let sassMod = null;
  try {
    sassMod = await import("sass");
  } catch {
    sassMod = null;
  }
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
    // Ensure file exists so ui.html link won't 404
    await writeFile(DIST.css, "");
  }

  // Minify HTML (keep sane settings; preserve quotes; inline JS/CSS will also be minified)
  const htmlIn = await fs.readFile(SRC.ui, "utf8");
  let htmlOut = injectCssLink(htmlIn, "styles.css");
  if (shouldInjectUiJs) {
    htmlOut = injectScriptTag(htmlOut, "ui.js");
  }
  // Copy ui.html with small injections (no minification to avoid parse errors)
  await writeFile(DIST.ui, htmlOut);

  // Copy manifest.json (keeps main/ui filenames; output dir is the plugin package folder)
  const manifest = await readJson(SRC.manifest);
  await writeFile(DIST.manifest, JSON.stringify(manifest, null, 2));

  // Helpful stdout for CI/local usage
  const extra = shouldInjectUiJs ? `, ${path.relative(ROOT, DIST.uiJs)}` : "";
  process.stdout.write(
    `[build] Wrote ${path.relative(ROOT, DIST.code)}${extra}, ${path.relative(ROOT, DIST.css)}, ${path.relative(ROOT, DIST.ui)}, ${path.relative(ROOT, DIST.manifest)}\n`
  );
}

function parseArgs(argv) {
  return {
    watch: argv.includes("--watch")
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await buildOnce();

  if (!args.watch) return;

  process.stdout.write("[watch] Watching for changes...\n");
  const watcher = chokidar.watch(
    [
      SRC.code,
      SRC.ui,
      SRC.manifest,
      SRC.scss,
      path.join(SRC_DIR, "styles", "**/*.scss"),
      // UI JS sources (both new + legacy folders)
      path.join(SRC_DIR, "scripts", "**/*.js"),
      path.join(SRC_DIR, "javascript", "**/*.js")
    ],
    {
    ignoreInitial: true
    }
  );

  let building = false;
  let queued = false;

  const rebuild = async () => {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    try {
      await buildOnce();
    } finally {
      building = false;
      if (queued) {
        queued = false;
        await rebuild();
      }
    }
  };

  watcher.on("add", rebuild);
  watcher.on("change", rebuild);
  watcher.on("unlink", rebuild);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


