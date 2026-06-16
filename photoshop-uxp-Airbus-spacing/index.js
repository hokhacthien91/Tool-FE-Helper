document.addEventListener("DOMContentLoaded", () => {

  // Force panel to minimum usable size on load (UXP floating panel)
  try { window.resizeTo(570, 900); } catch(_) {}

  // ─── State ─────────────────────────────────────────────────────────────────
  let currentDoc      = null;
  let currentPage     = null; // alias for currentDoc (PS has no pages)
  let displayUnitName = "px";
  let snapshot        = null;
  let docResolution   = 72;   // PPI — used for unit conversion

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const elDocName   = $("docName");
  const selUnit     = $("selUnit");
  const elStatus    = $("statusBar");

  const inpPageW    = $("inpPageW");
  const inpPageH    = $("inpPageH");

  const fitTargetStatus = $("fitTargetStatus");
  const inpFitName      = $("inpFitName");
  const inpLetterRefName= $("inpLetterRefName");
  const inpUrlBlockName = $("inpUrlBlockName");
  const inpQrBlockName  = $("inpQrBlockName");
  const inpMainName     = $("inpMainName");
  const inpCampName     = $("inpCampName");
  const inpSubName      = $("inpSubName");
  const inpCtaName      = $("inpCtaName");
  const chkPlaceLogo    = $("chkPlaceLogo");
  const chkPlaceUrl     = $("chkPlaceUrl");
  const chkPlaceQr      = $("chkPlaceQr");
  const chkPlaceMain    = $("chkPlaceMain");
  const chkPlaceCamp    = $("chkPlaceCamp");
  const chkPlaceSub     = $("chkPlaceSub");
  const chkPlaceCta     = $("chkPlaceCta");
  const selLogoH = $("selLogoH"), selLogoV = $("selLogoV");
  const selUrlH  = $("selUrlH"),  selUrlV  = $("selUrlV");
  const selQrH   = $("selQrH"),   selQrV   = $("selQrV");
  const selMainH = $("selMainH"), selMainV = $("selMainV");
  const selCampH = $("selCampH"), selCampV = $("selCampV");
  const selSubH  = $("selSubH"),  selSubV  = $("selSubV");
  const selCtaH  = $("selCtaH"),  selCtaV  = $("selCtaV");
  const selLogoCntH = $("selLogoCntH"), selLogoCntV = $("selLogoCntV");
  const selUrlCntH  = $("selUrlCntH"),  selUrlCntV  = $("selUrlCntV");
  const selQrCntH   = $("selQrCntH"),   selQrCntV   = $("selQrCntV");
  const selMainCntH = $("selMainCntH"), selMainCntV = $("selMainCntV");
  const selCampCntH = $("selCampCntH"), selCampCntV = $("selCampCntV");
  const selSubCntH  = $("selSubCntH"),  selSubCntV  = $("selSubCntV");
  const selCtaCntH  = $("selCtaCntH"),  selCtaCntV  = $("selCtaCntV");
  const selLogoRefH = $("selLogoRefH"), selLogoRefV = $("selLogoRefV");
  const selUrlRefH  = $("selUrlRefH"),  selUrlRefV  = $("selUrlRefV");
  const selQrRefH   = $("selQrRefH"),   selQrRefV   = $("selQrRefV");
  const selMainRefH = $("selMainRefH"), selMainRefV = $("selMainRefV");
  const selCampRefH = $("selCampRefH"), selCampRefV = $("selCampRefV");
  const selSubRefH  = $("selSubRefH"),  selSubRefV  = $("selSubRefV");
  const selCtaRefH  = $("selCtaRefH"),  selCtaRefV  = $("selCtaRefV");

  // A-count inputs (số thực 0–5). Default value đã set sẵn trong HTML (Sub-H = 1, còn lại = 2).
  // Đọc count: số thực 0–5, làm tròn 1 chữ số thập phân; rỗng/lỗi/âm → def; > 5 → 5.
  const CNT_MAX = 5;
  function cntVal(el, def) {
    let v = parseFloat(el && el.value);
    if (!isFinite(v) || v < 0) v = (def == null ? 2 : def);
    if (v > CNT_MAX) v = CNT_MAX;
    return Math.round(v * 10) / 10;
  }
  // Chia count thành các đoạn chữ A: 2.5 → [1,1,0.5]; 2 → [1,1]; 0 → [].
  function aSegs(n) {
    const out = []; let r = Math.round(n * 10) / 10;
    while (r > 1e-6) { const s = Math.min(1, r); out.push(s); r -= s; }
    return out;
  }
  // Default count cho từng input: Sub-H = 1, còn lại = 2 (chuẩn hóa khi blur + reset).
  function cntDef(el) { return el === selSubCntH ? 1 : 2; }
  const cntInputs = [
    selLogoCntH, selLogoCntV, selUrlCntH, selUrlCntV, selQrCntH, selQrCntV,
    selMainCntH, selMainCntV, selCampCntH, selCampCntV, selSubCntH, selSubCntV,
    selCtaCntH, selCtaCntV
  ];

  // Inject một warning div sau mỗi hàng "A count" (H + V dùng chung 1 hàng → 1 div).
  cntInputs.forEach(el => {
    const row = el.closest(".anchor-row");
    if (!row || row._cntWarnInjected) return;
    row._cntWarnInjected = true;
    const warn = document.createElement("div");
    warn.className = "cnt-warn-row";
    row.insertAdjacentElement("afterend", warn);
    row._cntWarn = warn;
  });
  function getCntWarnEl(el) {
    const row = el.closest(".anchor-row");
    return (row && row._cntWarn) || null;
  }

  // UXP native <select> often won't refresh its DISPLAYED text after JS changes options/value
  // (only A-count/Ref are JS-populated → they showed the wrong text). Setting option.selected
  // directly (not just sel.value) forces the correct option to render.
  function selectSet(sel, val) {
    if (!sel) return;
    const opts = sel.options;
    let matched = false;
    for (let i = 0; i < opts.length; i++) {
      const on = opts[i].value === val;
      opts[i].selected = on;
      if (on) matched = true;
    }
    if (!matched && opts.length) opts[0].selected = true;
    try { sel.value = matched ? val : (opts.length ? opts[0].value : ""); } catch(_) {}
  }

  // Debug: one-line dump of a select's value vs its displayed option text.
  function __dbgSel(sel) {
    try {
      const vals = Array.from(sel.options).map(o => o.value).join(",");
      const o = (sel.selectedIndex >= 0) ? sel.options[sel.selectedIndex] : null;
      return sel.id + " | opts=[" + vals + "] value=" + sel.value +
             " idx=" + sel.selectedIndex + " text=\"" + (o ? o.textContent : "") + "\"";
    } catch(e) { return (sel && sel.id) + " <dbg err>"; }
  }

  function getRefOptions() {
    return [
      { value: "trim",   label: "Trim" },
      { value: "logo",   label: fitTargetName },
      { value: "url",    label: urlBlockName },
      { value: "qr",     label: qrBlockName },
      { value: "main",   label: mainName },
      { value: "camp",   label: campName },
      { value: "sub",    label: subName },
      { value: "cta",    label: ctaName }
    ];
  }
  const REF_DEFAULTS = {
    selCampRefV: "main",
    selSubRefH:  "qr",
    selCtaRefV:  "camp"
  };
  function populateRefSelect(sel) {
    const self = sel.getAttribute("data-ref-for");
    const prevVal = sel.value;
    const opts = getRefOptions().filter(function(o) { return o.value !== self; });
    const fallback = REF_DEFAULTS[sel.id] || "trim";
    const chosen = prevVal && opts.some(function(o) { return o.value === prevVal; }) ? prevVal : fallback;
    // Build with embedded `selected` attribute so UXP's HTML parser sets the display (more reliable than JS property)
    sel.innerHTML = opts.map(function(o) {
      const safe = o.label.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return '<option value="' + o.value + '"' + (o.value === chosen ? ' selected' : '') + '>' + safe + '</option>';
    }).join('');
  }
  const refSelects = [
    selLogoRefH, selLogoRefV, selUrlRefH, selUrlRefV,
    selQrRefH, selQrRefV, selMainRefH, selMainRefV,
    selCampRefH, selCampRefV, selSubRefH, selSubRefV,
    selCtaRefH, selCtaRefV
  ];
  function refreshAllRefSelects() { refSelects.forEach(populateRefSelect); }

  // Canonical defaults for all spacing controls (anchor / A count / Ref / checkboxes).
  // Used by the Reset-options button AND by loadFitTarget so every load starts from a known
  // default before overlaying the file's saved values → no leaking of the previous file's selects.
  function resetSpacingControlsToDefault() {
    // Anchor selects use selectSet (sets option.selected directly) so UXP visually refreshes
    selectSet(selLogoH, "R"); selectSet(selLogoV, "B");
    selectSet(selUrlH,  "R"); selectSet(selUrlV,  "T");
    selectSet(selQrH,   "L"); selectSet(selQrV,   "B");
    selectSet(selMainH, "L"); selectSet(selMainV, "T");
    selectSet(selCampH, "L"); selectSet(selCampV, "T");
    selectSet(selSubH,  "L"); selectSet(selSubV,  "B");
    selectSet(selCtaH,  "L"); selectSet(selCtaV,  "T");
    // Count inputs: reset value về default (Sub-H = 1, còn lại = 2)
    cntInputs.forEach(function(el) { el.value = String(cntDef(el)); });
    [chkPlaceLogo, chkPlaceUrl, chkPlaceQr, chkPlaceMain, chkPlaceCamp, chkPlaceSub, chkPlaceCta]
      .forEach(function(c) { c.checked = true; });
    refSelects.forEach(function(sel) { sel.value = ""; populateRefSelect(sel); });
  }

  const btnApplyLayout = $("btnApplyLayout");
  const btnRefresh  = $("btnRefresh");
  const btnApply    = $("btnApply");
  const btnRevert   = $("btnRevert");

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function setStatus(msg, kind) {
    elStatus.className = "status-bar" + (kind ? " " + kind : "");
    elStatus.textContent = msg || "";
  }

  function getPhotoshop() {
    try {
      const ps = require("photoshop");
      if (!ps) return null;
      return ps;
    } catch(e) {
      return null;
    }
  }

  // 1 px = ? display units (uses docResolution for physical units)
  function pxPerUnit(unitName) {
    const res = docResolution || 72;
    switch(unitName) {
      case "px": return 1;
      case "in": return 1 / res;
      case "mm": return 25.4 / res;
      case "cm": return 2.54 / res;
      case "pt": return 72 / res;
      default:   return 1;
    }
  }

  // Photoshop API returns numbers in PIXELS. Convert px → display unit.
  function pxToDisplay(px) {
    if (px == null || isNaN(px)) return "";
    return formatNumber(px * pxPerUnit(displayUnitName));
  }

  // Convert display-unit string back to px for writing.
  function displayToPx(str) {
    if (str == null) return NaN;
    const cleaned = String(str).trim().replace(",", ".");
    const v = parseFloat(cleaned);
    if (isNaN(v)) return NaN;
    return v / pxPerUnit(displayUnitName);
  }

  function formatNumber(v) {
    return parseFloat(v.toFixed(4)).toString();
  }

  // Layer validity check — PS has no .isValid, use try-catch
  function isLayerValid(layer) {
    try { const _ = layer.name; return true; } catch(_) { return false; }
  }

  // Real artwork box (excludes Layer Effects: drop shadow/outer glow/stroke).
  // layer.bounds inflates with effects → wrong edge. Use boundsNoEffects for ALL
  // geometry reads. Layer without effects → boundsNoEffects === bounds (safe).
  function boundsOf(layer) {
    try { if (layer.boundsNoEffects) return layer.boundsNoEffects; } catch(_) {}
    return layer.bounds;
  }

  // ─── Persistence (localStorage, keyed per-document) ───────────────────────
  function getPageStateKey() {
    try {
      const ps = getPhotoshop();
      if (!ps || !ps.app.activeDocument) return "pageGuides.ps.page.default";
      const doc = ps.app.activeDocument;
      // Saved file → stable path key (baseline persists across reloads, no cross-file collision).
      // Unsaved file → per-document id (unique within the session) so two "Untitled-N" docs that
      // reuse the same title don't share a key and leak each other's baseline.
      const id = (doc.path && doc.path.length) ? doc.path
               : (doc.id != null ? ("id-" + doc.id) : (doc.title || "untitled"));
      return "pageGuides.ps.page." + id;
    } catch(_) { return "pageGuides.ps.page.default"; }
  }

  function loadLocalPageState() {
    try {
      const raw = window.localStorage.getItem(getPageStateKey());
      return raw ? JSON.parse(raw) : {};
    } catch(_) { return {}; }
  }

  function saveLocalPageState(data) {
    try {
      const cur = loadLocalPageState();
      window.localStorage.setItem(getPageStateKey(), JSON.stringify(Object.assign({}, cur, data)));
    } catch(e) {}
  }

  // ─── Document refresh ──────────────────────────────────────────────────────
  async function refresh() {
    try {
      const ps = getPhotoshop();
      if (!ps) {
        setStatus("Initializing… open or focus a Photoshop document.", "warn");
        return;
      }
      let app;
      try { app = ps.app; } catch(_) { app = null; }
      if (!app) {
        setStatus("Photoshop not ready. Try UDT → Watch mode, or package & install plugin.", "warn");
        return;
      }
      if (!app.documents || app.documents.length === 0) {
        currentDoc = null;
        currentPage = null;
        elDocName.textContent = "(no document)";
        clearInputs();
        setStatus("Open a Photoshop document first.", "warn");
        return;
      }

      currentDoc  = app.activeDocument;
      currentPage = currentDoc; // PS has no pages
      docResolution = currentDoc.resolution || 72;
      displayUnitName = selUnit.value || "px";
      elDocName.textContent = currentDoc.title || "(untitled)";

      readIntoInputs();

      snapshot = await captureSnapshotAsync(ps);
      // Reload name/ID config for the CURRENTLY active document (saved → restore, new → defaults).
      // Makes the Refresh button re-sync names when switching files.
      if (typeof loadFitTarget === "function") loadFitTarget();
      if (typeof refreshAllAvailability === "function") refreshAllAvailability();

      setStatus("Loaded.", "ok");
      // Onboarding: if the 'guide' folder is missing, prompt (read-only, only warns when missing).
      if (typeof checkGuidePresence === "function") checkGuidePresence();
    } catch(e) {
      setStatus("Refresh failed: " + (e.message || e), "err");
    }
  }

  // ─── Read values into inputs ───────────────────────────────────────────────
  function readIntoInputs() {
    if (!currentDoc) { clearInputs(); return; }

    inpPageW.value = pxToDisplay(currentDoc.width);
    inpPageH.value = pxToDisplay(currentDoc.height);
  }

  function clearInputs() {
    [inpPageW, inpPageH].forEach(el => { el.value = ""; });
  }

  // ─── Snapshot / revert ─────────────────────────────────────────────────────
  // Read the artboardRect of a layer by id (null if not an artboard). get = read-only.
  async function getArtboardRect(ps, id) {
    try {
      const r = await ps.action.batchPlay([{
        _obj: "get", _target: [{ _ref: "layer", _id: id }]
      }], {});
      const d = r && r[0];
      if (d && d.artboardEnabled && d.artboard && d.artboard.artboardRect) {
        const rc = d.artboard.artboardRect;
        return { top: rc.top, left: rc.left, bottom: rc.bottom, right: rc.right };
      }
    } catch(_) {}
    return null;
  }

  // Detect top-level artboards.
  async function getArtboards(ps) {
    const out = [];
    let layers;
    try { layers = currentDoc.layers; } catch(_) { return out; }
    for (let i = 0; i < layers.length; i++) {
      const ly = layers[i];
      const rect = await getArtboardRect(ps, ly.id);
      if (rect) out.push({ id: ly.id, name: ly.name, rect });
    }
    return out;
  }

  // Real "page" size for snapshot/read: first artboard (if any) else canvas.
  // IMPORTANT: must use the same measure as applyCanvasResize (artboard) to avoid canvas↔artboard drift.
  async function getPageSize(ps) {
    try {
      const abs = await getArtboards(ps);
      if (abs.length > 0) {
        const r = abs[0].rect;
        return { w: r.right - r.left, h: r.bottom - r.top };
      }
    } catch(_) {}
    try { return { w: currentDoc.width, h: currentDoc.height }; } catch(_) { return { w: 0, h: 0 }; }
  }

  // Snapshot the page-setup state (size read from the artboard).
  async function captureSnapshotAsync(ps) {
    if (!currentDoc) return null;
    const sz = await getPageSize(ps);
    return {
      canvasW: sz.w, canvasH: sz.h,
      resolution: currentDoc.resolution
    };
  }

  // Resize one artboard to W×H (keep top-left corner). Try descriptors in order, self-verify by
  // re-reading the rect; stop at the one that applies. Return the successful strategy name or null.
  async function resizeOneArtboard(ps, ab, W, H) {
    const top = ab.rect.top, left = ab.rect.left;
    const mkRect = () => ({ _obj: "classFloatRect", top: top, left: left, bottom: top + H, right: left + W });
    await ps.action.batchPlay([{
      _obj: "select", _target: [{ _ref: "layer", _id: ab.id }], makeVisible: false
    }], {});
    const strategies = [
      { name: "editArtboardEvent", desc: [{
          _obj: "editArtboardEvent",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          artboard: { _obj: "artboard", artboardRect: mkRect(), artboardPresetName: "", guideIDs: [] }
        }] },
      { name: "set/to", desc: [{
          _obj: "set",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _obj: "artboard", artboardRect: mkRect() },
          _isCommand: true
        }] }
    ];
    for (let i = 0; i < strategies.length; i++) {
      const s = strategies[i];
      try {
        await ps.action.batchPlay(s.desc, {});
        const after = await getArtboardRect(ps, ab.id);
        const w = after ? Math.round(after.right - after.left) : 0;
        const h = after ? Math.round(after.bottom - after.top) : 0;
        if (w === W && h === H) return s.name;
      } catch(e) {
      }
    }
    return null;
  }

  // Resize the "page": if the document has an Artboard → resize artboardRect (top-left anchor, canvas follows);
  // otherwise → resize the canvas. Returns the number of artboards resized SUCCESSFULLY.
  async function applyCanvasResize(ps, newWpx, newHpx, cmdName) {
    const W = Math.round(newWpx), H = Math.round(newHpx);
    const abs = await getArtboards(ps);
    let okCount = 0;
    await ps.core.executeAsModal(async () => {
      if (abs.length > 0) {
        for (let i = 0; i < abs.length; i++) {
          const ok = await resizeOneArtboard(ps, abs[i], W, H);
          if (ok) okCount++;
        }
        // Canvas does NOT shrink when the artboard gets smaller → trim canvas to fit the artboard (union of right/bottom edges).
        if (okCount > 0) {
          let maxR = 0, maxB = 0;
          for (let i = 0; i < abs.length; i++) {
            const r = await getArtboardRect(ps, abs[i].id);
            if (r) { if (r.right > maxR) maxR = r.right; if (r.bottom > maxB) maxB = r.bottom; }
          }
          if (maxR > 0 && maxB > 0) {
            await ps.action.batchPlay([{
              _obj: "canvasSize",
              width:  { _unit: "pixelsUnit", _value: Math.round(maxR) },
              height: { _unit: "pixelsUnit", _value: Math.round(maxB) },
              horizontal: { _enum: "horizontalLocation", _value: "left" },
              vertical:   { _enum: "verticalLocation",   _value: "top"  },
              _isCommand: true
            }], {});
          }
        }
      } else {
        // canvasSize: correct anchor keys are horizontal/vertical (NOT canvasSizeAnchor). Top-left anchor.
        await ps.action.batchPlay([{
          _obj: "canvasSize",
          width:  { _unit: "pixelsUnit", _value: W },
          height: { _unit: "pixelsUnit", _value: H },
          horizontal: { _enum: "horizontalLocation", _value: "left" },
          vertical:   { _enum: "verticalLocation",   _value: "top"  },
          _isCommand: true
        }], {});
      }
    }, { commandName: cmdName || "Resize canvas/artboard" });
    return okCount;
  }

  async function revertFromSnapshot() {
    if (!snapshot || !currentDoc) {
      setStatus("Nothing to revert.", "warn");
      return;
    }
    try {
      const ps = getPhotoshop();
      const nAb = await applyCanvasResize(ps, snapshot.canvasW, snapshot.canvasH, "Revert canvas/artboard");

      readIntoInputs();
      setStatus("Reverted.", "ok");
    } catch(e) {
      setStatus("Revert failed: " + (e.message || e), "err");
    }
  }

  // ─── Apply changes ─────────────────────────────────────────────────────────
  async function applyChanges() {
    if (!currentDoc) {
      setStatus("No active document/page.", "err");
      return;
    }

    const v = {
      pageW:   displayToPx(inpPageW.value),
      pageH:   displayToPx(inpPageH.value)
    };

    const checks = [
      [v.pageW > 0 && v.pageH > 0, "Page size must be positive."]
    ];
    for (const [ok, msg] of checks) {
      if (!ok) { setStatus(msg, "err"); return; }
    }

    try {
      const ps = getPhotoshop();
      // Capture snapshot BEFORE resize (CURRENT size) → Revert correctly undoes back to pre-Apply.
      snapshot = await captureSnapshotAsync(ps);
      const nAb = await applyCanvasResize(ps, v.pageW, v.pageH, "Update canvas/artboard");

      const after = await getPageSize(ps);
      readIntoInputs();
      setStatus("Applied." + (nAb ? " (artboard ×" + nAb + ")" : ""), "ok");
    } catch(e) {
      setStatus("Apply failed: " + (e.message || e), "err");
    }
  }

  // ─── Wire up events ────────────────────────────────────────────────────────
  btnRefresh.addEventListener("click", refresh);
  btnApply  .addEventListener("click", () => { applyChanges().catch(e => setStatus("Apply failed: " + (e.message || e), "err")); });
  btnRevert .addEventListener("click", () => { revertFromSnapshot().catch(e => setStatus("Revert failed: " + (e.message || e), "err")); });

  [inpPageW, inpPageH].forEach(el => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyChanges().catch(err => setStatus("Apply failed: " + (err.message || err), "err"));
      }
    });
    el.addEventListener("blur", () => {
      if (el.value.trim() === "") { el.classList.remove("input-error"); return; }
      const v = displayToPx(el.value);
      if (isNaN(v) || v <= 0) el.classList.add("input-error");
      else                    el.classList.remove("input-error");
    });
    el.addEventListener("input", () => { el.classList.remove("input-error"); });
  });

  // ─── Fit target state ──────────────────────────────────────────────────────
  const FIT_LABEL_KEY = "fitTarget";
  let fitTargetId    = null;
  let fitTargetName  = "Logo-airbus";
  let letterRefId    = null;          // letter-A layer ID (saved on Set) — exact resolve, avoids name collisions
  let letterRefName  = "letter-A";
  let urlBlockName   = "URL-block";
  let urlId          = null;
  let qrBlockName    = "QR-code";
  let qrId           = null;
  let mainName       = "Main-headline";
  let mainId         = null;
  let campName       = "campaign-line";
  let campId         = null;
  let subName        = "Sub-headline";
  let subId          = null;
  let ctaName        = "Button-CTA";
  let ctaId          = null;

  // Identity pin per component — every Set stores the layer ID (like letter-A).
  // Resolution prefers ID over name → renaming a layer never breaks spacing.
  function getComponentId(key) {
    switch (key) {
      case "logo":   return fitTargetId;
      case "letter": return letterRefId;
      case "url":    return urlId;
      case "qr":     return qrId;
      case "main":   return mainId;
      case "camp":   return campId;
      case "sub":    return subId;
      case "cta":    return ctaId;
    }
    return null;
  }
  function setComponentId(key, id) {
    switch (key) {
      case "logo":   fitTargetId = id; break;
      case "letter": letterRefId = id; break;
      case "url":    urlId  = id; break;
      case "qr":     qrId   = id; break;
      case "main":   mainId = id; break;
      case "camp":   campId = id; break;
      case "sub":    subId  = id; break;
      case "cta":    ctaId  = id; break;
    }
  }
  // NAME-ONLY resolver — Apply always looks up the layer by the name in the input field.
  // (ID pinning removed: Set is now a pure rename; resolution is WYSIWYG by name.)
  function resolveComponentLayer(key, name) {
    return findItemByName(currentDoc, name);
  }

  // Default layer names — used to reset NAME inputs (+ their pinned IDs) when a document
  // has no saved config, so a new/unconfigured file shows defaults instead of leaking
  // the previously-open file's names.
  const DEFAULT_NAMES = {
    logo:   "Logo-airbus",
    letter: "letter-A",
    url:    "URL-block",
    qr:     "QR-code",
    main:   "Main-headline",
    camp:   "campaign-line",
    sub:    "Sub-headline",
    cta:    "Button-CTA"
  };
  // Reset ONLY name vars + pinned IDs to defaults (anchor/count/ref/unit/collapse untouched).
  function resetNamesToDefault() {
    fitTargetName = DEFAULT_NAMES.logo;   setComponentId("logo",   null);
    letterRefName = DEFAULT_NAMES.letter; setComponentId("letter", null);
    urlBlockName  = DEFAULT_NAMES.url;    setComponentId("url",    null);
    qrBlockName   = DEFAULT_NAMES.qr;     setComponentId("qr",     null);
    mainName      = DEFAULT_NAMES.main;   setComponentId("main",   null);
    campName      = DEFAULT_NAMES.camp;   setComponentId("camp",   null);
    subName       = DEFAULT_NAMES.sub;    setComponentId("sub",    null);
    ctaName       = DEFAULT_NAMES.cta;    setComponentId("cta",    null);
  }

  // ALWAYS start fresh: names + spacing controls back to DEFAULT on every load (plugin reload /
  // document switch). Per user decision: do NOT restore the saved per-file UI config — this avoids
  // names "jumping" to wrong values and cross-file leak (shared 'untitled' localStorage key). The
  // airbusBaseline (logo/A sizes) is stored/read SEPARATELY and is left untouched, so Apply still
  // works after reload (Set/Create already renamed the layers to the default names → resolve by name).
  function loadFitTarget() {
    resetNamesToDefault();             // names + pinned IDs → default / null
    resetSpacingControlsToDefault();   // anchor / count / ref / checkboxes → default
    inpFitName.value = fitTargetName;
    inpLetterRefName.value = letterRefName;
    inpUrlBlockName.value = urlBlockName;
    inpQrBlockName.value = qrBlockName;
    inpMainName.value = mainName;
    inpCampName.value = campName;
    inpSubName.value = subName;
    inpCtaName.value = ctaName;
    refreshAllRefSelects();
    refreshAllAvailability();
    updateFitTargetBadge();
    if (currentDoc && typeof readIntoInputs === "function") readIntoInputs();
    // DEBUG (Ref render) — verify value vs displayed text. Remove once confirmed.
    console.log("[dbg] " + __dbgSel(selLogoRefH));
    console.log("[dbg] " + __dbgSel(selLogoRefV));
    // Force UXP visual repaint for all <select> elements.
    // Bug: UXP WebKit batches visual updates — after bulk JS option changes the displayed text
    // stays stale. Toggling option.selected in setTimeout(0) fires after the current render pass
    // and forces a second render with the correct visual state.
    setTimeout(function() {
      document.querySelectorAll("select").forEach(function(s) {
        var idx = s.selectedIndex;
        if (idx >= 0) { s.options[idx].selected = false; s.options[idx].selected = true; }
      });
    }, 0);
  }

  function persistFitTarget() {
    if (!currentDoc) return;
    try {
      saveLocalPageState({
        [FIT_LABEL_KEY]: {
          id:        fitTargetId,
          name:      fitTargetName,
          letterRefId: letterRefId,
          letterRef: letterRefName,
          urlBlock:  urlBlockName,
          urlId:     urlId,
          qrBlock:   qrBlockName,
          qrId:      qrId,
          mainName:  mainName,
          mainId:    mainId,
          campName:  campName,
          campId:    campId,
          subName:   subName,
          subId:     subId,
          ctaName:   ctaName,
          ctaId:     ctaId,
          placeLogo: !!chkPlaceLogo.checked,
          placeUrl:  !!chkPlaceUrl.checked,
          placeQr:   !!chkPlaceQr.checked,
          placeMain: !!chkPlaceMain.checked,
          placeCamp: !!chkPlaceCamp.checked,
          placeSub:  !!chkPlaceSub.checked,
          placeCta:  !!chkPlaceCta.checked,
          logoH: selLogoH.value, logoV: selLogoV.value,
          urlH:  selUrlH.value,  urlV:  selUrlV.value,
          qrH:   selQrH.value,   qrV:   selQrV.value,
          mainH: selMainH.value, mainV: selMainV.value,
          campH: selCampH.value, campV: selCampV.value,
          subH:  selSubH.value,  subV:  selSubV.value,
          ctaH:  selCtaH.value,  ctaV:  selCtaV.value,
          logoCntH: selLogoCntH.value, logoCntV: selLogoCntV.value,
          urlCntH:  selUrlCntH.value,  urlCntV:  selUrlCntV.value,
          qrCntH:   selQrCntH.value,   qrCntV:   selQrCntV.value,
          mainCntH: selMainCntH.value, mainCntV: selMainCntV.value,
          campCntH: selCampCntH.value, campCntV: selCampCntV.value,
          subCntH:  selSubCntH.value,  subCntV:  selSubCntV.value,
          ctaCntH:  selCtaCntH.value,  ctaCntV:  selCtaCntV.value,
          logoRefH: selLogoRefH.value, logoRefV: selLogoRefV.value,
          urlRefH:  selUrlRefH.value,  urlRefV:  selUrlRefV.value,
          qrRefH:   selQrRefH.value,   qrRefV:   selQrRefV.value,
          mainRefH: selMainRefH.value, mainRefV: selMainRefV.value,
          campRefH: selCampRefH.value, campRefV: selCampRefV.value,
          subRefH:  selSubRefH.value,  subRefV:  selSubRefV.value,
          ctaRefH:  selCtaRefH.value,  ctaRefV:  selCtaRefV.value,
          unit: displayUnitName,
          sectionPageSetupCollapsed: document.getElementById("sectionPageSetup").classList.contains("collapsed"),
          sectionSpacingCollapsed:   document.getElementById("sectionSpacing").classList.contains("collapsed")
        }
      });
    } catch(e) {}
  }

  function updateFitTargetBadge() {
    if (fitTargetId) {
      fitTargetStatus.textContent = "id " + fitTargetId;
      fitTargetStatus.classList.add("set");
    } else if (fitTargetName) {
      fitTargetStatus.textContent = "by name";
      fitTargetStatus.classList.remove("set");
    } else {
      fitTargetStatus.textContent = "not set";
      fitTargetStatus.classList.remove("set");
    }
  }

  // ─── Component availability check ─────────────────────────────────────────
  function getComponentMap() {
    return {
      logo:   { input: inpFitName,        getName: () => fitTargetName, checkbox: chkPlaceLogo },
      letter: { input: inpLetterRefName,  getName: () => letterRefName, checkbox: null },
      url:    { input: inpUrlBlockName,   getName: () => urlBlockName,  checkbox: chkPlaceUrl  },
      qr:     { input: inpQrBlockName,    getName: () => qrBlockName,   checkbox: chkPlaceQr   },
      main:   { input: inpMainName,       getName: () => mainName,      checkbox: chkPlaceMain },
      camp:   { input: inpCampName,       getName: () => campName,      checkbox: chkPlaceCamp },
      sub:    { input: inpSubName,        getName: () => subName,       checkbox: chkPlaceSub  },
      cta:    { input: inpCtaName,        getName: () => ctaName,       checkbox: chkPlaceCta  }
    };
  }

  function updateComponentAvailability(key) {
    const map = getComponentMap();
    const c = map[key];
    if (!c) return;
    const name = c.getName();
    // NAME-ONLY availability — matches the name-based resolver. No red border here:
    // the only red border is on logo/letter, applied at Apply time (see flagMissingRequired).
    let found = false;
    if (currentDoc && name) {
      const item = findItemByName(currentDoc, name);
      found = !!(item && isLayerValid(item));
    }
    // Optional component (không phải logo/letter required): có nhập tên nhưng không khớp layer nào
    // → viền vàng; tên rỗng hoặc tìm thấy → bỏ vàng.
    if (key !== "logo" && key !== "letter" && c.input) {
      if (currentDoc && name && !found) c.input.classList.add("has-warning-yellow");
      else                              c.input.classList.remove("has-warning-yellow");
    }
    // Required components (logo / letter): red border + inline error real-time when not found
    if ((key === "logo" || key === "letter") && c.input) {
      if (currentDoc && name && !found) {
        c.input.classList.add("has-warning");
        setRequiredError(c.input, "Layer not found");
      } else {
        c.input.classList.remove("has-warning");
        clearRequiredError(c.input);
      }
    }
    let chkRow = null, compGroup = null;
    if (c.checkbox) {
      chkRow    = c.checkbox.closest(".chk-row");
      compGroup = c.checkbox.closest(".comp-group");
    }
    if (found) {
      if (c.checkbox) c.checkbox.disabled = false;
      if (chkRow)    chkRow.classList.remove("disabled");
      if (compGroup) compGroup.classList.remove("disabled");
    } else {
      if (c.checkbox) c.checkbox.disabled = true;   // never auto-UNTICK — only the user unticks
      if (chkRow)    chkRow.classList.add("disabled");
      if (compGroup) compGroup.classList.add("disabled");
    }
  }

  function refreshAllAvailability() {
    const map = getComponentMap();
    Object.keys(map).forEach(updateComponentAvailability);
  }

  // ─── Layer search utilities ────────────────────────────────────────────────
  // Recursive search — PS has no allPageItems flat list
  function findItemByName(doc, keyword) {
    if (!doc || !keyword) return null;
    const kw = String(keyword).toLowerCase().trim();
    if (!kw) return null;
    // EXACT match only (WYSIWYG): the layer name must equal the field name (case-insensitive,
    // trimmed). No substring fallback — typing a partial/old name must NOT match, so renaming a
    // layer or field correctly surfaces "not found" instead of silently matching a superset.
    function search(layers) {
      for (let i = 0; i < layers.length; i++) {
        try {
          const layer = layers[i];
          if (!isLayerValid(layer)) continue;
          const n = (layer.name || "").toLowerCase().trim();
          if (n && n === kw) return layer;
          // Recurse into groups
          try {
            if (layer.layers && layer.layers.length > 0) {
              const found = search(layer.layers);
              if (found) return found;
            }
          } catch(_) {}
        } catch(_) { continue; }
      }
      return null;
    }
    try { return search(doc.layers); }
    catch(e) { return null; }
  }

  // Find layer/group by exact name (case-insensitive)
  function findContainerByExactName(doc, name) {
    if (!doc || !name) return null;
    const target = String(name).toLowerCase().trim();
    function search(layers) {
      for (let i = 0; i < layers.length; i++) {
        try {
          const l = layers[i];
          if (!isLayerValid(l)) continue;
          if ((l.name || "").toLowerCase() === target) return { kind: "group", node: l };
          try {
            if (l.layers && l.layers.length > 0) {
              const found = search(l.layers);
              if (found) return found;
            }
          } catch(_) {}
        } catch(_) {}
      }
      return null;
    }
    try { return search(doc.layers); } catch(e) { return null; }
  }

  // Get children of a layer group as an array
  function getContainerChildren(container) {
    const out = [];
    if (!container) return out;
    try {
      const layers = container.node.layers;
      for (let i = 0; i < layers.length; i++) {
        try {
          const l = layers[i];
          if (isLayerValid(l)) out.push(l);
        } catch(_) {}
      }
    } catch(e) {}
    return out;
  }

  // Find layer by id (fallback lookup)
  function findLayerById(doc, id) {
    if (!doc || id == null) return null;
    function search(layers) {
      for (let i = 0; i < layers.length; i++) {
        try {
          const l = layers[i];
          if (l.id === id) return l;
          if (l.layers && l.layers.length > 0) {
            const found = search(l.layers);
            if (found) return found;
          }
        } catch(_) {}
      }
      return null;
    }
    try { return search(doc.layers); } catch(_) { return null; }
  }

  // DEBUG helper: short description of a layer (id / name / size)
  function describeLayer(l) {
    try {
      if (!l) return "null";
      const b = l.bounds;
      return "{id:" + l.id + ", name:\"" + l.name + "\", " +
        Math.round(b.right - b.left) + "×" + Math.round(b.bottom - b.top) + "}";
    } catch(e) { return "{invalid: " + (e.message || e) + "}"; }
  }

  // NAME-ONLY — resolve the logo by the name in the input field (no ID pinning).
  function resolveFitTarget() {
    return findItemByName(currentDoc, fitTargetName);
  }

  // NAME-ONLY — resolve the reference letter-A by name. findItemByName matches exact
  // before substring, so "letter-A" never collides with "Logo copy".
  function resolveLetterRef() {
    return findItemByName(currentDoc, letterRefName);
  }

  // ─── Set layer geometric bounds (replace + reposition) ────────────────────
  // Equivalent of InDesign's item.geometricBounds = [y1, x1, y2, x2]
  // Bounds format: [ty1, tx1, ty2, tx2] in pixels
  async function setLayerGeometricBounds(layer, ty1, tx1, ty2, tx2) {
    const ps = getPhotoshop();
    // Constants namespace: newer UXP uses ps.constants (usually lowercase).
    const C  = (ps && (ps.constants || ps.Constants)) || null;
    const AP = C && C.AnchorPosition ? C.AnchorPosition : null;
    // Correct enum has an underscore: TOP_LEFT (fallback TOPLEFT for older builds).
    const anchorTL = AP ? (AP.TOP_LEFT !== undefined ? AP.TOP_LEFT : AP.TOPLEFT) : undefined;
    const b    = boundsOf(layer);   // real box (excludes effects) — align to artwork edge
    const curW = b.right  - b.left;
    const curH = b.bottom - b.top;
    const newW = tx2 - tx1;
    const newH = ty2 - ty1;
    if (curW <= 0 || curH <= 0 || newW <= 0 || newH <= 0) return;

    const scaleX = (newW / curW) * 100;
    const scaleY = (newH / curH) * 100;

    // Select THIS exact layer before transforming — avoids scaling the wrong active layer.
    try {
      await ps.action.batchPlay([{
        _obj: "select",
        _target: [{ _ref: "layer", _id: layer.id }],
        makeVisible: false
      }], {});
    } catch(e) {}


    if (Math.abs(scaleX - 100) > 0.01 || Math.abs(scaleY - 100) > 0.01) {
      if (anchorTL !== undefined) await layer.scale(scaleX, scaleY, anchorTL);
      else                        await layer.scale(scaleX, scaleY);
    }
    // Translate to exact target position — align the REAL EDGE (excludes effects) to target
    const nb = boundsOf(layer);
    const dx = tx1 - nb.left;
    const dy = ty1 - nb.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      await layer.translate(dx, dy);
    }
  }

  // Select a single layer by id (active layer) — dùng trước batchPlay mask/transform.
  async function selectLayerById(id) {
    const ps = getPhotoshop();
    try {
      await ps.action.batchPlay([{
        _obj: "select", _target: [{ _ref: "layer", _id: id }], makeVisible: false
      }], {});
    } catch(_) {}
  }

  // Xóa layer mask (nếu có). Gọi TRƯỚC khi đọc bounds / scale để mask cũ không làm sai geometry.
  async function clearLayerMask(layer) {
    const ps = getPhotoshop();
    await selectLayerById(layer.id);
    try {
      await ps.action.batchPlay([{
        _obj: "delete", _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }]
      }], {});
    } catch(_) {}
  }

  // Thêm mask chữ nhật reveal đúng ô [y1,x1,y2,x2] (px) → cắt phần thừa của chữ A (không bóp glyph).
  async function addRectMask(layer, y1, x1, y2, x2) {
    const ps = getPhotoshop();
    await selectLayerById(layer.id);
    const px = (v) => ({ _unit: "pixelsUnit", _value: v });
    await ps.action.batchPlay([{
      _obj: "set", _target: [{ _ref: "channel", _property: "selection" }],
      to: { _obj: "rectangle", top: px(y1), left: px(x1), bottom: px(y2), right: px(x2) }
    }], {});
    await ps.action.batchPlay([{
      _obj: "make", new: { _class: "channel" },
      at: { _ref: "channel", _enum: "channel", _value: "mask" },
      using: { _enum: "userMaskEnabled", _value: "revealSelection" }
    }], {});
    await ps.action.batchPlay([{
      _obj: "set", _target: [{ _ref: "channel", _property: "selection" }],
      to: { _enum: "ordinal", _value: "none" }
    }], {});
  }

  // Move a layer reliably INTO a group. UXP move(group, placement) behaviour varies, so try
  // PLACEINSIDE → PLACEATEND → PLACEATBEGINNING and verify via layer.parent each time. Returns
  // true once the layer's parent is the group. Used so reference + clones always land inside
  // 'guide' → the guide-children accounting (reuse + surplus delete) works across applies.
  function moveIntoGroup(ps, layer, groupNode) {
    if (!layer || !groupNode) return false;
    const inGroup = () => {
      try { return !!(layer.parent && groupNode && layer.parent.id === groupNode.id); }
      catch(_) { return false; }
    };
    if (inGroup()) return true;
    const C  = (ps && (ps.constants || ps.Constants)) || null;
    const EP = C && C.ElementPlacement ? C.ElementPlacement : null;
    const placements = [];
    if (EP) {
      if (EP.PLACEINSIDE     !== undefined) placements.push(EP.PLACEINSIDE);
      if (EP.PLACEATEND      !== undefined) placements.push(EP.PLACEATEND);
      if (EP.PLACEATBEGINNING!== undefined) placements.push(EP.PLACEATBEGINNING);
    }
    for (let i = 0; i < placements.length; i++) {
      try {
        layer.move(groupNode, placements[i]);
        if (inGroup()) return true;
      } catch(e) { /* try next placement */ }
    }
    const ok = inGroup();
    return ok;
  }

  // ─── Capture letter-A size from the user's selection ────────────────────────
  // Fastest way to size letter-A to the logo's "A": the user selects the A in the logo
  // with any Photoshop tool (Magic Wand = exact glyph, or Marquee), then clicks Capture.
  // We read the selection's bounding box and use its width/height for letter-A. Photoshop
  // does the hard part (the selection); we just read the numbers. Isolated — touches no
  // other function's logic; writes the SAME `airbusBaseline` the existing Apply reads.

  // Read the current pixel selection's bounding box (px) or null if there's none.
  async function getSelectionBounds(ps) {
    try {
      const r = await ps.action.batchPlay([{
        _obj: "get",
        _target: [{ _property: "selection" }, { _ref: "document", _enum: "ordinal", _value: "targetEnum" }]
      }], {});
      const sel = r && r[0] && r[0].selection;
      if (!sel) return null;
      const val = (o) => (o && typeof o === "object" && o._value != null) ? o._value : o;
      const left = val(sel.left), top = val(sel.top), right = val(sel.right), bottom = val(sel.bottom);
      if ([left, top, right, bottom].some(n => typeof n !== "number")) return null;
      const w = right - left, h = bottom - top;
      if (w <= 0 || h <= 0) return null;
      return { left, top, right, bottom, w, h };
    } catch(e) {
      return null;
    }
  }

  async function captureLetterFromSelection() {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }
    const ps = getPhotoshop();
    const logo = resolveFitTarget();
    if (!logo || !isLayerValid(logo)) { setStatus("Logo \"" + fitTargetName + "\" not found.", "err"); return; }
    const letterRef = resolveLetterRef();
    if (!letterRef || !isLayerValid(letterRef)) {
      setStatus("Letter-A \"" + letterRefName + "\" not found — Set it first.", "err"); return;
    }
    if (letterRef.id === logo.id) {
      setStatus("letter-A and logo are the same layer — Set the correct letter-A.", "err"); return;
    }

    const sel = await getSelectionBounds(ps);
    if (!sel) {
      setStatus("Make a selection around the A in the logo first (Magic Wand or Marquee), then Capture.", "warn");
      return;
    }

    let oldW = 0, oldH = 0;
    try {
      await ps.core.executeAsModal(async () => {
        const b = boundsOf(letterRef);
        oldW = b.right - b.left; oldH = b.bottom - b.top;
        // Resize letter-A to the selection size AND place it over the selected A (instant visual match).
        await setLayerGeometricBounds(letterRef, sel.top, sel.left, sel.top + sel.h, sel.left + sel.w);
        const lo = boundsOf(logo);
        // SAME structure as handleSetName → the existing Apply reads it as-is.
        saveLocalPageState({ airbusBaseline: {
          logoId: logo.id, logoW: lo.right - lo.left, logoH: lo.bottom - lo.top, aW: sel.w, aH: sel.h
        }});
        letterRefId = letterRef.id;   // pin identity
      }, { commandName: "Capture letter-A size from selection" });
    } catch(e) {
      setStatus("Capture failed: " + (e.message || e), "err"); return;
    }
    persistFitTarget();
    refreshAllAvailability();
    setStatus("letter-A " + Math.round(oldW) + "×" + Math.round(oldH) + " → " +
              Math.round(sel.w) + "×" + Math.round(sel.h) + "px (from selection) — baseline saved.", "ok");
  }

  // ─── Onboarding: detect / create the 'guide' folder + letter-A ──────────────
  // Read-only check used on document load / after create: shows the 'Create guide'
  // button only when the 'guide' group is missing (then Capture takes the full row),
  // and warns. Never mutates the document or any state — purely UI + a prompt.
  function checkGuidePresence() {
    try {
      if (!currentDoc) return;
      const has = !!findContainerByExactName(currentDoc, "guide");
      const btn = $("btnCreateGuide");
      if (btn) btn.classList.toggle("hidden", has);   // hidden when guide exists
      const btnC = $("btnCaptureSel");
      if (btnC) btnC.classList.toggle("hidden", has); // Capture is fallback only — hidden when guide exists
      if (!has) {
        setStatus("No 'guide' folder found. Marquee the A in the logo, then click 'Create guide' to set up.", "warn");
      }
    } catch(_) {}
  }

  // Create the 'guide' group + a 'letter-A' layer cut from the logo's A.
  // The user marquees the A in the logo; we Layer-Via-Copy that region of the logo into a
  // new layer (a REAL A, exact size), put it in the 'guide' group, and save the baseline.
  // Isolated: only ADDS a new group + layer (copy, never modifies the logo) when the user
  // explicitly clicks Create guide.
  async function createGuideFromSelection() {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }
    const ps = getPhotoshop();
    const logo = resolveFitTarget();
    if (!logo || !isLayerValid(logo)) { setStatus("Logo \"" + fitTargetName + "\" not found.", "err"); return; }

    const guideExisting = findContainerByExactName(currentDoc, "guide");
    const letterExisting = resolveLetterRef();
    if (guideExisting && letterExisting && isLayerValid(letterExisting)) {
      setStatus("'guide' folder and letter-A already exist — nothing to create.", "ok");
      return;
    }

    const sel = await getSelectionBounds(ps);
    if (!sel) {
      setStatus("Marquee the A in the logo first, then click Create guide.", "warn");
      return;
    }

    const _Cn = (ps && (ps.constants || ps.Constants)) || null;
    const PLACE_AT_END = _Cn && _Cn.ElementPlacement ? _Cn.ElementPlacement.PLACEATEND : undefined;

    let newId = null, madeGroup = false, inGuideOk = false, abOk = false;
    try {
      await ps.core.executeAsModal(async () => {
        // 1. Create letter-A FIRST: cut the A out of the logo (copy = logo untouched). This lets us
        //    detect the ARTBOARD it lands in so 'guide' can be created in the same place.
        await ps.action.batchPlay([{
          _obj: "select", _target: [{ _ref: "layer", _id: logo.id }], makeVisible: true
        }], {});
        await ps.action.batchPlay([{ _obj: "copyToLayer" }], {});   // "Layer Via Copy"
        const act = ps.app.activeDocument.activeLayers;
        const newLayer = (act && act.length) ? act[0] : null;
        if (!newLayer) throw new Error("copyToLayer produced no layer");
        try { newLayer.name = "letter-A"; } catch(_) {}
        newId = newLayer.id;

        // 2. The container holding letter-A (the artboard) → where 'guide' must live too.
        let abParent = null;
        try { abParent = newLayer.parent || null; } catch(_) { abParent = null; }

        // 3. Find or create an EMPTY 'guide' group (target the layerSection CLASS → does NOT wrap
        //    selected layers). Created at root; moved into the artboard in step 4.
        let guideNode = null;
        const gc = findContainerByExactName(currentDoc, "guide");
        if (gc) {
          guideNode = gc.node;
        } else {
          try {
            await ps.action.batchPlay([{
              _obj: "selectNoLayers", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
            }], {});
          } catch(_) {}
          await ps.action.batchPlay([{
            _obj: "make", _target: [{ _ref: "layerSection" }],
            using: { _obj: "layerSection", name: "guide" }
          }], {});
          const gc2 = findContainerByExactName(currentDoc, "guide");
          guideNode = gc2 ? gc2.node : null;
          madeGroup = true;
        }

        // 4. Put 'guide' INSIDE the artboard (sibling of letter-A) so a within-artboard move can
        //    drop letter-A into it. (No artboard → leave at root, which is fine.)
        if (abParent && guideNode) {
          abOk = moveIntoGroup(ps, guideNode, abParent);
          const gc3 = findContainerByExactName(currentDoc, "guide");   // re-resolve after move
          if (gc3 && gc3.node) guideNode = gc3.node;
        } else {
          abOk = !abParent;   // no artboard → root placement is acceptable
        }

        // 5. Wrap letter-A: move it INTO the guide group (now in the same artboard).
        inGuideOk = guideNode ? moveIntoGroup(ps, newLayer, guideNode) : false;

        // 6. Pin identity + save baseline (same structure the existing Apply reads).
        letterRefId = newLayer.id;
        letterRefName = "letter-A";
        const lo = boundsOf(logo);
        saveLocalPageState({ airbusBaseline: {
          logoId: logo.id, logoW: lo.right - lo.left, logoH: lo.bottom - lo.top, aW: sel.w, aH: sel.h
        }});
      }, { commandName: "Create guide + letter-A from logo" });
    } catch(e) {
      const msg = (e && (e.message || e)) || "";
      if (/empty|selection/i.test(String(msg))) {
        setStatus("Selection is empty over the logo — marquee the A on the logo layer.", "warn");
      } else {
        setStatus("Create guide failed: " + msg, "err");
      }
      return;
    }

    try { inpLetterRefName.value = letterRefName; } catch(_) {}
    persistFitTarget();
    refreshAllAvailability();
    checkGuidePresence();   // guide now exists → hide Create guide, Capture goes full width
    if (!inGuideOk) {
      setStatus("Created letter-A (" + Math.round(sel.w) + "×" + Math.round(sel.h) +
                "px) but could NOT move it inside 'guide' — drag it into the group manually.", "warn");
    } else if (!abOk) {
      setStatus("Created 'guide' + letter-A (" + Math.round(sel.w) + "×" + Math.round(sel.h) +
                "px), but 'guide' is not inside the artboard — drag the group into the artboard.", "warn");
    } else {
      setStatus("Created 'guide' (in artboard) + letter-A (" + Math.round(sel.w) + "×" + Math.round(sel.h) +
                "px from logo) — baseline saved.", "ok");
    }
  }

  // computeFittedBounds — kept for compatibility but unused for PS apply
  function computeFittedBounds(item, pageW, pageH, mode, target) {
    const b    = item.bounds;
    const y1   = b.top, x1 = b.left, y2 = b.bottom, x2 = b.right;
    const curW = x2 - x1;
    const curH = y2 - y1;
    if (curW <= 0 || curH <= 0) return null;
    const scale = (mode === "height") ? (target / curH) : (target / curW);
    const newW  = curW * scale;
    const newH  = curH * scale;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const anchorLeft = cx <= pageW / 2;
    const anchorTop  = cy <= pageH / 2;
    return {
      bounds: [
        anchorTop  ? y1 : y2 - newH,
        anchorLeft ? x1 : x2 - newW,
        anchorTop  ? y1 + newH : y2,
        anchorLeft ? x1 + newW : x2
      ],
      newH: newH, newW: newW
    };
  }

  // ─── Airbus brand layout ───────────────────────────────────────────────────
  function computeComponentBounds(w, h_, anchorH, anchorV, padH, padV, pageW, pageH,
                                  refHBounds, refVBounds, isContainerRefH, isContainerRefV) {
    if (!refHBounds) { refHBounds = [0, 0, pageH, pageW]; isContainerRefH = true; }
    if (!refVBounds) { refVBounds = [0, 0, pageH, pageW]; isContainerRefV = true; }

    let x1, x2, y1, y2;
    if (isContainerRefH) {
      if (anchorH === "R") { x2 = refHBounds[3] - padH; x1 = x2 - w; }
      else                 { x1 = refHBounds[1] + padH; x2 = x1 + w; }
    } else {
      if (anchorH === "R") { x2 = refHBounds[1] - padH; x1 = x2 - w; }
      else                 { x1 = refHBounds[3] + padH; x2 = x1 + w; }
    }
    if (isContainerRefV) {
      if (anchorV === "B") { y2 = refVBounds[2] - padV; y1 = y2 - h_; }
      else                 { y1 = refVBounds[0] + padV; y2 = y1 + h_; }
    } else {
      if (anchorV === "B") { y2 = refVBounds[0] - padV; y1 = y2 - h_; }
      else                 { y1 = refVBounds[2] + padV; y2 = y1 + h_; }
    }
    return [y1, x1, y2, x2];
  }

  function computeLogoGuideZones(letterABounds, logoBounds, anchorH, anchorV, cntH, cntV) {
    const [ay1, ax1, ay2, ax2] = letterABounds;
    const [, lx1L, , lx2L]    = logoBounds;
    const zones = [];
    // H zones: mỗi đoạn = 1 chữ A ĐẦY, xếp tuần tự sát nhau (bước = aW_global), KHÔNG đè nhau.
    // Dịch cả chuỗi VÀO TRONG bằng phần dư (số_A - count)*aW: cạnh viền khớp đúng khoảng cách,
    // chữ A dư (vd .5) lòi vào phía component (đè component/layer trong), KHÔNG lòi ra ngoài viền.
    const w = aW_global;
    const segsH = aSegs(cntH);
    let offH = -(segsH.length - cntH) * w;
    for (let i = 0; i < segsH.length; i++) {
      let z;
      if (anchorH === "R") z = { kind: "H", bounds: [ay1, lx2L + offH, ay2, lx2L + offH + w] };
      else                 z = { kind: "H", bounds: [ay1, lx1L - offH - w, ay2, lx1L - offH] };
      zones.push(z);
      offH += w;
    }
    const vx1 = ax1, vx2 = ax2;
    const h = aH_global;
    const segsV = aSegs(cntV);
    let offV = -(segsV.length - cntV) * h;
    for (let i = 0; i < segsV.length; i++) {
      let z;
      if (anchorV === "B") z = { kind: "V", bounds: [ay2 + offV, vx1, ay2 + offV + h, vx2] };
      else                 z = { kind: "V", bounds: [ay1 - offV - h, vx1, ay1 - offV, vx2] };
      zones.push(z);
      offV += h;
    }
    return zones;
  }

  // Module-level aW/aH used by zone helpers (set in applyAirbusLayout)
  let aW_global = 0, aH_global = 0;

  function pushZonesForPseudoComponent(guideZones, compBounds, anchorH, anchorV, cntH, cntV) {
    const [cy1, cx1, cy2, cx2] = compBounds;
    const pAy1 = (anchorV === "B") ? cy2 - aH_global : cy1;
    const pAy2 = pAy1 + aH_global;
    const pAx1 = (anchorH === "R") ? cx2 - aW_global : cx1;
    const pAx2 = pAx1 + aW_global;
    const z = computeLogoGuideZones([pAy1, pAx1, pAy2, pAx2], compBounds, anchorH, anchorV, cntH, cntV);
    for (let i = 0; i < z.length; i++) guideZones.push(z[i]);
  }

  function pushZonesFixed2AColumn(guideZones, compBounds, anchorH, anchorV, cntH, cntV, opts) {
    const [cy1, cx1, cy2, cx2] = compBounds;
    const forceHBottom = opts && opts.forceHBottom;
    const hFromBottom  = forceHBottom ? true : (anchorV === "B");
    // H: mỗi cột = 1 chữ A ĐẦY (bước = aW_global), xếp tuần tự sát nhau, KHÔNG đè nhau.
    // Dịch chuỗi cột VÀO TRONG bằng phần dư → cột dư lòi vào phía component, không lòi ra viền.
    const wCol = aW_global;
    const colSegs = aSegs(cntH);
    let offCol = -(colSegs.length - cntH) * wCol;
    for (let c = 0; c < colSegs.length; c++) {
      let ax1, ax2;
      if (anchorH === "R") { ax1 = cx2 + offCol;        ax2 = ax1 + wCol; }
      else                 { ax1 = cx1 - offCol - wCol; ax2 = ax1 + wCol; }
      const pushH = (vy1, vy2) => { guideZones.push({ kind: "H", bounds: [vy1, ax1, vy2, ax2] }); };
      if (hFromBottom) {
        pushH(cy2 - aH_global,     cy2);
        pushH(cy2 - 2 * aH_global, cy2 - aH_global);
      } else {
        pushH(cy1,                 cy1 + aH_global);
        pushH(cy1 + aH_global,     cy1 + 2 * aH_global);
      }
      offCol += wCol;
    }
    let vx1, vx2;
    if (anchorH === "R") { vx1 = cx2 - aW_global; vx2 = cx2; }
    else                 { vx1 = cx1;              vx2 = cx1 + aW_global; }
    // V: mỗi đoạn = 1 chữ A ĐẦY (bước = aH_global), xếp tuần tự sát nhau, KHÔNG đè nhau.
    const hV = aH_global;
    const vSegs = aSegs(cntV);
    let offY = -(vSegs.length - cntV) * hV;
    for (let i = 0; i < vSegs.length; i++) {
      let z;
      if (anchorV === "B") z = { kind: "V", bounds: [cy2 + offY, vx1, cy2 + offY + hV, vx2] };
      else                 z = { kind: "V", bounds: [cy1 - offY - hV, vx1, cy1 - offY, vx2] };
      guideZones.push(z);
      offY += hV;
    }
  }

  // Tìm div .name-error nằm dưới name-row của 1 field bắt buộc
  function requiredErrorEl(inputEl) {
    if (!inputEl) return null;
    // input → .name-row → .name-field (label) → .name-error
    const field = inputEl.parentNode && inputEl.parentNode.parentNode;
    return field ? field.querySelector(".name-error") : null;
  }
  function setRequiredError(inputEl, msg) {
    const el = requiredErrorEl(inputEl);
    if (el) { el.textContent = msg; el.classList.add("show"); }
  }
  function clearRequiredError(inputEl) {
    const el = requiredErrorEl(inputEl);
    if (el) { el.textContent = ""; el.classList.remove("show"); }
  }

  // Flag a REQUIRED name field (logo / letter-A) as missing: red border, expand the
  // spacing section if collapsed, focus + scroll the field into view, and show the error.
  function flagMissingRequired(inputEl, msg) {
    try {
      if (inputEl) inputEl.classList.add("has-warning");
      const sec = document.getElementById("sectionSpacing");
      if (sec) sec.classList.remove("collapsed");
      if (inputEl) {
        inputEl.focus();
        try { inputEl.scrollIntoView({ block: "center" }); } catch(_) {}
      }
    } catch(_) {}
    setRequiredError(inputEl, msg);   // thay cho setStatus(...) — chỉ báo dưới ô input
  }

  async function applyAirbusLayout() {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }

    // Pre-check: phát hiện ô A count có giá trị ngoài 0–5 TRƯỚC khi cntVal() tự sửa.
    // Cần check raw value vì user có thể chưa blur (chưa trigger auto-correct).
    const badCnts = cntInputs.filter(el => {
      const v = parseFloat(String(el.value || "").trim().replace(",", "."));
      return !isFinite(v) || v < 0 || v > CNT_MAX;
    });
    if (badCnts.length > 0) {
      // Force blur để auto-correct + hiện warning div trước
      badCnts.forEach(el => el.dispatchEvent(new Event("blur")));
      setStatus(
        badCnts.length + " A count field" + (badCnts.length > 1 ? "s" : "") +
        " must be a number between 0 and " + CNT_MAX + ". Values have been corrected — review highlighted fields and apply again.",
        "warn"
      );
      return;
    }

    // 1. Resolve logo BY NAME (required). Missing → red border + jump to the field + stop.
    const logo = resolveFitTarget();
    if (!logo || !isLayerValid(logo)) {
      flagMissingRequired(inpFitName, "Logo \"" + fitTargetName + "\" not found — rename a layer to this name (Set) or fix the name.");
      return;
    }
    inpFitName.classList.remove("has-warning");
    clearRequiredError(inpFitName);
    // 2. Resolve letter-A BY NAME (required). Missing → red border + jump to the field + stop.
    const letterRef = resolveLetterRef();
    if (!letterRef || !isLayerValid(letterRef)) {
      flagMissingRequired(inpLetterRefName, "Letter-A \"" + letterRefName + "\" not found — create the 'guide' (with letter-A) or fix the name.");
      return;
    }
    inpLetterRefName.classList.remove("has-warning");
    clearRequiredError(inpLetterRefName);
    if (logo && letterRef.id === logo.id) {
      setStatus("Error: letter-A and logo are the same layer. Rename the correct letter-A layer.", "err");
      return;
    }
    const pageW = currentDoc.width;
    const pageH = currentDoc.height;

    // 3. Logo — use the current size (user resized it manually), do not scale to colW
    const lb    = boundsOf(logo);   // real box — must match the baseline source (boundsOf)
    const lx1 = lb.left, ly1 = lb.top, lx2 = lb.right, ly2 = lb.bottom;
    const curLogoW = lx2 - lx1;
    const curLogoH = ly2 - ly1;
    if (curLogoW <= 0 || curLogoH <= 0) { setStatus("Logo has zero size.", "err"); return; }
    const logoScale = 1;
    const newLogoW  = curLogoW;
    const newLogoH  = curLogoH;

    // 4. SPACING UNIT = letter-A auto-sized to the logo's HEIGHT.
    // The logo is a wordmark, so its bounding-box height == the cap-height of the "A" inside it,
    // and the 'guide' letter-A always matches that "A". So we don't need a captured baseline:
    //   aH = current logo height; aW = scale letter-A's own aspect ratio to that height.
    // letter-A's absolute size is irrelevant (only its ratio is used) — STEP3 then resizes it to aW×aH.
    const lab = boundsOf(letterRef);
    const curAW = lab.right - lab.left;
    const curAH = lab.bottom - lab.top;
    if (curAW <= 0 || curAH <= 0) {
      setStatus("Letter reference \"" + letterRefName + "\" has zero size.", "err");
      return;
    }

    const aH = curLogoH;                 // letter-A height = logo height (wordmark cap-height)
    const aW = curAW * (aH / curAH);     // width auto-expands, preserves the A glyph aspect ratio
    aW_global = aW;
    aH_global = aH;

    // === STEP3 — resize ALL letter-A in the 'guide' group to aW×aH (new size) ===
    let outlineBounds = null;   // BORDER (Outline) bounds — used as trim for STEP4
    try {
      const guideC = findContainerByExactName(currentDoc, "guide");
      if (!guideC) { setStatus("Group 'guide' not found.", "err"); return; }
      const children = getContainerChildren(guideC);
      const isPageSized = (l) => { const b=l.bounds;
        return (b.right-b.left) >= 0.8*pageW && (b.bottom-b.top) >= 0.8*pageH; };
      const markers = [];
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        if (!ch || !isLayerValid(ch)) continue;
        if (ch.id === logo.id) continue;
        if (isPageSized(ch)) {
          const ob = boundsOf(ch);   // real border (excludes effects) — used as trim
          outlineBounds = [ob.top, ob.left, ob.bottom, ob.right];
          continue;
        }
        markers.push(ch);
      }
      if (letterRef && !markers.some(m => m.id === letterRef.id)) markers.push(letterRef);
      const psR = getPhotoshop();
      await psR.core.executeAsModal(async () => {
        for (let i = 0; i < markers.length; i++) {
          const m = markers[i];
          // Gỡ mask cũ TRƯỚC khi đọc bounds + resize (mask cũ làm sai kích thước → scale lệch).
          try { await clearLayerMask(m); } catch(_) {}
          try { const mb = boundsOf(m); await setLayerGeometricBounds(m, mb.top, mb.left, mb.top + aH, mb.left + aW); }
          catch(e) {}
        }
      }, { commandName: "Resize A markers" });
    } catch(e) { setStatus("STEP3 error: " + (e.message || e), "err"); return; }
    // (no return — fall through to STEP4 to reposition components)

    // BORDER = Outline (if detected in STEP3), else canvas
    const trimBounds = outlineBounds || [0, 0, pageH, pageW];

    const placedBounds = {};

    let urlItem = null, newUrlW = 0, newUrlH = 0;
    let qrItem  = null, qrNewW  = 0, qrNewH  = 0;
    let mainItem = null, campItem = null, subItem = null, ctaItem = null;
    let mainData = null, campData = null, subData = null, ctaData = null;

    // Resolve items + compute sizes
    if (chkPlaceUrl.checked) {
      urlItem = resolveComponentLayer("url", urlBlockName);
      if (!urlItem || !isLayerValid(urlItem)) {
        urlItem = null;
      } else {
        const ub = boundsOf(urlItem);
        const curUrlW = ub.right - ub.left, curUrlH = ub.bottom - ub.top;
        if (curUrlW <= 0 || curUrlH <= 0) {
          urlItem = null;
        } else {
          const urlScale = (newLogoW * 0.5) / curUrlW;
          newUrlW = curUrlW * urlScale;
          newUrlH = curUrlH * urlScale;
        }
      }
    }

    if (chkPlaceQr.checked) {
      qrItem = resolveComponentLayer("qr", qrBlockName);
      if (!qrItem || !isLayerValid(qrItem)) {
        qrItem = null;
      } else {
        const qb = boundsOf(qrItem);
        const curW = qb.right - qb.left, curH = qb.bottom - qb.top;
        if (curW <= 0 || curH <= 0) {
          qrItem = null;
        } else {
          qrNewH = 2 * aH;
          qrNewW = curW * (qrNewH / curH);
        }
      }
    }

    function resolveTextLayer(checkbox, key, name) {
      if (!checkbox.checked) return null;
      const it = resolveComponentLayer(key, name);
      if (!it || !isLayerValid(it)) return null;
      const ib = boundsOf(it);                 // real TEXT box (excludes glow/shadow)
      const be = it.bounds, bn = ib;           // [fxchk] measure effect inflation
      const curW = ib.right - ib.left, curH = ib.bottom - ib.top;
      if (curW <= 0 || curH <= 0) return null;
      return { item: it, w: curW, h: curH };
    }
    mainData = resolveTextLayer(chkPlaceMain, "main", mainName);
    campData = resolveTextLayer(chkPlaceCamp, "camp", campName);
    subData  = resolveTextLayer(chkPlaceSub,  "sub",  subName);
    ctaData  = resolveTextLayer(chkPlaceCta,  "cta",  ctaName);
    mainItem = mainData ? mainData.item : null;
    campItem = campData ? campData.item : null;
    subItem  = subData  ? subData.item  : null;
    ctaItem  = ctaData  ? ctaData.item  : null;

    // 7. Build placement plans (same logic as InDesign plugin)
    const logoCntH = cntVal(selLogoCntH, 2);
    const logoCntV = cntVal(selLogoCntV, 2);

    function getRefBounds(refName) {
      if (refName === "trim")   return { bounds: trimBounds,   isContainer: true };
      if (placedBounds[refName]) return { bounds: placedBounds[refName], isContainer: false };
      const itemMap = { logo: logo, url: urlItem, qr: qrItem, main: mainItem, camp: campItem, sub: subItem, cta: ctaItem };
      const it = itemMap[refName];
      if (it && isLayerValid(it)) {
        const ib = boundsOf(it);   // ref by the REAL edge, not the effect box
        return { bounds: [ib.top, ib.left, ib.bottom, ib.right], isContainer: false };
      }
      return { bounds: trimBounds, isContainer: true };
    }

    function computeWithRefs(w, h, anchorH, anchorV, padH, padV, refH, refV) {
      const rH = getRefBounds(refH);
      const rV = getRefBounds(refV);
      return computeComponentBounds(
        w, h, anchorH, anchorV, padH, padV, pageW, pageH,
        rH.bounds, rV.bounds, rH.isContainer, rV.isContainer
      );
    }

    function isContainerRef(refName) { return refName === "trim"; }

    const plans = [
      chkPlaceLogo.checked && {
        key: "logo", w: newLogoW, h: newLogoH,
        anchorH: selLogoH.value, anchorV: selLogoV.value,
        padH: logoCntH * aW, padV: logoCntV * aH,
        refH: selLogoRefH.value, refV: selLogoRefV.value
      },
      urlItem && {
        key: "url", w: newUrlW, h: newUrlH,
        anchorH: selUrlH.value, anchorV: selUrlV.value,
        padH: cntVal(selUrlCntH, 2) * aW,
        padV: cntVal(selUrlCntV, 2) * aH,
        refH: selUrlRefH.value, refV: selUrlRefV.value
      },
      qrItem && {
        key: "qr", w: qrNewW, h: qrNewH,
        anchorH: selQrH.value, anchorV: selQrV.value,
        padH: cntVal(selQrCntH, 1) * aW,
        padV: cntVal(selQrCntV, 1) * aH,
        refH: selQrRefH.value, refV: selQrRefV.value
      },
      mainData && {
        key: "main", w: mainData.w, h: mainData.h,
        anchorH: selMainH.value, anchorV: selMainV.value,
        padH: cntVal(selMainCntH, 2) * aW,
        padV: cntVal(selMainCntV, 2) * aH,
        refH: selMainRefH.value, refV: selMainRefV.value
      },
      campData && {
        key: "camp", w: campData.w, h: campData.h,
        anchorH: selCampH.value, anchorV: selCampV.value,
        padH: cntVal(selCampCntH, 2) * aW,
        padV: cntVal(selCampCntV, 2) * aH,
        refH: selCampRefH.value, refV: selCampRefV.value
      },
      subData && {
        key: "sub", w: subData.w, h: subData.h,
        anchorH: selSubH.value, anchorV: selSubV.value,
        padH: cntVal(selSubCntH, 1) * aW,
        padV: cntVal(selSubCntV, 2) * aH,
        refH: selSubRefH.value, refV: selSubRefV.value
      },
      ctaData && {
        key: "cta", w: ctaData.w, h: ctaData.h,
        anchorH: selCtaH.value, anchorV: selCtaV.value,
        padH: cntVal(selCtaCntH, 2) * aW,
        padV: cntVal(selCtaCntV, 2) * aH,
        refH: selCtaRefH.value, refV: selCtaRefV.value
      }
    ].filter(Boolean);

    const fixedOrder = ["logo", "url", "qr", "sub", "camp", "main", "cta"];
    function planSort(a, b) { return fixedOrder.indexOf(a.key) - fixedOrder.indexOf(b.key); }
    const pass1 = plans.filter(p => isContainerRef(p.refH) && isContainerRef(p.refV)).sort(planSort);
    const pass2 = plans.filter(p => !isContainerRef(p.refH) || !isContainerRef(p.refV)).sort(planSort);

    function runPlan(p) {
      const bounds = computeWithRefs(p.w, p.h, p.anchorH, p.anchorV, p.padH, p.padV, p.refH, p.refV);
      placedBounds[p.key] = bounds;
    }
    pass1.forEach(runPlan);
    pass2.forEach(runPlan);

    const logoNewBounds = placedBounds.logo || null;
    const urlNewBounds  = placedBounds.url  || null;
    const qrNewBounds   = placedBounds.qr   || null;
    const mainNewBounds = placedBounds.main || null;
    const campNewBounds = placedBounds.camp || null;
    const subNewBounds  = placedBounds.sub  || null;
    const ctaNewBounds  = placedBounds.cta  || null;

    // Guide container + constants + counts (once) for zone/clone
    const guideC5 = findContainerByExactName(currentDoc, "guide");
    const _psC = getPhotoshop();
    const _Cn = (_psC && (_psC.constants || _psC.Constants)) || null;
    const PLACE_AT_END = _Cn && _Cn.ElementPlacement ? _Cn.ElementPlacement.PLACEATEND : undefined;
    const isPageSized5 = (l)=>{const b=l.bounds; return (b.right-b.left)>=0.8*pageW && (b.bottom-b.top)>=0.8*pageH;};
    const cntUrlH=cntVal(selUrlCntH,2),  cntUrlV=cntVal(selUrlCntV,2);
    const cntQrH=cntVal(selQrCntH,2),    cntQrV=cntVal(selQrCntV,2);
    const cntMainH=cntVal(selMainCntH,2), cntMainV=cntVal(selMainCntV,2);
    const cntCampH=cntVal(selCampCntH,2), cntCampV=cntVal(selCampCntV,2);
    const cntSubH=cntVal(selSubCntH,1),  cntSubV=cntVal(selSubCntV,2);
    const cntCtaH=cntVal(selCtaCntH,2),  cntCtaV=cntVal(selCtaCntV,2);

    // === STEP4 move components + STEP6 zones follow REAL positions, place A (NO delete) ===
    try {
      const fmt = (b) => b ? b.map(Math.round).join(",") : "—";
      const psM = getPhotoshop();
      const moveOne = async (label, item, bnds) => {
        if (!bnds || !item) return;
        const bf = boundsOf(item);
        await setLayerGeometricBounds(item, ...bnds);
        const af = boundsOf(item);
      };
      let placed = 0, cloned = 0, deleted = 0;
      await psM.core.executeAsModal(async () => {
        // STEP4 — move components
        if (chkPlaceLogo.checked && logoNewBounds) await moveOne("logo", logo, logoNewBounds);
        await moveOne("URL",  urlItem,  urlNewBounds);
        await moveOne("QR",   qrItem,   qrNewBounds);
        await moveOne("Main", mainItem, mainNewBounds);
        await moveOne("Camp", campItem, campNewBounds);
        await moveOne("Sub",  subItem,  subNewBounds);
        if (ctaNewBounds) await moveOne("CTA", ctaItem, ctaNewBounds);

        // STEP7 — FORCE-snap the left edge of every left-anchored-to-border item to (border + N×A).
        // Read the REAL bounds after move then translate horizontally directly → force left gap = N letter-A,
        // regardless of any drift from the earlier move. Idempotent (item already correct → dx≈0 → no-op).
        const bLft = trimBounds[1];
        const snapLeftToBorder = async (label, item, anchorH, refH, cntH) => {
          if (!item || anchorH !== "L" || refH !== "trim") return;
          const targetLeft = bLft + cntH * aW;       // border + N×A
          const cur = boundsOf(item).left;           // real TEXT edge (excludes effects)
          const dx  = targetLeft - cur;
          if (Math.abs(dx) > 0.5) {
            await item.translate(dx, 0);             // HORIZONTAL only, leaves vertical untouched
          } else {
          }
        };
        if (urlItem)  await snapLeftToBorder("URL",  urlItem,  selUrlH.value,  selUrlRefH.value,  cntUrlH);
        if (qrItem)   await snapLeftToBorder("QR",   qrItem,   selQrH.value,   selQrRefH.value,   cntQrH);
        if (mainItem) await snapLeftToBorder("Main", mainItem, selMainH.value, selMainRefH.value, cntMainH);
        if (campItem) await snapLeftToBorder("Camp", campItem, selCampH.value, selCampRefH.value, cntCampH);
        if (subItem)  await snapLeftToBorder("Sub",  subItem,  selSubH.value,  selSubRefH.value,  cntSubH);
        if (ctaItem)  await snapLeftToBorder("CTA",  ctaItem,  selCtaH.value,  selCtaRefH.value,  cntCtaH);

        // STEP6 — zones follow REAL positions (read the artwork edge after move, excludes effects)
        const realB = (it) => { const b = boundsOf(it); return [b.top, b.left, b.bottom, b.right]; };
        const guideZones = [];
        if (chkPlaceLogo.checked && logoNewBounds && logo) {
          const [ny1,nx1,ny2,nx2] = realB(logo);
          const cAx1 = (selLogoH.value==="R") ? nx2-aW : nx1;
          const cAy1 = (selLogoV.value==="B") ? ny2-aH : ny1;
          const z = computeLogoGuideZones([cAy1,cAx1,cAy1+aH,cAx1+aW], realB(logo),
            selLogoH.value, selLogoV.value, logoCntH, logoCntV);
          for (let i=0;i<z.length;i++) guideZones.push(z[i]);
        }
        if (urlNewBounds && urlItem)   pushZonesForPseudoComponent(guideZones, realB(urlItem),  selUrlH.value, selUrlV.value, cntUrlH, cntUrlV);
        if (qrNewBounds && qrItem)     pushZonesFixed2AColumn(guideZones, realB(qrItem),   selQrH.value, selQrV.value, cntQrH, cntQrV);
        if (mainNewBounds && mainItem) pushZonesForPseudoComponent(guideZones, realB(mainItem), selMainH.value, selMainV.value, cntMainH, cntMainV);
        if (campNewBounds && campItem) pushZonesFixed2AColumn(guideZones, realB(campItem), selCampH.value, selCampV.value, cntCampH, cntCampV, {forceHBottom:true});
        if (subNewBounds && subItem)   pushZonesFixed2AColumn(guideZones, realB(subItem),  selSubH.value, selSubV.value, cntSubH, cntSubV, {forceHBottom:true});
        if (ctaNewBounds && ctaItem)   pushZonesForPseudoComponent(guideZones, realB(ctaItem),  selCtaH.value, selCtaV.value, cntCtaH, cntCtaV);

        // STEP6 — place letter-A into zones (reuse → clone, NO delete). Reference A goes first + protected.
        const kids = guideC5 ? getContainerChildren(guideC5) : [];
        let refM = null; const others = [];
        for (let i = 0; i < kids.length; i++) {
          const ch = kids[i];
          if (!ch || !isLayerValid(ch)) continue;
          if (ch.id === logo.id) continue;
          if (isPageSized5(ch)) continue;                          // Outline
          if (letterRef && ch.id === letterRef.id) { refM = ch; continue; }
          others.push(ch);
        }
        const ordered = refM ? [refM, ...others] : others;
        const isRef = (m) => letterRef && m && m.id === letterRef.id;
        // Mọi ô đều là 1 chữ A ĐẦY, xếp tuần tự không đè nhau → không còn ô lẻ/mask.
        // Thứ tự đặt không ảnh hưởng hình thức cuối cùng (các chữ A giống hệt nhau).
        const orderedZones = guideZones;
        const usedIds = new Set();
        let oi = 0;
        for (let zi = 0; zi < orderedZones.length; zi++) {
          const z = orderedZones[zi];
          let t = null;
          // reuse marker đang có
          while (oi < ordered.length) {
            const cand = ordered[oi++];
            if (!cand || !isLayerValid(cand)) continue;
            t = cand; break;
          }
          if (!t) {                                                // clone thêm (reuse lần sau)
            if (!letterRef) break;
            t = await letterRef.duplicate();
            try { t.name = "A-guide-clone"; } catch(_) {}
            // Reliably put the clone INSIDE 'guide' so next Apply collects it (reuse + surplus delete).
            if (guideC5) moveIntoGroup(_psC, t, guideC5.node);
            cloned++;
          }
          const placeB = z.bounds;                                 // chữ A đầy, không bóp/cắt
          await setLayerGeometricBounds(t, ...placeB);
          try { t.opacity = 50; } catch(_) {}
          usedIds.add(t.id);
          placed++;
        }
        // Delete SURPLUS markers (existing nhưng không dùng tới) để không tích tụ / kẹt vị trí cũ
        // qua các lần apply. NEVER delete the reference letter-A (template + layer thật của user).
        for (let j = 0; j < ordered.length; j++) {
          const m = ordered[j];
          if (!m || !isLayerValid(m)) continue;
          if (usedIds.has(m.id)) continue;
          if (isRef(m)) continue;                                  // protect reference letter-A
          try { await m.delete(); deleted++; }
          catch(e) {}
        }
      }, { commandName: "Airbus layout — components + A guides" });

      refreshAllAvailability();
      const parts = [];
      if (chkPlaceLogo.checked && logoNewBounds) parts.push("logo " + selLogoV.value + selLogoH.value);
      if (urlNewBounds)  parts.push("URL");
      if (qrNewBounds)   parts.push("QR");
      if (mainNewBounds) parts.push("Main");
      if (campNewBounds) parts.push("Camp");
      if (subNewBounds)  parts.push("Sub");
      if (ctaNewBounds) parts.push("CTA");
      setStatus("Spacing — " + (parts.join(", ") || "(none)") +
                " + " + placed + " letter-A (clone " + cloned + ", del " + deleted + ")" +
                " | A=" + Math.round(aW)+"×"+Math.round(aH) + "px.", "ok");
    } catch(e) {
      setStatus("Apply error: " + (e.message || e), "err");
    }
    return;
  }

  // ─── Name input events ─────────────────────────────────────────────────────
  inpFitName.addEventListener("input", () => {
    fitTargetName = inpFitName.value;
    fitTargetId   = null;
    updateFitTargetBadge();
    refreshAllRefSelects();
    updateComponentAvailability("logo");
    persistFitTarget();
  });
  inpLetterRefName.addEventListener("input", () => {
    letterRefName = inpLetterRefName.value;
    letterRefId   = null;
    updateComponentAvailability("letter");
    persistFitTarget();
  });
  inpUrlBlockName.addEventListener("input", () => {
    urlBlockName = inpUrlBlockName.value;
    urlId        = null;
    refreshAllRefSelects();
    updateComponentAvailability("url");
    persistFitTarget();
  });
  inpQrBlockName.addEventListener("input", () => {
    qrBlockName = inpQrBlockName.value;
    qrId        = null;
    refreshAllRefSelects();
    updateComponentAvailability("qr");
    persistFitTarget();
  });
  inpMainName.addEventListener("input", () => {
    mainName = inpMainName.value;
    mainId   = null;
    refreshAllRefSelects();
    updateComponentAvailability("main");
    persistFitTarget();
  });
  inpCampName.addEventListener("input", () => {
    campName = inpCampName.value;
    campId   = null;
    refreshAllRefSelects();
    updateComponentAvailability("camp");
    persistFitTarget();
  });
  inpSubName.addEventListener("input", () => {
    subName = inpSubName.value;
    subId   = null;
    refreshAllRefSelects();
    updateComponentAvailability("sub");
    persistFitTarget();
  });
  inpCtaName.addEventListener("input", () => {
    ctaName = inpCtaName.value;
    ctaId   = null;
    refreshAllRefSelects();
    updateComponentAvailability("cta");
    persistFitTarget();
  });

  // ─── Set name buttons ─────────────────────────────────────────────────────
  function getSelection() {
    try {
      const ps = getPhotoshop();
      const layers = ps.app.activeDocument.activeLayers;
      return layers ? Array.from(layers) : [];
    } catch(_) { return []; }
  }

  async function handleSetName(key) {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }
    const map = getComponentMap();
    const c = map[key];
    if (!c) return;
    const sel = getSelection();
    if (sel.length === 0) { setStatus("Select a layer first.", "warn"); return; }
    if (sel.length > 1)   { setStatus("Select exactly one layer.", "warn"); return; }
    const newName = c.input.value.trim();
    if (!newName) { setStatus("Name is empty.", "warn"); return; }
    const ps = getPhotoshop();
    await ps.core.executeAsModal(async () => {
      sel[0].name = newName;
    }, { commandName: "Rename layer" });
    // Set is now a PURE RENAME — no ID pinning, no baseline. Apply resolves by name.
    // Vừa Set xong layer có đúng tên field → clear error đỏ dưới ô (logo / letter-A).
    c.input.classList.remove("has-warning");
    clearRequiredError(c.input);
    // Keep the convenience of ticking the component's place checkbox after renaming.
    if (c.checkbox) c.checkbox.checked = true;
    updateComponentAvailability(key);
    refreshAllRefSelects();
    persistFitTarget();
    setStatus("Renamed layer → \"" + newName + "\" ✓", "ok");
  }

  document.querySelectorAll(".btn-set").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-set-for");
      handleSetName(key).catch(e => setStatus("Set name failed: " + (e.message || e), "err"));
    });
  });

  // ─── Checkbox / selector change events → persist ──────────────────────────
  [chkPlaceLogo, chkPlaceUrl, chkPlaceQr, chkPlaceMain, chkPlaceCamp, chkPlaceSub, chkPlaceCta].forEach(
    el => el.addEventListener("change", persistFitTarget)
  );
  [selLogoH, selLogoV, selUrlH, selUrlV, selQrH, selQrV,
   selMainH, selMainV, selCampH, selCampV, selSubH, selSubV, selCtaH, selCtaV,
   selLogoCntH, selLogoCntV, selUrlCntH, selUrlCntV, selQrCntH, selQrCntV,
   selMainCntH, selMainCntV, selCampCntH, selCampCntV, selSubCntH, selSubCntV,
   selCtaCntH, selCtaCntV,
   ...refSelects
  ].forEach(s => s.addEventListener("change", persistFitTarget));

  // Count inputs: chuẩn hóa khi rời ô (làm tròn 1 chữ số thập phân, ≥ 0, rỗng/lỗi → default).
  // Nếu giá trị bị điều chỉnh → flash vàng 1.2s để user biết.
  cntInputs.forEach(el => {
    el.addEventListener("blur", () => {
      const raw = el.value;
      const warnEl = getCntWarnEl(el);
      const trimmed = String(raw).trim().replace(",", ".");
      let msg = "";
      if (trimmed === "") {
        msg = "Required";
      } else {
        const rawNum = parseFloat(trimmed);
        if (!isFinite(rawNum)) {
          msg = "Not a number";
        } else if (rawNum < 0 || rawNum > CNT_MAX) {
          msg = "Must be 0–" + CNT_MAX;
        } else {
          el.value = String(Math.round(rawNum * 10) / 10);
        }
      }
      if (msg) {
        el.classList.add("input-corrected");
        setTimeout(() => el.classList.remove("input-corrected"), 1200);
        if (warnEl) { warnEl.textContent = msg; warnEl.classList.add("show"); }
      } else {
        if (warnEl) { warnEl.textContent = ""; warnEl.classList.remove("show"); }
      }
      persistFitTarget();
    });
    el.addEventListener("keydown", (e) => {
      const allowed = [
        "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Tab", "Home", "End", ".", ","
      ];
      if (allowed.includes(e.key)) return;
      if (e.key >= "0" && e.key <= "9") return;
      e.preventDefault();
    });
  });

  btnApplyLayout.addEventListener("click", () => {
    applyAirbusLayout().catch(e => setStatus("Apply spacing failed: " + (e.message || e), "err"));
  });

  const btnCaptureSel = $("btnCaptureSel");
  if (btnCaptureSel) {
    btnCaptureSel.addEventListener("click", () => {
      captureLetterFromSelection().catch(e => setStatus("Capture failed: " + (e.message || e), "err"));
    });
  }
  const btnCreateGuide = $("btnCreateGuide");
  if (btnCreateGuide) {
    btnCreateGuide.addEventListener("click", () => {
      createGuideFromSelection().catch(e => setStatus("Create guide failed: " + (e.message || e), "err"));
    });
  }

  const btnResetOptions = $("btnResetOptions");
  if (btnResetOptions) {
    btnResetOptions.addEventListener("click", () => {
      resetSpacingControlsToDefault();
      refreshAllAvailability();   // re-disable checkboxes for components not present
      persistFitTarget();
      setStatus("Reset options to defaults.", "ok");
    });
  }

  // ─── Collapsible sections ──────────────────────────────────────────────────
  document.querySelectorAll(".section-header").forEach(header => {
    header.addEventListener("click", () => {
      const section = header.parentElement;
      if (section) section.classList.toggle("collapsed");
      persistFitTarget();
    });
  });

  // ─── Unit selector ─────────────────────────────────────────────────────────
  selUnit.addEventListener("change", () => {
    const oldUnit = displayUnitName;
    const newUnit = selUnit.value || "px";
    const numInputs = [
      inpPageW, inpPageH
    ];
    const oldFactor = pxPerUnit(oldUnit);
    const newFactor = pxPerUnit(newUnit);
    let hadValue = false;
    numInputs.forEach(inp => {
      const v = parseFloat(String(inp.value || "").replace(",", "."));
      if (isNaN(v)) return;
      hadValue = true;
      const px = v / oldFactor;
      inp.value = formatNumber(px * newFactor);
    });
    displayUnitName = newUnit;
    if (hadValue) setStatus("Unit: " + newUnit, "ok");
    persistFitTarget();
  });

  // ─── Initial load ──────────────────────────────────────────────────────────
  function initialRefresh(attempt) {
    refresh();
    if (!currentDoc && attempt < 6 && !getPhotoshop()) {
      setTimeout(() => initialRefresh(attempt + 1), 500);
    } else {
      loadFitTarget();
    }
  }
  initialRefresh(0);
});
