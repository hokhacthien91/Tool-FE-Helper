"""aerender wrapper. aerender (AE 26.5) finishes the file but its process
never exits: watch the log for 'Total Time Elapsed' and kill it ourselves."""
import json
import os
import re
import shutil
import subprocess
import time

from . import system
from .system import kill_render_cores, kill_tree, popen_group_kwargs

PROG_RE = re.compile(r"PROGRESS:\s+\d+:\d+:\d+:\d+ \((\d+)\)")


def pick_template(templates, w, h):
    # Same split as the Middlesex hand-over: 40 Mbps above HD, 15 Mbps otherwise.
    big = w * h > 1920 * 1080 * 1.2
    want = "H.264 - Match Render Settings - 40 Mbps" if big else "H.264 - Match Render Settings - 15 Mbps"
    if not templates or want in templates:
        return want
    for t in templates:
        if t.startswith("H.264"):
            return t
    return want


def aerender(project, comp, template, out, logpath, on_progress=None, timeout=3600, should_stop=None):
    if os.path.exists(out):
        os.remove(out)  # never mistake a previous render for this one
    # Read at call time: system.follow_running_ae() may have switched version.
    cmd = [system.AERENDER, "-project", project, "-comp", comp, "-RStemplate", "Best Settings",
           "-OMtemplate", template, "-output", out]
    with open(logpath, "w") as lf:
        p = subprocess.Popen(cmd, stdout=lf, stderr=subprocess.STDOUT, **popen_group_kwargs())
    t0 = time.time()
    last = -1
    status = "failed"
    reason = ""
    while True:
        time.sleep(1.0)
        try:
            with open(logpath, errors="replace") as lf:
                txt = lf.read()
        except OSError:
            txt = ""
        m = PROG_RE.findall(txt)
        if m and on_progress:
            f = int(m[-1])
            if f != last:
                last = f
                on_progress(f)
        if "Total Time Elapsed" in txt:
            status = "done"
            time.sleep(2.0)
            break
        if "aerender ERROR" in txt:
            reason = [ln for ln in txt.splitlines() if "ERROR" in ln][-1][:300]
            break
        if p.poll() is not None:
            reason = "aerender exited (%s) before finishing" % p.returncode
            break
        if should_stop and should_stop():
            status, reason = "cancelled", "cancelled by the user"
            break
        if time.time() - t0 > timeout:
            reason = "timeout after %ds" % timeout
            break
    if p.poll() is None:
        kill_tree(p)
        time.sleep(1.0)
        kill_tree(p, hard=True)
    if status != "done":
        kill_render_cores(project)  # it outlives aerender and would keep writing the MP4
    if status == "cancelled" and os.path.exists(out):
        os.remove(out)  # a half-written MP4
    if status == "done" and not os.path.exists(out):
        status, reason = "failed", "log says finished but no output file"
    warnings = sorted(set(re.sub(r"Grouped_Message_\{.*?\}", "", ln).strip()
                          for ln in txt.splitlines() if "WARNING" in ln))[:10]
    return {"status": status, "reason": reason, "seconds": round(time.time() - t0, 1), "warnings": warnings}


def _probe_ffmpeg(path):
    """Fallback when ffprobe is not installed (most designer Macs): the ffmpeg
    binary shipped inside the imageio-ffmpeg wheel. Stream info comes from the
    header lines; the frame count from a stream-copy pass, which reads packets
    without decoding (one packet per frame for H.264 video)."""
    import imageio_ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    p = subprocess.run([exe, "-hide_banner", "-i", path, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"],
                       capture_output=True, text=True)
    err = p.stderr
    v = re.search(r"Stream #\S+.*?Video: (\w+).*?, (\d{2,5})x(\d{2,5})[^\n]*?, ([\d.]+) fps", err)
    d = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    fr = re.findall(r"frame=\s*(\d+)", err)
    if not v or not d:
        raise ValueError("ffmpeg could not read the file: " + err.strip().splitlines()[-1][:200] if err.strip() else "no output")
    return {"w": int(v.group(2)), "h": int(v.group(3)), "fps": float(v.group(4)),
            "frames": int(fr[-1]) if fr else 0, "codec": v.group(1),
            "duration": int(d.group(1)) * 3600 + int(d.group(2)) * 60 + float(d.group(3)),
            "bytes": os.path.getsize(path), "audio": bool(re.search(r"Stream #\S+.*?Audio:", err))}


def probe(path):
    if not shutil.which("ffprobe"):
        try:
            return _probe_ffmpeg(path)
        except (ImportError, OSError, ValueError) as e:
            return {"error": str(e)}
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height,r_frame_rate,nb_frames,codec_name,bit_rate:format=duration,size",
             "-of", "json", path])
        j = json.loads(out)
        st = j["streams"][0]
        num, den = st["r_frame_rate"].split("/")
        aud = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "a",
                                       "-show_entries", "stream=codec_name", "-of", "csv=p=0", path]).strip()
        return {"w": st["width"], "h": st["height"], "fps": float(num) / float(den),
                "frames": int(st.get("nb_frames", 0) or 0), "codec": st.get("codec_name"),
                "duration": float(j["format"]["duration"]), "bytes": int(j["format"]["size"]), "audio": bool(aud)}
    except (subprocess.CalledProcessError, KeyError, ValueError, IndexError) as e:
        return {"error": str(e)}


def verify(pr, w, h, dur, fps, master_audio=False):
    items = []
    if "error" in pr:
        return [{"level": "FAIL", "msg": "Cannot read the MP4: " + pr["error"]}]
    if (pr["w"], pr["h"]) != (w, h):
        items.append({"level": "FAIL", "msg": "Size %dx%d, expected %dx%d" % (pr["w"], pr["h"], w, h)})
    if abs(pr["fps"] - fps) > 0.01:
        items.append({"level": "FAIL", "msg": "fps %.3f, expected %.3f" % (pr["fps"], fps)})
    want = int(round(dur * fps))
    if pr["frames"] and abs(pr["frames"] - want) > 1:
        items.append({"level": "FAIL", "msg": "%d frames, expected %d" % (pr["frames"], want)})
    if master_audio and pr.get("audio") is False:
        items.append({"level": "WARN", "msg": "The master has sound but this MP4 has no audio track. "
                                              "Fix: check the output module template has audio on (fine if the brief asks for silent video)."})
    if not [i for i in items if i["level"] == "FAIL"]:
        items.append({"level": "PASS", "msg": "%dx%d · %.2fs · %.3f fps · %d frame · %.1f MB%s" % (
            pr["w"], pr["h"], pr["duration"], pr["fps"], pr["frames"], pr["bytes"] / 1e6,
            " · audio" if pr.get("audio") else " · no audio")})
    return items
