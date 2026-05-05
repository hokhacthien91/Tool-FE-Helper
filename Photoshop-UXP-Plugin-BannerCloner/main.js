const PLUGIN_VERSION = "1.0.4-slugify-asset-names";
console.log(`[BannerCloner] main.js loaded — version=${PLUGIN_VERSION} @ ${new Date().toISOString()}`);

const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;
const { app, core, action, imaging, constants } = require("photoshop");

uxp.entrypoints.setup({
  panels: {
    "banner-cloner-pro-panel": {
      show() {},
      hide() {}
    }
  }
});

const PRESETS = ["300x250","300x600","160x600","728x90","320x50","300x50","970x250","480x320","1080x1080","1080x1920","1920x1080","1080x1440","1080x1350"];

let cloneMode = "artboards"; // clone target: "documents" | "artboards"

const GG_PREFIX = "GG-";
function hasGGPrefix(name) {
  return !!(name && name.toLowerCase().startsWith(GG_PREFIX.toLowerCase()));
}

// "Require GG- prefix" checkbox gates whether smart match / rule application
// is restricted to GG- layers. When unchecked, every layer participates.
// Default to true if the checkbox is not yet rendered (match legacy behavior).
function isGGPrefixRequired() {
  return document.getElementById("requireGGPrefix")?.checked !== false;
}

// Pass-through that respects the checkbox: returns true when the layer should
// be processed under the current setting.
function passesGGFilter(name) {
  return !isGGPrefixRequired() || hasGGPrefix(name);
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
const uniformScaleEl = document.getElementById("uniformScaleEnabled");
const matchFrameTokenEnabled = document.getElementById("matchFrameTokenEnabled");
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

// Map of layerId → exported asset filename (e.g., "mfb-logo.png").
// Populated by runExportAssetsFlow after each successful save.
// Consumed by collectLayerInfo so JSON `src` field points at the actual
// rasterized PNG instead of the raw PSD smartObject reference (.ai/.jpg).
const assetExportMap = new Map();
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
      // Accept "300x600" (plain), "v2-300x600" (variant), "F1-300x600" (frame),
      // or any "<prefix>-300x600" — the JSON exporter uses F-tokens for
      // multi-frame mode and may use other prefixes in the future. Capture
      // whatever prefix is there so dedupSingleVariants / downstream code
      // can still see it via the `variant` field.
      const m = token.match(/^(?:([A-Za-z]\w*)-)?(\d+)x(\d+)$/);
      if (!m) return null;
      return { raw: token, variant: m[1] || null, width: Number(m[2]), height: Number(m[3]) };
    })
    .filter(Boolean);
}

function applySizesChange() {
  renderPresets();
  saveTargetSizes();
  updateSizesCount();
  // Keep Layer Rules in sync with current sizes — only when Settings panel is mounted,
  // since renderSizeGroups builds DOM into #sizeGroupsContainer.
  if (settingsPanel.style.display !== "none") renderSizeGroups();
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
      applySizesChange();
    });
    presetWrap.appendChild(chip);
  });
}

function stripSizeSuffix(name) {
  // Find a size token (e.g. "300x600", optionally preceded by "v2-") anywhere
  // in the name. We support two layouts:
  //   1) "<base><sep><size>"             → name ends with size  (legacy)
  //   2) "<base><sep><size><tail>"       → size in middle, e.g. "...-300x600-F1"
  // For (2) we keep `tail` so callers can rebuild "<base><sep><newSize><tail>"
  // — otherwise frame suffixes like "-F1/-F2/-F3" get pushed to the end and
  // collide (you'd end up with names like "...-300x50-F1_300x600").
  const m = name.match(/([-_ ])(?:[A-Za-z]\w*-)?(\d+x\d+)([-_ ][A-Za-z0-9]+|$)/i);
  if (!m) return { base: name, sep: "_", tail: "" };
  const sep = m[1];
  const tail = m[3] || "";
  const base = name.slice(0, m.index);
  return { base, sep, tail };
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
  const list = await resolveSelectedArtboardsMulti();
  return list[0];
}

// Resolve ALL selected source artboards (Cmd-click multi-select).
// Walks each activeLayer up to its top-level artboard parent, dedupes by id,
// preserves selection order. Returns 1+ artboards or throws.
async function resolveSelectedArtboardsMulti() {
  const doc = app.activeDocument;
  const active = doc?.activeLayers || [];
  if (!active.length) throw new Error("Please select a source artboard.");

  const seen = new Set();
  const out = [];
  for (const layer of active) {
    let current = layer;
    while (current && current.parent && current.parent !== doc) {
      current = current.parent;
    }
    if (!current || seen.has(current.id)) continue;
    seen.add(current.id);
    const layerDesc = await getLayerDescriptor(current.id);
    const rect = layerDesc.artboard?.artboardRect || layerDesc.bounds;
    if (!rect) continue;
    out.push({
      id: current.id,
      name: current.name,
      layer: current,
      rect: rect,
      size: rectSize(rect)
    });
  }
  if (!out.length) throw new Error("Cannot read artboard rect for selection.");
  return out;
}

async function selectLayerById(layerId) {
  await bp([{
    _obj: "select",
    _target: [{ _ref: "layer", _id: layerId }],
    makeVisible: false,
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// Clear all per-layer locks (transparent pixels, position, all-lock) so PS
// will accept a transform on this layer. Smart objects with any lock active
// reject transform with "Transform is not currently available".
async function unlockLayerForTransform(layerId) {
  try {
    await bp([{
      _obj: "applyLocking",
      _target: [{ _ref: "layer", _id: layerId }],
      layerLocking: {
        _obj: "layerLocking",
        protectNone: true
      },
      _options: { dialogOptions: "dontDisplay" }
    }]);
  } catch (e) {
    // Layer might already be unlocked, or descriptor doesn't accept locking —
    // not fatal, transform will just fail and we'll fall through to move-only.
  }
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
const UNIFORM_SCALE_KEY = "bannerCloner.uniformScale";

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
    const uniform = localStorage.getItem(UNIFORM_SCALE_KEY);
    if (uniform !== null && uniformScaleEl) uniformScaleEl.checked = uniform === "1";
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

function saveUniformScalePref() {
  try {
    localStorage.setItem(UNIFORM_SCALE_KEY, uniformScaleEl?.checked ? "1" : "0");
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

// Fill/adjustment layers (adjustment-like Color Fill, Gradient Fill, Pattern)
// cover the full canvas and cannot be transformed — bounds match canvas exactly.
// Shape layers with a solid fill ALSO report kind=solidColor but have bounded geometry.
// Use bounds-vs-canvas heuristic to distinguish.
function isUnboundedFillLayer(layer, bounds) {
  const isFillKind = layer.kind === "solidColor" || layer.kind === "solidFill"
    || layer.kind === "gradientFill" || layer.kind === "pattern";
  if (!isFillKind) return false;
  const doc = app.activeDocument;
  if (!doc) return false;
  return Math.abs(bounds.width - doc.width) < 2 && Math.abs(bounds.height - doc.height) < 2
      && Math.abs(bounds.left) < 2 && Math.abs(bounds.top) < 2;
}

// Resize a shape layer to absolute width/height (uses non-uniform transform)
async function resizeShapeLayer(layer, targetW, targetH) {
  const bounds = await getLayerBounds(layer.id);
  log(`[RESIZE] "${layer.name}" (kind=${layer.kind}) before: ${bounds.width}x${bounds.height} → target: ${Math.round(targetW)}x${Math.round(targetH)}`);
  // Source bounds guard — Photoshop transform fails on zero/sub-pixel layers
  if (bounds.width < 1 || bounds.height < 1) { log(`[RESIZE]   skip: source bounds too small (${bounds.width}x${bounds.height})`); return; }
  // Target guard — sub-pixel target triggers "initial bounding rectangle is empty"
  if (!(targetW >= 1) || !(targetH >= 1)) { log(`[RESIZE]   skip: target too small (${targetW}x${targetH})`); return; }
  if (isUnboundedFillLayer(layer, bounds)) {
    log(`[RESIZE]   skip: unbounded fill layer (bounds = canvas)`);
    return;
  }
  // Adjustment-style fill layers (solidColor / gradientFill / pattern) carry a mask
  // that covers the source canvas. Resizing them with non-uniform scale collapses the
  // mask and Photoshop throws "initial bounding rectangle is empty".
  //
  // BUT: vector shape layers (drawn rectangles, etc.) ALSO report kind="solidColor"
  // in UXP — these MUST resize. Tell them apart via the layer descriptor: adjustment
  // fills have NO vectorMask (their shape is the layer mask itself); shape layers DO
  // have a vectorMask path that defines their geometry.
  const isAdjustmentFillKind = layer.kind === "solidColor" || layer.kind === "solidFill"
    || layer.kind === "gradientFill" || layer.kind === "pattern";
  if (isAdjustmentFillKind) {
    let hasVectorMask = false;
    try {
      const desc = await getLayerDescriptor(layer.id);
      // hasVectorMask is true for vector shapes; absent/false for adjustment fills
      hasVectorMask = !!(desc && (desc.hasVectorMask === true || desc.vectorMaskEnabled === true));
    } catch (e) { /* fall through — assume shape (safer, will try resize) */ }
    if (!hasVectorMask) {
      log(`[RESIZE]   skip: adjustment fill layer (${layer.kind}, no vectorMask) — transform unsafe`);
      return;
    }
    // Vector shape — proceed with resize below
  }
  const scaleX = targetW / bounds.width;
  const scaleY = targetH / bounds.height;
  if (!isFinite(scaleX) || !isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) {
    log(`[RESIZE]   skip: invalid scale X=${scaleX} Y=${scaleY}`);
    return;
  }
  log(`[RESIZE]   scale: X=${(scaleX*100).toFixed(1)}% Y=${(scaleY*100).toFixed(1)}%`);
  await selectLayerById(layer.id);
  try {
    await bpSafe([{
      _obj: "transform",
      _target: [{ _ref: "layer", _id: layer.id }],
      freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
      width: { _unit: "percentUnit", _value: scaleX * 100 },
      height: { _unit: "percentUnit", _value: scaleY * 100 },
      interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
      _options: { dialogOptions: "dontDisplay" }
    }]);
  } catch (e) {
    log(`[RESIZE]   transform failed: ${e.message} — skipping`);
    return;
  }
  const after = await getLayerBounds(layer.id);
  log(`[RESIZE]   after: ${after.width}x${after.height} (expected ${Math.round(targetW)}x${Math.round(targetH)})`);
}

// Scale a single layer uniformly (e.g. logo by width)
async function scaleLayerUniform(layer, scale) {
  if (Math.abs(scale - 1) < 0.01) return;
  if (!isFinite(scale) || scale <= 0) { log(`[SCALE] "${layer.name}" skip: invalid scale ${scale}`); return; }
  const before = await getLayerBounds(layer.id);
  if (before.width < 1 || before.height < 1) { log(`[SCALE] "${layer.name}" skip: source bounds too small (${before.width}x${before.height})`); return; }
  // Predicted size guard
  if (before.width * scale < 1 || before.height * scale < 1) {
    log(`[SCALE] "${layer.name}" skip: target too small (${(before.width*scale).toFixed(2)}x${(before.height*scale).toFixed(2)})`);
    return;
  }
  if (isUnboundedFillLayer(layer, before)) {
    log(`[SCALE] "${layer.name}" skip: unbounded fill layer (bounds = canvas)`);
    return;
  }
  log(`[SCALE] "${layer.name}" (kind=${layer.kind}) before: ${before.width}x${before.height} × ${(scale*100).toFixed(1)}%`);
  await selectLayerById(layer.id);
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
  } catch (e) {
    log(`[SCALE]   transform failed: ${e.message} — skipping`);
    return;
  }
  const after = await getLayerBounds(layer.id);
  log(`[SCALE]   after: ${after.width}x${after.height}`);
}

function isBgGroup(layer) {
  return layer.name.toLowerCase() === getBgLayerName();
}

function findBgGroup(parent) {
  // 1. Exact match with the configured bg layer name (case-insensitive).
  //    The GG- prefix is NOT required — users may name their bg layer freely
  //    (e.g. "bg-color"); only `requireGGPrefix` (when checked) enforces it.
  const requireGG = isGGPrefixRequired();
  function findExact(node) {
    if (!node.layers) return null;
    for (const layer of node.layers) {
      if (isBgGroup(layer) && (!requireGG || hasGGPrefix(layer.name))) return layer;
      const found = findExact(layer);
      if (found) return found;
    }
    return null;
  }
  const exact = findExact(parent);
  if (exact) return exact;

  // 2. Fallback: any layer whose name contains "background" or "-bg".
  function findFallback(node) {
    if (!node.layers) return null;
    for (const layer of node.layers) {
      if (!requireGG || hasGGPrefix(layer.name)) {
        const n = (layer.name || "").toLowerCase();
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
    if (!passesGGFilter(child.name)) continue; // Respect "Require GG- prefix" checkbox
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
    // Respect "Require GG- prefix" checkbox: when unchecked, every layer is processed.
    if (!passesGGFilter(child.name)) {
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

// Smart-match counterpart of applyLockGroupRule: scale a *-lock group as a
// single unit so it fits the canvas (CSS "contain"), then push it inside if
// it sits outside. Children follow the PS transform automatically — no
// per-child processing.
async function fitLockGroup(group, canvasW, canvasH, canvasLeft, canvasTop) {
  const before = await getGroupBounds(group);
  if (before.width < 1 || before.height < 1) {
    log(`[LOCK-FIT] "${group.name}" skip: empty bbox`);
    return;
  }

  // Scale-to-fit: pick the smaller axis ratio so the group fits inside the
  // canvas. Match fitContentLayers' "scale down only" behavior — never
  // upscale a group that already fits.
  const sx = canvasW / before.width;
  const sy = canvasH / before.height;
  const scale = Math.min(sx, sy, 1);

  if (Math.abs(scale - 1) > 0.01) {
    log(`[LOCK-FIT] "${group.name}" scale ${(scale * 100).toFixed(1)}% (${Math.round(before.width)}x${Math.round(before.height)} → ${Math.round(before.width * scale)}x${Math.round(before.height * scale)})`);
    try {
      await selectLayerById(group.id);
      await unlockLayerForTransform(group.id);
      await bpSafe([{
        _obj: "transform",
        _target: [{ _ref: "layer", _id: group.id }],
        freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
        width: { _unit: "percentUnit", _value: scale * 100 },
        height: { _unit: "percentUnit", _value: scale * 100 },
        interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
        _options: { dialogOptions: "dontDisplay" }
      }]);
    } catch (e) {
      log(`[LOCK-FIT] "${group.name}" scale ERROR: ${e.message} — continuing with move-only`);
    }
  }

  // Clamp into canvas — same logic as fitContentLayers leaf clamp.
  const after = await getGroupBounds(group);
  const canvasRight = canvasLeft + canvasW;
  const canvasBottom = canvasTop + canvasH;
  let dx = 0, dy = 0;
  if (after.right <= canvasLeft) dx = canvasLeft - after.left + 10;
  else if (after.left >= canvasRight) dx = (canvasRight - 10) - after.right;
  else if (after.left < canvasLeft) dx = canvasLeft - after.left;

  if (after.bottom <= canvasTop) dy = canvasTop - after.top + 10;
  else if (after.top >= canvasBottom) dy = (canvasBottom - 10) - after.bottom;
  else if (after.top < canvasTop) dy = canvasTop - after.top;

  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    log(`[LOCK-FIT] "${group.name}" move dx=${Math.round(dx)} dy=${Math.round(dy)}`);
    try {
      await moveGroupChildren(group, dx, dy);
    } catch (e) {
      log(`[LOCK-FIT] "${group.name}" move ERROR: ${e.message}`);
    }
  }
}

async function fitContentLayers(parent, canvasW, canvasH, originX, originY, skipContentBg, ruleNames) {
  originX = originX || 0;
  originY = originY || 0;
  // Collect leaves (individual layers to scale/clamp) + lock-groups (atomic transforms).
  // A *-lock group is treated as a single unit: its whole bbox is fit-and-clamped,
  // and recursion stops at the group so children are NOT collected as leaves.
  const requireGG = isGGPrefixRequired();
  const leaves = [];
  const lockGroups = [];
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
    const passesFilter = !requireGG || inGG;

    // Lock group: atomic transform — handle whole group, do NOT descend.
    // The GG-prefix gate applies to lock groups too (per user spec): when the
    // checkbox is on, only GG- lock groups participate.
    if (passesFilter && isLockGroupName(layer.name) && layer.layers && layer.layers.length > 0) {
      lockGroups.push(layer);
      return;
    }

    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) walk(child, isRuled, inGG);
    } else {
      if (passesFilter) leaves.push(layer);
    }
  }
  for (const layer of parent.layers) walk(layer, false, false);

  const canvasLeft = originX;
  const canvasRight = originX + canvasW;
  const canvasTop = originY;
  const canvasBottom = originY + canvasH;

  // Lock groups first — atomic transform (scale uniform + clamp), children
  // ride along with the parent transform. Done before leaves so any leaf
  // accidentally collected from a lock-group sibling won't double-process.
  for (const group of lockGroups) {
    try {
      log(`[LOCK-FIT] "${group.name}" (id:${group.id}) atomic fit-and-clamp`);
      await fitLockGroup(group, canvasW, canvasH, canvasLeft, canvasTop);
    } catch (e) {
      log(`[LOCK-FIT] "${group.name}" ERROR: ${e.message}`);
    }
  }

  for (const layer of leaves) {
    try {
      log(`[FIT] layer: "${layer.name}" kind: ${layer.kind} id: ${layer.id}`);
      const skipKinds = ["solidColor", "gradientFill", "pattern"];
      if (skipKinds.includes(layer.kind)) { log(`[FIT]   skip: fill layer`); continue; }
      const bounds = await getLayerBounds(layer.id);
      log(`[FIT]   bounds: ${bounds.width}x${bounds.height} (${bounds.left},${bounds.top})`);
      if (bounds.width === 0 || bounds.height === 0) { log(`[FIT]   skip: zero bounds`); continue; }

      await selectLayerById(layer.id);

      // Scale down if wider than canvas. If transform fails (e.g. PS rejects
      // smart objects with warp state, or layer is locked), continue with
      // move-only — better to leave a too-large layer than to drop it entirely.
      if (bounds.width > canvasW) {
        const scale = canvasW / bounds.width;
        log(`[FIT]   transform: scale ${(scale * 100).toFixed(1)}%`);
        await unlockLayerForTransform(layer.id);
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
        } catch (e) {
          log(`[FIT]   transform ERROR: ${e.message} — continuing with move-only`);
        }
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

// Walk a slash-separated path like "Can2/Image/Can" through the PSD layer tree.
// Sibling-dup suffix " 2", " 3" matches the Nth occurrence of `name` at that
// level (1-based, where N=1 is implicit and unsuffixed).
// Returns [] if not resolvable, or [layer] when found. Path-aware so layers
// sharing a display name across different parent groups stay distinct.
function findLayerByPath(parent, pathStr) {
  if (!pathStr || typeof pathStr !== "string") return [];
  const segments = pathStr.split("/").map(s => s.trim()).filter(Boolean);
  if (!segments.length) return [];

  let level = parent.layers || [];
  let current = null;
  for (const seg of segments) {
    // Real PSD layer names can legitimately end in a number ("Layer 16",
    // "20  26"), so the sibling-dup suffix " 2"/" 3"/... is ambiguous in
    // isolation. Resolution order:
    //   1. Try the segment as a literal layer name (1st occurrence).
    //   2. If that fails AND the segment ends with " <N>" (N>=2), strip the
    //      suffix and pick the Nth same-named sibling.
    const segLc = normalizeName(seg);
    let match = null;
    for (const layer of level) {
      if (layer.name && normalizeName(layer.name) === segLc) { match = layer; break; }
    }
    if (!match) {
      const m = seg.match(/^(.+?)\s+(\d+)$/);
      if (m && Number(m[2]) >= 2) {
        const baseLc = normalizeName(m[1]);
        const idx = Number(m[2]);
        let count = 0;
        for (const layer of level) {
          if (layer.name && normalizeName(layer.name) === baseLc) {
            count++;
            if (count === idx) { match = layer; break; }
          }
        }
      }
    }
    if (!match) return [];
    current = match;
    level = match.layers || [];
  }
  return current ? [current] : [];
}

// JSON rules from web have child positions RELATIVE to parent group.
// In PSD, all positions are absolute (canvas coords). So we need to sum
// up all ancestor groups' rules (top/left) to get the absolute target.
function getAncestorGroupOffset(layer, rules) {
  let offX = 0, offY = 0;
  const trail = [];
  const chain = [];

  // Build PSD parent chain root→leaf so we can compute each ancestor's full
  // path key ("Can2/Image") for path-aware rule lookup. Sibling-dup suffix
  // ("Image 2") is computed by counting earlier siblings sharing the same name.
  const ancestors = [];
  let p = layer.parent;
  while (p) { ancestors.unshift(p); p = p.parent; }

  let pathSoFar = "";
  for (let i = 0; i < ancestors.length; i++) {
    const parent = ancestors[i];
    if (!parent.name) { chain.push("<root>"); continue; }
    chain.push(parent.name);

    // Find this ancestor's sibling index among same-named siblings under its
    // own parent. Index is 1-based; first match has no suffix.
    let segment = parent.name;
    const grandparent = parent.parent;
    if (grandparent && grandparent.layers) {
      let count = 0;
      for (const sib of grandparent.layers) {
        if (sib.name === parent.name) {
          count++;
          if (sib.id === parent.id) {
            if (count > 1) segment = `${parent.name} ${count}`;
            break;
          }
        }
      }
    }
    pathSoFar = pathSoFar ? `${pathSoFar}/${segment}` : segment;

    // Path-mode: match rule by full path. Fall back to bare-name match so
    // legacy JSON (without "/" in keys) still works.
    const pathLc = normalizeName(pathSoFar);
    const nameLc = normalizeName(parent.name);
    const parentRule = rules.find(r => r.name && normalizeName(r.name) === pathLc)
      || rules.find(r => r.name && !r.name.includes("/") && normalizeName(r.name) === nameLc);
    if (parentRule) {
      const pl = parentRule.left !== "" && parentRule.left !== undefined ? parseFloat(parentRule.left) : 0;
      const pt = parentRule.top !== "" && parentRule.top !== undefined ? parseFloat(parentRule.top) : 0;
      offX += isNaN(pl) ? 0 : pl;
      offY += isNaN(pt) ? 0 : pt;
      trail.push(`${parent.name}(+${pl},+${pt})`);
    } else {
      trail.push(`${parent.name}(no-rule)`);
    }
  }
  return { offX, offY, trail, chain };
}

// Group-name suffix that opts the group into "atomic transform" mode:
// the whole group is moved + scaled uniformly (Shift-drag in PS) and child
// rules are ignored except for `hidden: true`. Matches "BG-lock", "BG-lock 2",
// "BG-lock 3" (sibling-dup suffix added by our auto-rename pass).
function isLockGroupName(name) {
  return /-lock(\s+\d+)?$/.test(String(name || ""));
}

// Apply a *-lock group rule: scale the group uniformly to the rule's
// target bbox (whichever axis fits — PS Shift-drag style), then move it
// to the rule's (left, top). Children follow the PS transform automatically
// — no per-child rule processing needed (caller adds the group id to
// matchedGroupIds so child-rule iteration skips them).
async function applyLockGroupRule(layer, rule, originX, originY) {
  // Read group's CURRENT bounds (after any prior canvas crop / resize).
  const before = await getGroupBounds(layer);
  if (before.width < 1 || before.height < 1) {
    log(`[LOCK] "${layer.name}" skip: source bbox too small (${before.width}x${before.height})`);
    return;
  }

  // Resolve target W/H from rule. Same precedence as regular rules:
  // raw (width/height) wins over element (widthElement/heightElement).
  const hasRawW = rule._widthRaw !== undefined;
  const hasRawH = rule._heightRaw !== undefined;
  const hasElemW = rule._widthElement !== undefined;
  const hasElemH = rule._heightElement !== undefined;
  let targetW, targetH;
  if (hasRawW || hasRawH) {
    targetW = hasRawW ? rule._widthRaw : undefined;
    targetH = hasRawH ? rule._heightRaw : undefined;
  } else {
    targetW = hasElemW ? rule._widthElement : undefined;
    targetH = hasElemH ? rule._heightElement : undefined;
  }

  // Compute uniform scale. If rule has both W and H, pick min(scaleX, scaleY)
  // so the group fits inside the target bbox without overflow (CSS "contain").
  // Warn if the two scales disagree — that means JSON has non-uniform target,
  // which Storybook should never produce for *-lock groups.
  let scale = 1;
  if (targetW !== undefined && targetH !== undefined) {
    const sx = targetW / before.width;
    const sy = targetH / before.height;
    if (Math.abs(sx - sy) > 0.01) {
      log(`[LOCK] "${layer.name}" warning: aspect mismatch (scaleX=${sx.toFixed(3)}, scaleY=${sy.toFixed(3)}); using min for uniform scale`);
    }
    scale = Math.min(sx, sy);
  } else if (targetW !== undefined) {
    scale = targetW / before.width;
  } else if (targetH !== undefined) {
    scale = targetH / before.height;
  }
  // else: no W/H → scale=1 (move-only)

  if (!isFinite(scale) || scale <= 0) {
    log(`[LOCK] "${layer.name}" skip: invalid scale ${scale}`);
    return;
  }

  // Apply uniform scale to the group. PS will scale all descendant layers
  // around the group's geometric center — that preserves the relative
  // layout exactly the way Shift-drag in PS does.
  if (Math.abs(scale - 1) > 0.01) {
    log(`[LOCK] "${layer.name}" scaling uniform ${(scale * 100).toFixed(1)}% (${Math.round(before.width)}x${Math.round(before.height)} → ${Math.round(before.width * scale)}x${Math.round(before.height * scale)})`);
    try {
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
    } catch (e) {
      log(`[LOCK] "${layer.name}" scale ERROR: ${e.message}`);
    }
  } else {
    log(`[LOCK] "${layer.name}" skip scale (already at target size)`);
  }

  // Move group to (originX + rule.left, originY + rule.top). Read bbox
  // AFTER scale so we move based on the new top-left.
  const afterScale = await getGroupBounds(layer);
  const ruleLeft = rule.left !== "" && rule.left !== undefined ? parseFloat(rule.left) : null;
  const ruleTop = rule.top !== "" && rule.top !== undefined ? parseFloat(rule.top) : null;
  if (ruleLeft !== null || ruleTop !== null) {
    const targetLeft = ruleLeft !== null ? originX + ruleLeft : afterScale.left;
    const targetTop = ruleTop !== null ? originY + ruleTop : afterScale.top;
    const dx = targetLeft - afterScale.left;
    const dy = targetTop - afterScale.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      log(`[LOCK] "${layer.name}" move dx=${Math.round(dx)} dy=${Math.round(dy)} → (${Math.round(targetLeft)},${Math.round(targetTop)})`);
      try {
        await moveGroupChildren(layer, dx, dy);
      } catch (e) {
        log(`[LOCK] "${layer.name}" move ERROR: ${e.message}`);
      }
    }
  }
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
    if (!passesGGFilter(rule.name)) {
      log(`[RULE] "${rule.name}": no [GG-] prefix, skip`);
      continue;
    }

    // Path-mode when key contains "/" (e.g. "Can2/Image/Can") OR ends with a
    // sibling-dup suffix " 2"/" 3"/... (e.g. "Shape 1 2"). Both cases walk
    // findLayerByPath which knows how to disambiguate dup-named siblings.
    // Bare names fall back to legacy name-only search for backwards compat.
    const ruleName = typeof rule.name === "string" ? rule.name : "";
    const hasPathSep = ruleName.includes("/");
    const hasSibSuffix = /\s+\d+$/.test(ruleName) && Number(ruleName.match(/\s+(\d+)$/)[1]) >= 2;
    const isPathKey = hasPathSep || hasSibSuffix;
    let allLayers = isPathKey
      ? findLayerByPath(docOrArtboard, ruleName)
      : findLayersByName(docOrArtboard, ruleName);
    // If path-mode whiffs (rare: name clash where literal+suffix both fail),
    // fall back to legacy search so legitimate matches aren't silently dropped.
    if (isPathKey && !allLayers.length) {
      allLayers = findLayersByName(docOrArtboard, ruleName);
    }
    if (!allLayers.length) {
      log(`[RULE] "${ruleName}": not found, skip`);
      continue;
    }
    // Only apply to first matching layer (avoid duplicates). For path-mode
    // there's at most one match by construction, so this is a no-op there.
    const layers = [allLayers[0]];
    if (!isPathKey && allLayers.length > 1) {
      log(`[RULE] "${ruleName}": found ${allLayers.length} layers, applying only to first (id:${allLayers[0].id})`);
    }

    for (const layer of layers) {
      // Skip if this layer is a child of an already-matched group
      let parent = layer.parent;
      let skipThis = false;
      let parentIsLock = false;
      while (parent) {
        if (matchedGroupIds.has(parent.id)) {
          skipThis = true;
          // If the matched ancestor is a *-lock group, the child rule is
          // intentionally muted (only `hidden` survives below) — track it
          // separately so we don't log the generic "parent has rule" line.
          if (isLockGroupName(parent.name)) parentIsLock = true;
          break;
        }
        parent = parent.parent;
      }
      if (skipThis) {
        // Even when the parent is a *-lock group, we still honor the child's
        // `hidden` flag (per spec: child rules are show/hide only).
        if (parentIsLock && rule.hidden !== undefined) {
          try {
            const v = !(rule.hidden === true || rule.hidden === "true" || rule.hidden === 1);
            await selectLayerById(layer.id);
            await bp([{
              _obj: "set",
              _target: [{ _ref: "layer", _id: layer.id }],
              to: { _obj: "layer", visible: v },
              _options: { dialogOptions: "dontDisplay" }
            }]);
            log(`[LOCK]   child "${layer.name}" visible=${v} (other rules ignored under lock-parent)`);
          } catch (e) {
            log(`[LOCK]   child "${layer.name}" hidden-set ERROR: ${e.message}`);
          }
        } else {
          log(`[RULE] "${layer.name}": skipped (parent group already has rule)`);
        }
        continue;
      }

      // *-lock group: atomic transform path. Scale uniform + move the
      // whole group, then mark it so all child rules are skipped (except
      // `hidden`, handled in the skipThis branch above for the next iters).
      if (isLockGroupName(layer.name) && layer.layers && layer.layers.length > 0) {
        log(`[LOCK] "${layer.name}" (id:${layer.id}) atomic transform for ${targetSizeKey}`);
        matchedGroupIds.add(layer.id);
        try {
          await applyLockGroupRule(layer, rule, originX, originY);
        } catch (e) {
          log(`[LOCK] "${layer.name}" ERROR: ${e.message}`);
        }
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

        // SIZE-DEBUG: snapshot bounds BEFORE any size transforms, plus target from rule
        const isGroupLayer = layer.layers && layer.layers.length > 0;
        const sizeBefore = isGroupLayer ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        const tw = targetW !== undefined ? Math.round(targetW) : "?";
        const th = targetH !== undefined ? Math.round(targetH) : "?";
        log(`[SIZE-DEBUG] "${layer.name}" BEFORE: ${Math.round(sizeBefore.width)}x${Math.round(sizeBefore.height)} → target: ${tw}x${th}${isGroupLayer ? " (group — size skipped)" : ""}`);

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
        // Group rules must NOT cascade width/height onto children — each child has its own rule.
        const isGroupRule = layer.layers && layer.layers.length > 0;
        if (isGroupRule && (targetW || targetH)) {
          log(`[RULE]   group rule: skip width/height for ${nonTextLeaves.length} child leaves (children have own rules)`);
        }
        if (!isGroupRule && nonTextLeaves.length > 0 && (targetW || targetH)) {
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
              // Group rules are independent of children — children have own rules.
              log(`[RULE]   group rule: skip scale (children have own rules)`);
            } else {
              await scaleLayerUniform(layer, scaleVal);
              log(`[RULE]   scale: ${(scaleVal * 100).toFixed(0)}%`);
            }
          }
        }

        // Position: get current bounds WITHOUT effects for accurate positioning
        const isGroup = layer.layers && layer.layers.length > 0;
        const boundsWithFx = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        const boundsNoFx = isGroup ? await getGroupBoundsNoEffects(layer) : await getLayerBoundsNoEffects(layer.id);
        log(`[RULE]   boundsWithFx: (${Math.round(boundsWithFx.left)},${Math.round(boundsWithFx.top)}) ${Math.round(boundsWithFx.width)}x${Math.round(boundsWithFx.height)}`);
        log(`[RULE]   boundsNoFx:   (${Math.round(boundsNoFx.left)},${Math.round(boundsNoFx.top)}) ${Math.round(boundsNoFx.width)}x${Math.round(boundsNoFx.height)}`);

        // SIZE-DEBUG: AFTER all size transforms, compare to target
        const aw = Math.round(boundsWithFx.width);
        const ah = Math.round(boundsWithFx.height);
        if (isGroup) {
          log(`[SIZE-DEBUG] "${layer.name}" AFTER:  ${aw}x${ah} (group — size not enforced)`);
        } else if (targetW !== undefined || targetH !== undefined) {
          const dW = targetW !== undefined ? aw - Math.round(targetW) : 0;
          const dH = targetH !== undefined ? ah - Math.round(targetH) : 0;
          const okSize = Math.abs(dW) <= 1 && Math.abs(dH) <= 1 ? "OK" : "DRIFT";
          log(`[SIZE-DEBUG] "${layer.name}" AFTER:  ${aw}x${ah} | drift: dW=${dW} dH=${dH} ${okSize}`);
        } else {
          log(`[SIZE-DEBUG] "${layer.name}" AFTER:  ${aw}x${ah} (no size target in rule)`);
        }
        const bounds = boundsNoFx;
        if (bounds.width === 0 || bounds.height === 0) { log(`[RULE]   skip: zero bounds`); continue; }

        let dx = 0, dy = 0;
        const hasTop = rule.top !== "" && rule.top !== undefined;
        const hasLeft = rule.left !== "" && rule.left !== undefined;
        const hasRight = rule.right !== "" && rule.right !== undefined;
        const hasBottom = rule.bottom !== "" && rule.bottom !== undefined;
        log(`[RULE]   rule: top=${rule.top} left=${rule.left} right=${rule.right} bottom=${rule.bottom} | hasTop=${hasTop} hasLeft=${hasLeft} hasRight=${hasRight} hasBottom=${hasBottom}`);
        log(`[RULE]   canvas: ${canvasW}x${canvasH} origin: (${originX},${originY})`);

        // JSON positions are relative to parent group (web convention).
        // Accumulate ancestor group offsets so child ends at correct absolute canvas position.
        const { offX: ancOffX, offY: ancOffY, trail: ancTrail, chain: ancChain } = getAncestorGroupOffset(layer, rules);
        log(`[PARENT] "${layer.name}" PS chain: ${ancChain.length ? ancChain.join(" → ") : "(root)"}`);
        log(`[PARENT]   ancestor offset total: dx+${ancOffX} dy+${ancOffY}${ancTrail.length ? " via " + ancTrail.join(" → ") : " (no matching rules)"}`);

        // Priority: top > bottom, left > right
        if (hasTop) {
          const targetTop = originY + parseFloat(rule.top) + ancOffY;
          dy = targetTop - bounds.top;
          log(`[RULE]   top: targetTop=${targetTop} bounds.top=${Math.round(bounds.top)} dy=${Math.round(dy)}`);
        } else if (hasBottom) {
          const targetBottom = originY + canvasH - parseFloat(rule.bottom);
          dy = targetBottom - bounds.bottom;
          log(`[RULE]   bottom: targetBottom=${targetBottom} bounds.bottom=${Math.round(bounds.bottom)} dy=${Math.round(dy)}`);
        }

        if (hasLeft) {
          const targetLeft = originX + parseFloat(rule.left) + ancOffX;
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
            // Group rules are independent of children — don't cascade position.
            log(`[RULE]   group rule: skip position move (children have own rules)`);
          } else {
            const expectedLeft = Math.round(bounds.left + dx);
            const expectedTop = Math.round(bounds.top + dy);
            log(`[POS-DEBUG] "${layer.name}" BEFORE move: left=${Math.round(bounds.left)} top=${Math.round(bounds.top)} → expected: left=${expectedLeft} top=${expectedTop}`);
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
            const afterMove = await getLayerBoundsNoEffects(layer.id);
            const deltaL = Math.round(afterMove.left) - expectedLeft;
            const deltaT = Math.round(afterMove.top) - expectedTop;
            const ok = Math.abs(deltaL) <= 1 && Math.abs(deltaT) <= 1 ? "OK" : "DRIFT";
            log(`[POS-DEBUG] "${layer.name}" AFTER move:  left=${Math.round(afterMove.left)} top=${Math.round(afterMove.top)} | drift: dL=${deltaL} dT=${deltaT} ${ok}`);
            log(`[RULE]   moved dx=${Math.round(dx)} dy=${Math.round(dy)}`);
          }
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
      const sources = await resolveSelectedArtboardsMulti();
      const sourceDoc = app.activeDocument;
      log(`Sources selected: ${sources.length} (${sources.map(s => s.name).join(", ")})`);

      // Find the rightmost edge of all existing artboards once — every source
      // row starts its targets at this X so the new grid sits to the right of
      // the existing artboards instead of overlapping them.
      let maxRight = -Infinity;
      for (const layer of sourceDoc.layers) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            const r = rectSize(desc.artboard?.artboardRect || desc.bounds);
            if (r.right > maxRight) maxRight = r.right;
          }
        } catch (e) { /* skip */ }
      }
      if (!isFinite(maxRight)) maxRight = sources[0].size.right;
      const rowStartX = maxRight + 80;

      // Each source becomes its own row in the grid. Rows are spaced by the
      // tallest target height (+ gap) — using the source's own Y would make
      // tall targets (e.g. 300x600) overlap when sources are stacked closely
      // (e.g. three 300x50 sources sit only ~50px apart).
      const ROW_GAP = 80;
      const maxTargetH = targets.reduce((m, t) => Math.max(m, t.height), 0);
      const rowHeight = maxTargetH + ROW_GAP;
      // Anchor the first row to the topmost source so the grid starts at a
      // predictable Y. Using min of source tops keeps it visually close.
      const gridStartY = sources.reduce((m, s) => Math.min(m, s.size.top), Infinity);

      log(`[GRID] sources=${sources.length} targets=${targets.length}`);
      log(`[GRID] maxRight=${maxRight} → rowStartX=${rowStartX}`);
      log(`[GRID] maxTargetH=${maxTargetH} rowHeight=${rowHeight} gridStartY=${gridStartY}`);
      sources.forEach((s, i) => {
        log(`[GRID]   src[${i}] "${s.name}" rect=(L${s.size.left},T${s.size.top},R${s.size.right},B${s.size.bottom}) ${s.size.width}x${s.size.height}`);
      });

      // Frame-token matching: when a source name carries a frame prefix
      // (e.g. "...-F2"), filter the target list to entries with the SAME
      // prefix (e.g. "F2-300x600"). This avoids the cross-product blowup
      // when the user has 3 source frames and N targets per frame — they
      // really want F1→F1, F2→F2, F3→F3, not 3×N.
      // Sources without a frame token clone all targets (legacy behavior).
      const frameMatchEnabled = matchFrameTokenEnabled?.checked !== false;
      function extractFrameToken(name) {
        // Match a -F<digits> token anywhere in the name. Anchor on a leading
        // separator and trailing word-boundary so "Animated-600x100-F2"
        // returns "F2" but "Footer" returns null.
        const m = String(name || "").match(/[-_ ](F\d+)(?:[-_ ]|$)/);
        return m ? m[1] : null;
      }

      // Pre-compute filtered target set per source so progress totals are
      // accurate (don't count targets we'll skip).
      const targetsPerSource = sources.map(s => {
        if (!frameMatchEnabled) return targets;
        const tok = extractFrameToken(s.name);
        if (!tok) return targets;
        const filtered = targets.filter(t => t.variant === tok);
        // If filter eliminates everything, fall back to all targets so the
        // user isn't silently left with no clones for this source.
        return filtered.length ? filtered : targets;
      });
      const totalProgressMax = targetsPerSource.reduce((sum, t) => sum + t.length, 0);
      let totalProgressDone = 0;

      // Snapshot every source's original artboardRect — Photoshop will push
      // sources around as we duplicate artboards in/out, and the helper
      // restores each source to its original spot after running. Once all
      // sources are processed we re-restore (a 2nd pass) to undo any drift
      // caused by *later* sources.
      const originalRects = sources.map(s => ({ left: s.size.left, top: s.size.top }));

      for (let si = 0; si < sources.length; si++) {
        const source = sources[si];
        const srcTargets = targetsPerSource[si];
        const rowY = gridStartY + si * rowHeight;
        if (srcTargets.length !== targets.length) {
          const tok = extractFrameToken(source.name);
          log(`=== Source ${si + 1}/${sources.length}: ${source.name} → rowY=${rowY} (frame=${tok}, ${srcTargets.length}/${targets.length} targets) ===`);
        } else {
          log(`=== Source ${si + 1}/${sources.length}: ${source.name} → rowY=${rowY} ===`);
        }
        if (!srcTargets.length) {
          log(`  Skip: no matching targets for this source`);
          continue;
        }
        await cloneOneSourceAsArtboards({
          source,
          originalRect: originalRects[si],
          targets: srcTargets,
          sourceDoc,
          rowStartX,
          rowY,
          progressBase: totalProgressDone,
          progressMax: totalProgressMax,
        });
        totalProgressDone += srcTargets.length;
      }

      // Final pass: restore every source to its original location. After
      // source N runs, sources N+1..end may have drifted again because they
      // weren't touched by the per-source restore inside the helper.
      log(`[POS] Final pass: restoring all sources to original positions`);
      for (let si = 0; si < sources.length; si++) {
        const s = sources[si];
        const orig = originalRects[si];
        try {
          const desc = await getLayerDescriptor(s.id);
          const cur = rectSize(desc.artboard?.artboardRect || desc.bounds);
          const dx = orig.left - cur.left;
          const dy = orig.top - cur.top;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            log(`[POS] "${s.name}" drift=(${Math.round(dx)},${Math.round(dy)}) → restoring`);
            await selectLayerById(s.id);
            await bp([{
              _obj: "move",
              _target: [{ _ref: "layer", _id: s.id }],
              to: {
                _obj: "offset",
                horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
                vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
              },
              _options: { dialogOptions: "dontDisplay" }
            }]);
          }
        } catch (e) { log(`[POS] restore "${s.name}" skipped: ${e.message}`); }
      }

      log("=== Clone complete ===");
      log(`${sources.length * targets.length} artboard(s) created in same document.`);
    }, { commandName: "Banner Cloner - Clone Artboards" });
    log(`[PERF] cloneAsArtboards total: ${Math.round(perfNow() - tTotal)}ms for ${parseSizes(sizesInput.value).length} target(s)`);
  } catch (e) {
    // Surface the full error info — `e.message` alone is sometimes
    // undefined (PS throws plain strings or Error-like objects), which
    // gives the unhelpful "Clone error: undefined" line.
    const msg = (e && (e.message || e.toString())) || String(e);
    const stack = e && e.stack ? e.stack : "(no stack)";
    log("Clone error: " + msg);
    log("Clone error stack: " + stack);
  } finally {
    hideProgress();
    cloneBtn.disabled = false;
    cloneBtn.textContent = "Clone Artboards";
    updateActionButtonsVisibility().catch(() => {});
  }
}

// Diagnostic helper — log the full root-layer state of a doc with each
// layer's id, name, kind, isArtboard flag, and bounds. Not called in
// the normal flow; sprinkle `await snapshotDoc(tempDoc, "label")` calls
// when you need to see the layer tree at a specific step (e.g. when
// debugging a new "make artboardSection" failure mode).
async function snapshotDoc(doc, label) {
  if (!doc || !doc.layers) {
    log(`[SNAPSHOT ${label}] no doc/layers`);
    return;
  }
  log(`[SNAPSHOT ${label}] ${doc.layers.length} root layer(s):`);
  for (let i = 0; i < doc.layers.length; i++) {
    const l = doc.layers[i];
    let isArtb = "?";
    let rect = "";
    let abRect = "";
    try {
      const d = await getLayerDescriptor(l.id);
      isArtb = !!(d.artboardEnabled || d.artboard);
      const fmt = v => v && typeof v === "object" && "_value" in v ? v._value : v;
      const b = d.bounds;
      if (b) rect = `bounds=(L${fmt(b.left)},T${fmt(b.top)},R${fmt(b.right)},B${fmt(b.bottom)})`;
      const ar = d.artboard?.artboardRect;
      if (ar) abRect = `artbRect=(L${fmt(ar.left)},T${fmt(ar.top)},R${fmt(ar.right)},B${fmt(ar.bottom)})`;
    } catch (e) { isArtb = `err:${e.message}`; }
    const childCount = l.layers ? l.layers.length : 0;
    log(`[SNAPSHOT ${label}]   [${i}] id=${l.id} name="${l.name}" kind=${l.kind} isArtboard=${isArtb} children=${childCount} ${rect} ${abRect}`);
  }
}

// Process a single source artboard: build template doc, loop targets, place
// new artboards in a row at (rowStartX, rowY). rowY is computed by the caller
// to space rows by the tallest target so they don't overlap.
async function cloneOneSourceAsArtboards({ source, originalRect, targets, sourceDoc, rowStartX, rowY, progressBase, progressMax }) {
      const { base: baseName, sep: baseSep, tail: baseTail } = stripSizeSuffix(source.name);
      // Make sure we read source bounds from the source doc — by the 2nd+
      // source iteration the active doc may have drifted to a clone.
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      // Re-read the source's CURRENT rect — by the 2nd+ iteration the source
      // may have been pushed down by Photoshop after duplicating artboards
      // back from the temp doc. Using cached `source.size` here would point
      // the drift-restore step at the wrong Y, so the source ends up shifted
      // each time and subsequent sources read stale positions.
      const srcDescNow = await getLayerDescriptor(source.id);
      const srcRect = rectSize(srcDescNow.artboard?.artboardRect || srcDescNow.bounds);
      const srcBounds = rectSize(srcDescNow.bounds);
      log(`Source artboard: ${source.name} (${srcRect.width}x${srcRect.height}) rowY-passed=${rowY}`);
      log(`[POS] source artboardRect=(${srcRect.left},${srcRect.top},${srcRect.right},${srcRect.bottom})`);
      log(`[POS] source bounds=(${srcBounds.left},${srcBounds.top},${srcBounds.right},${srcBounds.bottom})`);

      // Capture content layout from source artboard
      const sourceLayout = await captureContentLayout(source.layer, srcRect.width, srcRect.height);
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      let nextX = rowStartX;

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

      // Flatten template: keep ONLY the selected artboard. Delete:
      //   - all other artboards (and their subtrees)
      //   - all root-level layers that aren't artboards (stray layers like
      //     "Rectangle 4", "Screenshot ...", or any group sitting outside an
      //     artboard). Without this, those strays survive the canvas crop
      //     and end up wrapped into the new artboard later — which makes
      //     `make artboardSection` produce a degenerate / non-artboard top
      //     layer because the merged selection rect is wrong.
      const tFlatten = perfNow();
      const abToDelete = [];
      let abToFlatten = null;
      for (const layer of [...templateDoc.layers]) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          const isArtb = !!(desc.artboardEnabled || desc.artboard);
          if (isArtb) {
            if (layer.name === source.name) {
              abToFlatten = layer;
            } else {
              abToDelete.push(layer);
            }
          } else {
            // Root-level non-artboard layer — delete it (it's noise that the
            // user has hidden in the source PSD but still lives in the file).
            abToDelete.push(layer);
          }
        } catch (e) { /* skip */ }
      }

      // Batch-delete non-selected artboards in a SINGLE batchPlay call.
      // Multi-target `_id` array deletes all artboards (and their children — Photoshop
      // removes the whole subtree when you delete an artboard container) in one round-trip
      // instead of N×(children+1) round-trips. Massive speedup for docs with many artboards.
      if (abToDelete.length) {
        try {
          await bp([{
            _obj: "delete",
            _target: abToDelete.map(ab => ({ _ref: "layer", _id: ab.id })),
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[PERF] Batch-deleted ${abToDelete.length} artboard(s) in 1 call`);
        } catch (e) {
          // Fallback: per-artboard delete (no per-child loop — Photoshop deletes subtree on artboard delete)
          log(`[PERF] Batch delete failed (${e.message}), falling back to per-artboard`);
          for (const ab of abToDelete) {
            try {
              await selectLayerById(ab.id);
              await bp([{
                _obj: "delete",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              }]);
            } catch (e2) { /* skip */ }
          }
        }
      }
      perfLog(`Flatten template (delete ${abToDelete.length} artboards)`, tFlatten);

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
        setProgress(progressBase + ti + 1, progressMax, `${source.name} → ${target.raw}`);
        log(`--- Clone ${target.raw} ---`);
        const tTarget = perfNow();
        const newName = suffixNameEl.checked ? `${baseName}${baseSep}${target.raw}${baseTail}` : target.raw;

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

        // Uniform-scale mode: shrink the entire doc (image + all layers) by the
        // contain ratio, THEN resize canvas to the target. This gives a faithful
        // miniature of the source — same composition, just smaller — and bypasses
        // smart match / JSON rules entirely. Aspect mismatch >30% logs a warning
        // because the result will have large empty bands on the off-axis.
        const uniformEnabled = uniformScaleEl?.checked === true;
        if (uniformEnabled) {
          // Hybrid cover/contain. When source vs target aspect is close (≤3x
          // axis ratio), use COVER — fill the canvas, crop the off-axis (e.g.
          // 1080x1350 → 1080x1920 zooms 1.42x to fill height, crops a little
          // width). When aspect is far apart (>3x), cover would zoom 10x+ and
          // discard most content, so we fall back to CONTAIN — the artwork
          // fits entirely inside the canvas with empty bands on the off-axis
          // (e.g. 600x100 → 1920x1080 scales 3.2x to fill width, height ends
          // up 320 with letterbox top/bottom).
          //
          // Multi-frame source workflow: the template doc still carries the
          // original sourceDoc canvas (e.g. 600x354 holding F1/F2/F3 stacked).
          // imageSize would scale the WHOLE doc, but canvasSize anchor=center
          // afterwards would crop to wrong rows. Pre-crop the doc canvas to
          // the source artboard rect so imageSize only sees the artboard area.
          await cropCanvasTo(srcRect.left, srcRect.top, srcRect.right, srcRect.bottom);
          log(`[UNIFORM] pre-crop doc to artboard rect (${srcRect.left},${srcRect.top})-(${srcRect.right},${srcRect.bottom}) = ${srcRect.width}x${srcRect.height}`);

          const sx = target.width / srcRect.width;
          const sy = target.height / srcRect.height;
          const axisRatio = Math.max(sx, sy) / Math.min(sx, sy);
          const useCover = axisRatio <= 3;
          const scale = useCover ? Math.max(sx, sy) : Math.min(sx, sy);
          const fillAxis = (scale === sx) ? "width" : "height";
          const aspectSrc = srcRect.width / srcRect.height;
          const aspectTgt = target.width / target.height;
          const aspectDelta = Math.abs(aspectSrc - aspectTgt) / aspectSrc;
          if (!useCover) {
            log(`[UNIFORM] aspect ratio ${axisRatio.toFixed(2)}x — using CONTAIN (cover would zoom ${Math.max(sx, sy).toFixed(2)}x and crop most content). Result will have empty bands on the off-axis.`);
          } else if (aspectDelta > 0.3) {
            log(`[UNIFORM] WARNING: aspect mismatch ${(aspectDelta * 100).toFixed(0)}% (source ${aspectSrc.toFixed(2)}:1 → target ${aspectTgt.toFixed(2)}:1). Heavy crop on the off-axis — important content near edges may be lost.`);
          }
          log(`[UNIFORM] mode=${useCover ? "cover" : "contain"} scale=${scale.toFixed(4)} fill-axis=${fillAxis} (${srcRect.width}x${srcRect.height} → ${Math.round(srcRect.width * scale)}x${Math.round(srcRect.height * scale)} inside ${target.width}x${target.height})`);
          await resizeImage(Math.round(srcRect.width * scale), Math.round(srcRect.height * scale), true);
        }

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

        // Uniform mode owns the layout — skip smart match and JSON rules.
        const hasRules = !uniformEnabled && !!(layerRules[target.raw] && layerRules[target.raw].length > 0);
        const smartEnabled = !uniformEnabled && smartMatchEl.checked;
        if (uniformEnabled) {
          log(`Mode: uniform scale (smart match & JSON rules skipped)`);
        } else {
          log(`Mode: ${hasRules ? "JSON rules" : "no rules"}${smartEnabled ? " + smart match" : ""}${!hasRules && !smartEnabled ? " (canvas only)" : ""}`);
        }

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

        // CLEAN-UP before make: delete layers that ended up FULLY OUTSIDE
        // the canvas after applyLayerRules. Such layers (typically ones
        // without a JSON rule, sitting at their original source position)
        // expand `make artboardSection`'s union-bounds calculation, which
        // makes PS guess wrong about where the artboardRect should sit
        // (it picks the densest content cluster instead of (0,0,W,H)),
        // leaving an orphan layer at root and an artboard at the wrong
        // position. Discovered via F2 case: "MFB logo" at left=-431
        // shifted artboardRect to (600,0,900,600) instead of (0,0,300,600).
        //
        // Uniform mode is exempt — its layers are deliberately offscreen as
        // part of the cover/contain crop, and the user expects every layer
        // preserved (only the canvas changes, the artwork is intact).
        if (!uniformEnabled) try {
          const canvasW = target.width;
          const canvasH = target.height;
          const orphans = [];
          // Snapshot ids first — iterating tempDoc.layers while we modify
          // the doc can cause stale references. Re-fetch by id later.
          const rootIds = tempDoc.layers.map(l => ({ id: l.id, name: l.name }));
          for (const ref of rootIds) {
            try {
              const d = await getLayerDescriptor(ref.id);
              if (d.artboardEnabled || d.artboard) continue;
              const b = d.bounds;
              if (!b) continue;
              const fmt = v => (v && typeof v === "object" && "_value" in v) ? Number(v._value) : Number(v);
              const left = fmt(b.left), top = fmt(b.top), right = fmt(b.right), bottom = fmt(b.bottom);
              if (![left, top, right, bottom].every(Number.isFinite)) continue;
              if (right <= 0 || left >= canvasW || bottom <= 0 || top >= canvasH) {
                orphans.push({ id: ref.id, name: ref.name, boundsStr: `(L${left},T${top},R${right},B${bottom})` });
              }
            } catch (e) { /* skip */ }
          }
          if (orphans.length) {
            log(`[CLEANUP] Deleting ${orphans.length} orphan layer(s) outside canvas ${canvasW}x${canvasH}`);
            for (const o of orphans) {
              try {
                await selectLayerById(o.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
                log(`[CLEANUP]   deleted "${o.name}" ${o.boundsStr}`);
              } catch (e) {
                log(`[CLEANUP]   delete failed for "${o.name}": ${e.message || e}`);
              }
            }
          }
        } catch (e) {
          log(`[CLEANUP] FATAL: ${e.message || e}`);
          throw e;
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

        let abLayer = tempDoc.layers[0];
        if (abLayer) abLayer.name = newName;
        // Verify the wrap actually produced an artboard, not a plain group/
        // layer. If `make artboardSection` silently failed (it can when the
        // selection is empty or the target rect is degenerate), abLayer ends
        // up being some other top-level layer.
        let wrapOk = false;
        try {
          const verifyDesc = await getLayerDescriptor(abLayer.id);
          wrapOk = !!(verifyDesc.artboardEnabled || verifyDesc.artboard);
          const r = verifyDesc.artboard?.artboardRect || verifyDesc.bounds;
          // Rect values may be descriptor objects {_unit, _value} — extract _value
          // for human-readable log; fall back to "?" if absent.
          const fmt = v => v && typeof v === "object" && "_value" in v ? v._value : v;
          log(`Artboard created in temp doc: ${newName} (kind=${abLayer.kind}, isArtboard=${wrapOk}, rect=(L${fmt(r?.left)},T${fmt(r?.top)},R${fmt(r?.right)},B${fmt(r?.bottom)}))`);
        } catch (e) {
          log(`Artboard verify error: ${e.message}`);
        }

        // Fallback: manual wrap. `make artboardSection` can fail silently
        // when the selection has too few layers or the rect is degenerate.
        // Strategy: create a NEW empty artboard with the correct rect, then
        // move all existing content layers INTO it. This bypasses every
        // Photoshop selection/grouping quirk because the new artboard is
        // built fresh and content is moved in via deterministic UXP DOM
        // calls — no batchPlay selection state to misread.
        if (!wrapOk) {
          log(`[WRAP-FAIL] Falling back: delete ghost + retry make artboardSection`);
          try {
            // Why: when `make artboardSection` fails silently (no real artboard
            // in tempDoc), it leaves a ghost layer at top of stack — kind
            // is smartObject/solidColor/etc, NOT artboardSection. That ghost
            // blocks subsequent `make` calls. Solution: delete ghost(s) first,
            // then retry the proper select-all + make.

            // Step 1: delete every root-level layer that is NOT an artboard.
            // The original content was wrapped into the doc's auto-created
            // "Artboard 1" by canvasSize, but the failed `make` left an
            // empty pretender on top — that pretender is what we delete.
            const ghosts = [];
            for (const l of [...tempDoc.layers]) {
              try {
                const d = await getLayerDescriptor(l.id);
                const isArtb2 = !!(d.artboardEnabled || d.artboard);
                if (!isArtb2) ghosts.push(l);
              } catch (e) { /* skip */ }
            }
            for (const g of ghosts) {
              try {
                await selectLayerById(g.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              } catch (e) {
                try { g.delete(); } catch (e2) { /* ignore */ }
              }
            }
            if (ghosts.length) log(`[WRAP-FAIL]   deleted ${ghosts.length} ghost layer(s)`);

            // Step 2: find the real artboard PS auto-created during canvasSize.
            let realArtb = null;
            for (const l of tempDoc.layers) {
              try {
                const d = await getLayerDescriptor(l.id);
                if (d.artboardEnabled || d.artboard) { realArtb = l; break; }
              } catch (e) { /* skip */ }
            }
            if (!realArtb) throw new Error("no artboard found in tempDoc after ghost-cleanup");

            // Step 3: resize the real artboard to target size via editArtboardEvent.
            await selectLayerById(realArtb.id);
            await bp([{
              _obj: "editArtboardEvent",
              _target: [{ _ref: "layer", _id: realArtb.id }],
              artboardRect: {
                _obj: "classFloatRect",
                top: 0, left: 0,
                bottom: target.height, right: target.width
              },
              _options: { dialogOptions: "dontDisplay" }
            }]);

            try { realArtb.name = newName; } catch (e) { /* ignore */ }
            const desc2 = await getLayerDescriptor(realArtb.id);
            const ok2 = !!(desc2.artboardEnabled || desc2.artboard);
            log(`[WRAP-FAIL] Reused artboard: isArtboard=${ok2}, name=${realArtb.name}, children=${realArtb.layers?.length || 0}`);
            abLayer = realArtb;
          } catch (e) {
            log(`[WRAP-FAIL] Fallback failed: ${e.message}`);
          }
        }

        // Snapshot the FULL descendant id set in sourceDoc before duplicate.
        // Tree-wide (not just root) so the post-duplicate id-diff doesn't
        // false-match a layer deep inside an existing group whose id happens
        // to differ. We also restrict the post-search to artboards only —
        // duplicating an artboard from another doc creates exactly one new
        // artboard, plus a bunch of child layers we don't care about.
        const beforeIds = new Set();
        function collectAllIds(layers, into) {
          for (const l of layers || []) {
            into.add(l.id);
            if (l.layers && l.layers.length) collectAllIds(l.layers, into);
          }
        }
        collectAllIds(sourceDoc.layers, beforeIds);

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

        // Find the newly-inserted ARTBOARD anywhere in the tree (not just
        // root). When the source doc had a layer selected inside a group
        // before paste, Photoshop nests the artboard INSIDE that group/
        // artboard — so it doesn't appear at root. Walk the full tree to
        // locate it. Match strategy:
        //   1. Find layer by exact name (newName) — most reliable: the
        //      artboard we just renamed has a unique name in the doc.
        //   2. Fallback: id-diff against the full pre-duplicate snapshot,
        //      but ONLY accept artboard-kind hits (skip rename-induced id
        //      churn on non-artboard layers).
        function findInTree(layers, predicate) {
          for (const l of layers || []) {
            if (predicate(l)) return l;
            if (l.layers && l.layers.length) {
              const hit = findInTree(l.layers, predicate);
              if (hit) return hit;
            }
          }
          return null;
        }
        async function isArtboardLayer(l) {
          try {
            const d = await getLayerDescriptor(l.id);
            return !!(d && (d.artboardEnabled || d.artboard));
          } catch (e) { return false; }
        }
        let newAb = findInTree(sourceDoc.layers, l => l.name === newName);
        if (!newAb) {
          // Tree-wide id-diff fallback. Collect candidates first, then
          // confirm artboard-kind on each (avoid matching a freshly-renamed
          // child layer whose id changed).
          const candidates = [];
          (function walk(layers) {
            for (const l of layers || []) {
              if (!beforeIds.has(l.id)) candidates.push(l);
              if (l.layers && l.layers.length) walk(l.layers);
            }
          })(sourceDoc.layers);
          for (const c of candidates) {
            if (await isArtboardLayer(c)) { newAb = c; break; }
          }
        }

        // If artboard ended up nested (parent !== document), unnest it.
        //
        // `_obj: "move"` with `_value: "back"` only reorders within the
        // current parent — it doesn't escape the parent. Use UXP DOM
        // `layer.move(targetLayer, ElementPlacement.PLACEAFTER)` instead,
        // pointing at a root-level layer as the placement reference. This
        // lifts the layer out of its current parent and drops it next to
        // the reference at root level.
        if (newAb && newAb.parent && newAb.parent !== sourceDoc) {
          log(`[POS] "${newAb.name}" nested under "${newAb.parent.name}" → unnesting to root`);
          try {
            // Find any sibling at root that we can place AFTER (so the new
            // artboard ends up at root). Prefer a non-artboard so the new
            // artboard doesn't accidentally become child of a sibling artboard.
            let placementRef = null;
            for (const l of sourceDoc.layers) {
              if (l.id !== newAb.id) { placementRef = l; break; }
            }
            if (!placementRef) throw new Error("no root sibling to place after");
            const { constants } = require("photoshop");
            // PLACEBEFORE puts the layer ABOVE the reference in the stack
            // (visually higher). PLACEAFTER would put it below. Either is
            // fine for unnesting — the move() call moves the layer to the
            // reference's parent, which is the root document.
            newAb.move(placementRef, constants.ElementPlacement.PLACEBEFORE);
            // Re-resolve to refresh JS handle's parent reference.
            newAb = findInTree(sourceDoc.layers, l => l.id === newAb.id) || newAb;
            const parentName = newAb.parent === sourceDoc ? "<root>" : (newAb.parent?.name || "<unknown>");
            log(`[POS] "${newAb.name}" after unnest: parent=${parentName}`);
          } catch (e) {
            log(`[POS] unnest failed: ${e.message}`);
          }
        }
        if (newAb) {
          await selectLayerById(newAb.id);
        }
        if (newAb) {
          const abDesc = await getLayerDescriptor(newAb.id);
          const abRect = rectSize(abDesc.artboard?.artboardRect || abDesc.bounds);
          const abBounds = rectSize(abDesc.bounds);
          log(`[POS] "${newAb.name}" beforeMove artboardRect=(L${abRect.left},T${abRect.top},R${abRect.right},B${abRect.bottom}) bounds=(L${abBounds.left},T${abBounds.top},R${abBounds.right},B${abBounds.bottom})`);
          const targetY = rowY != null ? rowY : srcBounds.top;
          const moveX = nextX - abBounds.left;
          const moveY = targetY - abBounds.top;
          log(`[POS] "${newAb.name}" rowY=${rowY} (passed in) → targetY=${targetY}, nextX=${nextX}`);
          log(`[POS] "${newAb.name}" target=(${nextX},${targetY}) move=(${Math.round(moveX)},${Math.round(moveY)})`);
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
          // Verify after move — use artboardRect (not bounds) since bounds
          // may be reduced if content doesn't fill the artboard.
          const afterDesc = await getLayerDescriptor(newAb.id);
          const afterRect = rectSize(afterDesc.artboard?.artboardRect || afterDesc.bounds);
          const afterBounds = rectSize(afterDesc.bounds);
          log(`[POS] "${newAb.name}" afterMove artboardRect=(L${afterRect.left},T${afterRect.top},R${afterRect.right},B${afterRect.bottom}) bounds=(L${afterBounds.left},T${afterBounds.top}) expected=(${nextX},${targetY})`);
          const dxAct = afterRect.left - nextX;
          const dyAct = afterRect.top - targetY;
          if (Math.abs(dxAct) > 1 || Math.abs(dyAct) > 1) {
            log(`[POS] !! "${newAb.name}" DRIFT after move: dx=${Math.round(dxAct)} dy=${Math.round(dyAct)}`);
          }
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

      // Restore source artboard to its ORIGINAL position (not the position
      // we re-read at the top of this helper — that may already be drifted).
      const restoreTarget = originalRect || { left: srcRect.left, top: srcRect.top };
      const finalSrcDesc = await getLayerDescriptor(source.id);
      const finalSrcRect = rectSize(finalSrcDesc.artboard?.artboardRect || finalSrcDesc.bounds);
      const driftX = restoreTarget.left - finalSrcRect.left;
      const driftY = restoreTarget.top - finalSrcRect.top;
      if (Math.abs(driftX) > 0.5 || Math.abs(driftY) > 0.5) {
        log(`[POS] Source drifted to (${finalSrcRect.left},${finalSrcRect.top}). Restoring to (${restoreTarget.left},${restoreTarget.top})...`);
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

      // Resolve selected artboards (1+). If none selected we still allow a
      // fallback: treat the whole document as a single anonymous source.
      let sources = [];
      try {
        sources = await resolveSelectedArtboardsMulti();
      } catch (e) {
        sources = [null]; // sentinel for "no artboard, use whole doc"
      }
      log(`Sources selected: ${sources.length}${sources[0] ? ` (${sources.map(s => s.name).join(", ")})` : " (whole document)"}`);

      let totalDone = 0;
      const totalMax = sources.length * targets.length;
      for (let si = 0; si < sources.length; si++) {
        const selectedAb = sources[si];
        if (selectedAb) log(`=== Source ${si + 1}/${sources.length}: ${selectedAb.name} ===`);
        await cloneOneSourceAsDocs({
          selectedAb,
          targets,
          sourceDoc,
          progressBase: totalDone,
          progressMax: totalMax,
        });
        totalDone += targets.length;
      }

      log("=== Clone complete ===");
      log(`${totalMax} document(s) created. Adjust content, then Export.`);
    }, { commandName: "Banner Cloner - Clone" });
  } catch (e) {
    log("Clone error: " + e.message);
  } finally {
    hideProgress();
    cloneBtn.disabled = false;
    cloneBtn.textContent = "Clone Artboards";
    updateActionButtonsVisibility().catch(() => {});
  }
}

// Build template doc from one source artboard, then duplicate-and-resize per
// target size. Each target becomes its own new document.
async function cloneOneSourceAsDocs({ selectedAb, targets, sourceDoc, progressBase, progressMax }) {
      const srcW = selectedAb ? selectedAb.size.width : sourceDoc.width;
      const srcH = selectedAb ? selectedAb.size.height : sourceDoc.height;
      const { base: baseName, sep: baseSep, tail: baseTail } = selectedAb
        ? stripSizeSuffix(selectedAb.name)
        : stripSizeSuffix(sourceDoc.title.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, ""));
      log(`Source: ${selectedAb ? selectedAb.name : sourceDoc.title} (${srcW}x${srcH})`);

      // Capture content layout from source
      const sourceLayout = selectedAb
        ? await captureContentLayout(selectedAb.layer, srcW, srcH)
        : null;
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      // Switch to source doc before duplicating (active doc may have drifted
      // to a previously-created clone if this is the 2nd+ source iteration)
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);

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

      // Batch-delete non-selected artboards in a SINGLE batchPlay call.
      // Photoshop deletes the whole subtree when you delete an artboard container,
      // so per-child loop is unnecessary. Multi-target `_id` array → one round-trip.
      const tFlattenDocs = perfNow();
      if (toDelete.length) {
        try {
          await bp([{
            _obj: "delete",
            _target: toDelete.map(ab => ({ _ref: "layer", _id: ab.id })),
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[PERF] Batch-deleted ${toDelete.length} artboard(s) in 1 call`);
        } catch (e) {
          log(`[PERF] Batch delete failed (${e.message}), falling back to per-artboard`);
          for (const ab of toDelete) {
            try {
              await selectLayerById(ab.id);
              await bp([{
                _obj: "delete",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              }]);
            } catch (e2) { /* skip */ }
          }
        }
      }
      perfLog(`Flatten template (delete ${toDelete.length} artboards)`, tFlattenDocs);

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
        setProgress(progressBase + ti + 1, progressMax, `${baseName} → ${target.raw}`);
        log(`--- Clone ${target.raw} ---`);
        const newName = suffixNameEl.checked ? `${baseName}${baseSep}${target.raw}${baseTail}` : target.raw;

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
    updateActionButtonsVisibility().catch(() => {});
  }
}

// ─── Refresh source info ───

async function refreshSource() {
  try {
    const sources = await resolveSelectedArtboardsMulti();
    if (sources.length === 1) {
      const s = sources[0];
      sourceNameEl.textContent = s.name;
      sourceSizeEl.textContent = `${s.size.width}x${s.size.height}`;
      log(`Source: ${s.name} (${s.size.width}x${s.size.height})`);
    } else {
      sourceNameEl.textContent = `${sources.length} artboards`;
      // Show distinct sizes (usually all the same when cloning frames)
      const sizes = [...new Set(sources.map(s => `${s.size.width}x${s.size.height}`))];
      sourceSizeEl.textContent = sizes.join(", ");
      log(`Sources (${sources.length}): ${sources.map(s => s.name).join(", ")}`);
    }
  } catch (e) {
    sourceNameEl.textContent = "-";
    sourceSizeEl.textContent = "-";
    log("Refresh: " + e.message);
  }
  updateActionButtonsVisibility().catch(() => {});
}

// Show Export + Split + Apply Rules only when the active doc has more than 1 artboard
// (i.e. the user has cloned at least one new artboard from the source — or already had multiple).
async function updateActionButtonsVisibility() {
  let count = 0;
  try {
    const doc = app.activeDocument;
    if (doc) {
      for (const layer of doc.layers) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) count++;
          if (count > 1) break;  // early exit — we only need to know "more than 1"
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* no doc — keep buttons hidden */ }
  const show = count > 1 ? "" : "none";
  exportBtn.style.display = show;
  splitBtn.style.display = show;
  if (typeof splitSection !== "undefined" && splitSection) splitSection.style.display = show;
  // Apply Rules requires ≥2 artboards AND user has imported JSON in THIS session
  // (not counting rules persisted from previous sessions — those would surprise the user)
  const applyRulesSection = document.getElementById("applyRulesSection");
  if (applyRulesSection) applyRulesSection.style.display = (count > 1 && jsonImportedThisSession) ? "" : "none";
}

// Tracks whether user clicked Import JSON in the current plugin session.
// Reset on plugin reload — persisted layerRules in localStorage do NOT count.
let jsonImportedThisSession = false;

// ─── Settings: Layer Rules per target size ───

const settingsPanel = document.getElementById("settingsPanel");
const sizeGroupsContainer = document.getElementById("sizeGroupsContainer");

// Data: { "300x250": [{ name, top, left, right, bottom, scale }], ... }
let layerRules = {};
const expandedSizes = new Set(); // size keys that are explicitly expanded (default: collapsed)

// Layer rules are session-only — NOT persisted to localStorage.
// Rationale: stale rules surviving across sessions caused clone bugs where
// sizes without an explicit rule still entered the JSON-rules code path
// (with undefined coordinates) and dropped layers. Users now must Import
// JSON each session if they want rule-based clones.
function loadLayerRules() {
  layerRules = {};
  // Clear any pre-existing persisted rules from older builds so they don't
  // get re-loaded if persistence is ever re-enabled.
  try { localStorage.removeItem("bannerCloner_layerRules"); } catch (e) {}
}

function saveLayerRules() {
  // No-op — see loadLayerRules. Kept as a stub so existing callsites compile.
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
    sizeGroupsContainer.appendChild(buildSizeGroup(sizeKey));
  });
}

// Re-render a single size group in place (no full list rebuild). Used when
// adding/removing a rule: full re-render rebuilds thousands of sp-textfields
// across all sizes which is unbearably slow in UXP.
function rerenderSizeGroup(sizeKey) {
  const oldNode = sizeGroupsContainer.querySelector(`.size-group[data-size="${CSS.escape(sizeKey)}"]`);
  if (!oldNode) { renderSizeGroups(); return; }
  const newNode = buildSizeGroup(sizeKey);
  oldNode.replaceWith(newNode);
}

function buildSizeGroup(sizeKey) {
    const rules = getRulesForSize(sizeKey);
    const group = document.createElement("div");
    group.className = "size-group";
    group.setAttribute("data-size", sizeKey);

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
      // Remove from Target Sizes input
      const currentSizes = parseSizes(sizesInput.value).map(s => s.raw).filter(s => s !== sizeKey);
      sizesInput.value = currentSizes.join(" ");
      // Remove DOM node directly — full re-render of all size groups is O(N×M) of
      // sp-textfield creation, which is very slow in UXP for large rule sets.
      group.remove();
      // Defer storage + chip refresh so the X-click feels instant
      setTimeout(() => {
        saveLayerRules();
        renderPresets();
        updateSizesCount();
      }, 0);
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
        // Re-render JUST this size group (not the whole list) so sibling rules get
        // fresh idx closures. Full re-render rebuilds thousands of sp-textfields
        // across all sizes, which is unbearably slow in UXP.
        rerenderSizeGroup(sizeKey);
        setTimeout(saveLayerRules, 0);
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
      rerenderSizeGroup(sizeKey);
      setTimeout(saveLayerRules, 0);
    });
    body.appendChild(addBtn);

    group.appendChild(body);
    return group;
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

// Find the JSON size that matches PSD source (or closest by area).
// Variant-aware: when multiple sizes share the dim (vd v1/v2/v3-300x600),
// prefer the lowest-numbered variant (v1, then v2, ...). Plain (no variant)
// always wins over any variant.
function findBaseSizeFromJson(srcW, srcH) {
  if (!importedJson || !importedJson.sizes) return null;

  const variantNumOf = (s) => {
    const m = (s.name || "").match(/^v(\d+)-/i);
    return m ? parseInt(m[1], 10) : -1; // -1 = plain (no variant) → wins
  };
  const pickLowestVariant = (candidates) => {
    if (!candidates.length) return null;
    return candidates.slice().sort((a, b) => variantNumOf(a) - variantNumOf(b))[0];
  };

  // Exact match by name (vd source artboard tên "v2-300x600")
  const nameExact = importedJson.sizes.find(s => s.name === `${srcW}x${srcH}`);
  if (nameExact) return nameExact;

  // Match by dimensions — collect all then pick lowest variant (plain > v1 > v2 ...)
  const dimMatches = importedJson.sizes.filter(s => s.width === srcW && s.height === srcH);
  if (dimMatches.length) return pickLowestVariant(dimMatches);

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

// ─── layer-full.json (PSD-tree) → rules format adapter ───
//
// `clone-banner-sizes` skill outputs an array of artboards with nested
// `layers[]` (PSD tree). Plugin natively expects `{ moduleName, sizes[].elements{} }`
// (CSS-rule flat map). This adapter converts on the fly so users can import
// either format.
function isLayerFullFormat(json) {
  return Array.isArray(json) && json.length > 0
    && json[0] && typeof json[0] === "object"
    && typeof json[0].artboard === "string"
    && Array.isArray(json[0].layers);
}

function angleToCssDirection(angle) {
  const a = ((Number(angle) % 360) + 360) % 360;
  const map = { 0: "to top", 45: "to top right", 90: "to right", 135: "to bottom right",
                180: "to bottom", 225: "to bottom left", 270: "to left", 315: "to top left" };
  if (map[a]) return map[a];
  // Fallback: snap to nearest 45°
  const nearest = Math.round(a / 45) * 45 % 360;
  return map[nearest] || "to bottom";
}

function flattenLayersToElements(layers, out, parentOffsetX = 0, parentOffsetY = 0, parentPath = "", siblingCounts = null) {
  if (!Array.isArray(layers)) return;
  // Track sibling-name occurrences AT THIS LEVEL so dups get " 2", " 3", ... suffix.
  // Each recursive call gets its own siblingCounts (children of different parents
  // with same display name don't share a counter — that's handled by parentPath).
  const sibCounts = siblingCounts || new Map();
  for (const layer of layers) {
    const name = layer && layer.name;
    const b = layer.bounds || {};
    // PSD bounds.top/left are absolute within the canvas. The plugin's applyLayerRules
    // expects rule.top/left to be RELATIVE to the parent group (it adds the parent
    // ancestor offset back). So we subtract parent.bounds to get the relative coords.
    const relTop = (typeof b.top === "number") ? b.top - parentOffsetY : undefined;
    const relLeft = (typeof b.left === "number") ? b.left - parentOffsetX : undefined;

    // Compute path-aware key: "Can2/Image/Can". Sibling dups (same parent + same
    // display name) get " 2", " 3", ... suffix in encounter order.
    let pathKey = null;
    if (name) {
      const seen = sibCounts.get(name) || 0;
      sibCounts.set(name, seen + 1);
      const segment = seen > 0 ? `${name} ${seen + 1}` : name;
      pathKey = parentPath ? `${parentPath}/${segment}` : segment;
    }

    // Recurse into children FIRST (bottom-up insertion). The plugin's applyLayerRules
    // skips any layer whose parent group already had a rule applied, so children must
    // appear in the rules dict BEFORE their parent group — otherwise the group runs
    // first, marks itself as matched, and every child gets skipped.
    if (layer && Array.isArray(layer.children)) {
      const childOffsetX = (typeof b.left === "number") ? b.left : parentOffsetX;
      const childOffsetY = (typeof b.top === "number") ? b.top : parentOffsetY;
      flattenLayersToElements(layer.children, out, childOffsetX, childOffsetY, pathKey || parentPath, new Map());
    }

    if (pathKey && !out[pathKey]) {  // path-keyed: siblings with dup names already disambiguated above
      const elem = {};
      if (relTop !== undefined) elem.top = `${relTop}px`;
      if (relLeft !== undefined) elem.left = `${relLeft}px`;
      if (typeof b.width === "number") elem.width = `${b.width}px`;
      if (typeof b.height === "number") elem.height = `${b.height}px`;
      // Element box width/height (used for scale computation)
      if (typeof b.width === "number") elem.widthElement = `${b.width}px`;
      if (typeof b.height === "number") elem.heightElement = `${b.height}px`;
      // Text fields
      if (layer.text) {
        if (layer.text.fontSize) elem.fontSize = String(layer.text.fontSize);
        if (layer.text.color) elem.color = layer.text.color;
      }
      // Solid color fill
      if (layer.kind === "solidColor" && layer.fillColor && !elem.color) {
        elem.color = layer.fillColor;
      }
      // Opacity (PSD: 0-100; rules use direct value, parseJsonToRules stores as string)
      if (typeof layer.opacity === "number" && layer.opacity !== 100) {
        elem.opacity = layer.opacity;
      }
      // Gradient mask direction
      if (layer.mask && typeof layer.mask.angle === "number") {
        elem.direction = angleToCssDirection(layer.mask.angle);
      }
      out[pathKey] = elem;
    }
  }
}

function convertLayerFullToRules(artboards) {
  const sizes = artboards.map(ab => {
    const elements = {};
    flattenLayersToElements(ab.layers, elements);
    // Extract size token from artboard name; supports plain (300x600),
    // variant (v1-300x600), frame (F1-300x600), or any "<prefix>-300x600".
    const m = String(ab.artboard || "").match(/((?:[A-Za-z]\w*-)?\d+x\d+)$/);
    const name = m ? m[1] : `${ab.width}x${ab.height}`;
    return { name, width: ab.width, height: ab.height, elements };
  });
  // Derive moduleName by stripping the trailing size token from the first artboard
  const firstName = String(artboards[0]?.artboard || "imported");
  const moduleName = firstName.replace(/[-_ ](?:[A-Za-z]\w*-)?\d+x\d+$/, "") || "imported";
  return { moduleName, sizes };
}

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

// When a dimension has only ONE variant in the import (e.g. only `v1-970x250`,
// no v2/v3), strip the variant prefix so the artboard ends up named
// `mybanner_970x250` instead of `mybanner_v1-970x250`. Plain (no-variant)
// keys are left alone. Mutates the rules object AND the importedJson.sizes
// array so downstream lookups (sizesInput autofill, base size match) agree.
function dedupSingleVariants(rules, json) {
  const byDim = new Map();
  for (const key of Object.keys(rules)) {
    const m = key.match(/^(?:[A-Za-z]\w*-)?(\d+x\d+)$/);
    if (!m) continue;
    const dim = m[1];
    if (!byDim.has(dim)) byDim.set(dim, []);
    byDim.get(dim).push(key);
  }
  const renamed = [];
  for (const [dim, keys] of byDim.entries()) {
    if (keys.length !== 1) continue;     // multiple variants — keep prefixes
    const only = keys[0];
    if (only === dim) continue;          // already plain
    rules[dim] = rules[only];
    delete rules[only];
    renamed.push({ from: only, to: dim });
  }
  if (json && Array.isArray(json.sizes)) {
    for (const r of renamed) {
      const s = json.sizes.find(x => x.name === r.from);
      if (s) s.name = r.to;
    }
  }
  return renamed;
}

async function importJson() {
  try {
    const file = await fs.getFileForOpening({ types: ["json"] });
    if (!file) { log("Import cancelled."); return; }

    const contents = await file.read();
    let json = JSON.parse(contents);

    // Auto-detect layer-full.json (PSD-tree) format and convert to rules format.
    // Lets users import output from the `clone-banner-sizes` skill directly.
    if (isLayerFullFormat(json)) {
      const artboardCount = json.length;
      json = convertLayerFullToRules(json);
      log(`[IMPORT] Detected layer-full format → converted ${artboardCount} artboard(s) to rules`);
    }

    // Parse and populate layerRules
    layerRules = parseJsonToRules(json);

    // If a dim has only one variant in the import (e.g. only v1-970x250),
    // collapse it to plain `970x250` so cloned artboards drop the version
    // suffix. Multi-variant dims keep their prefixes.
    const renamed = dedupSingleVariants(layerRules, json);
    if (renamed.length) {
      log(`[IMPORT] Single-variant dims collapsed: ${renamed.map(r => `${r.from}→${r.to}`).join(", ")}`);
    }
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
    jsonImportedThisSession = true;
    updateActionButtonsVisibility().catch(() => {});
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
        // Extract size key from artboard name. Prefix-aware so names like
        // "Banner_v2-300x600" or "Banner_F1-300x600" map to rules keyed
        // "v2-300x600" / "F1-300x600" (not bare "300x600").
        const sizeMatch = ab.name.match(/((?:[A-Za-z]\w*-)?\d+x\d+)/);
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
const exportModeSection = document.getElementById("exportModeSection");
const exportModeDetected = document.getElementById("exportModeDetected");
const exportModeOverrideEnabled = document.getElementById("exportModeOverrideEnabled");
const exportModeOverridePanel = document.getElementById("exportModeOverridePanel");
const exportModeOverrideSelect = document.getElementById("exportModeOverrideSelect");
const autoRenameDupsEnabled = document.getElementById("autoRenameDupsEnabled");

// Parse a frame/version token out of an artboard name. Looks for the part
// AFTER a "WxH" size token. Returns { token, prefix } where prefix is the
// alphabetic prefix shared across frames (e.g. "F" for "F1/F2/F3", "Step"
// for "Step1/Step2"). Returns { token: null } if no frame suffix found.
function parseFrameToken(name) {
  // Match: <anything>(sep)(WxH)(sep)(token)
  // sep = - _ space. token = alphanumeric+ at end.
  const m = /[-_ ]\d+x\d+[-_ ]([A-Za-z0-9]+)$/i.exec(name || "");
  if (!m) return { token: null, prefix: null };
  const token = m[1];
  // Extract alphabetic prefix (e.g. "F" from "F1", "Step" from "Step1")
  const pm = /^([A-Za-z]+)\d*$/.exec(token);
  return { token, prefix: pm ? pm[1] : token };
}

// Auto-detect export mode given the currently-selected artboards.
//   single      → 1 artboard
//   multi-frame → N artboards, all same WxH, all have a frame token in name
//   layer-full  → N artboards with mixed sizes
//
// Returns { mode, reason, framePrefix } so the UI can explain its choice.
function detectExportMode(artboards) {
  if (!artboards || !artboards.length) return { mode: "single", reason: "no artboards selected" };
  if (artboards.length === 1) return { mode: "single", reason: "1 artboard selected" };

  const sizeKeys = new Set(artboards.map(a => `${a.size.width}x${a.size.height}`));
  if (sizeKeys.size > 1) {
    return { mode: "layer-full", reason: `${artboards.length} artboards across ${sizeKeys.size} different sizes` };
  }

  // All same size — check for frame tokens
  const tokens = artboards.map(a => parseFrameToken(a.name));
  const allHaveToken = tokens.every(t => t.token);
  if (allHaveToken) {
    const prefixes = new Set(tokens.map(t => t.prefix));
    const framePrefix = prefixes.size === 1 ? [...prefixes][0] : null;
    return {
      mode: "multi-frame",
      reason: `${artboards.length} artboards, same size, frame tokens: ${tokens.map(t => t.token).join(", ")}`,
      framePrefix,
    };
  }

  // Same size but no frame tokens — ambiguous, treat as multi-frame anyway
  return { mode: "multi-frame", reason: `${artboards.length} artboards, same size, no frame tokens (will use index)` };
}

// Refresh the Export Mode UI hint based on current selection.
async function refreshExportModeUI() {
  try {
    const artboards = await resolveSelectedArtboards();
    const detected = detectExportMode(artboards);
    exportModeSection.style.display = "";
    exportModeDetected.innerHTML = `<strong>Auto-detected: ${detected.mode}</strong> — ${detected.reason}`;
    if (!exportModeOverrideEnabled.checked) {
      exportModeOverrideSelect.value = detected.mode;
    }
  } catch (e) {
    exportModeSection.style.display = "none";
  }
}

exportModeOverrideEnabled.addEventListener("change", () => {
  exportModeOverridePanel.style.display = exportModeOverrideEnabled.checked ? "" : "none";
});

// Photoshop color descriptor quirk: green channel is stored under `grain` in
// some contexts (textStyle.color, layer effects), as `green` in others.
// Check both to avoid silently returning G=0 (magenta-ish artifact).
function readRGB(c) {
  if (!c) return null;
  const r = Math.round(c.red?._value ?? c.red ?? 0);
  const g = Math.round(
    c.grain?._value ?? c.grain ?? c.green?._value ?? c.green ?? 0
  );
  const b = Math.round(c.blue?._value ?? c.blue ?? 0);
  return `${r}, ${g}, ${b}`;
}

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
    if (style.fontStyleName) {
      const styleName = String(style.fontStyleName);
      const isItalic = /italic|oblique/i.test(styleName) || style.syntheticItalic === true;
      const weightName = styleName.replace(/\s*(italic|oblique)\s*/i, "").trim() || "Regular";
      result.fontWeight = weightName;
      if (isItalic) result.fontStyle = "italic";
    } else if (style.syntheticItalic === true) {
      result.fontStyle = "italic";
    }

    // Leading (line-height)
    if (style.leading?._value) {
      result.lineHeight = Math.round(style.leading._value * scale * 100) / 100 + "px";
    }

    // Tracking (letter-spacing)
    if (style.tracking !== undefined && style.tracking !== 0) {
      result.tracking = style.tracking;
    }

    // Color
    const colorStr = readRGB(style.color);
    if (colorStr) result.color = colorStr;

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
    return readRGB(adj[0]?.color);
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
      result.stops = colors.map(stop => ({
        color: readRGB(stop.color) || "0, 0, 0",
        location: stop.location ?? 0
      }));
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
      const dsColor = readRGB(ds.color);
      if (dsColor) result.dropShadow.color = dsColor;
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
      const stColor = readRGB(st.color);
      if (stColor) result.stroke.color = stColor;
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
          result.gradientOverlay.stops = colors.map(stop => ({
            color: readRGB(stop.color) || "0, 0, 0",
            location: stop.location ?? 0
          }));
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
      const sfColor = readRGB(sf.color);
      if (sfColor) result.colorOverlay.color = sfColor;
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

function readSmartObjectSrc(desc) {
  try {
    return desc.smartObject?.fileReference ||
           desc.smartObjectMore?.fileReference ||
           desc.smartObject?.link?.fileReference ||
           null;
  } catch (e) { return null; }
}

function readMaskInfo(desc) {
  try {
    const hasUser = desc.hasUserMask === true;
    const hasVector = desc.hasVectorMask === true;
    if (!hasUser && !hasVector) return null;
    const result = {};
    if (hasUser) {
      result.hasUserMask = true;
      if (desc.userMaskEnabled !== undefined) result.enabled = desc.userMaskEnabled !== false;
      const density = desc.userMaskDensity?._value;
      if (density !== undefined) result.density = density;
      const feather = desc.userMaskFeather?._value;
      if (feather !== undefined) result.feather = feather;
    }
    if (hasVector) {
      result.hasVectorMask = true;
      if (desc.vectorMaskEnabled !== undefined) result.vectorMaskEnabled = desc.vectorMaskEnabled !== false;
    }
    return result;
  } catch (e) { return null; }
}

// ─── Mask gradient analysis ────────────────────────────────────────────────
//
// Goal: convert PSD user mask raster pixels into CSS-ready gradient params
//   { type: "linearGradient" | "radialGradient", angle, stops: [...] }
//
// PSD descriptor does NOT expose gradient params for raster user masks (mask
// is rasterized once painted). We sample mask channel pixels via UXP imaging
// API, detect linear pattern, and derive params for CSS output.
//
// Set MASK_VERBOSE = true to dump descriptor keys, pixel strips, and full
// step-by-step detection. Defaults to false to keep export logs clean.
const MASK_VERBOSE = false;
function vlog(msg) { if (MASK_VERBOSE) log(msg); }

async function analyzeMaskGradient(layerId, layerName, desc) {
  vlog(`[MASK ANALYZE] ─── "${layerName}" (id=${layerId}) ───`);

  // Dump descriptor mask-related keys
  if (MASK_VERBOSE) {
    try {
      const maskKeys = Object.keys(desc).filter(k => /mask/i.test(k));
      vlog(`[MASK ANALYZE] desc mask keys: [${maskKeys.join(", ") || "(none)"}]`);
      for (const k of maskKeys) {
        let val = desc[k];
        try {
          if (typeof val === "object" && val !== null) val = JSON.stringify(val);
        } catch (_) { val = "[unserializable]"; }
        const s = String(val);
        vlog(`[MASK ANALYZE]   ${k} = ${s.length > 200 ? s.slice(0, 200) + "..." : s}`);
      }
    } catch (e) {
      vlog(`[MASK ANALYZE] desc dump error: ${e.message}`);
    }
  }

  if (!desc.hasUserMask) {
    vlog(`[MASK ANALYZE] no user mask channel — skipping`);
    return null;
  }

  if (!imaging) {
    log(`[MASK] "${layerName}" — imaging API unavailable, cannot analyze gradient`);
    return null;
  }

  // Fetch mask pixels via imaging.getLayerMask
  let pixelData = null;
  let buf = null;
  let dims = { width: 0, height: 0 };
  try {
    const docId = app.activeDocument.id;
    await core.executeAsModal(async () => {
      pixelData = await imaging.getLayerMask({
        documentID: docId,
        layerID: layerId,
        kind: constants?.LayerMaskKind?.USER || "user"
      });
    }, { commandName: "Read Layer Mask Pixels" });

    if (!pixelData) {
      log(`[MASK] "${layerName}" — getLayerMask returned null, skip`);
      return null;
    }

    const w = pixelData.imageData?.width ?? pixelData.width ?? 0;
    const h = pixelData.imageData?.height ?? pixelData.height ?? 0;
    dims = { width: w, height: h };
    vlog(`[MASK ANALYZE] dimensions: ${w} × ${h}, sourceBounds: ${JSON.stringify(pixelData.sourceBounds || {})}`);

    if (pixelData.imageData?.getData) buf = await pixelData.imageData.getData();
    else if (pixelData.getData) buf = await pixelData.getData();
  } catch (e) {
    log(`[MASK] "${layerName}" — analyze error: ${e.message}`);
    return null;
  }

  if (!buf || !buf.length || !dims.width || !dims.height) {
    log(`[MASK] "${layerName}" — no pixel buffer, skip`);
    return null;
  }

  // Compute LAYER's visible region within the mask buffer.
  // Mask channel covers `boundsNoMask` (entire reachable area). Sample only
  // inside layer.bounds where the gradient actually matters.
  const w = dims.width;
  const h = dims.height;

  const srcB = pixelData?.sourceBounds || null;
  const srcLeft   = srcB?.left   ?? srcB?.x ?? 0;
  const srcTop    = srcB?.top    ?? srcB?.y ?? 0;
  const srcWidth  = srcB?.width  ?? (srcB ? (srcB.right  - srcB.left) : w);
  const srcHeight = srcB?.height ?? (srcB ? (srcB.bottom - srcB.top)  : h);

  const lb = desc?.bounds;
  const layerLeft   = lb?.left?._value   ?? lb?.left   ?? 0;
  const layerTop    = lb?.top?._value    ?? lb?.top    ?? 0;
  const layerRight  = lb?.right?._value  ?? lb?.right  ?? w;
  const layerBottom = lb?.bottom?._value ?? lb?.bottom ?? h;

  const doc2pxX = w / srcWidth;
  const doc2pxY = h / srcHeight;
  const regionX0 = Math.max(0, Math.round((layerLeft   - srcLeft) * doc2pxX));
  const regionY0 = Math.max(0, Math.round((layerTop    - srcTop)  * doc2pxY));
  const regionX1 = Math.min(w, Math.round((layerRight  - srcLeft) * doc2pxX));
  const regionY1 = Math.min(h, Math.round((layerBottom - srcTop)  * doc2pxY));
  const regionW = Math.max(1, regionX1 - regionX0);
  const regionH = Math.max(1, regionY1 - regionY0);
  vlog(`[MASK ANALYZE] sampling region in mask buffer: x=[${regionX0}..${regionX1}] y=[${regionY0}..${regionY1}] (${regionW}×${regionH})`);

  const sample = (x, y) => {
    const xi = Math.max(0, Math.min(w - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(h - 1, Math.round(y)));
    return buf[yi * w + xi]; // mask is single-channel grayscale 0–255
  };

  // 3×3 grid INSIDE the layer's region (used for diagonal detection only)
  const grid = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = regionX0 + (regionW - 1) * col / 2;
      const y = regionY0 + (regionH - 1) * row / 2;
      const labels = [["TL", "TM", "TR"], ["ML", "MM", "MR"], ["BL", "BM", "BR"]];
      grid.push([labels[row][col], sample(x, y)]);
    }
  }
  if (MASK_VERBOSE) {
    vlog(`[MASK ANALYZE] 3×3 grid (alpha 0=transparent, 255=opaque):`);
    for (let i = 0; i < 9; i += 3) {
      vlog(`[MASK ANALYZE]   ${grid[i][0]}=${grid[i][1]}  ${grid[i + 1][0]}=${grid[i + 1][1]}  ${grid[i + 2][0]}=${grid[i + 2][1]}`);
    }
  }

  // Step 4: sample STRIPS (vertical + horizontal) — 21 points each for finer
  // gradient curve resolution. Strip values become candidate stops.
  const STRIP_N = 21; // 21 points = 5%-step samples
  const stripX = regionX0 + regionW / 2;
  const vStrip = [];
  for (let i = 0; i < STRIP_N; i++) {
    const y = regionY0 + (regionH - 1) * i / (STRIP_N - 1);
    vStrip.push(sample(stripX, y));
  }
  const stripY = regionY0 + regionH / 2;
  const hStrip = [];
  for (let i = 0; i < STRIP_N; i++) {
    const x = regionX0 + (regionW - 1) * i / (STRIP_N - 1);
    hStrip.push(sample(x, stripY));
  }
  vlog(`[MASK ANALYZE] vStrip (${STRIP_N}): ${vStrip.join(" ")}`);
  vlog(`[MASK ANALYZE] hStrip (${STRIP_N}): ${hStrip.join(" ")}`);

  // Outlier filter:
  //   • Middle samples → 3-window median, replace if deviation > 80
  //   • First/last sample → can't use a centered window (clamping reuses the
  //     outlier itself). Use linear extrapolation from the 2 inward neighbors.
  //     If the value diverges from BOTH (a) the extrapolated trend and
  //     (b) the immediate neighbor by > 80, treat as edge artifact.
  function smoothOutliers(arr) {
    const out = arr.slice();
    // Middle elements
    for (let i = 1; i < out.length - 1; i++) {
      const window = [out[i - 1], out[i], out[i + 1]].sort((a, b) => a - b);
      const med = window[1];
      if (Math.abs(out[i] - med) > 80) out[i] = med;
    }
    if (out.length < 3) return out;
    // First element
    {
      const expected = 2 * out[1] - out[2];
      if (Math.abs(out[0] - expected) > 80 && Math.abs(out[0] - out[1]) > 80) {
        out[0] = out[1];
      }
    }
    // Last element
    {
      const last = out.length - 1;
      const expected = 2 * out[last - 1] - out[last - 2];
      if (Math.abs(out[last] - expected) > 80 && Math.abs(out[last] - out[last - 1]) > 80) {
        out[last] = out[last - 1];
      }
    }
    return out;
  }
  const vClean = smoothOutliers(vStrip);
  const hClean = smoothOutliers(hStrip);
  if (MASK_VERBOSE) {
    if (vClean.join(",") !== vStrip.join(",")) vlog(`[MASK ANALYZE]   v-clean: ${vClean.join(" ")}`);
    if (hClean.join(",") !== hStrip.join(",")) vlog(`[MASK ANALYZE]   h-clean: ${hClean.join(" ")}`);
  }

  // Range detection — uses cleaned strip
  const vRange = Math.max(...vClean) - Math.min(...vClean);
  const hRange = Math.max(...hClean) - Math.min(...hClean);
  vlog(`[MASK ANALYZE] strip ranges: vertical=${vRange}, horizontal=${hRange}`);

  let direction = "unknown";
  let angle = 180;
  const RANGE_THRESHOLD = 40; // need at least 40/255 (~16%) variance to call it a gradient

  let dominantStrip = null;
  if (vRange >= RANGE_THRESHOLD && vRange >= hRange * 1.5) {
    // Vertical gradient — top vs bottom
    direction = vClean[0] > vClean[vClean.length - 1] ? "vertical (top opaque → bottom transparent)" : "vertical (top transparent → bottom opaque)";
    angle = vClean[0] > vClean[vClean.length - 1] ? 180 : 0;
    dominantStrip = vClean;
  } else if (hRange >= RANGE_THRESHOLD && hRange >= vRange * 1.5) {
    // Horizontal gradient — left vs right
    direction = hClean[0] > hClean[hClean.length - 1] ? "horizontal (left opaque → right transparent)" : "horizontal (left transparent → right opaque)";
    angle = hClean[0] > hClean[hClean.length - 1] ? 90 : 270;
    dominantStrip = hClean;
  } else if (vRange >= RANGE_THRESHOLD && hRange >= RANGE_THRESHOLD) {
    direction = "diagonal";
    // Approximate diagonal angle using vertical+horizontal magnitudes.
    // CSS: 0=up, 90=right, 180=down, 270=left.
    const dy = vClean[0] - vClean[vClean.length - 1]; // positive = top brighter (fades down)
    const dx = hClean[hClean.length - 1] - hClean[0]; // positive = right brighter
    angle = (Math.round(Math.atan2(dx, dy) * 180 / Math.PI) + 360) % 360;
    dominantStrip = vRange >= hRange ? vClean : hClean;
  } else {
    direction = "uniform / no gradient detected";
  }
  vlog(`[MASK ANALYZE] direction: ${direction}, angle ≈ ${angle}°`);

  // Step 5: build stops from the dominant strip — direct 1:1 mapping.
  let stops = [];
  if (dominantStrip) {
    // Reduce 21-point strip to a manageable number of stops (5-7) by
    // picking inflection points OR uniform sampling. Simple uniform:
    const STOP_COUNT = 7;
    for (let i = 0; i < STOP_COUNT; i++) {
      const idx = Math.round((dominantStrip.length - 1) * i / (STOP_COUNT - 1));
      const v = dominantStrip[idx];
      stops.push({
        position: Math.round(i * 100 / (STOP_COUNT - 1)),
        opacity: Math.round(v / 255 * 100),
      });
    }
  }
  vlog(`[MASK ANALYZE] sampled stops: ${JSON.stringify(stops)}`);

  if (direction === "uniform / no gradient detected" || stops.length === 0) {
    log(`[MASK] "${layerName}" — uniform mask, no gradient`);
    return { detected: false };
  }

  const result = {
    type: "linearGradient",
    angle,
    stops,
  };
  // Compact summary for production logs
  const stopsCompact = stops.map(s => `${s.position}:${s.opacity}%`).join(", ");
  log(`[MASK] "${layerName}" — gradient detected: ${direction}, angle=${angle}°, stops=[${stopsCompact}]`);
  return result;
}

// Rename duplicate layer names within ONE artboard (entire descendant tree).
// Scope is per-artboard so the same name across different artboards stays
// untouched — that's intentional, since downstream tools key by artboard ID
// and only collide within a single tree.
//
// Walks the artboard's full descendant tree in document order. The 1st layer
// keeps its original name; the 2nd same-named layer becomes "Name 2", 3rd
// becomes "Name 3", etc. Returns count of renamed layers.
//
// UXP layer.name is a direct setter — Photoshop captures all renames into a
// single Edit > Undo step when called from inside one executeAsModal scope.
async function renameDuplicateLayersInArtboard(artboardLayer) {
  if (!artboardLayer || !artboardLayer.layers) return 0;
  const seen = new Map(); // base-name → count of times seen so far
  let renamed = 0;
  // Capture the descendant set up-front. Mutating layer.name does NOT change
  // tree structure, so a depth-first snapshot is safe to iterate.
  const stack = [...artboardLayer.layers];
  const queue = [];
  while (stack.length) {
    const l = stack.shift();
    if (!l) continue;
    queue.push(l);
    if (l.layers && l.layers.length) {
      // Descend in document order: prepend children so they're visited next.
      stack.unshift(...l.layers);
    }
  }
  for (const layer of queue) {
    const name = layer.name;
    if (!name) continue;
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    if (count >= 2) {
      const newName = `${name} ${count}`;
      // Don't clobber a name that already happens to exist (rare: user has
      // "Shape 1" + "Shape 1 2" by hand — the auto-generated suffix would
      // collide). Bump until we find a free slot.
      let bump = count;
      let candidate = newName;
      while (seen.has(candidate)) {
        bump++;
        candidate = `${name} ${bump}`;
      }
      try {
        layer.name = candidate;
        seen.set(candidate, 1);
        renamed++;
      } catch (e) {
        log(`[RENAME] Failed to rename "${name}" → "${candidate}": ${e.message}`);
      }
    }
  }
  return renamed;
}

async function collectChildrenInfo(layers, artLeft, artTop) {
  const descs = [];
  for (const lyr of layers) {
    try { descs.push(await getLayerDescriptor(lyr.id)); }
    catch (e) { descs.push(null); }
  }
  // For each layer that's part of a clipping group (desc.group === true),
  // find the next sibling whose group !== true — that's its clip base.
  const clipBases = layers.map((_, i) => {
    const d = descs[i];
    if (!d || d.group !== true) return null;
    for (let j = i + 1; j < layers.length; j++) {
      const d2 = descs[j];
      if (d2 && d2.group !== true) return layers[j].name;
    }
    return null;
  });
  // Auto-derive `role: "clipBase"` for any layer that another sibling
  // references via clipTo. Set of base names → passed into collectLayerInfo
  // so each base layer can self-tag.
  const clipBaseNames = new Set(clipBases.filter(Boolean));
  const result = [];
  for (let i = 0; i < layers.length; i++) {
    const isClipBase = clipBaseNames.has(layers[i].name);
    result.push(await collectLayerInfo(layers[i], artLeft, artTop, descs[i], clipBases[i], isClipBase));
  }
  return result;
}

async function collectLayerInfo(layer, artLeft, artTop, preDesc = null, clipBase = null, isClipBase = false) {
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
  let desc = preDesc;
  if (!desc) {
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
  if (desc && !isGroup) {
    const radius = readBorderRadius(desc);
    if (radius !== null) info.borderRadius = radius;
  }

  // Layer effects
  if (desc) {
    const fx = readLayerEffects(desc);
    if (fx) info.layerEffects = fx;
  }

  // Transform
  if (desc && !isGroup) {
    const tx = readTransform(desc);
    if (tx) info.transform = tx;
  }

  // Smart object source — prefer the exported asset filename (synced from
  // a prior Export Assets run) over the raw PSD reference (.ai/.jpg).
  // Falls back to raw fileReference when no export has happened yet.
  if (desc && layer.kind === "smartObject") {
    const exportedFilename = assetExportMap.get(layer.id);
    if (exportedFilename) {
      info.src = exportedFilename;
    } else {
      const src = readSmartObjectSrc(desc);
      if (src) info.src = src;
    }
  }

  // Clipping mask target — name of layer this is clipped to
  if (clipBase) info.clipTo = clipBase;

  // Clip base marker — if any sibling clipped to this layer, tag it.
  // Renderer uses `role: "clipBase"` to render this element WITHOUT wrapping
  // the clipped image, so image stays as a positioning sibling (Hướng 2).
  if (isClipBase) info.role = "clipBase";

  // Layer mask info (presence + metadata; gradient mask pixels exported separately)
  if (desc) {
    const mask = readMaskInfo(desc);
    if (mask) info.mask = mask;

    // Mask gradient analysis — sample pixels to derive CSS-ready params.
    // Only runs when layer has a user mask. Diagnostic logs are verbose
    // first-pass; trim once UXP API surface is confirmed.
    if (mask?.hasUserMask) {
      try {
        const gradInfo = await analyzeMaskGradient(layer.id, layer.name, desc);
        if (gradInfo && gradInfo.detected !== false) {
          // Merge detected gradient params into info.mask
          info.mask = {
            ...info.mask,
            type: gradInfo.type,
            angle: gradInfo.angle,
            stops: gradInfo.stops,
          };
        }
      } catch (e) {
        log(`[MASK ANALYZE] error analyzing "${layer.name}": ${e.message}`);
      }
    }
  }

  // Children (recursive, with clip-base resolution among siblings)
  if (layer.layers && layer.layers.length > 0) {
    info.children = await collectChildrenInfo(layer.layers, artLeft, artTop);
  }

  return info;
}

async function exportLayerJson() {
  try {
    const doc = app.activeDocument;
    if (!doc) { log("[EXPORT JSON] No document open."); return; }

    const artboards = await resolveSelectedArtboards();
    log(`[EXPORT JSON] Exporting ${artboards.length} artboard(s)`);

    // Decide export mode: auto-detect, but honor the user's override checkbox.
    const detected = detectExportMode(artboards);
    const mode = exportModeOverrideEnabled.checked
      ? exportModeOverrideSelect.value
      : detected.mode;
    log(`[EXPORT JSON] Mode: ${mode} (${exportModeOverrideEnabled.checked ? "manual override" : "auto-detected"})`);

    // Auto-rename duplicate layer names within each artboard before reading,
    // so the exported JSON has unique keys per artboard. Off-by-default would
    // surprise users hitting dup-name bugs, so the checkbox defaults to ON.
    //
    // UXP requires layer.name = ... to run inside executeAsModal; otherwise
    // Photoshop rejects it as "saveDocumentSelection may modify the state".
    // Wrap the entire rename pass in one modal scope so all renames collapse
    // into a single Edit > Undo step.
    const autoRename = autoRenameDupsEnabled?.checked !== false;
    if (autoRename) {
      try {
        await core.executeAsModal(async () => {
          for (const ab of artboards) {
            const n = await renameDuplicateLayersInArtboard(ab.layer);
            if (n > 0) log(`[EXPORT JSON]   Renamed ${n} duplicate layer name(s) in "${ab.name}"`);
          }
        }, { commandName: "Banner Cloner — Rename Duplicate Layers" });
      } catch (e) {
        log(`[EXPORT JSON] Rename pass failed: ${e.message}`);
      }
    }

    const allArtboards = [];
    for (let i = 0; i < artboards.length; i++) {
      const ab = artboards[i];
      log(`[EXPORT JSON] Reading ${i + 1}/${artboards.length}: ${ab.name} (${ab.size.width}x${ab.size.height})`);

      const layers = await collectChildrenInfo(ab.layer.layers, ab.size.left, ab.size.top);
      const frameInfo = parseFrameToken(ab.name);

      allArtboards.push({
        artboard: ab.name,
        // Frame token enables downstream tools to render N versions per size.
        // Falls back to index-based ("frame-0", "frame-1") when name has no
        // recognizable suffix, so multi-frame mode still works.
        frame: frameInfo.token || `frame-${i}`,
        width: ab.size.width,
        height: ab.size.height,
        layers: layers
      });
    }

    // Output shape:
    //   single (1 artboard) → bare object (legacy format, backward compatible)
    //   multi-frame / layer-full → wrapper object with schema marker, so
    //     downstream tools can distinguish the two cases without heuristics
    let json;
    if (mode === "single" || allArtboards.length === 1) {
      // Strip frame field for single — it's not meaningful with one artboard.
      const { frame, ...rest } = allArtboards[0];
      json = rest;
    } else {
      // Pick the most common frame prefix for the manifest (e.g. "F" if
      // tokens are F1/F2/F3). Helps downstream UI label the dimension.
      const prefixes = allArtboards.map(a => parseFrameToken(a.artboard).prefix).filter(Boolean);
      const framePrefix = prefixes.length ? prefixes[0] : null;
      json = {
        schema: "banner-cloner-v1",
        mode,                     // "multi-frame" | "layer-full"
        frameToken: framePrefix,  // shared prefix or null
        artboards: allArtboards,
      };
    }

    const fileName = allArtboards.length === 1
      ? allArtboards[0].artboard + "_layers.json"
      : doc.name.replace(/\.[^.]+$/, "") + "_layers.json";

    // Save to file
    const file = await fs.getFileForSaving(fileName, { types: ["json"] });
    if (!file) { log("[EXPORT JSON] Cancelled."); return; }

    await file.write(JSON.stringify(json, null, 2));
    log(`[EXPORT JSON] Saved ${allArtboards.length} artboard(s) (mode=${mode}) to: ${file.name}`);
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

function hasGgPrefix(name) {
  return /^gg-/i.test((name || "").trim());
}

function isGgPrefixFilterEnabled() {
  if (!isAdvancedEnabled()) return false;
  return !!document.getElementById("filterGgPrefix")?.checked;
}

function isAdvancedEnabled() {
  return !!document.getElementById("advancedOptionsEnabled")?.checked;
}

function getJpgQuality() {
  const raw = document.getElementById("jpgQuality")?.value;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 75;
  return Math.max(0, Math.min(100, n));
}

// When Advanced options are on, path + quality are required.
// Returns { ok, errors[], fieldErrors: { id: msg } }. Also toggles .input-error CSS class.
function validateAdvancedInputs() {
  const pathEl = document.getElementById("customExportPath");
  const qualityEl = document.getElementById("jpgQuality");
  pathEl?.classList.remove("input-error");
  qualityEl?.classList.remove("input-error");

  if (!isAdvancedEnabled()) return { ok: true, errors: [], fieldErrors: {} };

  const errors = [];
  const fieldErrors = {};

  const path = (pathEl?.value || "").trim();
  if (!path) {
    fieldErrors.customExportPath = "Custom output path is required";
    pathEl?.classList.add("input-error");
  } else if (!path.startsWith("/")) {
    fieldErrors.customExportPath = "Path must be absolute (start with /)";
    pathEl?.classList.add("input-error");
  }

  const qRaw = (qualityEl?.value || "").trim();
  if (!qRaw) {
    fieldErrors.jpgQuality = "JPG quality is required";
    qualityEl?.classList.add("input-error");
  } else {
    const q = parseInt(qRaw, 10);
    if (!Number.isFinite(q) || q < 0 || q > 100) {
      fieldErrors.jpgQuality = "JPG quality must be 0-100";
      qualityEl?.classList.add("input-error");
    }
  }

  for (const msg of Object.values(fieldErrors)) errors.push(msg);
  return { ok: errors.length === 0, errors, fieldErrors };
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
    const v = validateAdvancedInputs();
    if (!v.ok) { v.errors.forEach(e => log(`[ASSETS] ${e}`)); log("[ASSETS] Fill required fields before Get Images."); return; }
    const artboards = await resolveSelectedArtboards();
    scannedArtboards = artboards;

    // Auto-rename duplicate layer names per artboard before scanning so asset
    // exportNames are unique on capture (and stay in sync with Export Layer JSON).
    const autoRename = autoRenameDupsEnabled?.checked !== false;
    if (autoRename) {
      try {
        let totalRenamed = 0;
        await core.executeAsModal(async () => {
          for (const ab of artboards) {
            const n = await renameDuplicateLayersInArtboard(ab.layer);
            if (n > 0) {
              log(`[ASSETS] Renamed ${n} duplicate layer name(s) in "${ab.name}"`);
              totalRenamed += n;
            }
          }
        }, { commandName: "Banner Cloner — Rename Duplicate Layers" });
        if (totalRenamed === 0) log(`[ASSETS] No duplicate layer names found`);
      } catch (e) {
        log(`[ASSETS] Rename pass failed: ${e.message}`);
      }
    }

    log(`[ASSETS] Scanning ${artboards.length} artboard(s)`);

    const ignoreKws = getIgnoreKeywords();
    if (ignoreKws.length) log(`[ASSETS] Ignoring: ${ignoreKws.join(", ")}`);

    const ggOnly = isGgPrefixFilterEnabled();
    if (ggOnly) log(`[ASSETS] Filter: only names starting with "gg-"`);

    scannedAssets = [];
    for (const source of artboards) {
      log(`[ASSETS] Scanning: ${source.name} (${source.size.width}x${source.size.height})`);

      // Collected items: pixel/smart object OR group treated as a single asset (gg- group when filter on).
      const items = [];
      function walk(layer) {
        if (isIgnoredLayer(layer.name, ignoreKws)) {
          log(`[ASSETS] Ignored: ${layer.name}${layer.layers && layer.layers.length ? " (group)" : ""}`);
          return;
        }
        if (layer.visible === false) {
          log(`[ASSETS] Skipped hidden: ${layer.name}${layer.layers && layer.layers.length ? " (group)" : ""}`);
          return;
        }
        const isGroup = layer.layers && layer.layers.length > 0;
        const matchesGg = hasGgPrefix(layer.name);

        if (isGroup) {
          // gg- group: export as one flattened asset, do NOT recurse into it.
          if (ggOnly && matchesGg) {
            items.push({ layer, isGroup: true });
            return;
          }
          // Otherwise keep walking to find children.
          for (const child of layer.layers) walk(child);
          return;
        }

        // Leaf layer: pixel/smartObject only.
        if (!isImageLayerForAssets(layer)) return;
        if (ggOnly && !matchesGg) return;
        items.push({ layer, isGroup: false });
      }
      for (const child of source.layer.layers) walk(child);

      for (const item of items) {
        const layer = item.layer;
        const bounds = item.isGroup
          ? await getGroupBounds(layer)
          : await getLayerBounds(layer.id);
        if (bounds.width === 0 || bounds.height === 0) continue;

        let defaultType = "PNG";
        let isVector = false;
        try {
          if (layer.kind === "smartObject") {
            const desc = await getLayerDescriptor(layer.id);
            const fileRef = desc.smartObjectMore?.fileReference;
            if (fileRef && /\.jpe?g$/i.test(fileRef)) defaultType = "JPG";
            isVector = await isVectorSmartObject(layer.id);
          }
        } catch (e) {}

        const kind = item.isGroup ? "group" : layer.kind;
        const advancedOn = isAdvancedEnabled();
        const defaultSizeMode = advancedOn
          ? "B"
          : ((layer.kind === "smartObject" && !isVector) ? "D" : "A");
        const defaultScale = advancedOn ? 1 : 2;
        // Advanced mode strips "gg-" prefix from exportName → cleaner filenames.
        const exportName = advancedOn ? layer.name.replace(/^gg-/i, "") : layer.name;
        scannedAssets.push({
          layerId: layer.id,
          layerName: layer.name,
          exportName,
          kind,
          isGroup: item.isGroup || undefined,
          isVector,
          sizeMode: defaultSizeMode,
          scale: defaultScale,
          type: defaultType,
          bounds: bounds,
          artboardRect: source.size,
          artboardId: source.id,
          artboardName: source.name
        });
      }
    }

    // Deduplicate:
    //  - Advanced on  → key = `${artboardId}::${exportName}` (per-artboard; cross-artboard dupes kept
    //    so each size folder gets its own set).
    //  - Advanced off → key = `${exportName}` (cross-artboard; only the largest instance is kept,
    //    avoiding wasted exports that would overwrite each other in the single output folder).
    const advancedDedupeOn = isAdvancedEnabled();
    const nameMap = new Map();
    for (const asset of scannedAssets) {
      const key = advancedDedupeOn
        ? `${asset.artboardId}::${asset.exportName}`
        : asset.exportName;
      const area = asset.bounds.width * asset.bounds.height;
      const existing = nameMap.get(key);
      if (!existing || area > existing.area) {
        nameMap.set(key, { asset, area });
      }
    }
    const before = scannedAssets.length;
    scannedAssets = [...nameMap.values()].map(v => v.asset);
    if (before > scannedAssets.length) {
      const scope = advancedDedupeOn ? "per-artboard" : "cross-artboard";
      log(`[ASSETS] Deduplicated ${scope}: ${before} → ${scannedAssets.length} (kept largest)`);
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

// Default-mode slug: lowercase, ASCII letters/digits/dashes/underscores only.
// Strips parentheses, punctuation, etc. so "Place your design here (Double-click to edit)"
// becomes "place-your-design-here-double-click-to-edit".
function slugifyAssetName(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-") // any run of non-allowed chars → single dash
    .replace(/-+/g, "-")            // collapse repeated dashes
    .replace(/^-+|-+$/g, "");       // trim leading/trailing dashes
}

function getAssetFilenameKey(asset) {
  const raw = asset.exportName || "";
  const safeName = isAdvancedEnabled()
    ? raw.replace(/[<>:"/\\|?*]/g, "_")
    : slugifyAssetName(raw);
  const ext = asset.type === "JPG" ? "jpg" : "png";
  return `${safeName}.${ext}`;
}

function getAssetCollisionKey(asset) {
  // Advanced mode: scope collision check per-artboard (cross-artboard dupes land
  // in different size folders, so they don't actually collide on disk).
  const file = getAssetFilenameKey(asset);
  return isAdvancedEnabled() ? `${asset.artboardId}::${file}` : file;
}

function computeAssetCollisions() {
  const counts = new Map();
  for (const a of scannedAssets) {
    const k = getAssetCollisionKey(a);
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
    const isDupe = collisions.has(getAssetCollisionKey(asset));
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
    kindBadge.textContent = asset.kind === "smartObject" ? "Smart" : (asset.kind === "group" ? "Group" : "Pixel");

    // Size/artboard source badge
    const ab = scannedArtboards.find(x => x.id === asset.artboardId);
    const sizeBadge = document.createElement("span");
    sizeBadge.className = "asset-size-badge";
    sizeBadge.textContent = ab ? getArtboardSizeKey(ab) : `${Math.round(asset.artboardRect?.width || 0)}x${Math.round(asset.artboardRect?.height || 0)}`;
    sizeBadge.title = ab ? `From artboard: ${ab.name}` : `From artboard: ${asset.artboardName || "unknown"}`;

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
    if (!isAdvancedEnabled()) nameRow.appendChild(kindBadge);
    nameRow.appendChild(sizeBadge);
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

    const advancedOn = isAdvancedEnabled();
    if (!advancedOn) {
      const sizeOptions = [
        { value: "A", label: "A - Original", tooltip: "Full layer bounds (including parts outside artboard)" },
        { value: "B", label: "B - Clipped", tooltip: "Cut to artboard (only the visible portion inside the artboard)" },
        { value: "C", label: "C - Bounds", tooltip: "Layer bounds + auto-trim transparent edges (tightest fit)" }
      ];
      if (asset.kind === "smartObject" && !asset.isVector) {
        sizeOptions.push({ value: "D", label: "D - Embedded", tooltip: "Original embedded image inside the Smart Object (highest resolution)" });
      }
      if (asset.sizeMode === "D" && !sizeOptions.some(o => o.value === "D")) {
        asset.sizeMode = "A";
      }
      fieldsRow.appendChild(createAssetCycleBtn("Size", sizeOptions, asset.sizeMode, (v) => { asset.sizeMode = v; }));
    }

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
// Extract "300x600" from "...-300x600". Fallback → full sanitized artboard name.
function getArtboardSizeKey(artboard) {
  const m = /(\d+x\d+)(?:[^a-z0-9]*)?$/i.exec(artboard.name || "");
  if (m) return m[1].toLowerCase();
  return (artboard.name || "artboard").replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "-");
}

// Resolve an existing absolute folder path. Throws if path missing or not a folder.
async function resolveExistingFolderPath(absPath) {
  const clean = absPath.replace(/\/+$/, "");
  const url = "file:" + (clean.startsWith("/") ? clean : "/" + clean);
  let entry;
  try {
    entry = await fs.getEntryWithUrl(url);
  } catch (e) {
    throw new Error(`Path not found: ${clean}`);
  }
  if (!entry || !entry.isFolder) throw new Error(`Not a folder: ${clean}`);
  return entry;
}

// Return existing child folder with name, or create it.
async function getOrCreateChildFolder(parentFolder, name) {
  try {
    const children = await parentFolder.getEntries();
    const found = children.find(e => e.name === name && e.isFolder);
    if (found) return found;
  } catch (e) {}
  return await parentFolder.createFolder(name);
}

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
    await runExportAssetsFlow(subfolder, { writeLayersJson: false, jpgQuality: getJpgQuality() });
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
async function saveActiveDocAs(folder, filename, type, { jpgQuality = 75 } = {}) {
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
    // JPG → Save for Web via batchPlay: user-controlled quality (0-100), strips
    // metadata/ICC, optimized encoder. Fallback to doc.saveAs.jpg on failure.
    const token = await fs.createSessionToken(file);
    try {
      await bp([{
        _obj: "export",
        using: {
          _obj: "SaveForWeb",
          format: { _enum: "saveForWebFormatType", _value: "JPEG" },
          quality: Math.max(0, Math.min(100, jpgQuality | 0)),
          optimized: true,
          includeProfile: false,
          interlaced: false,
          metadata: 0,
          in: { _path: token, _kind: "local" }
        },
        _options: { dialogOptions: "silent" }
      }]);
    } catch (e) {
      log(`[ASSETS] Save for Web (JPG) failed (${e.message}) — fallback to saveAs`);
      const psQuality = Math.round((jpgQuality / 100) * 12); // 0-100 → 0-12
      await doc.saveAs.jpg(file, { quality: psQuality }, true);
    }
  } else {
    // PNG → doc.saveAs.png preserves full alpha (including partial transparency).
    // Save for Web PNG24 matted partial alpha against white, producing visible
    // white patches in shadow/feather regions.
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

  const v = validateAdvancedInputs();
  if (!v.ok) { v.errors.forEach(e => log(`[ASSETS] ${e}`)); log("[ASSETS] Fill required fields before Export."); return; }

  const advanced = isAdvancedEnabled();
  const customPathRaw = advanced ? (document.getElementById("customExportPath")?.value || "").trim() : "";
  const jpgQuality = advanced ? getJpgQuality() : 75;

  // Clear stale layerId → filename mappings from prior runs. Layer IDs are
  // doc-scoped and can collide across documents.
  assetExportMap.clear();

  if (customPathRaw) {
    // Per-artboard mode — verify root exists first, no timestamp, assets only.
    let rootFolder;
    try {
      rootFolder = await resolveExistingFolderPath(customPathRaw);
    } catch (e) {
      log(`[ASSETS] ${e.message}. Folder gốc phải tồn tại — aborted.`);
      return;
    }
    log(`[ASSETS] Custom output root: ${customPathRaw}`);

    // Advanced mode forces Mode B (clip to artboard visible area) for every asset,
    // even if they were scanned before Advanced was toggled on.
    for (const a of scannedAssets) a.sizeMode = "B";

    // Group assets by artboardId preserving original order.
    const groups = new Map();
    for (const a of scannedAssets) {
      if (!groups.has(a.artboardId)) groups.set(a.artboardId, []);
      groups.get(a.artboardId).push(a);
    }

    const aggregatedForHtml = [];
    for (const [abId, assets] of groups) {
      const ab = scannedArtboards.find(x => x.id === abId);
      if (!ab) { log(`[ASSETS] Artboard ${abId} not found — skipped`); continue; }
      const sizeKey = getArtboardSizeKey(ab);
      try {
        const sizeFolder = await getOrCreateChildFolder(rootFolder, sizeKey);
        const assetsFolder = await getOrCreateChildFolder(sizeFolder, "assets");
        log(`[ASSETS] → ${sizeKey}/assets/ (${assets.length} asset(s) from "${ab.name}")`);
        const exported = await runExportAssetsFlow(assetsFolder, { writeLayersJson: false, scopedAssets: assets, jpgQuality });
        if (generateInfoHtmlInput?.checked && Array.isArray(exported)) {
          for (const it of exported) aggregatedForHtml.push({ ...it, pathPrefix: `${sizeKey}/assets` });
        }
      } catch (e) {
        log(`[ASSETS] Failed "${ab.name}" → ${sizeKey}/: ${e.message}`);
      }
    }

    if (generateInfoHtmlInput?.checked && aggregatedForHtml.length) {
      try {
        const html = buildAssetsIndexHtml(aggregatedForHtml);
        const htmlFile = await rootFolder.createFile("info-image.html", { overwrite: true });
        await htmlFile.write(html);
        log(`[ASSETS] Saved: info-image.html at root (${aggregatedForHtml.length} item(s))`);
      } catch (e) {
        log(`[ASSETS] info-image.html skipped: ${e.message}`);
      }
    }

    log(`[ASSETS] Synced ${assetExportMap.size} layer→filename mapping(s).`);
    return;
  }

  // Default mode — picker + timestamped subfolder.
  const parent = await fs.getFolder();
  if (!parent) { log("[ASSETS] Export cancelled."); return; }

  let label = "assets";
  try {
    const docName = (app.activeDocument.name || "assets").replace(/\.(psd|psb|jpg|jpeg|png|tif|tiff)$/i, "");
    label = `assets-${docName.replace(/[<>:"/\\|?*]/g, "_")}`;
  } catch (e) {}

  const subfolder = await createTimestampedSubfolder(parent, label);
  log(`[ASSETS] Output: ${subfolder.name}/`);

  await runExportAssetsFlow(subfolder, { jpgQuality });
  log(`[ASSETS] Synced ${assetExportMap.size} layer→filename mapping(s). Run Export Layer JSON now to bake them into JSON.`);
}

async function runExportAssetsFlow(folder, { writeLayersJson = true, scopedAssets = null, jpgQuality = 75 } = {}) {
  const exportedAssets = [];
  const assetList = scopedAssets || scannedAssets;
  await core.executeAsModal(async () => {
    const sourceDoc = app.activeDocument;
    const sourceDocId = sourceDoc.id;

    for (let i = 0; i < assetList.length; i++) {
      const asset = assetList[i];
      let tempDocId = null;

      try {
        log(`[ASSETS] (${i + 1}/${assetList.length}) ${asset.exportName} — mode=${asset.sizeMode}, ${asset.scale}x, ${asset.type}`);

        // Filename
        // Advanced mode: keep filename identical to PSD layer name
        //   (only strip illegal filesystem chars; preserve case, spaces, underscores).
        // Default mode: lowercase ASCII slug — strips parens/punctuation, gaps → "-".
        const safeName = isAdvancedEnabled()
          ? asset.exportName.replace(/[<>:"/\\|?*]/g, "_")
          : slugifyAssetName(asset.exportName);
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
          await bp([{ _obj: "placedLayerEditContents", _options: { dialogOptions: "silent" } }]);

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
            try { await bp([{ _obj: "flattenImage", _options: { dialogOptions: "silent" } }]); } catch (e) {}
          }

          const savedD = await saveActiveDocAs(folder, filename, asset.type, { jpgQuality });
          if (savedD) {
            exportedAssets.push({ ...savedD, exportName: asset.exportName, kind: asset.kind, sizeMode: asset.sizeMode });
            assetExportMap.set(asset.layerId, filename);
          }

          // Close temp doc by ID
          await bp([{
            _obj: "close",
            _target: [{ _ref: "document", _id: tempDocId }],
            saving: { _enum: "yesNo", _value: "no" },
            _options: { dialogOptions: "silent" }
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
        // Force resolution=72 so distanceUnit (points) maps 1:1 to pixels — avoids
        // PS scaling temp doc when source doc is at 300 DPI.
        const tempDocName = "__asset_temp_" + Date.now() + "__";
        const sourceRes = 72;
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
          _options: { dialogOptions: "silent" }
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
          _options: { dialogOptions: "silent" }
        }]);

        // Select target layer in source
        await selectLayerById(asset.layerId);

        // Duplicate layer into the new temp doc by name
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "document", _name: tempDocName },
          _options: { dialogOptions: "silent" }
        }]);

        // Switch to temp doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: tempDocId }],
          _options: { dialogOptions: "silent" }
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
            await bp([{ _obj: "flattenImage", _options: { dialogOptions: "silent" } }]);
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
          try { await bp([{ _obj: "flattenImage", _options: { dialogOptions: "silent" } }]); } catch (e) {}
        }

        // Save
        const saved = await saveActiveDocAs(folder, filename, asset.type, { jpgQuality });
        if (saved) {
          exportedAssets.push({ ...saved, exportName: asset.exportName, kind: asset.kind, sizeMode: asset.sizeMode });
          assetExportMap.set(asset.layerId, filename);
        }

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
          const layersInfo = await collectChildrenInfo(source.layer.layers, source.size.left, source.size.top);
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

      // Generate info-image.html gallery (full export only)
      if (exportedAssets.length) {
        try {
          const html = buildAssetsIndexHtml(exportedAssets);
          const htmlFile = await folder.createFile("info-image.html", { overwrite: true });
          await htmlFile.write(html);
          log(`[ASSETS] Saved: info-image.html (${exportedAssets.length} item(s))`);
        } catch (e) {
          log(`[ASSETS] info-image.html skipped: ${e.message}`);
        }
      }
    }

    log(`[ASSETS] === Export complete: ${assetList.length} asset(s) ===`);

  }, { commandName: "Banner Cloner - Export Assets" });

  return exportedAssets;
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
  // Derive group key from pathPrefix (e.g. "300x600/assets" → "300x600").
  // Items without pathPrefix go into the unnamed group "" (single-folder exports).
  const groupOrder = [];
  const groupMap = new Map();
  for (const it of items) {
    const key = (it.pathPrefix || "").split("/")[0] || "";
    if (!groupMap.has(key)) { groupMap.set(key, []); groupOrder.push(key); }
    groupMap.get(key).push(it);
  }

  const renderCard = (it) => {
    const name = escapeHtml(it.exportName || it.filename);
    const fname = encodeURIComponent(it.filename);
    const prefix = it.pathPrefix ? it.pathPrefix.split("/").map(encodeURIComponent).join("/") + "/" : "";
    const href = `./${prefix}${fname}`;
    const kind = escapeHtml(it.kind === "smartObject" ? "Smart" : (it.kind === "group" ? "Group" : "Pixel"));
    const dims = `${it.width} × ${it.height}`;
    const size = formatFileSize(it.bytes);
    return `
    <figure class="card">
      <a href="${href}" target="_blank" rel="noopener">
        <img src="${href}" alt="${name}" loading="lazy">
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
  };

  const sections = groupOrder.map(key => {
    const list = groupMap.get(key);
    const bytes = list.reduce((s, i) => s + (i.bytes || 0), 0);
    const heading = key
      ? `<h2 class="group-title">${escapeHtml(key)} <span class="group-meta">${list.length} item(s) · ${formatFileSize(bytes)}</span></h2>`
      : "";
    return `${heading}\n<section class="grid">\n${list.map(renderCard).join("\n")}\n</section>`;
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
  .group-title { font-size: 15px; font-weight: 600; color: #8bc34a; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #333; }
  .group-title .group-meta { font-size: 12px; font-weight: 400; color: #888; margin-left: 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
  .card { margin: 0; background: #242424; border: 1px solid #333; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
  .card img { display: block; max-width: 100%; height: auto; margin: 0 auto; background: repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px; cursor: zoom-in; }
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
${sections}
</body>
</html>`;
}

async function addGroupToAssets() {
  try {
    const v = validateAdvancedInputs();
    if (!v.ok) { v.errors.forEach(e => log(`[ASSETS] ${e}`)); log("[ASSETS] Fill required fields before Add Group."); return; }
    const doc = app.activeDocument;
    if (!doc) { log("[ASSETS] No document open."); return; }
    const sel = doc.activeLayers?.[0];
    if (!sel) { log("[ASSETS] Please select a group in Layers panel."); return; }
    if (!sel.layers || !sel.layers.length) {
      log("[ASSETS] Selected layer is not a group."); return;
    }
    if (isGgPrefixFilterEnabled() && !hasGgPrefix(sel.name)) {
      log(`[ASSETS] Skipped "${sel.name}" — filter gg- is on, group name must start with "gg-"`);
      return;
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

    const advancedOn = isAdvancedEnabled();
    const exportName = advancedOn ? sel.name.replace(/^gg-/i, "") : sel.name;
    scannedAssets.push({
      layerId: sel.id,
      layerName: sel.name,
      exportName,
      kind: "group",
      isGroup: true,
      sizeMode: advancedOn ? "B" : "A",
      scale: advancedOn ? 1 : 2,
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

// ─── Advanced options persistence + toggle ───
const ADV_KEY = "bannerCloner.advancedOptions";
const advancedOptionsEnabled = document.getElementById("advancedOptionsEnabled");
const advancedOptionsPanel = document.getElementById("advancedOptionsPanel");
const customExportPathInput = document.getElementById("customExportPath");
const jpgQualityInput = document.getElementById("jpgQuality");
const filterGgPrefixInput = document.getElementById("filterGgPrefix");
const generateInfoHtmlInput = document.getElementById("generateInfoHtml");

function updateAdvancedPanelVisibility() {
  if (advancedOptionsPanel) advancedOptionsPanel.style.display = advancedOptionsEnabled?.checked ? "" : "none";
}

try {
  const saved = JSON.parse(localStorage.getItem(ADV_KEY) || "{}");
  // Advanced toggle always starts unchecked on plugin load — other fields are restored.
  if (advancedOptionsEnabled) advancedOptionsEnabled.checked = false;
  if (typeof saved.path === "string" && customExportPathInput) customExportPathInput.value = saved.path;
  if (Number.isFinite(saved.quality) && jpgQualityInput) jpgQualityInput.value = String(saved.quality);
  if (typeof saved.ggFilter === "boolean" && filterGgPrefixInput) filterGgPrefixInput.checked = saved.ggFilter;
  if (typeof saved.infoHtml === "boolean" && generateInfoHtmlInput) generateInfoHtmlInput.checked = saved.infoHtml;
} catch (e) {}
updateAdvancedPanelVisibility();

function saveAdvancedOptions() {
  try {
    localStorage.setItem(ADV_KEY, JSON.stringify({
      enabled: !!advancedOptionsEnabled?.checked,
      path: customExportPathInput?.value || "",
      quality: parseInt(jpgQualityInput?.value, 10),
      ggFilter: !!filterGgPrefixInput?.checked,
      infoHtml: !!generateInfoHtmlInput?.checked
    }));
  } catch (e) {}
}

advancedOptionsEnabled?.addEventListener("change", () => {
  updateAdvancedPanelVisibility();
  saveAdvancedOptions();
  // Advanced toggle changes dedupe scope + export naming + size-mode defaults,
  // so existing scan results become stale. Clear them to force a fresh scan.
  if (scannedAssets.length) {
    scannedAssets = [];
    scannedArtboards = [];
    assetExportMap.clear();
    log("[ASSETS] Advanced changed — scanned list cleared. Click Get Images to rescan.");
    renderAssetList();
  }
});
customExportPathInput?.addEventListener("input", () => { customExportPathInput.classList.remove("input-error"); saveAdvancedOptions(); });
jpgQualityInput?.addEventListener("input", () => { jpgQualityInput.classList.remove("input-error"); saveAdvancedOptions(); });
filterGgPrefixInput?.addEventListener("change", saveAdvancedOptions);
generateInfoHtmlInput?.addEventListener("change", saveAdvancedOptions);

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
      // Recompute the export-mode hint so the user sees what mode the JSON
      // export will use BEFORE clicking Export Layer JSON.
      refreshExportModeUI().catch(() => {});
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
  // cloneMode is the runtime clone target (documents | artboards), independent of UI tab.
  // Tab buttons only control which panel is visible.
  if (mode === "documents" || mode === "artboards") cloneMode = mode;
  tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));

  const targetSizesSection = document.getElementById("targetSizesSection");

  if (mode === "exportAssets") {
    mainContent.forEach(el => el.style.display = "none");
    settingsPanel.style.display = "none";
    exportAssetsPanel.style.display = "block";
    if (targetSizesSection) targetSizesSection.style.display = "none";
    ensureArtboardPickerLoaded().catch(e => log(`[PICKER] ${e.message}`));
  } else {
    // Default tab — Settings (also handles legacy "documents"/"artboards" calls)
    mainContent.forEach(el => el.style.display = "none");
    settingsPanel.style.display = "block";
    exportAssetsPanel.style.display = "none";
    if (targetSizesSection) targetSizesSection.style.display = "";
    renderSizeGroups();
    ensureArtboardPickerLoaded().then(() => refreshExportModeUI()).catch(e => log(`[PICKER] ${e.message}`));
  }
  // Action bar (Clone/Export/Split) is global — visibility driven by artboards count, not tab
  updateActionButtonsVisibility().catch(() => {});
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

sizesInput.addEventListener("input", applySizesChange);
suffixNameEl.addEventListener("change", saveSuffixPref);
smartMatchEl.addEventListener("change", saveSmartMatchPref);
uniformScaleEl?.addEventListener("change", saveUniformScalePref);
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
  switchMode("settings");
  setTimeout(refreshSource, 150);
});
