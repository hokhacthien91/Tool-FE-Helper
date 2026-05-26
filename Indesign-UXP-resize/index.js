document.addEventListener("DOMContentLoaded", () => {

  // ─── State ─────────────────────────────────────────────────────────────────
  let currentDoc      = null;
  let currentPage     = null;
  let displayUnitName = "pt";
  let scopeMode       = "active"; // "active" | "all"
  let snapshot        = null;     // for revert

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const elDocName   = $("docName");
  const elDocUnit   = $("docUnit");
  const elStatus    = $("statusBar");

  const tabActive   = $("tabActive");
  const tabAll      = $("tabAll");
  const pagePicker  = $("pagePicker");
  const selPage     = $("selPage");
  const allPagesView= $("allPagesView");
  const allPagesList= $("allPagesList");

  const inpPageW    = $("inpPageW");
  const inpPageH    = $("inpPageH");

  const inpBleedT   = $("inpBleedT");
  const inpBleedB   = $("inpBleedB");
  const inpBleedI   = $("inpBleedI");
  const inpBleedO   = $("inpBleedO");

  const inpMarginT  = $("inpMarginT");
  const inpMarginB  = $("inpMarginB");
  const inpMarginL  = $("inpMarginL");
  const inpMarginR  = $("inpMarginR");

  const inpColCount = $("inpColCount");
  const inpColGutter= $("inpColGutter");
  const colWidthHint= $("colWidthHint");

  const fitTargetStatus = $("fitTargetStatus");
  const inpFitName      = $("inpFitName");
  const inpLetterRefName= $("inpLetterRefName");
  const inpUrlBlockName = $("inpUrlBlockName");
  const inpQrBlockName  = $("inpQrBlockName");
  const inpMainName     = $("inpMainName");
  const inpCampName     = $("inpCampName");
  const inpSubName      = $("inpSubName");
  const chkPlaceLogo    = $("chkPlaceLogo");
  const chkPlaceUrl     = $("chkPlaceUrl");
  const chkPlaceQr      = $("chkPlaceQr");
  const chkPlaceMain    = $("chkPlaceMain");
  const chkPlaceCamp    = $("chkPlaceCamp");
  const chkPlaceSub     = $("chkPlaceSub");
  const selLogoH = $("selLogoH"), selLogoV = $("selLogoV");
  const selUrlH  = $("selUrlH"),  selUrlV  = $("selUrlV");
  const selQrH   = $("selQrH"),   selQrV   = $("selQrV");
  const selMainH = $("selMainH"), selMainV = $("selMainV");
  const selCampH = $("selCampH"), selCampV = $("selCampV");
  const selSubH  = $("selSubH"),  selSubV  = $("selSubV");
  const selLogoCntH = $("selLogoCntH"), selLogoCntV = $("selLogoCntV");
  const selUrlCntH  = $("selUrlCntH"),  selUrlCntV  = $("selUrlCntV");
  const selQrCntH   = $("selQrCntH"),   selQrCntV   = $("selQrCntV");
  const selMainCntH = $("selMainCntH"), selMainCntV = $("selMainCntV");
  const selCampCntH = $("selCampCntH"), selCampCntV = $("selCampCntV");
  const selSubCntH  = $("selSubCntH"),  selSubCntV  = $("selSubCntV");
  const selLogoRefH = $("selLogoRefH"), selLogoRefV = $("selLogoRefV");
  const selUrlRefH  = $("selUrlRefH"),  selUrlRefV  = $("selUrlRefV");
  const selQrRefH   = $("selQrRefH"),   selQrRefV   = $("selQrRefV");
  const selMainRefH = $("selMainRefH"), selMainRefV = $("selMainRefV");
  const selCampRefH = $("selCampRefH"), selCampRefV = $("selCampRefV");
  const selSubRefH  = $("selSubRefH"),  selSubRefV  = $("selSubRefV");

  // Populate A-count dropdowns (1-5, default 2)
  function populateCountSelect(sel) {
    for (let i = 1; i <= 5; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      if (i === 2) opt.selected = true;
      sel.appendChild(opt);
    }
  }
  [selLogoCntH, selLogoCntV, selUrlCntH, selUrlCntV,
   selQrCntH, selQrCntV,
   selMainCntH, selMainCntV, selCampCntH, selCampCntV,
   selSubCntH, selSubCntV].forEach(populateCountSelect);

  // Component-specific A count defaults
  selQrCntH.value = "2";
  selQrCntV.value = "2";
  selSubCntH.value = "1";

  // Populate Ref dropdowns with full layer names. Self-reference excluded.
  function getRefOptions() {
    return [
      { value: "trim",   label: "Trim" },
      { value: "margin", label: "Margin" },
      { value: "logo",   label: fitTargetName },
      { value: "url",    label: urlBlockName },
      { value: "qr",     label: qrBlockName },
      { value: "main",   label: mainName },
      { value: "camp",   label: campName },
      { value: "sub",    label: subName }
    ];
  }
  // Per-select default ref (used on first populate when no previous value)
  const REF_DEFAULTS = {
    selCampRefV: "main",
    selSubRefH:  "qr"
  };
  function populateRefSelect(sel) {
    const self = sel.getAttribute("data-ref-for");
    const prevVal = sel.value;
    sel.innerHTML = "";
    const opts = getRefOptions();
    for (let i = 0; i < opts.length; i++) {
      const opt = opts[i];
      if (opt.value === self) continue;
      const optEl = document.createElement("option");
      optEl.value = opt.value;
      optEl.textContent = opt.label;
      sel.appendChild(optEl);
    }
    const fallback = REF_DEFAULTS[sel.id] || "trim";
    sel.value = prevVal && Array.from(sel.options).some(o => o.value === prevVal) ? prevVal : fallback;
  }
  const refSelects = [
    selLogoRefH, selLogoRefV, selUrlRefH, selUrlRefV,
    selQrRefH, selQrRefV, selMainRefH, selMainRefV,
    selCampRefH, selCampRefV, selSubRefH, selSubRefV
  ];
  function refreshAllRefSelects() { refSelects.forEach(populateRefSelect); }
  // NOTE: do NOT populate here — state vars (fitTargetName, etc.) not declared yet.
  // loadFitTarget() will call refreshAllRefSelects() after state is initialized.

  const btnApplyLayout  = $("btnApplyLayout");
  const btnUndoLayout   = $("btnUndoLayout");

  const btnRefresh  = $("btnRefresh");
  const btnApply    = $("btnApply");
  const btnRevert   = $("btnRevert");

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function setStatus(msg, kind) {
    elStatus.className = "status-bar" + (kind ? " " + kind : "");
    elStatus.textContent = msg || "";
  }

  function getIndesign() {
    try {
      const mod = require("indesign");
      if (!mod) return null;
      // Probe mod.app without throwing — UXP may lazy-init
      try { if (mod.app) return mod; } catch (_) {}
      return mod; // return module anyway; refresh() will guard further
    } catch (e) {
      console.warn("require('indesign') failed:", e && e.message);
      return null;
    }
  }

  // ID enum -> short label
  function unitLabel(unitEnum) {
    const id = getIndesign();
    const M = id.MeasurementUnits;
    if (!M) return "pt";
    if (unitEnum === M.MILLIMETERS)        return "mm";
    if (unitEnum === M.CENTIMETERS)        return "cm";
    if (unitEnum === M.INCHES)             return "in";
    if (unitEnum === M.INCHES_DECIMAL)     return "in";
    if (unitEnum === M.POINTS)             return "pt";
    if (unitEnum === M.PICAS)              return "pc";
    if (unitEnum === M.PIXELS)             return "px";
    if (unitEnum === M.CICEROS)            return "ci";
    if (unitEnum === M.AGATES)             return "ag";
    return "pt";
  }

  // 1 pt = ? in display unit
  function ptPerUnit(unitName) {
    switch (unitName) {
      case "mm": return 1 / 2.834645669;   // 1 mm = 2.834... pt
      case "cm": return 1 / 28.34645669;
      case "in": return 1 / 72;
      case "pc": return 1 / 12;
      case "ag": return 1 / 5.142857;
      case "ci": return 1 / 12.78983;
      case "px":
      case "pt":
      default:   return 1;
    }
  }

  // InDesign API returns numbers in POINTS regardless of ruler unit.
  // Convert pt -> display unit for showing.
  function ptToDisplay(pt) {
    if (pt == null || isNaN(pt)) return "";
    const v = pt * ptPerUnit(displayUnitName);
    return formatNumber(v);
  }

  // Convert display-unit string back to pt for writing.
  function displayToPt(str) {
    if (str == null) return NaN;
    const cleaned = String(str).trim().replace(",", ".");
    const v = parseFloat(cleaned);
    if (isNaN(v)) return NaN;
    return v / ptPerUnit(displayUnitName);
  }

  function formatNumber(v) {
    // Trim trailing zeros, keep up to 4 decimals.
    return parseFloat(v.toFixed(4)).toString();
  }

  // ─── Document refresh ──────────────────────────────────────────────────────
  function refresh() {
    try {
      const id = getIndesign();
      if (!id) {
        setStatus("Initializing… open or focus an InDesign document.", "warn");
        return;
      }
      let app;
      try { app = id.app; } catch (_) { app = null; }
      if (!app) {
        setStatus("InDesign not ready yet. Click ↻ when ready.", "warn");
        return;
      }

      if (!app.documents || app.documents.length === 0) {
        currentDoc = null;
        currentPage = null;
        elDocName.textContent = "(no document)";
        elDocUnit.textContent = "—";
        clearInputs();
        setStatus("Open an InDesign document first.", "warn");
        return;
      }

      currentDoc = app.activeDocument;

      // Resolve display unit from ruler
      const vp = currentDoc.viewPreferences;
      displayUnitName = unitLabel(vp.horizontalMeasurementUnits);
      elDocUnit.textContent = displayUnitName;
      elDocName.textContent = currentDoc.name || "(untitled)";

      // Active page = first page of active spread (fallback to pages[0])
      currentPage = resolveActivePage(currentDoc);

      populatePagePicker();
      readIntoInputs();

      if (scopeMode === "all") {
        renderAllPages();
      }

      snapshot = captureSnapshot();
      // refresh availability if helper exists (may not be defined on early init)
      if (typeof refreshAllAvailability === "function") refreshAllAvailability();

      setStatus("Loaded.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("Refresh failed: " + (e.message || e), "err");
    }
  }

  function resolveActivePage(doc) {
    try {
      const win = doc.windows && doc.windows.length > 0 ? doc.windows.item(0) : null;
      if (win && win.activeSpread) {
        const spread = win.activeSpread;
        if (spread.pages && spread.pages.length > 0) {
          return spread.pages.item(0);
        }
      }
    } catch (_) {}
    return doc.pages.item(0);
  }

  function populatePagePicker() {
    selPage.innerHTML = "";
    const pages = currentDoc.pages;
    let activeIdx = 0;
    for (let i = 0; i < pages.length; i++) {
      const p = pages.item(i);
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "Page " + (p.name || (i + 1));
      selPage.appendChild(opt);
      if (currentPage && p.id === currentPage.id) activeIdx = i;
    }
    selPage.value = String(activeIdx);
  }

  // ─── Read values into inputs ───────────────────────────────────────────────
  function readIntoInputs() {
    if (!currentDoc || !currentPage) {
      clearInputs();
      return;
    }
    const dp = currentDoc.documentPreferences;
    const mp = currentPage.marginPreferences;

    inpPageW.value = ptToDisplay(dp.pageWidth);
    inpPageH.value = ptToDisplay(dp.pageHeight);

    inpBleedT.value = ptToDisplay(dp.documentBleedTopOffset);
    inpBleedB.value = ptToDisplay(dp.documentBleedBottomOffset);
    inpBleedI.value = ptToDisplay(dp.documentBleedInsideOrLeftOffset);
    inpBleedO.value = ptToDisplay(dp.documentBleedOutsideOrRightOffset);

    inpMarginT.value = ptToDisplay(mp.top);
    inpMarginB.value = ptToDisplay(mp.bottom);
    inpMarginL.value = ptToDisplay(mp.left);
    inpMarginR.value = ptToDisplay(mp.right);

    inpColCount.value  = String(mp.columnCount);
    inpColGutter.value = ptToDisplay(mp.columnGutter);

    updateColumnWidthHint();
  }

  function updateColumnWidthHint() {
    if (!colWidthHint) return;
    const pageW   = displayToPt(inpPageW.value);
    const marL    = displayToPt(inpMarginL.value);
    const marR    = displayToPt(inpMarginR.value);
    const count   = parseInt(inpColCount.value, 10);
    const gutter  = displayToPt(inpColGutter.value);

    if (isNaN(pageW) || isNaN(marL) || isNaN(marR) ||
        !Number.isInteger(count) || count < 1 || isNaN(gutter)) {
      colWidthHint.textContent = "Column width: —";
      return;
    }
    const content = pageW - marL - marR;
    const colW    = (content - (count - 1) * gutter) / count;
    if (colW <= 0) {
      colWidthHint.textContent = "Column width: invalid (margins/gutter too large)";
      return;
    }
    colWidthHint.textContent =
      "Column width: " + ptToDisplay(colW) + " " + displayUnitName +
      "  (content " + ptToDisplay(content) + ", gutter " + ptToDisplay(gutter) + ")";
  }

  function clearInputs() {
    [inpPageW, inpPageH,
     inpBleedT, inpBleedB, inpBleedI, inpBleedO,
     inpMarginT, inpMarginB, inpMarginL, inpMarginR,
     inpColCount, inpColGutter].forEach(el => { el.value = ""; });
  }

  // ─── Snapshot / revert ─────────────────────────────────────────────────────
  function captureSnapshot() {
    if (!currentDoc || !currentPage) return null;
    const dp = currentDoc.documentPreferences;
    const mp = currentPage.marginPreferences;
    return {
      pageId: currentPage.id,
      pageW: dp.pageWidth, pageH: dp.pageHeight,
      bleedT: dp.documentBleedTopOffset,
      bleedB: dp.documentBleedBottomOffset,
      bleedI: dp.documentBleedInsideOrLeftOffset,
      bleedO: dp.documentBleedOutsideOrRightOffset,
      marginT: mp.top, marginB: mp.bottom,
      marginL: mp.left, marginR: mp.right,
      colCount: mp.columnCount,
      colGutter: mp.columnGutter
    };
  }

  function revertFromSnapshot() {
    if (!snapshot || !currentDoc) {
      setStatus("Nothing to revert.", "warn");
      return;
    }
    try {
      const id = getIndesign();
      id.app.doScript(function () {
        const dp = currentDoc.documentPreferences;
        dp.pageWidth  = snapshot.pageW;
        dp.pageHeight = snapshot.pageH;
        dp.documentBleedTopOffset            = snapshot.bleedT;
        dp.documentBleedBottomOffset         = snapshot.bleedB;
        dp.documentBleedInsideOrLeftOffset   = snapshot.bleedI;
        dp.documentBleedOutsideOrRightOffset = snapshot.bleedO;

        // Find the snapshot page by id
        const pages = currentDoc.pages;
        let target = null;
        for (let i = 0; i < pages.length; i++) {
          if (pages.item(i).id === snapshot.pageId) { target = pages.item(i); break; }
        }
        if (target && target.isValid) {
          const mp = target.marginPreferences;
          mp.top = snapshot.marginT;
          mp.bottom = snapshot.marginB;
          mp.left = snapshot.marginL;
          mp.right = snapshot.marginR;
          mp.columnCount = snapshot.colCount;
          mp.columnGutter = snapshot.colGutter;
        }
      }, id.ScriptLanguage.JAVASCRIPT, [], id.UndoModes.ENTIRE_SCRIPT, "Revert guides");
      readIntoInputs();
      setStatus("Reverted.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("Revert failed: " + (e.message || e), "err");
    }
  }

  // ─── Apply changes ─────────────────────────────────────────────────────────
  function applyChanges() {
    if (!currentDoc || !currentPage) {
      setStatus("No active document/page.", "err");
      return;
    }

    // Parse and validate
    const v = {
      pageW: displayToPt(inpPageW.value),
      pageH: displayToPt(inpPageH.value),
      bleedT: displayToPt(inpBleedT.value),
      bleedB: displayToPt(inpBleedB.value),
      bleedI: displayToPt(inpBleedI.value),
      bleedO: displayToPt(inpBleedO.value),
      marginT: displayToPt(inpMarginT.value),
      marginB: displayToPt(inpMarginB.value),
      marginL: displayToPt(inpMarginL.value),
      marginR: displayToPt(inpMarginR.value),
      colCount: parseInt(inpColCount.value, 10),
      colGutter: displayToPt(inpColGutter.value)
    };

    const checks = [
      [v.pageW > 0 && v.pageH > 0, "Page size must be positive."],
      [!isNaN(v.bleedT) && !isNaN(v.bleedB) && !isNaN(v.bleedI) && !isNaN(v.bleedO), "Bleed values invalid."],
      [v.bleedT >= 0 && v.bleedB >= 0 && v.bleedI >= 0 && v.bleedO >= 0, "Bleed must be ≥ 0."],
      [!isNaN(v.marginT) && !isNaN(v.marginB) && !isNaN(v.marginL) && !isNaN(v.marginR), "Margin values invalid."],
      [v.marginT >= 0 && v.marginB >= 0 && v.marginL >= 0 && v.marginR >= 0, "Margin must be ≥ 0."],
      [Number.isInteger(v.colCount) && v.colCount >= 1, "Column count must be integer ≥ 1."],
      [!isNaN(v.colGutter) && v.colGutter >= 0, "Gutter must be ≥ 0."]
    ];
    for (const [ok, msg] of checks) {
      if (!ok) { setStatus(msg, "err"); return; }
    }

    try {
      const id = getIndesign();
      id.app.doScript(function () {
        const dp = currentDoc.documentPreferences;
        dp.pageWidth  = v.pageW;
        dp.pageHeight = v.pageH;
        dp.documentBleedTopOffset            = v.bleedT;
        dp.documentBleedBottomOffset         = v.bleedB;
        dp.documentBleedInsideOrLeftOffset   = v.bleedI;
        dp.documentBleedOutsideOrRightOffset = v.bleedO;

        const mp = currentPage.marginPreferences;
        mp.top = v.marginT;
        mp.bottom = v.marginB;
        mp.left = v.marginL;
        mp.right = v.marginR;
        mp.columnCount = v.colCount;
        mp.columnGutter = v.colGutter;
      }, id.ScriptLanguage.JAVASCRIPT, [], id.UndoModes.ENTIRE_SCRIPT, "Update page guides");

      snapshot = captureSnapshot();
      readIntoInputs();
      if (scopeMode === "all") renderAllPages();
      setStatus("Applied.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("Apply failed: " + (e.message || e), "err");
    }
  }

  // ─── All-pages view ────────────────────────────────────────────────────────
  function renderAllPages() {
    allPagesList.innerHTML = "";
    if (!currentDoc) return;
    const dp = currentDoc.documentPreferences;

    const pages = currentDoc.pages;
    for (let i = 0; i < pages.length; i++) {
      const p = pages.item(i);
      const mp = p.marginPreferences;
      const row = document.createElement("div");
      row.className = "page-row";

      const t = document.createElement("div");
      t.className = "page-row-title";
      const left = document.createElement("span");
      left.textContent = "Page " + (p.name || (i + 1));
      const right = document.createElement("span");
      right.className = "muted";
      right.textContent = ptToDisplay(dp.pageWidth) + " × " + ptToDisplay(dp.pageHeight) + " " + displayUnitName;
      t.appendChild(left);
      t.appendChild(right);
      row.appendChild(t);

      row.appendChild(kvRow("Margin (T/B/L/R)",
        [mp.top, mp.bottom, mp.left, mp.right].map(ptToDisplay).join(" / ") + " " + displayUnitName));
      row.appendChild(kvRow("Columns",
        mp.columnCount + " cols, gutter " + ptToDisplay(mp.columnGutter) + " " + displayUnitName));

      allPagesList.appendChild(row);
    }
  }

  function kvRow(k, val) {
    const r = document.createElement("div");
    r.className = "kv";
    const a = document.createElement("span"); a.textContent = k;
    const b = document.createElement("span"); b.textContent = val;
    r.appendChild(a); r.appendChild(b);
    return r;
  }

  // ─── Wire up events ────────────────────────────────────────────────────────
  btnRefresh.addEventListener("click", refresh);
  btnApply  .addEventListener("click", applyChanges);
  btnRevert .addEventListener("click", revertFromSnapshot);

  // Press Enter in any size/margin/column input to Apply
  [inpPageW, inpPageH,
   inpBleedT, inpBleedB, inpBleedI, inpBleedO,
   inpMarginT, inpMarginB, inpMarginL, inpMarginR,
   inpColCount, inpColGutter].forEach(el => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyChanges();
      }
    });
  });

  // Live recompute column width hint
  [inpPageW, inpMarginL, inpMarginR, inpColCount, inpColGutter].forEach(el => {
    el.addEventListener("input", updateColumnWidthHint);
  });

  // ─── Fit object to column width ──────────────────────────────────────────
  const FIT_LABEL_KEY = "pageGuides.fitTarget.v1";
  let fitTargetId    = null;
  let fitTargetName  = "Logo-airbus";
  let letterRefName  = "letter-A";
  let urlBlockName   = "URL-block";
  let qrBlockName    = "QR-code";
  let mainName       = "Main-headline";
  let campName       = "campaign-line";
  let subName        = "Sub-headline";
  let layoutSnapshot = null; // { logo: [bounds], url: [bounds]|null, qr: [bounds]|null, items: {logoRef, urlRef, qrRef} }

  function loadFitTarget() {
    if (!currentDoc) {
      inpFitName.value = fitTargetName;
      inpLetterRefName.value = letterRefName;
      inpUrlBlockName.value = urlBlockName;
      inpQrBlockName.value = qrBlockName;
      inpMainName.value = mainName;
      inpCampName.value = campName;
      inpSubName.value = subName;
      refreshAllRefSelects();
      refreshAllAvailability();
      return;
    }
    try {
      const raw = currentDoc.extractLabel(FIT_LABEL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        fitTargetId   = parsed.id || null;
        fitTargetName = parsed.name || "Logo-airbus";
        letterRefName = parsed.letterRef || "letter-A";
        urlBlockName  = parsed.urlBlock || "URL-block";
        qrBlockName   = parsed.qrBlock  || "QR-code";
        mainName      = parsed.mainName || "Main-headline";
        campName      = parsed.campName || "campaign-line";
        subName       = parsed.subName  || "Sub-headline";
        if (typeof parsed.placeLogo === "boolean") chkPlaceLogo.checked = parsed.placeLogo;
        if (typeof parsed.placeUrl  === "boolean") chkPlaceUrl.checked  = parsed.placeUrl;
        if (typeof parsed.placeQr   === "boolean") chkPlaceQr.checked   = parsed.placeQr;
        if (typeof parsed.placeMain === "boolean") chkPlaceMain.checked = parsed.placeMain;
        if (typeof parsed.placeCamp === "boolean") chkPlaceCamp.checked = parsed.placeCamp;
        if (typeof parsed.placeSub  === "boolean") chkPlaceSub.checked  = parsed.placeSub;
        if (parsed.logoH) selLogoH.value = parsed.logoH;
        if (parsed.logoV) selLogoV.value = parsed.logoV;
        if (parsed.urlH)  selUrlH.value  = parsed.urlH;
        if (parsed.urlV)  selUrlV.value  = parsed.urlV;
        if (parsed.qrH)   selQrH.value   = parsed.qrH;
        if (parsed.qrV)   selQrV.value   = parsed.qrV;
        if (parsed.mainH) selMainH.value = parsed.mainH;
        if (parsed.mainV) selMainV.value = parsed.mainV;
        if (parsed.campH) selCampH.value = parsed.campH;
        if (parsed.campV) selCampV.value = parsed.campV;
        if (parsed.subH)  selSubH.value  = parsed.subH;
        if (parsed.subV)  selSubV.value  = parsed.subV;
        if (parsed.logoCntH) selLogoCntH.value = parsed.logoCntH;
        if (parsed.logoCntV) selLogoCntV.value = parsed.logoCntV;
        if (parsed.urlCntH)  selUrlCntH.value  = parsed.urlCntH;
        if (parsed.urlCntV)  selUrlCntV.value  = parsed.urlCntV;
        if (parsed.qrCntH)   selQrCntH.value   = parsed.qrCntH;
        if (parsed.qrCntV)   selQrCntV.value   = parsed.qrCntV;
        if (parsed.mainCntH) selMainCntH.value = parsed.mainCntH;
        if (parsed.mainCntV) selMainCntV.value = parsed.mainCntV;
        if (parsed.campCntH) selCampCntH.value = parsed.campCntH;
        if (parsed.campCntV) selCampCntV.value = parsed.campCntV;
        if (parsed.subCntH)  selSubCntH.value  = parsed.subCntH;
        if (parsed.subCntV)  selSubCntV.value  = parsed.subCntV;
        if (parsed.logoRefH) selLogoRefH.value = parsed.logoRefH;
        if (parsed.logoRefV) selLogoRefV.value = parsed.logoRefV;
        if (parsed.urlRefH)  selUrlRefH.value  = parsed.urlRefH;
        if (parsed.urlRefV)  selUrlRefV.value  = parsed.urlRefV;
        if (parsed.qrRefH)   selQrRefH.value   = parsed.qrRefH;
        if (parsed.qrRefV)   selQrRefV.value   = parsed.qrRefV;
        if (parsed.mainRefH) selMainRefH.value = parsed.mainRefH;
        if (parsed.mainRefV) selMainRefV.value = parsed.mainRefV;
        if (parsed.campRefH) selCampRefH.value = parsed.campRefH;
        if (parsed.campRefV) selCampRefV.value = parsed.campRefV;
        if (parsed.subRefH)  selSubRefH.value  = parsed.subRefH;
        if (parsed.subRefV)  selSubRefV.value  = parsed.subRefV;
      }
    } catch (_) {}
    inpFitName.value = fitTargetName;
    inpLetterRefName.value = letterRefName;
    inpUrlBlockName.value = urlBlockName;
    inpQrBlockName.value = qrBlockName;
    inpMainName.value = mainName;
    inpCampName.value = campName;
    inpSubName.value = subName;
    refreshAllRefSelects();
    refreshAllAvailability();
    updateFitTargetBadge();
  }

  function persistFitTarget() {
    if (!currentDoc) return;
    try {
      currentDoc.insertLabel(FIT_LABEL_KEY, JSON.stringify({
        id:        fitTargetId,
        name:      fitTargetName,
        letterRef: letterRefName,
        urlBlock:  urlBlockName,
        qrBlock:   qrBlockName,
        mainName:  mainName,
        campName:  campName,
        subName:   subName,
        placeLogo: !!chkPlaceLogo.checked,
        placeUrl:  !!chkPlaceUrl.checked,
        placeQr:   !!chkPlaceQr.checked,
        placeMain: !!chkPlaceMain.checked,
        placeCamp: !!chkPlaceCamp.checked,
        placeSub:  !!chkPlaceSub.checked,
        logoH: selLogoH.value, logoV: selLogoV.value,
        urlH:  selUrlH.value,  urlV:  selUrlV.value,
        qrH:   selQrH.value,   qrV:   selQrV.value,
        mainH: selMainH.value, mainV: selMainV.value,
        campH: selCampH.value, campV: selCampV.value,
        subH:  selSubH.value,  subV:  selSubV.value,
        logoCntH: selLogoCntH.value, logoCntV: selLogoCntV.value,
        urlCntH:  selUrlCntH.value,  urlCntV:  selUrlCntV.value,
        qrCntH:   selQrCntH.value,   qrCntV:   selQrCntV.value,
        mainCntH: selMainCntH.value, mainCntV: selMainCntV.value,
        campCntH: selCampCntH.value, campCntV: selCampCntV.value,
        subCntH:  selSubCntH.value,  subCntV:  selSubCntV.value,
        logoRefH: selLogoRefH.value, logoRefV: selLogoRefV.value,
        urlRefH:  selUrlRefH.value,  urlRefV:  selUrlRefV.value,
        qrRefH:   selQrRefH.value,   qrRefV:   selQrRefV.value,
        mainRefH: selMainRefH.value, mainRefV: selMainRefV.value,
        campRefH: selCampRefH.value, campRefV: selCampRefV.value,
        subRefH:  selSubRefH.value,  subRefV:  selSubRefV.value
      }));
    } catch (e) { console.warn("persist fit target failed", e); }
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

  // ─── Component availability check (name resolves to a real item) ──────────
  // Map each component key → { input, name getter, checkbox (or null), checkable }
  function getComponentMap() {
    return {
      logo:   { input: inpFitName,        getName: () => fitTargetName, checkbox: chkPlaceLogo },
      letter: { input: inpLetterRefName,  getName: () => letterRefName, checkbox: null },
      url:    { input: inpUrlBlockName,   getName: () => urlBlockName,  checkbox: chkPlaceUrl  },
      qr:     { input: inpQrBlockName,    getName: () => qrBlockName,   checkbox: chkPlaceQr   },
      main:   { input: inpMainName,       getName: () => mainName,      checkbox: chkPlaceMain },
      camp:   { input: inpCampName,       getName: () => campName,      checkbox: chkPlaceCamp },
      sub:    { input: inpSubName,        getName: () => subName,       checkbox: chkPlaceSub  }
    };
  }

  function updateComponentAvailability(key) {
    const map = getComponentMap();
    const c = map[key];
    if (!c) return;
    const name = c.getName();
    let found = false;
    if (currentDoc && name) {
      const item = findItemByName(currentDoc, name);
      found = !!(item && item.isValid);
    }
    // Find the .chk-row label and .comp-group ancestor of this checkbox
    let chkRow = null, compGroup = null;
    if (c.checkbox) {
      chkRow    = c.checkbox.closest(".chk-row");
      compGroup = c.checkbox.closest(".comp-group");
    }
    if (found) {
      c.input.classList.remove("has-warning");
      if (c.checkbox) c.checkbox.disabled = false;
      if (chkRow)    chkRow.classList.remove("disabled");
      if (compGroup) compGroup.classList.remove("disabled");
    } else {
      c.input.classList.add("has-warning");
      if (c.checkbox) {
        c.checkbox.disabled = true;
        c.checkbox.checked = false;
      }
      if (chkRow)    chkRow.classList.add("disabled");
      if (compGroup) compGroup.classList.add("disabled");
    }
  }

  function refreshAllAvailability() {
    const map = getComponentMap();
    Object.keys(map).forEach(updateComponentAvailability);
  }

  function findItemByName(doc, keyword) {
    if (!doc || !keyword) return null;
    const kw = String(keyword).toLowerCase().trim();
    if (!kw) return null;
    try {
      const all = doc.allPageItems;
      for (let i = 0; i < all.length; i++) {
        try {
          const it = all[i];
          if (!it) continue;
          // Probe .isValid inside try — invalidated UXP refs throw on access
          let valid = false;
          try { valid = it.isValid; } catch (_) { continue; }
          if (!valid) continue;
          const n = (it.name || "").toLowerCase();
          if (n && n.indexOf(kw) !== -1) return it;
        } catch (_) { /* skip individual stale item */ }
      }
    } catch (e) { console.warn("findItemByName error", e); }
    return null;
  }

  // Find a Layer OR Group whose name matches exactly (case-insensitive).
  // Returns { kind: "layer"|"group", node } or null.
  function findContainerByExactName(doc, name) {
    if (!doc || !name) return null;
    const target = String(name).toLowerCase().trim();
    function safeIsValid(it) {
      try { return it && it.isValid; } catch (_) { return false; }
    }
    try {
      const layers = doc.layers;
      for (let i = 0; i < layers.length; i++) {
        try {
          const ly = layers.item(i);
          if (safeIsValid(ly) && (ly.name || "").toLowerCase() === target) {
            return { kind: "layer", node: ly };
          }
        } catch (_) {}
      }
    } catch (e) { console.warn("layer lookup error", e); }
    try {
      const all = doc.allPageItems;
      for (let i = 0; i < all.length; i++) {
        try {
          const it = all[i];
          if (!safeIsValid(it)) continue;
          if (it.constructor && it.constructor.name === "Group" &&
              (it.name || "").toLowerCase() === target) {
            return { kind: "group", node: it };
          }
        } catch (_) {}
      }
    } catch (e) { console.warn("group lookup error", e); }
    return null;
  }

  // Get children of a layer or group as a plain array of page items.
  function getContainerChildren(container) {
    const out = [];
    if (!container) return out;
    try {
      // Layer has allPageItems (recursive). Group has pageItems collection.
      if (container.kind === "layer") {
        const all = container.node.allPageItems;
        for (let i = 0; i < all.length; i++) {
          if (all[i] && all[i].isValid) out.push(all[i]);
        }
      } else {
        const coll = container.node.pageItems;
        for (let i = 0; i < coll.length; i++) {
          const ch = coll.item(i);
          if (ch && ch.isValid) out.push(ch);
        }
      }
    } catch (e) { console.warn("getContainerChildren error", e); }
    return out;
  }

  function resolveFitTarget() {
    // Priority 1: find by name (so user-edited name in Layers panel always wins)
    const byName = findItemByName(currentDoc, fitTargetName);
    if (byName) {
      fitTargetId = byName.id; // cache for badge
      return byName;
    }
    // Priority 2: fall back to last resolved id (from "Use selection")
    if (fitTargetId) {
      const byId = findPageItemById(currentDoc, fitTargetId);
      if (byId && byId.isValid) return byId;
    }
    return null;
  }

  function computeColumnWidthPt() {
    const pageW   = displayToPt(inpPageW.value);
    const marL    = displayToPt(inpMarginL.value);
    const marR    = displayToPt(inpMarginR.value);
    const count   = parseInt(inpColCount.value, 10);
    const gutter  = displayToPt(inpColGutter.value);
    if (isNaN(pageW) || isNaN(marL) || isNaN(marR) ||
        !Number.isInteger(count) || count < 1 || isNaN(gutter)) return NaN;
    const content = pageW - marL - marR;
    const colW = (content - (count - 1) * gutter) / count;
    return colW > 0 ? colW : NaN;
  }

  // Scale a single item by quadrant anchor. Returns the new height (after scale).
  // newDim is the dimension to match (height OR width) depending on `mode`.
  function computeFittedBounds(item, pageW, pageH, mode, target) {
    const [y1, x1, y2, x2] = item.geometricBounds;
    const curW = x2 - x1;
    const curH = y2 - y1;
    if (curW <= 0 || curH <= 0) return null;
    const scale = (mode === "height") ? (target / curH) : (target / curW);
    const newW = curW * scale;
    const newH = curH * scale;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const anchorLeft = cx <= pageW / 2;
    const anchorTop  = cy <= pageH / 2;
    return {
      bounds: [
        anchorTop  ? y1 : y2 - newH,                 // ny1
        anchorLeft ? x1 : x2 - newW,                 // nx1
        anchorTop  ? y1 + newH : y2,                 // ny2
        anchorLeft ? x1 + newW : x2                  // nx2
      ],
      anchor: (anchorTop ? "T" : "B") + (anchorLeft ? "L" : "R"),
      newH: newH,
      newW: newW
    };
  }

  // ─── Airbus brand layout (Apply / Undo) ──────────────────────────────────

  // Position a component (logo / URL) bounds given size + anchor + padding.
  // h = "L"|"R", v = "T"|"B". padH/padV = padding in pt.
  // refHBounds / refVBounds: bounds of the reference container ({y1,x1,y2,x2} or null).
  // isContainerRefH / isContainerRefV: true if ref is Trim/Margin (pad INSIDE), false if other component (pad OUTSIDE-adjacent).
  function computeComponentBounds(w, h_, anchorH, anchorV, padH, padV, pageW, pageH,
                                  refHBounds, refVBounds, isContainerRefH, isContainerRefV) {
    // Fallback to Trim if no ref provided
    if (!refHBounds) { refHBounds = [0, 0, pageH, pageW]; isContainerRefH = true; }
    if (!refVBounds) { refVBounds = [0, 0, pageH, pageW]; isContainerRefV = true; }

    let x1, x2, y1, y2;

    // Horizontal placement
    if (isContainerRefH) {
      // Container (Trim/Margin): component sits INSIDE ref, anchored to one side.
      if (anchorH === "R") { x2 = refHBounds[3] - padH; x1 = x2 - w; }
      else                 { x1 = refHBounds[1] + padH; x2 = x1 + w; }
    } else {
      // Component ref: component sits OUTSIDE-adjacent.
      // anchor R → component to the LEFT of ref (component.x2 = ref.x1 - padH)
      // anchor L → component to the RIGHT of ref (component.x1 = ref.x2 + padH)
      if (anchorH === "R") { x2 = refHBounds[1] - padH; x1 = x2 - w; }
      else                 { x1 = refHBounds[3] + padH; x2 = x1 + w; }
    }

    // Vertical placement
    if (isContainerRefV) {
      if (anchorV === "B") { y2 = refVBounds[2] - padV; y1 = y2 - h_; }
      else                 { y1 = refVBounds[0] + padV; y2 = y1 + h_; }
    } else {
      // anchor B → component ABOVE ref (component.y2 = ref.y1 - padV)
      // anchor T → component BELOW ref (component.y1 = ref.y2 + padV)
      if (anchorV === "B") { y2 = refVBounds[0] - padV; y1 = y2 - h_; }
      else                 { y1 = refVBounds[2] + padV; y2 = y1 + h_; }
    }

    return [y1, x1, y2, x2];
  }

  // Compute padding zones for one component (logo or URL).
  // Each zone = 2 A's stacked side-by-side, placed against the component edge
  // on the OPPOSITE side of the anchor (i.e. between component and page edge anchor).
  // - Horizontal zone: 2 A's lined up horizontally beside component (between it and side anchor)
  // - Vertical   zone: 2 A's stacked vertically (between component and top/bottom anchor)
  function computeGuideZones(compBounds, anchorH, anchorV, aW, aH) {
    const [y1, x1, y2, x2] = compBounds;
    const zones = [];
    // Horizontal zone (2 A's side by side, full height = aH, aligned vertically with component edge nearest anchor)
    // Place against anchor side, between component and page edge
    if (anchorH === "R") {
      // 2 A's to the RIGHT of component: x starts at x2, total width = 2*aW
      // Vertically aligned to component edge nearest vertical anchor
      const ay1 = (anchorV === "B") ? y2 - aH : y1;
      const ay2 = ay1 + aH;
      zones.push({ kind: "H", bounds: [ay1, x2,           ay2, x2 + aW] });
      zones.push({ kind: "H", bounds: [ay1, x2 + aW,      ay2, x2 + 2 * aW] });
    } else { // L
      const ay1 = (anchorV === "B") ? y2 - aH : y1;
      const ay2 = ay1 + aH;
      zones.push({ kind: "H", bounds: [ay1, x1 - aW,      ay2, x1] });
      zones.push({ kind: "H", bounds: [ay1, x1 - 2 * aW,  ay2, x1 - aW] });
    }
    // Vertical zone (2 A's stacked vertically) — placed on OPPOSITE H side
    // to form an L-shape padding around the component
    if (anchorV === "B") {
      // 2 A's BELOW component, aligned to opposite H corner
      const ax1 = (anchorH === "R") ? x1 : x2 - aW;
      const ax2 = ax1 + aW;
      zones.push({ kind: "V", bounds: [y2,          ax1, y2 + aH,     ax2] });
      zones.push({ kind: "V", bounds: [y2 + aH,     ax1, y2 + 2 * aH, ax2] });
    } else { // T
      const ax1 = (anchorH === "R") ? x1 : x2 - aW;
      const ax2 = ax1 + aW;
      zones.push({ kind: "V", bounds: [y1 - aH,     ax1, y1,          ax2] });
      zones.push({ kind: "V", bounds: [y1 - 2 * aH, ax1, y1 - aH,     ax2] });
    }
    return zones;
  }

  function applyAirbusLayout() {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }

    // 1. Resolve logo
    const logo = resolveFitTarget();
    if (!logo || !logo.isValid) {
      setStatus("Logo \"" + fitTargetName + "\" not found.", "err");
      return;
    }
    // 2. Resolve letter-A inside logo
    const letterRef = findItemByName(currentDoc, letterRefName);
    if (!letterRef || !letterRef.isValid) {
      setStatus("Letter reference \"" + letterRefName + "\" not found.", "err");
      return;
    }
    // 3. Column width
    const colW = computeColumnWidthPt();
    if (isNaN(colW)) { setStatus("Column width invalid.", "err"); return; }

    const dp = currentDoc.documentPreferences;
    const pageW = dp.pageWidth;
    const pageH = dp.pageHeight;

    // 4. Compute logo scale + new size
    const [ly1, lx1, ly2, lx2] = logo.geometricBounds;
    const curLogoW = lx2 - lx1;
    const curLogoH = ly2 - ly1;
    if (curLogoW <= 0 || curLogoH <= 0) {
      setStatus("Logo has zero size.", "err"); return;
    }
    const logoScale = colW / curLogoW;
    const newLogoW  = curLogoW * logoScale;
    const newLogoH  = curLogoH * logoScale;

    // letter-A real width/height AFTER logo scale (used as A unit for padding + guide sizes)
    const [lry1, lrx1, lry2, lrx2] = letterRef.geometricBounds;
    const aW = (lrx2 - lrx1) * logoScale;
    const aH = (lry2 - lry1) * logoScale;
    if (aW <= 0 || aH <= 0) {
      setStatus("Letter reference \"" + letterRefName + "\" has zero size.", "err");
      return;
    }

    // ─── Reference resolution ─────────────────────────────────────────────
    // Map of placed bounds (filled as components are positioned in 2-pass apply order)
    const placedBounds = {}; // { logo: [y1,x1,y2,x2], url: ..., etc. }
    const mpRef = currentPage.marginPreferences;
    const trimBounds   = [0, 0, pageH, pageW];
    const marginBounds = [mpRef.top, mpRef.left, pageH - mpRef.bottom, pageW - mpRef.right];

    // For "non-Trim" component refs that haven't been placed yet, fall back to CURRENT bounds.
    function getRefBounds(refName) {
      if (refName === "trim")   return { bounds: trimBounds,   isContainer: true };
      if (refName === "margin") return { bounds: marginBounds, isContainer: true };
      // Component refs
      if (placedBounds[refName]) return { bounds: placedBounds[refName], isContainer: false };
      // Not placed yet: read current bounds from the document item
      const itemMap = {
        logo: logo, url: urlItem, qr: qrItem,
        main: mainItem, camp: campItem, sub: subItem
      };
      const it = itemMap[refName];
      if (it && it.isValid) {
        return { bounds: it.geometricBounds.slice(), isContainer: false };
      }
      // Fallback: use Trim + warn
      console.warn("Ref \"" + refName + "\" not available, falling back to Trim");
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

    function isContainerRef(refName) {
      return refName === "trim" || refName === "margin";
    }

    // ─── Resolve all items + compute new sizes ────────────────────────────
    const skipped = [];
    const contentW = pageW - mpRef.left - mpRef.right;

    // Logo new size already computed above (newLogoW, newLogoH)

    let urlItem = null, newUrlW = 0, newUrlH = 0;
    if (chkPlaceUrl.checked) {
      urlItem = findItemByName(currentDoc, urlBlockName);
      if (!urlItem || !urlItem.isValid) {
        skipped.push("URL \"" + urlBlockName + "\""); urlItem = null;
      } else {
        const [uy1, ux1, uy2, ux2] = urlItem.geometricBounds;
        const curUrlW = ux2 - ux1, curUrlH = uy2 - uy1;
        if (curUrlW <= 0 || curUrlH <= 0) {
          skipped.push("URL (zero size)"); urlItem = null;
        } else {
          const urlScale = (newLogoW * 0.5) / curUrlW;
          newUrlW = curUrlW * urlScale;
          newUrlH = curUrlH * urlScale;
        }
      }
    }

    let qrItem = null, qrNewW = 0, qrNewH = 0;
    if (chkPlaceQr.checked) {
      qrItem = findItemByName(currentDoc, qrBlockName);
      if (!qrItem || !qrItem.isValid) {
        skipped.push("QR \"" + qrBlockName + "\""); qrItem = null;
      } else {
        const [qy1, qx1, qy2, qx2] = qrItem.geometricBounds;
        const curW = qx2 - qx1;
        const curH = qy2 - qy1;
        if (curW <= 0 || curH <= 0) {
          skipped.push("QR (zero size)"); qrItem = null;
        } else {
          // Height = 2 × letter-A height, width scales with original aspect ratio
          qrNewH = 2 * aH;
          qrNewW = curW * (qrNewH / curH);
        }
      }
    }

    function resolveTextFrame(checkbox, name, key) {
      if (!checkbox.checked) return null;
      const it = findItemByName(currentDoc, name);
      if (!it || !it.isValid) { skipped.push(key + " \"" + name + "\""); return null; }
      const [ty1, tx1, ty2, tx2] = it.geometricBounds;
      const curW = tx2 - tx1;
      const curH = ty2 - ty1;
      if (curW <= 0 || curH <= 0) { skipped.push(key + " (zero size)"); return null; }
      return { item: it, w: curW, h: curH };
    }
    const mainData = resolveTextFrame(chkPlaceMain, mainName, "Main");
    const campData = resolveTextFrame(chkPlaceCamp, campName, "Camp");
    const subData  = resolveTextFrame(chkPlaceSub,  subName,  "Sub");
    const mainItem = mainData ? mainData.item : null;
    const campItem = campData ? campData.item : null;
    const subItem  = subData  ? subData.item  : null;

    // ─── 2-pass position compute ──────────────────────────────────────────
    // Build list of placement plans
    const logoCntH = parseInt(selLogoCntH.value, 10) || 2;
    const logoCntV = parseInt(selLogoCntV.value, 10) || 2;
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
        padH: (parseInt(selUrlCntH.value, 10) || 2) * aW,
        padV: (parseInt(selUrlCntV.value, 10) || 2) * aH,
        refH: selUrlRefH.value, refV: selUrlRefV.value
      },
      qrItem && {
        key: "qr", w: qrNewW, h: qrNewH,
        anchorH: selQrH.value, anchorV: selQrV.value,
        padH: (parseInt(selQrCntH.value, 10) || 1) * aW,
        padV: (parseInt(selQrCntV.value, 10) || 1) * aH,
        refH: selQrRefH.value, refV: selQrRefV.value
      },
      mainData && {
        key: "main", w: mainData.w, h: mainData.h,
        anchorH: selMainH.value, anchorV: selMainV.value,
        padH: (parseInt(selMainCntH.value, 10) || 2) * aW,
        padV: (parseInt(selMainCntV.value, 10) || 2) * aH,
        refH: selMainRefH.value, refV: selMainRefV.value
      },
      campData && {
        key: "camp", w: campData.w, h: campData.h,
        anchorH: selCampH.value, anchorV: selCampV.value,
        padH: (parseInt(selCampCntH.value, 10) || 2) * aW,
        padV: (parseInt(selCampCntV.value, 10) || 2) * aH,
        refH: selCampRefH.value, refV: selCampRefV.value
      },
      subData && {
        key: "sub", w: subData.w, h: subData.h,
        anchorH: selSubH.value, anchorV: selSubV.value,
        padH: (parseInt(selSubCntH.value, 10) || 2) * aW,
        padV: (parseInt(selSubCntV.value, 10) || 2) * aH,
        refH: selSubRefH.value, refV: selSubRefV.value
      }
    ].filter(Boolean);

    // 2-pass: container-only refs first, component refs second.
    // Within each pass, fixed order: logo → url → qr → sub → camp → main.
    const fixedOrder = ["logo", "url", "qr", "sub", "camp", "main"];
    function planSort(a, b) {
      return fixedOrder.indexOf(a.key) - fixedOrder.indexOf(b.key);
    }
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

    // 7. Compute padding-zone guide A's, anchored to letter-A position (after logo apply)
    // letter-A.bounds at apply-time = oldBounds scaled around logo origin, then translated.
    // Easier: scale letter-A bounds relative to logo old bounds, then offset by new logo position.
    function projectLetterAToNewLogo(targetLogoBounds) {
      // letter-A current bounds (relative to current logo)
      const [oly1, olx1, oly2, olx2] = letterRef.geometricBounds;
      const dx1 = (olx1 - lx1) * logoScale;
      const dy1 = (oly1 - ly1) * logoScale;
      const dx2 = (olx2 - lx1) * logoScale;
      const dy2 = (oly2 - ly1) * logoScale;
      const [ny1, nx1] = [targetLogoBounds[0], targetLogoBounds[1]];
      return [ny1 + dy1, nx1 + dx1, ny1 + dy2, nx1 + dx2];
    }

    // Build zones with configurable counts (cntH H-zones, cntV V-zones)
    function computeLogoGuideZones(letterABounds, logoBounds, anchorH, anchorV, cntH, cntV) {
      const [ay1, ax1, ay2, ax2] = letterABounds;
      const [, lx1L, , lx2L] = logoBounds;
      const zones = [];
      // Horizontal: same Y as letter-A, X extends outward from logo edge
      for (let i = 0; i < cntH; i++) {
        const off = i * aW;
        if (anchorH === "R") {
          zones.push({ kind: "H", bounds: [ay1, lx2L + off,           ay2, lx2L + off + aW] });
        } else {
          zones.push({ kind: "H", bounds: [ay1, lx1L - off - aW,      ay2, lx1L - off] });
        }
      }
      // Vertical: X at letter-A column, Y stacks below/above letter-A
      const vx1 = ax1, vx2 = ax2;
      for (let i = 0; i < cntV; i++) {
        const off = i * aH;
        if (anchorV === "B") {
          zones.push({ kind: "V", bounds: [ay2 + off,                vx1, ay2 + off + aH, vx2] });
        } else {
          zones.push({ kind: "V", bounds: [ay1 - off - aH,           vx1, ay1 - off,      vx2] });
        }
      }
      return zones;
    }

    const guideZones = [];
    if (chkPlaceLogo.checked) {
      const letterAAfterLogo = projectLetterAToNewLogo(logoNewBounds);
      const z = computeLogoGuideZones(
        letterAAfterLogo, logoNewBounds,
        selLogoH.value, selLogoV.value,
        logoCntH, logoCntV
      );
      for (let i = 0; i < z.length; i++) guideZones.push(z[i]);
    }
    // Helper: build zones for a component that doesn't have letter-A child.
    // Uses pseudo-letterA (aW × aH) anchored to the component's anchor corner.
    function pushZonesForPseudoComponent(compBounds, anchorH, anchorV, cntH, cntV) {
      const [cy1, cx1, cy2, cx2] = compBounds;
      const pAy1 = (anchorV === "B") ? cy2 - aH : cy1;
      const pAy2 = pAy1 + aH;
      const pAx1 = (anchorH === "R") ? cx2 - aW : cx1;
      const pAx2 = pAx1 + aW;
      const z = computeLogoGuideZones(
        [pAy1, pAx1, pAy2, pAx2], compBounds,
        anchorH, anchorV, cntH, cntV
      );
      for (let i = 0; i < z.length; i++) guideZones.push(z[i]);
    }

    // Fixed-2A-column zones: each H column = 2 A xếp dọc (anchored to top of component).
    // Dùng cho QR, Sub, Camp. cntH = số cột H, cntV = số hàng V.
    function pushZonesFixed2AColumn(compBounds, anchorH, anchorV, cntH, cntV, opts) {
      const [cy1, cx1, cy2, cx2] = compBounds;
      const forceHBottom = opts && opts.forceHBottom;
      const hFromBottom = forceHBottom ? true : (anchorV === "B");
      // H side: cntH columns, mỗi column = 2 A xếp dọc
      for (let col = 0; col < cntH; col++) {
        const offCol = col * aW;
        let ax1, ax2;
        if (anchorH === "R") { ax1 = cx2 + offCol;        ax2 = ax1 + aW; }
        else                 { ax1 = cx1 - offCol - aW;   ax2 = ax1 + aW; }
        if (hFromBottom) {
          guideZones.push({ kind: "H", bounds: [cy2 - aH,     ax1, cy2,          ax2] });
          guideZones.push({ kind: "H", bounds: [cy2 - 2 * aH, ax1, cy2 - aH,     ax2] });
        } else {
          guideZones.push({ kind: "H", bounds: [cy1,          ax1, cy1 + aH,     ax2] });
          guideZones.push({ kind: "H", bounds: [cy1 + aH,     ax1, cy1 + 2 * aH, ax2] });
        }
      }
      // V side: cntV A's stacked, column aligned to anchor H edge of component
      let vx1, vx2;
      if (anchorH === "R") { vx1 = cx2 - aW; vx2 = cx2; }
      else                 { vx1 = cx1;      vx2 = cx1 + aW; }
      for (let i = 0; i < cntV; i++) {
        const offY = i * aH;
        if (anchorV === "B") {
          guideZones.push({ kind: "V", bounds: [cy2 + offY,        vx1, cy2 + offY + aH, vx2] });
        } else {
          guideZones.push({ kind: "V", bounds: [cy1 - offY - aH,   vx1, cy1 - offY,      vx2] });
        }
      }
    }

    if (urlNewBounds) {
      pushZonesForPseudoComponent(
        urlNewBounds, selUrlH.value, selUrlV.value,
        parseInt(selUrlCntH.value, 10) || 2,
        parseInt(selUrlCntV.value, 10) || 2
      );
    }
    if (qrNewBounds) {
      pushZonesFixed2AColumn(
        qrNewBounds, selQrH.value, selQrV.value,
        parseInt(selQrCntH.value, 10) || 2,
        parseInt(selQrCntV.value, 10) || 2
      );
    }
    if (mainNewBounds) {
      pushZonesForPseudoComponent(
        mainNewBounds, selMainH.value, selMainV.value,
        parseInt(selMainCntH.value, 10) || 2,
        parseInt(selMainCntV.value, 10) || 2
      );
    }
    if (campNewBounds) {
      pushZonesFixed2AColumn(
        campNewBounds, selCampH.value, selCampV.value,
        parseInt(selCampCntH.value, 10) || 2,
        parseInt(selCampCntV.value, 10) || 2,
        { forceHBottom: true }
      );
    }
    if (subNewBounds) {
      pushZonesFixed2AColumn(
        subNewBounds, selSubH.value, selSubV.value,
        parseInt(selSubCntH.value, 10) || 2,
        parseInt(selSubCntV.value, 10) || 2,
        { forceHBottom: true }
      );
    }

    // 8. Resolve Guide layer/group
    let guideContainer = findContainerByExactName(currentDoc, "guide");
    if (!guideContainer) {
      try {
        const newLayer = currentDoc.layers.add({ name: "Guide" });
        guideContainer = { kind: "layer", node: newLayer };
        console.log("[layout] auto-created Guide layer");
      } catch (e) {
        console.warn("Failed to create Guide layer:", e);
      }
    }

    // Identify previous-apply clones (skip these when listing existing A's)
    const prevClonedIds = (layoutSnapshot && layoutSnapshot.clonedIds) || [];
    const prevClonedSet = {};
    for (let i = 0; i < prevClonedIds.length; i++) prevClonedSet[prevClonedIds[i]] = true;

    const allInGuide = guideContainer ? getContainerChildren(guideContainer) : [];
    const existingA = allInGuide.filter(it => !prevClonedSet[it.id]);

    // 9. Snapshot BEFORE applying (for undo)
    layoutSnapshot = {
      logoRef: logo,
      logoBounds: [ly1, lx1, ly2, lx2],
      urlRef: urlItem,
      urlBounds: urlItem ? urlItem.geometricBounds.slice() : null,
      qrRef: qrItem,
      qrBounds: qrItem ? qrItem.geometricBounds.slice() : null,
      mainRef: mainItem,
      mainBounds: mainItem ? mainItem.geometricBounds.slice() : null,
      campRef: campItem,
      campBounds: campItem ? campItem.geometricBounds.slice() : null,
      subRef: subItem,
      subBounds: subItem ? subItem.geometricBounds.slice() : null,
      hiddenExistingA: existingA,
      clonedIds: []
    };

    // 10. Apply
    try {
      const id = getIndesign();
      const LocationOpts = id.LocationOptions;
      const clonedIds = [];
      id.app.doScript(function () {
        // 10a. Resize/move components
        if (chkPlaceLogo.checked) {
          logo.geometricBounds = logoNewBounds;
        } else {
          const fit = computeFittedBounds(logo, pageW, pageH, "width", colW);
          if (fit) logo.geometricBounds = fit.bounds;
        }
        if (urlNewBounds)  urlItem.geometricBounds  = urlNewBounds;
        if (qrNewBounds) {
          qrItem.geometricBounds = qrNewBounds;
          // Fit QR content (image) to the new frame size, keeping aspect proportionally
          try {
            const FitOpts = id.FitOptions;
            qrItem.fit(FitOpts.FILL_PROPORTIONALLY);
            qrItem.fit(FitOpts.CENTER_CONTENT);
          } catch (e) { console.warn("fit QR content failed:", e.message || e); }
        }
        if (mainNewBounds) mainItem.geometricBounds = mainNewBounds;
        if (campNewBounds) campItem.geometricBounds = campNewBounds;
        if (subNewBounds)  subItem.geometricBounds  = subNewBounds;

        // 10b. Delete previous-apply clones (so re-Apply doesn't bloat the Guide layer)
        for (let i = 0; i < prevClonedIds.length; i++) {
          const prev = findPageItemById(currentDoc, prevClonedIds[i]);
          if (prev && prev.isValid) {
            try { prev.remove(); }
            catch (e) { console.warn("remove prev clone[" + i + "] failed:", e.message || e); }
          }
        }

        // 10c. Hide all existing (non-clone) A's in Guide layer
        for (let i = 0; i < existingA.length; i++) {
          try { existingA[i].visible = false; }
          catch (e) { console.warn("hide existing A[" + i + "] failed:", e.message || e); }
        }

        // 10d. Clone letterRef for ALL zones (fresh A's with correct aspect from logo)
        for (let i = 0; i < guideZones.length; i++) {
          try {
            const clone = letterRef.duplicate();
            // Rename clone so future findItemByName("letter-A") doesn't return it
            try { clone.name = "A-guide-clone"; } catch (_) {}
            clone.geometricBounds = guideZones[i].bounds;
            // 50% opacity to distinguish clones from real letter-A
            try { clone.transparencySettings.blendingSettings.opacity = 50; }
            catch (e) { console.warn("set opacity failed:", e.message || e); }
            // Move clone into Guide container
            if (guideContainer) {
              if (guideContainer.kind === "layer") {
                try { clone.itemLayer = guideContainer.node; } catch (_) {}
              } else {
                try { clone.move(LocationOpts.AT_END, guideContainer.node); } catch (_) {}
              }
            }
            clonedIds.push(clone.id);
          } catch (e) { console.warn("clone A[" + i + "] failed:", e.message || e); }
        }
      }, id.ScriptLanguage.JAVASCRIPT, [], id.UndoModes.ENTIRE_SCRIPT, "Apply Airbus layout");

      layoutSnapshot.clonedIds = clonedIds;
      refreshAllAvailability();

      btnUndoLayout.disabled = false;
      const parts = ["logo " + selLogoV.value + selLogoH.value];
      if (urlNewBounds)  parts.push("URL " + selUrlV.value + selUrlH.value);
      if (qrNewBounds)   parts.push("QR " + selQrV.value + selQrH.value);
      if (mainNewBounds) parts.push("Main " + selMainV.value + selMainH.value);
      if (campNewBounds) parts.push("Camp " + selCampV.value + selCampH.value);
      if (subNewBounds)  parts.push("Sub " + selSubV.value + selSubH.value);
      parts.push(clonedIds.length + " A clones" +
                 (existingA.length ? " (" + existingA.length + " hidden)" : ""));
      const skipMsg = skipped.length ? " — skipped: " + skipped.join(", ") : "";
      setStatus("Spacing applied: " + parts.join(", ") +
                " (A: " + ptToDisplay(aW) + "×" + ptToDisplay(aH) + " " + displayUnitName + ")" + skipMsg + ".",
                skipped.length ? "warn" : "ok");
    } catch (e) {
      console.error(e);
      setStatus("Apply spacing failed: " + (e.message || e), "err");
    }
  }

  function undoAirbusLayout() {
    if (!layoutSnapshot) { setStatus("Nothing to undo.", "warn"); return; }
    const snap = layoutSnapshot;
    function safeValid(ref) {
      try { return ref && ref.isValid; } catch (_) { return false; }
    }
    function safeRestore(ref, bounds) {
      if (!safeValid(ref) || !bounds) return;
      try { ref.geometricBounds = bounds; }
      catch (e) { console.warn("restore failed:", e.message || e); }
    }
    try {
      const id = getIndesign();
      id.app.doScript(function () {
        safeRestore(snap.logoRef, snap.logoBounds);
        safeRestore(snap.urlRef,  snap.urlBounds);
        safeRestore(snap.qrRef,   snap.qrBounds);
        safeRestore(snap.mainRef, snap.mainBounds);
        safeRestore(snap.campRef, snap.campBounds);
        safeRestore(snap.subRef,  snap.subBounds);
        // Unhide existing A's
        const existing = snap.hiddenExistingA || [];
        for (let i = 0; i < existing.length; i++) {
          if (safeValid(existing[i])) {
            try { existing[i].visible = true; }
            catch (e) { console.warn("unhide existing A[" + i + "] failed:", e.message || e); }
          }
        }
        // Delete cloned A's (resolve by id captured during apply)
        const ids = snap.clonedIds || [];
        for (let i = 0; i < ids.length; i++) {
          const it = findPageItemById(currentDoc, ids[i]);
          if (it && it.isValid) {
            try { it.remove(); }
            catch (e) { console.warn("delete clone[" + i + "] failed:", e.message || e); }
          }
        }
      }, id.ScriptLanguage.JAVASCRIPT, [], id.UndoModes.ENTIRE_SCRIPT, "Undo Airbus layout");

      layoutSnapshot = null;
      btnUndoLayout.disabled = true;
      refreshAllAvailability();
      setStatus("Spacing reverted.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("Undo spacing failed: " + (e.message || e), "err");
    }
  }

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
    updateComponentAvailability("letter");
    persistFitTarget();
  });

  inpUrlBlockName.addEventListener("input", () => {
    urlBlockName = inpUrlBlockName.value;
    refreshAllRefSelects();
    updateComponentAvailability("url");
    persistFitTarget();
  });

  inpQrBlockName.addEventListener("input", () => {
    qrBlockName = inpQrBlockName.value;
    refreshAllRefSelects();
    updateComponentAvailability("qr");
    persistFitTarget();
  });

  inpMainName.addEventListener("input", () => {
    mainName = inpMainName.value;
    refreshAllRefSelects();
    updateComponentAvailability("main");
    persistFitTarget();
  });

  inpCampName.addEventListener("input", () => {
    campName = inpCampName.value;
    refreshAllRefSelects();
    updateComponentAvailability("camp");
    persistFitTarget();
  });

  inpSubName.addEventListener("input", () => {
    subName = inpSubName.value;
    refreshAllRefSelects();
    updateComponentAvailability("sub");
    persistFitTarget();
  });

  // ─── Set name buttons ─────────────────────────────────────────────────────
  function handleSetName(key) {
    if (!currentDoc) { setStatus("Open a document first.", "warn"); return; }
    const map = getComponentMap();
    const c = map[key];
    if (!c) return;
    const sel = getSelection();
    if (sel.length === 0) { setStatus("Select an object first.", "warn"); return; }
    if (sel.length > 1) { setStatus("Select exactly one object.", "warn"); return; }
    const newName = c.input.value.trim();
    if (!newName) { setStatus("Name is empty.", "warn"); return; }
    try {
      sel[0].name = newName;
      updateComponentAvailability(key);
      refreshAllRefSelects();
      setStatus("Name \"" + newName + "\" applied to selected object.", "ok");
    } catch (e) {
      console.error(e);
      setStatus("Set name failed: " + (e.message || e), "err");
    }
  }
  document.querySelectorAll(".btn-set").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-set-for");
      handleSetName(key);
    });
  });

  chkPlaceLogo.addEventListener("change", persistFitTarget);
  chkPlaceUrl .addEventListener("change", persistFitTarget);
  chkPlaceQr  .addEventListener("change", persistFitTarget);
  chkPlaceMain.addEventListener("change", persistFitTarget);
  chkPlaceCamp.addEventListener("change", persistFitTarget);
  chkPlaceSub .addEventListener("change", persistFitTarget);
  selLogoH.addEventListener("change", persistFitTarget);
  selLogoV.addEventListener("change", persistFitTarget);
  selUrlH .addEventListener("change", persistFitTarget);
  selUrlV .addEventListener("change", persistFitTarget);
  selQrH  .addEventListener("change", persistFitTarget);
  selQrV  .addEventListener("change", persistFitTarget);
  selMainH.addEventListener("change", persistFitTarget);
  selMainV.addEventListener("change", persistFitTarget);
  selCampH.addEventListener("change", persistFitTarget);
  selCampV.addEventListener("change", persistFitTarget);
  selSubH .addEventListener("change", persistFitTarget);
  selSubV .addEventListener("change", persistFitTarget);
  selLogoCntH.addEventListener("change", persistFitTarget);
  selLogoCntV.addEventListener("change", persistFitTarget);
  selUrlCntH .addEventListener("change", persistFitTarget);
  selUrlCntV .addEventListener("change", persistFitTarget);
  selQrCntH  .addEventListener("change", persistFitTarget);
  selQrCntV  .addEventListener("change", persistFitTarget);
  selMainCntH.addEventListener("change", persistFitTarget);
  selMainCntV.addEventListener("change", persistFitTarget);
  selCampCntH.addEventListener("change", persistFitTarget);
  selCampCntV.addEventListener("change", persistFitTarget);
  selSubCntH .addEventListener("change", persistFitTarget);
  selSubCntV .addEventListener("change", persistFitTarget);
  [selLogoRefH, selLogoRefV, selUrlRefH, selUrlRefV,
   selQrRefH, selQrRefV, selMainRefH, selMainRefV,
   selCampRefH, selCampRefV, selSubRefH, selSubRefV
  ].forEach(s => s.addEventListener("change", persistFitTarget));

  btnApplyLayout.addEventListener("click", applyAirbusLayout);
  btnUndoLayout .addEventListener("click", undoAirbusLayout);

  const btnResetOptions = $("btnResetOptions");
  if (btnResetOptions) {
    btnResetOptions.addEventListener("click", () => {
      // Anchor defaults (H, V)
      selLogoH.value = "R"; selLogoV.value = "B";
      selUrlH.value  = "R"; selUrlV.value  = "T";
      selQrH.value   = "L"; selQrV.value   = "B";
      selMainH.value = "L"; selMainV.value = "T";
      selCampH.value = "L"; selCampV.value = "T";
      selSubH.value  = "L"; selSubV.value  = "B";
      // A count defaults
      selLogoCntH.value = "2"; selLogoCntV.value = "2";
      selUrlCntH.value  = "2"; selUrlCntV.value  = "2";
      selQrCntH.value   = "2"; selQrCntV.value   = "2";
      selMainCntH.value = "2"; selMainCntV.value = "2";
      selCampCntH.value = "2"; selCampCntV.value = "2";
      selSubCntH.value  = "1"; selSubCntV.value  = "2";
      // Ref defaults — re-populate to apply REF_DEFAULTS map
      refSelects.forEach(sel => { sel.value = ""; populateRefSelect(sel); });
      persistFitTarget();
      setStatus("Reset options to defaults.", "ok");
    });
  }

  tabActive.addEventListener("click", () => {
    scopeMode = "active";
    tabActive.classList.add("active");
    tabAll.classList.remove("active");
    pagePicker.classList.remove("hidden");
    allPagesView.classList.add("hidden");
  });

  tabAll.addEventListener("click", () => {
    scopeMode = "all";
    tabAll.classList.add("active");
    tabActive.classList.remove("active");
    pagePicker.classList.remove("hidden");
    allPagesView.classList.remove("hidden");
    renderAllPages();
  });

  selPage.addEventListener("change", () => {
    if (!currentDoc) return;
    const idx = parseInt(selPage.value, 10);
    if (isNaN(idx)) return;
    currentPage = currentDoc.pages.item(idx);
    readIntoInputs();
    snapshot = captureSnapshot();
    setStatus("");
  });

  // ─── Helpers shared by Fit feature ─────────────────────────────────────────
  function findPageItemById(doc, id) {
    if (!doc || id == null) return null;
    try {
      const item = doc.pageItems.itemByID(id);
      try { if (item && item.isValid) return item; } catch (_) {}
    } catch (_) {}
    try {
      const all = doc.allPageItems;
      for (let i = 0; i < all.length; i++) {
        try {
          if (all[i] && all[i].id === id) return all[i];
        } catch (_) {}
      }
    } catch (_) {}
    return null;
  }

  function getSelection() {
    const id = getIndesign();
    const sel = id.app.selection;
    if (!sel || sel.length === 0) return [];
    return sel.slice();
  }

  // Initial refresh — retry if InDesign module not ready yet on first DOMContentLoaded.
  function initialRefresh(attempt) {
    refresh();
    if (!currentDoc && attempt < 6 && !getIndesign()) {
      setTimeout(() => initialRefresh(attempt + 1), 500);
    } else {
      loadFitTarget();
    }
  }
  initialRefresh(0);
});
