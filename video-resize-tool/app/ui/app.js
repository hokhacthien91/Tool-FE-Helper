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
  if (!r.ok || j.error) throw new Error(j.error || r.statusText);
  return j;
}
function showErr(e) { const el = $("#err"); if (!e) { el.classList.add("hidden"); return; } el.textContent = e.message || e; el.classList.remove("hidden"); }
function fileUrl(rel, bust) { return `/jobs/${encodeURIComponent(job.id)}/${rel}${bust ? "?v=" + bust : ""}`; }

function route() {
  const m = location.hash.match(/^#\/job\/([^/]+)(?:\/(\w+))?/);
  return m ? { id: decodeURIComponent(m[1]), stage: m[2] || null } : { id: null, stage: null };
}
function go(id, stage) { location.hash = id ? `#/job/${encodeURIComponent(id)}${stage ? "/" + stage : ""}` : "#/"; }

window.addEventListener("hashchange", () => { jobSig = ""; tick(true); });
$("#home").onclick = () => go(null);

async function tick(force) {
  clearTimeout(pollT);
  const r = route();
  try {
    if (!r.id) { job = null; await renderHome(); renderChrome(); return; }
    const j = await api("GET", "/api/jobs/" + encodeURIComponent(r.id));
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
    $("#busybar").style.width = job.busy.progress != null ? Math.round(job.busy.progress * 100) + "%" : "0";
  } else b.classList.add("hidden");
  showErr(job.error ? new Error("Error: " + job.error) : null);
}

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
  <div class="card jobs">${d.jobs.length ? `<table class="tbl"><tr><th>Job</th><th>Master</th><th>Sizes</th><th>Step</th><th></th></tr>` +
    d.jobs.map((j) => `<tr><td><a href="#/job/${encodeURIComponent(j.id)}">${esc(j.name)}</a><div class="mut small">${esc(j.id)}</div></td>
      <td>${esc(j.master || "—")}</td><td>${esc(j.sizes.join(", ") || "—")}</td><td>${esc(j.stage)}</td>
      <td><button class="ghost del" data-id="${esc(j.id)}" title="Move to jobs/_trash (can be restored). The original .aep is not touched." aria-label="Delete job"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button></td></tr>`).join("") + `</table>`
    : `<span class="mut">No jobs yet.</span>`}</div>`;
  $("#view").querySelectorAll("button.del").forEach((b) => b.onclick = async () => {
    if (!confirm(`Delete job ${b.dataset.id}?\n\nIt moves to jobs/_trash (can be restored). The original .aep is not touched.`)) return;
    try { await api("POST", `/api/jobs/${encodeURIComponent(b.dataset.id)}/delete`); renderHome(); } catch (e) { showErr(e); }
  });
  const start = async (force) => {
    showErr(null);
    try {
      const r = await api("POST", "/api/jobs", { aep: $("#aep").value, force_close: force });
      if (r.blocked) {
        $("#blocked").innerHTML = `<div class="card lv-WARN">AE has an unsaved project open: <b>${esc(r.file || "(Untitled)")}</b>.
          Save it in AE and try again, or <button class="ghost" id="force">Close it WITHOUT saving and continue</button></div>`;
        $("#force").onclick = () => start(true);
        return;
      }
      Object.assign(draft, { master: null, sizes: null, roles: {}, params: {}, decision: {}, ack: false });
      go(r.id);
    } catch (e) { showErr(e); }
  };
  $("#read").onclick = () => start(false);
  $("#aep").onkeydown = (e) => { if (e.key === "Enter") start(false); };
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
    ? `<span class="lv-FAIL">❌</span><span class="k">Fonts</span><div>Missing: <b>${subs.map((f) => esc(f.font)).join(", ")}</b> — AE will substitute another font, so text will be wrong.
       <label class="small"><input type="checkbox" id="ack" ${draft.ack ? "checked" : ""}> I know, continue anyway</label></div>`
    : `<span class="lv-PASS">✅</span><span class="k">Fonts</span><div>${I.fonts.map((f) => esc(f.font)).join(", ") || "No text layers"} — installed</div>`;
  const fm = I.footageMissing;
  const footLine = fm.length
    ? `<span class="lv-WARN">⚠</span><span class="k">Footage</span><div>${fm.length} file(s) missing, usually on disabled layers. Step 2 flags any that are visible.
       <details><summary>Show list</summary>${fm.map((f) => esc(f.name)).join("<br>")}</details></div>`
    : `<span class="lv-PASS">✅</span><span class="k">Footage</span><div>All found</div>`;
  const comps = I.comps;
  $("#view").innerHTML = `
  <h1>1 · Intake</h1>
  <div class="card"><div class="mut small">${esc(job.src_aep)}</div>
    <h2 style="margin-top:10px">Preflight</h2>
    <div class="pf">${fontLine}${footLine}
      <span class="mut">·</span><span class="k">Plugins</span><div class="mut">Not checked (they do not stop a render).</div>
      <span class="mut">·</span><span class="k">Project</span><div class="mut">${I.bpc} bpc · ${comps.length} comp</div></div>
  </div>
  <div class="card"><h2>Master comp</h2>
    <div class="mut small" style="margin-bottom:8px">Pick the comp to resize. Likely masters are listed first.</div>
    <div class="row" style="margin-bottom:8px"><input type="text" id="cq" placeholder="Filter by name…" class="grow"></div>
    <div class="comps" id="comps">${comps.map((c, i) => `
      <label data-n="${esc(c.name.toLowerCase())}" class="${isHelper(c) ? "helper" : ""}"><input type="radio" name="m" value="${c.id}" data-name="${esc(c.name)}" ${String(c.id) === draft.master ? "checked" : ""}>
        <span><b>${esc(c.name)}</b>${i === 0 && !isHelper(c) ? ` <span class="tag">suggested</span>` : ""}${isHelper(c) ? ` <span class="tag mut">guide/logo?</span>` : ""}<div class="f">${esc(c.folder)}</div></span>
        <span class="dims"><span class="size">${c.w}x${c.h}</span><span class="mut small">${ratio(c.w, c.h)} · ${c.workDur.toFixed(2)}s · ${c.layers} layer</span></span></label>`).join("")}</div>
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
  <div class="actions"><button id="next">${draft.auto ? "Run all → MP4" : "Next → Layer roles"}</button></div>`;
  $("#cq").oninput = (e) => { const q = e.target.value.toLowerCase(); $("#comps").querySelectorAll("label").forEach((l) => l.classList.toggle("hidden", !l.dataset.n.includes(q))); };
  const paintMaster = () => {
    const c = comps.find((x) => String(x.id) === draft.master);
    $("#mastercard").innerHTML = c
      ? `<div class="row"><span>Selected master:</span> <b>${esc(c.name)}</b> <span class="size">${c.w}x${c.h}</span>
         <span class="mut">${ratio(c.w, c.h)} · ${c.workDur.toFixed(2)}s · ${c.fps.toFixed(3)} fps · ${c.layers} layer</span></div>
         <div class="mut small" style="margin-top:4px">The sizes below are built from this comp. No need to add its own size (${c.w}x${c.h}).</div>`
      : `<span class="mut">No master comp selected.</span>`;
  };
  paintMaster();
  $("#comps").onchange = (e) => { draft.master = e.target.value; paintMaster(); refreshNext(); };
  if ($("#ack")) $("#ack").onchange = (e) => { draft.ack = e.target.checked; refreshNext(); };
  $("#auto").onchange = (e) => { draft.auto = e.target.checked; $("#autobox").classList.toggle("on", draft.auto); $("#next").textContent = draft.auto ? "Run all → MP4" : "Next → Layer roles"; };
  const has = (w, h) => draft.sizes.some((s) => s.w === w && s.h === h);
  const paintChosen = () => {
    $("#chosen").innerHTML = draft.sizes.map((s, i) => `<span class="chip sel">${s.w}x${s.h}${s.label ? " · " + esc(s.label) : ""}<button data-i="${i}">✕</button></span>`).join("") || `<span class="mut">none</span>`;
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
    try {
      await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/master`, { master: (comps.find((x) => String(x.id) === draft.master) || {}).name, master_id: +draft.master, sizes: draft.sizes, auto: !!draft.auto });
      draft.roles = {}; draft.params = {}; draft.decision = {};
      go(job.id, draft.auto ? null : "roles");  // auto: follow job.stage as it advances
    } catch (e) { showErr(e); }
  };
}

// ------------------------------------------------------------ 2 roles
const ROLE_LABEL = { BG: "BACKGROUND", SUBJECT: "SUBJECT", CONTENT: "CONTENT", FOLLOW: "FOLLOWS PARENT", IGNORE: "IGNORE" };
const KIND_ICON = { text: "Aa", comp: "▣", solid: "■", still: "◆", footage: "▶", null: "○", shape: "⬟", adjustment: "◐", audio: "♪", camera: "🎥", light: "☀", other: "?" };

function renderRoles() {
  const A = job.analysis;
  if (!A || job.stage === "intake") { $("#view").innerHTML = `<div class="card mut">Analysing layer roles…</div>`; return; }
  const M = A.master;
  const roleOf = (L) => draft.roles[L.index] || job.roles[String(L.index)] || L.role;
  const subs = A.fonts.filter((f) => f.substitute === true);
  const low = A.layers.filter((L) => L.conf === "low" && L.role !== "FOLLOW");
  const rows = A.layers.filter((L) => !draft.filterLow || (L.conf === "low" && L.role !== "FOLLOW"));
  const vis = A.footageMissingVisible || [];
  $("#view").innerHTML = `
  <h1>2 · Layer roles <span class="you">👤 You check</span></h1>
  <div class="card"><b>${esc(M.name)}</b> · ${M.w}x${M.h} · ${M.workDur.toFixed(2)}s · ${A.layers.length} layer
    <div class="small" style="margin-top:6px">
      <b>BACKGROUND</b> fills the frame · <b>CONTENT</b> (text, logo) fits inside · <b>SUBJECT</b> in between, keeps its edge ·
      <b>FOLLOWS PARENT</b> / <b>IGNORE</b> untouched.</div>
    ${subs.length ? `<div class="lv-FAIL small">❌ The master uses fonts that are not installed: ${subs.map((f) => esc(f.font)).join(", ")}</div>` : ""}
    ${vis.length ? `<div class="lv-FAIL small" style="margin-top:6px">❌ ${vis.length} missing footage file(s) are <b>visible</b> in the master: they will render as colour bars.
        <details><summary>Show where</summary>${vis.map((f) => `${esc(f.name)} <span class="mut">— ${esc(f.where)}</span>`).join("<br>")}</details>
        Relink them in the job's .aep (or the original) first, or
        <label><input type="checkbox" id="ackm" ${draft.ackMissing ? "checked" : ""}> continue anyway</label></div>`
      : A.footageMissing.length ? `<div class="mut small">Missing footage only on disabled/guide layers (does not show): ${A.footageMissing.map((f) => esc(f.name)).join(", ")}</div>` : ""}
  </div>
  <div class="card">
    <div class="row" style="justify-content:space-between">
      <span>${low.length ? `<span class="lv-WARN">⚠ ${low.length} uncertain row(s)</span> — check the highlighted rows.` : `<span class="lv-PASS">The tool is confident on every row.</span>`}</span>
      <label class="small"><input type="checkbox" id="fl" ${draft.filterLow ? "checked" : ""}> Show ⚠ rows only</label>
    </div>
    <div class="wrap"><table class="tbl"><tr><th>#</th><th>Preview</th><th>Layer</th><th>Role</th><th>Why the tool chose it</th></tr>
    ${rows.map((L) => {
      const r = roleOf(L), edited = r !== L.role;
      const sel = L.role === "FOLLOW" ? `<span class="mut">FOLLOWS PARENT</span>` :
        `<select data-i="${L.index}">${["BG", "SUBJECT", "CONTENT", "IGNORE"].map((k) => `<option value="${k}" ${k === r ? "selected" : ""}>${ROLE_LABEL[k]}</option>`).join("")}</select>`;
      return `<tr class="${L.conf === "low" && L.role !== "FOLLOW" ? "low" : ""} ${edited ? "edited" : ""}">
        <td>L${L.index}</td>
        <td><div class="thumbs">${L.thumb ? `<img src="${fileUrl(L.thumb)}" loading="lazy" title="Master at ${L.sampleTime.toFixed(2)}s, red box = this layer">` : `<span class="mut" style="font-size:20px">${KIND_ICON[L.kind] || "?"}</span>`}
          ${L.thumb_src ? `<img src="${fileUrl(L.thumb_src)}" loading="lazy" title="What is inside the precomp">` : ""}</div></td>
        <td><b>${esc(L.name)}</b>${L.enabled ? "" : ` <span class="mut small">[off]</span>`}<div class="mut small">${KIND_ICON[L.kind] || ""} ${esc(L.kind)}${L.source && L.source !== L.name ? " · " + esc(L.source) : ""} · ${L.inPoint.toFixed(2)}–${L.outPoint.toFixed(2)}s</div></td>
        <td>${sel}${edited ? `<div class="small mut">tool chose: ${ROLE_LABEL[L.role]}</div>` : ""}</td>
        <td class="small">${L.conf === "low" ? "⚠ " : ""}${esc(L.why)}</td></tr>`;
    }).join("")}</table></div>
  </div>
  <div class="actions"><button class="ghost" id="back">← Change master / sizes</button><button id="go" ${job.busy || (vis.length && !draft.ackMissing) ? "disabled" : ""}>Confirm roles → Build ${job.sizes.length} size(s)</button></div>`;
  $("#fl").onchange = (e) => { draft.filterLow = e.target.checked; renderRoles(); };
  if ($("#ackm")) $("#ackm").onchange = (e) => { draft.ackMissing = e.target.checked; renderRoles(); };
  $("#view").querySelectorAll("select[data-i]").forEach((s) => s.onchange = () => { draft.roles[s.dataset.i] = s.value; renderRoles(); });
  $("#back").onclick = () => go(job.id, "intake");
  $("#go").onclick = async () => {
    const roles = {};
    A.layers.forEach((L) => { roles[L.index] = roleOf(L); });
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/roles`, { roles, ack_missing: !!draft.ackMissing }); go(job.id, "review"); }
    catch (e) { showErr(e); }
  };
}

// ------------------------------------------------------------ 3 review
function stripHtml(list, size, items) {
  const bad = {}, warn = {};
  (items || []).forEach((i) => { if (i.t != null) (i.level === "FAIL" ? bad : warn)[i.t] = 1; });
  return `<div class="strip">${list.map((p, i) => `<figure class="${bad[p.t] ? "bad" : warn[p.t] ? "warn" : ""}" data-size="${size || ""}" data-i="${i}">
    ${p.thumb ? `<img src="${fileUrl(p.thumb, size ? (job.sizes.find((s) => s.key === size) || {}).preview_stamp : "")}">` : `<div class="mut">no image</div>`}
    <figcaption>${p.t.toFixed(2)}s</figcaption></figure>`).join("")}</div>`;
}

function renderReview() {
  if (!job.master_previews) { $("#view").innerHTML = `<div class="card mut">Building…</div>`; return; }
  const sizes = job.sizes;
  const nOk = sizes.filter((s) => s.decision === "ok" || s.decision === "manual").length;
  $("#view").innerHTML = `
  <h1>3 · Review sizes <span class="you">👤 You check</span></h1>
  <div class="card"><div class="sizehead"><h2>Master · ${job.master_info.w}x${job.master_info.h}</h2><span class="mut small">${esc(job.master)}</span>
    <button class="ghost small" id="beats" style="margin-left:auto" title="Re-pick the sample times and re-check every size. Roles and renders are kept." ${job.busy ? "disabled" : ""}>↻ Re-pick sample times</button></div>
    ${stripHtml(job.master_previews, "", [])}</div>
  ${sizes.map((s) => sizeCard(s)).join("")}
  <div class="actions"><span class="mut" style="align-self:center">${nOk}/${sizes.length} size(s) approved</span>
    <button class="ghost" id="back">← Layer roles</button>
    <button id="render" ${!nOk || job.busy ? "disabled" : ""}>Render ${nOk} approved size(s) →</button></div>`;
  $("#back").onclick = () => go(job.id, "roles");
  $("#beats").onclick = async () => { try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/beats`); tick(true); } catch (e) { showErr(e); } };
  $("#render").onclick = async () => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/render`); go(job.id, "render"); } catch (e) { showErr(e); }
  };
  $("#view").querySelectorAll(".card > .strip figure").forEach((f) => f.onclick = () => openLb(f.dataset.size, +f.dataset.i));
  sizes.forEach((s) => wireSize(s));
}

// Hover help for every control on the size card (asked for after people had
// to ask what each field does).
const HELP = {
  layout: "Keep group: text and logos stay together around the centre. Stick to edges: corner items stay in their corner.",
  ox: "Move text and logos, px. + = right.",
  oy: "Move text and logos, px. + = down.",
  content_mult: "Extra scale for text and logos. 1.1 = 10% bigger.",
  subject_mult: "Extra scale for the person/product. 1 = unchanged.",
  sx: "Move the person/product, px. + = right.",
  sy: "Move the person/product, px. + = down.",
  bg_mult: "Extra scale for the background. Below 1 uncovers edges.",
  ok: "Approve. Only approved sizes render.",
  rebuild: "Rebuild with the values above (about 5 s).",
  manual: "Open this comp in AE, edit, save, then Re-read from AE.",
  layers: "Adjust one layer: scale, dx, dy (px).",
  suggest: "AI proposes values (1–4 min). Nothing changes until you use them and Apply.",
  reference: "The designer's comp at this size, to compare with.",
};
const tip = (k) => ` title="${esc(HELP[k] || "")}"`;

function pc(k) { return k ? Math.round(k * 100) + "%" : "—"; }
function num(v, d) { return v == null || v === "" ? d : v; }

function compareHtml(s) {
  const c = s.compare;
  const opts = s.reference_options || [];
  const sel = `<label class="small"${tip("reference")}>Designer reference
    <select data-ref="1"><option value="">— none —</option>${opts.map((o) => `<option ${o === s.reference ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
  if (!opts.length) return "";
  if (!c) return `<div class="cmp">${sel}<span class="mut small">No designer comp picked for this size.</span></div>`;
  if (c.error) return `<div class="cmp">${sel}<span class="lv-WARN small">${esc(c.error)}</span></div>`;
  const pct = c.median_pct == null ? "—" : c.median_pct + "%";
  const grade = c.median_pct == null ? "" : c.median_pct <= 2 ? "PASS" : c.median_pct <= 6 ? "WARN" : "FAIL";
  const verdict = { PASS: "Close to the designer's layout", WARN: "Somewhat different from the designer", FAIL: "Very different: the designer re-laid this size out" }[grade] || "Not enough matching layers to compare";
  return `<div class="cmp">${sel}
    <div><span class="st ${grade}">${verdict}</span>
      <span class="small mut">${c.median_px == null ? "—" : c.median_px + " px"} apart (${pct}), ${c.matched} layer(s) matched.</span></div>
    <details class="small"><summary>Per-layer distance to the designer</summary>
      <table class="tbl"><tr><th>Layer</th><th>dx</th><th>dy</th><th>distance</th><th>size vs designer</th></tr>
      ${c.layers.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.dx}</td><td>${r.dy}</td><td><b>${r.dist}</b></td><td>×${r.scale}</td></tr>`).join("")}</table>
      <div class="mut">dx/dy: centre of the tool's layer minus the designer's, in px (positive = tool is right/lower). Full-frame backgrounds are left out.</div>
    </details>
    ${s.ref_previews ? `<div class="mut small" style="margin-top:6px">Designer:</div>${stripHtml(s.ref_previews, "", [])}` : ""}
  </div>`;
}

function layersHtml(s, p) {
  const rows = job.analysis.layers.filter((L) => !L.parent && !["IGNORE", "FOLLOW"].includes(job.roles[String(L.index)] || L.role));
  const lv = p.layers || {};
  const open = Object.keys(lv).length ? "open" : "";
  return `<details class="small layersbox" ${open}><summary${tip("layers")}>Per-layer adjustments${Object.keys(lv).length ? ` (${Object.keys(lv).length} set)` : ""}</summary>
    <table class="tbl"><tr><th>#</th><th>Layer</th><th>Role</th><th>×</th><th>dx</th><th>dy</th></tr>
    ${rows.map((L) => { const v = lv[String(L.index)] || {}; return `<tr><td>L${L.index}</td><td>${esc(L.name)}</td><td>${ROLE_LABEL[job.roles[String(L.index)] || L.role]}</td>
      <td><input type="number" data-l="${L.index}" data-f="k" value="${num(v.k, 1)}" step="0.02" min="0.1"></td>
      <td><input type="number" data-l="${L.index}" data-f="dx" value="${num(v.dx, 0)}" step="10"></td>
      <td><input type="number" data-l="${L.index}" data-f="dy" value="${num(v.dy, 0)}" step="10"></td></tr>`; }).join("")}</table></details>`;
}

function suggestionHtml(s) {
  const g = s.suggestion;
  if (!g) return "";
  const parts = Object.entries(g.params).filter(([k]) => k !== "layers").map(([k, v]) => `${k} ${v}`);
  const lay = Object.entries(g.params.layers || {}).map(([k, v]) => `L${k} ${Object.entries(v).map(([a, b]) => a + " " + b).join(" ")}`);
  return `<div class="sug small"><b>AI suggestion</b> <span class="mut">${esc(g.at)}</span><div>${esc(g.why)}</div>
    <div class="mut">${esc(parts.concat(lay).join(" · ") || "no change")}</div>
    <button class="ghost" data-act="use">Use these values</button></div>`;
}

function sizeCard(s) {
  const ch = s.checks || { status: "—", items: [] };
  const p = Object.assign({}, s.params, draft.params[s.key] || {});
  const dec = draft.decision[s.key] || (s.decision === "ok" ? "ok" : s.decision === "manual" ? "manual" : "rebuild");
  const b = s.build || {};
  const decLabel = s.decision === "ok" ? `<span class="st PASS">✓ Approved</span>` : s.decision === "manual" ? `<span class="st WARN">✋ Manual edit</span>` : "";
  return `<div class="card" id="sz-${s.key}">
    <div class="sizehead"><h2>${s.key}${s.label ? " · " + esc(s.label) : ""}</h2><span class="st ${ch.status}">${ch.status}</span>${decLabel}
      <span class="mut small" title="How much each role was scaled compared with the master">background ${pc(b.bg_k)}${b.subject_k ? " · subject " + pc(b.subject_k) : ""} · text/logo ${pc(b.content_k)} of master size</span></div>
    ${stripHtml(s.previews || [], s.key, ch.items)}
    ${ch.items.length ? `<ul class="items small">${ch.items.map((i) => `<li class="lv-${i.level}">${esc(i.msg)}</li>`).join("")}</ul>`
      : `<div class="small lv-PASS">No problems at the sample times.</div>`}
    ${compareHtml(s)}
    <div class="params">
      <label${tip("layout")}>Content layout<select data-k="layout"><option value="center" ${p.layout === "center" ? "selected" : ""}>Keep group (around centre)</option>
        <option value="axis" ${p.layout === "axis" ? "selected" : ""}>Stick to edges (per axis)</option></select></label>
      <label${tip("ox")}>Content X (px)<input type="number" data-k="ox" value="${p.ox}" step="10"></label>
      <label${tip("oy")}>Content Y (px)<input type="number" data-k="oy" value="${p.oy}" step="10"></label>
      <label${tip("content_mult")}>Text/logo ×<input type="number" data-k="content_mult" value="${p.content_mult}" step="0.05" min="0.1"></label>
      <label${tip("subject_mult")}>Subject ×<input type="number" data-k="subject_mult" value="${num(p.subject_mult, 1)}" step="0.05" min="0.1"></label>
      <label${tip("sx")}>Subject X (px)<input type="number" data-k="sx" value="${num(p.sx, 0)}" step="10"></label>
      <label${tip("sy")}>Subject Y (px)<input type="number" data-k="sy" value="${num(p.sy, 0)}" step="10"></label>
      <label${tip("bg_mult")}>Background ×<input type="number" data-k="bg_mult" value="${p.bg_mult}" step="0.05" min="0.5"></label>
    </div>
    ${layersHtml(s, p)}
    ${suggestionHtml(s)}
    <div class="decide">
      <label${tip("ok")}><input type="radio" name="d-${s.key}" value="ok" ${dec === "ok" ? "checked" : ""}> ✅ OK — ready to render</label>
      <label${tip("rebuild")}><input type="radio" name="d-${s.key}" value="rebuild" ${dec === "rebuild" ? "checked" : ""}> 🔧 Rebuild with these values</label>
      <label${tip("manual")}><input type="radio" name="d-${s.key}" value="manual" ${dec === "manual" ? "checked" : ""}> ✋ Edit by hand in AE</label>
    </div>
    ${s.decision ? "" : `<div class="small mut" style="margin-top:4px">Change a value → Apply rebuilds. Happy → ✅ OK → Apply. Only OK sizes render.</div>`}
    <div class="actions" style="margin-top:8px">
      <button class="ghost" data-act="suggest"${tip("suggest")} ${job.busy ? "disabled" : ""}>✨ AI suggest</button>
      ${s.decision === "manual" ? `<button class="ghost" data-act="reread">Re-read from AE</button>` : ""}
      <button data-act="apply" ${job.busy ? "disabled" : ""}>Apply</button></div>
  </div>`;
}

function wireSize(s) {
  const card = $("#sz-" + CSS.escape(s.key));
  const toRebuild = () => { const r = card.querySelector(`input[value=rebuild]`); if (r) { r.checked = true; draft.decision[s.key] = "rebuild"; } };
  const dp = () => (draft.params[s.key] = draft.params[s.key] || {});
  card.querySelectorAll("[data-k]").forEach((el) => el.onchange = () => {
    dp()[el.dataset.k] = el.dataset.k === "layout" ? el.value : parseFloat(el.value);
    toRebuild();
  });
  card.querySelectorAll("[data-l]").forEach((el) => el.onchange = () => {
    const d = dp();
    d.layers = d.layers || JSON.parse(JSON.stringify(s.params.layers || {}));
    const v = (d.layers[el.dataset.l] = d.layers[el.dataset.l] || {});
    v[el.dataset.f] = parseFloat(el.value);
    toRebuild();
  });
  card.querySelectorAll("input[type=radio]").forEach((el) => el.onchange = () => { draft.decision[s.key] = el.value; });
  const send = async (action) => {
    try {
      await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/size`, { key: s.key, params: draft.params[s.key] || null, action });
      delete draft.params[s.key]; delete draft.decision[s.key];
      tick(true);
    } catch (e) { showErr(e); }
  };
  card.querySelector("[data-act=apply]").onclick = () => send(draft.decision[s.key] || (s.decision === "ok" ? "ok" : s.decision === "manual" ? "manual" : "rebuild"));
  const rr = card.querySelector("[data-act=reread]"); if (rr) rr.onclick = () => send("reread");
  card.querySelector("[data-act=suggest]").onclick = async () => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/suggest`, { key: s.key }); tick(true); } catch (e) { showErr(e); }
  };
  const use = card.querySelector("[data-act=use]");
  if (use) use.onclick = () => {
    draft.params[s.key] = Object.assign({}, draft.params[s.key] || {}, JSON.parse(JSON.stringify(s.suggestion.params)));
    draft.decision[s.key] = "rebuild";
    jobSig = ""; render();
  };
  const ref = card.querySelector("[data-ref]");
  if (ref) ref.onchange = async () => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/reference`, { key: s.key, ref: ref.value }); tick(true); } catch (e) { showErr(e); }
  };
  card.querySelectorAll(".cmp .strip figure").forEach((f) => f.onclick = () => openLb(s.key, +f.dataset.i, true));
}

function openLb(size, i, fromRef) {
  const s = size ? job.sizes.find((x) => x.key === size) : null;
  const list = s ? (fromRef ? s.ref_previews : s.previews) : job.master_previews;
  const p = list && list[i];
  if (!p || !p.jpg) return;
  const mine = s && s.previews ? s.previews.find((m) => m.t === p.t) : null;
  const mp = (job.master_previews || []).find((m) => m.t === p.t);
  const rp = s && s.ref_previews ? s.ref_previews.find((m) => m.t === p.t) : null;
  $("#lbimg").src = mine && mine.jpg ? fileUrl(mine.jpg, s.preview_stamp) : fileUrl(p.jpg);
  $("#lbmaster").src = mp && mp.jpg ? fileUrl(mp.jpg) : "";
  $("#lbmaster").parentElement.parentElement.classList.toggle("hidden", !s);
  $("#lbref").src = rp && rp.jpg ? fileUrl(rp.jpg) : "";
  $("#lbref").parentElement.parentElement.classList.toggle("hidden", !rp);
  $("#lbtitle").textContent = (s ? s.key : "Master") + " @ " + p.t.toFixed(2) + "s";
  $("#lbcap").textContent = s ? "Resized by the tool" : "";
  $("#lb").classList.remove("hidden");
}
$("#lbclose").onclick = () => $("#lb").classList.add("hidden");
$("#lb").onclick = (e) => { if (e.target.id === "lb") $("#lb").classList.add("hidden"); };
$("#lbsafe").onchange = (e) => $("#lb").classList.toggle("showsafe", e.target.checked);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#lb").classList.add("hidden"); });

// ------------------------------------------------------------ 4 render
function renderRender() {
  const list = job.sizes.filter((s) => s.render);
  $("#view").innerHTML = `
  <h1>4 · Render & deliver</h1>
  ${list.length ? list.map((s) => {
    const r = s.render;
    const ver = r.verify || [];
    const pct = Math.round((r.progress || (r.status === "done" ? 1 : 0)) * 100);
    return `<div class="card"><div class="sizehead"><h2>${s.key}</h2>
      <span class="st ${r.status === "done" ? (ver.some((v) => v.level === "FAIL") ? "FAIL" : "PASS") : r.status === "failed" ? "FAIL" : "WARN"}">${esc(r.status)}</span>
      <span class="mut small">${esc(r.template || "")}${r.seconds ? " · " + r.seconds + "s" : ""}</span></div>
      ${r.status === "rendering" || r.status === "queued" ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ""}
      ${ver.map((v) => `<div class="small lv-${v.level}">${esc(v.msg)}</div>`).join("")}
      ${r.reason ? `<div class="small lv-FAIL">${esc(r.reason)}</div>` : ""}
      ${r.stale ? `<div class="small lv-FAIL">⚠ Older than the current layout: approve again in step 3 and re-render.</div>` : ""}
      ${r.file ? `<video controls preload="metadata" src="${fileUrl(r.file, r.seconds)}"></video>` : ""}
    </div>`;
  }).join("") : `<div class="card mut">Nothing rendered yet.</div>`}
  <div class="card"><h2>Watch the MP4s, then deliver <span class="you">👤 You check</span></h2>
    <div class="small">Watch each MP4 to the end: checks only saw the sample times. To fix, go back to step 3.</div>
    <div class="small mut" style="margin-top:6px">Output: <code>${esc(job.id)}/mp4/</code> · Working file: <code>${esc(job.work_aep.split("/").pop())}</code> (folder <b>VR-Resize</b> in the project)</div>
    <div class="row" style="margin-top:12px"${' title="Copies MP4s, the working .aep and report.zip into <folder>/<master>_resize/. Never overwrites."'}>
      <span>Output folder</span><input type="text" class="grow" id="outdir" value="${esc(job.deliver_dir || "")}" placeholder="/path/to/4-Output">
      <button id="deliver" ${job.busy || !list.some((s) => s.render && s.render.status === "done") ? "disabled" : ""}>Copy deliverables</button></div>
    ${job.delivered ? `<div class="small lv-PASS" style="margin-top:6px">✅ ${job.delivered.files.length} file(s) copied to <code>${esc(job.delivered.dir)}</code> at ${esc(job.delivered.at)}
      <details><summary>Files</summary>${job.delivered.files.map((f) => esc(f.split("/").pop())).join("<br>")}</details></div>` : ""}
    <div class="actions"><button class="ghost" id="back">← Review sizes</button>
      <button class="ghost" id="open">Open job folder</button>
      <button id="rep" ${job.busy ? "disabled" : ""}>Export report.html</button></div>
    <div id="replink"></div></div>`;
  $("#back").onclick = () => go(job.id, "review");
  $("#deliver").onclick = async () => {
    try { await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/deliver`, { folder: $("#outdir").value }); tick(true); } catch (e) { showErr(e); }
  };
  $("#open").onclick = () => api("POST", `/api/jobs/${encodeURIComponent(job.id)}/open`, {}).catch(showErr);
  $("#rep").onclick = async () => {
    try {
      const r = await api("POST", `/api/jobs/${encodeURIComponent(job.id)}/report`);
      $("#replink").innerHTML = `<div class="small" style="margin-top:8px">✅ <a href="${fileUrl(r.html, Date.now())}" target="_blank">Open report</a> · <a href="${fileUrl(r.zip, Date.now())}">report.zip</a></div>`;
    } catch (e) { showErr(e); }
  };
}

tick(true);
