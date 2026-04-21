const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;
const { app, core, action } = require("photoshop");

uxp.entrypoints.setup({
  panels: {
    "banner-cloner-pro-panel": {
      show() {},
      hide() {}
    }
  }
});

const PRESETS = ["300x250","300x600","160x600","728x90","320x50","300x50","970x250","480x320","1080x1080","1080x1920","1920x1080","1080x1440","1080x1350"];

let cloneMode = "artboards"; // "documents" | "artboards"

const GG_PREFIX = "GG-";
function hasGGPrefix(name) {
  return !!(name && name.toLowerCase().startsWith(GG_PREFIX.toLowerCase()));
}

// Toggle perf timing logs (and extra verification round-trips in setTextFontSize).
// Leave true while tuning clone speed; set to false once happy to cut a few round-trips.
const DEBUG_PERF = true;
function perfNow() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
function perfLog(label, startMs) {
  if (!DEBUG_PERF) return;
  const ms = Math.round(perfNow() - startMs);
  log(`[PERF] ${label}: ${ms}ms`);
}

const sizesInput = document.getElementById("sizesInput");
const presetWrap = document.getElementById("presetWrap");
const cloneBtn = document.getElementById("cloneBtn");
const refreshBtn = document.getElementById("refreshBtn");
const sourceNameEl = document.getElementById("sourceName");
const sourceSizeEl = document.getElementById("sourceSize");
const suffixNameEl = document.getElementById("suffixName");
const smartMatchEl = document.getElementById("smartMatchEnabled");
const skipLayerInput = document.getElementById("skipLayerInput");
const logBox = document.getElementById("logBox");
const exportBtn = document.getElementById("exportBtn");
const tabBtns = document.querySelectorAll(".tab-btn");
const splitSection = document.getElementById("splitSection");
const splitBtn = document.getElementById("splitBtn");
const getImagesBtn = document.getElementById("getImagesBtn");
const addGroupBtn = document.getElementById("addGroupBtn");
const imageListContainer = document.getElementById("imageListContainer");
const exportAssetsBtn = document.getElementById("exportAssetsBtn");
const exportAssetsAction = document.getElementById("exportAssetsAction");
const exportAssetsPanel = document.getElementById("exportAssetsPanel");
const ignoreLayerInput = document.getElementById("ignoreLayerInput");

// Artboard picker elements
const artboardPickerToggle = document.getElementById("artboardPickerToggle");
const artboardPickerArrow = document.getElementById("artboardPickerArrow");
const artboardPickerCount = document.getElementById("artboardPickerCount");
const artboardPickerBody = document.getElementById("artboardPickerBody");
const artboardPickerSearch = document.getElementById("artboardPickerSearch");
const artboardPickerList = document.getElementById("artboardPickerList");
const artboardPickerRefresh = document.getElementById("artboardPickerRefresh");
const artboardPickerAll = document.getElementById("artboardPickerAll");
const artboardPickerNone = document.getElementById("artboardPickerNone");

// Asset search elements
const assetSearchRow = document.getElementById("assetSearchRow");
const assetSearchInput = document.getElementById("assetSearch");
let scannedAssets = [];
let scannedArtboards = [];
const IGNORE_KEY = "bannerCloner.ignoreAssets";

const cloneProgress = document.getElementById("cloneProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const jsonStatus = document.getElementById("jsonStatus");

function log(message) {
  console.log(message);
  const line = document.createElement("div");
  line.textContent = message;
  if (/error/i.test(message)) {
    line.className = "log-error";
    // Auto-expand log if collapsed
    logBox.classList.remove("collapsed");
    // Flash the log header to grab attention
    const header = document.querySelector(".log-header");
    if (header) {
      header.classList.add("log-has-error");
      setTimeout(() => header.classList.remove("log-has-error"), 3000);
    }
  } else if (/complete|created/i.test(message)) {
    line.className = "log-success";
  }
  logBox.appendChild(line);
  // Scroll to the new line
  line.scrollIntoView({ block: "nearest" });
}

function setProgress(current, total, sizeLabel) {
  cloneProgress.style.display = "block";
  const pct = Math.round((current / total) * 100);
  progressFill.style.width = pct + "%";
  progressText.textContent = `Cloning ${sizeLabel}... (${current}/${total})`;
}

function hideProgress() {
  cloneProgress.style.display = "none";
  progressFill.style.width = "0%";
}

function updateJsonStatus() {
  const ruleCount = Object.keys(layerRules).length;
  if (ruleCount > 0) {
    const totalRules = Object.values(layerRules).reduce((sum, r) => sum + r.length, 0);
    jsonStatus.textContent = `JSON: ${ruleCount} sizes, ${totalRules} rules`;
    jsonStatus.className = "json-status loaded";
  } else {
    jsonStatus.textContent = "No JSON imported";
    jsonStatus.className = "json-status";
  }
}

function updateSizesCount() {
  const label = document.getElementById("sizesCountLabel");
  const count = parseSizes(sizesInput.value).length;
  if (label) label.textContent = count > 0 ? `(${count} selected)` : "";
}

function parseSizes(input) {
  return input.split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const m = token.match(/^(\d+)x(\d+)$/i);
      if (!m) return null;
      return { raw: token, width: Number(m[1]), height: Number(m[2]) };
    })
    .filter(Boolean);
}

function renderPresets() {
  presetWrap.innerHTML = "";
  const current = new Set(parseSizes(sizesInput.value).map(s => s.raw));
  PRESETS.forEach(size => {
    const chip = document.createElement("button");
    chip.className = "preset-chip" + (current.has(size) ? " active" : "");
    chip.textContent = size;
    chip.addEventListener("click", () => {
      const list = parseSizes(sizesInput.value).map(s => s.raw);
      const next = list.includes(size) ? list.filter(x => x !== size) : [...list, size];
      sizesInput.value = next.join(" ");
      renderPresets();
      saveTargetSizes();
      updateSizesCount();
    });
    presetWrap.appendChild(chip);
  });
}

function stripSizeSuffix(name) {
  const m = name.match(/([-_ ])\d+x\d+$/i);
  return { base: name.replace(/[-_ ]\d+x\d+$/i, ""), sep: m ? m[1] : "_" };
}

// ─── Photoshop helpers ───

async function bp(commands) {
  return await action.batchPlay(commands, { synchronousExecution: true, modalBehavior: "execute" });
}

async function bpSafe(commands) {
  return await action.batchPlay(commands, { synchronousExecution: false, modalBehavior: "execute" });
}

function rectSize(rect) {
  const left = Number(rect.left?._value ?? rect.left ?? 0);
  const top = Number(rect.top?._value ?? rect.top ?? 0);
  const right = Number(rect.right?._value ?? rect.right ?? 0);
  const bottom = Number(rect.bottom?._value ?? rect.bottom ?? 0);
  return { left, top, right, bottom, width: Math.round(right - left), height: Math.round(bottom - top) };
}

async function getLayerDescriptor(layerId) {
  const result = await bp([{
    _obj: "get",
    _target: [{ _ref: "layer", _id: layerId }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
  return result[0];
}

async function resolveSelectedArtboard() {
  const doc = app.activeDocument;
  const activeLayer = doc?.activeLayers?.[0];
  if (!activeLayer) throw new Error("Please select a source artboard.");
  let current = activeLayer;
  while (current && current.parent && current.parent !== doc) {
    current = current.parent;
  }
  const layerDesc = await getLayerDescriptor(current.id);
  const rect = layerDesc.artboard?.artboardRect || layerDesc.bounds;
  if (!rect) throw new Error("Cannot read artboard rect.");
  return {
    id: current.id,
    name: current.name,
    layer: current,
    rect: rect,
    size: rectSize(rect)
  };
}

async function selectLayerById(layerId) {
  await bp([{
    _obj: "select",
    _target: [{ _ref: "layer", _id: layerId }],
    makeVisible: false,
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// ─── Background helpers ───

async function getLayerBounds(layerId) {
  const desc = await getLayerDescriptor(layerId);
  return rectSize(desc.bounds);
}

async function getLayerBoundsNoEffects(layerId) {
  const desc = await getLayerDescriptor(layerId);
  return rectSize(desc.boundsNoEffects || desc.bounds);
}

async function getGroupBoundsNoEffects(group) {
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  const leaves = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      leaves.push(layer);
    }
  }
  collect(group);
  for (const leaf of leaves) {
    try {
      const b = await getLayerBoundsNoEffects(leaf.id);
      if (b.width === 0 || b.height === 0) continue;
      if (b.left < minL) minL = b.left;
      if (b.top < minT) minT = b.top;
      if (b.right > maxR) maxR = b.right;
      if (b.bottom > maxB) maxB = b.bottom;
    } catch (e) { /* skip */ }
  }
  if (minL === Infinity) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  return { left: minL, top: minT, right: maxR, bottom: maxB, width: maxR - minL, height: maxB - minT };
}

function getBgLayerName() {
  return (skipLayerInput.value || "GG-background").trim().toLowerCase();
}

const BG_LAYER_KEY = "bannerCloner.bgLayerName";
const SIZES_KEY = "bannerCloner.targetSizes";
const SUFFIX_KEY = "bannerCloner.suffixName";
const SMART_MATCH_KEY = "bannerCloner.smartMatch";

function loadBgLayerName() {
  try {
    const saved = localStorage.getItem(BG_LAYER_KEY);
    if (saved) skipLayerInput.value = saved;
  } catch (e) {}
}

function saveBgLayerName() {
  try {
    localStorage.setItem(BG_LAYER_KEY, skipLayerInput.value || "background");
  } catch (e) {}
}

function loadTargetSizes() {
  try {
    const saved = localStorage.getItem(SIZES_KEY);
    if (saved) sizesInput.value = saved;
    const suffix = localStorage.getItem(SUFFIX_KEY);
    if (suffix !== null) suffixNameEl.checked = suffix === "1";
    const smart = localStorage.getItem(SMART_MATCH_KEY);
    if (smart !== null) smartMatchEl.checked = smart === "1";
  } catch (e) {}
}

function saveTargetSizes() {
  try {
    localStorage.setItem(SIZES_KEY, sizesInput.value || "");
  } catch (e) {}
}

function saveSuffixPref() {
  try {
    localStorage.setItem(SUFFIX_KEY, suffixNameEl.checked ? "1" : "0");
  } catch (e) {}
}

function saveSmartMatchPref() {
  try {
    localStorage.setItem(SMART_MATCH_KEY, smartMatchEl.checked ? "1" : "0");
  } catch (e) {}
}

// ─── Text + Shape helpers ───

function isTextLayer(layer) {
  return layer && (layer.kind === "text" || layer.kind === "textLayer");
}

function isShapeLayer(layer) {
  if (!layer) return false;
  const k = layer.kind;
  // Photoshop UXP shape kinds vary: "shape", "shapeLayer", "solidFill", "vector", "solidColor"
  return k === "shape" || k === "shapeLayer" || k === "solidFill" || k === "vector" || k === "solidColor";
}

function isImageLayer(layer) {
  if (!layer) return false;
  const k = layer.kind;
  return k === "pixel" || k === "smartObject";
}

// Walk all leaves of a layer/group, return arrays by kind
function collectLeavesByKind(parent) {
  const texts = [], shapes = [], images = [], others = [];
  function walk(l) {
    if (l.layers && l.layers.length > 0) {
      for (const c of l.layers) walk(c);
    } else {
      if (isTextLayer(l)) texts.push(l);
      else if (isShapeLayer(l)) shapes.push(l);
      else if (isImageLayer(l)) images.push(l);
      else others.push(l);
    }
  }
  if (parent.layers && parent.layers.length > 0) {
    for (const c of parent.layers) walk(c);
  } else {
    walk(parent);
  }
  return { texts, shapes, images, others };
}

// Set font size directly on a text layer (px), preserving color/font/weight
// Strategy: read textKey → compute scale ratio from current pt → transform the text layer
// Transform on a text layer rescales fontSize while preserving all style properties
async function setTextFontSize(layerId, targetPx) {
  const t0 = perfNow();
  const desc = await getLayerDescriptor(layerId);
  const textKey = desc.textKey;
  if (!textKey || !textKey.textStyleRange || !textKey.textStyleRange.length) {
    log(`[TEXT]   ERROR: no textKey/textStyleRange`);
    return;
  }
  const rawPt = textKey.textStyleRange[0]?.textStyle?.size?._value;
  if (!rawPt || rawPt <= 0) {
    log(`[TEXT]   ERROR: no current size`);
    return;
  }

  // Visual size = raw pt × transform scale (1pt = 1px)
  let scale = 1;
  const tx = textKey.transform;
  if (tx) {
    const yy = tx.yy?._value ?? tx.yy ?? 1;
    scale = Math.abs(yy);
  }
  const visualPx = rawPt * scale;
  log(`[TEXT]   current: raw=${rawPt.toFixed(2)}pt × scale=${scale.toFixed(4)} = ${visualPx.toFixed(2)}px → target: ${targetPx}px`);

  if (Math.abs(visualPx - targetPx) < 0.5) {
    log(`[TEXT]   already at target size, skip`);
    perfLog(`setTextFontSize skip (id=${layerId})`, t0);
    return;
  }

  // Strategy:
  //   - If text layer has no transform (scale ≈ 1): set textStyleRange (approach1) — cheap, reliable.
  //   - If text layer HAS transform (scale ≠ 1): PS rejects raw-size write, jump straight to transform (approach2).
  // Skip verify round-trips in normal runs (enable DEBUG_PERF to re-check).
  const hasTransform = Math.abs(scale - 1) > 0.001;

  if (!hasTransform) {
    // Approach 1: Set font size directly via textStyleRange
    const newRawPt = targetPx;
    log(`[TEXT]   approach1: set raw → ${newRawPt.toFixed(2)}pt`);
    try {
      const newRanges = textKey.textStyleRange.map(r => ({
        _obj: "textStyleRange",
        from: r.from,
        to: r.to,
        textStyle: {
          ...r.textStyle,
          _obj: "textStyle",
          size: { _unit: "pointsUnit", _value: newRawPt }
        }
      }));

      await selectLayerById(layerId);
      await bp([{
        _obj: "set",
        _target: [{ _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }],
        to: {
          _obj: "textLayer",
          textStyleRange: newRanges
        },
        _options: { dialogOptions: "dontDisplay" }
      }]);

      if (DEBUG_PERF) {
        const descAfter = await getLayerDescriptor(layerId);
        const afterPt = descAfter.textKey?.textStyleRange?.[0]?.textStyle?.size?._value;
        if (afterPt) log(`[TEXT]   approach1 verify: raw=${afterPt.toFixed(2)}pt`);
      }
      perfLog(`setTextFontSize approach1 (id=${layerId})`, t0);
      return;
    } catch (e) {
      log(`[TEXT]   approach1 ERROR: ${e.message} — falling through to approach2`);
    }
  }

  // Approach 2: transform-scale by visual ratio (used when transform exists OR approach1 threw)
  try {
    const ratio = targetPx / visualPx;
    log(`[TEXT]   approach2: transform scale ${(ratio * 100).toFixed(1)}%`);
    await selectLayerById(layerId);
    await bpSafe([{
      _obj: "transform",
      _target: [{ _ref: "layer", _id: layerId }],
      freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
      width: { _unit: "percentUnit", _value: ratio * 100 },
      height: { _unit: "percentUnit", _value: ratio * 100 },
      interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
      _options: { dialogOptions: "dontDisplay" }
    }]);

    if (DEBUG_PERF) {
      const descAfter = await getLayerDescriptor(layerId);
      const afterPt = descAfter.textKey?.textStyleRange?.[0]?.textStyle?.size?._value;
      if (afterPt) {
        let afterScale = 1;
        const afterTx = descAfter.textKey?.transform;
        if (afterTx) afterScale = Math.abs(afterTx.yy?._value ?? afterTx.yy ?? 1);
        log(`[TEXT]   approach2 verify: ${(afterPt * afterScale).toFixed(2)}px`);
      }
    }
    perfLog(`setTextFontSize approach2 (id=${layerId})`, t0);
  } catch (e) {
    log(`[TEXT]   approach2 ERROR: ${e.message}`);
  }
}

// Resize a shape layer to absolute width/height (uses non-uniform transform)
async function resizeShapeLayer(layer, targetW, targetH) {
  const bounds = await getLayerBounds(layer.id);
  if (bounds.width === 0 || bounds.height === 0) return;
  const scaleX = targetW / bounds.width;
  const scaleY = targetH / bounds.height;
  await selectLayerById(layer.id);
  await bpSafe([{
    _obj: "transform",
    _target: [{ _ref: "layer", _id: layer.id }],
    freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
    width: { _unit: "percentUnit", _value: scaleX * 100 },
    height: { _unit: "percentUnit", _value: scaleY * 100 },
    interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// Scale a single layer uniformly (e.g. logo by width)
async function scaleLayerUniform(layer, scale) {
  if (Math.abs(scale - 1) < 0.01) return;
  await selectLayerById(layer.id);
  await bpSafe([{
    _obj: "transform",
    _target: [{ _ref: "layer", _id: layer.id }],
    freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
    width: { _unit: "percentUnit", _value: scale * 100 },
    height: { _unit: "percentUnit", _value: scale * 100 },
    interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

function isBgGroup(layer) {
  return layer.name.toLowerCase() === getBgLayerName();
}

function findBgGroup(parent) {
  // 1. Exact match with configured bg layer name (must have GG- prefix) — recursive
  function findExact(node) {
    if (!node.layers) return null;
    for (const layer of node.layers) {
      if (isBgGroup(layer) && hasGGPrefix(layer.name)) return layer;
      const found = findExact(layer);
      if (found) return found;
    }
    return null;
  }
  const exact = findExact(parent);
  if (exact) return exact;

  // 2. Fallback: first GG- layer whose name contains "background" or "bg" — recursive
  function findFallback(node) {
    if (!node.layers) return null;
    for (const layer of node.layers) {
      if (hasGGPrefix(layer.name)) {
        const n = layer.name.toLowerCase();
        if (n.includes("background") || n.includes("-bg")) {
          log(`[BG] auto-detected: "${layer.name}" (configured "${getBgLayerName()}" not found)`);
          return layer;
        }
      }
      const found = findFallback(layer);
      if (found) return found;
    }
    return null;
  }
  return findFallback(parent);
}

async function scaleBgCover(bgGroup, canvasW, canvasH, originX, originY) {
  originX = originX || 0;
  originY = originY || 0;
  // Process each child layer inside bg group individually
  // (transform on group opens interactive mode, so we do each child)
  const children = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      children.push(layer);
    }
  }
  collect(bgGroup);

  for (const child of children) {
    try {
      log(`[BG] layer: "${child.name}" kind: ${child.kind} id: ${child.id}`);
      const bounds = await getLayerBounds(child.id);
      log(`[BG]   bounds: ${bounds.width}x${bounds.height} (${bounds.left},${bounds.top})`);
      if (bounds.width === 0 || bounds.height === 0) { log(`[BG]   skip: zero bounds`); continue; }

      const scaleX = canvasW / bounds.width;
      const scaleY = canvasH / bounds.height;
      const scale = Math.max(scaleX, scaleY);

      await selectLayerById(child.id);

      if (Math.abs(scale - 1) > 0.01) {
        log(`[BG]   transform: scale ${(scale * 100).toFixed(1)}%`);
        await bpSafe([{
          _obj: "transform",
          _target: [{ _ref: "layer", _id: child.id }],
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
          width: { _unit: "percentUnit", _value: scale * 100 },
          height: { _unit: "percentUnit", _value: scale * 100 },
          interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[BG]   transform OK`);
      }

      // Center on canvas (account for artboard origin offset)
      const centerX = originX + canvasW / 2;
      const centerY = originY + canvasH / 2;
      const newBounds = await getLayerBounds(child.id);
      const dx = centerX - (newBounds.left + newBounds.width / 2);
      const dy = centerY - (newBounds.top + newBounds.height / 2);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        log(`[BG]   move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        await bpSafe([{
          _obj: "move",
          _target: [{ _ref: "layer", _id: child.id }],
          to: {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
            vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[BG]   move OK`);
      }
    } catch (e) { log(`[BG]   ERROR: ${e.message}`); }
  }
}

// ─── Smart Layout helpers ───

async function captureContentLayout(artboardLayer, srcW, srcH) {
  const artDesc = await getLayerDescriptor(artboardLayer.id);
  const artRect = rectSize(artDesc.artboard?.artboardRect || artDesc.bounds);

  const contentGroup = artboardLayer.layers
    ? [...artboardLayer.layers].find(l => l.name.toLowerCase() === "content")
    : null;
  if (!contentGroup || !contentGroup.layers) return null;

  const layout = [];
  for (const child of contentGroup.layers) {
    if (!hasGGPrefix(child.name)) continue; // Only capture [GG-] layers
    try {
      // Use getGroupBounds for groups (getLayerBounds on groups returns artboard bounds)
      const bounds = (child.layers && child.layers.length > 0)
        ? await getGroupBounds(child)
        : await getLayerBounds(child.id);
      if (bounds.width === 0 || bounds.height === 0) continue;
      layout.push({
        name: child.name.toLowerCase(),
        relCenterX: (bounds.left + bounds.width / 2 - artRect.left) / srcW,
        relCenterY: (bounds.top + bounds.height / 2 - artRect.top) / srcH,
        relWidth: bounds.width / srcW,
        relHeight: bounds.height / srcH
      });
    } catch (e) { /* skip */ }
  }
  return layout.length > 0 ? layout : null;
}

async function scaleGroupChildren(group, scale) {
  const leaves = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      leaves.push(layer);
    }
  }
  collect(group);

  for (const leaf of leaves) {
    try {
      const bounds = await getLayerBounds(leaf.id);
      if (bounds.width === 0 || bounds.height === 0) continue;
      const skipKinds = ["solidColor", "gradientFill", "pattern"];
      if (skipKinds.includes(leaf.kind)) continue;

      await selectLayerById(leaf.id);
      await bpSafe([{
        _obj: "transform",
        _target: [{ _ref: "layer", _id: leaf.id }],
        freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
        width: { _unit: "percentUnit", _value: scale * 100 },
        height: { _unit: "percentUnit", _value: scale * 100 },
        interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
        _options: { dialogOptions: "dontDisplay" }
      }]);
    } catch (e) { log(`[SCALE] ERROR ${leaf.name}: ${e.message}`); }
  }
}

async function moveGroupChildren(group, dx, dy) {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  log(`[MOVE] "${group.name}": dx=${Math.round(dx)} dy=${Math.round(dy)}`);
  try {
    await selectLayerById(group.id);
    await bp([{
      _obj: "move",
      _target: [{ _ref: "layer", _id: group.id }],
      to: {
        _obj: "offset",
        horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
        vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
      },
      _options: { dialogOptions: "dontDisplay" }
    }]);
    log(`[MOVE]   OK`);
  } catch (e) {
    log(`[MOVE]   group move failed, trying leaves: ${e.message}`);
    // Fallback: move individual leaves
    const leaves = [];
    function collect(layer) {
      if (layer.layers && layer.layers.length > 0) {
        for (const child of layer.layers) collect(child);
      } else {
        leaves.push(layer);
      }
    }
    collect(group);
    for (const leaf of leaves) {
      try {
        await selectLayerById(leaf.id);
        await bp([{
          _obj: "move",
          _target: [{ _ref: "layer", _id: leaf.id }],
          to: {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
            vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
      } catch (e2) { log(`[MOVE]   "${leaf.name}" ERROR: ${e2.message}`); }
    }
  }
}

async function getGroupBounds(group) {
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  const leaves = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      leaves.push(layer);
    }
  }
  collect(group);

  for (const leaf of leaves) {
    try {
      const b = await getLayerBounds(leaf.id);
      if (b.width === 0 || b.height === 0) continue;
      if (b.left < minL) minL = b.left;
      if (b.top < minT) minT = b.top;
      if (b.right > maxR) maxR = b.right;
      if (b.bottom > maxB) maxB = b.bottom;
    } catch (e) { /* skip */ }
  }
  if (minL === Infinity) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  return { left: minL, top: minT, right: maxR, bottom: maxB, width: maxR - minL, height: maxB - minT };
}

// ─── Smart Layout: scale + reposition content groups ───

async function smartLayoutContent(parent, srcW, srcH, canvasW, canvasH, originX, originY, sourceLayout, targetSizeKey) {
  originX = originX || 0;
  originY = originY || 0;

  // Build set of layer names that have rules → smart layout should skip them
  const ruleNames = new Set();
  if (targetSizeKey && layerRules[targetSizeKey]) {
    for (const rule of layerRules[targetSizeKey]) {
      if (rule.name) ruleNames.add(rule.name.toLowerCase());
    }
  }

  // Find content group
  const contentGroup = parent.layers
    ? [...parent.layers].find(l => l.name.toLowerCase() === "content")
    : null;

  // Fallback to old fitContentLayers if no content group or no source layout
  if (!contentGroup || !sourceLayout) {
    log(`[LAYOUT] No content group or source layout, fallback to fitContentLayers`);
    return await fitContentLayers(parent, canvasW, canvasH, originX, originY, false, ruleNames);
  }

  log(`[LAYOUT] Smart layout: ${contentGroup.layers.length} groups, ${srcW}x${srcH} → ${canvasW}x${canvasH}`);
  if (ruleNames.size > 0) log(`[LAYOUT] Skipping layers with rules: ${[...ruleNames].join(", ")}`);

  const padding = Math.round(Math.min(canvasW, canvasH) * 0.05);

  const canvasLeft = originX;
  const canvasTop = originY;
  log(`[LAYOUT] Target area: (${canvasLeft},${canvasTop})-(${canvasLeft+canvasW},${canvasTop+canvasH})`);

  for (const child of contentGroup.layers) {
    // Only process [GG-] layers
    if (!hasGGPrefix(child.name)) {
      log(`[LAYOUT] "${child.name}": no [GG-] prefix, skip`);
      continue;
    }

    const childName = child.name.toLowerCase();

    // Skip if this layer has a rule configured
    if (ruleNames.has(childName)) {
      log(`[LAYOUT] "${child.name}": has rule in settings, skip`);
      continue;
    }

    const srcInfo = sourceLayout.find(s => s.name === childName);
    if (!srcInfo) {
      log(`[LAYOUT] "${child.name}": no source info, skip`);
      continue;
    }

    try {
      // Read actual bounds first, then scale to fit canvas
      let bounds = await getGroupBounds(child);
      if (bounds.width === 0 || bounds.height === 0) continue;

      // Max 80% of canvas for any single group
      const maxW = canvasW * 0.8;
      const maxH = canvasH * 0.8;
      const scaleToFitW = bounds.width > maxW ? maxW / bounds.width : 1;
      const scaleToFitH = bounds.height > maxH ? maxH / bounds.height : 1;
      const scale = Math.min(scaleToFitW, scaleToFitH, 1);

      if (Math.abs(scale - 1) > 0.01) {
        log(`[LAYOUT] "${child.name}": scale ${(scale * 100).toFixed(1)}% (actual ${Math.round(bounds.width)}x${Math.round(bounds.height)})`);
        await scaleGroupChildren(child, scale);
        bounds = await getGroupBounds(child);
      } else {
        log(`[LAYOUT] "${child.name}": no scale needed (${Math.round(bounds.width)}x${Math.round(bounds.height)})`);
      }
      if (bounds.width === 0 || bounds.height === 0) continue;
      log(`[LAYOUT] "${child.name}": actual bounds ${Math.round(bounds.width)}x${Math.round(bounds.height)} at (${Math.round(bounds.left)},${Math.round(bounds.top)})`);
      log(`[LAYOUT] "${child.name}": src rel cx=${srcInfo.relCenterX.toFixed(3)} cy=${srcInfo.relCenterY.toFixed(3)}`);

      // Target position in artboard coords (0-based)
      const targetCenterX = canvasLeft + srcInfo.relCenterX * canvasW;
      const targetCenterY = canvasTop + srcInfo.relCenterY * canvasH;

      // Current center (doc coords — move command uses doc coords)
      const curCenterX = bounds.left + bounds.width / 2;
      const curCenterY = bounds.top + bounds.height / 2;

      let dx = targetCenterX - curCenterX;
      let dy = targetCenterY - curCenterY;
      log(`[LAYOUT] "${child.name}": target=(${Math.round(targetCenterX)},${Math.round(targetCenterY)}) cur=(${Math.round(curCenterX)},${Math.round(curCenterY)}) raw dx=${Math.round(dx)} dy=${Math.round(dy)}`);

      // Clamp: ensure final position within canvas
      const pad = padding;
      let newL = bounds.left + dx;
      let newR = newL + bounds.width;
      let newT = bounds.top + dy;
      let newB = newT + bounds.height;

      if (newR > canvasLeft + canvasW - pad) { dx -= newR - (canvasLeft + canvasW - pad); newL = bounds.left + dx; }
      if (newL < canvasLeft + pad) { dx += (canvasLeft + pad) - newL; }
      newT = bounds.top + dy; newB = newT + bounds.height;
      if (newB > canvasTop + canvasH - pad) { dy -= newB - (canvasTop + canvasH - pad); newT = bounds.top + dy; }
      if (newT < canvasTop + pad) { dy += (canvasTop + pad) - newT; }

      log(`[LAYOUT] "${child.name}": move dx=${Math.round(dx)} dy=${Math.round(dy)}`);
      await moveGroupChildren(child, dx, dy);
    } catch (e) {
      log(`[LAYOUT] "${child.name}" ERROR: ${e.message}`);
    }
  }

  // Handle remaining layers outside content/background groups with fitContentLayers
  log(`[LAYOUT] Fitting remaining layers outside content/background...`);
  await fitContentLayers(parent, canvasW, canvasH, canvasLeft, canvasTop, true, ruleNames);
}

// ─── Fit content layers inside canvas (fallback) ───

async function fitContentLayers(parent, canvasW, canvasH, originX, originY, skipContentBg, ruleNames) {
  originX = originX || 0;
  originY = originY || 0;
  // Collect all leaf layers that are NOT inside bg group (and optionally not in content group)
  const leaves = [];
  function walk(layer, insideRuledGroup, insideGG) {
    if (isBgGroup(layer)) return;
    if (skipContentBg && layer.name) {
      const ln = layer.name.toLowerCase();
      if (ln === "content" || ln === "guideline" || ln === "guidline") return;
    }
    // Skip if this layer or an ancestor has a rule
    const isRuled = insideRuledGroup || (ruleNames && layer.name && ruleNames.has(layer.name.toLowerCase()));
    if (isRuled) return;
    // Track [GG-] scope: layer has prefix or is inside a [GG-] group
    const inGG = insideGG || hasGGPrefix(layer.name);
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) walk(child, isRuled, inGG);
    } else {
      if (inGG) leaves.push(layer); // Only collect [GG-] layers
    }
  }
  for (const layer of parent.layers) walk(layer, false, false);

  
  const canvasLeft = originX;
  const canvasRight = originX + canvasW;
  const canvasTop = originY;
  const canvasBottom = originY + canvasH;

  for (const layer of leaves) {
    try {
      log(`[FIT] layer: "${layer.name}" kind: ${layer.kind} id: ${layer.id}`);
      const skipKinds = ["solidColor", "gradientFill", "pattern"];
      if (skipKinds.includes(layer.kind)) { log(`[FIT]   skip: fill layer`); continue; }
      const bounds = await getLayerBounds(layer.id);
      log(`[FIT]   bounds: ${bounds.width}x${bounds.height} (${bounds.left},${bounds.top})`);
      if (bounds.width === 0 || bounds.height === 0) { log(`[FIT]   skip: zero bounds`); continue; }

      await selectLayerById(layer.id);

      // Scale down if wider than canvas
      if (bounds.width > canvasW) {
        const scale = canvasW / bounds.width;
        log(`[FIT]   transform: scale ${(scale * 100).toFixed(1)}%`);
        try {
          await bpSafe([{
            _obj: "transform",
            _target: [{ _ref: "layer", _id: layer.id }],
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            width: { _unit: "percentUnit", _value: scale * 100 },
            height: { _unit: "percentUnit", _value: scale * 100 },
            interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[FIT]   transform OK`);
        } catch (e) { log(`[FIT]   transform ERROR: ${e.message}`); continue; }
      }

      // Re-read bounds and move into canvas if outside
      const b = await getLayerBounds(layer.id);
      let dx = 0, dy = 0;

      // Horizontal: push into canvas (using absolute artboard bounds)
      if (b.right <= canvasLeft) dx = canvasLeft - b.left + 10;
      else if (b.left >= canvasRight) dx = (canvasRight - 10) - b.right;
      else if (b.left < canvasLeft) dx = canvasLeft - b.left;

      // Vertical: push into canvas
      if (b.bottom <= canvasTop) dy = canvasTop - b.top + 10;
      else if (b.top >= canvasBottom) dy = (canvasBottom - 10) - b.bottom;
      else if (b.top < canvasTop) dy = canvasTop - b.top;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        log(`[FIT]   move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        try {
          await bpSafe([{
            _obj: "move",
            _target: [{ _ref: "layer", _id: layer.id }],
            to: {
              _obj: "offset",
              horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
              vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[FIT]   move OK`);
        } catch (e) { log(`[FIT]   move ERROR: ${e.message}`); }
      }
    } catch (e) { log(`[FIT]   ERROR: ${e.message}`); }
  }
}

// ─── Apply Layer Rules ───

// Capture original bounds of all layers (before smart layout modifies them)
async function captureOriginalBounds(parent) {
  const map = {}; // key: layer name (lowercase), value: { width, height, fontSize? }
  async function walk(layer) {
    if (layer.name) {
      try {
        const isGroup = layer.layers && layer.layers.length > 0;
        const bounds = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        if (bounds.width > 0 && bounds.height > 0) {
          const entry = { width: bounds.width, height: bounds.height };
          // Capture fontSize for text layers
          if (!isGroup && (layer.kind === "text" || layer.kind === "textLayer")) {
            try {
              const desc = await getLayerDescriptor(layer.id);
              const textKey = desc.textKey;
              if (textKey && textKey.textStyleRange && textKey.textStyleRange.length > 0) {
                const style = textKey.textStyleRange[0].textStyle;
                if (style && style.size) {
                  entry.fontSize = style.size._value || style.size;
                }
              }
            } catch (e) { /* skip fontSize capture */ }
          }
          // Capture fontSize from group's first text child
          if (isGroup) {
            try {
              const firstText = findFirstTextLayer(layer);
              if (firstText) {
                const desc = await getLayerDescriptor(firstText.id);
                const textKey = desc.textKey;
                if (textKey && textKey.textStyleRange && textKey.textStyleRange.length > 0) {
                  const style = textKey.textStyleRange[0].textStyle;
                  if (style && style.size) {
                    entry.fontSize = style.size._value || style.size;
                  }
                }
              }
            } catch (e) { /* skip */ }
          }
          map[layer.name.toLowerCase()] = entry;
        }
      } catch (e) { /* skip */ }
    }
    if (layer.layers) {
      for (const child of layer.layers) await walk(child);
    }
  }
  if (parent.layers) {
    for (const layer of parent.layers) await walk(layer);
  }
  return map;
}

function findFirstTextLayer(group) {
  if (!group.layers) return null;
  for (const child of group.layers) {
    if (child.kind === "text" || child.kind === "textLayer") return child;
    if (child.layers) {
      const found = findFirstTextLayer(child);
      if (found) return found;
    }
  }
  return null;
}

function normalizeName(name) {
  return (name || "").replace(/[\r\n]+/g, " ").trim().toLowerCase();
}

function findLayersByName(parent, targetName) {
  const target = normalizeName(targetName);
  const results = [];
  function walk(layer) {
    if (layer.name && normalizeName(layer.name) === target) {
      results.push(layer);
    }
    if (layer.layers) {
      for (const child of layer.layers) walk(child);
    }
  }
  if (parent.layers) {
    for (const layer of parent.layers) walk(layer);
  }
  return results;
}

async function applyLayerRules(docOrArtboard, targetSizeKey, canvasW, canvasH, originX, originY, originalBounds, srcW, srcH) {
  // Pre-compute scale from JSON using PSD source size as base
  const baseSize = (srcW && srcH) ? findBaseSizeFromJson(srcW, srcH) : null;
  if (baseSize) log(`[RULE] Base size from JSON: ${baseSize.name} (${baseSize.width}x${baseSize.height})`);
  originX = originX || 0;
  originY = originY || 0;
  const rules = layerRules[targetSizeKey];
  if (!rules || !rules.length) return;

  // Collect all rule names to skip children of matched groups
  const matchedGroupIds = new Set();

  for (const rule of rules) {
    if (!rule.name) continue;

    // Background layer: let JSON rule handle it (scaleBgCover is skipped when JSON rules exist)

    // Safety: only apply rules to [GG-] layers (when checkbox is checked)
    const requireGG = document.getElementById("requireGGPrefix")?.checked !== false;
    if (requireGG && !hasGGPrefix(rule.name)) {
      log(`[RULE] "${rule.name}": no [GG-] prefix, skip`);
      continue;
    }

    const allLayers = findLayersByName(docOrArtboard, rule.name);
    if (!allLayers.length) {
      log(`[RULE] "${rule.name}": not found, skip`);
      continue;
    }
    // Only apply to first matching layer (avoid duplicates)
    const layers = [allLayers[0]];
    if (allLayers.length > 1) {
      log(`[RULE] "${rule.name}": found ${allLayers.length} layers, applying only to first (id:${allLayers[0].id})`);
    }

    for (const layer of layers) {
      // Skip if this layer is a child of an already-matched group
      let parent = layer.parent;
      let skipThis = false;
      while (parent) {
        if (matchedGroupIds.has(parent.id)) { skipThis = true; break; }
        parent = parent.parent;
      }
      if (skipThis) {
        log(`[RULE] "${layer.name}": skipped (parent group already has rule)`);
        continue;
      }

      // If this is a group, mark it so its children are skipped
      if (layer.layers && layer.layers.length > 0) {
        matchedGroupIds.add(layer.id);
      }
      try {
        log(`[RULE] "${layer.name}" (id:${layer.id}) applying rule for ${targetSizeKey}`);

        // ─── NEW: Direct sizing approach ───
        // For text: set fontSize directly (no compound scaling)
        // For shape (CTA bg): resize by widthElement × heightElement (non-uniform)
        // For image (logo): scale uniformly by width
        // Fallback: use computed scale (for explicit scale or pure groups)

        const { texts, shapes, images, others } = collectLeavesByKind(layer);
        log(`[RULE]   leaves: ${texts.length} text, ${shapes.length} shape, ${images.length} image, ${others.length} other`);
        if (others.length > 0) {
          for (const o of others) log(`[RULE]   other leaf: "${o.name}" kind=${o.kind}`);
        }

        let directApplied = false;
        // Resolve target dimensions — never mix raw (from CSS width/height)
        // with element (from widthElement/heightElement) to avoid stale data mismatch
        let targetW, targetH, hasBothWH;
        const hasRawW = rule._widthRaw !== undefined;
        const hasRawH = rule._heightRaw !== undefined;
        const hasElemW = rule._widthElement !== undefined;
        const hasElemH = rule._heightElement !== undefined;

        if (hasRawW || hasRawH) {
          // Use raw group only — uniform if missing one dimension
          targetW = hasRawW ? rule._widthRaw : undefined;
          targetH = hasRawH ? rule._heightRaw : undefined;
          hasBothWH = hasRawW && hasRawH;
        } else {
          // Fallback to element group
          targetW = hasElemW ? rule._widthElement : undefined;
          targetH = hasElemH ? rule._heightElement : undefined;
          hasBothWH = hasElemW && hasElemH;
        }

        // 1. TEXT: set fontSize directly
        const targetFontSize = rule._fontSize;
        if (targetFontSize && texts.length > 0) {
          for (const txt of texts) {
            try {
              await setTextFontSize(txt.id, targetFontSize);
              log(`[RULE]   text "${txt.name}": fontSize → ${targetFontSize}px`);
            } catch (e) { log(`[RULE]   text "${txt.name}" fontSize ERROR: ${e.message}`); }
          }
          directApplied = true;
        }

        // 2. NON-TEXT layers (shape, image, smartObject)
        // Both W+H from same source → non-uniform resize (CTA bg, button shape)
        // Only W → uniform scale (logo)
        const nonTextLeaves = shapes.concat(images).concat(others.filter(o => !isTextLayer(o)));
        if (nonTextLeaves.length > 0 && (targetW || targetH)) {
          for (const lf of nonTextLeaves) {
            try {
              const lb = await getLayerBounds(lf.id);
              if (lb.width === 0 || lb.height === 0) continue;
              if (hasBothWH) {
                // Non-uniform resize (both from same source)
                await resizeShapeLayer(lf, targetW, targetH);
                log(`[RULE]   non-text "${lf.name}" (${lf.kind}): resize → ${Math.round(targetW)}x${Math.round(targetH)}`);
              } else if (targetW) {
                // Uniform scale by width
                const sc = targetW / lb.width;
                await scaleLayerUniform(lf, sc);
                log(`[RULE]   non-text "${lf.name}" (${lf.kind}): scale ${(sc * 100).toFixed(1)}% → width ${Math.round(targetW)}px`);
              }
            } catch (e) { log(`[RULE]   non-text "${lf.name}" ERROR: ${e.message}`); }
          }
          directApplied = true;
        }

        // 4. Scale: explicit scale or bg cover
        if (!directApplied) {
          let scaleVal = rule.scale ? parseFloat(rule.scale) : NaN;

          // For bg-related layers: compute cover scale, then multiply by JSON scale factor
          const isBgRelated = rule.name.toLowerCase() === getBgLayerName()
            || rule.name.toLowerCase().includes("background")
            || rule.name.toLowerCase().includes("-bg");
          if (isBgRelated) {
            const bgBounds = (layer.layers && layer.layers.length > 0)
              ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
            if (bgBounds.width > 0 && bgBounds.height > 0) {
              const coverScale = Math.max(canvasW / bgBounds.width, canvasH / bgBounds.height);
              const jsonFactor = (!isNaN(scaleVal) && scaleVal > 0) ? scaleVal : 1;
              scaleVal = coverScale * jsonFactor;
              log(`[RULE]   bg cover: ${(coverScale * 100).toFixed(1)}% × JSON ${jsonFactor} = ${(scaleVal * 100).toFixed(1)}%`);
            }
          }

          if (!isNaN(scaleVal) && scaleVal > 0 && Math.abs(scaleVal - 1) > 0.01) {
            const isGroupForScale = layer.layers && layer.layers.length > 0;
            if (isGroupForScale) {
              const allChildren = texts.concat(shapes).concat(images);
              if (allChildren.length > 0) {
                await selectLayerById(allChildren[0].id);
                for (let i = 1; i < allChildren.length; i++) {
                  await bp([{
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: allChildren[i].id }],
                    selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
                    makeVisible: false,
                    _options: { dialogOptions: "dontDisplay" }
                  }]);
                }
                await bpSafe([{
                  _obj: "transform",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
                  width: { _unit: "percentUnit", _value: scaleVal * 100 },
                  height: { _unit: "percentUnit", _value: scaleVal * 100 },
                  interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              }
            } else {
              await scaleLayerUniform(layer, scaleVal);
            }
            log(`[RULE]   scale: ${(scaleVal * 100).toFixed(0)}%`);
          }
        }

        // Position: get current bounds WITHOUT effects for accurate positioning
        const isGroup = layer.layers && layer.layers.length > 0;
        const boundsWithFx = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        const boundsNoFx = isGroup ? await getGroupBoundsNoEffects(layer) : await getLayerBoundsNoEffects(layer.id);
        log(`[RULE]   boundsWithFx: (${Math.round(boundsWithFx.left)},${Math.round(boundsWithFx.top)}) ${Math.round(boundsWithFx.width)}x${Math.round(boundsWithFx.height)}`);
        log(`[RULE]   boundsNoFx:   (${Math.round(boundsNoFx.left)},${Math.round(boundsNoFx.top)}) ${Math.round(boundsNoFx.width)}x${Math.round(boundsNoFx.height)}`);
        const bounds = boundsNoFx;
        if (bounds.width === 0 || bounds.height === 0) { log(`[RULE]   skip: zero bounds`); continue; }

        let dx = 0, dy = 0;
        const hasTop = rule.top !== "" && rule.top !== undefined;
        const hasLeft = rule.left !== "" && rule.left !== undefined;
        const hasRight = rule.right !== "" && rule.right !== undefined;
        const hasBottom = rule.bottom !== "" && rule.bottom !== undefined;
        log(`[RULE]   rule: top=${rule.top} left=${rule.left} right=${rule.right} bottom=${rule.bottom} | hasTop=${hasTop} hasLeft=${hasLeft} hasRight=${hasRight} hasBottom=${hasBottom}`);
        log(`[RULE]   canvas: ${canvasW}x${canvasH} origin: (${originX},${originY})`);

        // Priority: top > bottom, left > right
        if (hasTop) {
          const targetTop = originY + parseFloat(rule.top);
          dy = targetTop - bounds.top;
          log(`[RULE]   top: targetTop=${targetTop} bounds.top=${Math.round(bounds.top)} dy=${Math.round(dy)}`);
        } else if (hasBottom) {
          const targetBottom = originY + canvasH - parseFloat(rule.bottom);
          dy = targetBottom - bounds.bottom;
          log(`[RULE]   bottom: targetBottom=${targetBottom} bounds.bottom=${Math.round(bounds.bottom)} dy=${Math.round(dy)}`);
        }

        if (hasLeft) {
          const targetLeft = originX + parseFloat(rule.left);
          dx = targetLeft - bounds.left;
          log(`[RULE]   left: targetLeft=${targetLeft} bounds.left=${Math.round(bounds.left)} dx=${Math.round(dx)}`);
        } else if (hasRight) {
          const targetRight = originX + canvasW - parseFloat(rule.right);
          dx = targetRight - bounds.right;
          log(`[RULE]   right: targetRight=${targetRight} bounds.right=${Math.round(bounds.right)} dx=${Math.round(dx)}`);
        }

        log(`[RULE]   final move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (isGroup) {
            await moveGroupChildren(layer, dx, dy);
          } else {
            await selectLayerById(layer.id);
            await bpSafe([{
              _obj: "move",
              _target: [{ _ref: "layer", _id: layer.id }],
              to: {
                _obj: "offset",
                horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
                vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
              },
              _options: { dialogOptions: "dontDisplay" }
            }]);
          }
          log(`[RULE]   moved dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        }

        // --- Extended fields from JSON import ---

        // Opacity (0-1 → 0-100%)
        if (rule.opacity !== undefined && rule.opacity !== "") {
          const opacityVal = parseFloat(rule.opacity);
          if (!isNaN(opacityVal)) {
            const opacityPct = Math.round(opacityVal <= 1 ? opacityVal * 100 : opacityVal);
            try {
              await selectLayerById(layer.id);
              await bp([{
                _obj: "set",
                _target: [{ _ref: "layer", _id: layer.id }],
                to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: opacityPct } },
                _options: { dialogOptions: "dontDisplay" }
              }]);
              log(`[RULE]   opacity: ${opacityPct}%`);
            } catch (e) { log(`[RULE]   opacity ERROR: ${e.message}`); }
          }
        }

        // Background position (% based) — reposition layer based on % of canvas
        if (rule.bgPositionX !== undefined || rule.bgPositionY !== undefined) {
          try {
            const bgBounds = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
            let bgDx = 0, bgDy = 0;
            if (rule.bgPositionX !== undefined && rule.bgPositionX !== "") {
              const pctX = parseFloat(rule.bgPositionX) / 100;
              // Position: (canvas - layer) * pct
              const maxOffsetX = bgBounds.width - canvasW;
              if (maxOffsetX > 0) {
                const targetLeft = originX - maxOffsetX * pctX;
                bgDx = targetLeft - bgBounds.left;
              } else {
                const targetCenterX = originX + canvasW * pctX;
                bgDx = targetCenterX - (bgBounds.left + bgBounds.width / 2);
              }
            }
            if (rule.bgPositionY !== undefined && rule.bgPositionY !== "") {
              const pctY = parseFloat(rule.bgPositionY) / 100;
              const maxOffsetY = bgBounds.height - canvasH;
              if (maxOffsetY > 0) {
                const targetTop = originY - maxOffsetY * pctY;
                bgDy = targetTop - bgBounds.top;
              } else {
                const targetCenterY = originY + canvasH * pctY;
                bgDy = targetCenterY - (bgBounds.top + bgBounds.height / 2);
              }
            }
            if (Math.abs(bgDx) > 0.5 || Math.abs(bgDy) > 0.5) {
              if (isGroup) {
                await moveGroupChildren(layer, bgDx, bgDy);
              } else {
                await selectLayerById(layer.id);
                await bpSafe([{
                  _obj: "move",
                  _target: [{ _ref: "layer", _id: layer.id }],
                  to: {
                    _obj: "offset",
                    horizontal: { _unit: "pixelsUnit", _value: Math.round(bgDx) },
                    vertical: { _unit: "pixelsUnit", _value: Math.round(bgDy) }
                  },
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              }
              log(`[RULE]   bgPosition: dx=${Math.round(bgDx)} dy=${Math.round(bgDy)}`);
            }
          } catch (e) { log(`[RULE]   bgPosition ERROR: ${e.message}`); }
        }

        // Gradient angle
        if (rule.gradientAngle !== undefined && rule.gradientAngle !== "") {
          const angle = parseFloat(rule.gradientAngle);
          if (!isNaN(angle)) {
            try {
              await selectLayerById(layer.id);
              const desc = await getLayerDescriptor(layer.id);
              // Only apply to gradient fill layers
              if (desc.adjustment && desc.adjustment.length > 0) {
                const adj = desc.adjustment[0];
                if (adj.gradient) {
                  await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _id: layer.id }],
                    to: {
                      _obj: "gradientFill",
                      angle: { _unit: "angleUnit", _value: angle }
                    },
                    _options: { dialogOptions: "dontDisplay" }
                  }]);
                  log(`[RULE]   gradientAngle: ${angle}°`);
                }
              }
            } catch (e) { log(`[RULE]   gradientAngle ERROR: ${e.message}`); }
          }
        }

      } catch (e) {
        log(`[RULE]   ERROR "${layer.name}": ${e.message}`);
      }
    }
  }
}

// ─── Tab switching ─── (moved to bottom, near settings logic)

// ─── Clone: each size → artboard in same document ───

async function cloneAsArtboards() {
  const targets = parseSizes(sizesInput.value);
  if (!targets.length) { log("No valid sizes found."); return; }

  cloneBtn.disabled = true;
  cloneBtn.textContent = "Cloning...";
  const tTotal = perfNow();
  try {
    await core.executeAsModal(async () => {
      const source = await resolveSelectedArtboard();
      const { base: baseName, sep: baseSep } = stripSizeSuffix(source.name);
      const srcRect = source.size;
      const sourceDoc = app.activeDocument;
      const srcBounds = await getLayerBounds(source.id);
      log(`Source artboard: ${source.name} (${srcRect.width}x${srcRect.height})`);
      log(`[POS] source artboardRect=(${srcRect.left},${srcRect.top},${srcRect.right},${srcRect.bottom})`);
      log(`[POS] source bounds=(${srcBounds.left},${srcBounds.top},${srcBounds.right},${srcBounds.bottom})`);

      // Capture content layout from source artboard
      const sourceLayout = await captureContentLayout(source.layer, srcRect.width, srcRect.height);
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      // Find the rightmost edge of all existing artboards
      let maxRight = srcRect.right;
      for (const layer of sourceDoc.layers) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            const r = rectSize(desc.artboard?.artboardRect || desc.bounds);
            if (r.right > maxRight) maxRight = r.right;
          }
        } catch (e) { /* skip */ }
      }
      let nextX = maxRight + 80;

      // Create a clean template doc from original source (before any clones are added)
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      await bp([{
        _obj: "duplicate",
        _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
        name: "_template_",
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const templateDoc = app.activeDocument;
      const templateDocId = templateDoc.id;

      // Flatten template: keep only selected artboard, delete others with children
      const abToDelete = [];
      let abToFlatten = null;
      for (const layer of [...templateDoc.layers]) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            if (layer.name === source.name) {
              abToFlatten = layer;
            } else {
              abToDelete.push(layer);
            }
          }
        } catch (e) { /* skip */ }
      }

      // Delete non-selected artboards AND their children
      for (const ab of abToDelete) {
        try {
          if (ab.layers && ab.layers.length > 0) {
            for (const child of [...ab.layers]) {
              try {
                await selectLayerById(child.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              } catch (e) { /* skip */ }
            }
          }
          await selectLayerById(ab.id);
          await bp([{
            _obj: "delete",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            _options: { dialogOptions: "dontDisplay" }
          }]);
        } catch (e) { /* skip */ }
      }

      // Flatten the selected artboard
      if (abToFlatten) {
        await selectLayerById(abToFlatten.id);
        await bp([{
          _obj: "set",
          _target: [{ _ref: "layer", _id: abToFlatten.id }],
          to: { _obj: "layer", artboardEnabled: false },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "ungroupLayersEvent",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
      }
      log(`Template doc created`);

      // Capture original bounds ONCE on the template — every tempDoc is a copy with
      // the same layer names, so we can reuse this map across all target sizes.
      // Keyed by layer name (lowercase), so layer IDs do not need to match.
      const anyRules = targets.some(t => layerRules[t.raw] && layerRules[t.raw].length > 0);
      let templateOrigBounds = null;
      if (anyRules) {
        const tCap = perfNow();
        templateOrigBounds = await captureOriginalBounds(templateDoc);
        const keyCount = Object.keys(templateOrigBounds).length;
        log(`[PERF] captureOriginalBounds (template, once): ${Math.round(perfNow() - tCap)}ms, ${keyCount} entries`);
      }

      for (let ti = 0; ti < targets.length; ti++) {
        const target = targets[ti];
        setProgress(ti + 1, targets.length, target.raw);
        log(`--- Clone ${target.raw} ---`);
        const tTarget = perfNow();
        const newName = suffixNameEl.checked ? `${baseName}${baseSep}${target.raw}` : target.raw;

        // 1. Switch to template doc and duplicate it → temp doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: newName + "_temp",
          _options: { dialogOptions: "dontDisplay" }
        }]);
        const tempDoc = app.activeDocument;

        // 4. Resize canvas to target size
        await bp([{
          _obj: "canvasSize",
          width: { _unit: "pixelsUnit", _value: target.width },
          height: { _unit: "pixelsUnit", _value: target.height },
          horizontal: { _enum: "horizontalLocation", _value: "center" },
          vertical: { _enum: "verticalLocation", _value: "center" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`Canvas: ${target.width}x${target.height}`);

        // DEBUG: check actual layer positions after canvasSize
        try {
          for (const l of tempDoc.layers) {
            const b = await getLayerBounds(l.id);
            if (b.width > 0) { log(`[DEBUG] After crop - "${l.name}": (${b.left},${b.top}) ${b.width}x${b.height}`); break; }
          }
        } catch(e) {}

        // Decide which layout pipeline to run
        const hasRules = !!(layerRules[target.raw] && layerRules[target.raw].length > 0);
        const smartEnabled = smartMatchEl.checked;
        log(`Mode: ${hasRules ? "JSON rules" : "no rules"}${smartEnabled ? " + smart match" : ""}${!hasRules && !smartEnabled ? " (canvas only)" : ""}`);

        // 5. Scale background — only when NO JSON rules (smart match fallback)
        // When JSON rules exist, applyLayerRules handles bg children with precise scale/position
        if (!hasRules && smartEnabled) {
          const bgGroup = findBgGroup(tempDoc);
          if (bgGroup) {
            try {
              log(`BG: "${bgGroup.name}" → cover (smart match)`);
              await scaleBgCover(bgGroup, target.width, target.height);
            } catch (e) { log(`BG scale skipped: ${e.message}`); }
          }
        }

        // 5b. Reuse bounds captured once on the template (name-keyed, stable across tempDocs)
        const origBounds = hasRules ? templateOrigBounds : null;

        // 6. Smart layout content (only when Smart match is enabled; skips layers that have JSON rules)
        if (smartEnabled) {
          const tSmart = perfNow();
          try {
            await smartLayoutContent(tempDoc, srcRect.width, srcRect.height, target.width, target.height, 0, 0, sourceLayout, target.raw);
          } catch (e) { log(`Fit content skipped: ${e.message}`); }
          perfLog(`smartLayoutContent ${target.raw}`, tSmart);
        }

        // 6b. Apply layer rules from JSON (highest priority)
        if (hasRules) {
          const tRules = perfNow();
          try {
            await applyLayerRules(tempDoc, target.raw, target.width, target.height, 0, 0, origBounds, srcRect.width, srcRect.height);
          } catch (e) { log(`Layer rules skipped: ${e.message}`); }
          perfLog(`applyLayerRules ${target.raw}`, tRules);
        }

        // 7. Wrap all layers into an artboard
        await bp([{
          _obj: "select",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "select",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
          selectionModifier: { _enum: "selectionModifierType", _value: "addToSelectionContinuous" },
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "make",
          _target: [{ _ref: "artboardSection" }],
          from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
          artboardRect: {
            _obj: "classFloatRect",
            top: 0, left: 0,
            bottom: target.height, right: target.width
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        const abLayer = tempDoc.layers[0];
        if (abLayer) abLayer.name = newName;
        log(`Artboard created in temp doc: ${newName}`);

        // 8. Duplicate artboard back to source doc
        await selectLayerById(abLayer.id);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "document", _id: sourceDoc.id },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`Duplicated artboard to source doc`);

        // 9. Close temp doc without saving
        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // 10. Switch to source doc and move the new artboard to position
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: sourceDoc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // Select the topmost layer (the newly duplicated artboard)
        await bp([{
          _obj: "select",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }]);
        const newAb = app.activeDocument.activeLayers[0];
        if (newAb) {
          const abDesc = await getLayerDescriptor(newAb.id);
          const abRect = rectSize(abDesc.artboard?.artboardRect || abDesc.bounds);
          const abBounds = rectSize(abDesc.bounds);
          log(`[POS] "${newAb.name}" artboardRect=(${abRect.left},${abRect.top}) bounds=(${abBounds.left},${abBounds.top})`);
          const moveX = nextX - abBounds.left;
          const moveY = srcBounds.top - abBounds.top;
          log(`[POS] "${newAb.name}" target=(${nextX},${srcBounds.top}) move=(${Math.round(moveX)},${Math.round(moveY)})`);
          if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
            await bp([{
              _obj: "move",
              _target: [{ _ref: "layer", _id: newAb.id }],
              to: {
                _obj: "offset",
                horizontal: { _unit: "pixelsUnit", _value: Math.round(moveX) },
                vertical: { _unit: "pixelsUnit", _value: Math.round(moveY) }
              },
              _options: { dialogOptions: "dontDisplay" }
            }]);
          }
          // Verify after move
          const afterBounds = await getLayerBounds(newAb.id);
          log(`[POS] "${newAb.name}" afterBounds=(${afterBounds.left},${afterBounds.top}) expected=(${nextX},${srcBounds.top})`);
        }

        nextX += target.width + 80;
        log(`Created: ${newName}`);
        perfLog(`target ${target.raw} total`, tTarget);
      }

      // Close template doc
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: templateDocId }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      await bp([{
        _obj: "close",
        saving: { _enum: "yesNo", _value: "no" },
        _options: { dialogOptions: "dontDisplay" }
      }]);

      // Switch back to source doc
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);

      // Restore source artboard if it drifted during cloning
      const finalSrcDesc = await getLayerDescriptor(source.id);
      const finalSrcRect = rectSize(finalSrcDesc.artboard?.artboardRect || finalSrcDesc.bounds);
      const driftX = srcRect.left - finalSrcRect.left;
      const driftY = srcRect.top - finalSrcRect.top;
      if (Math.abs(driftX) > 0.5 || Math.abs(driftY) > 0.5) {
        log(`[POS] Source drifted to (${finalSrcRect.left},${finalSrcRect.top}). Restoring to (${srcRect.left},${srcRect.top})...`);
        await selectLayerById(source.id);
        await bp([{
          _obj: "move",
          _target: [{ _ref: "layer", _id: source.id }],
          to: {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: Math.round(driftX) },
            vertical: { _unit: "pixelsUnit", _value: Math.round(driftY) }
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[POS] Source restored.`);
      }
      log("=== Clone complete ===");
      log(`${targets.length} artboard(s) created in same document.`);
    }, { commandName: "Banner Cloner - Clone Artboards" });
    log(`[PERF] cloneAsArtboards total: ${Math.round(perfNow() - tTotal)}ms for ${targets.length} target(s)`);
  } catch (e) {
    log("Clone error: " + e.message);
  } finally {
    hideProgress();
    cloneBtn.disabled = false;
    cloneBtn.textContent = "Clone Artboards";
  }
}

// ─── Clone: each size → new document ───

async function cloneAll() {
  const targets = parseSizes(sizesInput.value);
  if (!targets.length) {
    log("No valid sizes found.");
    return;
  }

  cloneBtn.disabled = true;
  cloneBtn.textContent = "Cloning...";
  try {
    await core.executeAsModal(async () => {
      const sourceDoc = app.activeDocument;
      if (!sourceDoc) throw new Error("No document is currently open.");

      // Resolve selected artboard to use its name and size
      let selectedAb = null;
      try { selectedAb = await resolveSelectedArtboard(); } catch (e) { /* no artboard selected */ }

      const srcW = selectedAb ? selectedAb.size.width : sourceDoc.width;
      const srcH = selectedAb ? selectedAb.size.height : sourceDoc.height;
      const { base: baseName, sep: baseSep } = selectedAb
        ? stripSizeSuffix(selectedAb.name)
        : stripSizeSuffix(sourceDoc.title.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, ""));
      log(`Source: ${selectedAb ? selectedAb.name : sourceDoc.title} (${srcW}x${srcH})`);

      // Capture content layout from source
      const sourceLayout = selectedAb
        ? await captureContentLayout(selectedAb.layer, srcW, srcH)
        : null;
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      // Create a clean template doc with only the selected artboard's content
      await bp([{
        _obj: "duplicate",
        _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
        name: "_template_docs_",
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const templateDoc = app.activeDocument;
      const templateDocId = templateDoc.id;

      // In template: flatten selected artboard, delete all others
      // First collect which layers to keep vs delete
      const toDelete = [];
      let toFlatten = null;
      for (const layer of [...templateDoc.layers]) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            if (selectedAb && layer.name !== selectedAb.name) {
              toDelete.push(layer);
            } else {
              toFlatten = layer;
            }
          }
        } catch (e) { /* skip */ }
      }

      // Delete non-selected artboards and ALL their children
      for (const ab of toDelete) {
        try {
          // Select all children inside this artboard and delete them first
          if (ab.layers && ab.layers.length > 0) {
            for (const child of [...ab.layers]) {
              try {
                await selectLayerById(child.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              } catch (e) { /* skip */ }
            }
          }
          // Now delete the empty artboard container
          await selectLayerById(ab.id);
          await bp([{
            _obj: "delete",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            _options: { dialogOptions: "dontDisplay" }
          }]);
        } catch (e) { /* skip */ }
      }

      // Flatten the selected artboard
      if (toFlatten) {
        await selectLayerById(toFlatten.id);
        await bp([{
          _obj: "set",
          _target: [{ _ref: "layer", _id: toFlatten.id }],
          to: { _obj: "layer", artboardEnabled: false },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "ungroupLayersEvent",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log("Artboard → flat layers");
      }
      log(`Template doc created`);

      // Capture original bounds ONCE on the template (name-keyed, stable across duplicates)
      const anyRules = targets.some(t => layerRules[t.raw] && layerRules[t.raw].length > 0);
      let templateOrigBounds = null;
      if (anyRules) {
        const tCap = perfNow();
        templateOrigBounds = await captureOriginalBounds(templateDoc);
        const keyCount = Object.keys(templateOrigBounds).length;
        log(`[PERF] captureOriginalBounds (template, once): ${Math.round(perfNow() - tCap)}ms, ${keyCount} entries`);
      }

      for (let ti = 0; ti < targets.length; ti++) {
        const target = targets[ti];
        setProgress(ti + 1, targets.length, target.raw);
        log(`--- Clone ${target.raw} ---`);
        const newName = suffixNameEl.checked ? `${baseName}${baseSep}${target.raw}` : target.raw;

        // 1. Switch to template doc and duplicate it
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: newName,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const newDoc = app.activeDocument;

        // 2. Resize canvas to target size (anchor center)
        await bp([{
          _obj: "canvasSize",
          width: { _unit: "pixelsUnit", _value: target.width },
          height: { _unit: "pixelsUnit", _value: target.height },
          horizontal: { _enum: "horizontalLocation", _value: "center" },
          vertical: { _enum: "verticalLocation", _value: "center" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        log(`Canvas: ${target.width}x${target.height}`);

        // Decide which layout pipeline to run
        const hasRules = !!(layerRules[target.raw] && layerRules[target.raw].length > 0);
        const smartEnabled = smartMatchEl.checked;
        log(`Mode: ${hasRules ? "JSON rules" : "no rules"}${smartEnabled ? " + smart match" : ""}${!hasRules && !smartEnabled ? " (canvas only)" : ""}`);

        // 5. Scale background — only when NO JSON rules (smart match fallback)
        if (!hasRules && smartEnabled) {
          const bgGroup = findBgGroup(newDoc);
          if (bgGroup) {
            try {
              log(`BG: "${bgGroup.name}" → cover (smart match)`);
              await scaleBgCover(bgGroup, target.width, target.height);
            } catch (e) {
              log(`BG scale skipped: ${e.message}`);
            }
          }
        }

        // 5b. Reuse bounds captured once on the template (name-keyed, stable across newDocs)
        const origBounds = hasRules ? templateOrigBounds : null;

        // 6. Smart layout content (only when Smart match is enabled; skips layers that have JSON rules)
        if (smartEnabled) {
          const tSmart = perfNow();
          try {
            await smartLayoutContent(newDoc, srcW, srcH, target.width, target.height, 0, 0, sourceLayout, target.raw);
          } catch (e) {
            log(`Fit content skipped: ${e.message}`);
          }
          perfLog(`smartLayoutContent ${target.raw}`, tSmart);
        }

        // 6b. Apply layer rules from JSON (highest priority)
        if (hasRules) {
          const tRules = perfNow();
          try {
            await applyLayerRules(newDoc, target.raw, target.width, target.height, 0, 0, origBounds, srcW, srcH);
          } catch (e) { log(`Layer rules skipped: ${e.message}`); }
          perfLog(`applyLayerRules ${target.raw}`, tRules);
        }

        // 7. Wrap all layers into an Artboard
        try {
          // Select all layers (front to back)
          await bp([{
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }]);
          await bp([{
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
            selectionModifier: { _enum: "selectionModifierType", _value: "addToSelectionContinuous" },
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Create artboard from selected layers
          await bp([{
            _obj: "make",
            _target: [{ _ref: "artboardSection" }],
            from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
            artboardRect: {
              _obj: "classFloatRect",
              top: 0, left: 0,
              bottom: target.height, right: target.width
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Rename artboard
          const abLayer = newDoc.layers[0];
          if (abLayer) abLayer.name = newName;
          log(`Artboard: ${newName} (${target.width}x${target.height})`);
        } catch (e) {
          log("Artboard wrap skipped: " + e.message);
        }

        log(`Created: ${newName}`);
      }

      // Close template doc
      try {
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
      } catch (e) { /* template may already be closed */ }

      log("=== Clone complete ===");
      log(`${targets.length} document(s) created. Adjust content, then Export.`);
    }, { commandName: "Banner Cloner - Clone" });
  } catch (e) {
    log("Clone error: " + e.message);
  } finally {
    hideProgress();
    cloneBtn.disabled = false;
    cloneBtn.textContent = "Clone Artboards";
  }
}

// ─── Export all documents as JPG + PSD into structured folder ───

async function getDocName(activeDoc) {
  for (const layer of activeDoc.layers) {
    try {
      const desc = await getLayerDescriptor(layer.id);
      if (desc.artboardEnabled || desc.artboard) return layer.name;
    } catch (e) { /* skip */ }
  }
  return activeDoc.title || activeDoc.name;
}

async function exportAll() {
  const folder = await fs.getFolder();
  if (!folder) { log("Export cancelled."); return; }

  try {
    await core.executeAsModal(async () => {
      const docs = app.documents;
      if (!docs.length) { log("No documents open."); return; }

      // Derive base name from first document's artboard (strip size suffix)
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: docs[0].id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const firstName = await getDocName(app.activeDocument);
      const baseName = stripSizeSuffix(firstName.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, "")).base.replace(/[<>:"/\\|?*]/g, "_");

      // Create folder structure with timestamp
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}${String(now.getMonth()+1).padStart(2,"0")}${now.getFullYear()}`;
      const rootFolder = await folder.createFolder(`${baseName}-output-working-file-${ts}`);
      const outputFolder = await rootFolder.createFolder("output");
      const workingFolder = await rootFolder.createFolder("working-file");

      log(`Exporting ${docs.length} document(s) to ${baseName}-output-working-file/`);
      exportBtn.disabled = true;
      exportBtn.textContent = "Exporting...";

      for (let di = 0; di < docs.length; di++) {
        const doc = docs[di];
        setProgress(di + 1, docs.length, doc.name || `doc ${di + 1}`);
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: doc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const activeDoc = app.activeDocument;
        const rawName = await getDocName(activeDoc);
        const docName = rawName.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, "").replace(/[<>:"/\\|?*]/g, "_").toLowerCase();
        log(`Exporting: ${docName}`);

        // Save PSD to working-file/
        const psdFile = await workingFolder.createFile(docName + ".psd", { overwrite: true });
        const psdToken = await fs.createSessionToken(psdFile);
        await bp([{
          _obj: "save",
          as: { _obj: "photoshop35Format", maximizeCompatibility: true },
          in: { _path: psdToken, _kind: "local" },
          copy: true,
          lowerCase: true,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // Save JPG to output/ (duplicate, flatten, save, close)
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: docName + "_flat",
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]);

        // Cap width at 3000px (maintain aspect ratio)
        const maxW = 3000;
        const curW = app.activeDocument.width;
        if (curW > maxW) {
          const ratio = maxW / curW;
          const newH = Math.round(app.activeDocument.height * ratio);
          await resizeImage(maxW, newH, true);
          log(`Resized ${docName}: ${curW}px → ${maxW}px (h=${newH})`);
        }

        const jpgFile = await outputFolder.createFile(docName + ".jpg", { overwrite: true });
        const jpgToken = await fs.createSessionToken(jpgFile);
        await bp([{
          _obj: "save",
          as: {
            _obj: "JPEG",
            extendedQuality: 8,
            matteColor: { _enum: "matteColor", _value: "white" }
          },
          in: { _path: jpgToken, _kind: "local" },
          lowerCase: true,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        log(`Saved: ${docName}.psd + ${docName}.jpg`);
      }

      log(`=== Export complete ===`);
    }, { commandName: "Banner Cloner - Export" });
  } catch (e) {
    log("Export error: " + e.message);
  } finally {
    hideProgress();
    exportBtn.disabled = false;
    exportBtn.textContent = "Export";
  }
}

// ─── Split artboards to separate documents + save PSD ───

async function splitToDocuments() {
  try {
    await core.executeAsModal(async () => {
      const doc = app.activeDocument;
      if (!doc) { log("No document open."); return; }
      const docId = doc.id;

      // Find all artboards
      const artboards = [];
      for (const layer of doc.layers) {
        const desc = await getLayerDescriptor(layer.id);
        if (desc.artboardEnabled || desc.artboard) {
          artboards.push(layer);
        }
      }

      if (!artboards.length) { log("No artboards found."); return; }
      log(`Splitting ${artboards.length} artboard(s) to documents...`);
      splitBtn.disabled = true;
      splitBtn.textContent = "Splitting...";

      for (let si = 0; si < artboards.length; si++) {
        const ab = artboards[si];
        setProgress(si + 1, artboards.length, ab.name);
        const abName = ab.name.replace(/[<>:"/\\|?*]/g, "_");
        log(`Splitting: ${abName}`);

        // Switch to source doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: docId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // Duplicate entire document
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: abName,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const newDoc = app.activeDocument;

        // Delete all artboards except current one (with children)
        for (const layer of [...newDoc.layers]) {
          try {
            const desc = await getLayerDescriptor(layer.id);
            if ((desc.artboardEnabled || desc.artboard) && layer.name !== ab.name) {
              if (layer.layers && layer.layers.length > 0) {
                for (const child of [...layer.layers]) {
                  try {
                    await selectLayerById(child.id);
                    await bp([{
                      _obj: "delete",
                      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                      _options: { dialogOptions: "dontDisplay" }
                    }]);
                  } catch (e) { /* skip */ }
                }
              }
              await selectLayerById(layer.id);
              await bp([{
                _obj: "delete",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              }]);
            }
          } catch (e) { /* skip */ }
        }

        log(`Opened: ${abName}`);
      }

      log(`=== Split complete: ${artboards.length} document(s) opened. Click Export to save. ===`);
    }, { commandName: "Banner Cloner - Split to Documents" });
  } catch (e) {
    log("Split error: " + e.message);
  } finally {
    hideProgress();
    splitBtn.disabled = false;
    splitBtn.textContent = "Split to Documents";
  }
}

// ─── Refresh source info ───

async function refreshSource() {
  try {
    const source = await resolveSelectedArtboard();
    sourceNameEl.textContent = source.name;
    sourceSizeEl.textContent = `${source.size.width}x${source.size.height}`;
    log(`Source: ${source.name} (${source.size.width}x${source.size.height})`);
  } catch (e) {
    sourceNameEl.textContent = "-";
    sourceSizeEl.textContent = "-";
    log("Refresh: " + e.message);
  }
}

// ─── Settings: Layer Rules per target size ───

const settingsPanel = document.getElementById("settingsPanel");
const sizeGroupsContainer = document.getElementById("sizeGroupsContainer");

// Data: { "300x250": [{ name, top, left, right, bottom, scale }], ... }
let layerRules = {};
const expandedSizes = new Set(); // size keys that are explicitly expanded (default: collapsed)

function loadLayerRules() {
  try {
    const raw = localStorage.getItem("bannerCloner_layerRules");
    if (raw) layerRules = JSON.parse(raw);
  } catch (e) { layerRules = {}; }
}

function saveLayerRules() {
  localStorage.setItem("bannerCloner_layerRules", JSON.stringify(layerRules));
}

function getRulesForSize(sizeKey) {
  if (!layerRules[sizeKey]) layerRules[sizeKey] = [];
  return layerRules[sizeKey];
}

function createRuleInput(value, placeholder, sizeKey, idx, field) {
  const inp = document.createElement("sp-textfield");
  inp.value = value;
  if (placeholder) inp.setAttribute("placeholder", placeholder);
  inp.addEventListener("change", () => {
    const rules = getRulesForSize(sizeKey);
    if (rules[idx]) {
      rules[idx][field] = String(inp.value || "").trim();
      saveLayerRules();
    }
  });
  return inp;
}

function renderSizeGroups() {
  while (sizeGroupsContainer.firstChild) sizeGroupsContainer.removeChild(sizeGroupsContainer.firstChild);
  const sizes = parseSizes(sizesInput.value).map(s => s.raw);

  if (!sizes.length) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Add target sizes in Documents tab first.";
    sizeGroupsContainer.appendChild(hint);
    return;
  }

  sizes.forEach(sizeKey => {
    const rules = getRulesForSize(sizeKey);
    const group = document.createElement("div");
    group.className = "size-group";

    // Header — clickable toggle + delete button
    const header = document.createElement("div");
    header.className = "size-group-header";

    const isCollapsed = !expandedSizes.has(sizeKey);
    const toggleIcon = document.createElement("span");
    toggleIcon.className = "toggle-icon";
    toggleIcon.textContent = isCollapsed ? "\u25B6" : "\u25BC"; // ▶ or ▼
    header.appendChild(toggleIcon);

    const headerTitle = document.createElement("span");
    headerTitle.textContent = " " + sizeKey;
    header.appendChild(headerTitle);

    const deleteGroupBtn = document.createElement("button");
    deleteGroupBtn.className = "delete-group-btn";
    deleteGroupBtn.textContent = "X";
    deleteGroupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Remove from layerRules
      delete layerRules[sizeKey];
      saveLayerRules();
      // Remove from Target Sizes input
      const currentSizes = parseSizes(sizesInput.value).map(s => s.raw).filter(s => s !== sizeKey);
      sizesInput.value = currentSizes.join(" ");
      renderPresets();
      renderSizeGroups();
    });
    header.appendChild(deleteGroupBtn);

    // Body
    const body = document.createElement("div");
    body.className = "size-group-body";
    if (isCollapsed) body.style.display = "none";

    // Toggle collapse
    header.addEventListener("click", () => {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "" : "none";
      toggleIcon.textContent = isHidden ? "\u25BC" : "\u25B6"; // ▼ or ▶
      if (isHidden) expandedSizes.add(sizeKey);
      else expandedSizes.delete(sizeKey);
    });

    group.appendChild(header);

    // Render layer rules
    rules.forEach((rule, idx) => {
      const card = document.createElement("div");
      card.className = "rule-card";

      // Name + remove
      const ruleHeader = document.createElement("div");
      ruleHeader.className = "rule-header";
      ruleHeader.appendChild(createRuleInput(rule.name || "", "Layer name (e.g. cta)", sizeKey, idx, "name"));
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-rule-btn";
      removeBtn.textContent = "X";
      removeBtn.addEventListener("click", () => {
        rules.splice(idx, 1);
        saveLayerRules();
        renderSizeGroups();
      });
      ruleHeader.appendChild(removeBtn);
      card.appendChild(ruleHeader);

      // Fields — base fields always shown
      const fields = document.createElement("div");
      fields.className = "rule-fields";
      const baseDefs = [
        { key: "top", label: "Top", ph: "px" },
        { key: "left", label: "Left", ph: "px" },
        { key: "right", label: "Right", ph: "px" },
        { key: "bottom", label: "Bottom", ph: "px" },
        { key: "scale", label: "Scale", ph: "0.6" }
      ];
      // Extra fields — only shown if they have values (from JSON import)
      const extraDefs = [
        { key: "fontSize", label: "Font", ph: "px" },
        { key: "targetWidth", label: "Width", ph: "px" },
        { key: "opacity", label: "Opacity", ph: "0-1" },
        { key: "bgPositionX", label: "BgX%", ph: "%" },
        { key: "bgPositionY", label: "BgY%", ph: "%" },
        { key: "gradientAngle", label: "GradAng", ph: "deg" }
      ];
      const allDefs = baseDefs.concat(extraDefs.filter(f => rule[f.key] !== undefined && rule[f.key] !== ""));
      allDefs.forEach(f => {
        const wrap = document.createElement("div");
        wrap.className = "rule-field-item";
        const lbl = document.createElement("label");
        lbl.textContent = f.label;
        wrap.appendChild(lbl);
        wrap.appendChild(createRuleInput(rule[f.key] ?? "", f.ph, sizeKey, idx, f.key));
        fields.appendChild(wrap);
      });
      card.appendChild(fields);
      body.appendChild(card);
    });

    // Add layer button
    const addBtn = document.createElement("button");
    addBtn.className = "add-layer-btn";
    addBtn.textContent = "+ Add Layer";
    addBtn.addEventListener("click", () => {
      rules.push({ name: "", top: "", left: "", right: "", bottom: "", scale: "" });
      saveLayerRules();
      renderSizeGroups();
    });
    body.appendChild(addBtn);

    group.appendChild(body);
    sizeGroupsContainer.appendChild(group);
  });
}

// ─── Import JSON ───

const importJsonBtn = document.getElementById("importJsonBtn");
const importInfoCard = document.getElementById("importInfoCard");
const importModuleName = document.getElementById("importModuleName");
const importSizeCount = document.getElementById("importSizeCount");

function stripUnit(val) {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  // Remove px, %, etc.
  return s.replace(/(px|%|em|rem|pt)$/i, "").trim();
}

function isValidValue(val) {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  if (s === "" || s === "auto" || s === "none" || s === "-1") return false;
  const num = Number(stripUnit(s));
  return !isNaN(num);
}

// Size fields ("0px" → treat as placeholder, not a real value)
function isValidSize(val) {
  if (!isValidValue(val)) return false;
  return parseNumericValue(val) > 0;
}

function parseNumericValue(val) {
  if (val === undefined || val === null) return NaN;
  return parseFloat(stripUnit(String(val)));
}

function cssDirectionToAngle(dir) {
  const map = {
    "to top": 0,
    "to right": 90,
    "to bottom": 180,
    "to left": 270,
    "to top right": 45,
    "to bottom right": 135,
    "to bottom left": 225,
    "to top left": 315
  };
  return map[(dir || "").toLowerCase()] ?? null;
}

// Store raw JSON for runtime scale computation (so we can pick base size based on PSD source)
let importedJson = null;

// Find the JSON size that matches PSD source (or closest by area)
function findBaseSizeFromJson(srcW, srcH) {
  if (!importedJson || !importedJson.sizes) return null;
  // Exact match by dimensions
  const exact = importedJson.sizes.find(s => s.width === srcW && s.height === srcH);
  if (exact) return exact;
  // Exact match by name "WxH"
  const nameMatch = importedJson.sizes.find(s => s.name === `${srcW}x${srcH}`);
  if (nameMatch) return nameMatch;
  // Fallback: largest size
  return importedJson.sizes.reduce((a, b) => (a.width * a.height >= b.width * b.height) ? a : b);
}

// Compute scale for a rule using base size from PSD source
function computeRuleScale(rule, baseSize) {
  if (!baseSize || !baseSize.elements) return null;
  const baseElem = baseSize.elements[rule.name];
  if (!baseElem) return null;

  const isTextOnly = TEXT_ONLY_ELEMENTS.has((rule.name || "").toLowerCase());

  // Priority: widthElement > heightElement (skip for text-only) > fontSize > width
  if (rule._widthElement !== undefined && isValidValue(baseElem.widthElement)) {
    const baseW = parseNumericValue(baseElem.widthElement);
    if (baseW > 0) return rule._widthElement / baseW;
  }
  if (!isTextOnly && rule._heightElement !== undefined && isValidValue(baseElem.heightElement)) {
    const baseH = parseNumericValue(baseElem.heightElement);
    if (baseH > 0) return rule._heightElement / baseH;
  }
  if (rule._fontSize !== undefined && isValidValue(baseElem.fontSize)) {
    const baseF = parseNumericValue(baseElem.fontSize);
    if (baseF > 0) return rule._fontSize / baseF;
  }
  if (rule._widthRaw !== undefined && isValidValue(baseElem.width)) {
    const baseW = parseNumericValue(baseElem.width);
    if (baseW > 0) return rule._widthRaw / baseW;
  }
  return null;
}

// Text-only layer names — heightElement is unreliable for these (often constant 24px)
const TEXT_ONLY_ELEMENTS = new Set(["headline", "tagline", "subheadline", "subline", "title", "subtitle"]);

function parseJsonToRules(json) {
  const rules = {};
  if (!json.sizes || !Array.isArray(json.sizes)) return rules;

  importedJson = json;

  for (const size of json.sizes) {
    const sizeKey = size.name || `${size.width}x${size.height}`;
    rules[sizeKey] = [];

    if (!size.elements) continue;
    for (const [elemName, elem] of Object.entries(size.elements)) {
      const rule = { name: elemName };

      // Position fields — strip "px", skip "auto"/"none"
      rule.top = isValidValue(elem.top) ? String(parseNumericValue(elem.top)) : "";
      rule.left = isValidValue(elem.left) ? String(parseNumericValue(elem.left)) : "";
      rule.right = isValidValue(elem.right) ? String(parseNumericValue(elem.right)) : "";
      rule.bottom = isValidValue(elem.bottom) ? String(parseNumericValue(elem.bottom)) : "";

      // Scale — store raw values; computed at clone time using PSD source size as base
      if (isValidValue(elem.scale)) {
        rule.scale = String(parseNumericValue(elem.scale));
      } else {
        rule.scale = "";
      }
      // Store raw measurements for runtime scale computation
      // Use isValidSize() for dimensions — "0px" is a placeholder, not a real size
      if (isValidSize(elem.widthElement)) rule._widthElement = parseNumericValue(elem.widthElement);
      if (isValidSize(elem.heightElement)) rule._heightElement = parseNumericValue(elem.heightElement);
      if (isValidSize(elem.fontSize)) rule._fontSize = parseNumericValue(elem.fontSize);
      if (isValidSize(elem.width)) rule._widthRaw = parseNumericValue(elem.width);
      if (isValidSize(elem.height)) rule._heightRaw = parseNumericValue(elem.height);

      // Background position (% based) — positionX/positionY
      if (isValidValue(elem.positionX)) rule.bgPositionX = String(parseNumericValue(elem.positionX));
      if (isValidValue(elem.positionY)) rule.bgPositionY = String(parseNumericValue(elem.positionY));

      // Opacity — direct field
      if (isValidValue(elem.opacity)) rule.opacity = String(elem.opacity);

      // Color — "R, G, B" string
      if (elem.color && elem.color !== "auto" && elem.color !== "none") rule.color = elem.color;

      // Gradient direction — CSS syntax → angle
      if (elem.direction) {
        const angle = cssDirectionToAngle(elem.direction);
        if (angle !== null) rule.gradientAngle = String(angle);
      }

      // maxWidth
      if (isValidValue(elem.maxWidth)) rule.maxWidth = String(parseNumericValue(elem.maxWidth));

      // paddingX/paddingY (stored for potential future use)
      if (isValidValue(elem.paddingX)) rule.paddingX = String(parseNumericValue(elem.paddingX));
      if (isValidValue(elem.paddingY)) rule.paddingY = String(parseNumericValue(elem.paddingY));

      rules[sizeKey].push(rule);
    }
  }
  return rules;
}

async function importJson() {
  try {
    const file = await fs.getFileForOpening({ types: ["json"] });
    if (!file) { log("Import cancelled."); return; }

    const contents = await file.read();
    const json = JSON.parse(contents);

    // Parse and populate layerRules
    layerRules = parseJsonToRules(json);
    saveLayerRules();

    // Auto-fill Target Sizes in Documents tab
    if (json.sizes && json.sizes.length > 0) {
      const sizeStrings = json.sizes.map(s => s.name || `${s.width}x${s.height}`);
      sizesInput.value = sizeStrings.join(" ");
      renderPresets();
    }

    // Show import info
    importInfoCard.style.display = "block";
    importModuleName.textContent = json.moduleName || "Unknown";
    importSizeCount.textContent = `${json.sizes ? json.sizes.length : 0} sizes`;

    // Re-render settings
    renderSizeGroups();

    log(`[IMPORT] Loaded "${json.moduleName || "unknown"}" — ${Object.keys(layerRules).length} sizes`);
    for (const [sizeKey, rules] of Object.entries(layerRules)) {
      log(`[IMPORT]   ${sizeKey}: ${rules.length} elements (${rules.map(r => r.name).join(", ")})`);
    }
    updateJsonStatus();
  } catch (e) {
    log(`[IMPORT] Error: ${e.message}`);
  }
}

importJsonBtn.addEventListener("click", importJson);

// ─── Apply Rules to Existing Artboards ───

const applyRulesBtn = document.getElementById("applyRulesBtn");

async function applyRulesToExisting() {
  const ruleKeys = Object.keys(layerRules);
  if (!ruleKeys.length) { log("[APPLY] No layer rules loaded. Import JSON first."); return; }

  applyRulesBtn.disabled = true;
  applyRulesBtn.textContent = "Applying...";
  try {
    await core.executeAsModal(async () => {
      const doc = app.activeDocument;
      if (!doc) { log("[APPLY] No document open."); return; }

      // Find all artboards
      const artboards = [];
      for (const layer of doc.layers) {
        const desc = await getLayerDescriptor(layer.id);
        if (desc.artboardEnabled || desc.artboard) {
          const rect = desc.artboard?.artboardRect || desc.bounds;
          const size = rectSize(rect);
          artboards.push({ layer, size, name: layer.name });
        }
      }
      if (!artboards.length) { log("[APPLY] No artboards found."); return; }

      // Determine source size (largest artboard or base from JSON)
      let srcW = 0, srcH = 0;
      if (importedJson && importedJson.sizes && importedJson.sizes.length) {
        const largest = importedJson.sizes.reduce((a, b) => (a.width * a.height >= b.width * b.height) ? a : b);
        srcW = largest.width;
        srcH = largest.height;
      } else {
        const largest = artboards.reduce((a, b) => (a.size.width * a.size.height >= b.size.width * b.size.height) ? a : b);
        srcW = largest.size.width;
        srcH = largest.size.height;
      }
      log(`[APPLY] Source size: ${srcW}x${srcH}`);

      let applied = 0;
      for (let i = 0; i < artboards.length; i++) {
        const ab = artboards[i];
        // Extract size key from artboard name (e.g. "Banner_1280x900" → "1280x900")
        const sizeMatch = ab.name.match(/(\d+x\d+)/i);
        const sizeKey = sizeMatch ? sizeMatch[1] : `${ab.size.width}x${ab.size.height}`;

        const rules = layerRules[sizeKey];
        if (!rules || !rules.length) {
          log(`[APPLY] ${ab.name}: no rules for "${sizeKey}", skip`);
          continue;
        }

        log(`[APPLY] ${i + 1}/${artboards.length}: ${ab.name} → ${sizeKey} (${rules.length} rules)`);

        const origBounds = await captureOriginalBounds(ab.layer);
        const originX = ab.size.left;
        const originY = ab.size.top;

        await applyLayerRules(ab.layer, sizeKey, ab.size.width, ab.size.height, originX, originY, origBounds, srcW, srcH);
        applied++;
      }

      log(`[APPLY] === Done: ${applied}/${artboards.length} artboard(s) updated ===`);
    }, { commandName: "Banner Cloner - Apply Rules" });
  } catch (e) {
    log(`[APPLY] Error: ${e.message}`);
  } finally {
    applyRulesBtn.disabled = false;
    applyRulesBtn.textContent = "Apply Rules to Existing";
  }
}

applyRulesBtn.addEventListener("click", applyRulesToExisting);

// ─── Export Layer JSON ───

const exportLayerJsonBtn = document.getElementById("exportLayerJsonBtn");

async function readTextStyle(layerId) {
  try {
    const desc = await getLayerDescriptor(layerId);
    const textKey = desc.textKey;
    if (!textKey || !textKey.textStyleRange || !textKey.textStyleRange.length) return null;
    const style = textKey.textStyleRange[0]?.textStyle;
    if (!style) return null;

    const sizePt = style.size?._value || 0;

    // Apply text transform scale (PS Character panel shows scaled size)
    let scale = 1;
    const tx = textKey.transform;
    if (tx) {
      const yy = tx.yy?._value ?? tx.yy ?? 1;
      scale = Math.abs(yy);
    }

    const result = { fontSize: Math.round(sizePt * scale * 100) / 100 + "px" };

    if (style.fontName) result.fontFamily = style.fontName;
    if (style.fontStyleName) result.fontWeight = style.fontStyleName;

    // Leading (line-height)
    if (style.leading?._value) {
      result.lineHeight = Math.round(style.leading._value * scale * 100) / 100 + "px";
    }

    // Tracking (letter-spacing)
    if (style.tracking !== undefined && style.tracking !== 0) {
      result.tracking = style.tracking;
    }

    // Color
    const c = style.color;
    if (c) {
      const r = Math.round(c.red?._value ?? c.red ?? 0);
      const g = Math.round(c.green?._value ?? c.green ?? 0);
      const b = Math.round(c.blue?._value ?? c.blue ?? 0);
      result.color = `${r}, ${g}, ${b}`;
    }

    // Font caps → textTransform
    if (style.fontCaps?._value) {
      const caps = style.fontCaps._value;
      if (caps === "allCaps") result.textTransform = "uppercase";
      else if (caps === "smallCaps") result.textTransform = "smallCaps";
    } else if (style.fontCaps && style.fontCaps !== "normal") {
      result.textTransform = String(style.fontCaps);
    }

    // Text content
    if (textKey.textKey) result.content = textKey.textKey;

    // Text alignment
    const paraRange = textKey.paragraphStyleRange;
    if (paraRange && paraRange.length > 0) {
      const paraStyle = paraRange[0]?.paragraphStyle;
      if (paraStyle?.align?._value) {
        result.alignment = paraStyle.align._value;
      } else if (paraStyle?.align) {
        result.alignment = String(paraStyle.align);
      }
    }

    return result;
  } catch (e) { return null; }
}

function readFillColor(desc) {
  try {
    const adj = desc.adjustment;
    if (!adj || !adj.length) return null;
    const c = adj[0]?.color;
    if (!c) return null;
    const r = Math.round(c.red?._value ?? c.red ?? 0);
    const g = Math.round(c.green?._value ?? c.green ?? 0);
    const b = Math.round(c.blue?._value ?? c.blue ?? 0);
    return `${r}, ${g}, ${b}`;
  } catch (e) { return null; }
}

function readGradient(desc) {
  try {
    const adj = desc.adjustment;
    if (!adj || !adj.length) return null;
    const grad = adj[0]?.gradient;
    if (!grad) return null;
    const result = {};
    if (grad.name) result.name = grad.name;
    // Type (linear, radial, etc.)
    if (adj[0].type?._value) result.type = adj[0].type._value;
    else if (adj[0].type) result.type = String(adj[0].type);
    // Angle
    if (adj[0].angle?._value !== undefined) result.angle = adj[0].angle._value;
    // Color stops
    const colors = grad.colors;
    if (colors && colors.length) {
      result.stops = colors.map(stop => {
        const c = stop.color;
        const r = Math.round(c?.red?._value ?? c?.red ?? 0);
        const g = Math.round(c?.grain?._value ?? c?.grain ?? c?.green?._value ?? c?.green ?? 0);
        const b = Math.round(c?.blue?._value ?? c?.blue ?? 0);
        return {
          color: `${r}, ${g}, ${b}`,
          location: stop.location ?? 0
        };
      });
    }
    return result;
  } catch (e) { return null; }
}

function readLayerEffects(desc) {
  try {
    const fx = desc.layerEffects;
    if (!fx) return null;
    const result = {};
    // Drop Shadow
    if (fx.dropShadow) {
      const ds = fx.dropShadow;
      result.dropShadow = {
        enabled: ds.enabled !== false,
        opacity: ds.opacity?._value ?? ds.opacity,
        angle: ds.localLightingAngle?._value ?? ds.localLightingAngle,
        distance: ds.distance?._value ?? ds.distance,
        spread: ds.chokeMatte?._value ?? ds.chokeMatte,
        size: ds.blur?._value ?? ds.blur
      };
      const c = ds.color;
      if (c) {
        const r = Math.round(c.red?._value ?? c.red ?? 0);
        const g = Math.round(c.green?._value ?? c.green ?? 0);
        const b = Math.round(c.blue?._value ?? c.blue ?? 0);
        result.dropShadow.color = `${r}, ${g}, ${b}`;
      }
    }
    // Inner Shadow
    if (fx.innerShadow) {
      const is = fx.innerShadow;
      result.innerShadow = {
        enabled: is.enabled !== false,
        opacity: is.opacity?._value ?? is.opacity,
        angle: is.localLightingAngle?._value ?? is.localLightingAngle,
        distance: is.distance?._value ?? is.distance,
        size: is.blur?._value ?? is.blur
      };
    }
    // Stroke
    if (fx.frameFX) {
      const st = fx.frameFX;
      result.stroke = {
        enabled: st.enabled !== false,
        size: st.size?._value ?? st.size,
        position: st.style?._value ?? st.style,
        opacity: st.opacity?._value ?? st.opacity
      };
      const c = st.color;
      if (c) {
        const r = Math.round(c.red?._value ?? c.red ?? 0);
        const g = Math.round(c.green?._value ?? c.green ?? 0);
        const b = Math.round(c.blue?._value ?? c.blue ?? 0);
        result.stroke.color = `${r}, ${g}, ${b}`;
      }
    }
    // Outer Glow
    if (fx.outerGlow) {
      const og = fx.outerGlow;
      result.outerGlow = {
        enabled: og.enabled !== false,
        opacity: og.opacity?._value ?? og.opacity,
        size: og.blur?._value ?? og.blur
      };
    }
    // Inner Glow
    if (fx.innerGlow) {
      const ig = fx.innerGlow;
      result.innerGlow = {
        enabled: ig.enabled !== false,
        opacity: ig.opacity?._value ?? ig.opacity,
        size: ig.blur?._value ?? ig.blur
      };
    }
    // Gradient Overlay
    if (fx.gradientFill) {
      const gf = fx.gradientFill;
      result.gradientOverlay = {
        enabled: gf.enabled !== false,
        opacity: gf.opacity?._value ?? gf.opacity,
        angle: gf.angle?._value ?? gf.angle,
        type: gf.type?._value ?? gf.type,
        reverse: gf.reverse ?? false,
        scale: gf.scale?._value ?? gf.scale
      };
      const grad = gf.gradient;
      if (grad) {
        if (grad.name) result.gradientOverlay.name = grad.name;
        const colors = grad.colors;
        if (colors && colors.length) {
          result.gradientOverlay.stops = colors.map(stop => {
            const c = stop.color;
            const r = Math.round(c?.red?._value ?? c?.red ?? 0);
            const g = Math.round(c?.grain?._value ?? c?.grain ?? c?.green?._value ?? c?.green ?? 0);
            const b = Math.round(c?.blue?._value ?? c?.blue ?? 0);
            return {
              color: `${r}, ${g}, ${b}`,
              location: stop.location ?? 0
            };
          });
        }
      }
    }
    // Color Overlay
    if (fx.solidFill) {
      const sf = fx.solidFill;
      result.colorOverlay = {
        enabled: sf.enabled !== false,
        opacity: sf.opacity?._value ?? sf.opacity,
        blendMode: sf.mode?._value ?? sf.mode
      };
      const c = sf.color;
      if (c) {
        const r = Math.round(c.red?._value ?? c.red ?? 0);
        const g = Math.round(c.green?._value ?? c.green ?? 0);
        const b = Math.round(c.blue?._value ?? c.blue ?? 0);
        result.colorOverlay.color = `${r}, ${g}, ${b}`;
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (e) { return null; }
}

function readBorderRadius(desc) {
  try {
    const origins = desc.keyOriginType;
    if (!origins || !origins.length) return null;
    for (const origin of origins) {
      const radii = origin.keyOriginRRectRadii;
      if (radii) {
        const val = (v) => Math.round((v?._value ?? v ?? 0) * 100) / 100;
        const tl = val(radii.topLeft);
        const tr = val(radii.topRight);
        const bl = val(radii.bottomLeft);
        const br = val(radii.bottomRight);
        if (tl === 0 && tr === 0 && bl === 0 && br === 0) return null;
        if (tl === tr && tr === bl && bl === br) return tl;
        return { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br };
      }
    }
    return null;
  } catch (e) { return null; }
}

function readTransform(desc) {
  try {
    const tx = desc.textKey?.transform || desc.transform;
    if (!tx) return null;
    const val = (v) => v?._value ?? v;
    return {
      xx: val(tx.xx), xy: val(tx.xy),
      yx: val(tx.yx), yy: val(tx.yy),
      tx: val(tx.tx), ty: val(tx.ty)
    };
  } catch (e) { return null; }
}

async function collectLayerInfo(layer, artLeft, artTop) {
  const info = { name: layer.name, kind: layer.kind || "unknown" };

  // Visible
  info.visible = layer.visible !== false;

  const isGroup = layer.layers && layer.layers.length > 0;

  // Bounds
  try {
    const bounds = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
    info.bounds = {
      top: Math.round(bounds.top - artTop),
      left: Math.round(bounds.left - artLeft),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    };
  } catch (e) {
    log(`[EXPORT JSON] Warning: cannot read bounds for "${layer.name}": ${e.message}`);
  }

  // Opacity & blend mode
  try {
    if (layer.opacity !== undefined) info.opacity = Math.round(layer.opacity * 100) / 100;
    if (layer.blendMode) info.blendMode = layer.blendMode;
  } catch (e) {
    log(`[EXPORT JSON] Warning: cannot read opacity/blendMode for "${layer.name}": ${e.message}`);
  }

  // Layer descriptor (for extra properties)
  let desc = null;
  if (!isGroup) {
    try { desc = await getLayerDescriptor(layer.id); } catch (e) {}
  }

  // Text properties
  if (isTextLayer(layer)) {
    const textStyle = await readTextStyle(layer.id);
    if (textStyle) info.text = textStyle;
  }

  // Fill color (solidColor layers)
  if (desc && (layer.kind === "solidColor" || layer.kind === "solidFill")) {
    const fill = readFillColor(desc);
    if (fill) info.fillColor = fill;
  }

  // Gradient (gradientFill layers)
  if (desc && (layer.kind === "gradientFill" || layer.kind === "gradient")) {
    const grad = readGradient(desc);
    if (grad) info.gradient = grad;
  }

  // Border radius (shape layers)
  if (desc) {
    const radius = readBorderRadius(desc);
    if (radius !== null) info.borderRadius = radius;
  }

  // Layer effects
  if (desc) {
    const fx = readLayerEffects(desc);
    if (fx) info.layerEffects = fx;
  }

  // Transform
  if (desc) {
    const tx = readTransform(desc);
    if (tx) info.transform = tx;
  }

  // Children (recursive)
  if (layer.layers && layer.layers.length > 0) {
    info.children = [];
    for (const child of layer.layers) {
      info.children.push(await collectLayerInfo(child, artLeft, artTop));
    }
  }

  return info;
}

async function exportLayerJson() {
  try {
    const doc = app.activeDocument;
    if (!doc) { log("[EXPORT JSON] No document open."); return; }

    const artboards = await resolveSelectedArtboards();
    log(`[EXPORT JSON] Exporting ${artboards.length} artboard(s)`);

    const allArtboards = [];
    for (let i = 0; i < artboards.length; i++) {
      const ab = artboards[i];
      log(`[EXPORT JSON] Reading ${i + 1}/${artboards.length}: ${ab.name} (${ab.size.width}x${ab.size.height})`);

      const layers = [];
      for (const child of ab.layer.layers) {
        layers.push(await collectLayerInfo(child, ab.size.left, ab.size.top));
      }

      allArtboards.push({
        artboard: ab.name,
        width: ab.size.width,
        height: ab.size.height,
        layers: layers
      });
    }

    const json = allArtboards.length === 1 ? allArtboards[0] : allArtboards;
    const fileName = allArtboards.length === 1
      ? allArtboards[0].artboard + "_layers.json"
      : doc.name.replace(/\.[^.]+$/, "") + "_layers.json";

    // Save to file
    const file = await fs.getFileForSaving(fileName, { types: ["json"] });
    if (!file) { log("[EXPORT JSON] Cancelled."); return; }

    await file.write(JSON.stringify(json, null, 2));
    log(`[EXPORT JSON] Saved ${allArtboards.length} artboard(s) to: ${file.name}`);
  } catch (e) {
    log(`[EXPORT JSON] Error: ${e.message}`);
  }
}

exportLayerJsonBtn.addEventListener("click", exportLayerJson);

// ─── Export Assets ───

function isImageLayerForAssets(layer) {
  if (!layer) return false;
  const k = layer.kind;
  return k === "pixel" || k === "smartObject";
}

function getIgnoreKeywords() {
  return (ignoreLayerInput.value || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function isIgnoredLayer(name, keywords) {
  if (!keywords.length) return false;
  const lower = name.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

async function resolveSelectedArtboards() {
  const doc = app.activeDocument;
  if (!doc) throw new Error("No document open.");

  await ensureArtboardPickerLoaded();

  const selectedIds = artboardPickerSelected;
  if (!selectedIds.size) throw new Error("No artboards selected. Tick at least one in the Artboards picker.");

  const artboards = [];
  for (const layer of doc.layers) {
    if (!selectedIds.has(layer.id)) continue;
    const desc = await getLayerDescriptor(layer.id);
    if (!desc.artboardEnabled && !desc.artboard) continue;
    const rect = desc.artboard?.artboardRect || desc.bounds;
    artboards.push({ id: layer.id, name: layer.name, layer, rect, size: rectSize(rect) });
  }
  if (!artboards.length) throw new Error("Selected artboards not found in document — click Refresh in Artboards picker.");
  return artboards;
}

async function scanArtboardImages() {
  try {
    const artboards = await resolveSelectedArtboards();
    scannedArtboards = artboards;
    log(`[ASSETS] Scanning ${artboards.length} artboard(s)`);

    const ignoreKws = getIgnoreKeywords();
    if (ignoreKws.length) log(`[ASSETS] Ignoring: ${ignoreKws.join(", ")}`);

    scannedAssets = [];
    for (const source of artboards) {
      log(`[ASSETS] Scanning: ${source.name} (${source.size.width}x${source.size.height})`);

      const images = [];
      function walk(layer) {
        if (isIgnoredLayer(layer.name, ignoreKws)) {
          log(`[ASSETS] Ignored: ${layer.name}${layer.layers && layer.layers.length ? " (group)" : ""}`);
          return;
        }
        // Skip hidden layer/group — subtree không render ra canvas, không cần export
        if (layer.visible === false) {
          log(`[ASSETS] Skipped hidden: ${layer.name}${layer.layers && layer.layers.length ? " (group)" : ""}`);
          return;
        }
        if (layer.layers && layer.layers.length > 0) {
          for (const child of layer.layers) walk(child);
        } else if (isImageLayerForAssets(layer)) {
          images.push(layer);
        }
      }
      for (const child of source.layer.layers) walk(child);

      for (const img of images) {
        const bounds = await getLayerBounds(img.id);
        if (bounds.width === 0 || bounds.height === 0) continue;

        let defaultType = "PNG";
        let isVector = false;
        try {
          if (img.kind === "smartObject") {
            const desc = await getLayerDescriptor(img.id);
            const fileRef = desc.smartObjectMore?.fileReference;
            if (fileRef && /\.jpe?g$/i.test(fileRef)) defaultType = "JPG";
            isVector = await isVectorSmartObject(img.id);
          }
        } catch (e) {}

        const defaultSizeMode = (img.kind === "smartObject" && !isVector) ? "D" : "A";
        scannedAssets.push({
          layerId: img.id,
          layerName: img.name,
          exportName: img.name,
          kind: img.kind,
          isVector,
          sizeMode: defaultSizeMode,
          scale: 2,
          type: defaultType,
          bounds: bounds,
          artboardRect: source.size
        });
      }
    }

    // Deduplicate by name — keep largest bounds
    const nameMap = new Map();
    for (const asset of scannedAssets) {
      const key = asset.exportName;
      const area = asset.bounds.width * asset.bounds.height;
      const existing = nameMap.get(key);
      if (!existing || area > existing.area) {
        nameMap.set(key, { asset, area });
      }
    }
    const before = scannedAssets.length;
    scannedAssets = [...nameMap.values()].map(v => v.asset);
    if (before > scannedAssets.length) {
      log(`[ASSETS] Deduplicated: ${before} → ${scannedAssets.length} (kept largest)`);
    }

    log(`[ASSETS] Found ${scannedAssets.length} image layer(s) across ${artboards.length} artboard(s)`);
    renderAssetList();
  } catch (e) {
    log(`[ASSETS] Error: ${e.message}`);
  }
}

function createAssetCycleBtn(label, options, currentValue, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "asset-field-item";
  const lbl = document.createElement("label");
  lbl.textContent = label;
  wrap.appendChild(lbl);
  let idx = options.findIndex(o => o.value === currentValue);
  if (idx < 0) idx = 0;
  const btn = document.createElement("button");
  btn.className = "asset-cycle-btn";
  btn.textContent = options[idx].label;
  // Tooltip shows all options + descriptions, with current marked
  const buildTooltip = (curIdx) => options.map((o, i) =>
    `${i === curIdx ? "● " : "  "}${o.label}${o.tooltip ? " — " + o.tooltip : ""}`
  ).join("\n");
  const hasTooltip = options.some(o => o.tooltip);
  if (hasTooltip) {
    btn.addEventListener("mouseenter", () => {
      showCustomTooltipNearButton(buildTooltip(idx), btn);
    });
    btn.addEventListener("mouseleave", () => hideCustomTooltip());
  }
  btn.addEventListener("click", () => {
    idx = (idx + 1) % options.length;
    btn.textContent = options[idx].label;
    onChange(options[idx].value);
  });
  wrap.appendChild(btn);
  return wrap;
}

// ─── Custom tooltip (UXP doesn't support native title attribute) ───
let _tooltipEl = null;
function ensureTooltipEl() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement("div");
    _tooltipEl.id = "customTooltip";
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}
function showCustomTooltip(text) {
  const el = ensureTooltipEl();
  el.textContent = text;
  el.style.display = "block";
}
function showCustomTooltipNearButton(text, anchorEl) {
  const el = ensureTooltipEl();
  el.textContent = text;
  // Reset to measure natural size
  el.style.left = "-9999px";
  el.style.top = "-9999px";
  el.style.display = "block";
  void el.offsetWidth;
  const pad = 8;
  const gap = 50;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const r = anchorEl.getBoundingClientRect();
  // Prefer ABOVE the button (avoids overlapping inputs below, which tend to bleed through in UXP)
  let top = r.top - h - gap;
  if (top < pad) {
    // Fallback: place below the button
    top = r.bottom + gap;
    // If still overflow bottom, clamp
    if (top + h + pad > vh) top = Math.max(pad, vh - h - pad);
  }
  // Align left edge with button, clamp inside viewport
  let left = r.left;
  if (left + w + pad > vw) left = vw - w - pad;
  if (left < pad) left = pad;
  el.style.left = left + "px";
  el.style.top = top + "px";
}
function hideCustomTooltip() {
  if (_tooltipEl) _tooltipEl.style.display = "none";
}

function getAssetFilenameKey(asset) {
  const safeName = (asset.exportName || "").replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "-").toLowerCase();
  const ext = asset.type === "JPG" ? "jpg" : "png";
  return `${safeName}.${ext}`;
}

function computeAssetCollisions() {
  const counts = new Map();
  for (const a of scannedAssets) {
    const k = getAssetFilenameKey(a);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const dupes = new Set();
  for (const [k, n] of counts) if (n > 1) dupes.add(k);
  return dupes;
}

function renderAssetList() {
  while (imageListContainer.firstChild) imageListContainer.removeChild(imageListContainer.firstChild);

  if (scannedAssets.length === 0) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "No image layers found.";
    imageListContainer.appendChild(hint);
    exportAssetsAction.style.display = "none";
    assetSearchRow.style.display = "none";
    return;
  }

  exportAssetsAction.style.display = "";
  assetSearchRow.style.display = "";

  const collisions = computeAssetCollisions();
  const q = assetSearchQ.trim().toLowerCase();
  const filtered = q
    ? scannedAssets.filter(a => (a.exportName || "").toLowerCase().includes(q) || (a.layerName || "").toLowerCase().includes(q))
    : scannedAssets;

  if (q && !filtered.length) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = `No assets match "${q}". (Export vẫn áp dụng cho toàn bộ ${scannedAssets.length} asset.)`;
    imageListContainer.appendChild(hint);
    return;
  }

  filtered.forEach((asset) => {
    const card = document.createElement("div");
    card.className = "asset-row";
    if (asset.collapsed) card.classList.add("asset-row-collapsed");
    const isDupe = collisions.has(getAssetFilenameKey(asset));
    if (isDupe) card.classList.add("asset-row-duplicate");

    // Name input + kind badge + remove button
    const nameRow = document.createElement("div");
    nameRow.className = "asset-row-header";

    // Collapse toggle (chevron)
    const collapseBtn = document.createElement("button");
    collapseBtn.className = "asset-collapse-btn";
    collapseBtn.textContent = asset.collapsed ? "▸" : "▾";
    collapseBtn.title = asset.collapsed ? "Expand" : "Collapse";
    collapseBtn.addEventListener("click", () => {
      asset.collapsed = !asset.collapsed;
      renderAssetList();
    });
    nameRow.appendChild(collapseBtn);

    const nameInput = document.createElement("sp-textfield");
    nameInput.value = asset.exportName;
    nameInput.addEventListener("change", () => {
      asset.exportName = String(nameInput.value || "").trim() || asset.layerName;
      renderAssetList();
    });
    const kindBadge = document.createElement("span");
    kindBadge.className = "asset-kind-badge";
    kindBadge.textContent = asset.kind === "smartObject" ? "Smart" : "Pixel";

    // Show button — select layer in PS Layers panel để user biết đang nói layer nào
    const showBtn = document.createElement("button");
    showBtn.className = "asset-show-btn";
    showBtn.textContent = "Show";
    showBtn.title = `Select "${asset.layerName}" in Photoshop Layers panel`;
    showBtn.addEventListener("click", async () => {
      try {
        await core.executeAsModal(async () => {
          await selectLayerById(asset.layerId);
        }, { commandName: "Show layer" });
      } catch (e) {
        log(`[ASSETS] Show failed: ${e.message}`);
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-rule-btn";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      scannedAssets.splice(scannedAssets.indexOf(asset), 1);
      renderAssetList();
    });
    nameRow.appendChild(nameInput);
    nameRow.appendChild(kindBadge);
    nameRow.appendChild(showBtn);
    if (isDupe) {
      const dupBadge = document.createElement("span");
      dupBadge.className = "asset-dupe-badge";
      dupBadge.textContent = "DUPLICATE";
      dupBadge.title = `File name "${getAssetFilenameKey(asset)}" trùng với asset khác — sẽ ghi đè khi export`;
      nameRow.appendChild(dupBadge);
    }
    nameRow.appendChild(removeBtn);
    card.appendChild(nameRow);

    // Dropdowns row
    const fieldsRow = document.createElement("div");
    fieldsRow.className = "asset-row-fields";

    const sizeOptions = [
      { value: "A", label: "A - Original", tooltip: "Full layer bounds (including parts outside artboard)" },
      { value: "B", label: "B - Clipped", tooltip: "Cut to artboard (only the visible portion inside the artboard)" },
      { value: "C", label: "C - Bounds", tooltip: "Layer bounds + auto-trim transparent edges (tightest fit)" }
    ];
    if (asset.kind === "smartObject" && !asset.isVector) {
      sizeOptions.push({ value: "D", label: "D - Embedded", tooltip: "Original embedded image inside the Smart Object (highest resolution)" });
    }
    // If asset was previously set to D but is now vector, fall back to A
    if (asset.sizeMode === "D" && !sizeOptions.some(o => o.value === "D")) {
      asset.sizeMode = "A";
    }
    fieldsRow.appendChild(createAssetCycleBtn("Size", sizeOptions, asset.sizeMode, (v) => { asset.sizeMode = v; }));

    fieldsRow.appendChild(createAssetCycleBtn("Scale", [
      { value: "1", label: "1x" },
      { value: "2", label: "2x" },
      { value: "3", label: "3x" }
    ], String(asset.scale), (v) => { asset.scale = parseInt(v); }));

    fieldsRow.appendChild(createAssetCycleBtn("Type", [
      { value: "PNG", label: "PNG" },
      { value: "JPG", label: "JPG" }
    ], asset.type, (v) => { asset.type = v; renderAssetList(); }));

    // Per-asset export button (same row, last position)
    const exportWrap = document.createElement("div");
    exportWrap.className = "asset-field-item asset-export-item";
    const exportLbl = document.createElement("label");
    exportLbl.textContent = "\u00A0";
    exportWrap.appendChild(exportLbl);
    const exportOneBtn = document.createElement("button");
    exportOneBtn.className = "primary export-all-btn asset-export-one-btn";
    exportOneBtn.textContent = "Export";
    exportOneBtn.addEventListener("click", () => exportSingleAsset(asset));
    exportWrap.appendChild(exportOneBtn);
    fieldsRow.appendChild(exportWrap);

    if (!asset.collapsed) card.appendChild(fieldsRow);
    imageListContainer.appendChild(card);
  });
}

function toggleAllAssetsCollapsed(collapsed) {
  for (const a of scannedAssets) a.collapsed = collapsed;
  renderAssetList();
}

// Create a timestamped subfolder inside a picked folder
async function createTimestampedSubfolder(parentFolder, label) {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const name = `${label}-${ts}`;
  return await parentFolder.createFolder(name);
}

async function exportSingleAsset(asset) {
  const parent = await fs.getFolder();
  if (!parent) { log("[ASSETS] Export cancelled."); return; }

  const safeAsset = asset.exportName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "-");
  const subfolder = await createTimestampedSubfolder(parent, `assets-${safeAsset}`);
  log(`[ASSETS] Output: ${subfolder.name}/`);

  const backup = scannedAssets;
  scannedAssets = [asset];
  try {
    await runExportAssetsFlow(subfolder, { writeLayersJson: false });
  } finally {
    scannedAssets = backup;
  }
}

function computeIntersection(layerBounds, artboardRect) {
  const left = Math.max(layerBounds.left, artboardRect.left);
  const top = Math.max(layerBounds.top, artboardRect.top);
  const right = Math.min(layerBounds.right, artboardRect.right);
  const bottom = Math.min(layerBounds.bottom, artboardRect.bottom);
  return {
    left, top, right, bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

async function getSmartObjectOriginalSize(layerId) {
  // Try opening SO contents to read original doc size
  await selectLayerById(layerId);
  await bp([{ _obj: "placedLayerEditContents", _options: { dialogOptions: "dontDisplay" } }]);
  const soDoc = app.activeDocument;
  const w = soDoc.width;
  const h = soDoc.height;
  await bp([{ _obj: "close", saving: { _enum: "yesNo", _value: "no" }, _options: { dialogOptions: "dontDisplay" } }]);
  return { width: w, height: h };
}

// Save active document as PNG or JPG to a folder using UXP photoshop API
async function saveActiveDocAs(folder, filename, type) {
  // Cap width at 3000px (maintain aspect ratio)
  const maxW = 3000;
  const curW = app.activeDocument.width;
  if (curW > maxW) {
    const ratio = maxW / curW;
    const newH = Math.round(app.activeDocument.height * ratio);
    await resizeImage(maxW, newH, true);
    log(`Resized ${filename}: ${curW}px → ${maxW}px (h=${newH})`);
  }

  const file = await folder.createFile(filename, { overwrite: true });
  const doc = app.activeDocument;
  const finalW = doc.width;
  const finalH = doc.height;
  if (type === "JPG") {
    await doc.saveAs.jpg(file, { quality: 8 }, true);
  } else {
    await doc.saveAs.png(file, { compression: 6 }, true);
  }
  let bytes = 0;
  try {
    const meta = await file.getMetadata();
    bytes = meta?.size || 0;
  } catch (e) { /* size optional */ }
  return { file, filename, width: finalW, height: finalH, bytes };
}

// Crop active document canvas to a rect (in current doc coords)
async function cropCanvasTo(left, top, right, bottom) {
  // Make a rectangular selection, then crop to it
  await bp([{
    _obj: "set",
    _target: [{ _ref: "channel", _property: "selection" }],
    to: {
      _obj: "rectangle",
      top: { _unit: "pixelsUnit", _value: top },
      left: { _unit: "pixelsUnit", _value: left },
      bottom: { _unit: "pixelsUnit", _value: bottom },
      right: { _unit: "pixelsUnit", _value: right }
    },
    _options: { dialogOptions: "dontDisplay" }
  }]);
  await bp([{
    _obj: "crop",
    delete: true,
    _options: { dialogOptions: "dontDisplay" }
  }]);
  // Deselect
  try {
    await bp([{
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: { _enum: "ordinal", _value: "none" },
      _options: { dialogOptions: "dontDisplay" }
    }]);
  } catch (e) {}
}

// Resize active document image
async function resizeImage(width, height, constrain) {
  await bp([{
    _obj: "imageSize",
    width: { _unit: "pixelsUnit", _value: width },
    height: { _unit: "pixelsUnit", _value: height },
    constrainProportions: !!constrain,
    interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// Walk all layers recursively
function walkAllLayers(layers, callback) {
  for (const l of layers) {
    callback(l);
    if (l.layers && l.layers.length) walkAllLayers(l.layers, callback);
  }
}

// Find layer by name in a tree
function findLayerByName(layers, name) {
  for (const l of layers) {
    if (l.name === name) return l;
    if (l.layers && l.layers.length) {
      const found = findLayerByName(l.layers, name);
      if (found) return found;
    }
  }
  return null;
}

// Check if SO is vector-based (would open Illustrator on Edit Contents)
async function isVectorSmartObject(layerId) {
  try {
    const desc = await getLayerDescriptor(layerId);
    const fileRefs = [
      desc.smartObjectMore?.fileReference || "",
      desc.smartObject?.fileReference || "",
      desc.smartObject?.link?.fileReference || ""
    ];
    const placedVals = [
      desc.smartObjectMore?.placed?._value || "",
      desc.smartObject?.placed?._value || ""
    ];
    const vectorExt = /\.(ai|eps|pdf|svg)$/i;
    if (fileRefs.some(f => vectorExt.test(f))) return true;
    if (placedVals.some(v => /vector/i.test(v))) return true;
    return false;
  } catch (e) {
    return false;
  }
}

async function exportAssets() {
  if (scannedAssets.length === 0) { log("[ASSETS] No assets to export."); return; }

  const parent = await fs.getFolder();
  if (!parent) { log("[ASSETS] Export cancelled."); return; }

  // Derive label from source doc name
  let label = "assets";
  try {
    const docName = (app.activeDocument.name || "assets").replace(/\.(psd|psb|jpg|jpeg|png|tif|tiff)$/i, "");
    label = `assets-${docName.replace(/[<>:"/\\|?*]/g, "_")}`;
  } catch (e) {}

  const subfolder = await createTimestampedSubfolder(parent, label);
  log(`[ASSETS] Output: ${subfolder.name}/`);

  await runExportAssetsFlow(subfolder);
}

async function runExportAssetsFlow(folder, { writeLayersJson = true } = {}) {
  const exportedAssets = [];
  await core.executeAsModal(async () => {
    const sourceDoc = app.activeDocument;
    const sourceDocId = sourceDoc.id;

    for (let i = 0; i < scannedAssets.length; i++) {
      const asset = scannedAssets[i];
      let tempDocId = null;

      try {
        log(`[ASSETS] (${i + 1}/${scannedAssets.length}) ${asset.exportName} — mode=${asset.sizeMode}, ${asset.scale}x, ${asset.type}`);

        // Filename
        const safeName = asset.exportName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "-").toLowerCase();
        const extLower = asset.type === "JPG" ? "jpg" : "png";
        const filename = `${safeName}.${extLower}`;

        // Switch to source doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: sourceDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // ── Mode D: Edit Contents (raster SO only) ──
        if (asset.sizeMode === "D") {
          if (asset.kind !== "smartObject") {
            log(`[ASSETS] Skipped "${asset.exportName}" — Mode D requires Smart Object`);
            continue;
          }
          if (await isVectorSmartObject(asset.layerId)) {
            log(`[ASSETS] Skipped "${asset.exportName}" — vector SO (use Mode A/B/C)`);
            continue;
          }

          await selectLayerById(asset.layerId);
          await bp([{ _obj: "placedLayerEditContents", _options: { dialogOptions: "dontDisplay" } }]);

          if (app.activeDocument.id === sourceDocId) {
            log(`[ASSETS] Skipped "${asset.exportName}" — failed to open SO contents`);
            continue;
          }
          tempDocId = app.activeDocument.id;

          if (asset.scale !== 1) {
            const w = app.activeDocument.width;
            const h = app.activeDocument.height;
            await resizeImage(Math.round(w * asset.scale), Math.round(h * asset.scale), true);
          }
          if (asset.type === "JPG") {
            try { await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]); } catch (e) {}
          }

          const savedD = await saveActiveDocAs(folder, filename, asset.type);
          if (savedD) exportedAssets.push({ ...savedD, exportName: asset.exportName, kind: asset.kind, sizeMode: asset.sizeMode });

          // Close temp doc by ID
          await bp([{
            _obj: "close",
            _target: [{ _ref: "document", _id: tempDocId }],
            saving: { _enum: "yesNo", _value: "no" }
          }]);
          tempDocId = null;
          log(`[ASSETS] Saved: ${filename}`);
          continue;
        }

        // ── Mode A/B/C: Create new doc → duplicate layer into it → save ──

        // Mode B: early bail if no overlap with artboard
        if (asset.sizeMode === "B") {
          const inter = computeIntersection(asset.bounds, asset.artboardRect);
          if (inter.width <= 0 || inter.height <= 0) {
            log(`[ASSETS] Skipped "${asset.exportName}" — empty intersection`);
            continue;
          }
        }

        // Temp doc dimensions:
        //  - Mode B: artboard size (PS preserves artboard-relative position when duplicating → layer lands correctly)
        //  - Mode A/C: layer bounds size (legacy behavior)
        const targetRect = (asset.sizeMode === "B")
          ? { left: 0, top: 0, width: asset.artboardRect.width, height: asset.artboardRect.height }
          : { left: asset.bounds.left, top: asset.bounds.top, width: asset.bounds.width, height: asset.bounds.height };

        log(`[DEBUG] targetRect: left=${targetRect.left} top=${targetRect.top} w=${targetRect.width} h=${targetRect.height}`);
        log(`[DEBUG] asset.bounds: left=${asset.bounds.left} top=${asset.bounds.top} w=${asset.bounds.width} h=${asset.bounds.height}`);
        log(`[DEBUG] artboardRect: left=${asset.artboardRect.left} top=${asset.artboardRect.top} w=${asset.artboardRect.width} h=${asset.artboardRect.height}`);

        // Create new transparent document with target dimensions
        const tempDocName = "__asset_temp_" + Date.now() + "__";
        const sourceRes = sourceDoc.resolution || 72;
        log(`[DEBUG] Creating temp doc: ${tempDocName}, ${targetRect.width}x${targetRect.height}@${sourceRes}dpi`);
        await bp([{
          _obj: "make",
          new: {
            _obj: "document",
            width: { _unit: "distanceUnit", _value: targetRect.width },
            height: { _unit: "distanceUnit", _value: targetRect.height },
            resolution: { _unit: "densityUnit", _value: sourceRes },
            mode: { _class: "RGBColorMode" },
            depth: 8,
            fill: { _enum: "fill", _value: "transparent" },
            profile: "sRGB IEC61966-2.1",
            name: tempDocName
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        if (app.activeDocument.id === sourceDocId) {
          log(`[ASSETS] Skipped "${asset.exportName}" — make doc failed`);
          continue;
        }
        tempDocId = app.activeDocument.id;
        log(`[DEBUG] Temp doc created. ID=${tempDocId}, size=${app.activeDocument.width}x${app.activeDocument.height}, layers=${app.activeDocument.layers.length}`);

        // Switch back to source doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: sourceDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[DEBUG] Switched to source doc. activeDoc.id=${app.activeDocument.id}, sourceDocId=${sourceDocId}`);

        // Select target layer in source
        await selectLayerById(asset.layerId);
        log(`[DEBUG] Selected source layer: ${asset.layerName} (id=${asset.layerId})`);

        // Duplicate layer into the new temp doc by name
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "document", _name: tempDocName },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[DEBUG] Duplicate layer command sent. activeDoc.id after dup=${app.activeDocument.id}`);

        // Switch to temp doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: tempDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[DEBUG] Switched to temp doc. layers=${app.activeDocument.layers.length}, activeLayers=${app.activeDocument.activeLayers.length}`);
        if (app.activeDocument.layers.length > 0) {
          for (const l of app.activeDocument.layers) {
            try {
              const b = await getLayerBounds(l.id);
              log(`[DEBUG]   layer "${l.name}" kind=${l.kind} bounds=L${b.left},T${b.top} ${b.width}x${b.height}`);
            } catch (e) {
              log(`[DEBUG]   layer "${l.name}" kind=${l.kind} (no bounds: ${e.message})`);
            }
          }
        }

        // Delete the empty default "Layer 1" if it exists
        try {
          const layers = [...app.activeDocument.layers];
          for (const l of layers) {
            if (l.name === "Layer 1" && l.kind === "pixel") {
              const b = await getLayerBounds(l.id);
              if (b.width === 0 && b.height === 0) {
                await selectLayerById(l.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              }
            }
          }
        } catch (e) {}

        // Mode A/C: PS positioning after duplicate varies by layer kind:
        //  - Pixel layers preserve artboard-relative coords (e.g. top=-641)
        //  - Smart Objects / some types re-origin to (0,0)
        // → Read the actual bounds of the duplicated layer in the temp doc and snap it to (0,0).
        // Mode B relies on artboard-relative landing → skip.
        if (asset.sizeMode === "A" || asset.sizeMode === "C") {
          try {
            // Find the real layer (skip empty default "Layer 1")
            let target = null;
            for (const l of app.activeDocument.layers) {
              try {
                const b = await getLayerBounds(l.id);
                if (b.width > 0 && b.height > 0) { target = { layer: l, bounds: b }; break; }
              } catch (e) {}
            }
            if (target) {
              const dx = -Math.round(target.bounds.left);
              const dy = -Math.round(target.bounds.top);
              if (dx !== 0 || dy !== 0) {
                // Unlock background layer if needed (locked bg cannot be moved)
                if (target.layer.isBackgroundLayer) {
                  await selectLayerById(target.layer.id);
                  await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _property: "background" }],
                    to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: 100 }, mode: { _enum: "blendMode", _value: "normal" } },
                    _options: { dialogOptions: "dontDisplay" }
                  }]);
                }
                await selectLayerById(target.layer.id);
                await bp([{
                  _obj: "move",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  to: { _obj: "offset",
                        horizontal: { _unit: "pixelsUnit", _value: dx },
                        vertical:   { _unit: "pixelsUnit", _value: dy } },
                  _options: { dialogOptions: "dontDisplay" }
                }]);
                log(`[DEBUG] Translated "${target.layer.name}" by (${dx}, ${dy}) from (${target.bounds.left},${target.bounds.top}) → (0,0)`);
              } else {
                log(`[DEBUG] Layer "${target.layer.name}" already at (0,0) — no translate needed`);
              }
            }
          } catch (e) {
            log(`[ASSETS] Translate failed: ${e.message}`);
          }
        }

        // Merge group layers into one
        if (asset.isGroup) {
          try {
            await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]);
          } catch (e) {}
        }

        // Mode B: temp doc is artboard-sized, duplicated layer lands at its artboard-relative coords.
        // Crop canvas to the overlap between layer and artboard (both in artboard-relative coords).
        if (asset.sizeMode === "B") {
          const relX = Math.round(asset.bounds.left - asset.artboardRect.left);
          const relY = Math.round(asset.bounds.top - asset.artboardRect.top);
          const lw = asset.bounds.width;
          const lh = asset.bounds.height;
          const aw = asset.artboardRect.width;
          const ah = asset.artboardRect.height;
          const cropLeft = Math.max(0, relX);
          const cropTop = Math.max(0, relY);
          const cropRight = Math.min(aw, relX + lw);
          const cropBottom = Math.min(ah, relY + lh);
          log(`[DEBUG] Mode B crop: L${cropLeft},T${cropTop} → R${cropRight},B${cropBottom} (tempDoc=${aw}x${ah}, layer@${relX},${relY} ${lw}x${lh})`);
          if (cropRight > cropLeft && cropBottom > cropTop) {
            try {
              await cropCanvasTo(cropLeft, cropTop, cropRight, cropBottom);
            } catch (e) { log(`[ASSETS] Mode B crop failed: ${e.message}`); }
          }
        }

        // Mode C: trim transparent edges to remove padding inside the layer bounds
        if (asset.sizeMode === "C") {
          try {
            await bp([{
              _obj: "trim",
              trimBasedOn: { _enum: "trimBasedOn", _value: "transparency" },
              top: true, bottom: true, left: true, right: true,
              _options: { dialogOptions: "dontDisplay" }
            }]);
          } catch (e) { /* may fail if fully opaque or empty */ }
        }

        // Apply scale
        if (asset.scale !== 1) {
          const w = app.activeDocument.width;
          const h = app.activeDocument.height;
          await resizeImage(Math.round(w * asset.scale), Math.round(h * asset.scale), true);
        }

        // Flatten for JPG
        if (asset.type === "JPG") {
          try { await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]); } catch (e) {}
        }

        // Save
        const saved = await saveActiveDocAs(folder, filename, asset.type);
        if (saved) exportedAssets.push({ ...saved, exportName: asset.exportName, kind: asset.kind, sizeMode: asset.sizeMode });

        // Close temp doc by ID
        await bp([{
          _obj: "close",
          _target: [{ _ref: "document", _id: tempDocId }],
          saving: { _enum: "yesNo", _value: "no" }
        }]);
        tempDocId = null;

        log(`[ASSETS] Saved: ${filename}`);

      } catch (e) {
        log(`[ASSETS] Error "${asset.exportName}": ${e.message}`);
        // Cleanup temp doc by ID if it exists
        if (tempDocId && tempDocId !== sourceDocId) {
          try {
            await bp([{
              _obj: "close",
              _target: [{ _ref: "document", _id: tempDocId }],
              saving: { _enum: "yesNo", _value: "no" }
            }]);
          } catch (e2) {}
        }
      }
    }

    // Switch back to source doc
    try {
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDocId }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
    } catch (e) {}

    // Save layers.json to the same folder (skip for per-row single exports)
    if (writeLayersJson) {
      try {
        const allArtboards = [];
        for (const source of scannedArtboards) {
          const layersInfo = [];
          for (const child of source.layer.layers) {
            layersInfo.push(await collectLayerInfo(child, source.size.left, source.size.top));
          }
          allArtboards.push({
            artboard: source.name,
            width: source.size.width,
            height: source.size.height,
            layers: layersInfo
          });
        }
        const json = allArtboards.length === 1 ? allArtboards[0] : allArtboards;
        const jsonFile = await folder.createFile("layers.json", { overwrite: true });
        await jsonFile.write(JSON.stringify(json, null, 2));
        log(`[ASSETS] Saved: layers.json (${allArtboards.length} artboard(s))`);
      } catch (e) {
        log(`[ASSETS] layers.json skipped: ${e.message}`);
      }

      // Generate index.html gallery (full export only)
      if (exportedAssets.length) {
        try {
          const html = buildAssetsIndexHtml(exportedAssets);
          const htmlFile = await folder.createFile("index.html", { overwrite: true });
          await htmlFile.write(html);
          log(`[ASSETS] Saved: index.html (${exportedAssets.length} item(s))`);
        } catch (e) {
          log(`[ASSETS] index.html skipped: ${e.message}`);
        }
      }
    }

    log(`[ASSETS] === Export complete: ${scannedAssets.length} asset(s) ===`);

  }, { commandName: "Banner Cloner - Export Assets" });
}

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildAssetsIndexHtml(items) {
  const rows = items.map(it => {
    const name = escapeHtml(it.exportName || it.filename);
    const fname = encodeURIComponent(it.filename);
    const kind = escapeHtml(it.kind === "smartObject" ? "Smart" : "Pixel");
    const dims = `${it.width} × ${it.height}`;
    const size = formatFileSize(it.bytes);
    return `
    <figure class="card">
      <a href="./${fname}" target="_blank" rel="noopener">
        <img src="./${fname}" alt="${name}" loading="lazy">
      </a>
      <figcaption>
        <div class="name" title="${name}">${name}</div>
        <div class="meta">
          <span class="badge">${kind}</span>
          <span class="badge mode">Mode ${escapeHtml(it.sizeMode)}</span>
          <span>${dims}</span>
          <span>${size}</span>
        </div>
      </figcaption>
    </figure>`;
  }).join("\n");

  const totalBytes = items.reduce((s, i) => s + (i.bytes || 0), 0);
  const summary = `${items.length} asset(s) · ${formatFileSize(totalBytes)}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Exported Assets (${items.length})</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a1a; color: #e8e8e8; }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; }
  h1 { margin: 0; font-size: 18px; font-weight: 600; }
  .summary { font-size: 13px; color: #888; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
  .card { margin: 0; background: #242424; border: 1px solid #333; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .card img { display: block; width: 100%; max-width: 400px; height: auto; margin: 0 auto; background: repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px; cursor: zoom-in; }
  figcaption { padding: 10px 12px; border-top: 1px solid #333; }
  .name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
  .meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #aaa; align-items: center; }
  .badge { background: rgba(89, 161, 57, 0.18); color: #8bc34a; border: 1px solid #3e6a24; padding: 1px 7px; border-radius: 3px; font-weight: 600; }
  .badge.mode { background: rgba(100, 150, 200, 0.15); color: #7cb3e8; border-color: #3a5b77; }
  a { text-decoration: none; }
</style>
</head>
<body>
<header>
  <h1>Exported Assets</h1>
  <div class="summary">${summary}</div>
</header>
<section class="grid">
${rows}
</section>
</body>
</html>`;
}

async function addGroupToAssets() {
  try {
    const doc = app.activeDocument;
    if (!doc) { log("[ASSETS] No document open."); return; }
    const sel = doc.activeLayers?.[0];
    if (!sel) { log("[ASSETS] Please select a group in Layers panel."); return; }
    if (!sel.layers || !sel.layers.length) {
      log("[ASSETS] Selected layer is not a group."); return;
    }

    // Find parent artboard for bounds reference
    let artboard = sel.parent;
    while (artboard && artboard.parent && artboard.parent !== doc) {
      artboard = artboard.parent;
    }
    let artboardRect = { left: 0, top: 0, width: doc.width, height: doc.height };
    if (artboard) {
      try {
        const desc = await getLayerDescriptor(artboard.id);
        if (desc.artboardEnabled || desc.artboard) {
          const rect = desc.artboard?.artboardRect || desc.bounds;
          artboardRect = rectSize(rect);
        }
      } catch (e) {}
    }

    const bounds = await getGroupBounds(sel);
    if (bounds.width === 0 || bounds.height === 0) {
      log("[ASSETS] Group has empty bounds."); return;
    }

    scannedAssets.push({
      layerId: sel.id,
      layerName: sel.name,
      exportName: sel.name,
      kind: "group",
      isGroup: true,
      sizeMode: "A",
      scale: 2,
      type: "PNG",
      bounds: bounds,
      artboardRect: artboardRect
    });

    log(`[ASSETS] Added group: ${sel.name} (${bounds.width}x${bounds.height})`);
    renderAssetList();
  } catch (e) {
    log(`[ASSETS] Error: ${e.message}`);
  }
}

getImagesBtn.addEventListener("click", scanArtboardImages);
addGroupBtn.addEventListener("click", addGroupToAssets);
exportAssetsBtn.addEventListener("click", exportAssets);
ignoreLayerInput.addEventListener("input", () => {
  try { localStorage.setItem(IGNORE_KEY, ignoreLayerInput.value); } catch (e) {}
});
try { const saved = localStorage.getItem(IGNORE_KEY); if (saved) ignoreLayerInput.value = saved; } catch (e) {}

// ─── Artboard picker ───

let artboardPickerItems = []; // [{id, name, width, height}]
let artboardPickerSelected = new Set(); // layer ids
let artboardPickerSearchQ = "";
let artboardPickerCollapsed = false;
let artboardPickerLoadedFor = null; // doc.id it was loaded for

const ARTBOARD_PICK_KEY_PREFIX = "bannerCloner.artboardPick.";
const ARTBOARD_PICK_COLLAPSED_KEY = "bannerCloner.artboardPickerCollapsed";

function artboardPickStorageKey() {
  const doc = app.activeDocument;
  if (!doc) return null;
  return ARTBOARD_PICK_KEY_PREFIX + doc.name;
}

function loadArtboardPickSelection(availableIds) {
  const key = artboardPickStorageKey();
  if (!key) return new Set(availableIds);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set(availableIds);
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved)) return new Set(availableIds);
    // Intersect saved with currently available
    const avail = new Set(availableIds);
    const picked = new Set();
    for (const id of saved) if (avail.has(id)) picked.add(id);
    // If nothing intersects (doc changed), default to all
    if (!picked.size) return new Set(availableIds);
    return picked;
  } catch (e) {
    return new Set(availableIds);
  }
}

function saveArtboardPickSelection() {
  const key = artboardPickStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify([...artboardPickerSelected]));
  } catch (e) {}
}

async function loadArtboardPicker() {
  const doc = app.activeDocument;
  if (!doc) {
    artboardPickerItems = [];
    artboardPickerSelected = new Set();
    artboardPickerLoadedFor = null;
    renderArtboardPicker();
    return;
  }

  const items = [];
  for (const layer of doc.layers) {
    try {
      const desc = await getLayerDescriptor(layer.id);
      if (!desc.artboardEnabled && !desc.artboard) continue;
      const rect = desc.artboard?.artboardRect || desc.bounds;
      const size = rectSize(rect);
      items.push({ id: layer.id, name: layer.name, width: size.width, height: size.height });
    } catch (e) {}
  }

  artboardPickerItems = items;
  artboardPickerSelected = loadArtboardPickSelection(items.map(i => i.id));
  artboardPickerLoadedFor = doc.id;
  renderArtboardPicker();
}

async function ensureArtboardPickerLoaded() {
  const doc = app.activeDocument;
  if (!doc) return;
  if (artboardPickerLoadedFor !== doc.id) {
    await loadArtboardPicker();
  }
}

function renderArtboardPicker() {
  while (artboardPickerList.firstChild) artboardPickerList.removeChild(artboardPickerList.firstChild);

  const q = artboardPickerSearchQ.trim().toLowerCase();
  const visible = q
    ? artboardPickerItems.filter(it => it.name.toLowerCase().includes(q))
    : artboardPickerItems;

  artboardPickerCount.textContent = `${artboardPickerSelected.size}/${artboardPickerItems.length}`;
  artboardPickerArrow.textContent = artboardPickerCollapsed ? "▶" : "▼";
  artboardPickerBody.style.display = artboardPickerCollapsed ? "none" : "";

  if (!artboardPickerItems.length) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "No artboards found. Click Refresh after opening a document.";
    artboardPickerList.appendChild(hint);
    return;
  }

  if (!visible.length) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "No artboards match search.";
    artboardPickerList.appendChild(hint);
    return;
  }

  for (const item of visible) {
    const row = document.createElement("label");
    row.className = "artboard-picker-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = artboardPickerSelected.has(item.id);
    cb.addEventListener("change", () => {
      if (cb.checked) artboardPickerSelected.add(item.id);
      else artboardPickerSelected.delete(item.id);
      saveArtboardPickSelection();
      artboardPickerCount.textContent = `${artboardPickerSelected.size}/${artboardPickerItems.length}`;
    });

    const info = document.createElement("div");
    info.className = "artboard-picker-row-info";
    const nameEl = document.createElement("div");
    nameEl.className = "artboard-picker-row-name";
    nameEl.textContent = item.name;
    const sizeEl = document.createElement("div");
    sizeEl.className = "artboard-picker-row-size";
    sizeEl.textContent = `${item.width}×${item.height}`;
    info.appendChild(nameEl);
    info.appendChild(sizeEl);

    row.appendChild(cb);
    row.appendChild(info);
    artboardPickerList.appendChild(row);
  }
}

artboardPickerToggle.addEventListener("click", () => {
  artboardPickerCollapsed = !artboardPickerCollapsed;
  try { localStorage.setItem(ARTBOARD_PICK_COLLAPSED_KEY, artboardPickerCollapsed ? "1" : "0"); } catch (e) {}
  renderArtboardPicker();
});
artboardPickerRefresh.addEventListener("click", async () => {
  await loadArtboardPicker();
  log("[PICKER] Artboard list refreshed.");
});
artboardPickerAll.addEventListener("click", () => {
  const q = artboardPickerSearchQ.trim().toLowerCase();
  const targets = q ? artboardPickerItems.filter(it => it.name.toLowerCase().includes(q)) : artboardPickerItems;
  for (const it of targets) artboardPickerSelected.add(it.id);
  saveArtboardPickSelection();
  renderArtboardPicker();
});
artboardPickerNone.addEventListener("click", () => {
  const q = artboardPickerSearchQ.trim().toLowerCase();
  const targets = q ? artboardPickerItems.filter(it => it.name.toLowerCase().includes(q)) : artboardPickerItems;
  for (const it of targets) artboardPickerSelected.delete(it.id);
  saveArtboardPickSelection();
  renderArtboardPicker();
});
artboardPickerSearch.addEventListener("input", () => {
  artboardPickerSearchQ = String(artboardPickerSearch.value || "");
  renderArtboardPicker();
});
try {
  if (localStorage.getItem(ARTBOARD_PICK_COLLAPSED_KEY) === "1") artboardPickerCollapsed = true;
} catch (e) {}

// ─── Asset search (filter scanned asset list) ───

let assetSearchQ = "";
assetSearchInput.addEventListener("input", () => {
  assetSearchQ = String(assetSearchInput.value || "");
  renderAssetList();
});

const assetToggleAllBtn = document.getElementById("assetToggleAllBtn");
if (assetToggleAllBtn) {
  assetToggleAllBtn.addEventListener("click", () => {
    const allCollapsed = scannedAssets.length > 0 && scannedAssets.every(a => a.collapsed);
    toggleAllAssetsCollapsed(!allCollapsed);
    assetToggleAllBtn.textContent = allCollapsed ? "Collapse all" : "Expand all";
  });
}

// ─── Tab switching (updated) ───

const mainContent = document.querySelectorAll(".app > .section:not(.shared-section), .app > #splitSection");

function switchMode(mode) {
  cloneMode = (mode === "settings" || mode === "exportAssets") ? cloneMode : mode;
  tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));

  const targetSizesSection = document.getElementById("targetSizesSection");

  if (mode === "settings") {
    mainContent.forEach(el => el.style.display = "none");
    settingsPanel.style.display = "block";
    exportAssetsPanel.style.display = "none";
    if (targetSizesSection) targetSizesSection.style.display = "";
    renderSizeGroups();
  } else if (mode === "exportAssets") {
    mainContent.forEach(el => el.style.display = "none");
    settingsPanel.style.display = "none";
    exportAssetsPanel.style.display = "block";
    if (targetSizesSection) targetSizesSection.style.display = "none";
    ensureArtboardPickerLoaded().catch(e => log(`[PICKER] ${e.message}`));
  } else {
    mainContent.forEach(el => el.style.display = "");
    settingsPanel.style.display = "none";
    exportAssetsPanel.style.display = "none";
    if (targetSizesSection) targetSizesSection.style.display = "";
    splitSection.style.display = mode === "artboards" ? "block" : "none";
    splitBtn.style.display = mode === "artboards" ? "" : "none";
  }
}

// ─── Event listeners ───

// ─── Log toggle/clear ───
const logToggle = document.getElementById("logToggle");
const logClearBtn = document.getElementById("logClearBtn");
const logCopyBtn = document.getElementById("logCopyBtn");

logCopyBtn.addEventListener("click", async () => {
  const text = logBox.innerText || logBox.textContent || "";
  let ok = false;
  let errMsg = "";
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch (e) { errMsg = e && e.message ? e.message : String(e); }
  const orig = logCopyBtn.textContent;
  logCopyBtn.textContent = ok ? "Copied!" : "Failed";
  if (!ok && errMsg) log(`[COPY] ${errMsg}`);
  setTimeout(() => { logCopyBtn.textContent = orig; }, 1200);
});

logToggle.addEventListener("click", () => {
  logBox.classList.toggle("collapsed");
  try { localStorage.setItem("bannerCloner.logCollapsed", logBox.classList.contains("collapsed") ? "1" : "0"); } catch (e) {}
});
logClearBtn.addEventListener("click", () => { logBox.innerHTML = ""; log("Ready."); });
try {
  if (localStorage.getItem("bannerCloner.logCollapsed") === "1") logBox.classList.add("collapsed");
} catch (e) {}

sizesInput.addEventListener("input", () => { renderPresets(); saveTargetSizes(); updateSizesCount(); });
suffixNameEl.addEventListener("change", saveSuffixPref);
smartMatchEl.addEventListener("change", saveSmartMatchPref);
refreshBtn.addEventListener("click", refreshSource);
cloneBtn.addEventListener("click", () => {
  if (cloneMode === "artboards") cloneAsArtboards();
  else cloneAll();
});
exportBtn.addEventListener("click", exportAll);
tabBtns.forEach(btn => btn.addEventListener("click", () => switchMode(btn.dataset.mode)));
splitBtn.addEventListener("click", splitToDocuments);
skipLayerInput.addEventListener("input", saveBgLayerName);

document.addEventListener("DOMContentLoaded", () => {
  loadLayerRules();
  loadBgLayerName();
  loadTargetSizes();
  renderPresets();
  updateSizesCount();
  updateJsonStatus();
  setTimeout(refreshSource, 150);
});
