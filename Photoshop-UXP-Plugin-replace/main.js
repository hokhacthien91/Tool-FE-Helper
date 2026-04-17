const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;
const { app, core, action, constants } = require("photoshop");

uxp.entrypoints.setup({
  panels: {
    "content-replacer-panel": {
      show() {},
      hide() {}
    }
  }
});

// ─── State ─────────────────────────────────────────────
const state = {
  docs: [],            // [{ id, name, artboardCount }]
  totalTargets: 0,
  textEntries: [],     // [{ name, occurrences: [...], newContent, linkId, _locateIdx }]
  imageEntries: [],    // [{ name, occurrences: [...], file, token, linkId, _locateIdx }]
  idCounter: 0,
  modifiedDocIds: new Set(),
  hasScanned: false,
  scanMode: "current", // "current" | "all"
  matchByNameOnly: false,
};

function nextLinkId() { return `#${++state.idCounter}`; }
function entryDisplayName(entry) {
  return state.matchByNameOnly ? entry.name : (entry.displayPath || entry.name);
}

const SCAN_MODE_KEY = "contentReplacer.scanMode";


function loadScanMode() {
  try {
    const v = localStorage.getItem(SCAN_MODE_KEY);
    if (v === "current" || v === "all") state.scanMode = v;
  } catch (e) {}
}
function saveScanMode() {
  try { localStorage.setItem(SCAN_MODE_KEY, state.scanMode); } catch (e) {}
}

// ─── DOM refs ──────────────────────────────────────────
const scanBtn     = document.getElementById("scanBtn");
const applyBtn    = document.getElementById("applyBtn");
const saveBtn     = document.getElementById("saveBtn");
const summaryBar  = document.getElementById("summaryBar");
const docCountEl  = document.getElementById("docCount");
const targetCountEl    = document.getElementById("targetCount");
const targetBreakdown  = document.getElementById("targetBreakdown");
const scanStatus  = document.getElementById("scanStatus");
const dirtyStatus = document.getElementById("dirtyStatus");
const emptyState      = document.getElementById("emptyState");
const noResultsState  = document.getElementById("noResultsState");
const textSection = document.getElementById("textSection");
const textList    = document.getElementById("textList");
const textCount   = document.getElementById("textCount");
const imageSection= document.getElementById("imageSection");
const imageList   = document.getElementById("imageList");
const imageCount  = document.getElementById("imageCount");
const progressSection = document.getElementById("progressSection");
const progressFill    = document.getElementById("progressFill");
const progressText    = document.getElementById("progressText");
const logBox      = document.getElementById("logBox");
const logClearBtn = document.getElementById("logClearBtn");
const logCopyBtn  = document.getElementById("logCopyBtn");
const logToggle   = document.getElementById("logToggle");

// ─── Disabled helper (UXP `:disabled` isn't reliable, use class too) ──
function setDisabled(btn, disabled) {
  btn.disabled = !!disabled;
  btn.classList.toggle("is-disabled", !!disabled);
}

// ─── Logging ───────────────────────────────────────────
function log(msg) {
  console.log(msg);
  const line = document.createElement("div");
  line.textContent = msg;
  if (/error|fail/i.test(msg)) line.className = "log-error";
  else if (/done|complete|replaced|saved/i.test(msg)) line.className = "log-success";
  logBox.appendChild(line);
  logBox.scrollTop = logBox.scrollHeight;
}

logClearBtn.addEventListener("click", () => { logBox.innerHTML = ""; });

logCopyBtn.addEventListener("click", async () => {
  const text = logBox.innerText || logBox.textContent || "";
  let copied = false;

  // Method 1: execCommand with temp textarea
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    copied = document.execCommand("copy");
    document.body.removeChild(ta);
  } catch (e) {}

  // Method 2: navigator.clipboard
  if (!copied) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (e) {}
  }

  // Method 3: save to file as last resort
  if (!copied) {
    try {
      const file = await fs.getFileForSaving("content-replacer-log.txt", { types: ["txt"] });
      if (file) {
        await file.write(text);
        logCopyBtn.textContent = "Saved!";
        setTimeout(() => { logCopyBtn.textContent = "Copy"; }, 1500);
        return;
      }
    } catch (e) {
      log(`Copy failed: ${e.message || e}`);
      return;
    }
  }

  if (copied) {
    logCopyBtn.textContent = "Copied!";
    setTimeout(() => { logCopyBtn.textContent = "Copy"; }, 1500);
  }
});

logToggle.addEventListener("click", () => {
  logBox.classList.toggle("collapsed");
  logToggle.classList.toggle("collapsed");
});

// ─── Progress ──────────────────────────────────────────
function setProgress(current, total, label) {
  progressSection.style.display = "block";
  const pct = total ? Math.round((current / total) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = `${label} (${current}/${total})`;
}
function hideProgress() {
  progressSection.style.display = "none";
  progressFill.style.width = "0%";
}

// ─── batchPlay helpers ─────────────────────────────────
async function bp(commands) {
  return await action.batchPlay(commands, { synchronousExecution: true, modalBehavior: "execute" });
}

async function getLayerDescriptor(layerId) {
  const result = await bp([{
    _obj: "get",
    _target: [{ _ref: "layer", _id: layerId }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
  return result[0];
}

async function getTargetLayerDescriptor() {
  const result = await bp([{
    _obj: "get",
    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
  return result[0];
}

async function selectLayerById(layerId) {
  await bp([{
    _obj: "select",
    _target: [{ _ref: "layer", _id: layerId }],
    makeVisible: false,
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

async function switchActiveDoc(docId) {
  if (app.activeDocument && app.activeDocument.id === docId) return;
  await bp([{
    _obj: "select",
    _target: [{ _ref: "document", _id: docId }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

function rectSize(rect) {
  if (!rect) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  const left   = Number(rect.left?._value   ?? rect.left   ?? 0);
  const top    = Number(rect.top?._value    ?? rect.top    ?? 0);
  const right  = Number(rect.right?._value  ?? rect.right  ?? 0);
  const bottom = Number(rect.bottom?._value ?? rect.bottom ?? 0);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

async function getLayerBounds(layerId) {
  const desc = await getLayerDescriptor(layerId);
  return rectSize(desc.bounds);
}

// ─── Layer kind helpers ────────────────────────────────
function isTextLayer(layer)  { return layer && (layer.kind === "text" || layer.kind === "textLayer"); }
function isImageLayer(layer) { return layer && (layer.kind === "pixel" || layer.kind === "smartObject"); }
function isGroupLike(layer)  { return layer && Array.isArray(layer.layers) && layer.layers.length > 0; }

async function isArtboardLayer(layer) {
  try {
    const desc = await getLayerDescriptor(layer.id);
    return !!(desc.artboardEnabled || desc.artboard?.artboardRect);
  } catch (e) { return false; }
}

function walkLeavesInContainer(container, onLeaf, parentPath) {
  const children = container.layers || [];
  for (const c of children) {
    const path = parentPath ? `${parentPath} / ${c.name}` : c.name;
    if (isGroupLike(c)) walkLeavesInContainer(c, onLeaf, path);
    else onLeaf(c, path);
  }
}

// ─── Scan ──────────────────────────────────────────────
function collectLeaf(leaf, layerPath, docInfo, targetName, textMap, imageMap) {
  // matchByNameOnly: key = leaf name (ignores parent path → merges all paths)
  // default: key = full path (case-insensitive)
  const key = state.matchByNameOnly ? leaf.name.toLowerCase() : layerPath.toLowerCase();
  const occ = { docId: docInfo.id, docName: docInfo.name, layerId: leaf.id, target: targetName, layerPath };
  if (isTextLayer(leaf)) {
    if (!textMap.has(key)) textMap.set(key, { name: leaf.name, displayPath: layerPath, occurrences: [] });
    textMap.get(key).occurrences.push(occ);
  } else if (isImageLayer(leaf)) {
    if (!imageMap.has(key)) imageMap.set(key, { name: leaf.name, displayPath: layerPath, occurrences: [] });
    imageMap.get(key).occurrences.push(occ);
  }
}

async function scanDocuments() {
  const openDocs = [];
  if (state.scanMode === "current") {
    const cur = app.activeDocument;
    if (!cur) throw new Error("No active document in Photoshop.");
    openDocs.push(cur);
  } else {
    for (let i = 0; i < app.documents.length; i++) openDocs.push(app.documents[i]);
    if (!openDocs.length) throw new Error("No documents are open in Photoshop.");
  }

  state.docs = [];
  state.modifiedDocIds.clear();
  const textMap = new Map();
  const imageMap = new Map();
  let totalTargets = 0;
  let abBasedDocs = 0;
  let flatDocs = 0;

  for (const doc of openDocs) {
    await switchActiveDoc(doc.id);
    const docInfo = { id: doc.id, name: doc.name, artboardCount: 0 };

    const artboards = [];
    for (const l of doc.layers) {
      if (await isArtboardLayer(l)) artboards.push({ id: l.id, name: l.name, layer: l });
    }

    if (artboards.length > 0) {
      docInfo.artboardCount = artboards.length;
      totalTargets += artboards.length;
      abBasedDocs++;
      for (const ab of artboards) {
        walkLeavesInContainer(ab.layer, (leaf, path) => collectLeaf(leaf, path, docInfo, `${doc.name} / ${ab.name}`, textMap, imageMap));
      }
    } else {
      totalTargets += 1;
      flatDocs++;
      walkLeavesInContainer(doc, (leaf, path) => collectLeaf(leaf, path, docInfo, doc.name, textMap, imageMap));
    }
    state.docs.push(docInfo);
  }

  state.totalTargets = totalTargets;
  const sortByPath = (a, b) => (a.displayPath || a.name).localeCompare(b.displayPath || b.name, undefined, { numeric: true, sensitivity: "base" });
  state.textEntries  = [...textMap.values()].map(e => ({ ...e, newContent: "", linkId: "" })).sort(sortByPath);
  state.imageEntries = [...imageMap.values()].map(e => ({ ...e, file: null, token: null, linkId: "" })).sort(sortByPath);
  state.hasScanned = true;
  state.idCounter = 0;

  docCountEl.textContent = openDocs.length;
  targetCountEl.textContent = totalTargets;
  const parts = [];
  if (abBasedDocs) parts.push(`${abBasedDocs} multi-artboard`);
  if (flatDocs)    parts.push(`${flatDocs} single`);
  targetBreakdown.textContent = parts.length ? `(${parts.join(" + ")})` : "";
  scanStatus.textContent = `Found ${state.textEntries.length} text, ${state.imageEntries.length} image layer names`;
  scanStatus.className = "json-status loaded";
  log(`Scan (${state.scanMode}): ${openDocs.length} doc(s), ${totalTargets} target(s) → ${state.textEntries.length} text + ${state.imageEntries.length} image unique name(s)`);
}

// ─── Locate layer (Show button) ────────────────────────
async function locateLayer(entry, btnEl) {
  if (!entry.occurrences.length) return;
  entry._locateIdx = ((entry._locateIdx ?? -1) + 1) % entry.occurrences.length;
  const occ = entry.occurrences[entry._locateIdx];
  let hidden = false;
  try {
    await core.executeAsModal(async () => {
      await switchActiveDoc(occ.docId);
      await selectLayerById(occ.layerId);
      const desc = await getLayerDescriptor(occ.layerId);
      hidden = desc.visible === false;
    }, { commandName: "Content Replacer: Locate" });
    if (btnEl) {
      btnEl.textContent = entry.occurrences.length > 1
        ? `Show ${entry._locateIdx + 1}/${entry.occurrences.length}`
        : "Show";
      const pathInfo = occ.layerPath || occ.target;
      btnEl.title = hidden ? `${pathInfo} (hidden)` : pathInfo;
      btnEl.classList.toggle("locate-btn-hidden", hidden);
    }
    const hiddenNote = hidden ? "  ⚠ HIDDEN" : "";
    const pathNote = occ.layerPath ? ` (${occ.layerPath})` : "";
    log(`[SHOW] ${entry.name} → ${occ.target}${pathNote}${hiddenNote}`);
  } catch (e) {
    log(`Locate error: ${e.message || e}`);
  }
}

// ─── Render helpers ────────────────────────────────────
function groupEntriesByName(entries) {
  const groups = new Map();
  entries.forEach((entry, idx) => {
    const key = entry.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ entry, idx });
  });
  return groups;
}

function createGroupWrapper(name, count, container) {
  if (count <= 1) return container; // no group needed
  const group = document.createElement("div");
  group.className = "layer-group";
  group.innerHTML = `
    <div class="layer-group-header">
      <span class="toggle-icon">▼</span>
      <span class="layer-group-name"></span>
      <span class="layer-group-count">(${count})</span>
    </div>
    <div class="layer-group-body"></div>
  `;
  group.querySelector(".layer-group-name").textContent = name;
  const header = group.querySelector(".layer-group-header");
  const body = group.querySelector(".layer-group-body");
  header.addEventListener("click", () => {
    body.classList.toggle("collapsed");
    header.querySelector(".toggle-icon").textContent = body.classList.contains("collapsed") ? "▶" : "▼";
  });
  container.appendChild(group);
  return body;
}

function buildTextRow(entry, idx) {
  const row = document.createElement("div");
  row.className = "replace-row";
  row.innerHTML = `
    <div class="replace-row-head">
      <span class="replace-row-name"></span>
      <span class="replace-row-count">${entry.occurrences.length}/${state.totalTargets}</span>
      <button class="locate-btn">Show</button>
    </div>
    <div class="replace-row-id">
      <input type="text" class="link-id-input" placeholder="Link ID" />
    </div>
    <textarea class="replace-row-input" rows="2" placeholder="Leave empty to skip"></textarea>
  `;
  row.querySelector(".replace-row-name").textContent = entryDisplayName(entry);
  const idInput = row.querySelector(".link-id-input");
  idInput.value = entry.linkId || "";
  idInput.addEventListener("input", () => { state.textEntries[idx].linkId = idInput.value; });

  const input = row.querySelector("textarea");
  input.value = entry.newContent || "";
  input.addEventListener("input", () => {
    state.textEntries[idx].newContent = input.value;
    input.rows = Math.max(2, input.value.split("\n").length);
    // Auto-generate linkId when content is entered
    if (input.value.length > 0 && !idInput.value) {
      const newId = nextLinkId();
      idInput.value = newId;
      state.textEntries[idx].linkId = newId;
    }
    refreshApplyEnabled();
  });
  const showBtn = row.querySelector(".locate-btn");
  showBtn.addEventListener("click", () => locateLayer(state.textEntries[idx], showBtn));
  return row;
}

function buildImageRow(entry, idx) {
  const row = document.createElement("div");
  row.className = "replace-row";
  row.innerHTML = `
    <div class="replace-row-head">
      <span class="replace-row-name"></span>
      <span class="replace-row-count">${entry.occurrences.length}/${state.totalTargets}</span>
      <button class="locate-btn">Show</button>
    </div>
    <div class="replace-row-id">
      <input type="text" class="link-id-input" placeholder="Link ID" />
    </div>
    <div class="replace-row-file">
      <button class="file-pick-btn">Browse…</button>
      <span class="file-name">No file picked</span>
      <button class="file-clear-btn" style="display:none;">Clear</button>
    </div>
  `;
  row.querySelector(".replace-row-name").textContent = entryDisplayName(entry);
  const idInput = row.querySelector(".link-id-input");
  idInput.value = entry.linkId || "";
  idInput.addEventListener("input", () => { state.imageEntries[idx].linkId = idInput.value; });
  const showBtn = row.querySelector(".locate-btn");
  showBtn.addEventListener("click", () => locateLayer(state.imageEntries[idx], showBtn));
  const pickBtn    = row.querySelector(".file-pick-btn");
  const clearBtn   = row.querySelector(".file-clear-btn");
  const fileNameEl = row.querySelector(".file-name");

  const updateFileDisplay = () => {
    const cur = state.imageEntries[idx];
    if (cur.file) {
      fileNameEl.textContent = cur.file.name;
      fileNameEl.classList.add("has-file");
      clearBtn.style.display = "inline-block";
    } else {
      fileNameEl.textContent = "No file picked";
      fileNameEl.classList.remove("has-file");
      clearBtn.style.display = "none";
    }
    refreshApplyEnabled();
  };

  pickBtn.addEventListener("click", async () => {
    try {
      const file = await fs.getFileForOpening({ types: ["png", "jpg", "jpeg", "gif", "psd", "tif", "tiff", "bmp", "eps", "ai", "svg", "pdf"] });
      if (!file) return;
      const token = fs.createSessionToken(file);
      state.imageEntries[idx].file = file;
      state.imageEntries[idx].token = token;
      // Auto-generate linkId when file is picked
      if (!idInput.value) {
        const newId = nextLinkId();
        idInput.value = newId;
        state.imageEntries[idx].linkId = newId;
      }
      updateFileDisplay();
    } catch (e) {
      log(`File picker error: ${e.message || e}`);
    }
  });
  clearBtn.addEventListener("click", () => {
    state.imageEntries[idx].file = null;
    state.imageEntries[idx].token = null;
    updateFileDisplay();
  });
  return row;
}

// ─── Render lists ──────────────────────────────────────
function renderTextList() {
  textList.innerHTML = "";
  textCount.textContent = state.textEntries.length ? `(${state.textEntries.length})` : "";
  if (!state.textEntries.length) { textSection.style.display = "none"; return; }
  textSection.style.display = "block";

  const groups = groupEntriesByName(state.textEntries);
  for (const [name, items] of groups) {
    const target = createGroupWrapper(name, items.length, textList);
    for (const { entry, idx } of items) {
      target.appendChild(buildTextRow(entry, idx));
    }
  }
}

function renderImageList() {
  imageList.innerHTML = "";
  imageCount.textContent = state.imageEntries.length ? `(${state.imageEntries.length})` : "";
  if (!state.imageEntries.length) { imageSection.style.display = "none"; return; }
  imageSection.style.display = "block";

  const groups = groupEntriesByName(state.imageEntries);
  for (const [name, items] of groups) {
    const target = createGroupWrapper(name, items.length, imageList);
    for (const { entry, idx } of items) {
      target.appendChild(buildImageRow(entry, idx));
    }
  }
}

function renderEmptyStates() {
  if (!state.hasScanned) {
    emptyState.style.display = "block";
    noResultsState.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  const hasAny = state.textEntries.length + state.imageEntries.length > 0;
  noResultsState.style.display = hasAny ? "none" : "block";
}

function countPendingOps() {
  const texts  = state.textEntries.filter(e => (e.newContent || "").length > 0);
  const images = state.imageEntries.filter(e => !!e.token);
  const textTargets  = texts.reduce((s, e) => s + e.occurrences.length, 0);
  const imageTargets = images.reduce((s, e) => s + e.occurrences.length, 0);
  return {
    textCount: texts.length,
    imageCount: images.length,
    totalLayerOps: textTargets + imageTargets,
  };
}

function refreshApplyEnabled() {
  const { textCount, imageCount, totalLayerOps } = countPendingOps();
  const hasAny = textCount + imageCount > 0;
  setDisabled(applyBtn, !hasAny);
  applyBtn.textContent = hasAny ? `Apply (${totalLayerOps})` : "Apply";

  const parts = [];
  if (textCount)  parts.push(`${textCount} text`);
  if (imageCount) parts.push(`${imageCount} image`);
  summaryBar.innerHTML = hasAny
    ? `<span class="pending">${parts.join(" + ")}</span> ready across ${totalLayerOps} layer${totalLayerOps === 1 ? "" : "s"}`
    : (state.hasScanned ? "Enter new content below to enable Apply." : "");
}

function refreshSaveEnabled() {
  const n = state.modifiedDocIds.size;
  setDisabled(saveBtn, n === 0);
  saveBtn.textContent = n > 0 ? `Save (${n})` : "Save";
  dirtyStatus.textContent = n > 0 ? `Unsaved changes in ${n} document${n === 1 ? "" : "s"}` : "";
  dirtyStatus.className   = n > 0 ? "json-status" : "json-status loaded";
}

// ─── Visibility helpers ────────────────────────────────
async function hideTargetLayer() {
  await bp([{
    _obj: "hide",
    null: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// ─── Replace operations ────────────────────────────────
async function replaceTextOnLayer(occ, newContent) {
  await selectLayerById(occ.layerId);
  const preDesc = await getTargetLayerDescriptor();
  if (preDesc.layerID !== occ.layerId) {
    throw new Error(`stale id ${occ.layerId} — please re-scan (active: ${preDesc.layerID})`);
  }
  const wasVisible = preDesc.visible !== false;
  const psContent = newContent.replace(/\r?\n/g, "\r");

  // Read textKey descriptor to preserve font-size, color, weight, leading, anti-alias, text box, etc.
  // Only pass clean, writable properties (full textKey object causes "program error").
  const tk = preDesc.textKey;
  // textShape can be at textKey.textShape OR preDesc.textShape (varies by PS version)
  if (tk && !tk.textShape && preDesc.textShape) {
    tk.textShape = preDesc.textShape;
  }
  const toObj = { _obj: "textLayer", textKey: psContent };

  if (tk) {
    const newLen = psContent.length;

    if (tk.textStyleRange && tk.textStyleRange.length) {
      const ranges = tk.textStyleRange.map((r, i, arr) => {
        const clone = { _obj: "textStyleRange", from: r.from, to: r.to, textStyle: r.textStyle };
        if (i === arr.length - 1) clone.to = newLen;
        return clone;
      });
      if (ranges.length === 1) ranges[0].from = 0;
      toObj.textStyleRange = ranges;
    }

    if (tk.paragraphStyleRange && tk.paragraphStyleRange.length) {
      const paras = tk.paragraphStyleRange.map((p, i, arr) => {
        const clone = { _obj: "paragraphStyleRange", from: p.from, to: p.to, paragraphStyle: p.paragraphStyle };
        if (i === arr.length - 1) clone.to = newLen;
        return clone;
      });
      if (paras.length === 1) paras[0].from = 0;
      toObj.paragraphStyleRange = paras;
    }

    // Preserve anti-aliasing (Sharp, Crisp, Smooth, etc.)
    if (tk.antiAlias) toObj.antiAlias = tk.antiAlias;

    // Preserve text orientation (horizontal/vertical)
    if (tk.orientation) toObj.orientation = tk.orientation;

    // Preserve paragraph text box if present (auto, no toggle needed)
    if (tk.textShape && tk.textShape.length) {
      const origShape = tk.textShape[0];
      if (origShape && origShape.char?._value === "box" && origShape.bounds) {
        const ob = origShape.bounds;
        const cleanShape = {
          _obj: "textShape",
          char: { _enum: "char", _value: "box" },
          bounds: {
            _obj: "rectangle",
            top:    Number(ob.top?._value    ?? ob.top    ?? 0),
            left:   Number(ob.left?._value   ?? ob.left   ?? 0),
            bottom: Number(ob.bottom?._value ?? ob.bottom ?? 0),
            right:  Number(ob.right?._value  ?? ob.right  ?? 0),
          },
        };
        if (origShape.orientation) cleanShape.orientation = origShape.orientation;
        if (origShape.transform) cleanShape.transform = origShape.transform;
        if (origShape.rowCount != null) cleanShape.rowCount = origShape.rowCount;
        if (origShape.columnCount != null) cleanShape.columnCount = origShape.columnCount;
        toObj.textShape = [cleanShape];
      }
    }
  }

  // Set content + styles
  await bp([{
    _obj: "set",
    _target: [{ _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }],
    to: toObj,
    _options: { dialogOptions: "dontDisplay" }
  }]);

  if (!wasVisible) await hideTargetLayer();
}


async function replaceImageOnLayer(occ, token) {
  await selectLayerById(occ.layerId);

  // 1. Verify the selection actually matches our target (catches stale IDs).
  const oldDesc = await getTargetLayerDescriptor();
  if (oldDesc.layerID !== occ.layerId) {
    throw new Error(`stale id ${occ.layerId} — please re-scan (active: ${oldDesc.layerID})`);
  }
  const oldBounds = rectSize(oldDesc.bounds);
  const wasVisible = oldDesc.visible !== false;
  const isSmartObject = !!oldDesc.smartObject;

  // 2. Place new image as fresh SO (avoids stale descriptor from placedLayerReplaceContents)
  const oldLayerId = occ.layerId;
  await bp([{
    _obj: "placeEvent",
    null: { _path: token, _kind: "local" },
    freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
    offset: { _obj: "offset",
              horizontal: { _unit: "pixelsUnit", _value: 0 },
              vertical:   { _unit: "pixelsUnit", _value: 0 } },
    _options: { dialogOptions: "dontDisplay" }
  }]);

  // 3. Read fresh descriptor from the newly placed SO
  const postDesc = await getTargetLayerDescriptor();
  occ.layerId = postDesc.layerID;

  // 4. Delete old layer (placeEvent doesn't remove it)
  try {
    await bp([{
      _obj: "delete",
      _target: [{ _ref: "layer", _id: oldLayerId }],
      _options: { dialogOptions: "dontDisplay" }
    }]);
  } catch (e) { /* old layer may already be gone */ }

  // Re-select the new SO
  await selectLayerById(occ.layerId);
  const afterBounds = rectSize(postDesc.bounds);
  let s = 1, finalW = oldBounds.width, finalH = oldBounds.height;
  if (oldBounds.width > 0 && afterBounds.width > 0) {
    s = oldBounds.width / afterBounds.width;
    finalW = afterBounds.width  * s;
    finalH = afterBounds.height * s;
    const dx = oldBounds.left - afterBounds.left - afterBounds.width  * (1 - s) / 2;
    const dy = oldBounds.top  - afterBounds.top  - afterBounds.height * (1 - s) / 2;
    const noScale = Math.abs(s - 1) < 0.0001;
    const noMove  = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5;
    if (!noScale || !noMove) {
      await bp([{
        _obj: "transform",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
        offset: { _obj: "offset",
                  horizontal: { _unit: "pixelsUnit", _value: dx },
                  vertical:   { _unit: "pixelsUnit", _value: dy } },
        width:  { _unit: "percentUnit", _value: s * 100 },
        height: { _unit: "percentUnit", _value: s * 100 },
        interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubic" },
        _options: { dialogOptions: "dontDisplay" }
      }]);
    }
  }
  // 6. Restore hidden state if the original layer was hidden
  if (!wasVisible) await hideTargetLayer();

  return { oldW: oldBounds.width, oldH: oldBounds.height, scale: s, finalW, finalH, wasHidden: !wasVisible };
}

// Resolve link IDs: rows with same linkId inherit value from first row that has content
function resolveLinkedEntries() {
  // Text: group by linkId, fill empty rows from first row with content
  const textById = new Map();
  for (const e of state.textEntries) {
    if (!e.linkId) continue;
    if (!textById.has(e.linkId)) textById.set(e.linkId, []);
    textById.get(e.linkId).push(e);
  }
  for (const [, group] of textById) {
    const source = group.find(e => (e.newContent || "").length > 0);
    if (!source) continue;
    for (const e of group) {
      if (e !== source && !(e.newContent || "").length) {
        e.newContent = source.newContent;
      }
    }
  }
  // Image: group by linkId, fill empty rows from first row with file
  const imgById = new Map();
  for (const e of state.imageEntries) {
    if (!e.linkId) continue;
    if (!imgById.has(e.linkId)) imgById.set(e.linkId, []);
    imgById.get(e.linkId).push(e);
  }
  for (const [, group] of imgById) {
    const source = group.find(e => !!e.token);
    if (!source) continue;
    for (const e of group) {
      if (e !== source && !e.token) {
        e.file = source.file;
        e.token = source.token;
      }
    }
  }
}

async function applyReplacements() {
  resolveLinkedEntries();
  const textOps  = state.textEntries.filter(e => (e.newContent || "").length > 0);
  const imageOps = state.imageEntries.filter(e => !!e.token);

  const totalSteps =
    textOps.reduce((s, e) => s + e.occurrences.length, 0) +
    imageOps.reduce((s, e) => s + e.occurrences.length, 0);

  if (!totalSteps) { log("Nothing to apply."); return; }

  let step = 0;
  setProgress(0, totalSteps, "Applying");

  try {
    await core.executeAsModal(async () => {
      step = await runTextOps(textOps, step, totalSteps);
      step = await runImageOps(imageOps, step, totalSteps);
    }, { commandName: "Content Replacer: Apply" });
    log(`Apply done. ${state.modifiedDocIds.size} document(s) have unsaved changes.`);
  } catch (e) {
    log(`Apply error: ${e.message || e}`);
  } finally {
    hideProgress();
    refreshSaveEnabled();
  }
}

async function runTextOps(textOps, step, totalSteps) {
  for (const entry of textOps) {
    for (const occ of entry.occurrences) {
      await runOneTextOp(entry, occ);
      step++; setProgress(step, totalSteps, "Replacing text");
    }
  }
  return step;
}

async function runOneTextOp(entry, occ) {
  try {
    await switchActiveDoc(occ.docId);
    await replaceTextOnLayer(occ, entry.newContent);
    state.modifiedDocIds.add(occ.docId);
    log(`[TEXT] ${entry.name} → "${entry.newContent}"  (${occ.target})`);
  } catch (e) {
    log(`[TEXT] ERROR "${entry.name}" in ${occ.target}: ${e.message || e}`);
  }
}

async function runImageOps(imageOps, step, totalSteps) {
  for (const entry of imageOps) {
    for (const occ of entry.occurrences) {
      await runOneImageOp(entry, occ);
      step++; setProgress(step, totalSteps, "Replacing images");
    }
  }
  return step;
}

async function runOneImageOp(entry, occ) {
  try {
    await switchActiveDoc(occ.docId);
    const result = await replaceImageOnLayer(occ, entry.token);
    state.modifiedDocIds.add(occ.docId);
    log(`[IMG]  ${entry.name} ← ${entry.file.name}  (${occ.target})${formatImageInfo(result)}`);
  } catch (e) {
    log(`[IMG]  ERROR "${entry.name}" in ${occ.target}: ${e.message || e}`);
  }
}

function formatImageInfo(result) {
  if (!result) return "";
  const hiddenNote = result.wasHidden ? ", hidden" : "";
  const oldSize   = `${Math.round(result.oldW)}×${Math.round(result.oldH)}`;
  const finalSize = `${Math.round(result.finalW)}×${Math.round(result.finalH)}`;
  const scalePct  = (result.scale * 100).toFixed(0);
  return ` [${oldSize} → ${finalSize} @ ${scalePct}%${hiddenNote}]`;
}

async function saveModifiedDocs() {
  const docIds = [...state.modifiedDocIds];
  if (!docIds.length) { log("Nothing to save."); return; }

  let step = 0;
  setProgress(0, docIds.length, "Saving");
  try {
    await core.executeAsModal(async () => {
      for (const docId of docIds) {
        try {
          await switchActiveDoc(docId);
          const d = app.activeDocument;
          await d.save();
          state.modifiedDocIds.delete(docId);
          log(`Saved: ${d.name}`);
        } catch (e) {
          log(`Save error (doc ${docId}): ${e.message || e}`);
        }
        step++; setProgress(step, docIds.length, "Saving");
      }
    }, { commandName: "Content Replacer: Save" });
    log("Save done.");
  } catch (e) {
    log(`Save error: ${e.message || e}`);
  } finally {
    hideProgress();
    refreshSaveEnabled();
  }
}

// ─── Wire up buttons ───────────────────────────────────
scanBtn.addEventListener("click", async () => {
  setDisabled(scanBtn, true);
  try {
    await core.executeAsModal(async () => {
      await scanDocuments();
    }, { commandName: "Content Replacer: Scan" });
    renderTextList();
    renderImageList();
    renderEmptyStates();
    refreshApplyEnabled();
    refreshSaveEnabled();
  } catch (e) {
    log(`Scan error: ${e.message || e}`);
  } finally {
    setDisabled(scanBtn, false);
  }
});

// Scan mode radios
document.querySelectorAll('input[name="scanMode"]').forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.checked) {
      state.scanMode = radio.value;
      saveScanMode();
    }
  });
});

// Initialize scan mode from localStorage
loadScanMode();
const initRadio = document.querySelector(`input[name="scanMode"][value="${state.scanMode}"]`);
if (initRadio) initRadio.checked = true;

// Match by name only toggle — auto re-scan when changed
const matchByNameEl = document.getElementById("matchByNameOnly");
if (matchByNameEl) {
  matchByNameEl.checked = state.matchByNameOnly;
  matchByNameEl.addEventListener("change", () => {
    state.matchByNameOnly = matchByNameEl.checked;
    if (state.hasScanned) scanBtn.click();
  });
}

applyBtn.addEventListener("click", async () => {
  setDisabled(applyBtn, true);
  try {
    await applyReplacements();
  } finally {
    refreshApplyEnabled();
  }
});

saveBtn.addEventListener("click", async () => {
  setDisabled(saveBtn, true);
  try {
    await saveModifiedDocs();
  } finally {
    refreshSaveEnabled();
  }
});

// Initial state
renderEmptyStates();
refreshApplyEnabled();
refreshSaveEnabled();
