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
  artboardList: [],     // [{ id, name, docId, docName, width, height }]
  enabledArtboards: new Set(), // Set<artboardId>
  artboardSearch: "",
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

// Occurrence is "visible" when its artboard is enabled (or it's from a flat doc with no artboard)
function isOccEnabled(occ) {
  return !occ.artboardId || state.enabledArtboards.has(occ.artboardId);
}
function visibleOccurrences(entry) {
  return entry.occurrences.filter(isOccEnabled);
}

function collectNode(node, layerPath, docInfo, targetName, layerMap, artboardId) {
  const kind = getLayerKind(node);
  const base = state.matchByNameOnly ? node.name.toLowerCase() : layerPath.toLowerCase();
  const key = `${base}::${kind}`;
  const occ = { docId: docInfo.id, docName: docInfo.name, layerId: node.id, target: targetName, layerPath, artboardId };
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

  // Collect artboards across all scanned docs — preserve user uncheck state
  const nextArtboardList = [];
  const prevKnownIds = new Set(state.artboardList.map(a => a.id));
  const prevEnabled  = new Set(state.enabledArtboards);

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
        let w = 0, h = 0, l = 0, t = 0;
        try {
          const desc = await getLayerDescriptor(ab.id);
          const rect = desc.artboard?.artboardRect || desc.bounds;
          if (rect) {
            l = Math.round(rect.left?._value   ?? rect.left   ?? 0);
            t = Math.round(rect.top?._value    ?? rect.top    ?? 0);
            const r = Math.round(rect.right?._value  ?? rect.right  ?? 0);
            const b = Math.round(rect.bottom?._value ?? rect.bottom ?? 0);
            w = r - l; h = b - t;
          }
        } catch (e) {}
        nextArtboardList.push({
          id: ab.id, name: ab.name, docId: doc.id, docName: doc.name,
          width: w, height: h, left: l, top: t,
        });
        walkNodesInContainer(ab.layer, (node, path) => collectNode(node, path, docInfo, `${doc.name} / ${ab.name}`, layerMap, ab.id));
      }
    } else {
      totalTargets += 1;
      flatDocs++;
      walkNodesInContainer(doc, (node, path) => collectNode(node, path, docInfo, doc.name, layerMap, null));
    }
    state.docs.push(docInfo);
  }

  // Rebuild enabled set: preserve unchecks for known artboards; new artboards default-enabled
  state.artboardList = nextArtboardList;
  state.enabledArtboards = new Set();
  for (const ab of nextArtboardList) {
    const isKnown = prevKnownIds.has(ab.id);
    if (!isKnown || prevEnabled.has(ab.id)) state.enabledArtboards.add(ab.id);
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
  const occs = visibleOccurrences(entry);
  if (!occs.length) return;
  entry._locateIdx = ((entry._locateIdx ?? -1) + 1) % occs.length;
  const occ = occs[entry._locateIdx];
  let hidden = false;
  try {
    await core.executeAsModal(async () => {
      await switchActiveDoc(occ.docId);
      await selectLayerById(occ.layerId);
      const desc = await getLayerDescriptor(occ.layerId);
      hidden = desc.visible === false;
    }, { commandName: "Content Replacer: Locate" });
    if (btnEl) {
      btnEl.textContent = occs.length > 1
        ? `Show ${entry._locateIdx + 1}/${occs.length}`
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
    contentHTML = `<textarea class="replace-row-input" rows="4" placeholder="Leave empty to skip"></textarea>`;
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
      <span class="replace-row-count">${visibleOccurrences(entry).length}/${state.totalTargets}</span>
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

    // UXP Chromium's native paste drops the whole buffer when clipboard
    // contains variation selectors (U+FE0F etc). Insert manually; blur+focus
    // after so Spectrum widget re-syncs and typing keeps working.
    input.addEventListener("paste", (e) => {
      const cd = e.clipboardData;
      if (!cd) return;
      const text = cd.getData("text/plain");
      if (!text) return;
      e.preventDefault();
      const start = input.selectionStart ?? input.value.length;
      const end   = input.selectionEnd   ?? input.value.length;
      input.value = input.value.slice(0, start) + text + input.value.slice(end);
      const pos = start + text.length;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      setTimeout(() => {
        input.blur();
        input.focus();
        try { input.setSelectionRange(pos, pos); } catch (_) {}
      }, 0);
    });

    // Keep state in sync synchronously so Apply reads the latest value,
    // but coalesce heavy UI updates so fast typing doesn't starve UXP's
    // input loop for long text.
    let pendingRefresh = false;
    input.addEventListener("input", () => {
      state.allEntries[idx].newContent = input.value;
      if (pendingRefresh) return;
      pendingRefresh = true;
      setTimeout(() => {
        pendingRefresh = false;
        input.rows = Math.max(4, input.value.split("\n").length);
        if (input.value.length > 0 && !idInput.value) {
          const newId = nextLinkId();
          idInput.value = newId;
          state.allEntries[idx].linkId = newId;
        }
        refreshApplyEnabled();
      }, 120);
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
    if (visibleOccurrences(e).length === 0) return false; // all occurrences on unchecked artboards
    return true;
  });
  if (layersToggleCount) layersToggleCount.textContent = `(${filtered.length})`;
  if (!filtered.length && state.allEntries.length) {
    const hasEnabledAb = state.artboardList.length === 0 || state.enabledArtboards.size > 0;
    const msg = !hasEnabledAb
      ? "All artboards are unchecked. Enable at least one in the Artboards panel."
      : q ? `No layers match "${state.searchQuery}".`
      : "No layers match this filter.";
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

// ─── Artboards selection UI ────────────────────────────
const artboardsSection   = document.getElementById("artboardsSection");
const artboardsToggle    = document.getElementById("artboardsToggle");
const artboardsBody      = document.getElementById("artboardsBody");
const artboardsList      = document.getElementById("artboardsList");
const artboardsCountEl   = document.getElementById("artboardsCount");
const artboardsAllBtn    = document.getElementById("artboardsAllBtn");
const artboardsNoneBtn   = document.getElementById("artboardsNoneBtn");
const artboardsSearchBar = document.getElementById("artboardsSearchBar");
const artboardsSearchInput = document.getElementById("artboardsSearchInput");
const artboardsSearchClear = document.getElementById("artboardsSearchClear");

const ARTBOARD_SEARCH_MIN = 5; // only show search input when > this many artboards

function filteredArtboards() {
  const q = state.artboardSearch.trim().toLowerCase();
  if (!q) return state.artboardList;
  return state.artboardList.filter(a =>
    (a.name || "").toLowerCase().includes(q) ||
    (a.docName || "").toLowerCase().includes(q)
  );
}

function updateArtboardsCountLabel() {
  const total = state.artboardList.length;
  const enabled = state.artboardList.filter(a => state.enabledArtboards.has(a.id)).length;
  artboardsCountEl.textContent = `(${enabled}/${total})`;
}

function renderArtboardsList() {
  updateArtboardsCountLabel();
  const hasAny = state.artboardList.length > 0;
  artboardsSection.style.display = hasAny ? "block" : "none";
  if (!hasAny) return;

  updateArtboardRenamePreview();

  // Toggle search bar visibility by count
  artboardsSearchBar.style.display = state.artboardList.length > ARTBOARD_SEARCH_MIN ? "flex" : "none";

  const visible = filteredArtboards();
  artboardsList.innerHTML = "";

  if (!visible.length) {
    artboardsList.innerHTML = `<div class="hint" style="text-align:center;">No artboard matches "${state.artboardSearch}".</div>`;
    return;
  }

  const uniqueDocs = new Set(state.artboardList.map(a => a.docId));
  const showDocName = uniqueDocs.size > 1;
  for (const ab of visible) {
    const row = document.createElement("label");
    row.className = "artboard-row";
    const checked = state.enabledArtboards.has(ab.id);
    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} />
      <span class="ab-name"></span>
      <span class="ab-meta">${ab.width}×${ab.height}</span>
    `;
    row.querySelector(".ab-name").textContent = ab.name + (showDocName && ab.docName ? `  · ${ab.docName}` : "");
    row.querySelector("input").addEventListener("change", e => {
      if (e.target.checked) state.enabledArtboards.add(ab.id);
      else state.enabledArtboards.delete(ab.id);
      updateArtboardsCountLabel();
      updateArtboardRenamePreview();
      refreshAppendTextUI();
      renderLayerList();
      refreshApplyEnabled();
      refreshRunBtn();
    });
    artboardsList.appendChild(row);
  }
}

// ─── Append Text Layer ───────────────────────────────
const appendTextSection  = document.getElementById("appendTextSection");
const appendTextToggle   = document.getElementById("appendTextToggle");
const appendTextBody     = document.getElementById("appendTextBody");
const appendTextCountEl  = document.getElementById("appendTextCount");
const appendTextAutoSync = document.getElementById("appendTextAutoSync");
const appendTextSampleBtn = document.getElementById("appendTextSampleBtn");
const appendTextContent  = document.getElementById("appendTextContent");
const appendTextFont     = document.getElementById("appendTextFont");
const appendTextSize     = document.getElementById("appendTextSize");
const appendTextLeading  = document.getElementById("appendTextLeading");
const appendTextColor    = document.getElementById("appendTextColor");
const appendTextWidth    = document.getElementById("appendTextWidth");
const appendTextXAnchor  = document.getElementById("appendTextXAnchor");
const appendTextXOffset  = document.getElementById("appendTextXOffset");
const appendTextYAnchor  = document.getElementById("appendTextYAnchor");
const appendTextYOffset  = document.getElementById("appendTextYOffset");
const appendTextApplyBtn = document.getElementById("appendTextApplyBtn");
const appendTextAlignRadios = document.querySelectorAll('input[name="appendTextAlign"]');

state.appendTextAlign = "left";
state.appendTextFontPS = "ArialMT"; // PostScript name, separate from display name

function appendTextEnabledCount() {
  return state.artboardList.filter(a => state.enabledArtboards.has(a.id)).length;
}

let _appendTextShown = false;
function forceReflowAppendText() {
  // UXP bug: form controls render with default styles until first interaction.
  // Reading offsetHeight forces a layout recalc that picks up our CSS.
  appendTextBody.querySelectorAll("input, select, textarea, button").forEach(el => {
    void el.offsetHeight;
  });
}

function refreshAppendTextUI() {
  const hasAny = state.artboardList.length > 0;
  appendTextSection.style.display = hasAny ? "block" : "none";
  const n = appendTextEnabledCount();
  appendTextCountEl.textContent = `(${n})`;
  // Button stays clickable — apply handler logs specific reason if blocked
  setDisabled(appendTextApplyBtn, false);
  appendTextApplyBtn.textContent = `Append to ${n} artboard(s)`;

  // First time the section appears AND body is open, kick UXP to re-render
  if (hasAny && !_appendTextShown && appendTextBody.style.display !== "none") {
    _appendTextShown = true;
    setTimeout(forceReflowAppendText, 0);
  }
}

appendTextToggle.addEventListener("click", () => {
  const open = appendTextBody.style.display !== "none";
  appendTextBody.style.display = open ? "none" : "block";
  const icon = appendTextToggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = open ? "▶" : "▼";
  // First time the body opens, force UXP re-render of form controls
  if (!open && !_appendTextShown) {
    _appendTextShown = true;
    setTimeout(forceReflowAppendText, 0);
  }
});

// Align radios — native radio handles selection state, no CSS fights
function setAlignSelection(align) {
  state.appendTextAlign = align;
  appendTextAlignRadios.forEach(r => { r.checked = r.value === align; });
}
appendTextAlignRadios.forEach(r => {
  r.addEventListener("change", () => {
    if (r.checked) state.appendTextAlign = r.value;
  });
});

// Content input — gate the apply button
["input", "keyup", "change", "paste", "cut"].forEach(ev => {
  appendTextContent.addEventListener(ev, () => setTimeout(refreshAppendTextUI, 0));
});

// Color helper: hex "#rrggbb" or "rrggbb" → {r,g,b}
function parseHexColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
function rgbToHex(r, g, b) {
  const to2 = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// Read the currently selected text layer and fill the form
async function sampleFromSelectedTextLayer(silent) {
  try {
    const doc = app.activeDocument;
    if (!doc) { if (!silent) log("Sample: no active document"); return false; }
    const layer = doc.activeLayers?.[0];
    if (!layer) { if (!silent) log("Sample: no layer selected"); return false; }
    if (!isTextLayer(layer)) { if (!silent) log(`Sample: "${layer.name}" is not a text layer`); return false; }

    const desc = await getLayerDescriptor(layer.id);
    const tk = desc.textKey;
    if (!tk) { if (!silent) log("Sample: layer has no textKey"); return false; }

    const tsr = tk.textStyleRange?.[0]?.textStyle;
    const psr = tk.paragraphStyleRange?.[0]?.paragraphStyle;

    // Skip fields that are currently focused by the user
    const active = document.activeElement;
    const canSet = el => el !== active;

    if (tsr) {
      // Font: prefer fontPostScriptName (carries weight info, e.g. "DINPro-Bold")
      const fontStr = tsr.fontPostScriptName || tsr.fontName;
      if (fontStr && canSet(appendTextFont)) appendTextFont.value = fontStr;

      // Size: prefer impliedFontSize (effective after layer transforms)
      const sizeVal = tsr.impliedFontSize?._value ?? tsr.size?._value ?? tsr.size;
      if (sizeVal != null && canSet(appendTextSize)) {
        const sz = Number(sizeVal);
        if (!isNaN(sz)) appendTextSize.value = Math.round(sz * 100) / 100;
      }

      // Leading (line height): empty when auto-leading
      if (canSet(appendTextLeading)) {
        if (tsr.autoLeading === true) {
          appendTextLeading.value = "";
        } else {
          const lead = tsr.impliedLeading?._value ?? tsr.leading?._value ?? tsr.leading;
          if (lead != null) {
            const lv = Number(lead);
            appendTextLeading.value = isNaN(lv) ? "" : Math.round(lv * 100) / 100;
          } else appendTextLeading.value = "";
        }
      }

      const c = tsr.color;
      if (c && canSet(appendTextColor)) {
        const r = Number(c.red   ?? 0);
        const g = Number(c.grain ?? c.green ?? 0);
        const b = Number(c.blue  ?? 0);
        appendTextColor.value = rgbToHex(r, g, b);
      }
    }
    if (psr?.align?._value) {
      const a = psr.align._value.replace(/^justify/i, "").toLowerCase() || "left";
      if (["left", "center", "right"].includes(a)) setAlignSelection(a);
    }
    // Box width: use the layer's rendered bounds (post-transform) on canvas,
    // NOT textShape.bounds which is pre-transform and can be huge on scaled layers.
    if (canSet(appendTextWidth)) {
      const rb = rectSize(desc.bounds);
      if (rb.width > 0) appendTextWidth.value = Math.round(rb.width);
    }

    // Brief visual feedback
    appendTextBody.classList.add("synced");
    setTimeout(() => appendTextBody.classList.remove("synced"), 500);
    if (!silent) log(`[SAMPLE] ${layer.name} → ${appendTextFont.value} ${appendTextSize.value}px ${appendTextColor.value}`);
    return true;
  } catch (e) {
    if (!silent) log(`Sample error: ${e.message || e}`);
    return false;
  }
}

appendTextSampleBtn.addEventListener("click", async () => {
  try {
    await core.executeAsModal(async () => { await sampleFromSelectedTextLayer(false); },
      { commandName: "Content Replacer: Sample Style" });
  } catch (e) { log(`Sample error: ${e.message || e}`); }
});

// Auto-sync: listen to "select" events
let selectListenerRegistered = false;
async function onSelectEvent(event, descriptor) {
  if (!appendTextAutoSync.checked) return;
  // Skip if the user is typing in any of the append-text inputs
  const active = document.activeElement;
  if (active && appendTextBody.contains(active)) return;
  try {
    await core.executeAsModal(async () => { await sampleFromSelectedTextLayer(true); },
      { commandName: "Content Replacer: Auto-sync" });
  } catch (e) {}
}
async function ensureSelectListener() {
  if (selectListenerRegistered) return;
  try {
    await action.addNotificationListener(["select"], onSelectEvent);
    selectListenerRegistered = true;
  } catch (e) { log(`Auto-sync setup failed: ${e.message || e}`); }
}
ensureSelectListener();

// Build a make-textLayer batchPlay command
function buildMakeTextLayerCmd(ab, opts) {
  const { content, fontPS, fontName, size, leading, color, boxWidth, align,
          xAnchor, xOffset, yAnchor, yOffset } = opts;
  const lines = content.split(/\r?\n/).length;
  const lineH = leading || (size * 1.5);
  const boxHeight = Math.max(100, Math.round(lineH * lines + size));

  // Horizontal placement
  let boxLeft;
  if (xAnchor === "center")   boxLeft = ab.left + (ab.width  - boxWidth)  / 2 + xOffset;
  else if (xAnchor === "right") boxLeft = ab.left + ab.width - boxWidth - xOffset;
  else                          boxLeft = ab.left + xOffset;

  let boxTop;
  if (yAnchor === "center")    boxTop = ab.top + (ab.height - boxHeight) / 2 + yOffset;
  else if (yAnchor === "bottom") boxTop = ab.top + ab.height - boxHeight - yOffset;
  else                           boxTop = ab.top + yOffset;

  const boxRight  = boxLeft + boxWidth;
  const boxBottom = boxTop  + boxHeight;
  const psContent = content.replace(/\r?\n/g, "\r");
  const len = psContent.length;

  const textStyleObj = {
    _obj: "textStyle",
    fontName: fontName,
    fontPostScriptName: fontPS || fontName,
    size: { _unit: "pointsUnit", _value: size },
    color: { _obj: "RGBColor", red: color.r, grain: color.g, blue: color.b },
  };
  if (leading && !isNaN(leading) && leading > 0) {
    textStyleObj.leading = { _unit: "pointsUnit", _value: leading };
    textStyleObj.autoLeading = false;
  } else {
    textStyleObj.autoLeading = true;
  }

  return {
    _obj: "make",
    _target: [{ _ref: "textLayer" }],
    using: {
      _obj: "textLayer",
      textKey: psContent,
      textStyleRange: [{
        _obj: "textStyleRange", from: 0, to: len,
        textStyle: textStyleObj,
      }],
      paragraphStyleRange: [{
        _obj: "paragraphStyleRange", from: 0, to: len,
        paragraphStyle: {
          _obj: "paragraphStyle",
          align: { _enum: "alignmentType", _value: align },
        },
      }],
      textShape: [{
        _obj: "textShape",
        char: { _enum: "char", _value: "box" },
        orientation: { _enum: "orientation", _value: "horizontal" },
        bounds: {
          _obj: "rectangle",
          top: boxTop, left: boxLeft, bottom: boxBottom, right: boxRight,
        },
      }],
    },
    _options: { dialogOptions: "dontDisplay" },
  };
}

appendTextApplyBtn.addEventListener("click", async () => {
  log("[APPEND] Apply clicked");
  log(`[APPEND] refs: content=${!!appendTextContent}, font=${!!appendTextFont}, size=${!!appendTextSize}, leading=${!!appendTextLeading}, color=${!!appendTextColor}, width=${!!appendTextWidth}, xA=${!!appendTextXAnchor}, xO=${!!appendTextXOffset}, yA=${!!appendTextYAnchor}, yO=${!!appendTextYOffset}`);
  try {
    log(`[APPEND] content.len=${appendTextContent?.value?.length ?? "?"}, abList.len=${state.artboardList?.length ?? "?"}, enabled=${state.enabledArtboards?.size ?? "?"}, color="${appendTextColor?.value ?? "?"}"`);
  } catch (e) { log(`[APPEND] state read error: ${e.message || e}`); return; }

  try {
  const content = String(appendTextContent.value ?? "");
  if (!content.trim()) { log("[APPEND] abort: content is empty"); return; }
  const targets = state.artboardList.filter(a => state.enabledArtboards.has(a.id));
  if (!targets.length) { log("[APPEND] abort: no artboards enabled"); return; }

  const color = parseHexColor(appendTextColor.value);
  if (!color) { log(`[APPEND] abort: invalid color "${appendTextColor.value}"`); return; }

  const fontStr = String(appendTextFont.value || "Arial").trim();
  const leadingRaw = String(appendTextLeading.value ?? "").trim();
  const opts = {
    content,
    fontName: fontStr,
    fontPS:   fontStr, // PS name carries weight; use single field as both
    size:     Number(appendTextSize.value) || 12,
    leading:  leadingRaw ? Number(leadingRaw) : null,
    color,
    boxWidth: Math.max(10, Number(appendTextWidth.value) || 300),
    align:    state.appendTextAlign || "left",
    xAnchor:  appendTextXAnchor.value,
    xOffset:  Number(appendTextXOffset.value) || 0,
    yAnchor:  appendTextYAnchor.value,
    yOffset:  Number(appendTextYOffset.value) || 0,
  };

  log(`[APPEND] preparing: ${targets.length} targets, font="${fontStr}" size=${opts.size} leading=${opts.leading} boxW=${opts.boxWidth}`);
  setDisabled(appendTextApplyBtn, true);
  let step = 0, ok = 0, fail = 0;
  await setProgress(0, targets.length, "Appending text");
  try {
    await core.executeAsModal(async () => {
      log(`[APPEND] inside modal, looping ${targets.length} artboards`);
      for (const ab of targets) {
        try {
          log(`[APPEND] → "${ab.name}" rect=${ab.left},${ab.top} ${ab.width}×${ab.height}`);
          await switchActiveDoc(ab.docId);
          await selectLayerById(ab.id);
          const cmd = buildMakeTextLayerCmd(ab, opts);
          await bp([cmd]);
          state.modifiedDocIds.add(ab.docId);
          log(`[ADD-TEXT] "${ab.name}" ← "${content.length > 40 ? content.slice(0, 40) + "…" : content}"`);
          ok++;
        } catch (e) {
          log(`[ADD-TEXT] ERROR "${ab.name}": ${e.message || e}`);
          fail++;
        }
        step++; await setProgress(step, targets.length, "Appending text");
      }
    }, { commandName: "Content Replacer: Append Text" });
    log(`Append done. ${ok} added, ${fail} failed.`);
  } catch (e) {
    log(`Append error: ${e.message || e}`);
  } finally {
    hideProgress();
    refreshSaveEnabled();
    refreshAppendTextUI();
  }
  } catch (outerE) {
    log(`[APPEND] OUTER error: ${outerE.message || outerE} (${outerE.stack ? outerE.stack.split("\n")[0] : "?"})`);
  }
});

// ─── Artboard rename ─────────────────────────────────
const artboardRenameCurrent = document.getElementById("artboardRenameCurrent");
const artboardRenameNew     = document.getElementById("artboardRenameNew");
const artboardRenameBtn     = document.getElementById("artboardRenameBtn");

function updateArtboardRenamePreview() {
  const first = state.artboardList.find(a => state.enabledArtboards.has(a.id))
             || state.artboardList[0];
  artboardRenameCurrent.value = first ? first.name : "";
}

function buildNewArtboardName(userInput, width, height) {
  // Strip trailing size digits so user can paste a full name like "foo_970x250"
  const cleaned = (userInput || "").replace(/\s*\d+x\d+\s*$/i, "");
  return `${cleaned}${width}x${height}`;
}

artboardRenameBtn.addEventListener("click", async () => {
  const newInput = artboardRenameNew.value || "";
  if (!newInput.trim()) { log("Rename: enter a new name first"); return; }

  const targets = state.artboardList.filter(a => state.enabledArtboards.has(a.id));
  if (!targets.length) { log("Rename: no artboards enabled"); return; }

  setDisabled(artboardRenameBtn, true);
  const origHtml = artboardRenameBtn.innerHTML;
  artboardRenameBtn.textContent = "Renaming…";
  let ok = 0, fail = 0, skipped = 0;
  try {
    await core.executeAsModal(async () => {
      for (const ab of targets) {
        const newName = buildNewArtboardName(newInput, ab.width, ab.height);
        if (newName === ab.name) { skipped++; continue; }
        try {
          await switchActiveDoc(ab.docId);
          await selectLayerById(ab.id);
          await renameTargetLayer(newName);
          log(`[AB-RENAME] "${ab.name}" → "${newName}"`);
          ab.name = newName;
          state.modifiedDocIds.add(ab.docId);
          ok++;
        } catch (e) {
          log(`[AB-RENAME] ERROR "${ab.name}": ${e.message || e}`);
          fail++;
        }
      }
    }, { commandName: "Content Replacer: Rename Artboards" });

    renderArtboardsList();
    refreshSaveEnabled();
    const msg = fail ? `${ok} ok / ${fail} fail` : (ok ? "Done ✓" : "No change");
    artboardRenameBtn.textContent = msg;
    artboardRenameBtn.classList.add(fail ? "is-fail" : "is-success");
    if (skipped) log(`[AB-RENAME] ${skipped} artboard(s) already had the target name`);
  } catch (e) {
    log(`Rename artboards error: ${e.message || e}`);
    artboardRenameBtn.textContent = "Error";
    artboardRenameBtn.classList.add("is-fail");
  } finally {
    setTimeout(() => {
      artboardRenameBtn.innerHTML = origHtml;
      artboardRenameBtn.classList.remove("is-success", "is-fail");
      setDisabled(artboardRenameBtn, false);
    }, 1800);
  }
});

artboardsToggle.addEventListener("click", () => {
  const open = artboardsBody.style.display !== "none";
  artboardsBody.style.display = open ? "none" : "block";
  const icon = artboardsToggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = open ? "▶" : "▼";
});
artboardsAllBtn.addEventListener("click", e => {
  e.stopPropagation();
  filteredArtboards().forEach(a => state.enabledArtboards.add(a.id));
  renderArtboardsList();
  refreshAppendTextUI();
  renderLayerList();
  refreshApplyEnabled();
  refreshRunBtn();
});
artboardsNoneBtn.addEventListener("click", e => {
  e.stopPropagation();
  filteredArtboards().forEach(a => state.enabledArtboards.delete(a.id));
  renderArtboardsList();
  refreshAppendTextUI();
  renderLayerList();
  refreshApplyEnabled();
  refreshRunBtn();
});

// Search input — UXP input events unreliable, listen to multiple
function applyArtboardSearch() {
  const val = artboardsSearchInput.value || "";
  if (val === state.artboardSearch) return;
  state.artboardSearch = val;
  renderArtboardsList();
}
["input", "keyup", "change", "paste", "cut"].forEach(ev => {
  artboardsSearchInput.addEventListener(ev, () => setTimeout(applyArtboardSearch, 0));
});
artboardsSearchClear.addEventListener("click", () => {
  artboardsSearchInput.value = "";
  applyArtboardSearch();
  artboardsSearchInput.focus();
});

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
  const textTargets   = texts.reduce((s, e) => s + visibleOccurrences(e).length, 0);
  const imageTargets  = images.reduce((s, e) => s + visibleOccurrences(e).length, 0);
  const renameTargets = renames.reduce((s, e) => s + visibleOccurrences(e).length, 0);
  return {
    textCount: texts.length,
    imageCount: images.length,
    renameCount: renames.length,
    totalLayerOps: textTargets + imageTargets + renameTargets,
  };
}

const stickyCta = document.getElementById("stickyCta");
function refreshStickyCta() {
  const applyVisible = state.mode === "replace" && !applyBtn.disabled;
  const saveVisible  = !saveBtn.disabled;
  applyBtn.style.display = applyVisible ? "" : "none";
  saveBtn.style.display  = saveVisible  ? "" : "none";
  stickyCta.style.display = (applyVisible || saveVisible) ? "" : "none";
}

function refreshApplyEnabled() {
  const { textCount, imageCount, renameCount, totalLayerOps } = countPendingOps();
  const hasAny = textCount + imageCount + renameCount > 0;
  setDisabled(applyBtn, !hasAny);
  applyBtn.textContent = hasAny ? `Apply edits (${totalLayerOps})` : "Apply edits";

  const parts = [];
  if (textCount)   parts.push(`${textCount} text`);
  if (imageCount)  parts.push(`${imageCount} image`);
  if (renameCount) parts.push(`${renameCount} rename`);
  summaryBar.innerHTML = hasAny
    ? `<span class="pending">${parts.join(" + ")}</span> ready across ${totalLayerOps} layer${totalLayerOps === 1 ? "" : "s"}`
    : "";
  refreshStickyCta();
}

function refreshSaveEnabled() {
  const n = state.modifiedDocIds.size;
  setDisabled(saveBtn, n === 0);
  saveBtn.textContent = n > 0 ? `Save ${n} doc${n === 1 ? "" : "s"}` : "Save";
  dirtyStatus.textContent = n > 0 ? `Unsaved changes in ${n} document${n === 1 ? "" : "s"}` : "";
  dirtyStatus.className   = n > 0 ? "json-status" : "json-status loaded";
  refreshStickyCta();
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
function u(v) { return v?._value ?? v ?? null; }
function fmtAA(v) {
  if (v == null) return "null";
  if (typeof v === "object") return `${v._value ?? "?"}(${v._enum ?? "?"})`;
  return String(v);
}
// Subset of keys that actually affect rendering weight/position.
const STYLE_WATCH_KEYS = [
  "fontPostScriptName","fontName","fontStyleName","fontScript","fontTechnology",
  "size","impliedFontSize",
  "syntheticBold","syntheticItalic","fauxBold","fauxItalic","impliedFauxBold","impliedFauxItalic",
  "autoLeading","leading","impliedLeading",
  "tracking","impliedTracking","autoKerning","kerning",
  "horizontalScale","verticalScale","impliedHorizontalScale","impliedVerticalScale",
  "baseline","baselineShift","impliedBaselineShift",
  "hindiNumbers","ligature","altligature","oldStyle","proportionalMetrics",
  "noBreak","strikethrough","underline",
  "fontCaps","baselineDirection","textLanguage",
];
function dumpTextDiag(label, desc) {
  const tk = desc?.textKey;
  if (!tk) { log(`  [DIAG ${label}] no textKey`); return; }
  const ts = tk.textStyleRange?.[0]?.textStyle;
  const ps = tk.paragraphStyleRange?.[0]?.paragraphStyle;
  const sh = tk.textShape?.[0];
  const b  = sh?.bounds;
  const c  = ts?.color;
  const tsrN = tk.textStyleRange?.length ?? 0;
  const psrN = tk.paragraphStyleRange?.length ?? 0;

  log(`  [DIAG ${label}] ranges tsr=${tsrN} psr=${psrN} txtLen=${tk.textKey?.length ?? "?"}`);
  if (ts) {
    log(`  [DIAG ${label}] font=${ts.fontPostScriptName || ts.fontName} style="${ts.fontStyleName||""}" size=${u(ts.size)} impliedSize=${u(ts.impliedFontSize)}`);
    log(`  [DIAG ${label}] synthBold=${ts.syntheticBold} synthItalic=${ts.syntheticItalic} fauxBold=${ts.fauxBold} fauxItalic=${ts.fauxItalic} impliedFauxBold=${ts.impliedFauxBold} impliedFauxItalic=${ts.impliedFauxItalic}`);
    log(`  [DIAG ${label}] autoLead=${ts.autoLeading} lead=${u(ts.leading)} impliedLead=${u(ts.impliedLeading)} tracking=${ts.tracking} impliedTracking=${ts.impliedTracking}`);
    log(`  [DIAG ${label}] hScale=${u(ts.horizontalScale)} vScale=${u(ts.verticalScale)} impliedHScale=${u(ts.impliedHorizontalScale)} impliedVScale=${u(ts.impliedVerticalScale)}`);
    log(`  [DIAG ${label}] baseline=${u(ts.baseline)} baselineShift=${u(ts.baselineShift)} impliedBaselineShift=${u(ts.impliedBaselineShift)}`);
    if (c) log(`  [DIAG ${label}] color r=${u(c.red)} g=${u(c.grain ?? c.green)} b=${u(c.blue)}`);
    // Report any textStyle keys we are NOT explicitly tracking — catches hidden round-trip fields.
    const extra = Object.keys(ts).filter(k => !STYLE_WATCH_KEYS.includes(k) && !["_obj","color"].includes(k));
    if (extra.length) log(`  [DIAG ${label}] extraKeys=${extra.join(",")}`);
  }
  // antiAlias can appear on textKey OR on textStyle — log both in raw form.
  log(`  [DIAG ${label}] antiAlias(tk)=${fmtAA(tk.antiAlias)} antiAlias(ts)=${fmtAA(ts?.antiAlias)}`);
  if (ps) {
    log(`  [DIAG ${label}] align=${u(ps.align)} firstIndent=${u(ps.firstLineIndent)} spaceBefore=${u(ps.spaceBefore)} spaceAfter=${u(ps.spaceAfter)} hyphenate=${ps.hyphenate}`);
    const extraP = Object.keys(ps).filter(k => !["_obj","align","firstLineIndent","spaceBefore","spaceAfter","hyphenate","startIndent","endIndent"].includes(k));
    if (extraP.length) log(`  [DIAG ${label}] paraExtraKeys=${extraP.join(",")}`);
  }
  if (sh) {
    const hasUnit = b && (b.top?._unit || b.left?._unit);
    log(`  [DIAG ${label}] shape=${u(sh.char)} hasUnit=${!!hasUnit} bounds L=${u(b?.left)} T=${u(b?.top)} R=${u(b?.right)} B=${u(b?.bottom)} orient=${u(sh.orientation)}`);
    if (sh.transform) {
      const t = sh.transform;
      log(`  [DIAG ${label}] shapeTransform xx=${t.xx} xy=${t.xy} yx=${t.yx} yy=${t.yy} tx=${t.tx} ty=${t.ty}`);
    }
  }
  if (tk.transform) {
    const t = tk.transform;
    log(`  [DIAG ${label}] tkTransform xx=${t.xx} xy=${t.xy} yx=${t.yx} yy=${t.yy} tx=${t.tx} ty=${t.ty}`);
  }
  const lb = rectSize(desc.bounds);
  log(`  [DIAG ${label}] layerBounds ${Math.round(lb.width)}×${Math.round(lb.height)} @ ${Math.round(lb.left)},${Math.round(lb.top)}`);
  // boundsNoEffects is the raw text bounds without layer effects — useful to see baseline drift.
  if (desc.boundsNoEffects) {
    const lbn = rectSize(desc.boundsNoEffects);
    log(`  [DIAG ${label}] boundsNoEffects ${Math.round(lbn.width)}×${Math.round(lbn.height)} @ ${Math.round(lbn.left)},${Math.round(lbn.top)}`);
  }
}

// Log full style object being sent (stringified, but trimmed).
function dumpSentStyle(label, styleObj) {
  if (!styleObj) { log(`  [DIAG ${label}] no style`); return; }
  const keys = Object.keys(styleObj);
  log(`  [DIAG ${label}] allKeys(${keys.length})=${keys.join(",")}`);
  try {
    const json = JSON.stringify(styleObj, (k, v) => {
      if (v && typeof v === "object" && "_value" in v && Object.keys(v).length <= 3) return `${v._value}${v._unit ? v._unit : ""}`;
      return v;
    });
    // Split long JSON so the log file stays readable.
    const CHUNK = 500;
    for (let i = 0; i < json.length; i += CHUNK) log(`  [DIAG ${label}] json[${i}]=${json.slice(i, i + CHUNK)}`);
  } catch (e) {
    log(`  [DIAG ${label}] json err: ${e.message}`);
  }
}

// ─── Mixed-style preservation ──────────────────────────
// Extracts <sup>…</sup> and <sub>…</sub> spans so the caller can apply a
// "superscript-like" / "subscript-like" style to those spans in the new text.
// Tags are stripped; returned positions are in the cleaned text. Markers are
// case-insensitive and non-nested (lazy match).
function stripStyleMarkers(text) {
  const spans = [];
  let clean = "";
  const re = /<(sup|sub)>([\s\S]*?)<\/\1>/gi;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    clean += text.slice(last, m.index);
    const from = clean.length;
    clean += m[2];
    spans.push({ kind: m[1].toLowerCase(), from, to: clean.length });
    last = m.index + m[0].length;
  }
  clean += text.slice(last);
  return { clean, spans };
}

// LCS-based char-level map: returns an array of length oldText.length whose
// value at index i is the corresponding index in newText, or -1 if the char
// was not part of the common subsequence.
function lcsMapOldToNew(oldText, newText) {
  const n = oldText.length, m = newText.length;
  const map = new Array(n).fill(-1);
  if (!n || !m) return map;
  // Cap memory at ~16MB (4M ints). Fall back to identity map beyond that.
  if (n * m > 4_000_000) {
    const lim = Math.min(n, m);
    for (let i = 0; i < lim; i++) if (oldText.charCodeAt(i) === newText.charCodeAt(i)) map[i] = i;
    return map;
  }
  const dp = [];
  for (let i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldText.charCodeAt(i - 1) === newText.charCodeAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
    }
  }
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (oldText.charCodeAt(i - 1) === newText.charCodeAt(j - 1)) {
      map[i - 1] = j - 1;
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return map;
}

// Clone the base style and force a super/subscript baseline + size scale.
// Used when the PSD has no existing super/sub range to copy from.
function synthesizeBaselineStyle(base, kind) {
  if (!base) return base;
  const cloned = { ...base };
  cloned.baseline = {
    _enum: "baselineType",
    _value: kind === "sub" ? "subScript" : "superScript",
  };
  const sz = base?.size?._value;
  if (typeof sz === "number") {
    const scaled = Math.round(sz * 0.583 * 100) / 100;
    cloned.size = { _unit: "pointsUnit", _value: scaled };
    if ("impliedFontSize" in cloned) cloned.impliedFontSize = { _unit: "pointsUnit", _value: scaled };
  }
  delete cloned.impliedFauxBold;
  delete cloned.impliedFauxItalic;
  return cloned;
}

// Pick a textStyle for the requested marker kind ("sup" | "sub"):
//   1) an original range whose baseline/otbaseline explicitly matches
//   2) (sup only) an original range with a smaller size than base
//   3) synthesized baseline style derived from base (guaranteed correct rendering)
function pickMarkerStyle(ranges, baseRange, kind) {
  const base = baseRange?.textStyle;
  const baseSize = base?.size?._value ?? base?.size ?? 0;
  const wantSub = kind === "sub";
  const hit = s => {
    const bl = String(s?.baseline?._value ?? s?.baseline ?? "").toLowerCase();
    const ob = String(s?.otbaseline?._value ?? s?.otbaseline ?? "").toLowerCase();
    const needle = wantSub ? "sub" : "super";
    return bl.includes(needle) || ob.includes(needle);
  };
  for (const r of ranges) {
    if (r === baseRange) continue;
    if (hit(r.textStyle)) { return { style: r.textStyle, source: "matched" }; }
  }
  if (!wantSub) {
    for (const r of ranges) {
      if (r === baseRange) continue;
      const sz = r.textStyle?.size?._value ?? r.textStyle?.size ?? 0;
      if (sz > 0 && baseSize > 0 && sz < baseSize) return { style: r.textStyle, source: "smallerSize" };
    }
  }
  return { style: synthesizeBaselineStyle(base, kind), source: "synthesized" };
}

// Rebuilds textStyleRange entries for `newText` by:
//   1) Picking the longest old range as the base style.
//   2) Mapping each non-base old range onto newText via LCS char alignment.
//   3) Overriding any sup-marker span with a "sup-like" style.
//   4) Collapsing the per-char assignment into contiguous ranges.
function buildRangesForNewText(oldText, oldRanges, newText, markerSpans) {
  if (!oldRanges?.length || !newText.length) {
    return [{ _obj: "textStyleRange", from: 0, to: newText.length, textStyle: oldRanges?.[0]?.textStyle }];
  }
  let baseRange = oldRanges[0], baseLen = -1;
  for (const r of oldRanges) {
    const len = Math.max(0, (r.to ?? 0) - (r.from ?? 0));
    if (len > baseLen) { baseLen = len; baseRange = r; }
  }
  const baseStyle = baseRange.textStyle;
  const supPick = pickMarkerStyle(oldRanges, baseRange, "sup");
  const subPick = pickMarkerStyle(oldRanges, baseRange, "sub");
  const markerStyles = { sup: supPick.style, sub: subPick.style };
  if ((markerSpans || []).length) {
    log(`  [TXT] marker styles: sup=${supPick.source} sub=${subPick.source}`);
  }

  const posStyle = new Array(newText.length).fill(baseStyle);

  const map = lcsMapOldToNew(oldText, newText);
  for (const r of oldRanges) {
    if (r === baseRange) continue;
    const from = Math.max(0, r.from ?? 0);
    const to = Math.min(oldText.length, r.to ?? 0);
    for (let k = from; k < to; k++) {
      const nj = map[k];
      if (nj >= 0) posStyle[nj] = r.textStyle;
    }
  }

  for (const span of markerSpans || []) {
    const style = markerStyles[span.kind] || baseStyle;
    for (let k = span.from; k < Math.min(span.to, newText.length); k++) posStyle[k] = style;
  }

  const out = [];
  let start = 0;
  for (let k = 1; k <= newText.length; k++) {
    if (k === newText.length || posStyle[k] !== posStyle[start]) {
      out.push({ _obj: "textStyleRange", from: start, to: k, textStyle: posStyle[start] });
      start = k;
    }
  }
  return out.length ? out : [{ _obj: "textStyleRange", from: 0, to: newText.length, textStyle: baseStyle }];
}

async function replaceTextOnLayer(occ, newContent) {
  await selectLayerById(occ.layerId);
  const preDesc = await getTargetLayerDescriptor();
  if (preDesc.layerID !== occ.layerId) {
    throw new Error(`stale id ${occ.layerId} — please re-scan (active: ${preDesc.layerID})`);
  }
  const wasVisible = preDesc.visible !== false;
  const { clean: rawClean, spans: markerSpans } = stripStyleMarkers(newContent);
  const psContent = rawClean.replace(/\r?\n/g, "\r");
  if (markerSpans.length) {
    const counts = markerSpans.reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {});
    log(`  [TXT] style markers stripped: ${JSON.stringify(counts)}`);
  }
  const tk = preDesc.textKey;
  if (tk && !tk.textShape && preDesc.textShape) tk.textShape = preDesc.textShape;

  const isPointText = !tk?.textShape?.length || tk.textShape[0]?.char?._value !== "box";
  const oldBounds = rectSize(preDesc.bounds);
  log(`  [TXT] type=${isPointText ? "point" : "box"} before=${Math.round(oldBounds.width)}×${Math.round(oldBounds.height)} @ ${Math.round(oldBounds.left)},${Math.round(oldBounds.top)}`);
  dumpTextDiag("PRE", preDesc);

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
  dumpTextDiag("MID", freshDesc);
  const toObj = { _obj: "textLayer", textKey: psContent };

  if (freshTK) {
    const newLen = psContent.length;
    // Use PRE style ranges (original fonts), not freshTK — convertToParagraphText resets
    // range[0] to the parent style (e.g. Roboto-CondensedLight → MyriadPro-Regular),
    // which would make the rendered text visibly heavier and wrong.
    const styleSource = (tk?.textStyleRange?.length) ? tk : freshTK;
    log(`  [TXT] styleSource=${styleSource === tk ? "PRE" : "MID"} (preserves original font)`);
    if (styleSource.textStyleRange && styleSource.textStyleRange.length) {
      // Map original style ranges onto the new text via LCS char alignment so that
      // per-glyph formatting (e.g. superscript ®) follows its character instead of
      // sticking to stale offsets. <sup>…</sup> markers in the input override onto
      // the "sup-like" style picked from the original ranges.
      const oldText = styleSource.textKey || tk?.textKey || "";
      const ranges = buildRangesForNewText(oldText, styleSource.textStyleRange, psContent, markerSpans);
      log(`  [TXT] rebuilt ranges: ${ranges.length} from ${styleSource.textStyleRange.length} (markers=${markerSpans.length})`);
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const ts = r.textStyle || {};
        const bl = ts.baseline?._value ?? ts.baseline;
        const ob = ts.otbaseline?._value ?? ts.otbaseline;
        const sz = ts.size?._value ?? ts.size;
        log(`  [TXT] range[${i}] ${r.from}-${r.to} font=${ts.fontPostScriptName || ts.fontName} size=${sz} baseline=${bl} otbaseline=${ob}`);
      }
      toObj.textStyleRange = ranges;
    }
    const paraSource = (tk?.paragraphStyleRange?.length) ? tk : freshTK;
    if (paraSource.paragraphStyleRange && paraSource.paragraphStyleRange.length) {
      const paras = paraSource.paragraphStyleRange.map((p, i, arr) => {
        const clone = { _obj: "paragraphStyleRange", from: p.from, to: p.to, paragraphStyle: p.paragraphStyle };
        if (i === arr.length - 1) clone.to = newLen;
        return clone;
      });
      if (paras.length === 1) paras[0].from = 0;
      toObj.paragraphStyleRange = paras;
    }
    // Prefer PRE antiAlias — same rationale (convert can change rendering hints).
    if (tk?.antiAlias) toObj.antiAlias = tk.antiAlias;
    else if (freshTK.antiAlias) toObj.antiAlias = freshTK.antiAlias;
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

  // Log what we are about to send
  const sentTS = toObj.textStyleRange?.[0]?.textStyle;
  if (sentTS) {
    log(`  [DIAG SENT] font=${sentTS.fontPostScriptName || sentTS.fontName} size=${u(sentTS.size)} impliedSize=${u(sentTS.impliedFontSize)} synthBold=${sentTS.syntheticBold} fauxBold=${sentTS.fauxBold} impliedFauxBold=${sentTS.impliedFauxBold}`);
    log(`  [DIAG SENT] antiAlias(obj)=${fmtAA(toObj.antiAlias)} antiAlias(style)=${fmtAA(sentTS.antiAlias)} tsrN=${toObj.textStyleRange?.length} psrN=${toObj.paragraphStyleRange?.length}`);
    const sb = toObj.textShape?.[0]?.bounds;
    if (sb) log(`  [DIAG SENT] shapeBounds L=${sb.left} T=${sb.top} R=${sb.right} B=${sb.bottom}`);
    dumpSentStyle("SENT-STYLE", sentTS);
    if (toObj.paragraphStyleRange?.[0]?.paragraphStyle) {
      dumpSentStyle("SENT-PARA", toObj.paragraphStyleRange[0].paragraphStyle);
    }
  }

  await bp([{
    _obj: "set",
    _target: [{ _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }],
    to: toObj,
    _options: { dialogOptions: "dontDisplay" }
  }]);

  // Realign so the new layer sits at the original visual position.
  // Point text was anchored at the first-line baseline, but after point→box
  // conversion PS anchors at top-left and the box is often wider than the visual
  // bounds — left and top drift. We translate so that:
  //   - left  align: oldBounds.left  matches new left
  //   - right align: oldBounds.right matches new right
  //   - center:      horizontal center matches oldBounds center
  //   - top of the rendered text matches oldBounds.top in all cases
  if (isPointText && oldBounds.width > 0) {
    const afterSet = await getTargetLayerDescriptor();
    const nb = rectSize(afterSet.bounds);
    if (nb.width > 0 && nb.height > 0) {
      const alignRaw = String(
        tk?.paragraphStyleRange?.[0]?.paragraphStyle?.align?._value
        ?? freshTK?.paragraphStyleRange?.[0]?.paragraphStyle?.align?._value
        ?? "left"
      ).toLowerCase();
      let alignKind = "left";
      if (alignRaw.includes("right"))       alignKind = "right";
      else if (alignRaw.includes("center")) alignKind = "center";
      let dx;
      if (alignKind === "right")       dx = oldBounds.right - nb.right;
      else if (alignKind === "center") dx = (oldBounds.left + oldBounds.width / 2) - (nb.left + nb.width / 2);
      else                              dx = oldBounds.left - nb.left;
      const dy = oldBounds.top - nb.top;
      log(`  [TXT] realign align=${alignKind} (raw=${alignRaw}) dx=${Math.round(dx)} dy=${Math.round(dy)} (old L=${Math.round(oldBounds.left)} R=${Math.round(oldBounds.right)} T=${Math.round(oldBounds.top)} | new L=${Math.round(nb.left)} R=${Math.round(nb.right)} T=${Math.round(nb.top)})`);
      const activeIds = (app.activeDocument.activeLayers || []).map(l => l.id).join(",");
      log(`  [TXT] activeLayers=[${activeIds}] target=${occ.layerId}`);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        try {
          // Target the layer explicitly by ID — activeLayers[0] sometimes shifts
          // after `set textKey`, especially inside artboards.
          const moveResult = await bp([{
            _obj: "move",
            _target: [{ _ref: "layer", _id: occ.layerId }],
            to: {
              _obj: "offset",
              horizontal: { _unit: "pixelsUnit", _value: dx },
              vertical:   { _unit: "pixelsUnit", _value: dy },
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`  [TXT] move batchPlay ok=${!!moveResult}`);
          // Verify it moved by re-reading bounds immediately.
          await selectLayerById(occ.layerId);
          const verifyDesc = await getTargetLayerDescriptor();
          const vb = rectSize(verifyDesc.bounds);
          log(`  [TXT] post-move bounds @ ${Math.round(vb.left)},${Math.round(vb.top)} ${Math.round(vb.width)}×${Math.round(vb.height)}`);
        } catch (e) {
          log(`  [TXT] realign failed: ${e.message}`);
          // Fallback: DOM translate.
          try {
            const lyr = app.activeDocument.activeLayers[0];
            if (lyr) await lyr.translate(dx, dy);
            log(`  [TXT] fallback DOM translate done`);
          } catch (e2) {
            log(`  [TXT] DOM translate also failed: ${e2.message}`);
          }
        }
      }
    }
  }

  // Log final state
  const endDesc = await getTargetLayerDescriptor();
  dumpTextDiag("POST", endDesc);
  if (isPointText) {
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
    textOps.reduce((s, e) => s + visibleOccurrences(e).length, 0) +
    imageOps.reduce((s, e) => s + visibleOccurrences(e).length, 0) +
    renameOps.reduce((s, e) => s + visibleOccurrences(e).length, 0);

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
    for (const occ of visibleOccurrences(entry)) {
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
    for (const occ of visibleOccurrences(entry)) {
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
    for (const occ of visibleOccurrences(entry)) {
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
    renderArtboardsList();
    refreshAppendTextUI();
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

// Filter buttons (only those with data-filter — exclude select/deselect/refresh)
document.querySelectorAll(".filter-btn[data-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn[data-filter]").forEach(b => b.classList.remove("active"));
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

// Layers list collapsible header
const layersToggle = document.getElementById("layersToggle");
const layersToggleCount = document.getElementById("layersToggleCount");
layersToggle.addEventListener("click", () => {
  const list = document.getElementById("layerList");
  const collapsed = list.style.display === "none";
  list.style.display = collapsed ? "" : "none";
  const icon = layersToggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = collapsed ? "▼" : "▶";
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
  const totalOcc = selected.reduce((s, e) => s + visibleOccurrences(e).length, 0);
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
  const totalOcc = selected.reduce((s, e) => s + visibleOccurrences(e).length, 0);
  if (!totalOcc) return;

  setDisabled(runActionBtn, true);
  let step = 0;
  await setProgress(0, totalOcc, "Running action");

  try {
    await core.executeAsModal(async () => {
      for (const entry of selected) {
        for (const occ of visibleOccurrences(entry)) {
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
  refreshStickyCta();
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
