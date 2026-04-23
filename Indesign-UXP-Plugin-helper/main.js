/* Banner Helper — InDesign UXP plugin
 * Tính diện tích từng logo theo client ratio và tỷ lệ giữa các logo.
 */

const indesign = require("indesign");
const { app } = indesign;

const LABEL_KEY = "bannerHelper.logos.v2";
const STORAGE_KEY = "bannerHelper.settings.v2";

const DEFAULT_CLIENT_ID = "pilot";

const AREA_DECIMALS = 2;
const PCT_DECIMALS = 1;

const DEFAULT_SETTINGS = {
  unit: "auto",
  reportTitle: "QSR Percentages",
  clients: [
    { id: "pilot",   name: "Pilot",    ratio: 0.587 },
    { id: "flying", name: "Flying", ratio: 0.556 },
    { id: "generic", name: "Generic",  ratio: 1.0   }
  ]
};

const REPORT_LABEL = "BannerHelper:report";        // total (legacy / no page)
const REPORT_LABEL_PAGE_PREFIX = "BannerHelper:report:p";  // per-page: ...:p<pageIdx>

let settings = cloneSettings(DEFAULT_SETTINGS);
let logos = [];   // { id, label, itemId, clientId }
let currentDocKey = null;      // doc key `logos` was loaded from; blocks cross-doc writes when user switches active doc mid-edit
let pageFilter = null;         // page index (0-based), null = auto-pick first available
let compactView = false;

const UI_STATE_KEY = "bannerhelper:ui";
function loadUiState() {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (Number.isInteger(p.pageFilter)) pageFilter = p.pageFilter;
    if (typeof p.compactView === "boolean") compactView = p.compactView;
  } catch (e) { /* ignore */ }
}
function saveUiState() {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify({ pageFilter, compactView }));
  } catch (e) { /* ignore */ }
}

function cloneSettings(s) {
  return {
    unit: s.unit,
    reportTitle: s.reportTitle,
    clients: s.clients.map(c => ({ ...c }))
  };
}

/* ============ UNITS ============ */
// All internal math in POINTS (pt). geometricBounds returns ruler units,
// so we temporarily switch ruler to POINTS for reads.

const PT_PER_MM = 2.8346456693;
const PT_PER_CM = 28.346456693;
const PT_PER_IN = 72;

function ptToUnit(valPt, unit) {
  switch (unit) {
    case "mm": return valPt / PT_PER_MM;
    case "cm": return valPt / PT_PER_CM;
    case "in": return valPt / PT_PER_IN;
    case "px": return valPt;
    default: return valPt;
  }
}

function resolveDisplayUnit(doc) {
  if (settings.unit !== "auto") return settings.unit;
  const u = doc.viewPreferences.horizontalMeasurementUnits;
  const MU = indesign.MeasurementUnits;
  // Enum-based match
  if (u === MU.MILLIMETERS) return "mm";
  if (u === MU.CENTIMETERS) return "cm";
  if (u === MU.INCHES || u === MU.INCHES_DECIMAL) return "in";
  if (u === MU.PIXELS) return "px";
  if (u === MU.POINTS) return "px";   // treat pt ≈ px at 72dpi for display
  // String-name fallback — some UXP builds return enum as string/named object
  const name = String(u || "").toUpperCase();
  if (name.includes("MILLI")) return "mm";
  if (name.includes("CENTI")) return "cm";
  if (name.includes("INCH")) return "in";
  if (name.includes("PIXEL")) return "px";
  if (name.includes("POINT")) return "px";
  return "px";
}

function unitLabel(u) {
  return { mm: "mm", cm: "cm", in: "in", px: "px" }[u] || u;
}
/* ============ BOUNDS MATH ============ */
// geometricBounds → [y1, x1, y2, x2] in current ruler units.
// Ruler-switch approach: briefly set ruler to POINTS, read, restore.
// This avoids depending on enum comparisons that can silently fail across
// UXP versions. Signature diff ensures we only switch when things change.

function withPtUnits(doc, fn) {
  const vp = doc.viewPreferences;
  const pt = indesign.MeasurementUnits.POINTS;
  const prevH = vp.horizontalMeasurementUnits;
  const prevV = vp.verticalMeasurementUnits;
  if (prevH === pt && prevV === pt) return fn();
  try {
    vp.horizontalMeasurementUnits = pt;
    vp.verticalMeasurementUnits = pt;
    return fn();
  } finally {
    try {
      vp.horizontalMeasurementUnits = prevH;
      vp.verticalMeasurementUnits = prevV;
    } catch (e) { /* ignore restore errors */ }
  }
}

function intersectRect(a, b) {
  const [ay1, ax1, ay2, ax2] = a;
  const [by1, bx1, by2, bx2] = b;
  const x1 = Math.max(ax1, bx1);
  const y1 = Math.max(ay1, by1);
  const x2 = Math.min(ax2, bx2);
  const y2 = Math.min(ay2, by2);
  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);
  return { w, h, area: w * h };
}

function pageBounds(page) {
  // page.bounds = [y1, x1, y2, x2] of page relative to spread
  return page.bounds;
}

// Caller must wrap in withPtUnits — bounds are read as pt.
function computeLogoMetrics(doc, pageItem) {
  const frame = pageItem.geometricBounds;
  const page = pageItem.parentPage || firstPage(doc);
  const pb = pageBounds(page);
  const pageW = pb[3] - pb[1];
  const pageH = pb[2] - pb[0];
  const pageArea = pageW * pageH;

  const frameW = frame[3] - frame[1];
  const frameH = frame[2] - frame[0];
  const frameArea = frameW * frameH;

  const visible = intersectRect(frame, pb);
  const percent = pageArea > 0 ? (visible.area / pageArea) * 100 : 0;

  return {
    frameW, frameH, frameArea,
    visibleW: visible.w, visibleH: visible.h, visibleArea: visible.area,
    pageW, pageH, pageArea,
    percent,
    pageName: page.name,
    pageIndex: page.documentOffset,
    clipped: visible.area < frameArea - 0.5
  };
}

/* ============ CLIENTS ============ */
function getClientById(id) {
  return settings.clients.find(c => c.id === id) || null;
}

function getClientForLogo(logo) {
  return getClientById(logo.clientId) || getClientById(DEFAULT_CLIENT_ID) || settings.clients[0];
}

function roundTo(value, digits) {
  const d = Math.max(0, Math.min(10, digits | 0));
  const f = Math.pow(10, d);
  return Math.round(value * f) / f;
}

function formatNumber(value, digits) {
  const d = Math.max(0, Math.min(10, digits | 0));
  return roundTo(value, d).toFixed(d);
}

// Dimension display: keep full precision (up to 4 decimals — InDesign's
// internal precision), trim trailing zeros. No rounding per client setting.
function formatDim(value) {
  if (!isFinite(value)) return "0";
  return Number(value.toFixed(4)).toString();
}

// Balanced percentages so the group sums to exactly 100. balancerIdx absorbs
// the rounding residual; if -1 or out-of-range, the last item absorbs it
// (spreadsheet default). All values rounded to PCT_DECIMALS.
function balancePercents(squares, balancerIdx) {
  const total = squares.reduce((a, b) => a + b, 0);
  if (total <= 0) return squares.map(() => 0);
  const bi = balancerIdx >= 0 && balancerIdx < squares.length ? balancerIdx : squares.length - 1;
  const rounded = squares.map((s, i) => {
    if (i === bi) return 0;
    return Number(((s / total) * 100).toFixed(PCT_DECIMALS));
  });
  const rest = rounded.reduce((a, b, i) => (i === bi ? a : a + b), 0);
  rounded[bi] = Number((100 - rest).toFixed(PCT_DECIMALS));
  return rounded;
}

function newClientId() {
  return "c" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

function clientOptionLabel(c) {
  return `${escapeHtml(c.name)} (×${c.ratio})`;
}

/* ============ PERSIST ============ */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    settings = {
      unit: parsed.unit || DEFAULT_SETTINGS.unit,
      reportTitle: typeof parsed.reportTitle === "string" ? parsed.reportTitle : DEFAULT_SETTINGS.reportTitle,
      clients: Array.isArray(parsed.clients) && parsed.clients.length > 0
        ? parsed.clients.map(c => ({
            id: c.id || newClientId(),
            name: c.name || "Unnamed",
            ratio: Number(c.ratio) || 1
          }))
        : DEFAULT_SETTINGS.clients.map(c => ({ ...c }))
    };
  } catch (e) { /* ignore */ }
}
function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// In-session identity of a doc. doc.id is a unique long per open document,
// which matters for cloned files where fullName / name may alias.
function docIdentityKey(doc) {
  if (!doc) return null;
  try {
    const rawId = doc.id;
    if (Number.isFinite(rawId)) return "id:" + rawId;
    console.warn("[BannerHelper][dbg] doc.id not finite:", rawId, "name:", doc.name);
  } catch (e) { console.warn("[BannerHelper][dbg] doc.id read err:", e); }
  try { return "n:" + (doc.name || ""); } catch (e) { /* ignore */ }
  return null;
}

// localStorage key for the in-session backup. Combines name + doc.id so
// two open docs with the same filename still get distinct entries (pure
// doc.fullName doesn't work — UXP returns a Promise, not a File).
// XMP label is the real persistence; LS is best-effort redundancy.
function docBackupKey(doc) {
  if (!doc) return null;
  let nm = "";
  let id = "";
  try { nm = doc.name || ""; } catch (e) { /* ignore */ }
  try { id = Number.isFinite(doc.id) ? String(doc.id) : ""; } catch (e) { /* ignore */ }
  if (!nm && !id) return null;
  return "bannerhelper:logos:" + nm + "#" + id;
}

// Parse stored payload — supports legacy (plain array) and v2 ({ ts, logos })
function parseLogosPayload(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return { ts: 0, logos: p };                         // legacy
    if (p && Array.isArray(p.logos)) return { ts: Number(p.ts) || 0, logos: p.logos };
  } catch (e) { /* ignore */ }
  return null;
}

function loadLogos() {
  logos = [];
  const doc = app.activeDocument;
  currentDocKey = doc ? docIdentityKey(doc) : null;
  console.log("[BannerHelper][dbg] loadLogos from", doc && doc.name, "identity=", currentDocKey, "lsKey=", docBackupKey(doc));
  if (!doc) return;

  let docData = null, lsData = null;
  try { docData = parseLogosPayload(doc.extractLabel(LABEL_KEY)); } catch (e) { /* ignore */ }
  try {
    const k = docBackupKey(doc);
    if (k) lsData = parseLogosPayload(localStorage.getItem(k));
  } catch (e) { /* ignore */ }

  // Pick newer. If only one exists, use it.
  let chosen = null;
  if (docData && lsData) chosen = lsData.ts > docData.ts ? lsData : docData;
  else chosen = docData || lsData;
  if (!chosen) return;

  logos = chosen.logos.map(l => ({
    ...l,
    clientId: l.clientId || DEFAULT_CLIENT_ID
  }));

  // Sync when stores diverge — loser gets updated to chosen version + ts.
  const docTs = docData ? docData.ts : -1;
  const lsTs  = lsData  ? lsData.ts  : -1;
  if (docTs !== lsTs) {
    try { saveLogos(chosen.ts); } catch (e) { /* ignore */ }
  }
}

function saveLogos(ts) {
  const doc = app.activeDocument;
  if (!doc) { console.warn("[BannerHelper][dbg] saveLogos: no activeDoc"); return; }
  const activeIdentity = docIdentityKey(doc);
  const lsKey = docBackupKey(doc);
  console.log("[BannerHelper][dbg] saveLogos doc=", doc.name, "identity=", activeIdentity, "currentDocKey=", currentDocKey, "lsKey=", lsKey);
  if (currentDocKey && activeIdentity !== currentDocKey) {
    console.warn("[BannerHelper][dbg] saveLogos BLOCKED by guard — identity mismatch");
    return;
  }
  const payload = JSON.stringify({
    ts: Number.isFinite(ts) ? ts : Date.now(),
    logos
  });
  try { doc.insertLabel(LABEL_KEY, payload); } catch (e) { console.warn("[BannerHelper][dbg] insertLabel err", e); }
  try {
    if (lsKey) localStorage.setItem(lsKey, payload);
  } catch (e) { console.warn("[BannerHelper][dbg] LS setItem err", e); }
}

/* ============ LOOKUP ============ */
function findPageItemById(id) {
  const doc = app.activeDocument;
  if (!doc) return null;
  // Fast path: top-level lookup
  try {
    const item = doc.pageItems.itemByID(id);
    if (item && item.isValid) return item;
  } catch (e) { /* ignore */ }
  // Fallback: walk all items including nested (items inside groups)
  try {
    const all = doc.allPageItems;
    if (all && all.length) {
      for (let i = 0; i < all.length; i++) {
        try {
          const p = all[i];
          if (p && p.id === id) return p;
        } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

function getItemConstructor(item) {
  if (!item) return "";
  try {
    const cn = item.constructorName;
    if (cn && cn !== "PageItem") return cn;
  } catch (e) {}
  try {
    const cn = item.constructor && item.constructor.name;
    if (cn) return cn;
  } catch (e) {}
  return "PageItem";
}

// Resolve to concrete element (UXP sometimes returns generic PageItem wrapper).
function resolveConcrete(item) {
  if (!item) return item;
  try {
    if (typeof item.getElements === "function") {
      const els = item.getElements();
      if (els && els.length > 0) return els[0];
    }
  } catch (e) {}
  return item;
}

// Try to get the placed link name (e.g., "Pilot_2026_OOH_Logo.ai") from any
// graphic nested in this frame. Returns null if none.
function getPlacedLinkName(item) {
  const concrete = resolveConcrete(item);
  if (!concrete) return null;
  // Direct itemLink
  try {
    if (concrete.itemLink && concrete.itemLink.name) return concrete.itemLink.name;
  } catch (e) {}
  // Try graphics collection
  try {
    const gs = concrete.graphics;
    if (gs && gs.length > 0) {
      let g = null;
      try { g = gs.item(0); } catch (e) { try { g = gs[0]; } catch (_) {} }
      if (g && g.itemLink && g.itemLink.name) return g.itemLink.name;
    }
  } catch (e) {}
  // Try specific collections
  const colls = ["images", "pdfs", "epss", "importedPages", "wmfs"];
  for (let i = 0; i < colls.length; i++) {
    try {
      const c = concrete[colls[i]];
      if (c && c.length > 0) {
        let g = null;
        try { g = c.item(0); } catch (e) { try { g = c[0]; } catch (_) {} }
        if (g && g.itemLink && g.itemLink.name) return g.itemLink.name;
      }
    } catch (e) {}
  }
  // Try allGraphics (recursive)
  try {
    const ag = concrete.allGraphics;
    if (ag && ag.length > 0) {
      const g = ag[0];
      if (g && g.itemLink && g.itemLink.name) return g.itemLink.name;
    }
  } catch (e) {}
  // Try allPageItems: find nested graphic
  try {
    const aps = concrete.allPageItems;
    if (aps && aps.length > 0) {
      for (let i = 0; i < aps.length; i++) {
        try {
          const p = aps[i];
          if (p && p.itemLink && p.itemLink.name) return p.itemLink.name;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return null;
}

// If item is an inner graphic, return its containing frame.
function normalizeItemForDisplay(item) {
  if (!item) return item;
  const concrete = resolveConcrete(item);
  const cn = getItemConstructor(concrete);
  if (/^(PDF|Image|EPS|WMF|Graphic|ImportedPage)$/i.test(cn)) {
    try {
      const p = concrete.parent;
      if (p) return p;
    } catch (e) {}
  }
  return concrete;
}

// Default label for Add dialog: placed file name without extension,
// else item's own name, else empty (caller falls back to "Logo N").
function getItemDefaultLabel(item) {
  const norm = normalizeItemForDisplay(item);
  const link = getPlacedLinkName(norm);
  if (link) return link.replace(/\.[^.]+$/, "");
  try { if (norm && norm.name) return norm.name; } catch (e) {}
  return "";
}

// Display name like Layers panel: placed graphic → <file.ai>, else name, else <type>.
function getItemDisplayName(item) {
  const norm = normalizeItemForDisplay(item);
  if (!norm) return "";
  const link = getPlacedLinkName(norm);
  if (link) return `<${link}>`;
  try { if (norm.name) return norm.name; } catch (e) {}
  const cn = getItemConstructor(norm);
  return `<${String(cn).toLowerCase()}>`;
}

// Build a Layers-panel style path: "Layer 1 / <group> / <Pilot_2026_OOH_Logo.ai>"
function getItemPath(item) {
  const norm = normalizeItemForDisplay(item);
  if (!norm) return "";
  const parts = [];
  let cur = null;
  try { cur = norm.parent; } catch (e) {}
  let depth = 0;
  while (cur && depth < 20) {
    const cn = getItemConstructor(cur);
    if (!cn || /Spread|Page|Document|Application/.test(cn)) break;
    let nm = "";
    try { nm = (cur.name || "").trim(); } catch (e) {}
    parts.unshift(nm ? nm : `<${cn.toLowerCase()}>`);
    try { cur = cur.parent; } catch (e) { break; }
    depth++;
  }
  try {
    const lyr = norm.itemLayer;
    if (lyr && lyr.name) parts.unshift(lyr.name);
  } catch (e) {}
  parts.push(getItemDisplayName(norm));
  return parts.join(" / ");
}

/* ============ UI ============ */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return [...document.querySelectorAll(sel)]; }

function refreshDocInfo() {
  const el = $("#docInfo");
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { el.textContent = "No document open"; return; }
  const docName = doc.name || "(unnamed)";
  try {
    withPtUnits(doc, () => {
      const p = firstPage(doc);
      if (!p) { el.textContent = `${docName} — no pages`; return; }
      const pb = p.bounds;
      const w = pb[3] - pb[1];
      const h = pb[2] - pb[0];
      const unit = resolveDisplayUnit(doc);
      const ww = ptToUnit(w, unit).toFixed(1);
      const hh = ptToUnit(h, unit).toFixed(1);
      const pagesTxt = doc.pages.length > 1 ? ` · ${doc.pages.length} pages` : "";
      el.innerHTML = `<div class="doc-info-name" title="${escapeHtml(docName)}">${escapeHtml(docName)}</div><div class="doc-info-meta">Canvas: ${ww} × ${hh} ${unit}${pagesTxt}</div>`;
    });
  } catch (e) {
    el.textContent = `${docName} — read error`;
    console.error("[BannerHelper] refreshDocInfo error", e);
  }
}

function firstPage(doc) {
  try {
    if (doc.pages.firstItem) return doc.pages.firstItem();
  } catch (e) { /* ignore */ }
  try { return doc.pages.item(0); } catch (e) { /* ignore */ }
  try { return doc.pages[0]; } catch (e) { /* ignore */ }
  return null;
}

function pageAt(doc, idx) {
  try {
    if (doc.pages.item) return doc.pages.item(idx);
  } catch (e) { /* ignore */ }
  try { return doc.pages[idx]; } catch (e) { /* ignore */ }
  return null;
}

function getActivePageIndex(doc) {
  if (!doc) return null;
  try {
    const win = app.activeWindow;
    if (win && win.activePage) {
      const off = win.activePage.documentOffset;
      if (Number.isInteger(off)) return off;
    }
  } catch (e) { /* ignore */ }
  try {
    const sp = doc.layoutWindows && doc.layoutWindows.length ? doc.layoutWindows[0] : null;
    if (sp && sp.activePage) return sp.activePage.documentOffset;
  } catch (e) { /* ignore */ }
  return null;
}

function logoPageIndex(it) {
  if (!it || it.missing) return null;
  if (it.metrics && Number.isInteger(it.metrics.pageIndex)) return it.metrics.pageIndex;
  return null;
}

function filterItemsByPage(items, filter) {
  if (!Number.isInteger(filter)) return items;
  return items.filter(it => logoPageIndex(it) === filter);
}

function logoPageName(it) {
  if (it && it.metrics && typeof it.metrics.pageName === "string") return it.metrics.pageName;
  const idx = logoPageIndex(it);
  return idx == null ? "" : String(idx + 1);
}

function renderPageFilter(items, activeIdx) {
  const el = $("#pageFilter");
  if (!el) return;
  const pageMap = new Map(); // pageIdx → { name, count }
  items.forEach(it => {
    const p = logoPageIndex(it);
    if (p == null) return;
    const cur = pageMap.get(p) || { name: logoPageName(it), count: 0 };
    cur.count += 1;
    pageMap.set(p, cur);
  });
  const pages = [...pageMap.keys()].sort((a, b) => a - b);

  const btns = pages.map(p => {
    const info = pageMap.get(p);
    const cls = [
      "pf-btn",
      pageFilter === p ? "is-active" : "",
      activeIdx === p ? "is-current" : ""
    ].filter(Boolean).join(" ");
    return `<button class="${cls}" data-pf="${p}">Page ${escapeHtml(info.name)} (${info.count})</button>`;
  });
  el.innerHTML = btns.join("");
}

function renderItemSafe(it, list, unit) {
  try {
    renderOneLogoItem(it, list, unit);
  } catch (e) {
    console.error("[BannerHelper] render item err", it && it.idx, e);
    const row = document.createElement("div");
    row.className = "logo-item";
    row.innerHTML = `
      <input type="text" class="logo-name-input" data-name-idx="${it.idx}" value="${escapeHtml(it.logo ? it.logo.label : '')}" />
      <div class="logo-warn">⚠ Render error — ${escapeHtml(String(e.message || e))}</div>
      <div class="logo-actions">
        <button data-act="remove" data-idx="${it.idx}">Remove</button>
      </div>`;
    list.appendChild(row);
  }
}

function renderLogos() {
  const doc = app.activeDocument;
  const list = $("#logoList");
  list.innerHTML = "";

  if (!doc) {
    list.innerHTML = '<div class="empty">Open a document first</div>';
    $("#pageFilter").innerHTML = "";
    updateTotals(null, []);
    return;
  }
  if (logos.length === 0) {
    list.innerHTML = '<div class="empty">Select a frame in InDesign then click "Add"</div>';
    $("#pageFilter").innerHTML = "";
    updateTotals(doc, []);
    renderReportStatus();
    renderDocNameStatus();
    return;
  }

  const unit = resolveDisplayUnit(doc);
  const items = [];

  // First pass: compute both FULL frame and VISIBLE (clipped) squares per logo.
  // % and totals use FULL (matches the reference spreadsheet).
  withPtUnits(doc, () => {
    logos.forEach((logo, idx) => {
      const item = findPageItemById(logo.itemId);
      if (!item) { items.push({ logo, idx, missing: true }); return; }
      let m;
      try {
        m = computeLogoMetrics(doc, item);
      } catch (e) {
        console.error("[BannerHelper] metrics err", logo.itemId, e);
        items.push({ logo, idx, missing: true });
        return;
      }
      const client = getClientForLogo(logo);
      const ratio = client ? client.ratio : 1;
      const wFull = ptToUnit(m.frameW, unit);
      const hFull = ptToUnit(m.frameH, unit);
      const wVis  = ptToUnit(m.visibleW, unit);
      const hVis  = ptToUnit(m.visibleH, unit);
      const squareFull = wFull * hFull * ratio;
      const squareVis  = wVis * hVis * ratio;
      items.push({ logo, idx, item, metrics: m, client, wFull, hFull, wVis, hVis, squareFull, squareVis });
    });
  });

  const totalFull = items.reduce((s, it) => s + (it.squareFull || 0), 0);
  const totalVis  = items.reduce((s, it) => s + (it.squareVis || 0), 0);

  // Per-page balancer: each page's logos sum to exactly 100%. The logo
  // flagged with isBalancer absorbs the rounding residual; fallback is the
  // last logo on that page (matches the spreadsheet "=100-SUM(...)" cell).
  const pageGroups = new Map();
  items.forEach(it => {
    if (it.missing || !it.metrics) return;
    const p = it.metrics.pageIndex;
    if (!pageGroups.has(p)) pageGroups.set(p, []);
    pageGroups.get(p).push(it);
  });
  pageGroups.forEach(group => {
    const bIdx = group.findIndex(it => it.logo && it.logo.isBalancer);
    const pctsFull = balancePercents(group.map(it => it.squareFull || 0), bIdx);
    const pctsVis  = balancePercents(group.map(it => it.squareVis  || 0), bIdx);
    group.forEach((it, i) => {
      it.pctFull = pctsFull[i];
      it.pctVis  = pctsVis[i];
    });
  });

  // ----- Page filter -----
  const activeIdx = getActivePageIndex(doc);

  // Available pages with logos
  const availablePages = [...new Set(items.map(logoPageIndex).filter(p => p != null))].sort((a, b) => a - b);
  // Keep current filter if still valid. Otherwise pick InDesign's active
  // page if it has logos, else the first available page.
  if (!availablePages.includes(pageFilter)) {
    if (Number.isInteger(activeIdx) && availablePages.includes(activeIdx)) {
      pageFilter = activeIdx;
    } else if (availablePages.length > 0) {
      pageFilter = availablePages[0];
    }
  }

  renderPageFilter(items, activeIdx);

  const visibleItems = filterItemsByPage(items, pageFilter);

  if (visibleItems.length === 0) {
    list.innerHTML = '<div class="empty">No logos on this page</div>';
    updateTotals(doc, items, totalFull, totalVis);
    renderReportStatus();
    renderDocNameStatus();
    updateReport();
    return;
  }

  visibleItems.forEach(it => renderItemSafe(it, list, unit));

  updateTotals(doc, items, totalFull, totalVis);
  renderReportStatus();
  renderDocNameStatus();
  updateReport();
}

function renderOneLogoItem(it, list, unit) {
    const row = document.createElement("div");
    row.className = compactView ? "logo-item is-compact" : "logo-item";

    if (it.missing) {
      row.innerHTML = `
        <input type="text" class="logo-name-input" data-name-idx="${it.idx}" value="${escapeHtml(it.logo.label)}" />
        <div class="logo-warn">⚠ Frame not found (deleted?)</div>
        <div class="logo-actions">
          <button data-act="remove" data-idx="${it.idx}">Remove</button>
        </div>`;
      list.appendChild(row);
      return;
    }

    const m = it.metrics;

    // Dimensions: full precision, no rounding
    const wFullStr = formatDim(it.wFull);
    const hFullStr = formatDim(it.hFull);
    const wVisStr  = formatDim(it.wVis);
    const hVisStr  = formatDim(it.hVis);

    // Squares: AREA_DECIMALS. % is per-page balanced to sum 100, PCT_DECIMALS.
    const sqFullStr = formatNumber(it.squareFull, AREA_DECIMALS);
    const sqVisStr  = formatNumber(it.squareVis, AREA_DECIMALS);
    const pctFullStr = formatNumber(it.pctFull || 0, PCT_DECIMALS);
    const pctVisStr  = formatNumber(it.pctVis  || 0, PCT_DECIMALS);

    const clientOptions = settings.clients.map(c =>
      `<option value="${escapeHtml(c.id)}"${c.id === it.logo.clientId ? " selected" : ""}>${clientOptionLabel(c)}</option>`
    ).join("");

    const isBalancer = !!(it.logo && it.logo.isBalancer);
    const balancerChecked = isBalancer ? " checked" : "";
    const balancerActive = isBalancer ? " is-active" : "";
    const balancerTitle = "Absorbs rounding residual so page % sums to 100";

    const visibleBlock = m.clipped
      ? `<div class="logo-row-sub">
           <span class="logo-tag">Visible:</span> ${wVisStr} × ${hVisStr} ${unit}
           · Square <strong>${sqVisStr}</strong> · <strong>${pctVisStr}%</strong>
         </div>`
      : "";

    let itemName = "";
    let itemPath = "";
    try { itemName = getItemDisplayName(it.item); } catch (e) { console.error("[BannerHelper] displayName err", e); }
    try { itemPath = getItemPath(it.item); } catch (e) { console.error("[BannerHelper] path err", e); }

    if (compactView) {
      row.innerHTML = `
        <input type="text" class="logo-name-input" data-name-idx="${it.idx}" value="${escapeHtml(it.logo.label)}" />
        <div class="logo-compact-row">
          <select class="logo-client compact" data-idx="${it.idx}">${clientOptions}</select>
          <span class="logo-compact-metric"><strong>${sqFullStr}</strong> · <strong>${pctFullStr}%</strong></span>
          <label class="logo-balancer${balancerActive}" title="${balancerTitle}">
            <input type="checkbox" data-act="balancer" data-idx="${it.idx}"${balancerChecked} />
            <span>⚖</span>
          </label>
          <div class="logo-actions compact">
            <button data-act="up"     data-idx="${it.idx}" title="Move up">↑</button>
            <button data-act="down"   data-idx="${it.idx}" title="Move down">↓</button>
            <button data-act="select" data-idx="${it.idx}" title="Select in doc">⌖</button>
            <button data-act="remove" data-idx="${it.idx}" title="Remove">✕</button>
          </div>
        </div>`;
    } else {
      row.innerHTML = `
        <input type="text" class="logo-name-input" data-name-idx="${it.idx}" value="${escapeHtml(it.logo.label)}" />
        <div class="logo-frame-info">
          <div class="logo-frame-name">${escapeHtml(itemName)}</div>
          <div class="logo-frame-path">${escapeHtml(itemPath)}</div>
        </div>
        <div class="logo-client-row">
          <span class="logo-client-label">Client:</span>
          <select class="logo-client" data-idx="${it.idx}">${clientOptions}</select>
        </div>
        <div class="logo-meta">Page ${m.pageIndex + 1}${m.clipped ? ' <span class="logo-warn">(clipped)</span>' : ""}</div>
        <div class="logo-row-main">
          <span class="logo-tag">Full:</span> ${wFullStr} × ${hFullStr} ${unit}
          · Square <strong>${sqFullStr}</strong> · <strong>${pctFullStr}%</strong>
        </div>
        <label class="logo-balancer${balancerActive}" title="${balancerTitle}">
          <input type="checkbox" data-act="balancer" data-idx="${it.idx}"${balancerChecked} />
          <span>Balancer ⚖ — absorbs rounding residual</span>
        </label>
        ${visibleBlock}
        <div class="logo-actions">
          <button data-act="up"     data-idx="${it.idx}" title="Move up">↑</button>
          <button data-act="down"   data-idx="${it.idx}" title="Move down">↓</button>
          <button data-act="select" data-idx="${it.idx}">Select</button>
          <button data-act="remove" data-idx="${it.idx}">Remove</button>
        </div>`;
    }
    list.appendChild(row);
}

// Swap a logo with its neighbor that's on the same page.
function moveLogo(idx, dir) {
  const cur = logos[idx];
  if (!cur) return;
  const curItem = findPageItemById(cur.itemId);
  let curPage = null;
  try { curPage = curItem && curItem.parentPage && curItem.parentPage.documentOffset; } catch (e) {}
  const step = dir === "up" ? -1 : 1;
  let t = idx + step;
  while (t >= 0 && t < logos.length) {
    const other = logos[t];
    const oi = findPageItemById(other.itemId);
    let op = null;
    try { op = oi && oi.parentPage && oi.parentPage.documentOffset; } catch (e) {}
    if (op === curPage) break;
    t += step;
  }
  if (t < 0 || t >= logos.length) return;
  [logos[idx], logos[t]] = [logos[t], logos[idx]];
  saveLogos();
  lastReportText = {};
  renderLogos();
}

function updateTotals(doc, items, totalFull, totalVis) {
  const count = items ? items.filter(i => !i.missing).length : 0;
  $("#totalCount").textContent = count;
  if (!doc || count === 0) {
    $("#totalArea").textContent = "—";
    return;
  }
  const unit = resolveDisplayUnit(doc);
  const anyClipped = items.some(i => !i.missing && i.metrics && i.metrics.clipped);
  const fullStr = `${formatNumber(totalFull, AREA_DECIMALS)} ${unit}²`;
  if (anyClipped) {
    const visStr = `${formatNumber(totalVis, AREA_DECIMALS)} ${unit}²`;
    $("#totalArea").innerHTML = `Full <strong>${fullStr}</strong> · Visible <strong>${visStr}</strong>`;
  } else {
    $("#totalArea").textContent = fullStr;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ============ ACTIONS ============ */
async function addLogoFromSelection() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const sel = app.selection;
  if (!sel || sel.length === 0) { flashStatus("Select a frame first", true); return; }

  const item = sel[0];
  if (!item.id) { flashStatus("Unsupported selection", true); return; }

  const itemCn = getItemConstructor(item);
  if (/^(Guide|Ruler|PageItemPref|Page$|Spread$|Document$)/i.test(itemCn)) {
    flashStatus(`Select a frame, not ${itemCn}`, true);
    return;
  }

  if (logos.some(l => l.itemId === item.id)) {
    flashStatus("Already added", true); return;
  }

  const defaultLabel = getItemDefaultLabel(item) || `Logo ${logos.length + 1}`;
  const result = await promptAddLogo(defaultLabel, item);
  if (!result) return;

  logos.push({
    id: Date.now(),
    label: result.label || `Logo ${logos.length + 1}`,
    itemId: item.id,
    clientId: result.clientId
  });
  saveLogos();
  renderLogos();
  flashStatus("Added");
}

function setLogoClient(idx, clientId) {
  if (!logos[idx]) return;
  logos[idx].clientId = clientId;
  saveLogos();
  renderLogos();
}

// Per-page balancer: at most one flagged logo per page; tick clears siblings.
function toggleLogoBalancer(idx, checked) {
  const logo = logos[idx];
  if (!logo) return;
  const pageOf = (l) => {
    try {
      const it = findPageItemById(l.itemId);
      return it && it.parentPage ? it.parentPage.documentOffset : null;
    } catch (e) { return null; }
  };
  if (checked) {
    const targetPage = pageOf(logo);
    logos.forEach((l, i) => {
      if (i === idx) { l.isBalancer = true; return; }
      if (pageOf(l) === targetPage) l.isBalancer = false;
    });
  } else {
    logo.isBalancer = false;
  }
  saveLogos();
  lastReportText = {};
  renderLogos();
  updateReport();
}

function removeLogo(idx) {
  logos.splice(idx, 1);
  saveLogos();
  renderLogos();
}

function setLogoLabel(idx, label) {
  const cur = logos[idx];
  if (!cur) return;
  const trimmed = (label || "").trim();
  if (!trimmed || trimmed === cur.label) return;
  console.log("[BannerHelper][dbg] setLogoLabel idx=", idx, "old=", cur.label, "new=", trimmed, "activeDoc=", app.activeDocument && app.activeDocument.name);
  cur.label = trimmed;
  saveLogos();
  // Don't re-render the list (would steal focus from the input the user is
  // typing in). Label isn't in buildSignature so auto-poll won't pick it up —
  // push the rename to the linked report frame manually.
  try { updateReport(); } catch (e) { /* ignore */ }
}

function flushLogoNameInputs() {
  const list = document.querySelectorAll("#logoList input.logo-name-input");
  list.forEach(inp => {
    const idx = parseInt(inp.dataset.nameIdx, 10);
    if (!Number.isNaN(idx)) setLogoLabel(idx, inp.value);
  });
}

function selectItem(item) {
  if (!item) return;
  try { app.select(item); } catch (e) {}
  // Force Layers panel to reveal the item's layer
  try {
    const lyr = item.itemLayer;
    if (lyr && app.activeWindow) app.activeWindow.activeLayer = lyr;
  } catch (e) {}
}

function selectLogoInDoc(idx) {
  const logo = logos[idx];
  const item = findPageItemById(logo.itemId);
  if (item) {
    selectItem(item);
    flashStatus(`Selected "${logo.label}"`);
  } else {
    flashStatus("Frame not found", true);
  }
}

/* ============ REPORT FRAME ============ */
function isReportLabel(lbl) {
  return typeof lbl === "string" && (lbl === REPORT_LABEL || lbl.indexOf(REPORT_LABEL_PAGE_PREFIX) === 0);
}

function parseReportLabel(lbl) {
  if (lbl === REPORT_LABEL) return { all: true, pageIdx: null };
  if (typeof lbl === "string" && lbl.indexOf(REPORT_LABEL_PAGE_PREFIX) === 0) {
    const n = parseInt(lbl.slice(REPORT_LABEL_PAGE_PREFIX.length), 10);
    if (Number.isInteger(n)) return { all: false, pageIdx: n };
  }
  return null;
}

function framePageIndex(frame) {
  try {
    const p = frame.parentPage;
    if (p && Number.isInteger(p.documentOffset)) return p.documentOffset;
  } catch (e) { /* ignore */ }
  return null;
}

// Returns all report frames in doc: [{ frame, info }]
function findAllReportFrames(doc) {
  if (!doc) return [];
  const out = [];
  const seen = new Set();
  const push = (item) => {
    try {
      const lbl = item.label;
      if (!isReportLabel(lbl)) return;
      const id = item.id;
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ frame: item, info: parseReportLabel(lbl) });
    } catch (e) { /* ignore */ }
  };
  try {
    const frames = doc.textFrames;
    if (frames && frames.length) {
      for (let i = 0; i < frames.length; i++) {
        try { push(frames[i]); } catch (e) {}
      }
    }
  } catch (e) { /* ignore */ }
  try {
    const all = doc.allPageItems;
    if (all && all.length) {
      for (let i = 0; i < all.length; i++) {
        try { push(all[i]); } catch (e) {}
      }
    }
  } catch (e) { /* ignore */ }
  return out;
}


function setReportFrameFromSelection() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const sel = app.selection;
  if (!sel || sel.length === 0) { flashStatus("Select a text frame first", true); return; }
  const item = sel[0];
  const cn = getItemConstructor(item);
  if (!/TextFrame/i.test(cn)) {
    flashStatus(`Select a text frame, not ${cn}`, true);
    return;
  }
  // Label by frame's page: per-page frames report only that page,
  // pasteboard frames (no parentPage) fall back to doc total.
  const pIdx = framePageIndex(item);
  const newLabel = (pIdx == null) ? REPORT_LABEL : (REPORT_LABEL_PAGE_PREFIX + pIdx);
  // Unlink any existing frame that would collide with this label
  findAllReportFrames(doc).forEach(rf => {
    try {
      let sameItem = false;
      try { sameItem = rf.frame.id === item.id; } catch (e) {}
      if (!sameItem && rf.frame.label === newLabel) rf.frame.label = "";
    } catch (e) { /* ignore */ }
  });
  try { item.label = newLabel; } catch (e) { /* ignore */ }
  let pName = "";
  try { pName = item.parentPage && item.parentPage.name; } catch (e) {}
  flashStatus(pIdx == null ? "Linked (doc total)" : `Linked (page ${pName || (pIdx + 1)})`);
  lastReportText = {};
  updateReport();
  renderReportStatus();
}

async function unlinkReportFrame() {
  const doc = app.activeDocument;
  if (!doc) return;
  // Prefer unlinking the report frame on the active page; else any
  const activeIdx = getActivePageIndex(doc);
  const all = findAllReportFrames(doc);
  let target = null;
  if (Number.isInteger(activeIdx)) {
    target = all.find(r => r.info && r.info.pageIdx === activeIdx);
  }
  if (!target) target = all[0];
  if (!target) return;
  const ok = await confirmDialog("Unlink report frame? You'll need to re-select it to link again.");
  if (!ok) return;
  try { target.frame.label = ""; } catch (e) { /* ignore */ }
  flashStatus("Report frame unlinked");
  lastReportText = {};
  renderReportStatus();
}

const DOC_NAME_LABEL = "docNameFrame";

function findDocNameFrame(doc) {
  try {
    const tfs = doc.textFrames;
    for (let i = 0; i < tfs.length; i++) {
      try { if (tfs[i].label === DOC_NAME_LABEL) return tfs[i]; } catch (e) {}
    }
  } catch (e) {}
  try {
    const all = doc.allPageItems;
    for (let i = 0; i < all.length; i++) {
      try {
        if (/TextFrame/i.test(getItemConstructor(all[i])) && all[i].label === DOC_NAME_LABEL) return all[i];
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

function insertDocNameToFrame() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const baseName = (doc.name || "")
    .replace(/\.indd$/i, "")
    .replace(/_pilot.*$/i, "");
  if (!baseName) { flashStatus("Document has no name yet", true); return; }

  let target = findDocNameFrame(doc);
  if (!target) {
    const sel = app.selection;
    if (!sel || sel.length === 0 || !/TextFrame/i.test(getItemConstructor(sel[0]))) {
      flashStatus("Select a text frame once to link it", true);
      return;
    }
    target = sel[0];
    try { target.label = DOC_NAME_LABEL; } catch (e) {}
  }

  try {
    target.parentStory.contents = baseName;
    flashStatus("Updated: " + baseName);
  } catch (e) {
    flashStatus("Update failed: " + (e.message || e), true);
  }
  renderDocNameStatus();
}

async function unlinkDocNameFrame() {
  const doc = app.activeDocument;
  if (!doc) return;
  const target = findDocNameFrame(doc);
  if (!target) return;
  const ok = await confirmDialog("Unlink doc name frame? You'll need to re-select it to link again.");
  if (!ok) return;
  try { target.label = ""; } catch (e) {}
  flashStatus("Doc name frame unlinked");
  renderDocNameStatus();
}

function renderDocNameStatus() {
  const el = $("#docNameStatus");
  const insertBtn = $("#btnInsertDocName");
  const unlinkBtn = $("#btnUnlinkDocName");
  if (!el) return;
  let doc = null;
  try { doc = app.activeDocument; } catch (e) {}
  if (!doc) {
    el.textContent = "No document open";
    if (insertBtn) insertBtn.textContent = "Link & insert";
    if (unlinkBtn) unlinkBtn.disabled = true;
    return;
  }
  const frame = findDocNameFrame(doc);
  if (!frame) {
    el.textContent = "Not linked";
    if (insertBtn) insertBtn.textContent = "Link & insert";
    if (unlinkBtn) unlinkBtn.disabled = true;
    return;
  }
  let pageName = "";
  try { pageName = frame.parentPage && frame.parentPage.name; } catch (e) {}
  el.textContent = pageName ? ("Linked (page " + pageName + ")") : "Linked";
  if (insertBtn) insertBtn.textContent = "Update";
  if (unlinkBtn) unlinkBtn.disabled = false;
}

// Build structured report data. pageIdx=null → whole doc. Integer → only logos on that page.
// Returns { header, summary, rows: [{label, square, pct}] } or null when empty.
function buildReportData(doc, pageIdx) {
  if (!doc || logos.length === 0) return null;
  const unit = resolveDisplayUnit(doc);
  const rows = [];
  let grandTotal = 0;
  let pageName = "";

  withPtUnits(doc, () => {
    logos.forEach(logo => {
      const item = findPageItemById(logo.itemId);
      if (!item) return;
      let m;
      try { m = computeLogoMetrics(doc, item); } catch (e) { return; }
      if (Number.isInteger(pageIdx) && m.pageIndex !== pageIdx) return;
      if (!pageName && m.pageName) pageName = m.pageName;
      const client = getClientForLogo(logo);
      const ratio = client ? client.ratio : 1;
      const wFull = ptToUnit(m.frameW, unit);
      const hFull = ptToUnit(m.frameH, unit);
      const square = wFull * hFull * ratio;
      rows.push({ logo, label: logo.label, square, pageIndex: m.pageIndex });
      grandTotal += square;
    });
  });

  if (rows.length === 0) return null;

  // Per-page balancer so logos on each page sum to exactly 100%.
  const pageMap = new Map();
  rows.forEach((r, i) => {
    if (!pageMap.has(r.pageIndex)) pageMap.set(r.pageIndex, []);
    pageMap.get(r.pageIndex).push(i);
  });
  const pctByRow = new Array(rows.length).fill(0);
  pageMap.forEach(indices => {
    const group = indices.map(i => rows[i]);
    const bIdx = group.findIndex(r => r.logo && r.logo.isBalancer);
    const pcts = balancePercents(group.map(r => r.square), bIdx);
    indices.forEach((ri, gi) => { pctByRow[ri] = pcts[gi]; });
  });

  const title = (settings.reportTitle || "").trim() || DEFAULT_SETTINGS.reportTitle;
  const header = Number.isInteger(pageIdx)
    ? `${title} — Page ${pageName || (pageIdx + 1)}`
    : title;
  const summary = `All = ${formatNumber(grandTotal, AREA_DECIMALS)} sq ${unit}`;

  return {
    header,
    summary,
    rows: rows.map((r, i) => ({
      label: r.label,
      square: formatNumber(r.square, AREA_DECIMALS),
      pct: formatNumber(pctByRow[i], PCT_DECIMALS)
    }))
  };
}

// Character/paragraph properties worth preserving across rebuilds so the
// report keeps the user's font / size / colour / style choices.
const STYLE_PROPS = [
  "appliedParagraphStyle",
  "appliedCharacterStyle",
  "appliedFont",
  "fontStyle",
  "pointSize",
  "leading",
  "tracking",
  "kerningMethod",
  "fillColor",
  "fillTint",
  "strokeColor",
  "justification",
  "capitalization",
  "underline",
  "strikeThru"
];

function snapshotTextStyle(text) {
  const snap = {};
  if (!text) return snap;
  for (const key of STYLE_PROPS) {
    try { snap[key] = text[key]; } catch (e) { /* unavailable — skip */ }
  }
  return snap;
}

function applyTextStyle(text, snap) {
  if (!text || !snap) return;
  for (const key of STYLE_PROPS) {
    if (!(key in snap)) continue;
    try { text[key] = snap[key]; } catch (e) { /* not settable — skip */ }
  }
}

// Snapshot every visible region of the report (title, summary, per-column cell
// style, column widths) so we can rebuild without flattening the user's style.
function snapshotReport(frame) {
  const story = frame.parentStory;
  const snap = { title: null, summary: null, cellsByCol: [null, null, null, null], columnWidths: null };
  try {
    const paras = story.paragraphs;
    if (paras.length > 0) { try { snap.title   = snapshotTextStyle(paras.item(0).texts.item(0)); } catch (e) {} }
    if (paras.length > 1) { try { snap.summary = snapshotTextStyle(paras.item(1).texts.item(0)); } catch (e) {} }
  } catch (e) { /* ignore */ }
  try {
    if (story.tables.length > 0) {
      const tbl = story.tables.item(0);
      const colCount = Math.min(4, tbl.columnCount || 0);
      if (colCount > 0) {
        const widths = [];
        for (let j = 0; j < colCount; j++) {
          try { widths.push(tbl.columns.item(j).width); } catch (e) {}
        }
        if (widths.length === colCount) snap.columnWidths = widths;
      }
      const bodyRows = tbl.bodyRowCount || 0;
      if (bodyRows > 0 && colCount > 0) {
        for (let j = 0; j < colCount; j++) {
          try { snap.cellsByCol[j] = snapshotTextStyle(tbl.rows.item(0).cells.item(j).texts.item(0)); } catch (e) {}
        }
      }
    }
  } catch (e) { /* ignore */ }
  return snap;
}

function setTableGeometry(tbl, cols, rows) {
  try { tbl.properties = { columnCount: cols, bodyRowCount: rows }; return; } catch (e) {}
  try { tbl.columnCount = cols; } catch (e) {}
  try { tbl.bodyRowCount = rows; } catch (e) {}
}

function applyTableColumnWidths(tbl, widths) {
  if (!widths) return;
  for (let j = 0; j < widths.length; j++) {
    try { tbl.columns.item(j).width = widths[j]; } catch (e) {}
  }
}

function applyCellStyles(tbl, cellsByCol, rowCount, colCount) {
  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      if (!cellsByCol[j]) continue;
      let cellText = null;
      try { cellText = tbl.rows.item(i).cells.item(j).texts.item(0); } catch (e) {}
      if (cellText) applyTextStyle(cellText, cellsByCol[j]);
    }
  }
}

// Write header + summary as text, then an auto-generated 4-column table
// (Label | Square | = | Pct%). When there are no logos, the frame shows an
// empty 4×2 table only. Per-region style snapshots (title / summary / each
// column's cell) + column widths are captured before wiping and reapplied
// so the user's formatting survives every refresh.
function writeReportToFrame(frame, data) {
  const story = frame.parentStory;
  const snap = snapshotReport(frame);
  try {
    if (!data) {
      story.contents = "";
      const ip = story.insertionPoints.lastItem();
      const tbl = ip.tables.add();
      setTableGeometry(tbl, 4, 2);
      applyTableColumnWidths(tbl, snap.columnWidths);
      applyCellStyles(tbl, snap.cellsByCol, 2, 4);
      return;
    }

    story.contents = `${data.header}\r${data.summary}\r`;
    // Apply title + summary style per paragraph (each has its own look).
    try {
      const paras = story.paragraphs;
      if (snap.title   && paras.length > 0) applyTextStyle(paras.item(0).texts.item(0), snap.title);
      if (snap.summary && paras.length > 1) applyTextStyle(paras.item(1).texts.item(0), snap.summary);
    } catch (e) {}

    const ip = story.insertionPoints.lastItem();
    const tbl = ip.tables.add();
    setTableGeometry(tbl, 4, data.rows.length);
    applyTableColumnWidths(tbl, snap.columnWidths);

    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i];
      const values = [`${r.label}:`, r.square, "=", `${r.pct}%`];
      for (let j = 0; j < 4; j++) {
        let cell = null;
        try { cell = tbl.rows.item(i).cells.item(j); } catch (e) {}
        if (!cell) continue;
        try { cell.contents = values[j]; }
        catch (e) { try { cell.texts.item(0).contents = values[j]; } catch (e2) {} }
      }
    }
    applyCellStyles(tbl, snap.cellsByCol, data.rows.length, 4);
  } catch (e) {
    log(`[report] write error: ${e.message || e}`, "error");
    throw e;
  }
}

// Per-frame cache by frame id so each frame is compared against its own last text
let lastReportText = {};

function updateReport() {
  const doc = app.activeDocument;
  if (!doc) return;
  const frames = findAllReportFrames(doc);
  if (frames.length === 0) return;
  frames.forEach(rf => {
    let data;
    try { data = buildReportData(doc, rf.info.pageIdx); } catch (e) { console.error("[BannerHelper] report build err", e); return; }
    let fid = null;
    try { fid = rf.frame.id; } catch (e) {}
    const key = String(fid);
    const sig = data ? JSON.stringify(data) : "";
    if (sig === lastReportText[key]) return;
    try {
      writeReportToFrame(rf.frame, data);
      lastReportText[key] = sig;
    } catch (e) { console.error("[BannerHelper] report write err", e); }
  });
}

function renderReportStatus() {
  const el = $("#reportStatus");
  const setBtn = $("#btnSetReport");
  const unlinkBtn = $("#btnUnlinkReport");
  if (!el) return;
  const doc = app.activeDocument;
  const frames = doc ? findAllReportFrames(doc) : [];
  if (frames.length === 0) {
    el.textContent = "Not linked";
    el.classList.remove("is-linked");
    if (setBtn) setBtn.textContent = "Link selected frame";
    if (unlinkBtn) unlinkBtn.disabled = true;
    return;
  }
  const parts = frames.map(rf => {
    if (rf.info.pageIdx == null) return "Total";
    let name = "";
    try {
      const pg = pageAt(doc, rf.info.pageIdx);
      if (pg && pg.name) name = pg.name;
    } catch (e) { /* ignore */ }
    return `Page ${name || (rf.info.pageIdx + 1)}`;
  });
  el.textContent = `Linked: ${parts.join(", ")}`;
  el.classList.add("is-linked");
  if (setBtn) setBtn.textContent = "Replace linked frame";
  if (unlinkBtn) unlinkBtn.disabled = false;
}

async function clearAllLogos() {
  if (logos.length === 0) return;
  const ok = await confirmDialog("Remove all logos from the list?");
  if (!ok) return;
  logos = [];
  saveLogos();
  renderLogos();
}

function exportCsv() {
  const doc = app.activeDocument;
  if (!doc || logos.length === 0) { flashStatus("Nothing to export", true); return; }
  const unit = resolveDisplayUnit(doc);
  const rows = [
    ["Label", "Client", "Ratio", "Page",
     `W_full(${unit})`, `H_full(${unit})`, `Square_full(${unit}²)`, "%_full",
     `W_visible(${unit})`, `H_visible(${unit})`, `Square_visible(${unit}²)`, "%_visible",
     "Clipped"]
  ];

  const computed = [];
  withPtUnits(doc, () => {
    logos.forEach(logo => {
      const item = findPageItemById(logo.itemId);
      if (!item) return;
      const m = computeLogoMetrics(doc, item);
      const client = getClientForLogo(logo);
      const ratio = client ? client.ratio : 1;
      const wFull = ptToUnit(m.frameW, unit);
      const hFull = ptToUnit(m.frameH, unit);
      const wVis  = ptToUnit(m.visibleW, unit);
      const hVis  = ptToUnit(m.visibleH, unit);
      const squareFull = wFull * hFull * ratio;
      const squareVis  = wVis * hVis * ratio;
      computed.push({ logo, m, client, ratio, wFull, hFull, wVis, hVis, squareFull, squareVis });
    });
  });

  const totalFull = computed.reduce((s, c) => s + c.squareFull, 0);
  const totalVis  = computed.reduce((s, c) => s + c.squareVis, 0);

  // Per-page balancer so %_full / %_visible columns sum to 100 per page.
  const byPage = new Map();
  computed.forEach((c, i) => {
    const p = c.m.pageIndex;
    if (!byPage.has(p)) byPage.set(p, []);
    byPage.get(p).push(i);
  });
  byPage.forEach(indices => {
    const group = indices.map(i => computed[i]);
    const bIdx = group.findIndex(c => c.logo && c.logo.isBalancer);
    const pctsF = balancePercents(group.map(c => c.squareFull), bIdx);
    const pctsV = balancePercents(group.map(c => c.squareVis),  bIdx);
    indices.forEach((ci, gi) => {
      computed[ci].pctFull = pctsF[gi];
      computed[ci].pctVis  = pctsV[gi];
    });
  });

  computed.forEach(c => {
    rows.push([
      c.logo.label,
      c.client ? c.client.name : "",
      c.ratio,
      c.m.pageIndex + 1,
      formatDim(c.wFull),
      formatDim(c.hFull),
      formatNumber(c.squareFull, AREA_DECIMALS),
      formatNumber(c.pctFull || 0, PCT_DECIMALS),
      formatDim(c.wVis),
      formatDim(c.hVis),
      formatNumber(c.squareVis, AREA_DECIMALS),
      formatNumber(c.pctVis || 0, PCT_DECIMALS),
      c.m.clipped ? "yes" : "no"
    ]);
  });
  rows.push([]);
  rows.push(["TOTAL", "", "", "", "", "", formatNumber(totalFull, AREA_DECIMALS), "100", "", "", formatNumber(totalVis, AREA_DECIMALS), "100", ""]);

  const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
  navigator.clipboard.writeText(csv).then(
    () => flashStatus("CSV copied to clipboard"),
    () => flashStatus("Copy failed", true)
  );
}
function csvEscape(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ============ SETTINGS UI ============ */
function renderSettingsForm() {
  $("#setUnit").value = settings.unit;
  renderClientsEditor();
}

function renderClientsEditor() {
  const root = $("#clientsEditor");
  root.innerHTML = "";
  settings.clients.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "client-row";
    // type=text + inputmode=decimal to bypass Spectrum number widget's locale handling.
    row.innerHTML = `
      <input type="text" class="client-name" data-client-idx="${i}" data-field="name" value="${escapeHtml(c.name)}" placeholder="Name" />
      <input type="text" inputmode="decimal" class="client-ratio" data-client-idx="${i}" data-field="ratio" value="${c.ratio}" placeholder="Ratio" />
      <button data-client-del="${i}" class="secondary small" title="Delete">✕</button>
    `;
    root.appendChild(row);
  });
}

// Returns true if all client name inputs are unique (case-insensitive).
// Marks offending inputs with `.has-error` and flashes a status message.
function validateClientNamesUnique() {
  const rows = $$('.client-row');
  const inputs = rows.map(r => r.querySelector('[data-field="name"]'));
  inputs.forEach(inp => inp && inp.classList.remove("has-error"));
  const seen = new Map();
  const dupes = new Set();
  inputs.forEach((inp, i) => {
    if (!inp) return;
    const name = (inp.value || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      dupes.add(name);
      inp.classList.add("has-error");
      const first = inputs[seen.get(key)];
      if (first) first.classList.add("has-error");
    } else {
      seen.set(key, i);
    }
  });
  if (dupes.size > 0) {
    flashStatus(`Duplicate client name: ${[...dupes].join(", ")}`, true);
    return false;
  }
  return true;
}

function collectSettingsFromForm() {
  settings.unit = $("#setUnit").value;

  // Read clients back from DOM
  const rows = $$('.client-row');
  const newClients = rows.map(row => {
    const name = row.querySelector('[data-field="name"]').value.trim() || "Unnamed";
    // Normalise locale decimal ("," → ".") so parseFloat doesn't truncate.
    const ratioRaw = String(row.querySelector('[data-field="ratio"]').value).trim().replace(",", ".");
    const ratio = parseFloat(ratioRaw);
    const idx = parseInt(row.querySelector('[data-field="name"]').dataset.clientIdx, 10);
    const existing = settings.clients[idx];
    return {
      id: existing ? existing.id : newClientId(),
      name,
      ratio: isFinite(ratio) ? ratio : 1
    };
  });
  // Enforce unique names (case-insensitive). Append " (N)" to dupes.
  const seen = new Map();
  newClients.forEach(c => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) {
      let n = 2;
      let candidate = `${c.name} (${n})`;
      while (seen.has(candidate.toLowerCase())) { n++; candidate = `${c.name} (${n})`; }
      c.name = candidate;
      seen.set(candidate.toLowerCase(), true);
    } else {
      seen.set(key, true);
    }
  });
  if (newClients.length > 0) settings.clients = newClients;
}

/* ============ LOG PANEL ============ */
const LOG_COLLAPSED_KEY = "bannerHelper.logCollapsed";

function log(message, level) {
  // level: undefined | "error" | "warn" | "success"
  try { console.log(`[BannerHelper] ${message}`); } catch (e) {}
  const box = document.getElementById("logBox");
  if (!box) return;
  const line = document.createElement("div");
  line.textContent = `[${timestamp()}] ${message}`;
  if (level === "error" || /error|failed|invalid/i.test(message)) {
    line.className = "log-error";
    expandLog();
    flashLogHeader();
  } else if (level === "warn" || /warn/i.test(message)) {
    line.className = "log-warn";
  } else if (level === "success" || /relinked|complete|done/i.test(message)) {
    line.className = "log-success";
  }
  box.appendChild(line);
  // Scroll only inside the log box, NOT the whole page. scrollIntoView on a
  // descendant forces every scrolling ancestor (body) to scroll too, which
  // yanks the panel down whenever any status message fires.
  try { box.scrollTop = box.scrollHeight; } catch (e) {}
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function expandLog() {
  const box = document.getElementById("logBox");
  const header = document.querySelector(".log-header");
  if (box) box.classList.remove("collapsed");
  if (header) header.classList.add("is-open");
  try { localStorage.setItem(LOG_COLLAPSED_KEY, "0"); } catch (e) {}
}

function flashLogHeader() {
  const header = document.querySelector(".log-header");
  if (!header) return;
  header.classList.add("log-has-error");
  setTimeout(() => header.classList.remove("log-has-error"), 2000);
}

function wireLog() {
  const box = document.getElementById("logBox");
  const header = document.querySelector(".log-header");
  const toggle = document.getElementById("logToggle");
  const clearBtn = document.getElementById("logClearBtn");
  const copyBtn = document.getElementById("logCopyBtn");
  if (!box || !toggle) return;

  // Restore collapsed state
  try {
    const collapsed = localStorage.getItem(LOG_COLLAPSED_KEY) !== "0";
    if (collapsed) {
      box.classList.add("collapsed");
      if (header) header.classList.remove("is-open");
    } else {
      box.classList.remove("collapsed");
      if (header) header.classList.add("is-open");
    }
  } catch (e) {}

  toggle.addEventListener("click", () => {
    const nowCollapsed = !box.classList.contains("collapsed");
    box.classList.toggle("collapsed", nowCollapsed);
    if (header) header.classList.toggle("is-open", !nowCollapsed);
    try { localStorage.setItem(LOG_COLLAPSED_KEY, nowCollapsed ? "1" : "0"); } catch (e) {}
  });

  if (clearBtn) clearBtn.addEventListener("click", () => {
    box.innerHTML = "";
    log("Cleared.");
  });

  if (copyBtn) copyBtn.addEventListener("click", async () => {
    const text = box.innerText || box.textContent || "";
    const orig = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied!";
    } catch (e) {
      copyBtn.textContent = "Failed";
      log(`Copy failed: ${e && e.message || e}`, "error");
    }
    setTimeout(() => { copyBtn.textContent = orig; }, 1200);
  });
}

/* ============ UTIL ============ */
function flashStatus(msg, isError) {
  log(msg, isError ? "error" : undefined);
  // Floating toast (visible on any tab)
  const prev = document.querySelector(".banner-toast");
  if (prev) prev.remove();
  const toast = document.createElement("div");
  toast.className = "banner-toast" + (isError ? " is-error" : "");
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 2500);
  // Also reflect in settings status line if present
  const el = $("#settingsStatus");
  if (el) {
    el.textContent = msg;
    el.className = "status" + (isError ? " error" : "");
    setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 2500);
  }
}

const DIALOG_BACKDROP_CSS = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:80px;box-sizing:border-box;overflow:auto;";

function openDialog(content) {
  const scroller = document.scrollingElement || document.body;
  if (scroller) scroller.scrollTop = 0;
  const backdrop = document.createElement("div");
  backdrop.style.cssText = DIALOG_BACKDROP_CSS;
  backdrop.appendChild(content);
  document.body.appendChild(backdrop);
  return backdrop;
}

const DIALOG_BOX_CSS = "background:#2b2b2b;padding:14px;border-radius:4px;width:80%;max-width:320px;border:1px solid #555;box-shadow:0 8px 24px rgba(0,0,0,0.5);";
const DIALOG_INPUT_CSS = "width:100%;padding:6px;background:#1e1e1e;border:1px solid #555;color:#e0e0e0;border-radius:3px;font-size:12px;box-sizing:border-box;";
const DIALOG_BTN_PRIMARY = "flex:1;margin-right:6px;padding:6px;background:#1473e6;color:#fff;border:1px solid #1473e6;border-radius:3px;cursor:pointer;font-size:12px;";
const DIALOG_BTN_SECONDARY = "flex:1;padding:6px;background:#3a3a3a;color:#e0e0e0;border:1px solid #555;border-radius:3px;cursor:pointer;font-size:12px;";

async function confirmDialog(message) {
  return new Promise(resolve => {
    const box = document.createElement("div");
    box.style.cssText = DIALOG_BOX_CSS;
    box.innerHTML = `
      <div style="margin-bottom:10px;color:#e0e0e0;font-size:12px;">${escapeHtml(message)}</div>
      <div style="display:flex;">
        <button class="ok" style="${DIALOG_BTN_PRIMARY}">Yes</button>
        <button class="cancel" style="${DIALOG_BTN_SECONDARY}">No</button>
      </div>`;
    const backdrop = openDialog(box);
    const finish = (v) => { document.body.removeChild(backdrop); resolve(v); };
    box.querySelector(".ok").addEventListener("click", () => finish(true));
    box.querySelector(".cancel").addEventListener("click", () => finish(false));
  });
}

async function promptAddLogo(defaultLabel, item) {
  return new Promise(resolve => {
    const opts = settings.clients.map(c =>
      `<option value="${escapeHtml(c.id)}"${c.id === DEFAULT_CLIENT_ID ? " selected" : ""}>${clientOptionLabel(c)}</option>`
    ).join("");
    const itemName = getItemDisplayName(item);
    const itemPath = getItemPath(item);
    const box = document.createElement("div");
    box.style.cssText = DIALOG_BOX_CSS;
    box.innerHTML = `
      <div style="margin-bottom:6px;color:#aaa;font-size:11px;">Frame</div>
      <div style="background:#1e1e1e;border:1px solid #3a3a3a;border-radius:3px;padding:6px 8px;margin-bottom:4px;">
        <div style="color:#fff;font-size:11px;font-weight:600;word-break:break-all;">${escapeHtml(itemName)}</div>
        <div style="color:#888;font-size:10px;margin-top:2px;word-break:break-all;">${escapeHtml(itemPath)}</div>
        <button class="sel" style="margin-top:6px;padding:4px 10px;background:#3a3a3a;color:#e0e0e0;border:1px solid #555;border-radius:3px;cursor:pointer;font-size:10px;">Show in doc</button>
      </div>
      <div style="margin:8px 0 6px;color:#aaa;font-size:11px;">Label</div>
      <input type="text" class="lbl" style="${DIALOG_INPUT_CSS}" value="${escapeHtml(defaultLabel || "")}" />
      <div style="margin:8px 0 6px;color:#aaa;font-size:11px;">Client</div>
      <select class="cli" style="${DIALOG_INPUT_CSS}">${opts}</select>
      <div style="display:flex;margin-top:10px;">
        <button class="ok" style="${DIALOG_BTN_PRIMARY}">Add</button>
        <button class="cancel" style="${DIALOG_BTN_SECONDARY}">Cancel</button>
      </div>`;
    const backdrop = openDialog(box);
    const input = box.querySelector(".lbl");
    const select = box.querySelector(".cli");
    // UXP quirk: programmatic input.focus()/select() does not bind keyboard
    // like a real click — users report typing/delete not registering until
    // they manually click out and back in. Don't auto-focus; let user click.
    const finish = (val) => { document.body.removeChild(backdrop); resolve(val); };
    box.querySelector(".sel").addEventListener("click", () => selectItem(item));
    box.querySelector(".ok").addEventListener("click", () => finish({ label: input.value, clientId: select.value }));
    box.querySelector(".cancel").addEventListener("click", () => finish(null));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish({ label: input.value, clientId: select.value });
      else if (e.key === "Escape") finish(null);
    });
  });
}

/* ============ RELINK ============ */
const RECENT_PAIRS_KEY = "bannerHelper.relink.recentPairs";
const MAX_RECENT = 5;

function getLfs() {
  try { return require("uxp").storage.localFileSystem; }
  catch (e) { return null; }
}

function getLinksArray(doc) {
  const out = [];
  if (!doc) return out;
  try {
    const n = doc.links.length;
    for (let i = 0; i < n; i++) out.push(doc.links.item(i));
  } catch (e) { /* ignore */ }
  return out;
}

// UXP sometimes returns status as numeric enum, sometimes as string.
// Match by multiple signals so we're robust across InDesign versions.
function statusMatches(link, enumKey, keyword) {
  try {
    const s = link.status;
    const LS = indesign.LinkStatus;
    if (LS && LS[enumKey] != null && s === LS[enumKey]) return true;
    const str = (s && s.toString) ? s.toString() : String(s);
    if (new RegExp(keyword, "i").test(str)) return true;
  } catch (e) {}
  return false;
}

function linkStatusLabel(link) {
  if (statusMatches(link, "LINK_MISSING", "missing")) return "missing";
  if (statusMatches(link, "LINK_OUT_OF_DATE", "out.?of.?date")) return "out-of-date";
  if (statusMatches(link, "LINK_EMBEDDED", "embedded")) return "embedded";
  if (statusMatches(link, "NORMAL", "normal")) return "normal";
  try { return String(link.status); } catch (e) {}
  return "unknown";
}

function isMissing(link) {
  return statusMatches(link, "LINK_MISSING", "missing");
}

function isEmbedded(link) {
  return statusMatches(link, "LINK_EMBEDDED", "embedded");
}


async function folderToFileMap(folder, recursive) {
  const map = new Map();
  const baseMap = new Map(); // basename (no ext) → File (fallback)
  async function walk(f) {
    let entries;
    try { entries = await f.getEntries(); } catch (e) { return; }
    for (const e of entries) {
      if (e.isFile) {
        const key = e.name.toLowerCase();
        if (!map.has(key)) map.set(key, e);
        const base = key.replace(/\.[^.]+$/, "");
        if (!baseMap.has(base)) baseMap.set(base, e);
      } else if (e.isFolder && recursive) {
        await walk(e);
      }
    }
  }
  await walk(folder);
  return { map, baseMap };
}

function renderLinkList(links, emptyMsg) {
  const el = $("#missingList");
  if (!el) return;
  if (!links.length) {
    el.innerHTML = `<div class="empty" style="padding:8px;">${escapeHtml(emptyMsg || "No links")}</div>`;
    return;
  }
  el.innerHTML = links.map(l => {
    const name = escapeHtml(l.name || "(unnamed)");
    const rawPath = l.filePath || "";
    const path = escapeHtml(rawPath);
    const label = linkStatusLabel(l);
    const cls = "rl-badge rl-" + label.replace(/[^a-z]/gi, "");
    const pathAttr = rawPath ? ` data-copy-path="${path}" title="Click to copy path"` : "";
    return `<div class="relink-item">
      <div class="rl-head"><span class="rl-name">${name}</span><span class="${cls}">${escapeHtml(label)}</span></div>
      <div class="rl-path"${pathAttr}>${path}${rawPath ? ' <span class="rl-copy-hint">copy</span>' : ""}</div>
    </div>`;
  }).join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function scanMissing(silent) {
  const doc = app.activeDocument;
  if (!doc) { if (!silent) flashStatus("No document open", true); return; }
  const all = getLinksArray(doc);
  if (!silent) {
    log(`Scanning ${all.length} link(s)…`);
    all.forEach(l => {
      const st = (() => { try { return String(l.status); } catch (e) { return "?"; } })();
      log(`  · ${l.name || "(unnamed)"} → ${linkStatusLabel(l)} [${st}]`);
    });
  }
  const links = all.filter(isMissing);
  renderLinkList(links, "No missing links");
  if (!silent) flashStatus(`${links.length} missing / ${all.length} total`);
}

function scanAll() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const all = getLinksArray(doc);
  log(`Scanning all ${all.length} link(s)…`);
  const counts = { missing: 0, "out-of-date": 0, embedded: 0, normal: 0, other: 0 };
  all.forEach(l => {
    const lbl = linkStatusLabel(l);
    if (counts[lbl] != null) counts[lbl]++; else counts.other++;
    const st = (() => { try { return String(l.status); } catch (e) { return "?"; } })();
    log(`  · ${l.name || "(unnamed)"} → ${lbl} [${st}]`);
  });
  renderLinkList(all, "No links in document");
  const parts = [];
  if (counts.missing) parts.push(`${counts.missing} missing`);
  if (counts["out-of-date"]) parts.push(`${counts["out-of-date"]} out-of-date`);
  if (counts.embedded) parts.push(`${counts.embedded} embedded`);
  if (counts.normal) parts.push(`${counts.normal} normal`);
  flashStatus(`${all.length} total${parts.length ? ` · ${parts.join(", ")}` : ""}`);
}

async function relinkFromFolder() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const lfs = getLfs();
  if (!lfs) { flashStatus("File system unavailable", true); return; }

  let folder;
  try { folder = await lfs.getFolder(); }
  catch (e) { return; /* user cancelled */ }
  if (!folder) return;

  const recursive = $("#optRecursive").checked;
  flashStatus("Scanning folder…");
  const { map, baseMap } = await folderToFileMap(folder, recursive);

  const missing = getLinksArray(doc).filter(isMissing);
  let ok = 0, notFound = 0, failed = 0;
  for (const link of missing) {
    const name = (link.name || "").toLowerCase();
    let entry = map.get(name);
    if (!entry) {
      const base = name.replace(/\.[^.]+$/, "");
      entry = baseMap.get(base);
    }
    if (!entry) { notFound++; log(`  · not found: ${link.name}`, "warn"); continue; }
    const nativePath = entry.nativePath;
    const result = await tryRelink(link, nativePath);
    if (result.ok) {
      ok++;
      log(`  · relinked: ${link.name}`, "success");
    } else {
      failed++;
    }
  }
  flashStatus(`Relinked ${ok}/${missing.length}${notFound ? ` · ${notFound} not found` : ""}${failed ? ` · ${failed} failed` : ""}`, notFound + failed > 0);
  scanMissing(true);
}

// Build a `file://` URI from a native path, properly encoded.
// InDesign UXP expects a valid URI, not a raw path. Spaces / non-ASCII must be encoded.
function pathToFileUri(path) {
  if (!path) return path;
  if (/^file:\/\//i.test(path)) return path; // already a URI
  // Ensure leading slash (mac/linux absolute); on Windows we'd need `file:///C:/...`
  const withSlash = path.startsWith("/") ? path : "/" + path;
  return "file://" + encodeURI(withSlash);
}

// Try to get a UXP File entry (only works if the file exists on disk).
async function tryGetEntry(path) {
  const lfs = getLfs();
  if (!lfs) return null;
  try { return await lfs.getEntryWithUrl("file:" + path); }
  catch (e) { return null; }
}

// Attempt relink with multiple strategies. Returns true if any succeeded.
// Logs which strategy worked so we know what InDesign accepts.
let _relinkViaLogged = null;
async function tryRelink(link, path) {
  let lastErr = null;
  // Strategy 1: UXP entry (best if file exists)
  const entry = await tryGetEntry(path);
  if (entry) {
    try {
      link.relink(entry);
      try { link.update(); } catch (e) {}
      if (_relinkViaLogged !== "entry") { log("Relink via: UXP entry"); _relinkViaLogged = "entry"; }
      return { ok: true, via: "entry" };
    } catch (e) { lastErr = e; }
  }

  // Strategy 2: ExtendScript File() (not available in newer UXP)
  try {
    const f = File(path);
    link.relink(f);
    try { link.update(); } catch (e) {}
    if (_relinkViaLogged !== "File") { log("Relink via: File(path)"); _relinkViaLogged = "File"; }
    return { ok: true, via: "File" };
  } catch (e) { lastErr = e; }

  // Strategy 3: file:// URI string (works for non-existent paths too)
  const uri = pathToFileUri(path);
  try {
    link.relink(uri);
    try { link.update(); } catch (e) {}
    if (_relinkViaLogged !== "uri") { log(`Relink via: file:// URI (${uri.slice(0, 60)}…)`); _relinkViaLogged = "uri"; }
    return { ok: true, via: "uri" };
  } catch (e) { lastErr = e; }

  // Strategy 4: raw native string (last resort)
  try {
    link.relink(path);
    try { link.update(); } catch (e) {}
    if (_relinkViaLogged !== "string") { log("Relink via: raw string"); _relinkViaLogged = "string"; }
    return { ok: true, via: "string" };
  } catch (e) { lastErr = e; }

  return { ok: false, error: lastErr && (lastErr.message || String(lastErr)) };
}

/* ---- Path find & replace ---- */
function loadRecentPairs() {
  try {
    const raw = localStorage.getItem(RECENT_PAIRS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveRecentPair(pair) {
  let arr = loadRecentPairs();
  arr = arr.filter(p => !(p.pattern === pair.pattern && p.replace === pair.replace && p.flags === pair.flags));
  arr.unshift(pair);
  if (arr.length > MAX_RECENT) arr = arr.slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(arr)); } catch (e) {}
  renderRecentPairs();
}
function renderRecentPairs() {
  const sel = $("#recentPairs");
  if (!sel) return;
  const arr = loadRecentPairs();
  sel.innerHTML = `<option value="">—</option>` + arr.map((p, i) =>
    `<option value="${i}">${escapeHtml(truncate(p.pattern, 24))} → ${escapeHtml(truncate(p.replace, 24))}</option>`
  ).join("");
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

function getScope() {
  const el = document.querySelector('input[name="relinkScope"]:checked');
  return el ? el.value : "all";
}

function buildRegexFromUI() {
  const pattern = $("#rePattern").value;
  if (!pattern) return null;
  // Flags are no longer user-toggleable — always case-insensitive + global
  // so users don't get tripped up by /Users vs /users or partial replacements.
  const flags = "gi";
  try { return { re: new RegExp(pattern, flags), pattern, flags }; }
  catch (e) { return { error: e.message || String(e) }; }
}

async function applyRewrite() {
  const doc = app.activeDocument;
  if (!doc) { flashStatus("No document open", true); return; }
  const built = buildRegexFromUI();
  if (!built) { flashStatus("Enter a pattern", true); return; }
  if (built.error) { flashStatus(`Invalid regex: ${built.error}`, true); return; }

  const replacement = $("#reReplace").value;
  const scope = getScope();
  const links = getLinksArray(doc).filter(l => {
    if (isEmbedded(l)) return false;
    if (scope === "missing") return isMissing(l);
    return true;
  });

  // Build rewrite plan — no pre-existence check (UXP `request` perms block it);
  // trust InDesign's link.status AFTER relink to tell us if the file was found.
  const plan = [];
  for (const link of links) {
    const oldPath = link.filePath || "";
    if (!oldPath) continue;
    const newPath = oldPath.replace(built.re, replacement);
    if (newPath === oldPath) continue;
    plan.push({ link, name: link.name || "", oldPath, newPath });
  }

  if (!plan.length) { flashStatus("No paths matched", true); log("No matching paths to relink", "warn"); return; }

  log(`Applying ${plan.length} relink${plan.length > 1 ? "s" : ""}…`);
  let ok = 0, missing = 0, failed = 0;
  for (const r of plan) {
    const result = await tryRelink(r.link, r.newPath);
    if (!result.ok) {
      failed++;
      log(`  ✗ ${r.name}: ${result.error || "unknown error"}`, "error");
      continue;
    }
    // After relink, InDesign updates link.status — missing vs normal is ground truth
    if (isMissing(r.link)) {
      missing++;
      log(`  ⚠ ${r.name} → ${r.newPath} (still missing — file not found at target)`, "warn");
    } else {
      ok++;
      log(`  ✓ ${r.name} → ${r.newPath}`, "success");
    }
  }

  if (built && !built.error) {
    saveRecentPair({ pattern: built.pattern, replace: $("#reReplace").value, flags: built.flags });
  }
  const summary = `Done: ${ok} relinked${missing ? ` · ${missing} now missing` : ""}${failed ? ` · ${failed} failed` : ""}`;
  flashStatus(summary, missing + failed > 0);
  scanMissing(true);
}

function wireRelink() {
  const scanBtn = $("#btnScanMissing");
  if (!scanBtn) return; // tab not present
  scanBtn.addEventListener("click", () => scanMissing());
  const scanAllBtn = $("#btnScanAll");
  if (scanAllBtn) scanAllBtn.addEventListener("click", scanAll);
  $("#btnRelinkFolder").addEventListener("click", relinkFromFolder);

  // Click-to-copy on the file path. Event delegation on the list container
  // so it keeps working after re-renders.
  const list = $("#missingList");
  if (list) {
    list.addEventListener("click", async (e) => {
      const pathEl = e.target.closest("[data-copy-path]");
      if (!pathEl) return;
      const path = pathEl.getAttribute("data-copy-path");
      if (!path) return;
      try {
        await navigator.clipboard.writeText(path);
        flashStatus("Path copied");
      } catch (err) {
        flashStatus("Copy failed: " + (err.message || err), true);
      }
    });
  }
  $("#btnApplyRewrite").addEventListener("click", applyRewrite);

  $("#recentPairs").addEventListener("change", (e) => {
    const idx = parseInt(e.target.value, 10);
    const arr = loadRecentPairs();
    const p = arr[idx];
    if (!p) return;
    $("#rePattern").value = p.pattern;
    $("#reReplace").value = p.replace;
    invalidate();
  });

  renderRecentPairs();
}

/* ============ WIRING ============ */
// Tabs are <div role="button"> (Spectrum styles native <button> with high
// specificity that defeats stylesheet overrides). Divs need manual keyboard
// activation to stay accessible.
function activateOnEnterSpace(e) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.currentTarget.click();
  }
}
function wireTabs() {
  // Top tabs (Calculator / Relink)
  $$(".top-tab-btn").forEach(btn => {
    const activate = () => {
      $$(".top-tab-btn").forEach(b => b.classList.remove("is-active"));
      $$(".top-tab-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const panel = $(`[data-toppanel="${btn.dataset.toptab}"]`);
      if (panel) panel.classList.add("is-active");
    };
    btn.addEventListener("click", activate);
    btn.addEventListener("keydown", activateOnEnterSpace);
  });
  // Sub tabs (Logos / Settings inside Calculator)
  $$(".tab-btn").forEach(btn => {
    const activate = () => {
      $$(".tab-btn").forEach(b => b.classList.remove("is-active"));
      $$(".tab-panel").forEach(p => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const panel = $(`[data-panel="${btn.dataset.tab}"]`);
      if (panel) panel.classList.add("is-active");
    };
    btn.addEventListener("click", activate);
    btn.addEventListener("keydown", activateOnEnterSpace);
  });
}

function wireLogos() {
  $("#btnAdd").addEventListener("click", addLogoFromSelection);
  $("#btnRefresh").addEventListener("click", () => {
    const btn = $("#btnRefresh");
    const orig = btn.textContent;
    const doc = app.activeDocument;
    try {
      flushLogoNameInputs();
      lastDocKey = doc ? doc.name : null;
      loadLogos();
      refreshDocInfo();
      renderLogos();
      lastSig = buildSignature(doc);
      btn.textContent = "✓ Refreshed";
    } catch (e) {
      btn.textContent = "✗ Error";
      console.error("[BannerHelper] refresh error", e);
    }
    setTimeout(() => { btn.textContent = orig; }, 1200);
  });
  $("#btnExport").addEventListener("click", exportCsv);
  $("#btnClearAll").addEventListener("click", clearAllLogos);
  $("#btnSetReport").addEventListener("click", setReportFrameFromSelection);
  $("#btnUnlinkReport").addEventListener("click", unlinkReportFrame);
  $("#btnInsertDocName").addEventListener("click", insertDocNameToFrame);
  $("#btnUnlinkDocName").addEventListener("click", unlinkDocNameFrame);
  $("#btnExportData").addEventListener("click", exportData);
  $("#btnImportData").addEventListener("click", importData);

  $("#pageFilter").addEventListener("click", (e) => {
    const btn = e.target.closest(".pf-btn");
    if (!btn) return;
    const val = parseInt(btn.dataset.pf, 10);
    if (!Number.isInteger(val)) return;
    pageFilter = val;
    saveUiState();
    renderLogos();
  });

  const btnCompact = $("#btnCompact");
  if (btnCompact) {
    btnCompact.classList.toggle("is-active", compactView);
    btnCompact.textContent = compactView ? "▤" : "≡";
    btnCompact.addEventListener("click", () => {
      compactView = !compactView;
      saveUiState();
      btnCompact.classList.toggle("is-active", compactView);
      btnCompact.textContent = compactView ? "▤" : "≡";
      renderLogos();
    });
  }

  // Report title + row template — save + refresh report live (debounced)
  const wireReportField = (inputEl, settingKey) => {
    if (!inputEl) return;
    inputEl.value = settings[settingKey] || "";
    let timer = null;
    const save = () => {
      settings[settingKey] = inputEl.value;
      saveSettings();
      lastReportText = {};
      updateReport();
    };
    inputEl.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(save, 250);
    });
    inputEl.addEventListener("focusout", () => {
      clearTimeout(timer);
      save();
    });
  };
  wireReportField($("#setReportTitle"), "reportTitle");

  $("#logoList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const act = btn.dataset.act;
    if (act === "remove") removeLogo(idx);
    else if (act === "select") selectLogoInDoc(idx);
    else if (act === "up") moveLogo(idx, "up");
    else if (act === "down") moveLogo(idx, "down");
  });

  $("#logoList").addEventListener("change", (e) => {
    const sel = e.target.closest("select.logo-client");
    if (sel) {
      flushLogoNameInputs();
      setLogoClient(parseInt(sel.dataset.idx, 10), sel.value);
      return;
    }
    const bal = e.target.closest('input[type="checkbox"][data-act="balancer"]');
    if (bal) {
      toggleLogoBalancer(parseInt(bal.dataset.idx, 10), bal.checked);
      return;
    }
    const nameInput = e.target.closest("input.logo-name-input");
    if (nameInput) {
      setLogoLabel(parseInt(nameInput.dataset.nameIdx, 10), nameInput.value);
    }
  });

  // UXP: input/change events miss on delete/paste → listen broadly.
  // Debounce save so typing isn't blocked by doc.insertLabel on every keystroke.
  let saveTimer = null;
  const liveSaveName = (e) => {
    const nameInput = e.target.closest && e.target.closest("input.logo-name-input");
    if (!nameInput) return;
    const idx = parseInt(nameInput.dataset.nameIdx, 10);
    const val = nameInput.value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => setLogoLabel(idx, val), 250);
  };
  $("#logoList").addEventListener("input", liveSaveName);
  $("#logoList").addEventListener("keyup", liveSaveName);
  $("#logoList").addEventListener("focusout", (e) => {
    const nameInput = e.target.closest && e.target.closest("input.logo-name-input");
    if (!nameInput) return;
    clearTimeout(saveTimer);
    setLogoLabel(parseInt(nameInput.dataset.nameIdx, 10), nameInput.value);
  });

  // Also save on Enter key (triggers blur → change)
  $("#logoList").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input.logo-name-input")) {
      e.target.blur();
    }
  });
}

function wireSettings() {
  $("#btnAddClient").addEventListener("click", () => {
    // Persist current form edits before adding so we don't lose them
    if (!validateClientNamesUnique()) return;
    collectSettingsFromForm();
    // Bump suffix until the default name doesn't collide with existing clients.
    let n = settings.clients.length + 1;
    let candidate = `Client ${n}`;
    const taken = new Set(settings.clients.map(c => c.name.toLowerCase()));
    while (taken.has(candidate.toLowerCase())) { n++; candidate = `Client ${n}`; }
    settings.clients.push({
      id: newClientId(),
      name: candidate,
      ratio: 1.0
    });
    renderClientsEditor();
  });

  // Live validation: highlight duplicates on blur, clear error while typing.
  $("#clientsEditor").addEventListener("focusout", (e) => {
    if (e.target.matches('input[data-field="name"]')) validateClientNamesUnique();
  });
  $("#clientsEditor").addEventListener("input", (e) => {
    if (e.target.matches('input[data-field="name"]')) e.target.classList.remove("has-error");
  });

  $("#clientsEditor").addEventListener("click", (e) => {
    const del = e.target.closest("[data-client-del]");
    if (!del) return;
    collectSettingsFromForm();
    const i = parseInt(del.dataset.clientDel, 10);
    if (settings.clients.length <= 1) {
      flashStatus("At least one client required", true);
      return;
    }
    const removedId = settings.clients[i].id;
    settings.clients.splice(i, 1);
    // Reassign any logos using this client to the first available (or pilot)
    const fallback = getClientById(DEFAULT_CLIENT_ID) ? DEFAULT_CLIENT_ID : settings.clients[0].id;
    logos.forEach(l => { if (l.clientId === removedId) l.clientId = fallback; });
    saveLogos();
    renderClientsEditor();
  });

  $("#btnSaveSettings").addEventListener("click", () => {
    if (!validateClientNamesUnique()) return;
    collectSettingsFromForm();
    saveSettings();
    flashStatus("Settings saved");
    refreshDocInfo();
    renderLogos();
  });

  $("#btnResetSettings").addEventListener("click", async () => {
    const ok = await confirmDialog("Reset all settings and clients to defaults?");
    if (!ok) return;
    settings = cloneSettings(DEFAULT_SETTINGS);
    saveSettings();
    renderSettingsForm();
    flashStatus("Reset to defaults");
    refreshDocInfo();
    renderLogos();
  });
}

/* ============ AUTO REFRESH ============ */
// Polling because InDesign UXP has no reliable "geometry changed" event.
// Use signature diff so we only re-render the DOM when something actually changed.

let lastSig = "";
let lastDocKey = null;
let refreshTimer = null;
const POLL_MS = 500;

function buildSignature(doc) {
  if (!doc) return "no-doc";
  // Unit-agnostic: raw bounds differ when anything moves/resizes,
  // regardless of ruler unit. No conversion needed for diff detection.
  const parts = [doc.name || "unnamed", `pages:${doc.pages.length}`];
  try {
    const vp = doc.viewPreferences;
    parts.push(`u:${vp.horizontalMeasurementUnits},${vp.verticalMeasurementUnits}`);
    // Active page index — so the page-filter "is-current" highlight tracks
    // the user navigating between pages in InDesign.
    parts.push(`ap:${getActivePageIndex(doc)}`);
    for (let i = 0; i < doc.pages.length; i++) {
      const pg = pageAt(doc, i);
      if (pg) parts.push(`p${i}:${pg.bounds.join(",")}`);
    }
    logos.forEach(logo => {
      const item = findPageItemById(logo.itemId);
      if (!item) { parts.push(`${logo.itemId}:X`); return; }
      parts.push(`${logo.itemId}:${item.geometricBounds.join(",")}`);
    });
  } catch (e) {
    parts.push(`err:${e.message || e}`);
  }
  return parts.join("|");
}

function tickAutoRefresh() {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }

  const docKey = docIdentityKey(doc);

  // Doc switched/opened/closed → reload logos list from new doc's label
  if (docKey !== lastDocKey) {
    console.log("[BannerHelper][dbg] tick: doc switch", lastDocKey, "→", docKey, "name=", doc && doc.name);
    lastDocKey = docKey;
    loadLogos();
    refreshDocInfo();
    renderLogos();
    lastSig = buildSignature(doc);
    return;
  }

  // Same doc: detect any geometry change via signature diff
  const sig = buildSignature(doc);
  if (sig !== lastSig) {
    lastSig = sig;
    refreshDocInfo();
    renderLogos();
  }
}

function startAutoRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    try { tickAutoRefresh(); } catch (e) { console.error("[BannerHelper] tick error", e); }
  }, POLL_MS);
}

/* ============ IMPORT / EXPORT ============ */
const EXPORT_VERSION = 1;

// Conflict dialog for import: Override / Rename / Skip. Resolves to
// { action: "override" | "rename" | "skip", newName?: string }
async function promptImportConflict(name) {
  return new Promise(resolve => {
    const suggest = `${name} new`;
    const box = document.createElement("div");
    box.style.cssText = DIALOG_BOX_CSS;
    box.innerHTML = `
      <div style="margin-bottom:6px;color:#e0e0e0;font-size:12px;">Client <strong>"${escapeHtml(name)}"</strong> already exists.</div>
      <div style="color:#aaa;font-size:11px;margin-bottom:10px;">Choose how to handle the conflict:</div>
      <div style="margin-bottom:6px;color:#aaa;font-size:11px;">Rename to:</div>
      <input type="text" class="newname" style="${DIALOG_INPUT_CSS}" value="${escapeHtml(suggest)}" />
      <div style="display:flex;margin-top:10px;">
        <button class="override" style="${DIALOG_BTN_PRIMARY}">Override</button>
        <button class="rename" style="${DIALOG_BTN_SECONDARY}">Rename</button>
        <button class="skip" style="${DIALOG_BTN_SECONDARY};margin-left:6px;">Skip</button>
      </div>`;
    const backdrop = openDialog(box);
    const input = box.querySelector(".newname");
    const finish = (v) => { document.body.removeChild(backdrop); resolve(v); };
    box.querySelector(".override").addEventListener("click", () => finish({ action: "override" }));
    box.querySelector(".rename").addEventListener("click", () => finish({ action: "rename", newName: (input.value || "").trim() || suggest }));
    box.querySelector(".skip").addEventListener("click", () => finish({ action: "skip" }));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish({ action: "rename", newName: (input.value || "").trim() || suggest });
      else if (e.key === "Escape") finish({ action: "skip" });
    });
  });
}


function flashShareStatus(msg, isError) {
  const el = $("#shareStatus");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("error", !!isError);
  setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 3000);
}

async function exportData() {
  try {
    const fs = getLfs();
    if (!fs) { flashShareStatus("File system unavailable", true); return; }
    const payload = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      settings: {
        unit: settings.unit,
        reportTitle: settings.reportTitle,
        clients: settings.clients.map(c => ({ id: c.id, name: c.name, ratio: c.ratio }))
      },
      logos: logos.map(l => ({ ...l }))
    };
    const doc = app.activeDocument;
    const suggested = `BannerHelper-${(doc && doc.name ? doc.name.replace(/\.indd$/i, "") : "export")}.json`;
    const file = await fs.getFileForSaving(suggested, { types: ["json"] });
    if (!file) return;
    await file.write(JSON.stringify(payload, null, 2));
    flashShareStatus(`Exported → ${file.name}`);
  } catch (e) {
    console.error("[BannerHelper] export error", e);
    flashShareStatus(`Export failed: ${e.message || e}`, true);
  }
}

async function importData() {
  try {
    const fs = getLfs();
    if (!fs) { flashShareStatus("File system unavailable", true); return; }
    const file = await fs.getFileForOpening({ types: ["json"] });
    if (!file) return;
    const text = await file.read();
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { flashShareStatus("Invalid JSON file", true); return; }
    if (!parsed || !parsed.settings) { flashShareStatus("Missing settings in file", true); return; }

    // Clients: merge with Override / Rename / Skip prompt on name conflict
    const incomingClients = Array.isArray(parsed.settings.clients) ? parsed.settings.clients : [];
    const findByNameCI = (n) => settings.clients.findIndex(c => c.name.toLowerCase() === n.toLowerCase());
    let added = 0, overridden = 0, skipped = 0;
    for (const inc of incomingClients) {
      let name = String(inc.name || "Unnamed");
      const ratio = Number(inc.ratio) || 1;
      const dupeIdx = findByNameCI(name);
      if (dupeIdx >= 0) {
        const choice = await promptImportConflict(name);
        if (!choice || choice.action === "skip") { skipped++; continue; }
        if (choice.action === "override") {
          const existing = settings.clients[dupeIdx];
          existing.ratio = ratio;
          overridden++;
          continue;
        }
        // rename: ensure the new name doesn't also collide
        let newName = choice.newName;
        let n = 2;
        while (findByNameCI(newName) >= 0) { newName = `${choice.newName} (${n++})`; }
        name = newName;
      }
      settings.clients.push({
        id: newClientId(),
        name,
        ratio
      });
      added++;
    }

    // Title + unit: overwrite if provided
    if (typeof parsed.settings.reportTitle === "string") settings.reportTitle = parsed.settings.reportTitle;
    if (typeof parsed.settings.unit === "string") settings.unit = parsed.settings.unit;
    saveSettings();

    // Logos: replace (confirm if there's existing data)
    let replaced = 0;
    if (Array.isArray(parsed.logos) && parsed.logos.length > 0) {
      const ok = logos.length === 0 ? true : await confirmDialog(`Replace ${logos.length} current logos with ${parsed.logos.length} from file?`);
      if (ok) {
        logos = parsed.logos.map(l => ({ ...l, clientId: l.clientId || DEFAULT_CLIENT_ID }));
        saveLogos();
        replaced = logos.length;
      }
    }

    renderSettingsForm();
    renderLogos();
    const reportTitleInp = $("#setReportTitle"); if (reportTitleInp) reportTitleInp.value = settings.reportTitle || "";
    flashShareStatus(`Imported: ${added} client${added === 1 ? "" : "s"}${replaced ? `, ${replaced} logos` : ""}`);
  } catch (e) {
    console.error("[BannerHelper] import error", e);
    flashShareStatus(`Import failed: ${e.message || e}`, true);
  }
}

/* ============ BOOT ============ */
function boot() {
  loadSettings();
  loadUiState();
  // Purge the bad collision key written by older builds (doc.fullName is a
  // Promise in UXP → stringified identically for every doc).
  try { localStorage.removeItem("bannerhelper:logos:[object Promise]"); } catch (e) { /* ignore */ }
  loadLogos();
  wireTabs();
  wireLog();
  wireLogos();
  wireRelink();
  wireSettings();
  renderSettingsForm();
  refreshDocInfo();
  renderLogos();
  lastDocKey = docIdentityKey(app.activeDocument);
  lastSig = buildSignature(app.activeDocument);
  startAutoRefresh();
}

boot();
