/* ─────────────────────────────────────────────
   Banner Cloner — CEP panel UI for Illustrator
   Calls host.jsx via CSInterface.evalScript
   ───────────────────────────────────────────── */

const csi = new CSInterface();

const PRESETS = [
  "300x250", "300x600", "160x600", "728x90", "320x50", "300x50",
  "970x250", "480x320", "1080x1080", "1080x1920", "1920x1080",
  "1080x1440", "1080x1350"
];

const STORE_KEYS = {
  sizes: "bc.sizes",
  bgName: "bc.bgName",
  ggPrefix: "bc.ggPrefix",
  smartMatch: "bc.smartMatch",
  suffix: "bc.suffix",
  rules: "bc.rules",
  rulesMeta: "bc.rulesMeta",
  exportFolder: "bc.exportFolder"
};

let state = {
  rulesJson: null,
  rulesMeta: null,
  source: null
};

/* ─── DOM ─── */
const $ = (id) => document.getElementById(id);
const sizesInput = $("sizesInput");
const presetWrap = $("presetWrap");
const cloneBtn = $("cloneBtn");
const exportBtn = $("exportBtn");
const splitBtn = $("splitBtn");
const refreshBtn = $("refreshBtn");
const sourceNameEl = $("sourceName");
const sourceSizeEl = $("sourceSize");
const sizesCountLabel = $("sizesCountLabel");
const jsonStatus = $("jsonStatus");
const cloneProgress = $("cloneProgress");
const progressFill = $("progressFill");
const progressText = $("progressText");

const smartMatchEl = $("smartMatchEnabled");
const suffixNameEl = $("suffixName");
const ggPrefixInput = $("ggPrefixInput");
const bgLayerInput = $("bgLayerInput");
const importJsonBtn = $("importJsonBtn");
const clearJsonBtn = $("clearJsonBtn");
const importInfoCard = $("importInfoCard");
const importModuleName = $("importModuleName");
const importSizeCount = $("importSizeCount");
const importRuleCount = $("importRuleCount");

const logBox = $("logBox");
const logsToggle = $("logsToggle");
const clearLogBtn = $("clearLogBtn");

/* ─── Logging ─── */
function log(msg, kind) {
  const t = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.className = "log-line " + (kind ? "log-" + kind : "");
  line.textContent = `[${t}] ${msg}`;
  logBox.appendChild(line);
  if (kind === "error") {
    expandLogs(true);
    logsToggle.classList.add("has-error");
    setTimeout(() => logsToggle.classList.remove("has-error"), 4000);
  }
  line.scrollIntoView({ block: "nearest" });
}
function logHostLines(lines) {
  if (!lines || !lines.length) return;
  for (const m of lines) {
    let kind = null;
    if (/error|fail/i.test(m)) kind = "error";
    else if (/created|complete|→ ok|saved|exported|jpg →|ai saved/i.test(m)) kind = "success";
    log(m, kind);
  }
}

function expandLogs(open) {
  const isOpen = open != null ? open : logBox.style.display === "none";
  logBox.style.display = isOpen ? "" : "none";
  logsToggle.classList.toggle("expanded", isOpen);
}

/* ─── Host bridge ─── */
function callHost(fnName, args, cb) {
  const code = args === undefined ? `${fnName}()` : `${fnName}(${JSON.stringify(args)})`;
  csi.evalScript(code, (resp) => {
    let data;
    if (resp == null || resp === "") {
      data = { ok: false, error: "Empty response from host" };
    } else if (resp === "EvalScript error.") {
      data = { ok: false, error: "EvalScript error (check host.jsx syntax)" };
    } else {
      try { data = JSON.parse(resp); }
      catch (e) { data = { ok: false, error: "Bad JSON: " + String(resp).slice(0, 200) }; }
    }
    if (data && data.log) logHostLines(data.log);
    if (typeof cb === "function") cb(data);
  });
}

/* ─── Sizes parsing + presets ─── */
function parseSizes(s) {
  return String(s || "").split(/[\s,]+/)
    .map(x => x.trim()).filter(Boolean)
    .map(token => {
      const m = token.match(/^(\d+)x(\d+)$/i);
      return m ? { raw: token, w: Number(m[1]), h: Number(m[2]) } : null;
    })
    .filter(Boolean);
}

function updateSizesCount() {
  const n = parseSizes(sizesInput.value).length;
  sizesCountLabel.textContent = n > 0 ? `(${n} selected)` : "";
}

function renderPresets() {
  presetWrap.innerHTML = "";
  const current = new Set(parseSizes(sizesInput.value).map(s => s.raw));
  for (const sz of PRESETS) {
    const chip = document.createElement("button");
    chip.className = "preset-chip" + (current.has(sz) ? " active" : "");
    chip.textContent = sz;
    chip.addEventListener("click", () => {
      const list = parseSizes(sizesInput.value).map(s => s.raw);
      const next = list.includes(sz) ? list.filter(x => x !== sz) : [...list, sz];
      sizesInput.value = next.join(" ");
      renderPresets();
      updateSizesCount();
      saveSettings();
    });
    presetWrap.appendChild(chip);
  }
}

/* ─── Settings storage ─── */
function loadSettings() {
  try {
    sizesInput.value = localStorage.getItem(STORE_KEYS.sizes) || "300x250";
    bgLayerInput.value = localStorage.getItem(STORE_KEYS.bgName) || "gg-background";
    ggPrefixInput.value = localStorage.getItem(STORE_KEYS.ggPrefix) || "";
    const sm = localStorage.getItem(STORE_KEYS.smartMatch);
    smartMatchEl.checked = sm === null ? true : sm === "1";
    const sf = localStorage.getItem(STORE_KEYS.suffix);
    suffixNameEl.checked = sf === null ? true : sf === "1";
    const rules = localStorage.getItem(STORE_KEYS.rules);
    if (rules) {
      try {
        state.rulesJson = JSON.parse(rules);
        state.rulesMeta = JSON.parse(localStorage.getItem(STORE_KEYS.rulesMeta) || "null");
      } catch (e) {}
    }
  } catch (e) {}
}

function saveSettings() {
  try {
    localStorage.setItem(STORE_KEYS.sizes, sizesInput.value);
    localStorage.setItem(STORE_KEYS.bgName, bgLayerInput.value);
    localStorage.setItem(STORE_KEYS.ggPrefix, ggPrefixInput.value);
    localStorage.setItem(STORE_KEYS.smartMatch, smartMatchEl.checked ? "1" : "0");
    localStorage.setItem(STORE_KEYS.suffix, suffixNameEl.checked ? "1" : "0");
  } catch (e) {}
}

function saveRules() {
  try {
    if (state.rulesJson) {
      localStorage.setItem(STORE_KEYS.rules, JSON.stringify(state.rulesJson));
      localStorage.setItem(STORE_KEYS.rulesMeta, JSON.stringify(state.rulesMeta || {}));
    } else {
      localStorage.removeItem(STORE_KEYS.rules);
      localStorage.removeItem(STORE_KEYS.rulesMeta);
    }
  } catch (e) {}
}

function updateJsonStatus() {
  if (state.rulesJson && state.rulesJson.sizes) {
    const sizes = state.rulesJson.sizes.length;
    let totalRules = 0;
    for (const s of state.rulesJson.sizes) {
      totalRules += Object.keys(s.elements || {}).length;
    }
    jsonStatus.textContent = `JSON: ${sizes} sizes, ${totalRules} rules`;
    jsonStatus.className = "json-status loaded";

    importInfoCard.style.display = "";
    importModuleName.textContent = state.rulesJson.moduleName || "—";
    importSizeCount.textContent = sizes;
    importRuleCount.textContent = totalRules;
  } else {
    jsonStatus.textContent = "No JSON imported";
    jsonStatus.className = "json-status";
    importInfoCard.style.display = "none";
  }
}

/* ─── Source detection ─── */
function refreshSource() {
  callHost("bcDetectSource", undefined, (data) => {
    if (!data.ok) {
      sourceNameEl.textContent = "—";
      sourceSizeEl.textContent = "—";
      log("Source: " + data.error, "error");
      state.source = null;
      return;
    }
    state.source = data;
    sourceNameEl.textContent = data.name || "(unnamed)";
    sourceSizeEl.textContent = `${data.width}x${data.height}  (artboard ${data.artboardIndex + 1}/${data.artboardCount})`;
  });
}

/* ─── Tabs ─── */
function switchMode(mode) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === mode));
  $("clonePanel").style.display = mode === "clone" ? "" : "none";
  $("settingsPanel").style.display = mode === "settings" ? "" : "none";
}

/* ─── Clone action ─── */
function doClone() {
  const sizes = parseSizes(sizesInput.value);
  if (!sizes.length) { log("No valid sizes parsed.", "error"); return; }

  cloneBtn.disabled = true;
  cloneBtn.textContent = "Cloning...";
  cloneProgress.style.display = "";
  progressFill.style.width = "10%";
  progressText.textContent = `Cloning ${sizes.length} size(s)...`;

  const opts = {
    sizes: sizes,
    rulesJson: state.rulesJson,
    bgName: bgLayerInput.value.trim(),
    ggPrefix: ggPrefixInput.value.trim(),
    suffix: suffixNameEl.checked,
    smartMatch: smartMatchEl.checked
  };

  callHost("bcCloneSizes", opts, (data) => {
    cloneBtn.disabled = false;
    cloneBtn.textContent = "Clone Artboards";
    progressFill.style.width = "100%";
    setTimeout(() => { cloneProgress.style.display = "none"; progressFill.style.width = "0%"; }, 600);

    if (!data.ok) {
      log("Clone failed: " + data.error, "error");
      return;
    }
    const created = data.created || [];
    log(`Cloned ${created.length} artboard(s): ${created.map(c => c.name).join(", ")}`, "success");
    refreshSource();
  });
}

/* ─── Export action ─── */
function doExport() {
  exportBtn.disabled = true;
  exportBtn.textContent = "Picking folder...";

  callHost("bcPickFolder", "Choose output folder", (data) => {
    if (!data.ok || !data.path) {
      exportBtn.disabled = false;
      exportBtn.textContent = "Export";
      log("Export cancelled.", "meta");
      return;
    }
    const baseFolder = data.path;
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const baseName = (state.source && state.source.baseName) || "banner";
    const folder = `${baseFolder}/${baseName}-output-working-file-${stamp}`;

    exportBtn.textContent = "Exporting...";
    cloneProgress.style.display = "";
    progressFill.style.width = "20%";
    progressText.textContent = "Exporting JPG + AI...";

    callHost("bcExportArtboards", { folder, jpgQuality: 80, saveAi: true }, (resp) => {
      exportBtn.disabled = false;
      exportBtn.textContent = "Export";
      progressFill.style.width = "100%";
      setTimeout(() => { cloneProgress.style.display = "none"; progressFill.style.width = "0%"; }, 600);

      if (!resp.ok) { log("Export failed: " + resp.error, "error"); return; }
      log(`Exported ${(resp.jpgPaths || []).length} JPGs + AI to ${folder}`, "success");
    });
  });
}

/* ─── JSON import ─── */
function importJson() {
  callHost("bcPickFile", "Choose layer-rules JSON", (data) => {
    if (!data.ok || !data.path) return;
    callHost("bcReadFile", data.path, (resp) => {
      if (!resp.ok) { log("Read JSON failed: " + resp.error, "error"); return; }
      try {
        const json = JSON.parse(resp.content);
        if (!json.sizes || !json.sizes.length) {
          log("JSON has no .sizes array.", "error");
          return;
        }
        state.rulesJson = json;
        state.rulesMeta = { path: data.path, importedAt: Date.now() };
        saveRules();
        updateJsonStatus();
        log(`JSON imported: ${json.moduleName || "(no name)"} — ${json.sizes.length} sizes`, "success");
      } catch (e) {
        log("JSON parse error: " + e.message, "error");
      }
    });
  });
}

function clearJson() {
  state.rulesJson = null;
  state.rulesMeta = null;
  saveRules();
  updateJsonStatus();
  log("JSON cleared.", "meta");
}

/* ─── Load host script manually (ScriptPath can silently fail in CEP) ─── */
let hostLoaded = false;

function loadHostScript(cb) {
  const extPath = csi.getSystemPath(SystemPath.EXTENSION);
  const hostPath = (extPath + "/host/host.jsx").replace(/\\/g, "/");
  log("Loading host: " + hostPath, "meta");

  // Read the file, eval its content, and report any error with line number
  const loadCode = [
    'var __bcResult = "UNKNOWN";',
    'var __bcFile = new File("' + hostPath + '");',
    'if (!__bcFile.exists) {',
    '  __bcResult = "NOTFOUND:" + __bcFile.fsName;',
    '} else {',
    '  __bcFile.encoding = "UTF-8";',
    '  __bcFile.open("r");',
    '  var __bcCode = __bcFile.read();',
    '  __bcFile.close();',
    '  __bcResult = "READ_OK:" + __bcCode.length + "chars";',
    '  try {',
    '    eval(__bcCode);',
    '    if (typeof bcPing === "function") __bcResult = "LOAD_OK";',
    '    else __bcResult = "NODEF:bcPing not found after eval";',
    '  } catch(__bcE) {',
    '    __bcResult = "EVAL_ERR:" + (__bcE.message||"") + " @line:" + (__bcE.line||"?");',
    '  }',
    '}',
    '__bcResult;'
  ].join("\n");

  csi.evalScript(loadCode, (resp) => {
    const r = String(resp || "");
    log("Load result: " + r, r.indexOf("LOAD_OK") === 0 ? "success" : "error");
    hostLoaded = r.indexOf("LOAD_OK") === 0;
    if (typeof cb === "function") cb();
  });
}

/* ─── Init ─── */
function init() {
  loadSettings();
  renderPresets();
  updateSizesCount();
  updateJsonStatus();

  document.querySelectorAll(".tab-btn").forEach(b =>
    b.addEventListener("click", () => switchMode(b.dataset.mode)));

  sizesInput.addEventListener("input", () => {
    renderPresets(); updateSizesCount(); saveSettings();
  });
  bgLayerInput.addEventListener("input", saveSettings);
  ggPrefixInput.addEventListener("input", saveSettings);
  smartMatchEl.addEventListener("change", saveSettings);
  suffixNameEl.addEventListener("change", saveSettings);

  cloneBtn.addEventListener("click", doClone);
  exportBtn.addEventListener("click", doExport);
  refreshBtn.addEventListener("click", refreshSource);
  importJsonBtn.addEventListener("click", importJson);
  clearJsonBtn.addEventListener("click", clearJson);

  logsToggle.addEventListener("click", (e) => {
    if (e.target === clearLogBtn) return;
    expandLogs();
  });
  clearLogBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    logBox.innerHTML = "";
    log("Cleared.", "meta");
  });

  log("Banner Cloner ready.", "meta");

  // Explicitly load host.jsx, then probe source
  loadHostScript(() => {
    setTimeout(refreshSource, 100);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
