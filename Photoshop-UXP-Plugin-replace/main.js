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
  docs: [],
  totalTargets: 0,
  allEntries: [],      // [{ name, displayPath, occurrences, kind, newContent, file, token, newName, linkId, _locateIdx }]
  idCounter: 0,
  modifiedDocIds: new Set(),
  hasScanned: false,
  scanMode: "current",
  matchByNameOnly: false,
  activeFilter: "all", // "all" | "text" | "image" | "group" | "other"
  mode: "replace",      // "replace" | "action"
  searchQuery: "",
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
const layerSection    = document.getElementById("layerSection");
const layerList       = document.getElementById("layerList");
const emptyState      = document.getElementById("emptyState");
const noResultsState  = document.getElementById("noResultsState");
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
async function setProgress(current, total, label) {
  progressSection.style.display = "block";
  const pct = total ? Math.round((current / total) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = `${label} (${current}/${total})`;
  // Yield to UI thread so DOM can repaint
  await new Promise(r => setTimeout(r, 0));
}
function hideProgress() {
  progressSection.style.display = "none";
  progressFill.style.width = "0%";
}

// ─── batchPlay helpers ─────────────────────────────────
async function bp(commands) {
  return await action.batchPlay(commands, { synchronousExecution: false, modalBehavior: "execute" });
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

function walkNodesInContainer(container, onNode, parentPath) {
  const children = container.layers || [];
  for (const c of children) {
    const path = parentPath ? `${parentPath} / ${c.name}` : c.name;
    if (isGroupLike(c)) {
      onNode(c, path);
      walkNodesInContainer(c, onNode, path);
    } else {
      onNode(c, path);
    }
  }
}

// ─── Scan ──────────────────────────────────────────────
function getLayerKind(layer) {
  if (isTextLayer(layer))  return "text";
  if (isImageLayer(layer)) return "image";
  if (isGroupLike(layer))  return "group";
  return "other";
}

function collectNode(node, layerPath, docInfo, targetName, layerMap) {
  const kind = getLayerKind(node);
  const base = state.matchByNameOnly ? node.name.toLowerCase() : layerPath.toLowerCase();
  const key = `${base}::${kind}`;
  const occ = { docId: docInfo.id, docName: docInfo.name, layerId: node.id, target: targetName, layerPath };
  if (!layerMap.has(key)) {
    layerMap.set(key, { name: node.name, displayPath: layerPath, kind, occurrences: [] });
  }
  layerMap.get(key).occurrences.push(occ);
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
  const layerMap = new Map();
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
        walkNodesInContainer(ab.layer, (node, path) => collectNode(node, path, docInfo, `${doc.name} / ${ab.name}`, layerMap));
      }
    } else {
      totalTargets += 1;
      flatDocs++;
      walkNodesInContainer(doc, (node, path) => collectNode(node, path, docInfo, doc.name, layerMap));
    }
    state.docs.push(docInfo);
  }

  state.totalTargets = totalTargets;
  const sortByPath = (a, b) => (a.displayPath || a.name).localeCompare(b.displayPath || b.name, undefined, { numeric: true, sensitivity: "base" });
  state.allEntries = [...layerMap.values()].map(e => ({
    ...e, newContent: "", file: null, token: null, newName: "", linkId: "", selected: false,
  })).sort(sortByPath);

  state.hasScanned = true;
  state.idCounter = 0;

  docCountEl.textContent = openDocs.length;
  targetCountEl.textContent = totalTargets;
  const parts = [];
  if (abBasedDocs) parts.push(`${abBasedDocs} multi-artboard`);
  if (flatDocs)    parts.push(`${flatDocs} single`);
  targetBreakdown.textContent = parts.length ? `(${parts.join(" + ")})` : "";
  const tCount = state.allEntries.filter(e => e.kind === "text").length;
  const iCount = state.allEntries.filter(e => e.kind === "image").length;
  const gCount = state.allEntries.filter(e => e.kind === "group").length;
  const oCount = state.allEntries.filter(e => e.kind === "other").length;
  scanStatus.textContent = `Found ${tCount} text, ${iCount} image, ${gCount} group, ${oCount} other layers`;
  scanStatus.className = "json-status loaded";
  log(`Scan (${state.scanMode}): ${openDocs.length} doc(s), ${totalTargets} target(s) → ${tCount} text + ${iCount} image + ${gCount} group + ${oCount} other`);
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



// ─── Unified render ────────────────────────────────────
function buildUnifiedRow(entry, idx) {
  const row = document.createElement("div");
  row.className = "replace-row";
  row.setAttribute("data-kind", entry.kind);

  let contentHTML = "";
  if (entry.kind === "text") {
    contentHTML = `<textarea class="replace-row-input" rows="2" placeholder="Leave empty to skip"></textarea>`;
  } else if (entry.kind === "image") {
    contentHTML = `
      <div class="replace-row-file">
        <button class="file-pick-btn">Browse…</button>
        <span class="file-name">No file picked</span>
        <button class="file-clear-btn" style="display:none;">Clear</button>
      </div>`;
  }

  row.innerHTML = `
    <div class="replace-row-head">
      <input type="checkbox" class="row-checkbox" />
      <span class="replace-row-name"></span>
      <span class="replace-row-kind">${entry.kind}</span>
      <span class="replace-row-count">${entry.occurrences.length}/${state.totalTargets}</span>
      <button class="locate-btn">Show</button>
    </div>
    <div class="replace-row-meta">
      <input type="text" class="link-id-input" placeholder="Link ID" />
      <input type="text" class="new-name-input" placeholder="New name" />
      <button class="update-now-btn">Update</button>
    </div>
    ${contentHTML}
  `;

  // Name label — click behavior depends on mode
  const nameLabel = row.querySelector(".replace-row-name");
  nameLabel.textContent = entryDisplayName(entry);
  nameLabel.style.cursor = "pointer";
  const nameInput = row.querySelector(".new-name-input");

  // Row checkbox (for action selection)
  const checkbox = row.querySelector(".row-checkbox");
  checkbox.checked = !!entry.selected;
  checkbox.addEventListener("click", e => e.stopPropagation());
  checkbox.addEventListener("change", () => {
    state.allEntries[idx].selected = checkbox.checked;
    refreshActionBar();
  });

  nameLabel.addEventListener("click", e => {
    if (state.mode === "action") return; // let row-head handler toggle
    nameInput.value = entry.name;
    state.allEntries[idx].newName = entry.name;
    nameInput.focus();
    refreshApplyEnabled();
  });

  // In action mode: clicking row head (except Show btn) toggles checkbox
  row.querySelector(".replace-row-head").addEventListener("click", e => {
    if (state.mode !== "action") return;
    if (e.target.closest(".locate-btn")) return;
    const next = !state.allEntries[idx].selected;
    state.allEntries[idx].selected = next;
    checkbox.checked = next;
    refreshActionBar();
  });

  // Show button
  const showBtn = row.querySelector(".locate-btn");
  showBtn.addEventListener("click", () => locateLayer(state.allEntries[idx], showBtn));

  // Link ID
  const idInput = row.querySelector(".link-id-input");
  idInput.value = entry.linkId || "";
  idInput.addEventListener("input", () => { state.allEntries[idx].linkId = idInput.value; });

  // New name + Update
  nameInput.value = entry.newName || "";
  nameInput.addEventListener("input", () => { state.allEntries[idx].newName = nameInput.value; refreshApplyEnabled(); });
  const updateBtn = row.querySelector(".update-now-btn");
  updateBtn.addEventListener("click", () => renameNow(state.allEntries[idx], updateBtn, nameLabel, nameInput));

  // Text content
  if (entry.kind === "text") {
    const input = row.querySelector("textarea");
    input.value = entry.newContent || "";
    input.addEventListener("input", () => {
      state.allEntries[idx].newContent = input.value;
      input.rows = Math.max(2, input.value.split("\n").length);
      if (input.value.length > 0 && !idInput.value) {
        const newId = nextLinkId();
        idInput.value = newId;
        state.allEntries[idx].linkId = newId;
      }
      refreshApplyEnabled();
    });
  }

  // Image file picker
  if (entry.kind === "image") {
    const pickBtn    = row.querySelector(".file-pick-btn");
    const clearBtn   = row.querySelector(".file-clear-btn");
    const fileNameEl = row.querySelector(".file-name");
    const updateFileDisplay = () => {
      const cur = state.allEntries[idx];
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
        state.allEntries[idx].file = file;
        state.allEntries[idx].token = token;
        if (!idInput.value) {
          const newId = nextLinkId();
          idInput.value = newId;
          state.allEntries[idx].linkId = newId;
        }
        updateFileDisplay();
      } catch (e) { log(`File picker error: ${e.message || e}`); }
    });
    clearBtn.addEventListener("click", () => {
      state.allEntries[idx].file = null;
      state.allEntries[idx].token = null;
      updateFileDisplay();
    });
  }

  return row;
}

function renderLayerList() {
  layerList.innerHTML = "";
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = state.allEntries.filter(e => {
    if (state.activeFilter !== "all" && e.kind !== state.activeFilter) return false;
    if (q && !(e.name || "").toLowerCase().includes(q) && !(e.displayPath || "").toLowerCase().includes(q)) return false;
    return true;
  });
  if (!filtered.length && state.allEntries.length) {
    const msg = q ? `No layers match "${state.searchQuery}".` : "No layers match this filter.";
    layerList.innerHTML = `<div class="hint" style="text-align:center;">${msg}</div>`;
    return;
  }

  // Update filter counts
  const cAll   = document.getElementById("countAll");
  const cText  = document.getElementById("countText");
  const cImage = document.getElementById("countImage");
  const cGroup = document.getElementById("countGroup");
  const cOther = document.getElementById("countOther");
  if (cAll)   cAll.textContent   = `(${state.allEntries.length})`;
  if (cText)  cText.textContent  = `(${state.allEntries.filter(e => e.kind === "text").length})`;
  if (cImage) cImage.textContent = `(${state.allEntries.filter(e => e.kind === "image").length})`;
  if (cGroup) cGroup.textContent = `(${state.allEntries.filter(e => e.kind === "group").length})`;
  if (cOther) cOther.textContent = `(${state.allEntries.filter(e => e.kind === "other").length})`;

  const groups = groupEntriesByName(filtered);
  for (const [name, items] of groups) {
    const target = createGroupWrapper(name, items.length, layerList);
    for (const { entry, idx } of items) {
      // idx is relative to filtered — we need global idx in state.allEntries
      const globalIdx = state.allEntries.indexOf(entry);
      target.appendChild(buildUnifiedRow(entry, globalIdx));
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
  const hasAny = state.allEntries.length > 0;
  layerSection.style.display = hasAny ? "block" : "none";
  noResultsState.style.display = hasAny ? "none" : "block";
}

function countPendingOps() {
  const texts   = state.allEntries.filter(e => e.kind === "text"  && (e.newContent || "").length > 0);
  const images  = state.allEntries.filter(e => e.kind === "image" && !!e.token);
  const renames = state.allEntries.filter(e => (e.newName || "").length > 0);
  const textTargets   = texts.reduce((s, e) => s + e.occurrences.length, 0);
  const imageTargets  = images.reduce((s, e) => s + e.occurrences.length, 0);
  const renameTargets = renames.reduce((s, e) => s + e.occurrences.length, 0);
  return {
    textCount: texts.length,
    imageCount: images.length,
    renameCount: renames.length,
    totalLayerOps: textTargets + imageTargets + renameTargets,
  };
}

function refreshApplyEnabled() {
  const { textCount, imageCount, renameCount, totalLayerOps } = countPendingOps();
  const hasAny = textCount + imageCount + renameCount > 0;
  setDisabled(applyBtn, !hasAny);
  applyBtn.textContent = hasAny ? `Apply (${totalLayerOps})` : "Apply";

  const parts = [];
  if (textCount)   parts.push(`${textCount} text`);
  if (imageCount)  parts.push(`${imageCount} image`);
  if (renameCount) parts.push(`${renameCount} rename`);
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

// ─── Rename helpers ────────────────────────────────────
async function renameNow(entry, btnEl, nameLabel, nameInput) {
  const name = entry.newName;
  if (!name) return;

  // Show updating state
  if (btnEl) { btnEl.textContent = "Updating..."; setDisabled(btnEl, true); }

  try {
    await core.executeAsModal(async () => {
      for (const occ of entry.occurrences) {
        await switchActiveDoc(occ.docId);
        await selectLayerById(occ.layerId);
        await renameTargetLayer(name);
        state.modifiedDocIds.add(occ.docId);
      }
    }, { commandName: "Content Replacer: Rename" });

    // Success: update label, clear input
    entry.name = name;
    if (nameLabel) nameLabel.textContent = entryDisplayName(entry);
    if (nameInput) { nameInput.value = ""; entry.newName = ""; }
    if (btnEl) {
      btnEl.textContent = "Done ✓";
      btnEl.classList.add("update-success");
      setTimeout(() => { btnEl.textContent = "Update"; btnEl.classList.remove("update-success"); setDisabled(btnEl, false); }, 1500);
    }
    log(`[RENAME] ${entry.occurrences.length} layer(s) → "${name}"`);
    refreshSaveEnabled();
    refreshApplyEnabled();
  } catch (e) {
    // Fail: keep input, show error
    if (btnEl) {
      btnEl.textContent = "Failed";
      btnEl.classList.add("update-fail");
      setTimeout(() => { btnEl.textContent = "Update"; btnEl.classList.remove("update-fail"); setDisabled(btnEl, false); }, 1500);
    }
    log(`Rename error: ${e.message || e}`);
  }
}

async function renameTargetLayer(newName) {
  await bp([{
    _obj: "set",
    _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
    to: { _obj: "layer", name: newName },
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
  const tk = preDesc.textKey;
  if (tk && !tk.textShape && preDesc.textShape) tk.textShape = preDesc.textShape;

  const isPointText = !tk?.textShape?.length || tk.textShape[0]?.char?._value !== "box";
  const oldBounds = rectSize(preDesc.bounds);
  log(`  [TXT] type=${isPointText ? "point" : "box"} before=${Math.round(oldBounds.width)}×${Math.round(oldBounds.height)} @ ${Math.round(oldBounds.left)},${Math.round(oldBounds.top)}`);

  // Convert point→paragraph BEFORE reading fresh descriptor and setting content
  if (isPointText && oldBounds.width > 0) {
    try {
      const layer = app.activeDocument.activeLayers[0];
      layer.textItem.convertToParagraphText();
      log(`  [TXT] point→paragraph (old w=${Math.round(oldBounds.width)})`);
    } catch (e) {
      log(`  [TXT] convert failed: ${e.message}`);
    }
  }

  // Re-read descriptor (now has textShape with box after conversion)
  await selectLayerById(occ.layerId);
  const freshDesc = await getTargetLayerDescriptor();
  const freshTK = freshDesc.textKey;
  if (freshTK && !freshTK.textShape && freshDesc.textShape) freshTK.textShape = freshDesc.textShape;
  const hasBox = freshTK?.textShape?.[0]?.char?._value === "box";
  const boxRight = freshTK?.textShape?.[0]?.bounds?.right ?? "none";
  log(`  [TXT] freshDesc: hasBox=${hasBox} right=${boxRight}`);
  const toObj = { _obj: "textLayer", textKey: psContent };

  if (freshTK) {
    const newLen = psContent.length;
    if (freshTK.textStyleRange && freshTK.textStyleRange.length) {
      const ranges = freshTK.textStyleRange.map((r, i, arr) => {
        const clone = { _obj: "textStyleRange", from: r.from, to: r.to, textStyle: r.textStyle };
        if (i === arr.length - 1) clone.to = newLen;
        return clone;
      });
      if (ranges.length === 1) ranges[0].from = 0;
      toObj.textStyleRange = ranges;
    }
    if (freshTK.paragraphStyleRange && freshTK.paragraphStyleRange.length) {
      const paras = freshTK.paragraphStyleRange.map((p, i, arr) => {
        const clone = { _obj: "paragraphStyleRange", from: p.from, to: p.to, paragraphStyle: p.paragraphStyle };
        if (i === arr.length - 1) clone.to = newLen;
        return clone;
      });
      if (paras.length === 1) paras[0].from = 0;
      toObj.paragraphStyleRange = paras;
    }
    if (freshTK.antiAlias) toObj.antiAlias = freshTK.antiAlias;
    if (freshTK.orientation) toObj.orientation = freshTK.orientation;
    // Preserve box (now paragraph text after conversion)
    if (freshTK.textShape && freshTK.textShape.length) {
      const s = freshTK.textShape[0];
      if (s?.char?._value === "box" && s.bounds) {
        const ob = s.bounds;
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
        if (s.orientation) cleanShape.orientation = s.orientation;
        if (s.transform) cleanShape.transform = s.transform;
        toObj.textShape = [cleanShape];
      }
    }
  }

  await bp([{
    _obj: "set",
    _target: [{ _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }],
    to: toObj,
    _options: { dialogOptions: "dontDisplay" }
  }]);


  // Log final state
  if (isPointText) {
    const endDesc = await getTargetLayerDescriptor();
    const endBounds = rectSize(endDesc.bounds);
    const endChar = endDesc.textKey?.textShape?.[0]?.char?._value ?? "?";
    log(`  [TXT] final: ${Math.round(endBounds.width)}×${Math.round(endBounds.height)} @ ${Math.round(endBounds.left)},${Math.round(endBounds.top)} char=${endChar} (target w=${Math.round(oldBounds.width)})`);
  }

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

// Resolve link IDs: rows with same linkId inherit values from first row that has content
function resolveLinkedEntries() {
  const byId = new Map();
  for (const e of state.allEntries) {
    if (!e.linkId) continue;
    if (!byId.has(e.linkId)) byId.set(e.linkId, []);
    byId.get(e.linkId).push(e);
  }
  for (const [, group] of byId) {
    // Text content
    const textSource = group.find(e => e.kind === "text" && (e.newContent || "").length > 0);
    // Image file
    const imgSource = group.find(e => e.kind === "image" && !!e.token);
    // Name
    const nameSource = group.find(e => (e.newName || "").length > 0);

    for (const e of group) {
      if (textSource && e.kind === "text" && e !== textSource && !(e.newContent || "").length) {
        e.newContent = textSource.newContent;
      }
      if (imgSource && e.kind === "image" && e !== imgSource && !e.token) {
        e.file = imgSource.file;
        e.token = imgSource.token;
      }
      if (nameSource && e !== nameSource && !(e.newName || "").length) {
        e.newName = nameSource.newName;
      }
    }
  }
}

async function applyReplacements() {
  resolveLinkedEntries();
  const textOps   = state.allEntries.filter(e => e.kind === "text"  && (e.newContent || "").length > 0);
  const imageOps  = state.allEntries.filter(e => e.kind === "image" && !!e.token);
  const renameOps = state.allEntries.filter(e => (e.newName || "").length > 0);

  const totalSteps =
    textOps.reduce((s, e) => s + e.occurrences.length, 0) +
    imageOps.reduce((s, e) => s + e.occurrences.length, 0) +
    renameOps.reduce((s, e) => s + e.occurrences.length, 0);

  if (!totalSteps) { log("Nothing to apply."); return; }

  let step = 0;
  await setProgress(0, totalSteps, "Applying");

  try {
    await core.executeAsModal(async () => {
      step = await runTextOps(textOps, step, totalSteps);
      step = await runImageOps(imageOps, step, totalSteps);
      step = await runRenameOps(renameOps, step, totalSteps);
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
      step++; await setProgress(step, totalSteps, "Replacing text");
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
      step++; await setProgress(step, totalSteps, "Replacing images");
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

async function runRenameOps(renameOps, step, totalSteps) {
  for (const entry of renameOps) {
    for (const occ of entry.occurrences) {
      try {
        await switchActiveDoc(occ.docId);
        await selectLayerById(occ.layerId);
        await renameTargetLayer(entry.newName);
        state.modifiedDocIds.add(occ.docId);
        log(`[RENAME] ${entry.name} → "${entry.newName}"  (${occ.target})`);
      } catch (e) {
        log(`[RENAME] ERROR "${entry.name}" in ${occ.target}: ${e.message || e}`);
      }
      step++; await setProgress(step, totalSteps, "Renaming");
    }
  }
  return step;
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
  await setProgress(0, docIds.length, "Saving");
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
        step++; await setProgress(step, docIds.length, "Saving");
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
    renderLayerList();
    renderEmptyStates();
    refreshApplyEnabled();
    refreshSaveEnabled();
    ensureActionsLoaded();
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
    if (state.hasScanned) { scanBtn.click(); }
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

// Filter buttons
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.activeFilter = btn.getAttribute("data-filter");
    renderLayerList();
  });
});

// ─── Action feature ────────────────────────────────────
const actionBar       = document.getElementById("actionBar");
const actionSetSelect = document.getElementById("actionSetSelect");
const actionSelect    = document.getElementById("actionSelect");
const runActionBtn    = document.getElementById("runActionBtn");
const refreshActionsBtn = document.getElementById("refreshActionsBtn");
const selectAllBtn    = document.getElementById("selectAllBtn");
const deselectAllBtn  = document.getElementById("deselectAllBtn");

const ACTION_SET_KEY = "contentReplacer.lastActionSet";
const ACTION_KEY     = "contentReplacer.lastAction";
let actionSetsCache = null; // [{ name, actions: [name, ...] }]

// Select all visible (respects filter + search)
selectAllBtn.addEventListener("click", () => {
  const q = state.searchQuery.trim().toLowerCase();
  state.allEntries.forEach(e => {
    const matchFilter = state.activeFilter === "all" || e.kind === state.activeFilter;
    const matchSearch = !q
      || (e.name || "").toLowerCase().includes(q)
      || (e.displayPath || "").toLowerCase().includes(q);
    if (matchFilter && matchSearch) e.selected = true;
  });
  renderLayerList();
  refreshActionBar();
});
deselectAllBtn.addEventListener("click", () => {
  state.allEntries.forEach(e => { e.selected = false; });
  renderLayerList();
  refreshActionBar();
});

// Load PS Actions palette via app.actionTree (no batchPlay → no error dialogs)
async function loadActionSets() {
  if (actionSetsCache) return actionSetsCache;
  const sets = [];
  try {
    const tree = app.actionTree;
    if (tree) {
      for (const set of Array.from(tree)) {
        try {
          const actions = Array.from(set.actions || []).map(a => a.name);
          sets.push({ name: set.name, actions });
        } catch (e) {}
      }
    }
  } catch (e) {
    log(`Load actions error: ${e.message || e}`);
  }
  actionSetsCache = sets;
  return sets;
}

function populateActionSetDropdown(sets) {
  actionSetSelect.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— Select set —";
  actionSetSelect.appendChild(opt0);
  for (const s of sets) {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = `${s.name} (${s.actions.length})`;
    actionSetSelect.appendChild(opt);
  }
  // Restore last used
  try {
    const last = localStorage.getItem(ACTION_SET_KEY);
    if (last) actionSetSelect.value = last;
  } catch (e) {}
  populateActionDropdown();
}

function populateActionDropdown() {
  actionSelect.innerHTML = "";
  const setName = actionSetSelect.value;
  const set = actionSetsCache?.find(s => s.name === setName);
  if (!set) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "— Select set first —";
    actionSelect.appendChild(opt);
    refreshRunBtn();
    return;
  }
  for (const a of set.actions) {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    actionSelect.appendChild(opt);
  }
  // Restore last used
  try {
    const last = localStorage.getItem(ACTION_KEY);
    if (last && set.actions.includes(last)) actionSelect.value = last;
  } catch (e) {}
  refreshRunBtn();
}

actionSetSelect.addEventListener("change", () => {
  try { localStorage.setItem(ACTION_SET_KEY, actionSetSelect.value); } catch (e) {}
  populateActionDropdown();
});
refreshActionsBtn.addEventListener("click", async () => {
  refreshActionsBtn.disabled = true;
  actionSetsCache = null;
  try {
    const sets = await loadActionSets();
    populateActionSetDropdown(sets);
    log(`Reloaded ${sets.length} action set(s)`);
  } finally {
    refreshActionsBtn.disabled = false;
  }
});
actionSelect.addEventListener("change", () => {
  try { localStorage.setItem(ACTION_KEY, actionSelect.value); } catch (e) {}
  refreshRunBtn();
});

function getSelectedCount() {
  const selected = state.allEntries.filter(e => e.selected);
  const totalOcc = selected.reduce((s, e) => s + e.occurrences.length, 0);
  return { rows: selected.length, layers: totalOcc };
}

function refreshActionBar() {
  actionBar.style.display = state.mode === "action" ? "block" : "none";
  refreshRunBtn();
}

function refreshRunBtn() {
  const { rows, layers } = getSelectedCount();
  const hasAction = actionSetSelect.value && actionSelect.value;
  setDisabled(runActionBtn, !(rows > 0 && hasAction));
  runActionBtn.textContent = rows > 0 ? `Run Action (${layers} layers)` : "Run Action";
  let reason = "";
  if (rows === 0 && !hasAction) reason = "Select at least 1 layer and pick an action";
  else if (rows === 0) reason = "Select at least 1 layer";
  else if (!hasAction) reason = "Pick an action set and action";
  runActionBtn.title = reason;
}

// Run action on selected layers
runActionBtn.addEventListener("click", async () => {
  const setName = actionSetSelect.value;
  const actName = actionSelect.value;
  if (!setName || !actName) return;

  const selected = state.allEntries.filter(e => e.selected);
  const totalOcc = selected.reduce((s, e) => s + e.occurrences.length, 0);
  if (!totalOcc) return;

  setDisabled(runActionBtn, true);
  let step = 0;
  await setProgress(0, totalOcc, "Running action");

  try {
    await core.executeAsModal(async () => {
      for (const entry of selected) {
        for (const occ of entry.occurrences) {
          try {
            await switchActiveDoc(occ.docId);
            await selectLayerById(occ.layerId);
            await bp([{
              _obj: "play",
              _target: [
                { _ref: "action", _name: actName },
                { _ref: "actionSet", _name: setName }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }]);
            state.modifiedDocIds.add(occ.docId);
            log(`[ACTION] ${actName} → ${entry.name}  (${occ.target})`);
          } catch (e) {
            log(`[ACTION] ERROR ${entry.name} in ${occ.target}: ${e.message || e}`);
          }
          step++;
          await setProgress(step, totalOcc, "Running action");
        }
      }
    }, { commandName: `Content Replacer: ${actName}` });
    log(`Action done. ${step} layer(s) processed.`);
  } catch (e) {
    log(`Action error: ${e.message || e}`);
  } finally {
    hideProgress();
    refreshSaveEnabled();
    refreshRunBtn();
  }
});

// Load actions when scan completes (lazy)
async function ensureActionsLoaded() {
  if (!actionSetsCache) {
    const sets = await loadActionSets();
    populateActionSetDropdown(sets);
    log(`Loaded ${sets.length} action set(s)`);
  }
}

// Initial state
// ─── Search by layer name ──────────────────────────────
const searchInput   = document.getElementById("searchInput");
const searchClearBtn = document.getElementById("searchClearBtn");
const searchBar     = document.querySelector(".search-bar");

function applySearch() {
  const val = searchInput.value || "";
  if (val === state.searchQuery) return; // no-op
  state.searchQuery = val;
  searchBar.classList.toggle("has-value", !!val);
  renderLayerList();
}
// UXP input event is unreliable on delete; listen to multiple events
["input", "keyup", "change", "paste", "cut"].forEach(ev => {
  searchInput.addEventListener(ev, () => setTimeout(applySearch, 0));
});
searchClearBtn.addEventListener("click", () => {
  searchInput.value = "";
  applySearch();
  searchInput.focus();
});

// ─── Mode tabs (Replace / Action) ──────────────────────
const MODE_KEY = "contentReplacer.mode";
const modeTabs = document.querySelectorAll(".mode-tab");

function setMode(mode) {
  state.mode = mode === "action" ? "action" : "replace";
  document.body.classList.toggle("mode-replace", state.mode === "replace");
  document.body.classList.toggle("mode-action",  state.mode === "action");
  modeTabs.forEach(t => t.classList.toggle("active", t.dataset.mode === state.mode));
  try { localStorage.setItem(MODE_KEY, state.mode); } catch (e) {}
  refreshActionBar();
}

modeTabs.forEach(tab => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

// Restore last used mode
try {
  const saved = localStorage.getItem(MODE_KEY);
  if (saved === "action" || saved === "replace") setMode(saved);
  else setMode("replace");
} catch (e) { setMode("replace"); }

renderEmptyStates();
refreshApplyEnabled();
refreshSaveEnabled();
