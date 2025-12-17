import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { transform } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";
import chokidar from "chokidar";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = ROOT;
const DIST_DIR = path.join(ROOT, "dist");

const SRC = {
  code: path.join(SRC_DIR, "code.js"),
  ui: path.join(SRC_DIR, "ui.html"),
  manifest: path.join(SRC_DIR, "manifest.json")
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

async function buildOnce() {
  await ensureDir(DIST_DIR);

  // Minify JS (Figma plugin runtime is conservative; keep target ES2017 and avoid exotic output)
  const jsIn = await fs.readFile(SRC.code, "utf8");
  const jsOut = await transform(jsIn, {
    loader: "js",
    minify: true,
    target: "es2017",
    format: "iife",
    legalComments: "none"
  });
  await writeFile(DIST.code, jsOut.code);

  // Minify HTML (keep sane settings; preserve quotes; inline JS/CSS will also be minified)
  const htmlIn = await fs.readFile(SRC.ui, "utf8");
  const htmlOut = await minifyHtml(htmlIn, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    sortAttributes: true,
    sortClassName: true,
    keepClosingSlash: true
  });
  await writeFile(DIST.ui, htmlOut);

  // Emit manifest.json pointing to dist files
  const manifest = await readJson(SRC.manifest);
  const distManifest = {
    ...manifest,
    main: "code.js",
    ui: "ui.html"
  };
  await writeFile(DIST.manifest, JSON.stringify(distManifest, null, 2));

  // Helpful stdout for CI/local usage
  process.stdout.write(`[build] Wrote ${path.relative(ROOT, DIST.code)}, ${path.relative(ROOT, DIST.ui)}, ${path.relative(ROOT, DIST.manifest)}\n`);
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
  const watcher = chokidar.watch([SRC.code, SRC.ui, SRC.manifest], {
    ignoreInitial: true
  });

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


