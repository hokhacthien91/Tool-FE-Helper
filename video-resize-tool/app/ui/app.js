// Video Resize UI. Plain JS, no build step. State lives on the server (job.json);
// local drafts keep what the user is editing across polls.
"use strict";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STAGES = [["intake", "1 · Intake"], ["roles", "2 · Layer roles"], ["review", "3 · Review sizes"], ["render", "4 · Render & deliver"]];
const ORDER = { intake: 0, roles: 1, review: 2, render: 3, done: 3 };

let job = null, jobSig = "", presets = [], pollT = null;
const draft = { master: null, sizes: null, roles: {}, params: {}, decision: {}, ack: false, filterLow: false };

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  // Errors come with a non-2xx status. A job's own "error" field (the last step
  // failed) is data to show, not a failed request: treating it as one left the
  // whole job page blank.
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
// Error bar with a close button. A job error stays in job.json until the next
// step starts, so closing it also clears it on the server.
function showErr(e) {
  const el = $("#err");
  if (!e) { el.classList.add("hidden"); return; }
  el.innerHTML = `<span>${esc(e.message || String(e))}</span><button class="ghost small" id="errx" title="Dismiss" aria-label="Dismiss">${ic("x")}</button>`;
  const wasHidden = el.classList.contains("hidden");
  el.classList.remove("hidden");
  // A button low on the page used to fail with the bar out of sight (review BAR-01).
  if (wasHidden && el.getBoundingClientRect().bottom < 0) el.scrollIntoView({ block: "nearest" });
  $("#errx").onclick = async () => {
    el.classList.add("hidden");
    if (job && job.error) {
      try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/clear_error`); job.error = null; } catch (x) { /* shown again on next poll */ }
    }
  };
}
// "1 layer" / "9 layers"; dates as "12/11 15:02" instead of ISO.
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
function when(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso || "";
  const p2 = (x) => String(x).padStart(2, "0");
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
function fileUrl(rel, bust) { return `/jobs/${encodeURIComponent(job.id)}/${rel}${bust ? "?v=" + bust : ""}`; }

function route() {
  const m = location.hash.match(/^#\/job\/([^/]+)(?:\/(\w+))?/);
  return m ? { id: decodeURIComponent(m[1]), stage: m[2] || null } : { id: null, stage: null };
}
function go(id, stage) { location.hash = id ? `#/job/${encodeURIComponent(id)}${stage ? "/" + stage : ""}` : "#/"; }

// Everything typed or picked but not sent yet, for the job on screen only.
let draftJob = null;
function resetDraft() {
  for (const k of Object.keys(draft)) delete draft[k];
  Object.assign(draft, { master: null, sizes: null, roles: {}, params: {}, decision: {}, ack: false, filterLow: false,
    from: {}, shut: {}, rows: {}, notes: {}, roleFilter: null });
}
window.addEventListener("hashchange", () => { jobSig = ""; tick(true); });
$("#home").onclick = () => go(null);

async function tick(force) {
  clearTimeout(pollT);
  const r = route();
  try {
    if (!r.id) { job = null; await renderHome(); renderChrome(); return; }
    const j = await api("GET", "/api/jobs/" + encodeURIComponent(r.id));
    // Another job opened in this tab: drop the draft of the one before, or its
    // sizes, roles and task folder would be sent into this job (review X-01).
    if (draftJob !== j.id) { resetDraft(); draftJob = j.id; }
    const sig = JSON.stringify(j);
    const busyChanged = !job || !!job.busy !== !!j.busy || (job && job.id !== j.id);
    job = j;
    renderChrome();
    const typing = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && $("#view").contains(document.activeElement);
    if (force || busyChanged || (sig !== jobSig && !typing)) { jobSig = sig; render(); }
    pollT = setTimeout(tick, j.busy ? 1000 : 4000);
  } catch (e) { showErr(e); pollT = setTimeout(tick, 5000); }
}

function viewStage() {
  const r = route();
  const cur = job.stage === "done" ? "render" : job.stage;
  if (r.stage && ORDER[r.stage] <= ORDER[cur]) return r.stage;
  return cur;
}

function renderChrome() {
  const st = $("#steps");
  if (!job) { st.innerHTML = ""; $("#jobname").textContent = ""; $("#busy").classList.add("hidden"); return; }
  const v = viewStage(), reached = ORDER[job.stage];
  st.innerHTML = STAGES.map(([k, t]) => {
    const cls = k === v ? "on" : (ORDER[k] <= reached ? "done" : "off");
    return `<a class="${cls}" data-s="${k}">${t}</a>`;
  }).join("");
  st.querySelectorAll("a.done").forEach((a) => a.onclick = () => go(job.id, a.dataset.s));
  $("#jobname").textContent = job.name + " · " + job.id;
  const b = $("#busy");
  if (job.busy) {
    b.classList.remove("hidden");
    $("#busymsg").textContent = job.busy.msg || "Working…";
    // Older server without "started": count from when this page first saw the step.
    busyStarted = job.busy.started || busyStarted || Date.now() / 1000;
    showBusyTime();
    // AE cannot stop a script half-way: Cancel takes effect after the current AE step.
    const c = $("#cancel"), asked = cancelAsked === job.id;
    // Steps that cannot be stopped (copying deliverables, switching a version…)
    // take seconds: no Cancel that would only say "Cancelling…" until the end.
    c.classList.toggle("hidden", job.busy.cancellable === false);
    c.disabled = asked;
    c.textContent = asked ? "Cancelling… (after the current AE step)" : "Cancel";
    c.onclick = async () => {
      cancelAsked = job.id; c.disabled = true; c.textContent = "Cancelling… (after the current AE step)";
      try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/cancel`); } catch (e) { showErr(e); }
    };
    // Only steps that know how far they are (build N sizes, render) show the bar;
    // an empty bar during AI suggest read as "stuck". Spinner + timer cover the rest.
    const known = job.busy.progress != null;
    $("#busybar").parentElement.classList.toggle("hidden", !known);
    $("#busybar").style.width = known ? Math.round(job.busy.progress * 100) + "%" : "0";
  } else { b.classList.add("hidden"); busyStarted = null; if (cancelAsked === job.id) cancelAsked = null; }
  showErr(job.error ? new Error(job.error) : null);
}

// Elapsed time of the running step, ticking every second between polls.
let busyStarted = null;
function showBusyTime() {
  const el = $("#busytime");
  if (!el) return;
  if (!busyStarted || !job || !job.busy) { el.textContent = ""; return; }
  const s = Math.max(0, Math.floor(Date.now() / 1000 - busyStarted));
  el.innerHTML = `${ic("timer")} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
setInterval(showBusyTime, 1000);

let cancelAsked = null; // job id whose Cancel was pressed, until its step ends

function render() {
  const v = viewStage();
  if (v === "intake") renderIntake();
  else if (v === "roles") renderRoles();
  else if (v === "review") renderReview();
  else renderRender();
  autoNote(v);
}

// Banner for an Auto run: where it is, or why it stopped and what to do.
function autoNote(v) {
  const a = job.auto;
  if (!a || v === "intake") return;
  const running = a.status === "running" && job.busy;
  const cls = running ? "WARN" : a.status === "done" ? "PASS" : "FAIL";
  const msg = running ? "Auto is running steps 2–4. It stops if something needs you."
    : a.status === "running" ? "Auto stopped on an error (see above)." : a.msg;
  const rep = a.report ? ` <a href="${fileUrl(a.report, Date.now())}" target="_blank">Open report</a>` : "";
  $("#view").insertAdjacentHTML("afterbegin", `<div class="card"><span class="st ${cls}">AUTO ${running ? "running" : a.status === "running" ? "stopped" : esc(a.status)}</span> <span>${esc(msg)}</span>${rep}</div>`);
}

// ------------------------------------------------------------ home
async function renderHome() {
  const d = await api("GET", "/api/jobs");
  presets = d.presets;
  $("#view").innerHTML = `
  <h1>New job</h1>
  <div class="card">
    ${d.ae_running ? "" : `<div class="lv-FAIL">After Effects is not running. Open it, then click Read file.</div>`}
    <div class="row"><input type="text" class="grow" id="aep" placeholder="/path/to/project.aep">
      <button id="read">Read file</button></div>
    <div class="mut small" style="margin-top:6px">The tool works on a copy. The original is never written.</div>
    <div id="blocked"></div>
  </div>
  <h2>Recent jobs</h2>
  <div class="card jobs"><div class="wrap">${d.jobs.length ? `<table class="tbl"><tr><th>Job</th><th>Created</th><th>Master · sizes</th><th>Step</th><th></th></tr>` +
    d.jobs.map((j) => `<tr><td><a href="#/job/${encodeURIComponent(j.id)}">${esc(j.name)}</a></td><td class="nowrap">${esc(when(j.created))}</td>
      <td>${esc(j.master || "—")}<div class="mut small">${esc(j.sizes.join(", ") || "no size yet")}</div></td><td class="nowrap">${jobStep(j)}</td>
      <td><button class="ghost del" data-id="${esc(j.id)}" title="Move to jobs/_trash (can be restored)." aria-label="Delete job">${ic("trash")}</button></td></tr>`).join("") + `</table>`
    : `<span class="mut">No jobs yet.</span>`}</div></div>`;
  $("#view").querySelectorAll("button.del").forEach((b) => b.onclick = async () => {
    if (!confirm(`Delete job ${b.dataset.id}?\n\nIt moves to jobs/_trash (can be restored). The original .aep is not touched.`)) return;
    try { await api("POST", `/api/jobs/${encodeURIComponent(b.dataset.id)}/delete`); renderHome(); } catch (e) { showErr(e); }
  });
  const start = async (force) => {
    showErr(null);
    try {
      const r = await api("POST", "/api/jobs", { aep: $("#aep").value, force_close: force });
      if (r.blocked) {
        // Same rule as every other step: never close a project that may be
        // someone's unsaved work (review HOME-01).
        $("#blocked").innerHTML = `<div class="card lv-WARN">After Effects has a project with unsaved changes open: <b>${esc(r.file || "(Untitled)")}</b>.
          Save or close it in AE, then click Read file again.</div>`;
        return;
      }
      resetDraft();
      go(r.id);
    } catch (e) { showErr(e); }
  };
  $("#read").onclick = () => start(false);
  $("#aep").onkeydown = (e) => { if (e.key === "Enter") start(false); };
}

// Step column of Recent jobs, in the words of the step bar.
function jobStep(j) {
  if (j.busy) return `<span class="mut">running…</span>`;
  if (j.delivered) return `<span class="st PASS">Delivered</span>`;
  if (j.stage === "done") return `<span class="st PASS">Rendered</span> <span class="mut small">${plural(j.rendered, "MP4")}</span>`;
  const s = STAGES.find(([k]) => k === j.stage);
  return s ? esc(s[1]) : esc(j.stage);
}

// ------------------------------------------------------------ 1 intake
// Same idea as comp_rank() on the server: guides, safe zones, logos and tiny
// comps are rarely the comp to resize.
const isHelper = (c) => /safe ?zone|guide|logo|slate|placeholder|colou?r[- ]?bar/i.test(c.name) || c.layers < 3;

function ratio(w, h) {
  const known = [[16, 9], [9, 16], [1, 1], [4, 5], [5, 4], [4, 3], [3, 4], [21, 9], [2, 3], [3, 2]];
  const r = w / h;
  for (const [a, b] of known) if (Math.abs(r - a / b) < 0.01) return `${a}:${b}`;
  return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(h / w).toFixed(2)}`;
}

function renderIntake() {
  const I = job.intake;
  if (!I) { $("#view").innerHTML = `<div class="card mut">Reading the project…</div>`; return; }
  presets = job.presets || presets;
  if (draft.master == null) draft.master = job.master_id != null ? String(job.master_id) : ((I.comps.find((c) => c.name === job.master) || {}).id || "") + "";
  if (draft.sizes == null) draft.sizes = (job.sizes || []).map((s) => ({ w: s.w, h: s.h, label: s.label }));
  const subs = I.fonts.filter((f) => f.substitute === true);
  const fontLine = subs.length
    ? `<span class="lv-FAIL">${ic("xCircle")}</span><span class="k">Fonts</span><div>Missing: <b>${subs.map((f) => esc(f.font)).join(", ")}</b> — AE will substitute another font, so text will be wrong.
       <label class="small"><input type="checkbox" id="ack" ${draft.ack ? "checked" : ""}> I know, continue anyway</label></div>`
    : `<span class="lv-PASS">${ic("checkCircle")}</span><span class="k">Fonts</span><div>${I.fonts.map((f) => esc(f.font)).join(", ") || "No text layers"} — installed</div>`;
  const fm = I.footageMissing;
  const footLine = fm.length
    ? `<span class="lv-WARN">${ic("alert")}</span><span class="k">Footage</span><div>${plural(fm.length, "file")} missing, usually on disabled layers. Step 2 flags any that are visible.
       <details><summary>Show list</summary>${fm.map((f) => esc(f.name)).join("<br>")}</details></div>`
    : `<span class="lv-PASS">${ic("checkCircle")}</span><span class="k">Footage</span><div>All found</div>`;
  const comps = I.comps;
  $("#view").innerHTML = `
  <h1>1 · Intake</h1>
  <div class="card"><div class="mut small">${esc(job.src_aep)}</div>
    <h2 style="margin-top:10px">Preflight</h2>
    <div class="pf">${fontLine}${footLine}
      <span class="mut">·</span><span class="k">Plugins</span><div class="mut">Not checked (they do not stop a render).</div>
      <span class="mut">·</span><span class="k">Project</span><div class="mut">${I.bpc} bpc · ${plural(comps.length, "comp")}</div></div>
  </div>
  <div class="card"><h2>Master comp</h2>
    <div class="mut small" style="margin-bottom:8px">Pick the comp to resize. Likely masters are listed first.</div>
    <div class="row" style="margin-bottom:8px"><input type="text" id="cq" placeholder="Filter by name…" class="grow"></div>
    <div class="comps" id="comps">${comps.map((c, i) => `
      <label data-n="${esc(c.name.toLowerCase())}" class="${isHelper(c) ? "helper" : ""}"><input type="radio" name="m" value="${c.id}" data-name="${esc(c.name)}" ${String(c.id) === draft.master ? "checked" : ""}>
        <span><b>${esc(c.name)}</b>${i === 0 && !isHelper(c) ? ` <span class="tag">suggested</span>` : ""}${isHelper(c) ? ` <span class="tag mut">guide/logo?</span>` : ""}<div class="f">${esc(c.folder)}</div></span>
        <span class="dims"><span class="size">${c.w}x${c.h}</span><span class="mut small">${ratio(c.w, c.h)} · ${c.workDur.toFixed(2)}s · ${plural(c.layers, "layer")}</span></span></label>`).join("")}</div>
  </div>
  <div class="card" id="mastercard"></div>
  <div class="card"><h2>Sizes</h2>
    <div class="chips" id="presets">${presets.map((p) => `<span class="chip preset" data-w="${p.w}" data-h="${p.h}" data-l="${p.label}">${p.label} · ${p.w}x${p.h}</span>`).join("")}</div>
    <div class="row" style="margin-top:10px">Custom: <input type="number" id="cw" min="4" max="30000" placeholder="W"> x
      <input type="number" id="ch" min="4" max="30000" placeholder="H"> <button class="ghost" id="add">+ Add</button></div>
    <div style="margin-top:10px">Selected: <span class="chips" id="chosen" style="display:inline-flex"></span></div>
  </div>
  <label class="autobox ${draft.auto ? "on" : ""}" id="autobox"><input type="checkbox" id="auto" ${draft.auto ? "checked" : ""}>
    <span><b>Auto: run steps 2 → 4 in one go</b>
    <span class="mut small">Guessed roles, every size without a FAIL rendered, report built. Stops on missing footage or a FAIL.</span></span></label>
  <div class="actions"><button id="next">${draft.auto ? "Run all " + ic("arrowRight") + " MP4" : "Next: Layer roles " + ic("arrowRight")}</button></div>`;
  $("#cq").oninput = (e) => { const q = e.target.value.toLowerCase(); $("#comps").querySelectorAll("label").forEach((l) => l.classList.toggle("hidden", !l.dataset.n.includes(q))); };
  const paintMaster = () => {
    const c = comps.find((x) => String(x.id) === draft.master);
    $("#mastercard").innerHTML = c
      ? `<div class="row"><span>Selected master:</span> <b>${esc(c.name)}</b> <span class="size">${c.w}x${c.h}</span>
         <span class="mut">${ratio(c.w, c.h)} · ${c.workDur.toFixed(2)}s · ${c.fps.toFixed(3)} fps · ${plural(c.layers, "layer")}</span></div>
         <div class="mut small" style="margin-top:4px">The sizes below are built from this comp. No need to add its own size (${c.w}x${c.h}).</div>`
      : `<span class="mut">No master comp selected.</span>`;
  };
  paintMaster();
  $("#comps").onchange = (e) => { draft.master = e.target.value; paintMaster(); refreshNext(); };
  if ($("#ack")) $("#ack").onchange = (e) => { draft.ack = e.target.checked; refreshNext(); };
  $("#auto").onchange = (e) => { draft.auto = e.target.checked; $("#autobox").classList.toggle("on", draft.auto); $("#next").innerHTML = draft.auto ? "Run all " + ic("arrowRight") + " MP4" : "Next: Layer roles " + ic("arrowRight"); };
  const has = (w, h) => draft.sizes.some((s) => s.w === w && s.h === h);
  const paintChosen = () => {
    $("#chosen").innerHTML = draft.sizes.map((s, i) => `<span class="chip sel">${s.w}x${s.h}${s.label ? " · " + esc(s.label) : ""}<button data-i="${i}" aria-label="Remove">${ic("x")}</button></span>`).join("") || `<span class="mut">none</span>`;
    $("#chosen").querySelectorAll("button").forEach((b) => b.onclick = () => { draft.sizes.splice(+b.dataset.i, 1); paintChosen(); });
    $("#presets").querySelectorAll(".chip").forEach((c) => c.classList.toggle("sel", has(+c.dataset.w, +c.dataset.h)));
    refreshNext();
  };
  $("#presets").querySelectorAll(".chip").forEach((c) => c.onclick = () => {
    const w = +c.dataset.w, h = +c.dataset.h;
    if (has(w, h)) draft.sizes = draft.sizes.filter((s) => !(s.w === w && s.h === h)); else draft.sizes.push({ w, h, label: c.dataset.l });
    paintChosen();
  });
  $("#add").onclick = () => {
    const w = parseInt($("#cw").value, 10), h = parseInt($("#ch").value, 10);
    if (!(w >= 4 && h >= 4 && w <= 30000 && h <= 30000)) return showErr(new Error("Size must be between 4 and 30000 px."));
    if (w % 2 || h % 2) return showErr(new Error(`Use even numbers (H.264), e.g. ${w - w % 2}x${h - h % 2}.`));
    if (!has(w, h)) draft.sizes.push({ w, h, label: "" });
    $("#cw").value = $("#ch").value = ""; showErr(null); paintChosen();
  };
  function refreshNext() {
    const fontOk = !subs.length || draft.ack;
    $("#next").disabled = !!job.busy || !draft.master || !draft.sizes.length || !fontOk;
  }
  paintChosen();
  $("#next").onclick = async () => {
    // Sizes kept with the same master keep their versions, approval and MP4;
    // a new master, or sizes taken out, lose them: say so first (review INT-01).
    const newMaster = (comps.find((x) => String(x.id) === draft.master) || {}).name;
    const keep = new Set(draft.sizes.map((s) => s.w + "x" + s.h));
    const worked = (s) => (s.versions || []).length > 1 || s.render || s.decision;
    const lost = (job.sizes || []).filter((s) => worked(s) && (newMaster !== job.master || !keep.has(s.key)));
    if (lost.length && !confirm(`${newMaster !== job.master ? "The master comp changed: every" : "These"} size start again: ${lost.map((s) => s.key).join(", ")}.\n\nTheir versions, approvals and MP4s are lost. Continue?`)) return;
    try {
      await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/master`, { master: (comps.find((x) => String(x.id) === draft.master) || {}).name, master_id: +draft.master, sizes: draft.sizes, auto: !!draft.auto });
      draft.roles = {}; draft.params = {}; draft.decision = {};
      go(job.id, draft.auto ? null : "roles");  // auto: follow job.stage as it advances
    } catch (e) { showErr(e); }
  };
}

// ------------------------------------------------------------ 2 roles
const ROLE_LABEL = { BG: "BACKGROUND", SUBJECT: "SUBJECT", CONTENT: "CONTENT", FOLLOW: "FOLLOWS PARENT", IGNORE: "IGNORE" };
// Layer kinds as SVG icons (step 2).
const KIND_IC = { text: "type", comp: "layers", solid: "solid", still: "image", footage: "film", null: "nullObj", shape: "shape", adjustment: "contrast", audio: "music", camera: "video", light: "sun", other: "help" };
const KIND_ICON = new Proxy({}, { get: (_, k) => ic(KIND_IC[k] || "help") });

function renderRoles() {
  const A = job.analysis;
  if (!A || job.stage === "intake") { $("#view").innerHTML = `<div class="card mut">Analysing layer roles…</div>`; return; }
  const M = A.master;
  const roleOf = (L) => draft.roles[L.index] || job.roles[String(L.index)] || L.role;
  const subs = A.fonts.filter((f) => f.substitute === true);
  const low = A.layers.filter((L) => L.conf === "low" && L.role !== "FOLLOW");
  // Role filter: one role at a time (by the current role, edits included), on top of "⚠ only".
  const count = {};
  A.layers.forEach((L) => { const r = roleOf(L); count[r] = (count[r] || 0) + 1; });
  if (draft.roleFilter && !count[draft.roleFilter]) draft.roleFilter = null;
  const rows = A.layers.filter((L) => (!draft.filterLow || (L.conf === "low" && L.role !== "FOLLOW"))
    && (!draft.roleFilter || roleOf(L) === draft.roleFilter));
  const chips = [["", "All", A.layers.length]].concat(["BG", "CONTENT", "SUBJECT", "FOLLOW", "IGNORE"]
    .filter((k) => count[k]).map((k) => [k, ROLE_LABEL[k], count[k]]))
    .map(([k, label, n]) => `<span class="chip preset ${(draft.roleFilter || "") === k ? "sel" : ""}" data-rf="${k}">${label} · ${n}</span>`).join("");
  const vis = A.footageMissingVisible || [];
  // Built before: confirming again rebuilds every size from the master.
  const rebuilding = job.sizes.some((s) => s.build);
  $("#view").innerHTML = `
  <h1>2 · Layer roles <span class="you">${ic("user")} You check</span></h1>
  <div class="card"><b>${esc(M.name)}</b> · ${M.w}x${M.h} · ${M.workDur.toFixed(2)}s · ${plural(A.layers.length, "layer")}
    <div class="small" style="margin-top:6px">
      <b>BACKGROUND</b> fills the frame · <b>CONTENT</b> (text, logo) fits inside · <b>SUBJECT</b> in between, keeps its edge ·
      <b>FOLLOWS PARENT</b> / <b>IGNORE</b> untouched.</div>
    ${subs.length ? `<div class="lv-FAIL small">${ic("xCircle")} The master uses fonts that are not installed: ${subs.map((f) => esc(f.font)).join(", ")}</div>` : ""}
    ${vis.length ? `<div class="lv-FAIL small" style="margin-top:6px">${ic("xCircle")} ${plural(vis.length, "missing footage file")} ${vis.length === 1 ? "is" : "are"} <b>visible</b> in the master: they will render as colour bars.
        <details><summary>Show where</summary>${vis.map((f) => `${esc(f.name)} <span class="mut">— ${esc(f.where)}</span>`).join("<br>")}</details>
        Relink them in AE (the job's copy is open there), then <button class="ghost small" id="recheck">${ic("refresh")} Check again</button>. Or
        <label><input type="checkbox" id="ackm" ${draft.ackMissing ? "checked" : ""}> continue anyway</label></div>`
      : A.footageMissing.length ? `<div class="mut small">Missing footage only on disabled/guide layers (does not show): ${A.footageMissing.map((f) => esc(f.name)).join(", ")}</div>` : ""}
  </div>
  <div class="card">
    <div class="row" style="justify-content:space-between">
      <span>${low.length ? `<span class="lv-WARN">${ic("alert")} ${plural(low.length, "uncertain row")}</span> — check the highlighted rows.` : `<span class="lv-PASS">The tool is confident on every row.</span>`}</span>
      <label class="small"><input type="checkbox" id="fl" ${draft.filterLow ? "checked" : ""}> Show ${ic("alert")} rows only</label>
    </div>
    <div class="chips" style="margin:8px 0">${chips}</div>
    <div class="wrap"><table class="tbl"><tr><th>#</th><th>Preview</th><th>Layer</th><th>Role</th><th>Why the tool chose it</th></tr>
    ${rows.map((L) => {
      const r = roleOf(L), edited = r !== L.role;
      const sel = L.role === "FOLLOW" ? `<span class="mut">FOLLOWS PARENT</span>` :
        `<select data-i="${L.index}">${["BG", "SUBJECT", "CONTENT", "IGNORE"].map((k) => `<option value="${k}" ${k === r ? "selected" : ""}>${ROLE_LABEL[k]}</option>`).join("")}</select>`;
      return `<tr class="${L.conf === "low" && L.role !== "FOLLOW" ? "low" : ""} ${edited ? "edited" : ""}">
        <td>L${L.index}</td>
        <td><div class="thumbs">${L.thumb ? `<img src="${fileUrl(L.thumb)}" loading="lazy" title="Master at ${L.sampleTime.toFixed(2)}s, red box = this layer">` : `<span class="mut" style="font-size:20px">${KIND_ICON[L.kind] || "?"}</span>`}
          ${L.thumb_src ? `<img src="${fileUrl(L.thumb_src)}" loading="lazy" title="${esc(L.thumb_src_title || "This layer on its own")}">` : ""}</div></td>
        <td><b>${esc(L.name)}</b>${L.enabled ? "" : ` <span class="mut small">[off]</span>`}<div class="mut small">${KIND_ICON[L.kind] || ""} ${esc(L.kind)}${L.source && L.source !== L.name ? " · " + esc(L.source) : ""} · ${L.inPoint.toFixed(2)}–${L.outPoint.toFixed(2)}s</div></td>
        <td>${sel}${edited ? `<div class="small mut">tool chose: ${ROLE_LABEL[L.role]}</div>` : ""}</td>
        <td class="small">${L.conf === "low" ? ic("alert", "lv-WARN") + " " : ""}${esc(L.why)}</td></tr>`;
    }).join("")}</table>${rows.length ? "" : `<div class="mut small" style="padding:10px">No layer matches this filter.</div>`}</div>
  </div>
  <div class="actions"><button class="ghost" id="back">${ic("arrowLeft")} Change master / sizes</button><button id="go" ${job.busy || (vis.length && !draft.ackMissing) ? "disabled" : ""}>${rebuilding ? "Rebuild all sizes" : "Confirm roles: build " + plural(job.sizes.length, "size")} ${ic("arrowRight")}</button></div>`;
  $("#fl").onchange = (e) => { draft.filterLow = e.target.checked; renderRoles(); };
  $("#view").querySelectorAll("[data-rf]").forEach((c) => c.onclick = () => { draft.roleFilter = c.dataset.rf || null; renderRoles(); });
  if ($("#ackm")) $("#ackm").onchange = (e) => { draft.ackMissing = e.target.checked; renderRoles(); };
  if ($("#recheck")) $("#recheck").onclick = async () => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/recheck_footage`); tick(true); } catch (e) { showErr(e); }
  };
  $("#view").querySelectorAll("select[data-i]").forEach((s) => s.onchange = () => { draft.roles[s.dataset.i] = s.value; renderRoles(); });
  $("#back").onclick = () => go(job.id, "intake");
  $("#go").onclick = async () => {
    if (rebuilding) {
      const nv = job.sizes.reduce((n, s) => n + (s.versions || []).length, 0);
      const na = job.sizes.filter((s) => s.decision).length, nm = job.sizes.filter((s) => s.render).length;
      const parts = [nv && plural(nv, "version comp") + " deleted", job.sizes.some((s) => s.edited) && "edits made in AE lost",
        na && plural(na, "approval") + " cleared", nm && plural(nm, "MP4") + " to render again"].filter(Boolean);
      if (!confirm(`Rebuild every size from the master?\n\n${parts.join("\n") || "Each size comp is built again."}`)) return;
    }
    const roles = {};
    A.layers.forEach((L) => { roles[L.index] = roleOf(L); });
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/roles`, { roles, ack_missing: !!draft.ackMissing }); go(job.id, "review"); }
    catch (e) { showErr(e); }
  };
}

// ------------------------------------------------------------ 3 review
// Storyboard: only the key frames (each state complete, no half-faded text),
// plus any frame a check flagged. "All frames" shows every sample time.
let allFrames = false;
try { allFrames = localStorage.getItem("vr.allFrames") === "1"; } catch (e) { /* storage blocked */ }
function stripHtml(list, size, items, stamp, src) {
  const bad = {}, warn = {};
  (items || []).forEach((i) => { if (i.t != null) (i.level === "FAIL" ? bad : warn)[i.t] = 1; });
  const keys = job.key_beats && job.key_beats.length ? new Set(job.key_beats) : null;
  const shown = list.map((p, i) => [p, i]).filter(([p]) => allFrames || !keys || keys.has(p.t) || bad[p.t] || warn[p.t]);
  const bust = stamp != null ? stamp : size ? (job.sizes.find((s) => s.key === size) || {}).preview_stamp : "";
  return `<div class="strip">${shown.map(([p, i]) => `<figure class="${bad[p.t] ? "bad" : warn[p.t] ? "warn" : ""}" data-size="${size || ""}" data-i="${i}" data-src="${src || ""}">
    ${p.thumb ? `<img src="${fileUrl(p.thumb, bust)}">` : `<div class="mut">no image</div>`}
    <figcaption>${p.t.toFixed(2)}s</figcaption></figure>`).join("")}</div>`;
}

function renderReview() {
  if (!job.master_previews) { $("#view").innerHTML = `<div class="card mut">Building…</div>`; return; }
  const sizes = job.sizes;
  const nOk = sizes.filter((s) => s.decision === "ok" || s.decision === "manual").length;
  const rp = job.render_plan || { todo: [], fresh: [] };
  $("#view").innerHTML = `
  <h1>3 · Review sizes <span class="you">${ic("user")} You check</span></h1>
  <div class="card" id="mastercard"><div class="sizehead"><h2>Master · ${job.master_info.w}x${job.master_info.h}</h2><span class="mut small">${esc(job.master)}</span>
    <label class="small mut" style="margin-left:auto" title="Also show the in-between frames the checks use"><input type="checkbox" id="allframes" ${allFrames ? "checked" : ""}> All frames</label>
    <button class="ghost small" id="beats" title="Pick new sample times, check all sizes again." ${job.busy ? "disabled" : ""}>${ic("refresh")} Re-pick sample times</button></div>
    ${stripHtml(job.master_previews, "", [])}</div>
  ${sizes.map((s) => sizeCard(s)).join("")}
  <div class="actions"><span class="mut" style="align-self:center">${nOk}/${plural(sizes.length, "size")} approved</span>
    <button class="ghost" id="back">${ic("arrowLeft")} Layer roles</button>
    ${(rp.fresh.length && rp.todo.length) ? `<a href="#" id="renderall" class="small">Render all ${nOk} again</a>` : ""}
    <button id="render" ${!rp.todo.length || job.busy ? "disabled" : ""}>${rp.todo.length ? `Render ${plural(rp.todo.length, "size")}${rp.fresh.length ? ` (${rp.fresh.length} up to date)` : ""}`
      : rp.fresh.length ? "All approved sizes are rendered" : "Render approved sizes"} ${ic("arrowRight")}</button>
    ${(!rp.todo.length && rp.fresh.length) ? `<button class="ghost" id="renderagain">Render all again</button><button class="ghost" id="tostep4">Go to step 4 ${ic("arrowRight")}</button>` : ""}</div>`;
  $("#back").onclick = () => go(job.id, "roles");
  $("#allframes").onchange = (e) => {
    allFrames = e.target.checked;
    try { localStorage.setItem("vr.allFrames", allFrames ? "1" : "0"); } catch (x) { /* storage blocked */ }
    renderReview();
  };
  $("#beats").onclick = async () => { try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/beats`); tick(true); } catch (e) { showErr(e); } };
  const doRender = async (all) => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/render`, { all }); go(job.id, "render"); } catch (e) { showErr(e); }
  };
  $("#render").onclick = () => doRender(false);
  if ($("#renderall")) $("#renderall").onclick = (e) => { e.preventDefault(); doRender(true); };
  if ($("#renderagain")) $("#renderagain").onclick = () => doRender(true);
  if ($("#tostep4")) $("#tostep4").onclick = () => go(job.id, "render");
  $("#view").querySelectorAll("#mastercard .strip figure").forEach((f) => f.onclick = () => openLb("", +f.dataset.i));
  sizes.forEach((s) => wireSize(s));
}

// Hover help (kept short: people read tooltips, not paragraphs).
const HELP = {
  ok: "Only approved sizes render.",
  open: "Open this comp in After Effects.",
  reload: "After editing in AE: grab frames, check again.",
  suggest: "New AI version from 'from'. Nothing changes until Use.",
  use: "Make this the version that renders. Clears Approve.",
  reference: "The designer's comp at this size.",
};
const tip = (k) => ` title="${esc(HELP[k] || "")}"`;
const MOD = navigator.platform.includes("Mac") ? "⌘" : "Ctrl";

function pc(k) { return k ? Math.round(k * 100) + "%" : "—"; }

// One line for the AI's reason; older versions wrote a paragraph (full text on hover).
function shortWhy(w) {
  const first = String(w || "").split(/(?<=[.!?])\s/)[0];
  return first.length > 140 ? first.slice(0, 137) + "…" : first;
}

// UI state per size: AI request text, which version the AI starts from, expanded.
Object.assign(draft, { from: {}, shut: {}, rows: {}, notes: draft.notes || {} });
// Rows folded by the user, per size and row id ("ref" = designer row).
const rowShut = (key, id) => !!(draft.rows[key] && draft.rows[key][id]);
const caret = (key, id) => `<span class="caret" data-row="${id}" title="Show / hide this row">${ic(rowShut(key, id) ? "chevronRight" : "chevronDown")}</span>`;

// Every version of a size as the UI shows it. The one the size comp came from
// is marked inUse; when the comp was edited in AE since, the comp itself is
// its own entry ("… + AE edits").
function sizeVersions(s) {
  let vs = (s.versions || []).slice();
  if (!s.versions) (s.ais || (s.ai ? [Object.assign({ n: 1 }, s.ai)] : []))
    .forEach((a) => vs.push(Object.assign({}, a, { id: "ai" + a.n, kind: "ai", label: "AI " + a.n })));
  const inUse = s.in_use || (s.from_ai ? "ai" + s.from_ai.n : null);
  const match = vs.find((v) => v.id === inUse);
  const live = { comp: s.comp, previews: s.previews, preview_stamp: s.preview_stamp, checks: s.checks, compare: s.compare, build: s.build };
  if (s.from_ai) Object.assign(live, { note: s.from_ai.note, why: s.from_ai.why });  // older jobs: the used AI version left the list
  if (match && !s.edited) {
    vs = vs.map((v) => v.id === inUse ? Object.assign({}, v, live, { inUse: true }) : v);
  } else {
    const label = s.edited ? (match ? match.label + " + AE edits" : "AE edits")
      : inUse && inUse.startsWith("ai") ? "AI " + inUse.slice(2) : "Current";  // older job: unknown origin
    vs.push(Object.assign({ id: "cur", kind: s.edited ? "ae" : "cur", label, inUse: true }, live));
  }
  if (!vs.some((v) => v.kind === "original")) vs.unshift({ id: "orig?", kind: "missing", label: "Original" });
  // Original, AI 1, AI 2…, AE edit 1…, then the live comp: by number, not by the
  // order they were added in (a re-kept AI 2 used to land after AI 5).
  const rank = (v) => [v.kind === "original" || v.kind === "missing" ? 0 : v.id === "cur" ? 3 : v.kind === "ai" ? 1 : 2,
    parseInt(String(v.id).replace(/\D/g, ""), 10) || 0];
  vs.sort((a, b) => { const x = rank(a), y = rank(b); return x[0] - y[0] || x[1] - y[1]; });
  return vs;
}
const inUseOf = (vs) => vs.find((v) => v.inUse);

// The columns of a size's table: the key frames, plus any time a check flagged
// in one of its versions, so every row lines up under the same times.
function sizeTimes(s, vs) {
  const all = (job.master_previews || []).map((p) => p.t);
  const keys = job.key_beats && job.key_beats.length ? new Set(job.key_beats) : null;
  const flagged = new Set();
  vs.forEach((v) => ((v.checks || {}).items || []).forEach((i) => { if (i.t != null && i.level !== "PASS") flagged.add(i.t); }));
  return all.filter((t) => allFrames || !keys || keys.has(t) || flagged.has(t));
}

// One row of frames at the given times; an empty cell where a version has no frame.
function rowStrip(list, times, items, stamp, src, size) {
  const by = {}; (list || []).forEach((p, i) => { by[p.t] = [p, i]; });
  const bad = {}, warn = {};
  (items || []).forEach((i) => { if (i.t != null) (i.level === "FAIL" ? bad : warn)[i.t] = 1; });
  return `<div class="strip rowstrip">${times.map((t) => {
    const e = by[t];
    if (!e || !e[0].thumb) return `<figure class="empty"><div></div></figure>`;
    return `<figure class="${bad[t] ? "bad" : warn[t] ? "warn" : ""}" data-size="${size}" data-i="${e[1]}" data-src="${src}">
      <img src="${fileUrl(e[0].thumb, stamp)}"></figure>`;
  }).join("")}</div>`;
}

function issuesHtml(v) {
  const bad = ((v.checks || {}).items || []).filter((i) => i.level !== "PASS");
  return bad.length ? `<ul class="items small">${bad.map((i) => `<li class="lv-${i.level}">${esc(i.msg)}</li>`).join("")}</ul>` : "";
}

// MP4 state of a size, on its card in step 3.
function mp4Chip(s) {
  const r = s.render || {};
  if (r.status !== "done") return "";
  return r.stale ? `<span class="st WARN" title="Changed since it was rendered">MP4 outdated</span>`
    : `<span class="st PASS" title="Rendered with the version in use">MP4 ${ic("check")}</span>`;
}

function sizeCard(s) {
  const vs = sizeVersions(s), use = inUseOf(vs);
  const ok = s.decision === "ok" || s.decision === "manual";
  const st = (use.checks || {}).status || "—";
  const open = !draft.shut[s.key];  // folded only when the user hides it (not on Approve)
  // Not approved: plain outline. Approved: filled green, like PASS (a filled blue
  // "Approve" read as already approved).
  const approve = ok
    ? `<button class="approved" data-act="unok" title="This size renders. Click to undo.">${ic("check")} Approved</button>`
    : `<button class="ghost" data-act="ok"${tip("ok")}>${ic("square")} Approve</button>`;
  const head = `<div class="sizehead" data-toggle="1"><h2>${s.key}${s.label ? " · " + esc(s.label) : ""}</h2>
      <span class="st ${st}">${st}</span><span class="small mut">in use: <b class="ink">${esc(use.label)}</b></span>${mp4Chip(s)}
      <span class="grow"></span><span class="small mut toggle">${open ? ic("chevronDown") + " hide" : ic("chevronRight") + " show"}</span>${approve}</div>`;
  if (!open) return `<div class="card sizecard folded" id="sz-${s.key}">${head}</div>`;

  const times = sizeTimes(s, vs);
  const tcells = `<div class="strip rowstrip times">${times.map((t) => `<figure><figcaption>${t.toFixed(2)}s</figcaption></figure>`).join("")}</div>`;
  const opts = s.reference_options || [];
  const ref = s.ref_previews && s.ref_previews.length;
  const refRow = opts.length || ref ? `<div class="vrow refrow ${rowShut(s.key, "ref") ? "shut" : ""}"><div class="vlab"><b>${caret(s.key, "ref")} Designer</b>
        ${opts.length ? `<select data-ref="1" title="${esc(HELP.reference)}"><option value="">— none —</option>${opts.map((o) => `<option ${o === s.reference ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>` : ""}</div>
      ${rowShut(s.key, "ref") ? `<div></div>` : ref ? rowStrip(s.ref_previews, times, [], "", "ref", s.key) : `<div class="small mut">No designer comp picked.</div>`}<div></div></div>` : "";
  // Original first, then the versions in the order they were made.
  const rows = vs.map((v) => {
    if (v.kind === "missing") return `<div class="vrow"><div class="vlab"><b>Original</b><div class="small mut">first build, no AI · not kept (older job)</div></div>
        <div class="small mut">Build it again to look at it (about 10 s).</div>
        <div class="vact"><button class="ghost" data-act="make_original">Build Original</button></div></div>`;
    const ch = v.checks || {};
    const pct = v.compare && v.compare.median_pct != null ? `<div class="small mut" title="Distance to the designer's layout">${v.compare.median_pct}% from designer</div>` : "";
    const from = v.base ? (vs.find((x) => x.id === v.base) || {}).label : null;
    const info = [v.kind === "ai" && from ? `from ${esc(from)}` : "", v.note ? `asked: “${esc(v.note)}”` : "", v.why ? esc(shortWhy(v.why)) : ""].filter(Boolean).join(" · ");
    const del = (v.kind === "ai" || v.kind === "ae") && !v.inUse ? `<button class="ghost" data-del="${v.id}" title="Delete ${esc(v.label)} and its comp" aria-label="Delete">${ic("trash")}</button>` : "";
    const shut = rowShut(s.key, v.id);
    return `<div class="vrow ${v.inUse ? "inuse" : ""} ${shut ? "shut" : ""}">
        <div class="vlab"><b>${caret(s.key, v.id)} ${esc(v.label)}</b>${v.kind === "original" ? `<div class="small mut">first build, no AI</div>` : ""}
          <div>${ch.status ? `<span class="st ${ch.status}">${ch.status}</span>` : `<span class="st WARN">not checked</span>`}${v.inUse ? ` <span class="st AI">IN USE</span>` : ""}</div>${pct}</div>
        ${shut ? `<div class="small mut">${info ? info : ""}</div>` : rowStrip(v.previews, times, ch.items, v.preview_stamp, "v:" + v.id, s.key)}
        <div class="vact">${v.inUse
          ? `<button class="ghost" data-open="${v.id}"${tip("open")}>${ic("external")} Open in AE</button><button class="ghost" data-act="reread"${tip("reload")}>${ic("refresh")} Reload</button>`
          : `<button class="ghost" data-use="${v.id}"${tip("use")}>${ic("swap")} Use</button><button class="ghost" data-open="${v.id}"${tip("open")}>${ic("external")} Open in AE</button>${del}`}</div>
        ${!shut && (info || issuesHtml(v)) ? `<div class="vnote small" title="${esc(v.why || "")}">${info}${issuesHtml(v)}</div>` : ""}
      </div>`;
  }).join("");
  const srcOpts = vs.filter((v) => v.kind !== "missing");
  const fromId = draft.from[s.key] && srcOpts.some((v) => v.id === draft.from[s.key]) ? draft.from[s.key] : use.id;
  // One cell size for every row, from this size's aspect: rows line up even
  // where the master (or the designer) has another shape.
  // Cells keep this size's shape and shrink to fit the card, so the buttons on
  // the right stay in view however many sample times there are (review REV-01).
  const ar = s.w / s.h, ch = ar >= 1 ? Math.round(Math.min(96, 180 / ar)) : 130, cw = Math.round(ch * ar);
  return `<div class="card sizecard" id="sz-${s.key}" style="--cw:${cw}px;--n:${Math.max(1, times.length)};--ar:${ar}">${head}
    <div class="vtable">
      <div class="vrow timerow"><div class="vlab"></div>${tcells}<div></div></div>
      ${refRow}
      ${rows}
    </div>
    ${job.ai_available === false ? `<div class="small mut aioff">${ic("sparkles")} AI suggest is off: Claude Code is not installed on this computer. Everything else works.
      To turn it on, install it from claude.ai/download, sign in once, then reload this page.</div>` : ""}
    <div class="aisug ${job.ai_available === false ? "off" : ""}">
      <textarea class="ask" rows="1" data-note="${esc(s.key)}" ${job.ai_available === false ? "disabled" : ""} placeholder="Optional: what should the AI change? e.g. bigger text, move her right. ${MOD}+Enter to run">${esc(draft.notes[s.key] || "")}</textarea>
      <label class="small mut">from <select data-from="1" ${job.ai_available === false ? "disabled" : ""}>${srcOpts.map((v) => `<option value="${v.id}" ${v.id === fromId ? "selected" : ""}>${esc(v.label)}${v.inUse ? " (in use)" : ""}</option>`).join("")}</select></label>
      <button data-act="suggest"${tip("suggest")}>${ic("sparkles")} AI suggest</button>
      <span class="small mut" title="AI versions kept for this size">${vs.filter((v) => v.kind === "ai").length}/6</span>
    </div>
  </div>`;
}

function wireSize(s) {
  const card = $("#sz-" + CSS.escape(s.key));
  const vs = sizeVersions(s), use = inUseOf(vs);
  const post = async (path, body) => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/${path}`, Object.assign({ key: s.key }, body)); tick(true); }
    catch (e) { showErr(e); }
  };
  // Busy: any step running. AI suggest also needs Claude Code on this computer.
  const busy = (el) => { el.disabled = !!job.busy || (el.dataset.act === "suggest" && job.ai_available === false); };
  const hd = card.querySelector("[data-toggle]");
  if (hd) hd.onclick = (e) => {
    if (e.target.closest("button, select, input")) return;
    draft.shut[s.key] = !draft.shut[s.key]; renderReview();
  };
  card.querySelectorAll("[data-row]").forEach((c) => c.onclick = () => {
    const r = (draft.rows[s.key] = draft.rows[s.key] || {});
    r[c.dataset.row] = !r[c.dataset.row]; renderReview();
  });
  const act = (name, fn) => card.querySelectorAll(`[data-act=${name}]`).forEach((el) => { busy(el); el.onclick = fn; });
  act("ok", () => post("size", { action: "ok" }));
  act("unok", () => post("size", { action: "unok" }));
  act("reread", () => post("size", { action: "reread" }));
  act("make_original", () => post("size", { action: "make_original" }));
  card.querySelectorAll("[data-open]").forEach((el) => { busy(el); el.onclick = () => {
    const v = vs.find((x) => x.id === el.dataset.open);
    post("size", { action: "open_ae", vid: v.inUse ? null : v.id });
  }; });
  card.querySelectorAll("[data-use]").forEach((el) => { busy(el); el.onclick = () => {
    const v = vs.find((x) => x.id === el.dataset.use);
    if (use.kind === "ae" && !confirm(`Use ${v.label}? Your AE edits are kept as a version.`)) return;
    post("size", { action: "use_version", vid: v.id });
  }; });
  card.querySelectorAll("[data-del]").forEach((el) => { busy(el); el.onclick = () => {
    const v = vs.find((x) => x.id === el.dataset.del);
    if (confirm(`Delete ${v.label}? Its comp is removed from the project.`)) post("size", { action: "delete_version", vid: v.id });
  }; });
  const from = card.querySelector("[data-from]");
  if (from) from.onchange = () => { draft.from[s.key] = from.value; };
  act("suggest", async () => {
    // What the box shows is what gets sent; it is cleared only once the AI took
    // it (a failed send used to clear it and the next click sent nothing).
    const box = card.querySelector("[data-note]");
    const note = box ? box.value : draft.notes[s.key] || "";
    const base = from ? from.value : use.id;
    try {
      await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/suggest`, { key: s.key, note, base: base === use.id ? null : base });
      delete draft.notes[s.key]; tick(true);
    } catch (e) { draft.notes[s.key] = note; showErr(e); }
  });
  card.querySelectorAll("[data-note]").forEach((el) => {
    const fit = () => { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; };
    fit();
    el.oninput = () => { draft.notes[el.dataset.note] = el.value; fit(); };
    // Enter = new line; Cmd/Ctrl+Enter = run.
    el.onkeydown = (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !job.busy) { e.preventDefault(); card.querySelector("[data-act=suggest]").click(); }
    };
  });
  const ref = card.querySelector("[data-ref]");
  if (ref) ref.onchange = () => post("reference", { ref: ref.value });
  card.querySelectorAll(".strip figure[data-i]").forEach((f) => f.onclick = () => openLb(s.key, +f.dataset.i, f.dataset.src));
}

// Lightbox: one frame of a version, next to the master and the designer at the same time.
function openLb(size, i, from) {
  const s = size ? job.sizes.find((x) => x.key === size) : null;
  const vs = s ? sizeVersions(s) : [];
  const v = s ? (from && from.startsWith("v:") ? vs.find((x) => x.id === from.slice(2)) : inUseOf(vs)) : null;
  const list = !s ? job.master_previews : from === "ref" ? s.ref_previews : from === "master" ? job.master_previews : (v && v.previews);
  const p = list && list[i];
  if (!p || !p.jpg) return;
  const mine = v && v.previews ? v.previews.find((m) => m.t === p.t) : null;
  const mp = (job.master_previews || []).find((m) => m.t === p.t);
  const rp = s && s.ref_previews ? s.ref_previews.find((m) => m.t === p.t) : null;
  $("#lbimg").src = mine && mine.jpg ? fileUrl(mine.jpg, v.preview_stamp) : fileUrl(p.jpg);
  $("#lbmaster").src = mp && mp.jpg ? fileUrl(mp.jpg) : "";
  $("#lbmaster").parentElement.parentElement.classList.toggle("hidden", !s);
  $("#lbref").src = rp && rp.jpg ? fileUrl(rp.jpg) : "";
  $("#lbref").parentElement.parentElement.classList.toggle("hidden", !rp);
  $("#lbtitle").textContent = (s ? s.key : "Master") + " @ " + p.t.toFixed(2) + "s";
  $("#lbcap").textContent = s && v ? v.label : "";
  // Side by side: each picture gets an equal share of the width (review REV-05).
  $(".lb-body").style.setProperty("--n", 1 + (s ? 1 : 0) + (rp ? 1 : 0));
  $("#lb").classList.remove("hidden");
}
$("#lbclose").onclick = () => $("#lb").classList.add("hidden");
$("#lb").onclick = (e) => { if (e.target.id === "lb") $("#lb").classList.add("hidden"); };
$("#lbsafe").onchange = (e) => $("#lb").classList.toggle("showsafe", e.target.checked);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#lb").classList.add("hidden"); });

// ------------------------------------------------------------ 4 render
const RENDER_LABEL = { done: "Rendered", failed: "Failed", rendering: "Rendering", queued: "Queued", cancelled: "Cancelled" };

// The confirm box before Copy deliverables: where it goes, which MP4s are held
// back and why, and whether the delivered .aep drops the version comps.
function deliverBox(c) {
  const folderNote = !c.parent_exists
    ? `<div class="lv-FAIL">${ic("xCircle")} The folder that should hold it does not exist: <b>${esc(c.folder.split("/").slice(0, -1).join("/"))}</b>. Check the path.</div>`
    : !c.exists
    ? `<div class="lv-WARN">${ic("alert")} <b>${esc(c.folder)}</b> does not exist. A new task folder will be created there. Typo?</div>`
    : !c.task_like ? `<div class="lv-WARN">${ic("alert")} This folder has no 3-Working Files or 4-Output. Is it the task folder?</div>` : "";
  const skip = c.skip.length ? `<div><b>${plural(c.skip.length, "MP4")} held back</b>
      ${c.skip.map((x) => `<label><input type="checkbox" name="inc" value="${esc(x.size)}"> ${esc(x.size)} <span class="lv-WARN">${esc(x.why)}</span> <span class="mut">— copy anyway</span></label>`).join("")}</div>` : "";
  const vers = c.versions.length ? `<div><b>Clean up the delivered .aep?</b>
      <div class="small mut">${plural(c.versions.length, "comp")} kept only for comparing (${esc([...new Set(c.versions.map((v) => v.label))].join(", "))}). The job keeps them.</div>
      <label><input type="radio" name="clean" value="1" ${draft.clean !== false ? "checked" : ""}> Remove them from the delivered file <span class="mut">(recommended)</span></label>
      <label><input type="radio" name="clean" value="0" ${draft.clean === false ? "checked" : ""}> Keep every version</label></div>` : "";
  return `<div class="confirm" id="cleanbox"><b>Copy ${plural(c.ok.length, "MP4")} + working .aep + report into ${esc(c.folder.split("/").pop())}?</b>
    ${folderNote}${skip}${vers}
    <div class="actions"><button class="ghost" id="cleanx">Cancel</button><button id="cleango" ${!c.parent_exists ? "disabled" : ""}>Copy now</button></div></div>`;
}

function renderRender() {
  const list = job.sizes.filter((s) => s.render);
  $("#view").innerHTML = `
  <h1>4 · Render & deliver</h1>
  ${list.length ? list.map((s) => {
    const r = s.render;
    const ver = r.verify || [];
    const pct = Math.round((r.progress || (r.status === "done" ? 1 : 0)) * 100);
    return `<div class="card"><div class="sizehead"><h2>${s.key}</h2>
      <span class="st ${r.status === "done" ? (ver.some((v) => v.level === "FAIL") ? "FAIL" : "PASS") : r.status === "failed" ? "FAIL" : "WARN"}">${esc(RENDER_LABEL[r.status] || r.status)}</span>
      <span class="mut small">${esc(r.template || "")}${r.seconds ? " · " + r.seconds + "s" : ""}</span></div>
      ${r.status === "rendering" || r.status === "queued" ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ""}
      ${ver.map((v) => `<div class="small lv-${v.level}">${esc(v.msg)}</div>`).join("")}
      ${r.reason ? `<div class="small lv-FAIL">${esc(r.reason)}</div>` : ""}
      ${r.stale ? `<div class="small lv-FAIL">${ic("alert")} Changed since it was rendered: render again from step 3.</div>` : ""}
      ${r.file ? `<video controls preload="metadata" src="${fileUrl(r.file, r.seconds)}"></video>` : ""}
    </div>`;
  }).join("") : `<div class="card mut">Nothing rendered yet.</div>`}
  <div class="card"><h2>Watch the MP4s, then deliver <span class="you">${ic("user")} You check</span></h2>
    <div class="small">Watch each MP4 to the end: checks only saw the sample times. To fix, go back to step 3.</div>
    <div class="small mut" style="margin-top:6px">Output: <code>${esc(job.id)}/mp4/</code> · Working file: <code>${esc(job.work_aep.split("/").pop())}</code> (size comps sit next to the master comp, Comment “Built by Video Resize”)</div>
    <div class="row" style="margin-top:12px">
      <span>Task folder</span><input type="text" class="grow" id="outdir" value="${esc(job.deliver_dir || "")}" placeholder="/path/to/the task folder (the one with 1-Doc, 2-Stock…)">
      <button id="deliver" ${job.busy || !list.some((s) => s.render && s.render.status === "done") || !(draft.outdir != null ? draft.outdir : job.deliver_dir || "").trim() ? "disabled" : ""}>Copy deliverables</button></div>
    ${job.task_folder_hint && job.task_folder_hint !== job.deliver_dir ? `<div class="small" style="margin-top:4px">Suggested from where the .aep came from:
      <a href="#" id="usehint"><code>${esc(job.task_folder_hint)}</code></a></div>` : ""}
    <div class="small mut" style="margin-top:4px">MP4s → <code>4-Output</code> · working .aep → <code>3-Working Files</code> · report → <code>1-Doc</code>.
      A file of the same name from an earlier delivery moves to <code>OLD</code>.</div>
    ${draft.check ? deliverBox(draft.check) : ""}
    ${job.delivered ? `<div class="small lv-PASS" style="margin-top:6px">${ic("checkCircle")} ${plural(job.delivered.files.length, "file")} copied to <code>${esc(job.delivered.dir)}</code> at ${esc(when(job.delivered.at))}
      <details><summary>Files</summary>${job.delivered.files.map((f) => esc(f.split("/").pop())).join("<br>")}</details></div>` : ""}
    <div class="actions"><button class="ghost" id="back">${ic("arrowLeft")} Review sizes</button>
      <button class="ghost" id="open">Open job folder</button>
      <button class="ghost" id="rep" title="Copy deliverables adds it to 1-Doc" ${job.busy ? "disabled" : ""}>Preview report</button></div>
    <div id="replink"></div></div>`;
  $("#back").onclick = () => go(job.id, "review");
  const send = async (clean, include) => {
    try {
      await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/deliver`, { folder: $("#outdir").value, clean, include });
      draft.check = null; tick(true);
    } catch (e) { showErr(e); }
  };
  // The button needs a folder: an empty one used to mean the tool's own folder.
  const canDeliver = () => !job.busy && list.some((s) => s.render && s.render.status === "done") && $("#outdir").value.trim();
  $("#outdir").oninput = () => { draft.outdir = $("#outdir").value; $("#deliver").disabled = !canDeliver(); };
  if (draft.outdir != null && !$("#cleanbox")) $("#outdir").value = draft.outdir;
  if ($("#usehint")) $("#usehint").onclick = (e) => { e.preventDefault(); $("#outdir").value = job.task_folder_hint; $("#outdir").oninput(); };
  // Always look first: new folder? MP4s held back? version comps? (review REN-01/02)
  $("#deliver").onclick = async () => {
    draft.outdir = $("#outdir").value;
    try { draft.check = await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/deliver_check`, { folder: draft.outdir }); renderRender(); }
    catch (e) { showErr(e); }
  };
  if ($("#cleanbox")) {
    $("#outdir").value = draft.outdir != null ? draft.outdir : $("#outdir").value;
    $("#deliver").disabled = true;  // one Copy button at a time (review REN-04)
    document.querySelectorAll("input[name=clean]").forEach((r) => r.onchange = () => { draft.clean = r.value === "1"; });
    $("#cleanx").onclick = () => { draft.check = null; renderRender(); };
    $("#cleango").onclick = () => send(draft.clean !== false && draft.check.versions.length > 0,
      [...document.querySelectorAll("input[name=inc]:checked")].map((x) => x.value));
  }
  $("#open").onclick = () => api("POST", `/api/jobs/${encodeURIComponent(job.id)}/open`, {}).catch(showErr);
  $("#rep").onclick = async () => {
    try {
      const r = await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/report`);
      $("#replink").innerHTML = `<div class="small" style="margin-top:8px">${ic("checkCircle", "lv-PASS")} <a href="${fileUrl(r.html, Date.now())}" target="_blank">Open report</a> · <a href="${fileUrl(r.zip, Date.now())}">report.zip</a></div>`;
    } catch (e) { showErr(e); }
  };
}

tick(true);
