/* ─────────────────────────────────────────────
   QA Checker — CEP panel UI for Illustrator
   Calls host.jsx via CSInterface.evalScript
   ───────────────────────────────────────────── */

const csi = new CSInterface();

let lastScan = null;        // { frames, summary, stats }
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

function addMetricRow(parent, label, value, opts) {
  opts = opts || {};
  const row = document.createElement("div");
  row.className = "metric-row" + (opts.highlight ? " highlight" : "");
  const l = document.createElement("span");
  l.className = "metric-label";
  l.textContent = label;
  const v = document.createElement("span");
  v.className = "metric-value";
  v.textContent = value;
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

  /* ─── Head: font family only ─── */
  const head = document.createElement("div");
  head.className = "run-head";

  const famWrap = document.createElement("div");
  famWrap.className = "run-family-wrap";

  const fam = document.createElement("div");
  fam.className = "run-family";
  fam.textContent = run.family || "(no font)";
  famWrap.appendChild(fam);

  head.appendChild(famWrap);

  if (run.missing) {
    const b = document.createElement("span");
    b.className = "run-missing-badge";
    b.textContent = "MISSING";
    head.appendChild(b);
  }
  if (typeof opts.count === "number") {
    const c = document.createElement("div");
    c.className = "run-count-badge";
    c.textContent = "×" + opts.count;
    head.appendChild(c);
  }
  card.appendChild(head);

  /* ─── Metrics table (label / value) ─── */
  const metrics = document.createElement("div");
  metrics.className = "run-metrics";

  addMetricRow(
    metrics,
    "font-weight",
    `${parsedStyle.weightNum}  (${parsedStyle.weightName})`
  );
  addMetricRow(
    metrics,
    "font-style",
    parsedStyle.isItalic ? "italic" : "normal",
    parsedStyle.isItalic ? { highlight: true } : {}
  );

  addMetricRow(metrics, "font-size", run.size ? fmt(run.size) + " pt" : "—", { highlight: true });

  const leadingStr = run.autoLeading
    ? "auto" + (run.leading ? " (" + fmt(run.leading) + " pt)" : "")
    : (run.leading ? fmt(run.leading) + " pt" : "—");
  addMetricRow(metrics, "line-height", leadingStr);

  if (run.tracking != null && run.size) {
    const trPt = (run.tracking * run.size) / 1000;
    const trStr = `${fmt(trPt)} pt  (${Math.round(run.tracking)})`;
    addMetricRow(metrics, "letter-spacing", trStr);
  } else {
    addMetricRow(metrics, "letter-spacing", "—");
  }

  if (run.baselineShift != null && Math.abs(run.baselineShift) > 0.01) {
    addMetricRow(metrics, "baseline-shift", fmt(run.baselineShift) + " pt");
  }

  /* Color row with swatch */
  const colorRow = document.createElement("div");
  colorRow.className = "metric-row color-row";
  const colLabel = document.createElement("span");
  colLabel.className = "metric-label";
  colLabel.textContent = "color";
  colorRow.appendChild(colLabel);
  const colVal = document.createElement("span");
  colVal.className = "metric-value color-value";
  const sw = document.createElement("span");
  sw.className = "color-swatch";
  sw.style.background = colorPreview(run.color);
  colVal.appendChild(sw);
  const hex = document.createElement("span");
  hex.className = "color-hex";
  hex.textContent = run.color && run.color.hex ? run.color.hex : (run.color ? run.color.model : "—");
  colVal.appendChild(hex);
  colorRow.appendChild(colVal);
  metrics.appendChild(colorRow);

  if (run.color && run.color.model && run.color.model !== "RGB" && run.color.hex) {
    const sub = document.createElement("div");
    sub.className = "color-sub";
    sub.textContent = run.color.display;
    metrics.appendChild(sub);
  } else if (run.color && !run.color.hex && run.color.display) {
    const sub = document.createElement("div");
    sub.className = "color-sub";
    sub.textContent = run.color.display;
    metrics.appendChild(sub);
  }

  card.appendChild(metrics);

  /* PS name (small, bottom) */
  if (run.psName) {
    const ps = document.createElement("div");
    ps.className = "run-ps";
    ps.textContent = "PostScript: " + run.psName;
    card.appendChild(ps);
  }

  /* Sample text */
  const sample = opts.sample != null ? opts.sample : (run.text || "");
  if (sample) {
    const s = document.createElement("div");
    s.className = "run-sample";
    const trimmed = String(sample).replace(/\s+/g, " ").trim();
    s.textContent = '"' + trimmed.slice(0, 80) + (trimmed.length > 80 ? "…" : "") + '"';
    card.appendChild(s);
  }
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
    document.getElementById("liveStatus").textContent = "Live inspect tat.";
    document.getElementById("liveStatus").classList.remove("active");
    document.getElementById("liveResult").innerHTML = "";
  }
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
          ? "Khong co document dang mo."
          : "Chon 1 text frame tren canvas de xem info.";
        statusEl.classList.remove("active");
        resultEl.innerHTML = "";
      }
      return;
    }
    const frames = data.frames || [];
    const key = frames.map((f) => f.runs.map((r) => r.key).join(";")).join("||");
    if (key === lastLiveKey) return;
    lastLiveKey = key;

    const totalRuns = frames.reduce((s, f) => s + f.runs.length, 0);
    statusEl.textContent = `${frames.length} text frame(s) selected — ${totalRuns} run(s).`;
    statusEl.classList.add("active");
    resultEl.innerHTML = "";
    frames.forEach((f, i) => {
      if (frames.length > 1) {
        const head = document.createElement("div");
        head.className = "detail-frame-head";
        head.innerHTML = `<strong>#${i + 1}</strong><span>${escapeHtml((f.contents || "").slice(0, 40))}</span>`;
        resultEl.appendChild(head);
      }
      f.runs.forEach((r) => resultEl.appendChild(buildRunCard(r, { sample: f.contents })));
    });
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
  document.getElementById("exportCsvBtn").disabled = result.stats.runCount === 0;
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
    summaryEl.appendChild(emptyState(lastScan && lastScan.summary && lastScan.summary.length > 0 ? "No results matching filter." : "Khong co text nao."));
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
    detailsEl.appendChild(emptyState("Khong co text frame."));
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

/* ─── Export CSV ─── */
function csvEscape(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function buildCsv(scan) {
  const headers = [
    "Frame #", "Text", "Family", "Style", "PostScript",
    "Size (pt)", "Leading (pt)", "Auto Leading", "Tracking", "H Scale %", "V Scale %", "Baseline Shift",
    "Color Model", "Hex", "Color Display", "Missing"
  ];
  const rows = [headers];
  scan.frames.forEach((f, idx) => {
    f.runs.forEach((r) => {
      rows.push([
        idx + 1,
        (f.contents || "").replace(/\s+/g, " ").slice(0, 200),
        r.family,
        r.style,
        r.psName,
        fmt(r.size),
        fmt(r.leading),
        r.autoLeading ? "YES" : "",
        r.tracking != null ? Math.round(r.tracking) : "",
        fmt(r.hScale),
        fmt(r.vScale),
        fmt(r.baselineShift),
        r.color ? r.color.model : "",
        r.color ? r.color.hex : "",
        r.color ? r.color.display : "",
        r.missing ? "YES" : "",
      ]);
    });
  });
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function exportCsv() {
  if (!lastScan) { log("Hay Scan truoc khi export."); return; }
  const csv = buildCsv(lastScan);
  csi.evalScript('qaSavePath("qa-report.csv")', (path) => {
    path = String(path || "").replace(/^"|"$/g, "");
    if (!path) { log("Da huy export."); return; }
    try {
      if (window.cep && window.cep.fs && typeof window.cep.fs.writeFile === "function") {
        const res = window.cep.fs.writeFile(path, csv);
        if (res && res.err) { log("Write failed (err=" + res.err + ")"); return; }
        log("Exported CSV: " + path);
      } else {
        log("cep.fs not available. Enable --enable-nodejs in manifest.");
      }
    } catch (e) {
      log("Export error: " + e.message);
    }
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
    const parts = trimmed.split(/\s+/);
    let hex = null;
    let name = "";
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
          lines.push(name ? name + "  " + hex : hex);
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
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);

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
initMatchToggle();

document.getElementById("scanFilterInput").addEventListener("input", renderScanSummaryFiltered);
document.getElementById("scanSortSelect").addEventListener("change", renderScanSummaryFiltered);

document.getElementById("logsToggle").addEventListener("click", () => {
  const toggle = document.getElementById("logsToggle");
  const box = document.getElementById("logBox");
  const open = toggle.classList.toggle("open");
  box.style.display = open ? "" : "none";
});

switchMode("live");
switchView("summary");
renderProfileSelect();
toggleLive();
log("QA Checker ready (CEP).");
