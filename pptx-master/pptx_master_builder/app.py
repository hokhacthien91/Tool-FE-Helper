"""app.py — Web UI local cho PPTX Master Builder (chỉ dùng Python stdlib, không cần pip install).

Chạy:  python3 app.py
Rồi mở trình duyệt tại http://localhost:8765

Luồng: upload .pptx -> xem bảng phân nhóm -> chỉnh tên layout -> Build -> tải file có master.
"""
import json
import os
import re
import tempfile
import time
import uuid
import webbrowser
from datetime import datetime, timezone

import threading

_META = {}   # token -> {"orig": tên gốc không đuôi, "outname": tên file download}
_PROGRESS = {}   # token -> {done, total, name, state:'running'|'done'|'error', result|error}
# slug preset -> chèn vào tên file download (khớp <option value> ở UI)
_PRESET_SLUG = {"default": "recommended", "fixicon": "fix-icons",
                "fiximg": "fix-images", "editimg": "edit-images",
                "editall": "edit-all", "fixall": "fix-all"}
_VERIFY = {}   # token -> {done, total, state:'running'|'done'|'error', result|error}
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs

from build import plan, build
from preview import render_slide, renderer_name, verify_visual

PORT = int(os.environ.get("PORT", "8765"))
# HOST: mặc định 127.0.0.1 (chạy local an toàn). Trong Docker/server đặt HOST=0.0.0.0
# (docker-compose đã set) để truy cập từ ngoài container.
HOST = os.environ.get("HOST", "127.0.0.1")
WORK = os.path.join(tempfile.gettempdir(), "pptx_master_builder")
os.makedirs(WORK, exist_ok=True)
_TTL_SEC = 6 * 3600   # file/token cũ hơn 6 giờ -> dọn


def _cleanup_old(now):
    """Xóa file .pptx tạm trong WORK + preview PNG/SVG cũ hơn _TTL_SEC, và bỏ entry
    _META/_PROGRESS của token đã hết. Gọi lúc start + sau mỗi analyze (nhẹ, chỉ stat)."""
    import preview
    removed = 0
    for d in (WORK, preview._WORKDIR):
        try:
            entries = os.listdir(d)
        except OSError:
            continue
        for fn in entries:
            fp = os.path.join(d, fn)
            try:
                if now - os.path.getmtime(fp) > _TTL_SEC:
                    os.remove(fp)
                    removed += 1
            except OSError:
                pass
    # dọn dict theo token không còn file _src.pptx
    live = {fn.split("_src.pptx")[0] for fn in os.listdir(WORK) if fn.endswith("_src.pptx")}
    for token in list(_META.keys()):
        if token not in live:
            _META.pop(token, None)
            _PROGRESS.pop(token, None)
    return removed

PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PPTX Master Builder · Gravity Global</title>
<meta name="description" content="Turn approved PowerPoint slides into reusable slide layouts with editable text &amp; images, keeping sample slides to duplicate.">
<meta name="theme-color" content="#121212">
<meta name="color-scheme" content="dark">
<!-- Favicon: slide layout — text lines + picture placeholder on brand-green tile (SVG data URI) -->
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23b7e39b'/%3E%3Cg fill='none' stroke='%23121212' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='6' y='7' width='20' height='18' rx='2'/%3E%3Cline x1='10' y1='12' x2='17' y2='12'/%3E%3Cline x1='10' y1='17' x2='14' y2='17'/%3E%3Cline x1='10' y1='21' x2='13' y2='21'/%3E%3Crect x='17.5' y='15.5' width='6' height='6' rx='1'/%3E%3C/g%3E%3C/svg%3E">
<style>
:root{--bg:#121212;--card:#1c1c1c;--fg:#f2f2f2;--mut:#707070;--acc:#b7e39b;--acc-dark:#59a139;--ok:#b7e39b;--line:#2a2a2a}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:820px;margin:0 auto;padding:32px 20px}
/* Header: logo-dot + brand-tag + h1 (đồng bộ brand với các tool khác của Gravity) */
.topbar{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.logo-dot{width:38px;height:38px;border-radius:8px;flex:0 0 auto;background:var(--acc);display:grid;place-items:center}
.brand-tag{color:var(--acc);font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700}
h1{font-size:22px;margin:2px 0 0;font-weight:700;letter-spacing:.3px}
.sub{color:var(--mut);margin:6px 0 24px 52px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px}
.drop{display:block;width:100%;border:2px dashed var(--line);border-radius:12px;padding:48px 20px;text-align:center;cursor:pointer;transition:.15s}
.drop:hover,.drop.over{border-color:var(--acc);background:#12151c}
.drop input{display:none}
.drop b{color:var(--fg)}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line)}
th{color:var(--mut);font-weight:500;font-size:13px}
input[type=text]{width:100%;background:var(--bg-input,#0a0a0a);border:1px solid var(--line);color:var(--fg);border-radius:4px;padding:7px 9px;font:inherit}
input[type=text]:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px rgba(183,227,155,.15)}
input[type=checkbox],input[type=radio]{accent-color:var(--acc-dark)}
.badge{display:inline-block;background:#0a0a0a;border:1px solid var(--line);border-radius:4px;padding:2px 10px;font-size:12px;color:var(--mut)}
.btn{background:var(--acc);color:#121212;border:0;border-radius:4px;padding:11px 22px;font:inherit;font-weight:700;text-transform:uppercase;letter-spacing:.5px;font-size:13px;cursor:pointer;transition:background .15s}
.btn:hover{background:var(--acc-dark);color:#fff}
.btn:disabled{background:var(--line);color:var(--mut);cursor:default}.btn.sec{background:#252525;color:var(--fg);text-transform:none;letter-spacing:0}
.row{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.mut{color:var(--mut);font-size:13px}.ok{color:var(--ok)}.hide{display:none!important}
.spin{width:16px;height:16px;border:2px solid #fff5;border-top-color:#fff;border-radius:50%;display:inline-block;animation:s .7s linear infinite;vertical-align:-3px}
@keyframes s{to{transform:rotate(360deg)}}
.thumb{width:104px;height:58px;border-radius:5px;border:1px solid var(--line);background:#12151c;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:zoom-in}
.thumbimg{width:100%;height:100%;object-fit:cover;display:block}
.warn{color:#fbbf24;font-size:13px;background:#1f1a0e;border:1px solid #3d3418;border-radius:8px;padding:10px 12px}
.lay{border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:12px;background:var(--card)}
.lay-hd{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}
.lay-hd .thumb{flex:none}
.lay-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.lay-meta input[type=text]{width:100%}
.lay-slides{font-size:11px;line-height:1.4;word-break:break-word}   /* slide list xuống dưới + wrap */
.caret{flex:none;margin-left:2px;background:transparent;border:1px solid var(--line);border-radius:4px;color:var(--mut);cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;transition:.15s}
.caret:hover{color:var(--acc);border-color:var(--acc-dark)}
.caret svg{transition:transform .18s}
.lay.collapsed .caret svg{transform:rotate(-90deg)}
.lay.collapsed .els{display:none}
.els{display:flex;flex-direction:column;gap:7px}
.el{display:flex;gap:10px;align-items:center;padding:6px 8px;border-radius:4px;background:#0a0a0a;border-left:3px solid transparent}
.el.t-image{border-left-color:var(--acc-dark)}      /* ảnh: viền xanh lá */
.el.t-text{border-left-color:#e0b84a;background:#14120c}  /* text: viền vàng + nền ấm */
.el.deleted{opacity:.4;text-decoration:line-through}
.el-th{width:56px;height:32px;object-fit:cover;border-radius:4px;border:1px solid var(--line);background:#1c1c1c;flex:none}
.el-th.txt{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#e0b84a;background:#241f14}
.el-lb{flex:1;min-width:0;font-size:13px;color:var(--fg);overflow:hidden}
.el-lb .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.el-lb .sz{font-size:11px;color:var(--mut);margin-left:8px}
.el-lb .sz::before{content:"— ";color:var(--line)}
.el-tag{flex:none;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 6px;border-radius:3px;min-width:78px;text-align:center}
/* màu tag theo role: Image nội dung nổi bật (xanh), Icon/Background mờ (thường fixed) */
.el-tag.r-content.image{background:rgba(89,161,57,.22);color:var(--acc)}
.el-tag.r-icon{background:rgba(120,120,120,.2);color:#b0b0b0}
.el-tag.r-bg{background:rgba(96,140,190,.2);color:#8fb4e0}
.el-tag.r-content.text{background:rgba(224,184,74,.2);color:#e0b84a}
.el-tag.r-chrome{background:rgba(120,120,120,.2);color:#b0b0b0}   /* Decor = xám như Icon (cùng nhóm trang trí, khác hẳn Text vàng) */
.el-del{flex:none;background:transparent;border:1px solid var(--line);border-radius:4px;color:var(--mut);cursor:pointer;padding:4px 6px;display:flex;align-items:center}
.el-del:hover{color:#ffb8a0;border-color:var(--gg-accent,#a32600)}
.el-seg{display:inline-flex;border:1px solid var(--line);border-radius:4px;overflow:hidden;flex:none}
.el-seg label{padding:5px 11px;cursor:pointer;font-size:12px}
.el-seg input{display:none}
.el-seg input:checked+span{background:var(--acc);color:#121212;font-weight:600;display:inline-block;margin:-5px -11px;padding:5px 11px}
.lb{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:99;cursor:zoom-out}
.lb-close{position:fixed;top:18px;right:22px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:#1c1c1c;color:var(--fg);font-size:20px;line-height:1;cursor:pointer;z-index:100;display:flex;align-items:center;justify-content:center;transition:.15s}
.lb-close:hover{background:var(--acc);color:#121212;border-color:var(--acc)}
.lb-label{position:fixed;top:22px;left:50%;transform:translateX(-50%);z-index:100;background:#1c1c1c;border:1px solid var(--line);border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;color:var(--fg)}
.lb-nav{position:fixed;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:1px solid var(--line);background:#1c1c1c;color:var(--fg);font-size:26px;line-height:1;cursor:pointer;z-index:100;display:flex;align-items:center;justify-content:center;transition:.15s}
.lb-nav:hover{background:var(--acc);color:#121212;border-color:var(--acc)}
.lb-nav:disabled{opacity:.3;cursor:default}
.lb-prev{left:22px}.lb-next{right:22px}
/* lightbox: preview slide dùng full (92vw). Ảnh/icon element (.sm) cap 480px vì SVG icon
   nhỏ không có kích thước nội tại -> nếu không cap sẽ bị phóng full màn hình. */
.lb img{max-width:92vw;max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px #000}
.lb img.sm{max-width:min(90vw,480px);max-height:min(90vh,480px);background:#1c1c1c;padding:12px}
td{vertical-align:middle}
.opts{display:flex;flex-direction:column;gap:12px;margin:18px 0 4px;padding:16px;background:#12151c;border-radius:8px}
.opt-t{font-size:13px;color:var(--mut);margin-bottom:6px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}
.seg label{padding:7px 14px;cursor:pointer;font-size:13px;background:transparent}
.seg input{display:none}
.seg input:checked+span{background:var(--acc);color:#121212;font-weight:600;display:inline-block;margin:-7px -14px;padding:7px 14px}
.chk{width:17px;height:17px;accent-color:var(--acc);cursor:pointer}
.off{opacity:.4}
.app-footer{border-top:1px solid var(--line);padding:18px 8px 4px;margin-top:28px;text-align:center;line-height:1.7}
.footer-title{color:var(--fg);font-size:13px;font-weight:600;margin-bottom:2px}
.footer-version{color:var(--mut);font-weight:400;margin-left:4px}
.footer-sep{color:var(--line);margin:0 4px}
.footer-credit{font-size:12px;color:var(--mut)}
.footer-author{color:var(--acc);font-weight:600}
.footer-copyright{color:var(--mut);font-weight:400}
.verify-box{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.vf-summary{font-size:14px;font-weight:600;margin-bottom:8px}
.vf-grid{display:flex;flex-wrap:wrap;gap:6px}
.vf-slide{font-size:11px;padding:4px 8px;border-radius:4px;border:1px solid var(--line);display:flex;gap:6px;align-items:center}
.vf-clk{cursor:zoom-in}.vf-clk:hover{filter:brightness(1.25)}
.vf-slide.match{background:rgba(89,161,57,.15);color:var(--acc)}
.vf-slide.close{background:rgba(224,184,74,.15);color:#e0b84a}
.vf-slide.diff{background:rgba(200,60,40,.2);color:#ffb8a0}
.vf-slide.fail{background:#222;color:var(--mut)}
.drop-err{color:#ffb8a0;font-weight:600}
.preset{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#12151c;border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:14px}
.preset-lb{font-size:13px;color:var(--fg);font-weight:600}
.preset select{background:#0a0a0a;border:1px solid var(--line);color:var(--fg);border-radius:5px;padding:7px 10px;font:inherit;cursor:pointer}
.preset select:focus{outline:none;border-color:var(--acc)}
.preset-hint{font-size:12px;color:var(--acc)}
.hint{background:#12151c;border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin-top:14px;font-size:13px;line-height:1.6}
.hint b{color:var(--acc)}
.hint .lbl{display:inline-block;background:rgba(89,161,57,.18);color:var(--acc);border-radius:3px;padding:1px 7px;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;margin-right:4px}
.bar{display:block;width:100%;height:6px;background:#0a0a0a;border-radius:3px;overflow:hidden;margin-top:8px;border:1px solid var(--line)}
.bar>i{display:block;height:100%;width:0;background:var(--acc);transition:width .3s}
</style></head><body><div class="wrap">
<div class="topbar">
  <div class="logo-dot">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#121212" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="6.5" y1="8.5" x2="12" y2="8.5"/><line x1="6.5" y1="12.5" x2="10" y2="12.5"/><line x1="6.5" y1="15.5" x2="9" y2="15.5"/><rect x="13" y="11" width="5.5" height="5.5" rx="1"/>
    </svg>
  </div>
  <div>
    <span class="brand-tag">Gravity Global</span>
    <h1>PPTX Master Builder</h1>
  </div>
</div>
<p class="sub">Turn approved slides into slide layouts with editable text &amp; images + keep sample slides to duplicate.</p>

<div class="card" id="step1">
  <label class="drop" id="drop">
    <input type="file" id="file" accept=".pptx">
    <div id="dropText"><b>Drag &amp; drop a .pptx file</b> or click to browse</div>
  </label>
</div>

<div class="card hide" id="step2">
  <div class="row" style="margin-bottom:14px">
    <div><b id="fname"></b> <span class="badge" id="ginfo"></span></div>
    <button class="btn sec" id="reset">Choose another file</button>
  </div>
  <p class="mut" style="margin:0 0 14px">For each layout, set every element to <b>Fixed</b> (shown by default, edit in Slide Master) or <b>Editable</b> (placeholder, fill on the slide).</p>
  <div class="preset">
    <span class="preset-lb">Apply preset to all layouts:</span>
    <select id="preset">
      <option value="default" selected>Recommended (default)</option>
      <option value="fixicon">Fix icons · edit images + text</option>
      <option value="fiximg">Fix all images · edit text only</option>
      <option value="editimg">Edit images only · fix all text</option>
      <option value="editall">Edit everything</option>
      <option value="fixall">Fix everything</option>
    </select>
    <span class="preset-hint" id="presetHint">Content images + text editable, icons/background/decor fixed. Pick another preset to change all layouts at once.</span>
  </div>
  <div class="row" style="margin:4px 0 10px">
    <span class="mut" id="layCount"></span>
    <button class="btn sec" id="collapseAll" type="button">Collapse all</button>
  </div>
  <div id="rows"></div>

  <div class="row" style="margin-top:14px">
    <span class="mut" id="status"></span>
    <button class="btn" id="buildBtn">⚙️ Build master slides</button>
  </div>
  <div id="statusBar"></div>
</div>

<div class="card hide" id="step3">
  <div class="row"><span class="ok">✅ Done!</span>
  <a class="btn" id="dl" download>⬇️ Download .pptx</a></div>
  <p class="mut" style="margin:12px 0 0">File contains <b id="rl"></b> layouts (open <b>View → Slide Master</b>) + <b id="rs"></b> sample slides to duplicate &amp; edit.</p>
  <div class="hint">
    <b>How to use your file</b><br>
    <span class="lbl">New Slide</span> Home → New Slide → pick a layout. You get <b>editable placeholders</b> — click to type or insert a picture. Title prompts are single-color.<br>
    <span class="lbl">Duplicate</span> Right-click a sample slide → <b>Duplicate Slide</b>, then edit. Keeps <b>full formatting</b> (multi-color titles, every element) — best when you want the exact approved look.
  </div>
  <p class="warn hide" id="warn" style="margin:10px 0 0"></p>
  <div class="verify-box">
    <div class="row">
      <span class="mut">Auto-check: compare every sample slide against the original — confirm the output looks identical.</span>
      <button class="btn sec" id="verifyBtn">🔍 Verify output</button>
    </div>
    <div id="verifyStatus" class="mut" style="margin-top:8px"></div>
    <div id="verifyResult" class="hide" style="margin-top:10px"></div>
  </div>
</div>
<footer class="app-footer">
  <div class="footer-title">PPTX Master Builder <span class="footer-version">v1.0.0</span> <span class="footer-sep">–</span> <span class="footer-copyright">© 2026</span></div>
  <div class="footer-credit">by <span class="footer-author">Thien Ho</span> · Technical Solution</div>
</footer>
</div>
<div id="lb" class="lb hide">
  <button id="lbClose" class="lb-close" aria-label="Close" title="Close (Esc)">✕</button>
  <div id="lbLabel" class="lb-label hide"></div>
  <button id="lbPrev" class="lb-nav lb-prev hide" aria-label="Previous slide" title="Previous (←)">‹</button>
  <img id="lbimg" alt="preview">
  <button id="lbNext" class="lb-nav lb-next hide" aria-label="Next slide" title="Next (→)">›</button>
</div>
<script>
let token=null, groups=[];
const $=id=>document.getElementById(id);
const drop=$('drop'),file=$('file');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});
drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])upload(e.dataTransfer.files[0])});
file.addEventListener('change',e=>{if(e.target.files[0])upload(e.target.files[0])});

const DROP_DEFAULT='<b>Drag &amp; drop a .pptx file</b> or click to browse';
function dropError(msg){
  // nếu đang ở step2 (đã có file), lỗi hiện qua alert vì drop zone đang ẩn -> user không thấy
  if(!$('step2').classList.contains('hide')){alert('⚠️ '+msg);file.value='';return;}
  $('dropText').innerHTML='<span class="drop-err">⚠️ '+msg+'</span><br><span class="mut">'+DROP_DEFAULT+'</span>';
  file.value='';
}
async function upload(f){
  if(!f.name.toLowerCase().endsWith('.pptx')){dropError('Please choose a .pptx file (PowerPoint).');return}
  $('dropText').innerHTML='<span class="spin"></span> Analyzing...';
  // đang ở step2 (đổi file): hiện loading trên nút vì drop zone đang ẩn
  const rb=$('reset'),rbTxt=rb.textContent;
  if(!$('step2').classList.contains('hide')){rb.disabled=true;rb.innerHTML='<span class="spin"></span> Analyzing…';}
  const restoreBtn=()=>{rb.disabled=false;rb.textContent=rbTxt;};
  const fd=new FormData();fd.append('file',f);
  let r,d;
  try{ r=await fetch('/analyze',{method:'POST',body:fd}); d=await r.json(); }
  catch(e){ restoreBtn();dropError('Could not read the file. Try again.'); return; }
  if(d.error){restoreBtn();dropError(d.error);return}
  restoreBtn();
  token=d.token;groups=d.groups;
  $('fname').textContent=f.name;
  $('ginfo').textContent=groups.length+' layouts / '+groups.reduce((a,g)=>a+g.slides.length,0)+' slides';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // nhãn tag theo role: phân biệt Icon/Background/Image và Text/Decor cho user dễ nhìn
  //   ('chrome' là key nội bộ = text trang trí/lặp lại; hiển thị ra là "Decor")
  const ROLE_LABEL={'image:icon':'Icon','image:bg':'Background','image:content':'Image',
                    'text:content':'Text','text:chrome':'Decor'};
  $('rows').innerHTML=groups.map((g,i)=>`<div class="lay" data-i="${i}">
    <div class="lay-hd">
      <label style="flex:none"><input type="checkbox" class="chk" data-i="${i}" checked> Create</label>
      <div class="thumb ph" data-slide="${g.rep_slide}"><span class="spin"></span></div>
      <div class="lay-meta">
        <input type="text" class="lname" data-i="${i}" value="${esc(g.name)}">
        <div class="lay-slides mut">slides ${g.slides.join(', ')}</div>
      </div>
      <button class="caret" data-i="${i}" title="Collapse/expand" aria-label="Collapse/expand">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="els">${g.elements.map(e=>`
      <div class="el t-${e.type}" data-sig="${i}" data-eid="${e.id}" data-role="${e.type}:${e.role||'content'}">
        ${e.type==='image'
          ? `<img class="el-th" data-slide="${g.rep_slide}" data-idx="${e.id}" alt="">`
          : `<div class="el-th txt">T</div>`}
        <span class="el-tag r-${e.role||'content'} ${e.type}">${ROLE_LABEL[e.type+':'+(e.role||'content')]||(e.type==='image'?'Image':'Text')}</span>
        <span class="el-lb"><span class="nm">${esc(e.label)||'(image)'}</span><span class="sz">${esc(e.size||'')}${e.type==='image'&&e.pct!=null?' · '+e.pct+'% of slide':''}</span></span>
        <span class="el-seg">
          <label><input type="radio" name="ch_${i}_${e.id}" data-sig="${i}" data-eid="${e.id}" value="fixed" ${e.default==='fixed'?'checked':''}><span>Fixed</span></label>
          <label><input type="radio" name="ch_${i}_${e.id}" data-sig="${i}" data-eid="${e.id}" value="editable" ${e.default==='editable'?'checked':''}><span>Editable</span></label>
        </span>
        <button class="el-del" data-sig="${i}" data-eid="${e.id}" title="Delete this layer">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`).join('')}</div>
  </div>`).join('');
  document.querySelectorAll('.chk').forEach(c=>c.onchange=()=>c.closest('.lay').classList.toggle('off',!c.checked));
  document.querySelectorAll('.caret').forEach(c=>c.onclick=()=>{c.closest('.lay').classList.toggle('collapsed');io.takeRecords();scan();});
  // nút Collapse all: ẩn TOÀN BỘ danh sách layout -> chỉ còn 1 dòng "N layouts · M slides".
  const nSlides=groups.reduce((a,g)=>a+g.slides.length,0);
  $('layCount').textContent=groups.length+' layout'+(groups.length>1?'s':'')+' · '+nSlides+' slides';
  $('collapseAll').onclick=()=>{
    const hidden=$('rows').classList.toggle('hide');
    $('collapseAll').textContent=hidden?'Show layouts':'Collapse all';
    if(!hidden){io.takeRecords();scan();}   // mở lại -> nạp preview trong vùng nhìn
  };
  // nút xóa element: toggle class deleted (build sẽ bỏ qua)
  document.querySelectorAll('.el-del').forEach(b=>b.onclick=()=>b.closest('.el').classList.toggle('deleted'));

  // PRESET: map role -> fixed|editable. role = data-role ("image:icon","text:content"...).
  // Áp cho MỌI element mọi layout (kể cả bị xóa -> bỏ qua). 'default' = theo gợi ý ban đầu.
  const PRESETS={
    'default':{'image:icon':'fixed','image:content':'editable','image:bg':'fixed','text:content':'editable','text:chrome':'fixed'},
    'fixicon':{'image:icon':'fixed','image:content':'editable','image:bg':'fixed','text:content':'editable','text:chrome':'editable'},
    'fiximg' :{'image:icon':'fixed','image:content':'fixed','image:bg':'fixed','text:content':'editable','text:chrome':'editable'},
    'editimg':{'image:icon':'editable','image:content':'editable','image:bg':'editable','text:content':'fixed','text:chrome':'fixed'},
    'editall':{'image:icon':'editable','image:content':'editable','image:bg':'editable','text:content':'editable','text:chrome':'editable'},
    'fixall' :{'image:icon':'fixed','image:content':'fixed','image:bg':'fixed','text:content':'fixed','text:chrome':'fixed'},
  };
  const PRESET_IDLE='Content images + text editable, icons/background/decor fixed. Pick another preset to change all layouts at once.';
  const PRESET_HINT={default:PRESET_IDLE,
    fixicon:'Icons fixed; images + all text editable.',fiximg:'All images fixed; only text editable.',
    editimg:'Only images editable; all text fixed.',editall:'Everything editable.',fixall:'Everything fixed.'};
  $('preset').onchange=e=>{
    const map=PRESETS[e.target.value];
    if(!map){$('presetHint').textContent=PRESET_IDLE;return;}
    let n=0;
    document.querySelectorAll('.el').forEach(el=>{
      if(el.classList.contains('deleted'))return;
      const val=map[el.dataset.role]; if(!val)return;
      const radio=el.querySelector('.el-seg input[value="'+val+'"]');
      if(radio&&!radio.checked){radio.checked=true;n++;}
    });
    $('presetHint').textContent=(PRESET_HINT[e.target.value]||'')+(n?'  ('+n+' changed)':'  (no change)');
  };

  // LAZY LOAD: chỉ render preview/thumbnail khi element vào viewport (IntersectionObserver).
  // Mở deck lớn không còn chờ render hết mọi preview -> nhanh tức thì.
  function loadThumb(box){
    if(box.dataset.done)return; box.dataset.done='1';
    fetch('/preview?token='+token+'&slide='+box.dataset.slide).then(rp=>{
      if(!rp.ok){box.innerHTML='';return;}
      return rp.blob().then(b=>{const url=URL.createObjectURL(b);box.classList.remove('ph');box.innerHTML='';
        const img=document.createElement('img');img.className='thumbimg';img.src=url;box.appendChild(img);
        box.onclick=()=>{$('lbimg').className='';$('lbimg').src=url;$('lb').classList.remove('hide');};});   // slide: full size
    }).catch(()=>{box.innerHTML='';});
  }
  function loadImg(img){
    if(img.dataset.done)return; img.dataset.done='1';
    img.src='/imgthumb?token='+token+'&slide='+img.dataset.slide+'&idx='+img.dataset.idx;
    img.onclick=()=>{$('lbimg').className='sm';$('lbimg').src=img.src;$('lb').classList.remove('hide');};img.style.cursor='zoom-in';   // icon/ảnh element: cap 480px
  }
  const io=new IntersectionObserver(ents=>{
    for(const e of ents){ if(!e.isIntersecting)continue;
      const t=e.target;
      if(t.classList.contains('thumb'))loadThumb(t);
      else if(t.classList.contains('el-th'))loadImg(t);
      io.unobserve(t);
    }
  },{rootMargin:'200px'});   // nạp trước 200px để cuộn mượt
  function scan(){
    document.querySelectorAll('.thumb.ph').forEach(b=>{if(!b.dataset.obs){b.dataset.obs='1';io.observe(b);}});
    document.querySelectorAll('.el-th[data-idx]').forEach(i=>{if(!i.dataset.obs){i.dataset.obs='1';io.observe(i);}});
  }
  scan();
  $('preset').value='default';$('presetHint').textContent=PRESET_IDLE;   // reset preset cho file mới
  $('rows').classList.remove('hide');$('collapseAll').textContent='Collapse all';   // reset collapse cho file mới
  $('step1').classList.add('hide');$('step2').classList.remove('hide');$('step3').classList.add('hide');
}
const closeLb=()=>{$('lb').classList.add('hide');
  ['lbLabel','lbPrev','lbNext'].forEach(id=>$(id).classList.add('hide'));vfPos=-1;};
$('lb').onclick=e=>{ if(e.target.id==='lb'||e.target.id==='lbClose') closeLb(); };   // click nền hoặc nút ✕
document.addEventListener('keydown',e=>{
  if($('lb').classList.contains('hide'))return;
  if(e.key==='Escape')closeLb();
  else if(e.key==='ArrowLeft'&&vfPos>0)openDiff(vfPos-1);           // ← slide trước
  else if(e.key==='ArrowRight'&&vfPos>=0&&vfPos<vfDiffs.length-1)openDiff(vfPos+1);  // → slide sau
});
// "Choose another file": mở hộp thoại chọn file LUÔN (không quay về màn đầu).
// Chọn file mới -> change event -> upload() tự phân tích & thay thế. Hủy dialog -> giữ nguyên.
$('reset').onclick=()=>{file.value='';file.click()};
$('buildBtn').onclick=async()=>{
  const names={},disabled=[],choices={};
  document.querySelectorAll('.lname').forEach(inp=>{names[groups[inp.dataset.i].signature]=inp.value});
  document.querySelectorAll('.chk').forEach(c=>{if(!c.checked)disabled.push(groups[c.dataset.i].signature)});
  // gom choices: {signature: {eid: fixed|editable}}; element bị XÓA -> "deleted"
  document.querySelectorAll('.el-seg input:checked').forEach(r=>{
    const el=r.closest('.el'); if(el.classList.contains('deleted'))return;  // để deleted xử riêng
    const sig=groups[r.dataset.sig].signature;
    (choices[sig]=choices[sig]||{})[r.dataset.eid]=r.value;
  });
  document.querySelectorAll('.el.deleted').forEach(el=>{
    const sig=groups[el.dataset.sig].signature;
    (choices[sig]=choices[sig]||{})[el.dataset.eid]='deleted';
  });
  const options={ prune:false, disabled, choices };
  $('buildBtn').disabled=true;
  $('status').innerHTML='<span class="spin"></span> <span id="pmsg">Starting…</span>';
  $('statusBar').innerHTML='<span class="bar"><i id="barfill"></i></span>';   // bar riêng -> full width
  const esc2=s=>String(s).replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  // khởi build nền -> poll /progress hiện "layout X/Y" THẬT
  const preset=$('preset').value||'default';   // preset đang chọn -> chèn vào tên file
  try{ await fetch('/build',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,names,options,preset})}); }
  catch(e){ $('buildBtn').disabled=false;$('status').textContent='';alert('Build failed. Try again.');return; }
  const d=await new Promise((resolve)=>{
    const poll=async()=>{
      let p; try{ p=await (await fetch('/progress?token='+token)).json(); }catch(e){ setTimeout(poll,300); return; }
      const bf=$('barfill'),pm=$('pmsg');
      if(p.state==='running'){
        const tot=p.total||0, dn=p.done||0, pct=tot?Math.round(dn/tot*100):0;
        if(bf)bf.style.width=pct+'%';
        if(pm)pm.innerHTML=tot?`Building layout ${dn+1}/${tot}… <b>${esc2(p.name||'')}</b>`:'Building…';
        setTimeout(poll,250);
      }else if(p.state==='done'){ if(bf)bf.style.width='100%'; if(pm)pm.textContent='Done'; resolve(p); }
      else if(p.state==='error'){ resolve({error:p.error||'build failed'}); }
      else { setTimeout(poll,250); }   // unknown -> chờ thread khởi động
    };
    poll();
  });
  setTimeout(()=>{$('buildBtn').disabled=false;$('status').textContent='';$('statusBar').innerHTML='';},400);
  if(d.error){$('statusBar').innerHTML='';alert('Error: '+d.error);return}
  $('rl').textContent=d.layouts;$('rs').textContent=d.slides;
  $('dl').href='/download?token='+token; if(d.filename)$('dl').setAttribute('download',d.filename);
  // cảnh báo nếu tên layout trùng -> đã tự thêm số
  if(d.renamed&&d.renamed.length){
    $('warn').innerHTML='⚠️ '+d.renamed.length+' layout(s) had a duplicate name and were auto-numbered: '
      +d.renamed.map(r=>`<b>${r.to}</b>`).join(', ');
    $('warn').classList.remove('hide');
  } else $('warn').classList.add('hide');
  $('verifyResult').classList.add('hide');$('verifyStatus').textContent='';$('verifyBtn').disabled=false;   // reset verify cho build mới
  $('step3').classList.remove('hide');
};

// VERIFY: so sánh slide output vs gốc. Hiện badge từng slide DẦN (streaming) + ETA tổng ngay từ đầu.
const vfBadge=s=>{
  if(s.status==='render-failed')   // slide quá nặng để render so sánh -> vẫn click được để nav
    return `<span class="vf-slide fail vf-clk" data-diff="${s.index}" title="This slide is too complex to auto-render for comparison — the slide itself is fine. Please open it in PowerPoint and check manually.">Slide ${s.index} · too complex, please check manual</span>`;
  // mọi slide render được -> click xem ảnh so sánh [gốc | output | vùng đỏ]
  if(s.has_diff){
    const tip=s.status==='match'
      ? 'Click to see side-by-side (original | output | changes) — should look identical'
      : 'Click to see what differs (red = changed area)';
    return `<span class="vf-slide ${s.status} vf-clk" data-diff="${s.index}" title="${tip}">Slide ${s.index} · ${s.pct}% 🔍</span>`;
  }
  return `<span class="vf-slide ${s.status}">Slide ${s.index} · ${s.pct}%</span>`;};
$('verifyBtn').onclick=async()=>{
  $('verifyBtn').disabled=true;
  vfDiffs=[]; vfPos=-1;   // reset list slide cho lần verify mới
  $('verifyResult').classList.remove('hide');
  $('verifyResult').innerHTML='<div class="vf-grid" id="vfGrid"></div>';   // grid hiện dần
  $('verifyStatus').innerHTML='<span class="spin"></span> Starting…';
  const t0=Date.now();
  const fmt=ms=>{const s=Math.round(ms/1000);return (s>=60?Math.floor(s/60)+'m ':'')+(s%60)+'s';};
  try{ await fetch('/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}); }
  catch(e){ $('verifyBtn').disabled=false;$('verifyStatus').textContent='Verify failed to start.';return; }
  let shown=0;
  const d=await new Promise((resolve)=>{
    const poll=async()=>{
      let p; try{ p=await (await fetch('/verifyprogress?token='+token)).json(); }catch(e){ setTimeout(poll,400);return; }
      if(p.state==='running'){
        const done=p.done||0, tot=p.total||0, pct=tot?Math.round(done/tot*100):0;
        const el=Date.now()-t0;
        // ETA TỔNG ngay từ slide đầu tiên (el/done * tot) + thời gian còn lại
        const totalEst=done>0?fmt(el/done*tot):'…';
        const left=(done>0&&tot)?fmt(el/done*(tot-done)):'…';
        $('verifyStatus').innerHTML=
          `<span class="spin"></span> Comparing slide ${Math.min(done+1,tot||done+1)}/${tot||'?'} — ${pct}% `
          +`<span class="mut">· ${fmt(el)} of ~${totalEst} · ~${left} left</span>`
          +`<span class="bar"><i style="width:${pct}%"></i></span>`;
        // biết tổng slide sớm -> khởi tạo vfDiffs đủ total (slide chưa xong = ready:false = "waiting")
        if(tot&&vfDiffs.length!==tot)
          vfDiffs=Array.from({length:tot},(_,i)=>vfDiffs[i]||{index:i+1,ready:false});
        // render badge MỚI + đánh dấu slide đã xong (ready) để click xem ngay
        const rows=p.rows||[];
        for(;shown<rows.length;shown++){
          const r=rows[shown];
          $('vfGrid').insertAdjacentHTML('beforeend', vfBadge(r));
          vfDiffs[r.index-1]={index:r.index,pct:r.pct,status:r.status,ready:!!r.has_diff,failed:r.status==='render-failed'};
        }
        // lightbox đang mở -> tự cập nhật: slide vừa xong mà đang xem thì hiện ảnh, refresh label/nav
        if(!$('lb').classList.contains('hide')&&vfPos>=0)openDiff(vfPos);
        setTimeout(poll,400);
      }
      else if(p.state==='done'){ resolve(p); }
      else if(p.state==='error'){ resolve({error:p.error||'verify failed'}); }
      else setTimeout(poll,400);
    };
    poll();
  });
  const totalTime=fmt(Date.now()-t0);
  $('verifyBtn').disabled=false;
  if(d.error){ $('verifyStatus').textContent='⚠️ '+d.error; $('verifyResult').classList.add('hide'); return; }
  // tóm tắt + đảm bảo grid đầy đủ (đề phòng poll cuối bỏ sót badge)
  const diff=d.count_diff||0, min=d.min_pct;
  const closeN=(d.slides||[]).filter(s=>s.status==='close').length;   // 97-99.5% = khác nhẹ
  const skipped=(d.slides||[]).filter(s=>s.status==='render-failed').length;
  const skipNote=skipped?` <span class="mut">· ${skipped} slide(s) too complex to check — review manually</span>`:'';
  const closeNote=closeN?` <span style="color:#e0b84a">· ${closeN} slide(s) slightly different — click to check</span>`:'';
  const summary=(diff>0
    ? `<span style="color:#ffb8a0">⚠️ ${diff} slide(s) differ from the original</span> (lowest ${min}%)`
    : (closeN>0
        ? `<span class="ok">✓ No major differences</span> (lowest ${min}%)`
        : `<span class="ok">✅ All checked slides match the original</span> (lowest ${min}% similar)`))
    +closeNote+skipNote+` <span class="mut">· done in ${totalTime}</span>`;
  $('verifyStatus').innerHTML='';
  $('verifyResult').innerHTML=`<div class="vf-summary">${summary}</div><div class="vf-grid">${(d.slides||[]).map(vfBadge).join('')}</div>`;
  // list ĐỦ mọi slide (mọi slide click xem được — trạng thái ready/failed cập nhật ở đây)
  vfDiffs=(d.slides||[]).map(s=>({index:s.index,pct:s.pct,status:s.status,ready:!!s.has_diff,failed:s.status==='render-failed'}));
};
// LIGHTBOX DIFF: duyệt qua MỌI slide (1..total) bằng prev/next + phím ←→. Slide chưa render xong
// -> "waiting…", tự đổi thành ảnh khi xong (poll gọi lại openDiff). Slide lỗi -> "too complex".
let vfDiffs=[], vfPos=-1;
function openDiff(pos){
  if(pos<0||pos>=vfDiffs.length)return;
  vfPos=pos; const s=vfDiffs[pos]||{index:pos+1};
  const total=vfDiffs.length;
  $('lbLabel').classList.remove('hide');
  $('lbPrev').classList.remove('hide'); $('lbNext').classList.remove('hide');
  $('lbPrev').disabled=pos===0; $('lbNext').disabled=pos===total-1;
  $('lb').classList.remove('hide');
  if(s.ready){                     // đã render xong -> hiện ảnh so sánh
    $('lbimg').className=''; $('lbimg').style.display='';
    $('lbimg').src='/verifydiff?token='+token+'&slide='+s.index+'&t='+Date.now();
    $('lbLabel').textContent=`Slide ${s.index} · ${s.pct}% (${pos+1}/${total})`;
  }else{                           // chưa xong hoặc lỗi -> KHÔNG có ảnh
    $('lbimg').removeAttribute('src'); $('lbimg').style.display='none';
    $('lbLabel').textContent=s.failed
      ? `Slide ${s.index} · too complex to compare (${pos+1}/${total})`
      : `Slide ${s.index} · ⏳ waiting to render… (${pos+1}/${total})`;
  }
}
$('verifyResult').addEventListener('click',e=>{
  const b=e.target.closest('.vf-clk'); if(!b)return;
  const pos=vfDiffs.findIndex(s=>s.index==b.dataset.diff);
  if(pos>=0)openDiff(pos);
});
$('lbPrev').onclick=e=>{e.stopPropagation();openDiff(vfPos-1);};
$('lbNext').onclick=e=>{e.stopPropagation();openDiff(vfPos+1);};
</script></body></html>"""


from collections import OrderedDict

# LRU giới hạn: Presentation ~25MB/file -> chỉ giữ 2 file gần nhất (tránh phình RAM khi mở nhiều deck).
_PRS_CACHE = OrderedDict()   # src -> (mtime, Presentation)
_IMG_CACHE = OrderedDict()   # (src, slide, idx) -> (blob, ctype)
_PRS_MAX = 2
_IMG_MAX = 400


def _lru_put(cache, key, val, cap):
    cache[key] = val
    cache.move_to_end(key)
    while len(cache) > cap:
        cache.popitem(last=False)   # bỏ entry cũ nhất


def _get_prs(src):
    from pptx import Presentation
    mt = os.path.getmtime(src)
    c = _PRS_CACHE.get(src)
    if c and c[0] == mt:
        _PRS_CACHE.move_to_end(src)
        return c[1]
    prs = Presentation(src)
    _lru_put(_PRS_CACHE, src, (mt, prs), _PRS_MAX)
    return prs


def _extract_image(src, slide_idx, shape_idx):
    """Trả (blob, content_type) của ảnh top-level thứ shape_idx. Cache theo (src,slide,idx)
    + cache Presentation (tránh mở lại file lớn mỗi lần). Xử lý raster + SVG (blipFill r:embed)."""
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    from pptx.oxml.ns import qn
    ck = (src, slide_idx, shape_idx)
    if ck in _IMG_CACHE:
        _IMG_CACHE.move_to_end(ck)
        return _IMG_CACHE[ck]
    result = (None, None)
    try:
        prs = _get_prs(src)
        slide = list(prs.slides)[slide_idx - 1]
        shapes = list(slide.shapes)
        if shape_idx < len(shapes) and shapes[shape_idx].shape_type == MSO_SHAPE_TYPE.PICTURE:
            sh = shapes[shape_idx]
            got = None
            try:
                img = sh.image                      # raster thường
                got = (img.blob, img.content_type)
            except Exception:
                pass
            if got is None:
                # SVG/no-embedded: r:embed ở <a:blip> HOẶC <asvg:svgBlip> trong extLst
                bf = sh._element.find(".//" + qn("p:blipFill"))
                if bf is not None:
                    for el in bf.iter():
                        rid = el.get(qn("r:embed"))
                        if rid:
                            part = sh.part.related_part(rid)
                            got = (part.blob, part.content_type)
                            break
            if got:
                result = got
    except Exception:
        pass
    _lru_put(_IMG_CACHE, ck, result, _IMG_MAX)
    return result


def _validate_pptx(data, fname):
    """Kiểm tra data có phải .pptx hợp lệ. Trả None nếu OK, hoặc chuỗi lỗi rõ ràng.
    Bắt các case: file rỗng, không phải .pptx (đuôi), zip hỏng, đúng zip nhưng là .docx/.xlsx,
    file .pptx không có slide nào."""
    import io
    import zipfile
    if not data:
        return "The file is empty."
    if not (fname or "").lower().endswith(".pptx"):
        return "Please choose a .pptx file (PowerPoint)."
    if data[:2] != b"PK":
        return "This isn't a valid PowerPoint file (corrupt or not a .pptx)."
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        return "The file is corrupt and can't be opened."
    names = set(zf.namelist())
    if "ppt/presentation.xml" not in names:
        # đúng zip Office nhưng không phải PowerPoint
        if any(n.startswith("word/") for n in names):
            return "This is a Word document (.docx), not a PowerPoint file."
        if any(n.startswith("xl/") for n in names):
            return "This is an Excel workbook (.xlsx), not a PowerPoint file."
        return "This isn't a PowerPoint presentation (missing ppt/presentation.xml)."
    if not any(re.match(r"ppt/slides/slide\d+\.xml$", n) for n in names):
        return "This presentation has no slides."
    return None


def _run_build(token, req):
    """Chạy build (nền) + cập nhật _PROGRESS[token] theo từng layout. Kết quả/lỗi lưu lại
    để endpoint /progress trả về khi state='done'|'error'."""
    src = os.path.join(WORK, token + "_src.pptx")
    out = os.path.join(WORK, token + "_master.pptx")
    opts = req.get("options") or {}

    def on_progress(done, total, name):
        p = _PROGRESS.get(token)
        if p is not None:
            p.update(done=done, total=total, name=name)

    try:
        created, renamed = build(src, out, verbose=False,
                                 names=req.get("names") or {}, options=opts,
                                 on_progress=on_progress)
        orig = _META.get(token, {}).get("orig", "output")
        date = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d")
        slug = _PRESET_SLUG.get(req.get("preset") or "default", "recommended")
        outname = f"{orig}_master_{slug}_{date}.pptx"
        _META.setdefault(token, {})["outname"] = outname
        n_slides = len({idx for c in created for idx in c[1]})
        _PROGRESS[token] = {
            "state": "done", "done": len(created), "total": len(created), "name": "",
            "result": {"ok": True, "layouts": len(created), "slides": n_slides,
                       "filename": outname,
                       "renamed": [{"from": a, "to": b} for a, b in renamed]},
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        _PROGRESS[token] = {"state": "error", "error": str(e)}


def _run_verify(token):
    """So sánh trực quan slide gốc vs slide output (nền). Ghi tiến độ vào _VERIFY[token]."""
    src = os.path.join(WORK, token + "_src.pptx")
    out = os.path.join(WORK, token + "_master.pptx")

    def on_progress(done, total, row):
        v = _VERIFY.get(token)
        if v is not None:
            v["done"] = done
            v["total"] = total
            v.setdefault("rows", []).append(row)   # tích lũy để UI hiện DẦN từng slide

    try:
        if not os.path.isfile(out):
            _VERIFY[token] = {"state": "error", "error": "Build the file first."}
            return
        _VERIFY[token] = {"done": 0, "total": 0, "state": "running", "rows": []}
        # ảnh diff [gốc|output|đỏ] cho slide không khớp -> lưu {token}_diff{i}.png, serve qua /verifydiff
        res = verify_visual(src, out, on_progress=on_progress,
                            diff_dir=WORK, diff_prefix=token + "_diff")
        if not res.get("ok"):
            _VERIFY[token] = {"state": "error", "error": res.get("error", "verify failed")}
            return
        _VERIFY[token] = {"state": "done", "result": res}
    except Exception as e:
        import traceback
        traceback.print_exc()
        _VERIFY[token] = {"state": "error", "error": str(e)}


def _read_multipart(handler):
    """Parse 1 file upload từ multipart/form-data (stdlib, không cần cgi)."""
    ctype = handler.headers.get("Content-Type", "")
    boundary = ctype.split("boundary=")[-1].encode()
    length = int(handler.headers.get("Content-Length", 0))
    body = handler.rfile.read(length)
    parts = body.split(b"--" + boundary)
    for p in parts:
        if b"filename=" in p and b"\r\n\r\n" in p:
            header, data = p.split(b"\r\n\r\n", 1)
            data = data.rstrip(b"\r\n")
            m = re.search(rb'filename="([^"]*)"', header)
            fname = m.group(1).decode("utf-8", "ignore") if m else "input.pptx"
            return data, fname
    return None, None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path == "/" or self.path.startswith("/index"):
            b = PAGE.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
        elif self.path.startswith("/download"):
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            out = os.path.join(WORK, token + "_master.pptx")
            if not os.path.isfile(out):
                self._json({"error": "file not found"}, 404)
                return
            data = open(out, "rb").read()
            outname = _META.get(token, {}).get("outname", "master_output.pptx")
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
            self.send_header("Content-Disposition", f'attachment; filename="{outname}"')
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        elif self.path.startswith("/verifydiff"):
            # ảnh diff [gốc|output|đỏ] của 1 slide không khớp (đã lưu lúc verify)
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            slide = int(q.get("slide", ["1"])[0])
            dp = os.path.join(WORK, f"{token}_diff{slide}.png")
            if not os.path.isfile(dp):
                self._json({"error": "no diff"}, 404)
                return
            data = open(dp, "rb").read()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        elif self.path.startswith("/preview"):
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            slide = int(q.get("slide", ["1"])[0])
            src = os.path.join(WORK, token + "_src.pptx")
            png = render_slide(src, slide) if os.path.isfile(src) else None
            if not png:
                self._json({"error": "no preview"}, 404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(png)))
            self.end_headers()
            self.wfile.write(png)
        elif self.path.startswith("/imgthumb"):
            # thumbnail ảnh gốc: token + slide (1-based) + idx (top-level shape index)
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            slide = int(q.get("slide", ["1"])[0])
            idx = int(q.get("idx", ["0"])[0])
            src = os.path.join(WORK, token + "_src.pptx")
            blob, ctype = _extract_image(src, slide, idx) if os.path.isfile(src) else (None, None)
            if not blob:
                self._json({"error": "no image"}, 404)
                return
            self.send_response(200)
            self.send_header("Content-Type", ctype or "image/png")
            self.send_header("Content-Length", str(len(blob)))
            self.end_headers()
            self.wfile.write(blob)
        elif self.path.startswith("/verifyprogress"):
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            v = _VERIFY.get(token)
            if v is None:
                self._json({"state": "unknown"})
            elif v.get("state") == "done":
                self._json({"state": "done", **v["result"]})
            elif v.get("state") == "error":
                self._json({"state": "error", "error": v.get("error", "verify failed")})
            else:
                self._json({"state": "running", "done": v.get("done", 0),
                            "total": v.get("total", 0), "rows": v.get("rows", [])})
        elif self.path.startswith("/progress"):
            q = parse_qs(self.path.split("?", 1)[-1])
            token = q.get("token", [""])[0]
            p = _PROGRESS.get(token)
            if p is None:
                self._json({"state": "unknown"})
                return
            if p.get("state") == "done":
                self._json({"state": "done", **p["result"]})
            elif p.get("state") == "error":
                self._json({"state": "error", "error": p.get("error", "build failed")})
            else:
                self._json({"state": "running", "done": p.get("done", 0),
                            "total": p.get("total", 0), "name": p.get("name", "")})
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            if self.path == "/analyze":
                data, fname = _read_multipart(self)
                if not data:
                    self._json({"error": "no file"}, 400)
                    return
                # validate: file phải là .pptx thật (zip + presentation part + có slide)
                err = _validate_pptx(data, fname)
                if err:
                    self._json({"error": err}, 400)
                    return
                _cleanup_old(time.time())   # dọn file/token cũ mỗi lần có upload mới
                token = uuid.uuid4().hex[:12]
                src = os.path.join(WORK, token + "_src.pptx")
                with open(src, "wb") as f:
                    f.write(data)
                orig = re.sub(r"\.pptx$", "", os.path.basename(fname or "input"), flags=re.I)
                _META[token] = {"orig": orig}
                groups = plan(src)
                self._json({"token": token, "groups": groups})
            elif self.path == "/build":
                length = int(self.headers.get("Content-Length", 0))
                req = json.loads(self.rfile.read(length))
                token = req["token"]
                # build chạy nền trong thread -> ghi tiến độ vào _PROGRESS; client poll /progress
                _PROGRESS[token] = {"done": 0, "total": 0, "name": "", "state": "running"}
                threading.Thread(target=_run_build, args=(token, req), daemon=True).start()
                self._json({"started": True, "token": token})
            elif self.path == "/verify":
                length = int(self.headers.get("Content-Length", 0))
                req = json.loads(self.rfile.read(length))
                token = req["token"]
                # verify chạy nền -> ghi _VERIFY; client poll /verifyprogress
                _VERIFY[token] = {"done": 0, "total": 0, "state": "running"}
                threading.Thread(target=_run_verify, args=(token,), daemon=True).start()
                self._json({"started": True, "token": token})
            else:
                self._json({"error": "not found"}, 404)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._json({"error": str(e)}, 500)


if __name__ == "__main__":
    n = _cleanup_old(time.time())   # dọn rác tạm từ các lần chạy trước
    if n:
        print(f"Đã dọn {n} file tạm cũ.")
    rn = renderer_name()
    if rn:
        print(f"Preview renderer: {rn}")
    else:
        print("⚠ Không tìm thấy renderer preview (qlmanage/LibreOffice). Build vẫn chạy,"
              " nhưng preview slide sẽ trống. Cài LibreOffice để bật preview trên Windows/Linux.")
    url = f"http://localhost:{PORT}"
    print(f"PPTX Master Builder đang chạy tại: http://{HOST}:{PORT}")
    print("Nhấn Ctrl+C để dừng.")
    # chỉ tự mở trình duyệt khi chạy local (Mac/Win). Trong Docker (HOST=0.0.0.0) thì bỏ qua.
    if HOST in ("127.0.0.1", "localhost"):
        try:
            webbrowser.open(url)
        except Exception:
            pass
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
