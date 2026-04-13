/* ─────────────────────────────────────────────
   QA Checker — CEP panel UI for Illustrator
   Calls host.jsx via CSInterface.evalScript
   ───────────────────────────────────────────── */

const csi = new CSInterface();

let lastScan = null;        // { frames, summary, stats }
let lastColorResult = null; // { matched, off }
let liveInterval = null;
let lastLiveKey = "";
let lastScanFilteredSummary = null;

/* ─── Utils ─── */
function log(msg) {
  const box = document.getElementById("logBox");
  const t = new Date().toLocaleTimeString();
  box.textContent = `[${t}] ${msg}\n` + box.textContent;
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function fmt(n) {
  if (n == null || isNaN(n)) return "";
  return (Math.round(Number(n) * 10) / 10).toString();
}

function colorPreview(color) {
  if (!color) return "transparent";
  if (color.model === "Gradient") return "linear-gradient(90deg,#666,#ddd)";
  if (color.model === "Pattern") return "repeating-linear-gradient(45deg,#666 0 4px,#aaa 4px 8px)";
  if (color.r == null) return "#888";
  return `rgb(${color.r},${color.g},${color.b})`;
}

function parseHostResp(raw) {
  if (raw == null || raw === "") return { ok: false, error: "empty response" };
  if (raw === "EvalScript error.") return { ok: false, error: "EvalScript error (check host.jsx syntax)" };
  try { return JSON.parse(raw); }
  catch (e) { return { ok: false, error: "Bad JSON: " + String(raw).slice(0, 200) }; }
}

/* Escape a JS string for embedding in an ExtendScript double-quoted literal. */
function esEscape(s) {
  return String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function callHost(fnCall, cb) {
  csi.evalScript(fnCall, (resp) => {
    const data = parseHostResp(resp);
    cb(data);
  });
}

/* ─── Tab switching ─── */
function switchMode(mode) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === mode));
  document.getElementById("livePanel").style.display = mode === "live" ? "" : "none";
  document.getElementById("scanPanel").style.display = mode === "scan" ? "" : "none";
  document.getElementById("colorPanel").style.display = mode === "color" ? "" : "none";
}

function switchView(view) {
  document.querySelectorAll(".view-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  document.getElementById("scanSummary").style.display = view === "summary" ? "" : "none";
  document.getElementById("scanDetails").style.display = view === "details" ? "" : "none";
}

/* ─── UI cards ─── */
function emptyState(msg) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = msg;
  return div;
}

function copyToast(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showSaveToast("Copied: " + text);
  } catch (e) {}
}

function addMetricRow(parent, label, value, opts) {
  opts = opts || {};
  const row = document.createElement("div");
  row.className = "metric-row" + (opts.highlight ? " highlight" : "") + (opts.diff ? " diff" : "");
  const l = document.createElement("span");
  l.className = "metric-label";
  l.textContent = label;
  const v = document.createElement("span");
  v.className = "metric-value copyable";
  v.textContent = value;
  v.title = "Click to copy";
  v.addEventListener("click", (e) => {
    e.stopPropagation();
    copyToast(String(value));
  });
  row.appendChild(l);
  row.appendChild(v);
  parent.appendChild(row);
  return row;
}

/* Parse Illustrator style string into weight (name + CSS number) and italic flag. */
function parseFontStyle(styleStr) {
  const s = String(styleStr || "Regular");
  const lower = s.toLowerCase();
  const isItalic = /italic|oblique/.test(lower);

  let weightName = s
    .replace(/italic/ig, "")
    .replace(/oblique/ig, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!weightName) weightName = "Regular";

  const weightMap = [
    [/\bhairline\b/i, 100],
    [/\bultra[- ]?thin\b/i, 100],
    [/\bthin\b/i, 100],
    [/\bextra[- ]?light\b/i, 200],
    [/\bultra[- ]?light\b/i, 200],
    [/\blight\b/i, 300],
    [/\bbook\b/i, 350],
    [/\bnormal\b/i, 400],
    [/\bregular\b/i, 400],
    [/\bmedium\b/i, 500],
    [/\bdemi[- ]?bold\b/i, 600],
    [/\bsemi[- ]?bold\b/i, 600],
    [/\bextra[- ]?bold\b/i, 800],
    [/\bultra[- ]?bold\b/i, 800],
    [/\bbold\b/i, 700],
    [/\bheavy\b/i, 900],
    [/\bblack\b/i, 900],
  ];
  let weightNum = 400;
  for (const [re, n] of weightMap) {
    if (re.test(weightName)) { weightNum = n; break; }
  }
  return { weightName, weightNum, isItalic, raw: s };
}

function buildRunCard(run, opts) {
  opts = opts || {};
  const card = document.createElement("div");
  card.className = "run-card";
  if (run.missing) card.classList.add("missing");

  const parsedStyle = parseFontStyle(run.style);
  const hexVal = run.color && run.color.hex ? run.color.hex : (run.color ? run.color.model : "");
  const sizeVal = run.size ? fmt(run.size) + "pt" : "";
  const weightVal = parsedStyle.weightName;

  /* ─── Summary line (always visible) ─── */
  const summary = document.createElement("div");
  summary.className = "run-summary";

  const summaryLeft = document.createElement("div");
  summaryLeft.className = "run-summary-left";

  const fam = document.createElement("span");
  fam.className = "run-family";
  fam.textContent = run.family || "(no font)";
  summaryLeft.appendChild(fam);

  const meta = document.createElement("span");
  meta.className = "run-meta";
  meta.textContent = [weightVal, sizeVal, hexVal].filter(Boolean).join(" · ");
  summaryLeft.appendChild(meta);

  summary.appendChild(summaryLeft);

  const summaryRight = document.createElement("div");
  summaryRight.className = "run-summary-right";

  if (run.missing) {
    const b = document.createElement("span");
    b.className = "run-missing-badge";
    b.textContent = "MISSING";
    summaryRight.appendChild(b);
  }
  if (typeof opts.count === "number") {
    const c = document.createElement("span");
    c.className = "run-count-badge";
    c.textContent = "×" + opts.count;
    summaryRight.appendChild(c);
  }

  const sw = document.createElement("span");
  sw.className = "color-swatch-sm";
  sw.style.background = colorPreview(run.color);
  summaryRight.appendChild(sw);

  const arrow = document.createElement("span");
  arrow.className = "expand-icon";
  arrow.textContent = "▸";
  summaryRight.appendChild(arrow);

  summary.appendChild(summaryRight);
  card.appendChild(summary);

  /* ─── Detail section ─── */
  const detail = document.createElement("div");
  detail.className = "run-detail";
  const startOpen = opts.expanded || false;
  detail.style.display = startOpen ? "" : "none";
  if (startOpen) { arrow.textContent = "▾"; card.classList.add("expanded"); }

  const metrics = document.createElement("div");
  metrics.className = "run-metrics";

  const d = opts.diffs || new Set();
  addMetricRow(metrics, "font-weight",
    `${parsedStyle.weightNum}  (${parsedStyle.weightName})`, { diff: d.has("style") });
  addMetricRow(metrics, "font-style",
    parsedStyle.isItalic ? "italic" : "normal",
    { highlight: parsedStyle.isItalic, diff: d.has("style") });
  addMetricRow(metrics, "font-size",
    run.size ? fmt(run.size) + " pt" : "—", { highlight: true, diff: d.has("size") });

  const leadingStr = run.autoLeading
    ? "auto" + (run.leading ? " (" + fmt(run.leading) + " pt)" : "")
    : (run.leading ? fmt(run.leading) + " pt" : "—");
  addMetricRow(metrics, "line-height", leadingStr, { diff: d.has("leading") || d.has("autoLeading") });

  if (run.tracking != null && run.size) {
    const trPt = (run.tracking * run.size) / 1000;
    addMetricRow(metrics, "letter-spacing", `${fmt(trPt)} pt  (${Math.round(run.tracking)})`, { diff: d.has("tracking") });
  } else {
    addMetricRow(metrics, "letter-spacing", "—", { diff: d.has("tracking") });
  }

  if (run.baselineShift != null && Math.abs(run.baselineShift) > 0.01) {
    addMetricRow(metrics, "baseline-shift", fmt(run.baselineShift) + " pt");
  }

  /* Color row */
  const colorRow = document.createElement("div");
  colorRow.className = "metric-row color-row" + (d.has("color") ? " diff" : "");
  const colLabel = document.createElement("span");
  colLabel.className = "metric-label";
  colLabel.textContent = "color";
  colorRow.appendChild(colLabel);
  const colVal = document.createElement("span");
  colVal.className = "metric-value color-value copyable";
  colVal.title = "Click to copy";
  const swBig = document.createElement("span");
  swBig.className = "color-swatch";
  swBig.style.background = colorPreview(run.color);
  colVal.appendChild(swBig);
  const hexSpan = document.createElement("span");
  hexSpan.className = "color-hex";
  hexSpan.textContent = hexVal || "—";
  colVal.appendChild(hexSpan);
  colVal.addEventListener("click", (e) => { e.stopPropagation(); copyToast(hexVal); });
  colorRow.appendChild(colVal);
  metrics.appendChild(colorRow);

  if (run.color && run.color.display && (run.color.model !== "RGB" || !run.color.hex)) {
    const sub = document.createElement("div");
    sub.className = "color-sub";
    sub.textContent = run.color.display;
    metrics.appendChild(sub);
  }

  detail.appendChild(metrics);

  if (run.psName) {
    const ps = document.createElement("div");
    ps.className = "run-ps";
    ps.textContent = "PostScript: " + run.psName;
    detail.appendChild(ps);
  }

  const sample = opts.sample != null ? opts.sample : (run.text || "");
  if (sample) {
    const s = document.createElement("div");
    s.className = "run-sample";
    const trimmed = String(sample).replace(/\s+/g, " ").trim();
    s.textContent = '"' + trimmed.slice(0, 80) + (trimmed.length > 80 ? "…" : "") + '"';
    detail.appendChild(s);
  }

  card.appendChild(detail);

  /* Toggle expand/collapse on summary click */
  summary.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = detail.style.display !== "none";
    detail.style.display = open ? "none" : "";
    arrow.textContent = open ? "▸" : "▾";
    card.classList.toggle("expanded", !open);
  });

  return card;
}

/* ─── Live mode ─── */
function toggleLive() {
  const enabled = document.getElementById("liveEnabled").checked;
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  lastLiveKey = "";
  if (enabled) {
    liveInterval = setInterval(pollLive, 500);
    pollLive();
  } else {
    document.getElementById("liveStatus").textContent = "Live inspect off.";
    document.getElementById("liveStatus").classList.remove("active");
    document.getElementById("liveResult").innerHTML = "";
  }
}

function findDiffKeys(runs) {
  if (runs.length <= 1) return new Set();
  const props = ["family", "style", "size", "leading", "autoLeading", "tracking"];
  const diffs = new Set();
  for (const p of props) {
    const vals = new Set(runs.map((r) => JSON.stringify(r[p])));
    if (vals.size > 1) diffs.add(p);
  }
  const hexes = new Set(runs.map((r) => r.color ? r.color.hex : ""));
  if (hexes.size > 1) diffs.add("color");
  return diffs;
}

function pollLive() {
  callHost("qaGetSelection()", (data) => {
    const statusEl = document.getElementById("liveStatus");
    const resultEl = document.getElementById("liveResult");
    if (!data.ok) {
      if (lastLiveKey !== "err") {
        lastLiveKey = "err";
        statusEl.textContent = "Error: " + data.error;
        statusEl.classList.remove("active");
        resultEl.innerHTML = "";
      }
      return;
    }
    if (data.empty) {
      const k = "empty:" + data.reason;
      if (lastLiveKey !== k) {
        lastLiveKey = k;
        statusEl.textContent = data.reason === "nodoc"
          ? "No document open."
          : "Select any item on canvas to inspect.";
        statusEl.classList.remove("active");
        resultEl.innerHTML = "";
      }
      return;
    }
    const frames = data.frames || [];
    const pathColors = data.pathColors || [];
    const key = frames.map((f) => f.runs.map((r) => r.key).join(";")).join("||")
      + "@@" + pathColors.map((p) => (p.fill ? p.fill.hex : "") + (p.stroke ? p.stroke.hex : "")).join(";");
    if (key === lastLiveKey) return;
    lastLiveKey = key;

    const parts = [];
    if (frames.length) parts.push(`${frames.length} text`);
    if (pathColors.length) parts.push(`${pathColors.length} shape`);
    statusEl.textContent = parts.join(", ") + " selected";
    statusEl.classList.add("active");
    resultEl.innerHTML = "";

    if (frames.length) {
      const allRuns = [];
      frames.forEach((f) => {
        f.runs.forEach((r) => {
          r._sample = (f.contents || "").replace(/\s+/g, " ").trim();
          allRuns.push(r);
        });
      });
      const diffs = findDiffKeys(allRuns);
      allRuns.forEach((r) => resultEl.appendChild(buildRunCard(r, { sample: r._sample, diffs, expanded: true })));
    }

    if (pathColors.length) {
      pathColors.forEach((p) => {
        const card = document.createElement("div");
        card.className = "run-card";
        const head = document.createElement("div");
        head.className = "run-summary";
        const left = document.createElement("div");
        left.className = "run-summary-left";
        const name = document.createElement("span");
        name.className = "run-family";
        name.textContent = p.name || p.type;
        left.appendChild(name);
        const meta = document.createElement("span");
        meta.className = "run-meta";
        meta.textContent = p.type;
        left.appendChild(meta);
        head.appendChild(left);
        card.appendChild(head);

        const metrics = document.createElement("div");
        metrics.className = "run-metrics";
        metrics.style.marginTop = "8px";

        if (p.fill) {
          const row = document.createElement("div");
          row.className = "metric-row";
          const label = document.createElement("span");
          label.className = "metric-label";
          label.textContent = "fill";
          row.appendChild(label);
          const val = document.createElement("span");
          val.className = "metric-value color-value copyable";
          val.title = "Click to copy";
          const sw = document.createElement("span");
          sw.className = "color-swatch";
          sw.style.background = colorPreview(p.fill);
          val.appendChild(sw);
          const hex = document.createElement("span");
          hex.className = "color-hex";
          hex.textContent = p.fill.hex || p.fill.model;
          val.appendChild(hex);
          val.addEventListener("click", (e) => { e.stopPropagation(); copyToast(p.fill.hex || p.fill.display); });
          row.appendChild(val);
          metrics.appendChild(row);
          if (p.fill.display && p.fill.model !== "RGB") {
            const sub = document.createElement("div");
            sub.className = "color-sub";
            sub.textContent = p.fill.display;
            metrics.appendChild(sub);
          }
        }
        if (p.stroke) {
          const row = document.createElement("div");
          row.className = "metric-row";
          const label = document.createElement("span");
          label.className = "metric-label";
          label.textContent = "stroke";
          row.appendChild(label);
          const val = document.createElement("span");
          val.className = "metric-value color-value copyable";
          val.title = "Click to copy";
          const sw = document.createElement("span");
          sw.className = "color-swatch";
          sw.style.background = colorPreview(p.stroke);
          val.appendChild(sw);
          const hex = document.createElement("span");
          hex.className = "color-hex";
          hex.textContent = p.stroke.hex || p.stroke.model;
          val.appendChild(hex);
          val.addEventListener("click", (e) => { e.stopPropagation(); copyToast(p.stroke.hex || p.stroke.display); });
          row.appendChild(val);
          metrics.appendChild(row);
          if (p.stroke.display && p.stroke.model !== "RGB") {
            const sub = document.createElement("div");
            sub.className = "color-sub";
            sub.textContent = p.stroke.display;
            metrics.appendChild(sub);
          }
        }
        card.appendChild(metrics);
        resultEl.appendChild(card);
      });
    }
  });
}

/* ─── Badge helpers ─── */
function setBadge(id, count, type) {
  const el = document.getElementById(id);
  if (!el) return;
  if (count == null || count === 0) {
    el.textContent = "";
    el.className = "tab-badge";
    return;
  }
  el.textContent = count;
  el.className = "tab-badge badge-" + (type || "pass");
}

function setTabColor(mode, type) {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    if (b.dataset.mode === mode) {
      b.classList.remove("tab-pass", "tab-fail");
      if (type) b.classList.add("tab-" + type);
    }
  });
}

/* ─── Scan mode ─── */
function runScan() {
  const scope = document.querySelector('input[name="scanScope"]:checked').value;
  log(`Scanning (${scope})...`);
  document.getElementById("scanSpinner").style.display = "";
  document.getElementById("scanBtn").disabled = true;
  const t0 = Date.now();
  callHost(`qaScan("${esEscape(scope)}")`, (data) => {
    document.getElementById("scanSpinner").style.display = "none";
    document.getElementById("scanBtn").disabled = false;
    if (!data.ok) { log("Scan error: " + data.error); return; }
    const dt = Date.now() - t0;
    lastScan = data;
    document.getElementById("scanTimestamp").textContent = new Date().toLocaleTimeString();
    log(`Done in ${dt}ms — ${data.stats.frameCount} frames, ${data.stats.runCount} runs, ${data.stats.uniqueCount} unique.`);

    const missing = (data.summary || []).filter((s) => s.missing).length;
    if (missing > 0) {
      setBadge("badgeScan", missing, "fail");
      setTabColor("scan", "fail");
    } else {
      setBadge("badgeScan", "✓", "pass");
      setTabColor("scan", "pass");
    }

    renderScanResult(data);
  });
}

function renderScanResult(result) {
  document.getElementById("scanInfoCard").style.display = "";
  document.getElementById("scanFrameCount").textContent = result.stats.frameCount;
  document.getElementById("scanRunCount").textContent = result.stats.runCount;
  document.getElementById("scanUniqueCount").textContent = result.stats.uniqueCount;
  document.getElementById("scanViewToggle").style.display = "";
  document.getElementById("scanFilterSection").style.display = "";
  document.getElementById("exportReportBtn").disabled = result.stats.runCount === 0;
  document.getElementById("scanFilterInput").value = "";

  renderScanSummaryFiltered();
  renderScanDetails(result);
}

function getFilteredSortedSummary() {
  if (!lastScan || !lastScan.summary) return [];
  const query = (document.getElementById("scanFilterInput").value || "").toLowerCase().trim();
  const sortBy = document.getElementById("scanSortSelect").value;

  let items = lastScan.summary.slice();
  if (query) {
    items = items.filter((s) => {
      const hay = [
        s.family, s.style, s.psName,
        s.color ? s.color.hex : "",
        s.color ? s.color.display : "",
        s.size ? String(s.size) : "",
        ...(s.samples || [])
      ].join(" ").toLowerCase();
      return hay.indexOf(query) >= 0;
    });
  }
  if (sortBy === "family") {
    items.sort((a, b) => (a.family || "").localeCompare(b.family || "") || b.count - a.count);
  } else if (sortBy === "size") {
    items.sort((a, b) => (b.size || 0) - (a.size || 0));
  } else {
    items.sort((a, b) => b.count - a.count);
  }
  return items;
}

function renderScanSummaryFiltered() {
  const summaryEl = document.getElementById("scanSummary");
  summaryEl.innerHTML = "";
  const items = getFilteredSortedSummary();
  if (items.length === 0) {
    summaryEl.appendChild(emptyState(lastScan && lastScan.summary && lastScan.summary.length > 0 ? "No results matching filter." : "No text found."));
    return;
  }
  for (const s of items) {
    const sample = (s.samples || []).join("  /  ");
    const card = buildRunCard(s, { count: s.count, sample });
    card.addEventListener("click", () => selectFramesByIdx(s.frameIdxs));
    summaryEl.appendChild(card);
  }
}

function renderScanDetails(result) {
  const detailsEl = document.getElementById("scanDetails");
  detailsEl.innerHTML = "";
  if (!result.frames || result.frames.length === 0) {
    detailsEl.appendChild(emptyState("No text frames found."));
    return;
  }
  result.frames.forEach((f, idx) => {
    const frameEl = document.createElement("div");
    frameEl.className = "detail-frame";
    const head = document.createElement("div");
    head.className = "detail-frame-head";
    head.innerHTML = `<strong>#${idx + 1}</strong><span>${escapeHtml((f.contents || "").slice(0, 40))}</span>`;
    frameEl.appendChild(head);
    const runsEl = document.createElement("div");
    runsEl.className = "detail-runs";
    f.runs.forEach((r) => {
      const card = buildRunCard(r);
      card.addEventListener("click", () => selectFramesByIdx([f.idx]));
      runsEl.appendChild(card);
    });
    frameEl.appendChild(runsEl);
    detailsEl.appendChild(frameEl);
  });
}

function selectFramesByIdx(idxs) {
  if (!idxs || !idxs.length) return;
  const csv = idxs.join(",");
  callHost(`qaSelectFrames("${esEscape(csv)}")`, (data) => {
    if (!data.ok) { log("Select failed: " + data.error); return; }
    log(`Selected ${data.count} item(s).`);
  });
}

/* ─── Export Excel XML (multi-sheet, styled) ─── */
function xmlEsc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xlCell(val, styleId) {
  const s = String(val == null ? "" : val);
  const isNum = s !== "" && !isNaN(s) && s.trim() !== "";
  const type = isNum ? "Number" : "String";
  const attr = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${attr}><Data ss:Type="${type}">${xmlEsc(s)}</Data></Cell>`;
}

function xlRow(cells, styleId) {
  const attr = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Row${attr}>${cells.join("")}</Row>`;
}

function buildFontRows() {
  if (!lastScan || !lastScan.frames) return [];
  const rows = [];
  lastScan.frames.forEach((f, idx) => {
    f.runs.forEach((r) => {
      const parsed = parseFontStyle(r.style);
      const leadingStr = r.autoLeading ? "auto" : fmt(r.leading);
      const trackingPt = (r.tracking != null && r.size)
        ? fmt((r.tracking * r.size) / 1000) : "0";
      const isMissing = r.missing;
      const sid = isMissing ? "sRed" : null;
      rows.push(xlRow([
        xlCell(idx + 1, sid),
        xlCell((f.contents || "").replace(/\s+/g, " ").slice(0, 50), sid),
        xlCell(r.family, sid),
        xlCell(`${parsed.weightNum} (${parsed.weightName})`, sid),
        xlCell(parsed.isItalic ? "italic" : "normal", sid),
        xlCell(fmt(r.size), sid),
        xlCell(leadingStr, sid),
        xlCell(trackingPt, sid),
        xlCell(r.color ? r.color.hex : "", sid),
        xlCell(r.color ? r.color.model : "", sid),
        xlCell(isMissing ? "YES" : "", sid),
      ]));
    });
  });
  return rows;
}

function buildColorRows() {
  if (!lastColorResult) return [];
  const rows = [];
  for (const c of lastColorResult.off) {
    rows.push(xlRow([
      xlCell("OFF-PALETTE", "sRed"),
      xlCell(c.baseHex || c.hex || "", "sRed"),
      xlCell(c.model || "", "sRed"),
      xlCell((c.sourceTypes || []).join(", "), "sRed"),
      xlCell(c.count || 1, "sRed"),
      xlCell("", "sRed"),
      xlCell(c.tint != null && c.tint < 100 ? Math.round(c.tint) + "%" : "", "sRed"),
    ]));
  }
  for (const c of lastColorResult.matched) {
    rows.push(xlRow([
      xlCell("MATCHED"),
      xlCell(c.baseHex || c.hex || ""),
      xlCell(c.model || ""),
      xlCell((c.sourceTypes || []).join(", ")),
      xlCell(c.count || 1),
      xlCell(c.matchName || ""),
      xlCell(c.tint != null && c.tint < 100 ? Math.round(c.tint) + "%" : ""),
    ]));
  }
  return rows;
}

function buildExcelXml() {
  const fontHeaders = ["#", "Text", "Font Family", "font-weight", "font-style",
    "font-size (pt)", "line-height (pt)", "letter-spacing", "Color Hex", "Color Model", "Missing Font"];
  const colorHeaders = ["Status", "Hex", "Color Model", "Source Types", "Items", "Matched Name", "Tint %"];

  const fontRows = buildFontRows();
  const colorRows = buildColorRows();
  const hasFonts = fontRows.length > 0;
  const hasColors = colorRows.length > 0;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
 <Style ss:ID="Default" ss:Name="Normal">
  <Font ss:FontName="Arial" ss:Size="11"/>
 </Style>
 <Style ss:ID="sHead">
  <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
  <Interior ss:Color="#333333" ss:Pattern="Solid"/>
  <Alignment ss:Horizontal="Center"/>
 </Style>
 <Style ss:ID="sRed">
  <Font ss:FontName="Arial" ss:Size="11" ss:Color="#B00020"/>
  <Interior ss:Color="#FFE0E0" ss:Pattern="Solid"/>
 </Style>
</Styles>`;

  if (hasFonts) {
    xml += `\n<Worksheet ss:Name="Font Check">
<Table ss:DefaultColumnWidth="100">
<Column ss:Width="35"/><Column ss:Width="220"/><Column ss:Width="160"/>
<Column ss:Width="120"/><Column ss:Width="80"/><Column ss:Width="80"/>
<Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="90"/>
<Column ss:Width="80"/><Column ss:Width="80"/>
${xlRow(fontHeaders.map((h) => xlCell(h, "sHead")))}
${fontRows.join("\n")}
</Table></Worksheet>`;
  }

  if (hasColors) {
    xml += `\n<Worksheet ss:Name="Color Check">
<Table ss:DefaultColumnWidth="100">
<Column ss:Width="100"/><Column ss:Width="90"/><Column ss:Width="90"/>
<Column ss:Width="160"/><Column ss:Width="60"/><Column ss:Width="130"/>
<Column ss:Width="60"/>
${xlRow(colorHeaders.map((h) => xlCell(h, "sHead")))}
${colorRows.join("\n")}
</Table></Worksheet>`;
  }

  if (!hasFonts && !hasColors) {
    xml += `\n<Worksheet ss:Name="Empty">
<Table><Row><Cell><Data ss:Type="String">No data. Run Scan and/or Check Colors first.</Data></Cell></Row></Table>
</Worksheet>`;
  }

  xml += "\n</Workbook>";
  return xml;
}

function exportReport() {
  if (!lastScan && !lastColorResult) { log("Run Scan or Check Colors first."); return; }
  const xml = buildExcelXml();
  csi.evalScript('qaSavePath("qa-report.xls")', (rawPath) => {
    let path = String(rawPath || "").replace(/^"|"$/g, "").trim();
    if (!path) { log("Export cancelled."); return; }
    if (!/\.\w+$/.test(path)) path += ".xls";
    const escaped = xml.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n");
    const pathEsc = path.replace(/\\/g, "/");
    callHost(`qaWriteFile("${pathEsc}", "${escaped}")`, (data) => {
      if (!data.ok) { log("Write failed: " + data.error); return; }
      log("Exported report: " + data.path);
    });
  });
}

/* ═══════════════════════════════════════════
   COLOR TAB — palette profiles + check
   ═══════════════════════════════════════════ */

const STORAGE_KEY = "qa-checker.colorProfiles";

/* ─── Profile storage ─── */
function loadProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { activeProfile: "", profiles: {} };
}

function saveProfiles(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}

function getActiveProfile() {
  const data = loadProfiles();
  if (!data.activeProfile || !data.profiles[data.activeProfile]) {
    const keys = Object.keys(data.profiles);
    if (keys.length) data.activeProfile = keys[0];
    else return null;
  }
  return data.profiles[data.activeProfile] || null;
}

/* ─── Palette parsing ─── */
function hexDistance(hex1, hex2) {
  const n1 = parseInt(hex1.replace("#", ""), 16);
  const n2 = parseInt(hex2.replace("#", ""), 16);
  const r = Math.abs(((n1 >> 16) & 255) - ((n2 >> 16) & 255));
  const g = Math.abs(((n1 >> 8) & 255) - ((n2 >> 8) & 255));
  const b = Math.abs((n1 & 255) - (n2 & 255));
  return Math.max(r, g, b);
}

function normalizeHex(raw) {
  let s = String(raw).trim().toUpperCase();
  if (s.charAt(0) !== "#") s = "#" + s;
  if (/^#[0-9A-F]{3}$/.test(s)) {
    s = "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (/^#[0-9A-F]{6}$/.test(s)) return s;
  return null;
}

function parsePaletteText(text) {
  const lines = String(text).split("\n");
  const colors = [];
  const seen = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("//")) continue;

    let hex = null;
    let name = "";

    // Format: #HEX // Name
    const commentIdx = trimmed.indexOf("//");
    if (commentIdx > 0) {
      const before = trimmed.substring(0, commentIdx).trim();
      const after = trimmed.substring(commentIdx + 2).trim();
      const h = normalizeHex(before);
      if (h) { hex = h; name = after; }
    }

    // Fallback: Name #HEX or just #HEX
    if (!hex) {
      const parts = trimmed.split(/\s+/);
      for (let i = parts.length - 1; i >= 0; i--) {
        const h = normalizeHex(parts[i]);
        if (h) {
          hex = h;
          name = parts.slice(0, i).join(" ").trim();
          break;
        }
      }
      if (!hex) {
        const h = normalizeHex(parts[0]);
        if (h) { hex = h; name = ""; }
      }
    }

    if (hex && !seen[hex]) {
      seen[hex] = true;
      colors.push({ hex, name: name || "" });
    }
  }
  return colors;
}

function colorsToText(colors) {
  return colors.map((c) => {
    if (c.name) return c.name + "  " + c.hex;
    return c.hex;
  }).join("\n");
}

/* ─── Profile UI ─── */
let paletteUnsaved = false;

function renderProfileSelect() {
  const data = loadProfiles();
  const sel = document.getElementById("profileSelect");
  sel.innerHTML = "";
  const keys = Object.keys(data.profiles);
  if (keys.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no profiles)";
    sel.appendChild(opt);
    document.getElementById("paletteInput").value = "";
    updatePalettePreview();
    document.getElementById("colorCheckBtn").disabled = true;
    return;
  }
  for (const k of keys) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    if (k === data.activeProfile) opt.selected = true;
    sel.appendChild(opt);
  }
  loadProfileIntoUI(data.activeProfile);
}

function loadProfileIntoUI(name) {
  const data = loadProfiles();
  const profile = data.profiles[name];
  if (!profile) return;
  data.activeProfile = name;
  saveProfiles(data);
  document.getElementById("paletteInput").value = profile.paletteText || "";
  paletteUnsaved = false;
  updatePalettePreview();
}

function updatePalettePreview() {
  const text = document.getElementById("paletteInput").value;
  const colors = parsePaletteText(text);
  const container = document.getElementById("paletteSwatches");
  container.innerHTML = "";
  for (const c of colors) {
    const sw = document.createElement("div");
    sw.className = "palette-swatch";
    sw.style.background = c.hex;
    sw.title = (c.name ? c.name + " " : "") + c.hex;

    const xBtn = document.createElement("span");
    xBtn.className = "swatch-delete";
    xBtn.textContent = "×";
    xBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeColorFromPalette(c.hex);
    });
    sw.appendChild(xBtn);

    container.appendChild(sw);
  }
  document.getElementById("paletteCount").textContent = colors.length + " color" + (colors.length !== 1 ? "s" : "");
  document.getElementById("colorCheckBtn").disabled = colors.length === 0;
}

function profileNew() {
  if (paletteUnsaved && !confirm("Unsaved changes in current palette. Discard?")) return;
  callHost("qaGetDocName()", (raw) => {
    let defaultName = "Default";
    if (typeof raw === "string" && raw.length > 0) {
      defaultName = raw.replace(/\.[^.]+$/, "");
    } else if (raw && raw.ok === false) {
      defaultName = "Default";
    }
    const name = prompt("Profile name:", defaultName);
    if (!name || !name.trim()) return;
    const data = loadProfiles();
    if (data.profiles[name.trim()]) {
      alert("Profile \"" + name.trim() + "\" already exists.");
      return;
    }
    data.profiles[name.trim()] = {
      name: name.trim(),
      paletteText: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.activeProfile = name.trim();
    saveProfiles(data);
    paletteUnsaved = false;
    renderProfileSelect();
    log("Created profile: " + name.trim());
  });
}

function profileRename() {
  const data = loadProfiles();
  if (!data.activeProfile) return;
  const newName = prompt("Rename \"" + data.activeProfile + "\" to:", data.activeProfile);
  if (!newName || !newName.trim() || newName.trim() === data.activeProfile) return;
  if (data.profiles[newName.trim()]) {
    alert("Profile \"" + newName.trim() + "\" already exists.");
    return;
  }
  const profile = data.profiles[data.activeProfile];
  delete data.profiles[data.activeProfile];
  profile.name = newName.trim();
  data.profiles[newName.trim()] = profile;
  data.activeProfile = newName.trim();
  saveProfiles(data);
  renderProfileSelect();
  log("Renamed to: " + newName.trim());
}

function profileDelete() {
  const data = loadProfiles();
  if (!data.activeProfile) return;
  if (!confirm("Delete profile \"" + data.activeProfile + "\"?")) return;
  delete data.profiles[data.activeProfile];
  const keys = Object.keys(data.profiles);
  data.activeProfile = keys.length ? keys[0] : "";
  saveProfiles(data);
  paletteUnsaved = false;
  renderProfileSelect();
  log("Deleted profile.");
}

function removeColorFromPalette(hex) {
  const input = document.getElementById("paletteInput");
  const lines = input.value.split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return true;
    const h = normalizeHex(trimmed.split(/\s+/).reverse().find((p) => normalizeHex(p)) || "");
    return h !== hex;
  });
  input.value = filtered.join("\n");
  paletteUnsaved = true;
  updatePalettePreview();
}

function showSaveToast(msg) {
  let toast = document.getElementById("saveToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "saveToast";
    toast.className = "save-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => toast.classList.remove("show"), 2500);
}

function paletteSave() {
  const data = loadProfiles();
  if (!data.activeProfile) {
    profileNew();
    return;
  }
  data.profiles[data.activeProfile].paletteText = document.getElementById("paletteInput").value;
  data.profiles[data.activeProfile].updatedAt = new Date().toISOString();
  saveProfiles(data);
  paletteUnsaved = false;
  updatePalettePreview();
  const count = parsePaletteText(data.profiles[data.activeProfile].paletteText).length;
  log("Palette saved (" + count + " colors).");
  showSaveToast("Saved — " + count + " colors");
}

function paletteImportJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        let colors = [];
        if (Array.isArray(json)) {
          colors = json;
        } else if (json.colors && Array.isArray(json.colors)) {
          colors = json.colors;
        }
        const lines = [];
        let lastGroup = null;
        for (const c of colors) {
          const hex = normalizeHex(c.hex || c.color || c.value || "");
          if (!hex) continue;
          const group = c.group || c.category || "";
          if (group && group !== lastGroup) {
            if (lines.length) lines.push("");
            lines.push("// " + group);
            lastGroup = group;
          }
          const name = c.name || c.label || "";
          lines.push(name ? hex + " // " + name : hex);
        }
        document.getElementById("paletteInput").value = lines.join("\n");
        paletteUnsaved = true;
        updatePalettePreview();
        log("Imported " + colors.length + " colors from JSON.");
      } catch (e) {
        log("Import JSON error: " + e.message);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function palettePickFromFile() {
  const scope = "document";
  log("Picking colors from file...");
  callHost(`qaScanColors("${esEscape(scope)}")`, (data) => {
    if (!data.ok) { log("Pick error: " + data.error); return; }
    if (!data.colors || data.colors.length === 0) { log("No colors found."); return; }
    const lines = [];
    for (const c of data.colors) {
      const hex = c.baseHex || c.hex || "";
      if (hex) lines.push(hex);
    }
    const unique = [];
    const seen = {};
    for (const h of lines) {
      if (!seen[h]) { seen[h] = true; unique.push(h); }
    }
    document.getElementById("paletteInput").value = unique.join("\n");
    paletteUnsaved = true;
    updatePalettePreview();
    log("Picked " + unique.length + " unique colors from file.");
  });
}

/* ─── Color check ─── */
function runColorCheck() {
  const palette = parsePaletteText(document.getElementById("paletteInput").value);
  if (palette.length === 0) { log("Palette is empty."); return; }
  const scope = document.querySelector('input[name="colorScope"]:checked').value;
  log("Checking colors (" + scope + ")...");
  document.getElementById("colorSpinner").style.display = "";
  document.getElementById("colorCheckBtn").disabled = true;
  const t0 = Date.now();
  callHost(`qaScanColors("${esEscape(scope)}")`, (data) => {
    document.getElementById("colorSpinner").style.display = "none";
    document.getElementById("colorCheckBtn").disabled = false;
    if (!data.ok) { log("Check error: " + data.error); return; }
    const dt = Date.now() - t0;

    const paletteSet = {};
    const paletteNames = {};
    for (const c of palette) {
      paletteSet[c.hex] = true;
      if (c.name) paletteNames[c.hex] = c.name;
    }

    const matched = [];
    const off = [];
    for (const c of (data.colors || [])) {
      const checkHex = (c.baseHex || c.hex || "").toUpperCase();
      if (!checkHex) continue;
      if (paletteSet[checkHex]) {
        c.matchName = paletteNames[checkHex] || "";
        matched.push(c);
      } else {
        // Find nearest palette color + distance
        let bestDist = Infinity, bestHex = "";
        for (const p of palette) {
          const d = hexDistance(checkHex, p.hex);
          if (d < bestDist) { bestDist = d; bestHex = p.hex; }
        }
        c.nearestHex = bestHex;
        c.nearestDist = bestDist;
        off.push(c);
      }
    }

    if (off.length > 0) {
      setBadge("badgeColor", off.length, "fail");
      setTabColor("color", "fail");
    } else {
      setBadge("badgeColor", "✓", "pass");
      setTabColor("color", "pass");
    }

    lastColorResult = { matched, off };
    log(`Done in ${dt}ms — ${data.colors.length} colors, ${off.length} off-palette.`);
    renderColorResult(matched, off, new Date().toLocaleTimeString());
  });
}

function renderColorResult(matched, off, timestamp) {
  document.getElementById("colorResultSection").style.display = "";

  const statusEl = document.getElementById("colorResultStatus");
  const ts = timestamp ? "  (" + timestamp + ")" : "";
  if (off.length === 0) {
    statusEl.className = "color-result-status match";
    statusEl.textContent = "Color match — all " + (matched.length + off.length) + " colors in palette." + ts;
  } else {
    statusEl.className = "color-result-status nomatch";
    statusEl.textContent = "Color no match — " + off.length + " off-palette." + ts;
  }

  const offSection = document.getElementById("colorOffSection");
  const offList = document.getElementById("colorOffList");
  offList.innerHTML = "";
  if (off.length > 0) {
    offSection.style.display = "";
    document.getElementById("colorOffCount").textContent = off.length;
    for (const c of off) {
      offList.appendChild(buildColorItem(c, true));
    }
  } else {
    offSection.style.display = "none";
  }

  const matchSection = document.getElementById("colorMatchSection");
  const matchList = document.getElementById("colorMatchList");
  matchList.innerHTML = "";
  if (matched.length > 0) {
    matchSection.style.display = "";
    document.getElementById("colorMatchCount").textContent = matched.length;
    for (const c of matched) {
      matchList.appendChild(buildColorItem(c, false));
    }
  } else {
    matchSection.style.display = "none";
  }
}

function buildColorItem(c, isOff) {
  const el = document.createElement("div");
  el.className = "color-item" + (isOff ? " off" : "");

  const sw = document.createElement("div");
  sw.className = "ci-swatch";
  sw.style.background = c.hex || c.baseHex || "#000";
  el.appendChild(sw);

  const info = document.createElement("div");
  info.className = "ci-info";

  const hexLine = document.createElement("div");
  hexLine.className = "ci-hex";
  hexLine.textContent = c.baseHex || c.hex || "—";
  info.appendChild(hexLine);

  if (c.matchName) {
    const nameLine = document.createElement("div");
    nameLine.className = "ci-name";
    nameLine.textContent = c.matchName;
    info.appendChild(nameLine);
  }

  if (isOff && c.nearestHex) {
    const nearLine = document.createElement("div");
    nearLine.className = "ci-detail";
    nearLine.style.color = "#ff9800";
    nearLine.style.fontFamily = '"Courier New", monospace';
    nearLine.textContent = "nearest: " + c.nearestHex + " (diff " + c.nearestDist + ")";
    info.appendChild(nearLine);
  }

  if (c.tint != null && c.tint < 100) {
    const tintLine = document.createElement("div");
    tintLine.className = "ci-detail";
    tintLine.textContent = "Tint: " + Math.round(c.tint) + "% → displayed as " + (c.hex || "");
    info.appendChild(tintLine);
  }

  const srcTypes = (c.sourceTypes || []).join(", ");
  if (srcTypes) {
    const srcLine = document.createElement("div");
    srcLine.className = "ci-detail";
    srcLine.textContent = srcTypes;
    info.appendChild(srcLine);
  }

  if (c.stopInfo && c.stopInfo.length > 0 && c.stopInfo.length <= 3) {
    for (const si of c.stopInfo) {
      const stopLine = document.createElement("div");
      stopLine.className = "ci-detail";
      stopLine.textContent = "Gradient \"" + si.name + "\" stop " + (si.stop + 1);
      info.appendChild(stopLine);
    }
  } else if (c.stopInfo && c.stopInfo.length > 3) {
    const stopLine = document.createElement("div");
    stopLine.className = "ci-detail";
    stopLine.textContent = "Gradient stops (" + c.stopInfo.length + " occurrences)";
    info.appendChild(stopLine);
  }

  el.appendChild(info);

  const count = document.createElement("div");
  count.className = "ci-count";
  count.textContent = "x" + (c.count || 1);
  el.appendChild(count);

  if (c.itemIdxs && c.itemIdxs.length > 0) {
    el.addEventListener("click", () => {
      const csv = c.itemIdxs.join(",");
      callHost(`qaSelectColorItems("${esEscape(csv)}")`, (resp) => {
        if (!resp.ok) { log("Select failed: " + resp.error); return; }
        log("Selected " + resp.count + " item(s).");
      });
    });
  }

  return el;
}

/* ─── Matched section toggle ─── */
function initMatchToggle() {
  const toggle = document.getElementById("colorMatchToggle");
  const list = document.getElementById("colorMatchList");
  toggle.addEventListener("click", () => {
    const open = toggle.classList.toggle("open");
    list.style.display = open ? "" : "none";
  });
}

/* ─── Init ─── */
document.querySelectorAll(".tab-btn").forEach((b) =>
  b.addEventListener("click", () => switchMode(b.dataset.mode)));
document.querySelectorAll(".view-btn").forEach((b) =>
  b.addEventListener("click", () => switchView(b.dataset.view)));
document.getElementById("liveEnabled").addEventListener("change", toggleLive);
document.getElementById("scanBtn").addEventListener("click", runScan);
document.getElementById("exportReportBtn").addEventListener("click", exportReport);

document.getElementById("profileSelect").addEventListener("change", (e) => {
  if (paletteUnsaved && !confirm("Unsaved changes. Discard?")) {
    const data = loadProfiles();
    e.target.value = data.activeProfile;
    return;
  }
  loadProfileIntoUI(e.target.value);
});
document.getElementById("profileNewBtn").addEventListener("click", profileNew);
document.getElementById("profileRenameBtn").addEventListener("click", profileRename);
document.getElementById("profileDeleteBtn").addEventListener("click", profileDelete);
document.getElementById("paletteSaveBtn").addEventListener("click", paletteSave);
document.getElementById("paletteImportBtn").addEventListener("click", paletteImportJson);
document.getElementById("palettePickBtn").addEventListener("click", palettePickFromFile);
document.getElementById("paletteInput").addEventListener("input", () => {
  paletteUnsaved = true;
  updatePalettePreview();
});
document.getElementById("colorCheckBtn").addEventListener("click", runColorCheck);
document.getElementById("exportReportBtn2").addEventListener("click", exportReport);
initMatchToggle();

document.getElementById("scanFilterInput").addEventListener("input", renderScanSummaryFiltered);
document.getElementById("scanSortSelect").addEventListener("change", renderScanSummaryFiltered);

document.getElementById("logsToggle").addEventListener("click", (e) => {
  if (e.target.id === "clearLogBtn") return;
  const toggle = document.getElementById("logsToggle");
  const box = document.getElementById("logBox");
  const open = toggle.classList.toggle("open");
  box.style.display = open ? "" : "none";
});
document.getElementById("clearLogBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("logBox").textContent = "Ready.";
});

switchMode("live");
switchView("summary");
renderProfileSelect();
toggleLive();
log("QA Checker ready (CEP).");
