"""Job state and the pipeline steps: intake -> roles -> build/preview/check ->
render -> report. Every step runs in a background thread; the UI polls the
job's JSON. The source .aep is only ever opened, never written: the job works
on a Save-As copy inside its own folder.
"""
import datetime
import json
import os
import re
import shutil
import subprocess
import threading
import time
import traceback

import numpy as np
from PIL import Image, ImageDraw

from . import ae
from . import render as rnd
from . import system

ROOT = ae.ROOT
JOBS = ae.JOBS
RESIZE_FOLDER = "VR-Resize"
PRESETS = [
    {"label": "9:16", "w": 1080, "h": 1920},
    {"label": "1:1", "w": 1080, "h": 1080},
    {"label": "4:5", "w": 1080, "h": 1350},
    {"label": "16:9", "w": 1920, "h": 1080},
]
THUMB_H = 360

_locks = {}
_save_lock = threading.Lock()


# ------------------------------------------------------------------ state

def job_dir(jid):
    return os.path.join(JOBS, jid)


def load(jid):
    with open(os.path.join(job_dir(jid), "job.json"), encoding="utf-8") as f:
        return json.load(f)


def save(job):
    with _save_lock:
        p = os.path.join(job_dir(job["id"]), "job.json")
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(job, f, ensure_ascii=False, indent=1)
        os.replace(tmp, p)


def list_jobs():
    out = []
    if not os.path.isdir(JOBS):
        return out
    for d in sorted(os.listdir(JOBS), reverse=True):
        p = os.path.join(JOBS, d, "job.json")
        if d.startswith("_") or not os.path.exists(p):
            continue
        try:
            j = load(d)
        except (OSError, ValueError):
            continue
        out.append({"id": j["id"], "name": j["name"], "stage": j["stage"], "created": j["created"],
                    "master": j.get("master"), "sizes": [s["key"] for s in j.get("sizes", [])]})
    return out


def delete_job(jid):
    """Move a job folder into jobs/_trash/ (list_jobs skips '_' folders), so a
    mis-click can be undone by moving it back. Deliverables already copied out
    of the job and the original .aep are not touched. If AE has this job's copy
    open, it is closed without saving first."""
    d = job_dir(jid)
    if not re.match(r"^[\w.-]+$", jid) or not os.path.isfile(os.path.join(d, "job.json")):
        raise ValueError("No such job: %s" % jid)
    lock = _locks.setdefault(jid, threading.Lock())
    if not lock.acquire(blocking=False):
        raise RuntimeError("This job is running a step; wait for it to finish before deleting.")
    try:
        job = load(jid)
        if ae.is_running():
            ae.run("close_if", {"path": job["work_aep"]})
        trash = os.path.join(JOBS, "_trash")
        os.makedirs(trash, exist_ok=True)
        dst = os.path.join(trash, jid)
        n = 1
        while os.path.exists(dst):
            n += 1
            dst = os.path.join(trash, "%s_%d" % (jid, n))
        shutil.move(d, dst)
        return {"ok": True, "trash": dst}
    finally:
        lock.release()


def recover_interrupted():
    """At server start no step can be running, so a job still marked busy was
    cut off (terminal closed, Mac asleep, crash). Clear it so its buttons work
    again and say what was interrupted. Returns the job ids touched."""
    out = []
    for j in list_jobs():
        try:
            job = load(j["id"])
        except (OSError, ValueError):
            continue
        hit = False
        if job.get("busy"):
            job["error"] = "Interrupted: the tool was closed during '%s'. Run that step again." % (
                job["busy"].get("msg") or "a step")
            job["busy"] = None
            hit = True
        for s in job.get("sizes", []):
            r = s.get("render") or {}
            if r.get("status") in ("queued", "rendering"):
                r.update(status="failed", reason="Interrupted before the render finished. Render again.")
                hit = True
        if (job.get("auto") or {}).get("status") == "running":
            job["auto"] = {"status": "stopped", "stage": job.get("stage"), "msg": "Interrupted: the tool was closed during Auto."}
            hit = True
        if hit:
            log(job, "Recovered after an interrupted run")
            save(job)
            out.append(job["id"])
    return out


def log(job, msg):
    job.setdefault("log", []).append("%s  %s" % (datetime.datetime.now().strftime("%H:%M:%S"), msg))
    job["log"] = job["log"][-200:]


def set_busy(job, msg, progress=None):
    job["busy"] = {"msg": msg, "progress": progress}
    save(job)


def run_bg(jid, fn, *args):
    """Run fn(job, *args) in a thread; one task per job at a time."""
    lock = _locks.setdefault(jid, threading.Lock())
    if not lock.acquire(blocking=False):
        raise RuntimeError("This job is already running a step; wait for it to finish.")
    job = load(jid)
    job["error"] = None
    set_busy(job, "Starting…")

    def target():
        j = load(jid)
        try:
            fn(j, *args)
        except Exception as e:  # surfaced in the UI, full trace in the job log
            j["error"] = str(e)
            log(j, "ERROR " + traceback.format_exc().strip().splitlines()[-1])
            log(j, traceback.format_exc())
        finally:
            j["busy"] = None
            save(j)
            lock.release()

    threading.Thread(target=target, daemon=True).start()


def size_key(w, h):
    return "%dx%d" % (w, h)


def safe_name(s):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-")[:60] or "job"


# ------------------------------------------------------------------ 1. intake

def create_job(src, force_close=False):
    src = os.path.abspath(os.path.expanduser(src.strip().strip('"')))
    if not src.lower().endswith(".aep") or not os.path.isfile(src):
        raise ValueError("No .aep file at: %s" % src)
    if not ae.is_running():
        raise RuntimeError("After Effects is not running. Open it and try again.")
    st = park_current()
    if st.get("dirty") and st.get("items", 0) > 0 and not force_close:
        return {"blocked": True, "file": st.get("file")}
    base = safe_name(os.path.splitext(os.path.basename(src))[0])
    jid = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + base
    d = job_dir(jid)
    for sub in ("previews", "thumbs", "mp4", "logs"):
        os.makedirs(os.path.join(d, sub), exist_ok=True)
    job = {
        "id": jid, "name": os.path.basename(src), "created": datetime.datetime.now().isoformat(timespec="seconds"),
        "src_aep": src, "work_aep": os.path.join(d, base + "-resize.aep"),
        "stage": "intake", "busy": None, "error": None, "log": [], "sizes": [], "presets": PRESETS,
    }
    save(job)
    run_bg(jid, _intake, force_close)
    return {"id": jid}


def _intake(job, force_close):
    set_busy(job, "Opening the original in AE and saving a copy into the job…")
    ae.run("save_as_copy", {"src": job["src_aep"], "dst": job["work_aep"], "force": force_close})
    log(job, "Saved a copy as: " + job["work_aep"])
    set_busy(job, "Reading the project: comps, fonts, footage…")
    info = ae.run("intake")
    comps = [c for c in info["comps"] if not c["folder"].startswith("/" + RESIZE_FOLDER)]
    comps.sort(key=comp_rank)
    info["comps"] = comps
    job["intake"] = info
    log(job, "Read %d comps, %d fonts, %d missing footage" % (
        len(comps), len(info["fonts"]), len(info["footageMissing"])))
    save(job)


HELPER_RE = re.compile(r"safe ?zone|guide|logo|slate|ref\b|placeholder|colou?r[- ]?bar", re.I)
DELIVERY_RE = re.compile(r"master|render|output|export|final|deliver", re.I)


def comp_rank(c):
    """Likely masters first: comps in a delivery folder (MASTER/Render/Output/
    Export/Final), not used inside another comp; helpers (safe zones, guides,
    logos, under 3 layers) and archives last. Seen on BCB: Safezone_* and
    BCB-logo were listed above the real /4. Render comps."""
    f, n = c["folder"], c["name"]
    archived = bool(re.search(r"archive|_old|\bold\b", f + " " + n, re.I))
    helper = bool(HELPER_RE.search(n)) or c["layers"] < 3
    # Building blocks live in sub/precomp/import/asset folders even when the
    # folder is called "Master-Comps" (Showa: /09-SUB-Comps/Master-Comps).
    building = bool(re.search(r"sub|pre-?comp|import|asset|storyboard|temp", f, re.I))
    return (archived, helper, building, not DELIVERY_RE.search(f), "master" not in f.lower(),
            c["usedIn"] > 0, f.lower(), n.lower())


def park_current():
    """Before AE switches project: if the open one is a job copy made by this
    tool and has unsaved builds, save it (switching jobs used to drop the
    built size comps of the previous job). Anything else is never saved."""
    st = ae.run("status")
    f = st.get("file") or ""
    jobs_root = os.path.normcase(os.path.realpath(JOBS)) + os.sep
    if st.get("dirty") and os.path.normcase(os.path.realpath(f or ".")).startswith(jobs_root):
        ae.run("save")
        st = ae.run("status")
    return st


def ensure_open(job):
    st = park_current()
    if not system.same_path(st.get("file"), job["work_aep"]):
        r = ae.run("open", {"path": job["work_aep"], "force": False})
        if r.get("blocked"):
            raise RuntimeError("AE has another unsaved project open (%s). Save or close it first." % r.get("file"))


# ------------------------------------------------------------------ 2. roles

def set_master(job, master, sizes, auto=False, master_id=None):
    run_bg(job["id"], _analyze, master, sizes, auto, master_id)


def mref(job):
    """How jsx finds the master: by item id when known, because comp names
    repeat (Middlesex: 15 duplicated names) and vrFindComp takes the first."""
    return "id:%d" % job["master_id"] if job.get("master_id") else job["master"]


def _analyze(job, master, sizes, auto=False, master_id=None):
    job["auto"] = {"status": "running", "msg": "Auto: analysing roles"} if auto else None
    ensure_open(job)
    set_busy(job, "Analysing layer roles of %s…" % master)
    job["master_id"] = int(master_id) if master_id else None
    a = ae.run("analyze", {"master": mref(dict(job, master=master))})
    M = a["master"]
    job["master"] = master
    job["master_info"] = M
    job["analysis"] = a
    job["roles"] = {str(L["index"]): L["role"] for L in a["layers"]}
    job["beats"] = beat_times(a)
    seen = {}
    out = []
    for s in sizes:
        k = size_key(s["w"], s["h"])
        if k in seen:
            continue
        seen[k] = True
        out.append({"key": k, "w": int(s["w"]), "h": int(s["h"]), "label": s.get("label") or "",
                    "comp": "%s_%s" % (master, k), "params": default_params(M, s["w"], s["h"]),
                    "decision": None, "build": None, "checks": None, "previews": [], "render": None})
        out[-1]["reference"] = find_reference(job, out[-1])
    job["sizes"] = out
    log(job, "Master %s %dx%d, %d layers, %d size(s)" % (master, M["w"], M["h"], len(a["layers"]), len(out)))
    save(job)
    _thumbs(job)
    _alpha_refine(job)
    job["stage"] = "roles"
    save(job)
    if auto:
        _auto_rest(job)


def _auto_stop(job, stage, reason):
    job["stage"] = stage
    job["auto"] = {"status": "stopped", "stage": stage, "msg": reason}
    log(job, "Auto stopped at %s: %s" % (stage, reason))
    save(job)


def _auto_rest(job):
    """Steps 2-4 without the three human gates: the guessed roles are used as
    they are, every size that does not FAIL is approved, all are rendered and
    the report is built. Stops at the first gate a person must decide on:
    visible missing footage (step 2) or any FAIL check (step 3)."""
    from . import report
    vis = job["analysis"].get("footageMissingVisible") or []
    if vis:
        return _auto_stop(job, "roles", "%d missing footage file(s) are visible in the master (%s). Relink, or "
                          "tick 'continue anyway' and confirm the roles by hand." % (
                              len(vis), ", ".join(x["name"] for x in vis[:5])))
    _build_all(job)
    fails = [s["key"] for s in job["sizes"] if (s.get("checks") or {}).get("status") == "FAIL"]
    if fails:
        return _auto_stop(job, "review", "Check FAIL on %s. Fix those sizes, then approve and render." % ", ".join(fails))
    for s in job["sizes"]:
        s["decision"] = "ok"
    save(job)
    _render(job, [s["key"] for s in job["sizes"]])
    bad = [s["key"] for s in job["sizes"] if (s.get("render") or {}).get("status") != "done"
           or any(v["level"] == "FAIL" for v in (s.get("render") or {}).get("verify", []))]
    set_busy(job, "Auto: building the report…")
    rep = report.build(job)
    warns = [s["key"] for s in job["sizes"] if (s.get("checks") or {}).get("status") == "WARN"]
    if bad:
        job["auto"] = {"status": "stopped", "stage": "render", "msg": "Render failed or MP4 check FAIL on %s." % ", ".join(bad),
                       "report": rep["html"]}
    else:
        job["auto"] = {"status": "done", "stage": "render", "report": rep["html"],
                       "msg": "All %d size(s) rendered.%s" % (len(job["sizes"]),
                              " WARN on %s: look at those MP4s before delivering." % ", ".join(warns) if warns else "")}
    log(job, "Auto finished: " + job["auto"]["msg"])
    save(job)


def default_params(M, w, h):
    flip = (w >= h) != (M["w"] >= M["h"])
    return {"ox": 0, "oy": 0, "content_mult": 1.0, "bg_mult": 1.0, "subject_mult": 1.0, "sx": 0, "sy": 0, "layers": {},
            "layout": "center" if flip else "axis"}


MAX_BEATS = 10
MIN_GAP = 0.3


def beat_times(a):
    """Sample times for previews and checks.

    1. Scene samples: midpoints between the in-points of visible top-level
       layers (scene cuts, text entrances) plus the settled end frame; at most 8.
    2. Motion samples: the middle of every keyframe span of a visible layer,
       added farthest-from-existing first until MAX_BEATS. BCB animates
       everything between 0 and 6.3 s with every layer starting at 0, so scene
       samples alone (7.5 s, 14.8 s) never saw anything move.
    """
    M = a["master"]
    t0 = M["workStart"]
    t1 = M["workStart"] + M["workDur"]
    fr = 1.0 / M["fps"]
    cuts = {round(t0, 3), round(t1, 3)}
    for L in a["layers"]:
        if L["parent"] or not L["enabled"] or L["role"] in ("IGNORE",):
            continue
        if L["role"] in ("BG", "SUBJECT") or L["kind"] == "text":
            if t0 < L["inPoint"] < t1:
                cuts.add(round(L["inPoint"], 3))
    cuts = sorted(cuts)
    scene = []
    for i in range(len(cuts) - 1):
        if cuts[i + 1] - cuts[i] < 0.25:
            continue
        scene.append(round(cuts[i] + (cuts[i + 1] - cuts[i]) * 0.5, 3))
    if not scene:
        scene = [round((t0 + t1) / 2, 3)]
    # Last sample a few frames before the end: the settled end frame.
    end = round(t1 - 6 * fr, 3)
    if end - scene[-1] > 0.4:
        scene.append(end)
    if len(scene) > 8:
        step = (len(scene) - 1) / 7.0
        scene = [scene[int(round(i * step))] for i in range(8)]

    motion = set()
    for L in a["layers"]:
        if not L["enabled"] or L["role"] == "IGNORE" or L["kind"] in ("audio", "camera", "light"):
            continue
        lo, hi = max(t0, L["inPoint"]), min(t1, L["outPoint"])
        for k0, k1 in L.get("keySpans") or []:
            k0, k1 = max(k0, lo), min(k1, hi)
            if k1 - k0 >= 0.1:
                motion.add(round((k0 + k1) / 2, 3))
    beats = list(scene)
    for _ in range(MAX_BEATS - len(beats)):
        best, gap = None, MIN_GAP
        for m in motion:
            d = min(abs(m - x) for x in beats)
            if d >= gap:
                best, gap = m, d
        if best is None:
            break
        beats.append(best)
    # Snap to frame boundaries so AE and ffmpeg agree on the frame.
    return sorted(round(round(m / fr) * fr, 4) for m in beats)


def grab(job, frames):
    """Queue saveFrameToPng grabs, wait for them, restore project state."""
    if not frames:
        return []
    r = ae.run("frames", {"frames": frames})
    try:
        missing = ae.wait_files([f["path"] for f in frames], timeout=60 + 3 * len(frames))
    finally:
        ae.run("restore", {"prev": r["prev"]})
    for e in r.get("errors", []):
        log(job, "frame error: " + e)
    return missing


def _thumbs(job):
    """Role table thumbnails: the master frame at each layer's sample time
    with the layer's box drawn on it."""
    a = job["analysis"]
    M = a["master"]
    fr = 1.0 / M["fps"]
    d = os.path.join(job_dir(job["id"]), "thumbs")
    times = {}
    own = {}
    for L in a["layers"]:
        if L["kind"] == "audio":
            continue
        if L.get("srcId"):
            # A precomp: show its own content, a composite frame may hide it.
            own[L["index"]] = {"compId": L["srcId"], "t": L["srcTime"],
                               "path": os.path.join(d, "src_L%03d.png" % L["index"])}
        t = round(round(L["sampleTime"] / fr) * fr, 4)
        times[t] = os.path.join(d, "m_%07.3f.png" % t)
    frames = [{"comp": mref(job), "t": t, "path": p} for t, p in sorted(times.items())]
    frames += list(own.values())
    set_busy(job, "Grabbing %d frames for the role table…" % len(frames))
    grab(job, frames)
    tw = 200
    for L in a["layers"]:
        if L["kind"] == "audio":
            continue
        t = round(round(L["sampleTime"] / fr) * fr, 4)
        src = times[t]
        if not os.path.exists(src):
            continue
        im = Image.open(src).convert("RGB")
        sc = tw / float(M["w"])
        im = im.resize((tw, int(round(M["h"] * sc))))
        r = L.get("rect")
        if r:
            dr = ImageDraw.Draw(im)
            dr.rectangle([r["x0"] * sc, r["y0"] * sc, r["x1"] * sc, r["y1"] * sc], outline=(255, 60, 60), width=2)
        name = "L%03d.jpg" % L["index"]
        im.save(os.path.join(d, name), quality=82)
        L["thumb"] = "thumbs/" + name
        o = own.get(L["index"])
        if o and os.path.exists(o["path"]):
            # Precomp content on a checkerboard so transparent areas read as such.
            src_im = Image.open(o["path"]).convert("RGBA")
            src_im.thumbnail((tw, tw))
            bg = Image.new("RGBA", src_im.size, (90, 90, 90, 255))
            dr = ImageDraw.Draw(bg)
            for yy in range(0, src_im.size[1], 10):
                for xx in range(0, src_im.size[0], 10):
                    if (xx // 10 + yy // 10) % 2:
                        dr.rectangle([xx, yy, xx + 9, yy + 9], fill=(130, 130, 130, 255))
            bg.alpha_composite(src_im)
            sname = "S%03d.jpg" % L["index"]
            bg.convert("RGB").save(os.path.join(d, sname), quality=82)
            L["thumb_src"] = "thumbs/" + sname
    save(job)


def confirm_roles(job, roles, ack_missing=False):
    job = load(job["id"])
    vis = job["analysis"].get("footageMissingVisible") or []
    if vis and not ack_missing:
        raise ValueError("%d missing footage file(s) are visible in the master (%s). Relink them, or tick "
                         "'continue anyway' to build with colour bars." % (len(vis), ", ".join(x["name"] for x in vis[:5])))
    job["roles"] = {str(k): v for k, v in roles.items()}
    job["auto"] = None  # a person took over from here
    save(job)
    run_bg(job["id"], _build_all)


def _build_all(job):
    _master_previews(job)
    for i, s in enumerate(job["sizes"]):
        set_busy(job, "Building %s (%d/%d)…" % (s["key"], i + 1, len(job["sizes"])), i / float(len(job["sizes"])))
        _build_one(job, s)
    job["stage"] = "review"
    log(job, "Built %d size(s)" % len(job["sizes"]))
    save(job)


# ------------------------------------------------------------------ 3-4. build, preview, check

def size_by_key(job, key):
    for s in job["sizes"]:
        if s["key"] == key:
            return s
    raise KeyError(key)


def _ks(job, s):
    M = job["master_info"]
    p = s["params"]
    kw, kh = s["w"] / float(M["w"]), s["h"] / float(M["h"])
    # want: the planned name; name: what the last build actually used (renamed when it clashed).
    return {"name": s["comp"], "want": s.get("comp_base") or s["comp"], "w": s["w"], "h": s["h"], "ox": float(p["ox"]), "oy": float(p["oy"]),
            # Bleed ~2 px per side: a background scaled to fit the frame exactly
            # leaves a 1 px anti-aliased seam (BCB 1080 -> 1920: top row alpha 199).
            "bg_k": max(kw, kh) * float(p["bg_mult"]) * (1 + 4.0 / min(s["w"], s["h"])), "content_k": min(kw, kh) * float(p["content_mult"]),
            # SUBJECT: geometric mean of the two factors. BCB 1:1 -> 9:16 gives
            # x1.333, the designer's own value (21.7% -> 28.9%).
            "subject_k": (kw * kh) ** 0.5 * float(p.get("subject_mult", 1.0)),
            "sx": float(p.get("sx", 0)), "sy": float(p.get("sy", 0)),
            "layers": {str(k): {"k": float(v.get("k", 1) or 1), "dx": float(v.get("dx", 0) or 0),
                                "dy": float(v.get("dy", 0) or 0)}
                       for k, v in (p.get("layers") or {}).items()},
            "layout": p["layout"]}


def mark_stale(job):
    """Flag MP4s rendered before the size's latest build/preview. BCB: the
    9:16 MP4 still showed the cropped head after SUBJECT fixed the layout."""
    for s in job.get("sizes", []):
        rd = s.get("render") or {}
        f = rd.get("file")
        if not f:
            continue
        p = os.path.join(job_dir(job["id"]), f)
        # build_stamp, not preview_stamp: re-grabbing beats does not change the layout.
        rd["stale"] = bool(os.path.exists(p) and s.get("build_stamp", 0) > os.path.getmtime(p))
    return job


def _build_one(job, s, rebuild=True):
    ensure_open(job)
    if rebuild:
        r = ae.run("build", {"master": mref(job), "folder": RESIZE_FOLDER, "roles": job["roles"],
                             "sizes": [_ks(job, s)], "save": False})
        s["build"] = r["sizes"][0]
        s.setdefault("comp_base", s["comp"])
        s["comp"] = s["build"]["name"]  # build may rename to stay unique (aerender -comp goes by name)
        s["build_stamp"] = time.time()
        log(job, "Built %s: mapped %d layers, background x%.3f, content x%.3f (%s)" % (
            s["key"], s["build"]["mapped"], s["build"]["bg_k"], s["build"]["content_k"], s["params"]["layout"]))
    _previews(job, s)
    _check(job, s)
    try:
        _compare(job, s)
    except ae.AEError as e:  # a broken reference comp must not block the build
        s["compare"] = {"reference": s.get("reference"), "error": str(e)}
    save(job)


def _master_previews(job):
    M = job["master_info"]
    d = os.path.join(job_dir(job["id"]), "previews")
    frames = [{"comp": mref(job), "t": t, "path": os.path.join(d, "master_%07.3f.png" % t)} for t in job["beats"]]
    set_busy(job, "Grabbing the master at %d sample times…" % len(frames))
    grab(job, frames)
    job["master_previews"] = [_jpg(job, f["path"], f["t"]) for f in frames]
    save(job)


def _jpg(job, png, t):
    rel = os.path.relpath(png, job_dir(job["id"]))
    out = {"t": t, "png": rel}
    if os.path.exists(png):
        im = Image.open(png).convert("RGB")
        big = png[:-4] + ".jpg"
        im.save(big, quality=86)
        th = png[:-4] + "_th.jpg"
        im2 = im.copy()
        im2.thumbnail((THUMB_H * 4, THUMB_H))
        im2.save(th, quality=80)
        out.update({"jpg": os.path.relpath(big, job_dir(job["id"])), "thumb": os.path.relpath(th, job_dir(job["id"]))})
    return out


def _previews(job, s):
    d = os.path.join(job_dir(job["id"]), "previews")
    frames = [{"comp": s["comp"], "t": t, "path": os.path.join(d, "%s_%07.3f.png" % (s["key"], t))}
              for t in job["beats"]]
    grab(job, frames)
    s["previews"] = [_jpg(job, f["path"], f["t"]) for f in frames]
    s["preview_stamp"] = time.time()


def _border_open(png):
    """Per side: (fraction of the outer strip that is see-through, depth in px
    of fully-or-partly see-through rows/columns from that edge). Nothing drawn
    there means the comp background shows: an uncovered edge. A 1 px depth is
    the anti-aliased edge of a layer scaled to fit the frame exactly."""
    im = Image.open(png)
    if im.mode != "RGBA":
        return {}
    a = np.asarray(im.getchannel("A"), dtype=np.float32)
    h, w = a.shape
    k = max(2, int(min(w, h) * 0.004))
    lines = {"left": a[:, :k].T, "right": a[:, ::-1][:, :k].T,
             "top": a[:k, :], "bottom": a[::-1, :][:k, :]}
    out = {}
    for side, strip in lines.items():
        frac = float((strip < 200).mean())
        depth = 0
        for row in (a[:, :64].T if side == "left" else a[:, ::-1][:, :64].T if side == "right"
                    else a[:64, :] if side == "top" else a[::-1, :][:64, :]):
            if (row < 250).mean() > 0.01:
                depth += 1
            else:
                break
        out[side] = (frac, depth)
    return out


def _check(job, s):
    items = []
    b = s.get("build") or {}
    for L in b.get("stretched", []):
        items.append({"level": "FAIL", "code": "stretch", "msg": "%s is stretched. Fix: equal X/Y scale in the master, or IGNORE it in step 2." % L})
    for w in b.get("warnings", []):
        items.append({"level": "WARN", "code": "expr", "msg": w})
    root = job_dir(job["id"])
    mprev = {p["t"]: p for p in job.get("master_previews", [])}
    for p in s["previews"]:
        png = os.path.join(root, p["png"])
        if not os.path.exists(png):
            items.append({"level": "WARN", "code": "frame", "msg": "Could not grab the frame @%.2fs" % p["t"]})
            continue
        sides = _border_open(png)
        mp = mprev.get(p["t"])
        msides = _border_open(os.path.join(root, mp["png"])) if mp and os.path.exists(os.path.join(root, mp["png"])) else {}
        master_open = max([v[0] for v in msides.values()] or [0]) > 0.01
        bad = [(k, v[1]) for k, v in sides.items() if v[1] > 0 and v[0] > 0.01 and not master_open]
        if bad:
            items.append({"level": "FAIL", "code": "edge", "t": p["t"],
                          "msg": "Edge uncovered @%.2fs: %s. Fix: Background × 1.05, or check the role in step 2." % (
                              p["t"], ", ".join("%s %s px" % (k, "64+" if d >= 64 else d) for k, d in bad))})
    lay = {L["index"]: L for L in job["analysis"]["layers"]}
    # A BG precomp with text inside is scaled x max: on an aspect change its
    # text gets cropped and no bounds check can see it (the precomp's own box
    # still covers the frame). Measured on Middlesex: the NEXUS intro lost
    # its N and S at 9:16, 1:1 and 4:5.
    if b and b.get("bg_k", 0) > b.get("content_k", 0) * 1.01:
        for k, v in job["roles"].items():
            L = lay.get(int(k))
            if v == "BG" and L and not L["parent"] and L.get("hasText"):
                items.append({"level": "WARN", "code": "bgtext",
                              "t": _first_beat_in(job, L),
                              "msg": "L%d %s: background with text inside, scaled %d%% (%.1f–%.1fs). Text cut? Set it to CONTENT in step 2."
                                     % (L["index"], L["name"], round(b["bg_k"] * 100), L["inPoint"], L["outPoint"])})
    # A whole scene used as BACKGROUND (a precomp of several layers, or a video)
    # is cover-cropped: on a strong aspect change most of it is cut and no other
    # check sees it. Airbus MTM 16:9 -> 9:16: four scene precomps of 10-20
    # layers kept 32% of their width and the result still said PASS.
    if b and b.get("content_k") and b.get("bg_k", 0) / b["content_k"] >= 1.5:
        M = job["master_info"]
        keep_w = min(1.0, s["w"] / (M["w"] * b["bg_k"]))
        keep_h = min(1.0, s["h"] / (M["h"] * b["bg_k"]))
        scenes = []
        for k, v in job["roles"].items():
            L = lay.get(int(k))
            if v != "BG" or not L or L["parent"] or not L["enabled"]:
                continue
            if (L["kind"] == "comp" and (L.get("srcLayers") or 0) >= 3) or L.get("srcVideo"):
                scenes.append("L%d %s" % (L["index"], L["name"]))
        if scenes:
            items.append({"level": "WARN", "code": "crop",
                          "msg": "Background scene shows %d%% of its width, %d%% of its height. Check: %s%s" % (
                                     round(keep_w * 100), round(keep_h * 100), ", ".join(scenes[:4]),
                                     " (+%d more)" % (len(scenes) - 4) if len(scenes) > 4 else "")})
    # Content that stays inside the master frame must stay inside the new one.
    content = [int(k) for k, v in job["roles"].items() if v == "CONTENT"]
    idx = set(content)
    changed = True
    while changed:
        changed = False
        for L in job["analysis"]["layers"]:
            if L["parent"] in idx and L["index"] not in idx:
                idx.add(L["index"])
                changed = True
    idx = [i for i in sorted(idx) if lay[i]["kind"] not in ("null", "audio")]
    if idx:
        M = job["master_info"]
        r = ae.run("bounds", {"comps": [mref(job), s["comp"]], "times": job["beats"], "layers": idx})
        mrects = {(x["t"], x["layer"]): x for x in r[mref(job)]["rects"]}
        tol = 2.0
        seen = set()
        for x in r[s["comp"]]["rects"]:
            m = mrects.get((x["t"], x["layer"]))
            if not m:
                continue
            m_in = m["x0"] >= -tol and m["y0"] >= -tol and m["x1"] <= M["w"] + tol and m["y1"] <= M["h"] + tol
            s_in = x["x0"] >= -tol and x["y0"] >= -tol and x["x1"] <= s["w"] + tol and x["y1"] <= s["h"] + tol
            if m_in and not s_in and x["layer"] not in seen:
                seen.add(x["layer"])
                items.append({"level": "WARN", "code": "overflow", "t": x["t"],
                              "msg": "L%d %s out of frame @%.2fs. Fix: lower Text/logo ×, or move it." % (x["layer"], x["name"], x["t"])})
    status = "PASS"
    if any(i["level"] == "WARN" for i in items):
        status = "WARN"
    if any(i["level"] == "FAIL" for i in items):
        status = "FAIL"
    s["checks"] = {"status": status, "items": items}


def _first_beat_in(job, L):
    for t in job["beats"]:
        if L["inPoint"] <= t < L["outPoint"]:
            return t
    return None


def update_size(job, key, params, action):
    job = load(job["id"])
    s = size_by_key(job, key)
    if params:
        for k in ("ox", "oy", "content_mult", "bg_mult", "subject_mult", "sx", "sy"):
            if k in params and params[k] not in (None, ""):
                s["params"][k] = float(params[k])
        if isinstance(params.get("layers"), dict):
            lay = {}
            for idx, v in params["layers"].items():
                v = {kk: float(v.get(kk)) for kk in ("k", "dx", "dy") if v.get(kk) not in (None, "")}
                if v.get("k", 1) != 1 or v.get("dx", 0) or v.get("dy", 0):
                    lay[str(idx)] = v
            s["params"]["layers"] = lay
        if params.get("layout") in ("axis", "center"):
            s["params"]["layout"] = params["layout"]
    if action == "ok":
        s["decision"] = "ok"
        save(job)
        return
    if action == "manual":
        s["decision"] = "manual"
        save(job)
        run_bg(job["id"], _open_manual, key)
        return
    s["decision"] = None
    save(job)
    run_bg(job["id"], _rebuild, key, action == "rebuild")


def _open_manual(job, key):
    ensure_open(job)
    s = size_by_key(job, key)
    ae.run("open_comp", {"comp": s["comp"]})
    system.open_ae()
    log(job, "Opened %s in AE for manual edits. Click 'Re-read from AE' when done." % s["comp"])


def _rebuild(job, key, rebuild):
    s = size_by_key(job, key)
    set_busy(job, ("Rebuilding %s…" if rebuild else "Re-reading %s from AE…") % key)
    _build_one(job, s, rebuild=rebuild)
    if not rebuild:
        s["build_stamp"] = time.time()  # edited by hand in AE: the layout changed
        s["decision"] = "manual"
        log(job, "Re-read %s (edited by hand in AE)" % key)
        save(job)


# ------------------------------------------------------------------ 5. render

def start_render(job):
    job = load(job["id"])
    keys = [s["key"] for s in job["sizes"] if s["decision"] in ("ok", "manual")]
    if not keys:
        raise ValueError("No size approved yet (OK or manual edit).")
    run_bg(job["id"], _render, keys)


def _render(job, keys):
    ensure_open(job)
    set_busy(job, "Saving the copy before rendering…")
    ae.run("save")
    job["stage"] = "render"
    tpl = job.get("intake", {}).get("omTemplates", [])
    for s in job["sizes"]:
        if s["key"] in keys:
            s["render"] = {"status": "queued", "progress": 0}
    save(job)
    M = job["master_info"]
    for i, key in enumerate(keys):
        s = size_by_key(job, key)
        out = os.path.join(job_dir(job["id"]), "mp4", "%s_%s.mp4" % (safe_name(job["master"]), key))
        template = rnd.pick_template(tpl, s["w"], s["h"])
        s["render"] = {"status": "rendering", "progress": 0, "template": template}
        set_busy(job, "Rendering %s (%d/%d)…" % (key, i + 1, len(keys)), i / float(len(keys)))
        total = int(round(M["workDur"] * M["fps"]))

        def prog(frame, s=s, i=i):
            s["render"]["progress"] = min(1.0, frame / float(max(total, 1)))
            job["busy"]["progress"] = (i + s["render"]["progress"]) / float(len(keys))
            save(job)

        logp = os.path.join(job_dir(job["id"]), "logs", "render_%s.log" % key)
        res = rnd.aerender(job["work_aep"], s["comp"], template, out, logp, prog)
        s["render"].update(res)
        if res["status"] == "done":
            s["render"]["probe"] = rnd.probe(out)
            s["render"]["file"] = os.path.relpath(out, job_dir(job["id"]))
            audible = any(L.get("audible") for L in job["analysis"]["layers"])
            s["render"]["verify"] = rnd.verify(s["render"]["probe"], s["w"], s["h"], M["workDur"], M["fps"], audible)
        log(job, "Render %s: %s" % (key, res["status"]))
        save(job)
    job["stage"] = "done"
    save(job)


def open_folder(job, sub=""):
    system.open_path(os.path.join(job_dir(job["id"]), sub))


def refresh_beats(job):
    run_bg(job["id"], _refresh_beats)


def _refresh_beats(job):
    """Recompute the sample times of an existing job (new beat rules) and
    re-grab/re-check every size without rebuilding: roles, decisions and
    renders stay as they are."""
    ensure_open(job)
    set_busy(job, "Reading keyframes of %s…" % job["master"])
    a = ae.run("analyze", {"master": mref(job)})
    spans = {L["index"]: L.get("keySpans") or [] for L in a["layers"]}
    for L in job["analysis"]["layers"]:
        L["keySpans"] = spans.get(L["index"], [])
    job["beats"] = beat_times(job["analysis"])
    log(job, "Beats: %s" % ", ".join("%.2f" % t for t in job["beats"]))
    _master_previews(job)
    for i, s in enumerate(job["sizes"]):
        set_busy(job, "Re-grabbing %s (%d/%d)…" % (s["key"], i + 1, len(job["sizes"])), i / float(len(job["sizes"])))
        _previews(job, s)
        _check(job, s)
        _compare(job, s)
        save(job)


# ------------------------------------------------------------------ compare with the designer

SIZE_TOKEN = re.compile(r"\d{2,5}\s*[xX×]\s*\d{2,5}")


def find_reference(job, s):
    """The designer's own comp at this size, if the project has one: same
    width/height, name equal to the master's once size tokens are removed
    (BCB: ..._1_1080x1080 -> ..._1_1080x1920)."""
    import difflib
    base = SIZE_TOKEN.sub("", job["master"]).lower()
    best, score = None, 0.0
    for c in (job.get("intake") or {}).get("comps", []):
        if (c["w"], c["h"]) != (s["w"], s["h"]) or c["name"] == job["master"]:
            continue
        if c["folder"].startswith("/" + RESIZE_FOLDER) or c["name"] == s["comp"]:
            continue
        r = difflib.SequenceMatcher(None, base, SIZE_TOKEN.sub("", c["name"]).lower()).ratio()
        if r > score:
            best, score = c["name"], r
    return best if score >= 0.75 else None


def reference_options(job, s):
    return [c["name"] for c in (job.get("intake") or {}).get("comps", [])
            if (c["w"], c["h"]) == (s["w"], s["h"]) and c["name"] != job["master"]
            and not c["folder"].startswith("/" + RESIZE_FOLDER)]


def _match(rows_a, rows_b):
    """Pair layers of two comps by name (and order among equal names)."""
    def keyed(rows):
        seen, out = {}, {}
        for r in sorted(rows, key=lambda r: r["i"]):
            n = seen.get(r["name"], 0)
            seen[r["name"]] = n + 1
            out[(r["name"], n)] = r
        return out
    a, b = keyed(rows_a), keyed(rows_b)
    return [(k, a[k], b[k]) for k in a if k in b]


def _compare(job, s):
    """Measure the built size against the designer's comp: per matched layer,
    centre offset and size ratio over the beats, plus per-beat pixel diff."""
    if "reference" not in s:
        s["reference"] = find_reference(job, s)
    ref = s.get("reference")
    if not ref:
        s["compare"] = None
        return
    d = os.path.join(job_dir(job["id"]), "previews")
    frames = [{"comp": ref, "t": t, "path": os.path.join(d, "ref_%s_%07.3f.png" % (s["key"], t))} for t in job["beats"]]
    grab(job, frames)
    s["ref_previews"] = [_jpg(job, f["path"], f["t"]) for f in frames]
    r = ae.run("rects_all", {"comps": [s["comp"], ref], "times": job["beats"]})
    mine, theirs = r.get(s["comp"]), r.get(ref)
    if not mine or not theirs:
        s["compare"] = {"reference": ref, "error": "could not read one of the comps"}
        return
    W, H = s["w"], s["h"]
    diag = (W * W + H * H) ** 0.5
    per = {}
    names_ref = set()
    for t in job["beats"]:
        ra = [x for x in mine["rects"] if x["t"] == t]
        rb = [x for x in theirs["rects"] if x["t"] == t]
        names_ref.update((x["name"]) for x in rb)
        for key, a, b in _match(ra, rb):
            area_b = (b["x1"] - b["x0"]) * (b["y1"] - b["y0"])
            if area_b >= 0.9 * W * H:
                continue  # full-frame backgrounds match trivially
            ca = ((a["x0"] + a["x1"]) / 2, (a["y0"] + a["y1"]) / 2)
            cb = ((b["x0"] + b["x1"]) / 2, (b["y0"] + b["y1"]) / 2)
            area_a = max(1e-6, (a["x1"] - a["x0"]) * (a["y1"] - a["y0"]))
            p = per.setdefault(key, {"name": key[0], "dx": [], "dy": [], "ratio": []})
            p["dx"].append(ca[0] - cb[0])
            p["dy"].append(ca[1] - cb[1])
            p["ratio"].append((area_a / max(1e-6, area_b)) ** 0.5)
    rows = []
    for p in per.values():
        n = len(p["dx"])
        dx, dy = sum(p["dx"]) / n, sum(p["dy"]) / n
        rows.append({"name": p["name"], "dx": round(dx, 1), "dy": round(dy, 1),
                     "dist": round((dx * dx + dy * dy) ** 0.5, 1),
                     "scale": round(sum(p["ratio"]) / n, 3)})
    rows.sort(key=lambda x: -x["dist"])
    pix = []
    root = job_dir(job["id"])
    for a, b in zip(s.get("previews", []), s.get("ref_previews", [])):
        pa, pb = os.path.join(root, a["png"]), os.path.join(root, b["png"])
        if os.path.exists(pa) and os.path.exists(pb):
            ia = np.asarray(Image.open(pa).convert("RGB"), dtype=np.int16)
            ib = np.asarray(Image.open(pb).convert("RGB"), dtype=np.int16)
            if ia.shape == ib.shape:
                pix.append(round(float(np.abs(ia - ib).mean()), 1))
    dists = sorted(x["dist"] for x in rows)
    med = dists[len(dists) // 2] if dists else None
    s["compare"] = {
        "reference": ref, "layers": rows, "matched": len(rows),
        "ref_layers": len(names_ref),
        "median_px": med, "median_pct": round(100 * med / diag, 1) if med is not None else None,
        "pixel_diff": pix, "pixel_mean": round(sum(pix) / len(pix), 1) if pix else None,
    }


def set_reference(job, key, ref):
    job = load(job["id"])
    s = size_by_key(job, key)
    s["reference"] = ref or None
    save(job)

    def _run(j, key):
        s2 = size_by_key(j, key)
        set_busy(j, "Comparing %s with %s…" % (key, s2.get("reference") or "nothing"))
        _compare(j, s2)
        save(j)
    run_bg(job["id"], _run, key)


# ------------------------------------------------------------------ deliver

def deliver(job, folder):
    folder = os.path.abspath(os.path.expanduser((folder or "").strip().strip('"')))
    if not folder or folder == "/":
        raise ValueError("Enter an output folder.")
    if not os.path.isdir(os.path.dirname(folder)):
        raise ValueError("Parent folder does not exist: %s" % os.path.dirname(folder))
    run_bg(job["id"], _deliver, folder)


def _deliver(job, folder):
    """Copy the deliverables out of the job: approved MP4s, the working .aep
    (saved first) and the report zip. Never overwrites: existing names get a
    numeric suffix. The .aep is a plain copy: the job copy was saved by AE on
    this machine, so its footage paths are absolute and still resolve."""
    from . import report
    ensure_open(job)
    set_busy(job, "Saving the working file…")
    ae.run("save")
    dst = os.path.join(folder, safe_name(job["master"]) + "_resize")
    os.makedirs(dst, exist_ok=True)

    def put(src):
        base, ext = os.path.splitext(os.path.basename(src))
        out, n = os.path.join(dst, base + ext), 1
        while os.path.exists(out):
            n += 1
            out = os.path.join(dst, "%s_%d%s" % (base, n, ext))
        shutil.copy2(src, out)
        return out

    files = []
    set_busy(job, "Copying MP4s…")
    for s in job["sizes"]:
        rd = s.get("render") or {}
        if rd.get("status") == "done" and rd.get("file"):
            files.append(put(os.path.join(job_dir(job["id"]), rd["file"])))
    set_busy(job, "Copying the working file and report…")
    files.append(put(job["work_aep"]))
    mark_stale(job)
    rep = report.build(job)
    files.append(put(os.path.join(job_dir(job["id"]), rep["zip"])))
    job["delivered"] = {"dir": dst, "files": files, "at": datetime.datetime.now().isoformat(timespec="seconds")}
    job["deliver_dir"] = folder
    log(job, "Delivered %d file(s) to %s" % (len(files), dst))
    save(job)
    system.open_path(dst)


# ------------------------------------------------------------------ AI suggestion

AI_PROMPT = """You are helping a motion designer adapt an After Effects video to a new aspect ratio.
A script has already resized the master comp ({mw}x{mh}) to {w}x{h} with fixed rules:
- BACKGROUND layers scale x max(Kw,Kh) and fill the frame.
- SUBJECT layers (cut-out people/products) scale x sqrt(Kw*Kh) and keep the frame edge they touch.
- CONTENT layers (text, logos) scale x min(Kw,Kh) around the frame centre ("keep group") or per axis ("stick to edges").

Look at these images with the Read tool:
- master at its settled frame: {master_img}
- the current resize at the same time: {size_img}
{extra_imgs}
Current settings of the resize: {params}
Layers (index, name, role, box in the master at that time as x0,y0,x1,y1 px):
{layers}

Suggest new settings that make the resize look like a designer laid it out for {w}x{h}:
use the extra space, keep faces and text fully inside the frame with a safe margin of about 5%,
keep the text/logo block readable and in the same reading order, do not crop the subject's head.
Allowed keys (all optional):
  ox, oy           px offset of the whole CONTENT group (positive = right / down)
  content_mult     extra scale for all CONTENT (1 = unchanged)
  subject_mult     extra scale for SUBJECT layers
  sx, sy           px offset of SUBJECT layers
  bg_mult          extra scale for BACKGROUND (>= 1 only)
  layout           "center" or "axis"
  layers           per-layer overrides {{"<index>": {{"k": scale, "dx": px, "dy": px}}}}
Answer with ONE JSON object only, no prose outside it, with an extra key "why" (one or two sentences)."""


def suggest(job, key):
    run_bg(job["id"], _suggest, key)


def _claude_bin():
    for c in (shutil.which("claude"), os.path.expanduser("~/.local/bin/claude"), "/opt/homebrew/bin/claude"):
        if c and os.path.isfile(c):
            return c
    raise RuntimeError("AI suggest needs Claude Code on this Mac (https://claude.ai/download). "
                       "Everything else works without it.")


def _suggest(job, key):
    s = size_by_key(job, key)
    root = job_dir(job["id"])
    if not s.get("previews"):
        raise RuntimeError("Build this size first.")
    # The settled frame: the last beat before the end frame, else the last one.
    beats = job["beats"]
    ti = len(beats) - 2 if len(beats) > 1 else 0
    mp = (job.get("master_previews") or [])[ti]
    sp = s["previews"][ti]
    extra = ""
    if len(s["previews"]) > 2:
        mid = s["previews"][len(s["previews"]) // 2]
        if mid.get("jpg"):
            extra = "- the resize mid-animation at %.2fs: %s" % (mid["t"], os.path.join(root, mid["jpg"]))
    t = mp["t"]
    r = ae.run("rects_all", {"comps": [mref(job)], "times": [t]})
    rects = {x["i"]: x for x in r.get(mref(job), {}).get("rects", [])}
    lines = []
    for L in job["analysis"]["layers"]:
        role = job["roles"].get(str(L["index"]), L["role"])
        if L["parent"] or role in ("IGNORE", "FOLLOW"):
            continue
        b = rects.get(L["index"])
        box = "%d,%d,%d,%d" % (b["x0"], b["y0"], b["x1"], b["y1"]) if b else "not visible"
        lines.append("  %d  %s  %s  %s" % (L["index"], L["name"], role, box))
    M = job["master_info"]
    prompt = AI_PROMPT.format(mw=M["w"], mh=M["h"], w=s["w"], h=s["h"],
                              master_img=os.path.join(root, mp["jpg"]), size_img=os.path.join(root, sp["jpg"]),
                              extra_imgs=extra, params=json.dumps(s["params"]), layers="\n".join(lines))
    set_busy(job, "Asking the AI for %s (about 30–90 s)…" % key)
    # --tools limits what exists: with only --allowedTools the model still ran
    # Bash (it drew a grid into /tmp). Read is all it needs to look at frames.
    cmd = [_claude_bin(), "-p", prompt, "--output-format", "json", "--tools", "Read", "--allowedTools", "Read",
           "--add-dir", root, "--model", "sonnet"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=300, cwd=root, stdin=subprocess.DEVNULL)
    if p.returncode != 0:
        raise RuntimeError("AI call failed: %s" % (p.stderr.strip() or p.stdout.strip())[:300])
    try:
        text = json.loads(p.stdout).get("result", "")
    except ValueError:
        text = p.stdout
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise RuntimeError("AI answer had no JSON: %s" % text[:300])
    try:
        sug = json.loads(m.group(0))
    except ValueError:
        raise RuntimeError("AI answer was not valid JSON: %s" % m.group(0)[:300])
    clean = {}
    for k in ("ox", "oy", "content_mult", "subject_mult", "sx", "sy", "bg_mult"):
        if isinstance(sug.get(k), (int, float)):
            clean[k] = float(sug[k])
    if clean.get("bg_mult", 1) < 1:
        clean["bg_mult"] = 1.0  # never let a suggestion uncover the frame
    if sug.get("layout") in ("center", "axis"):
        clean["layout"] = sug["layout"]
    if isinstance(sug.get("layers"), dict):
        clean["layers"] = {str(k): {kk: float(v[kk]) for kk in ("k", "dx", "dy") if isinstance(v.get(kk), (int, float))}
                           for k, v in sug["layers"].items() if isinstance(v, dict)}
    s["suggestion"] = {"params": clean, "why": str(sug.get("why", ""))[:500],
                       "at": datetime.datetime.now().isoformat(timespec="seconds")}
    log(job, "AI suggestion for %s: %s" % (key, json.dumps(clean)))
    save(job)



ALPHA_EXT = (".png", ".tif", ".tiff", ".webp", ".tga", ".psd")


def _drawn_fraction(path):
    """(share of pixels that carry anything (alpha > 8), share of those that
    are solid (alpha > 200)). None if unreadable."""
    try:
        im = Image.open(path)
        im.draft("RGBA", (800, 800))
        if im.mode not in ("RGBA", "LA", "PA"):
            if "transparency" not in im.info:
                return 1.0, 1.0
        im = im.convert("RGBA")
        im.thumbnail((800, 800))
        a = np.asarray(im.getchannel("A"))
        d = a > 8
        return float(d.mean()), float(((a > 200) & d).sum()) / max(1, int(d.sum()))
    except Exception:
        return None


def _alpha_refine(job):
    """A layer whose box covers the frame is not a background when most of it
    is transparent: designers export logos and copy as full-canvas PNGs
    (Airbus Verticon: 900x1260_logo.png, *_txt-1.png), and precomps often hold
    only a logo. Scaling those x max crops them. Measure what is actually
    drawn: the precomp's own frame grabbed for the thumbnail, or the still's
    file; under 60% drawn -> CONTENT (flagged). A soft glow over the whole
    frame (BCB) stays a background."""
    d = os.path.join(job_dir(job["id"]), "thumbs")
    changed = 0
    for L in job["analysis"]["layers"]:
        if L["parent"] or job["roles"].get(str(L["index"])) != "BG" or L["kind"] not in ("comp", "still", "footage"):
            continue
        src = None
        if L["kind"] == "comp":
            src = os.path.join(d, "src_L%03d.png" % L["index"])
        elif L.get("srcFile") and L["srcFile"].lower().endswith(ALPHA_EXT):
            src = L["srcFile"]
        if not src or not os.path.exists(src):
            continue
        if L.get("blendNormal") is False:
            continue  # Screen/Add/... overlays are light effects over the frame
        if "track matte" in L.get("why", ""):
            continue  # a matte must keep the role of the layer it cuts out
        r = _drawn_fraction(src)
        if r is None:
            continue
        f, solid = r
        L["drawn"], L["solid"] = round(f, 3), round(solid, 3)
        if f < 0.005:
            continue  # nothing drawn at the sampled time (Middlesex X-sparkle): no evidence either way
        # Logos, copy and cut-outs are hard-edged (BCB logo 93%, person 97% solid);
        # a soft glow is not (BCB glow: 25% drawn, 69% solid) and stays BACKGROUND.
        # Thin type is mostly anti-aliased, so text precomps fail the solid test
        # (Airbus CW45 titles: 2.5% / 1.1% drawn, 60% / 31% solid): text inside,
        # or barely anything drawn, is enough.
        if f < 0.6 and (solid >= 0.85 or L.get("hasText") or f < 0.1):
            L["role"] = "CONTENT"
            L["conf"] = "low"
            L["why"] += ", but only %d%% of it is drawn: a logo/text/cut-out on a full-size canvas, not a background" % round(f * 100)
            job["roles"][str(L["index"])] = "CONTENT"
            changed += 1
    if changed:
        log(job, "Alpha check moved %d full-canvas layer(s) from BACKGROUND to CONTENT" % changed)
    save(job)
