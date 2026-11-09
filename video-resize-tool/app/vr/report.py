"""Static HTML report (index.html + img/) and a .zip of it, inside the job."""
import html
import os
import shutil
import zipfile

from .pipeline import job_dir

CSS = """
:root{--bg:#f6f6f4;--card:#fff;--ink:#1c1c1c;--mut:#6b6b6b;--line:#e2e2de;--pass:#1f7a3d;--warn:#a26200;--fail:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#161616;--card:#202020;--ink:#ececec;--mut:#9a9a9a;--line:#333;--pass:#5bc27d;--warn:#e0a640;--fail:#ef6b62}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 10px}
.mut{color:var(--mut)}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin:12px 0}
.chip{display:inline-block;padding:1px 9px;border-radius:99px;font-weight:600;font-size:12px;border:1px solid currentColor}
.PASS{color:var(--pass)}.WARN{color:var(--warn)}.FAIL{color:var(--fail)}
.strip{display:flex;gap:6px;overflow-x:auto;padding:6px 0}.strip figure{margin:0;flex:none}.strip img{height:150px;display:block;border:1px solid var(--line);border-radius:4px}
.strip figcaption{font-size:11px;color:var(--mut);text-align:center}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}
ul{margin:6px 0;padding-left:18px}
video{display:block;max-width:100%;max-height:520px;margin:10px 0 4px;background:#000;border-radius:6px}
"""


def _e(s):
    return html.escape(str(s))


def build(job):
    root = job_dir(job["id"])
    out = os.path.join(root, "report")
    img = os.path.join(out, "img")
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(img)

    def cp(rel):
        if not rel:
            return ""
        src = os.path.join(root, rel)
        if not os.path.exists(src):
            return ""
        name = rel.replace("/", "_")
        shutil.copy2(src, os.path.join(img, name))
        return "img/" + name

    def video(rel):
        # The report folder (and its zip) must play on its own: hard-link the
        # MP4 in (no extra disk), fall back to a copy across volumes.
        src = os.path.join(root, rel)
        if not os.path.exists(src):
            return ""
        vdir = os.path.join(out, "video")
        os.makedirs(vdir, exist_ok=True)
        dst = os.path.join(vdir, os.path.basename(rel))
        try:
            os.link(src, dst)
        except OSError:
            shutil.copy2(src, dst)
        return "video/" + os.path.basename(rel)

    M = job["master_info"]
    parts = ["<!doctype html><html lang='en'><head><meta charset='utf-8'>",
             "<meta name='viewport' content='width=device-width,initial-scale=1'>",
             "<title>Video Resize Report</title><style>%s</style></head><body><main>" % CSS,
             "<h1>Video Resize — %s</h1>" % _e(job["name"]),
             "<div class='mut'>Job %s · created %s</div>" % (_e(job["id"]), _e(job["created"])),
             "<div class='card'><b>Master:</b> %s · %dx%d · %.2fs · %.3f fps<br>"
             "<b>Original:</b> %s<br><b>Delivered working file:</b> %s</div>" % (
                 _e(M["name"]), M["w"], M["h"], M["workDur"], M["fps"], _e(job["src_aep"]),
                 _e(os.path.basename(job["work_aep"])))]
    parts.append("<h2>Summary</h2><div class='card'><table><tr><th>Size</th><th>Check</th><th>Decision</th>"
                 "<th>MP4</th><th>Settings</th></tr>")
    for s in job["sizes"]:
        ch = (s.get("checks") or {}).get("status", "—")
        rd = s.get("render") or {}
        ver = rd.get("verify") or []
        vtxt = "; ".join(v["msg"] for v in ver) if ver else _e(rd.get("status", "not rendered"))
        p = s["params"]
        parts.append("<tr><td><b>%s</b> %s</td><td><span class='chip %s'>%s</span></td><td>%s</td><td>%s</td>"
                     "<td class='mut'>layout %s · background ×%.2f · subject ×%.2f · content ×%.2f · offset %g,%g px</td></tr>" % (
                         _e(s["key"]), _e(s.get("label", "")), _e(ch), _e(ch), _e(s.get("decision") or "—"),
                         _e(vtxt), _e("keep group" if p["layout"] == "center" else "stick to edges"),
                         p["bg_mult"], p.get("subject_mult", 1.0), p["content_mult"], p["ox"], p["oy"]))
    parts.append("</table></div>")

    parts.append("<h2>Master</h2><div class='card'><div class='strip'>")
    for f in job.get("master_previews", []):
        parts.append("<figure><img src='%s'><figcaption>%.2fs</figcaption></figure>" % (cp(f.get("thumb")), f["t"]))
    parts.append("</div></div>")

    for s in job["sizes"]:
        ch = s.get("checks") or {"status": "—", "items": []}
        parts.append("<h2>%s <span class='chip %s'>%s</span></h2><div class='card'>" % (
            _e(s["key"]), _e(ch["status"]), _e(ch["status"])))
        parts.append("<div class='strip'>")
        for f in s.get("previews", []):
            parts.append("<figure><img src='%s'><figcaption>%.2fs</figcaption></figure>" % (cp(f.get("thumb")), f["t"]))
        parts.append("</div>")
        if ch["items"]:
            parts.append("<ul>" + "".join("<li class='%s'>%s</li>" % (_e(i["level"]), _e(i["msg"]))
                                          for i in ch["items"]) + "</ul>")
        else:
            parts.append("<div class='PASS'>No stretching, no uncovered edges, no text/logo outside the frame at the sample times.</div>")
        rd = s.get("render") or {}
        if rd.get("file"):
            vid = video(rd["file"])
            if rd.get("stale"):
                parts.append("<div class='FAIL'>This MP4 was rendered before the last layout change. "
                             "Render this size again before delivering it.</div>")
            if vid:
                parts.append("<video controls preload='metadata' src='%s'></video>" % vid)
            parts.append("<div class='mut'>MP4: %s</div>" % _e(os.path.basename(rd["file"])))
        parts.append("</div>")

    parts.append("<h2>Approved layer roles</h2><div class='card'><table><tr><th>#</th><th>Layer</th>"
                 "<th>Type</th><th>Role</th><th>Why the tool chose it</th></tr>")
    for L in job["analysis"]["layers"]:
        role = job["roles"].get(str(L["index"]), L["role"])
        changed = " (changed by reviewer)" if role != L["role"] else ""
        parts.append("<tr><td>L%d</td><td>%s</td><td>%s</td><td><b>%s</b>%s</td><td class='mut'>%s</td></tr>" % (
            L["index"], _e(L["name"]), _e(L["kind"]), _e(role), changed, _e(L["why"])))
    parts.append("</table></div>")
    parts.append("<h2>Limits of these checks</h2><div class='card'><ul>"
                 "<li>Checked at the sample times only, not every frame. Watch the MP4 for motion in between.</li>"
                 "<li>The outside-the-frame check uses the layer bounding box and ignores rotation.</li>"
                 "<li>Missing plugins are not checked.</li></ul></div>")
    parts.append("</main></body></html>")
    with open(os.path.join(out, "index.html"), "w", encoding="utf-8") as f:
        f.write("\n".join(parts))
    zp = os.path.join(root, "report.zip")
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(out):
            for fn in files:
                full = os.path.join(base, fn)
                z.write(full, os.path.relpath(full, root))
    return {"html": "report/index.html", "zip": "report.zip"}
