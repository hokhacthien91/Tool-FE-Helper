"""Everything that differs between macOS and Windows, in one place.

macOS drives the running After Effects through AppleScript (osascript
DoScriptFile). Windows passes the script to the running instance with
`AfterFX.exe -r <file.jsx>`. Both return before the script has finished, so
callers always wait for the result file the script writes (see ae.run).
"""
import glob
import os
import re
import signal
import subprocess
import sys

IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"


def _newest(paths):
    """Newest 'Adobe After Effects 20NN' folder; skips Beta installs."""
    def year(p):
        m = re.search(r"After Effects (20\d\d)$", p)
        return int(m.group(1)) if m else 0
    paths = [p for p in paths if year(p)]
    return max(paths, key=year) if paths else None


def find_ae():
    """Return (ae_dir, app, aerender, afterfx_exe). VR_AE_DIR overrides the
    search (the AE install folder, e.g. '/Applications/Adobe After Effects 2027'
    or 'C:/Program Files/Adobe/Adobe After Effects 2027')."""
    d = os.environ.get("VR_AE_DIR")
    if IS_WIN:
        if not d:
            roots = [os.environ.get("ProgramFiles", r"C:\Program Files"), os.environ.get("ProgramW6432", "")]
            d = _newest([p for r in roots if r for p in glob.glob(os.path.join(r, "Adobe", "Adobe After Effects 20*"))])
        if not d:
            return None, None, None, None
        sf = os.path.join(d, "Support Files")
        return d, os.path.join(sf, "AfterFX.exe"), os.path.join(sf, "aerender.exe"), os.path.join(sf, "AfterFX.exe")
    if not d:
        d = _newest(glob.glob("/Applications/Adobe After Effects 20*"))
    if not d:
        return None, None, None, None
    year = os.path.basename(d).split()[-1]
    return d, os.path.join(d, "Adobe After Effects %s.app" % year), os.path.join(d, "aerender"), None


def _running_ae_dir():
    """Install folder of the After Effects process that is running, if any."""
    try:
        if IS_WIN:
            p = subprocess.run(["powershell", "-NoProfile", "-Command",
                                "(Get-Process AfterFX -ErrorAction SilentlyContinue | Select-Object -First 1).Path"],
                               capture_output=True, text=True, timeout=15)
            exe = p.stdout.strip()
            return os.path.dirname(os.path.dirname(exe)) if exe.lower().endswith("afterfx.exe") else None
        p = subprocess.run(["ps", "-axo", "comm="], capture_output=True, text=True, timeout=10)
        for ln in p.stdout.splitlines():
            m = re.match(r"(.*/Adobe After Effects 20\d\d)/Adobe After Effects 20\d\d\.app/Contents/MacOS/After Effects$", ln.strip())
            if m:
                return m.group(1)
    except (OSError, subprocess.SubprocessError):
        pass
    return None


def _install_paths(d):
    if IS_WIN:
        sf = os.path.join(d, "Support Files")
        return d, os.path.join(sf, "AfterFX.exe"), os.path.join(sf, "aerender.exe"), os.path.join(sf, "AfterFX.exe")
    year = os.path.basename(d).split()[-1]
    return d, os.path.join(d, "Adobe After Effects %s.app" % year), os.path.join(d, "aerender"), None


AE_DIR, AE_APP, AERENDER, AFTERFX = find_ae()


def follow_running_ae():
    """Switch to the running AE when it is not the newest install, so scripts,
    aerender and the saved project all use one version. VR_AE_DIR wins."""
    global AE_DIR, AE_APP, AERENDER, AFTERFX
    if os.environ.get("VR_AE_DIR"):
        return AE_DIR
    d = _running_ae_dir()
    if d and not same_path(d, AE_DIR or ""):
        AE_DIR, AE_APP, AERENDER, AFTERFX = _install_paths(d)
    return AE_DIR


def ae_running():
    if IS_WIN:
        p = subprocess.run(["tasklist", "/FI", "IMAGENAME eq AfterFX.exe", "/NH"], capture_output=True, text=True)
        return "AfterFX.exe" in p.stdout
    p = subprocess.run(["pgrep", "-f", "Contents/MacOS/After Effects$"], capture_output=True, text=True)
    return p.returncode == 0


def send_jsx(script, timeout):
    """Hand a .jsx file to the running AE. Returns an error string or None.
    Success only means AE accepted the file; the caller waits for its output."""
    follow_running_ae()
    if IS_WIN:
        # -r runs the file in the already-open instance and returns at once.
        p = subprocess.run([AFTERFX, "-r", script], capture_output=True, text=True, timeout=60)
        return None if p.returncode == 0 else "AfterFX.exe -r failed (%s): %s" % (p.returncode, p.stderr.strip())
    cmd = ["osascript",
           "-e", "with timeout of %d seconds" % timeout,
           "-e", 'tell application "%s" to DoScriptFile "%s"' % (AE_APP, script),
           "-e", "end timeout"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 30)
    # -1712 = AppleEvent timed out: AE is still working, the result file decides.
    if p.returncode != 0 and "-1712" not in p.stderr:
        return "osascript failed: %s" % p.stderr.strip()
    return None


def jsx_path(p):
    """Path as written into a .jsx (#include, File()): forward slashes work on
    both systems and need no escaping."""
    return p.replace("\\", "/")


def same_path(a, b):
    if not a or not b:
        return False
    return os.path.normcase(os.path.normpath(a)) == os.path.normcase(os.path.normpath(b))


def open_path(p):
    """Show a folder or file in Finder / Explorer."""
    if IS_WIN:
        os.startfile(p)  # noqa: only exists on Windows
    else:
        subprocess.run(["open", p])


def open_ae():
    if IS_WIN:
        subprocess.Popen([AFTERFX])
    else:
        subprocess.run(["open", "-a", AE_APP])


def kill_port(port):
    """Kill whatever listens on 127.0.0.1:port. Fallback for a Video Resize
    server too old to have /api/shutdown. Listening sockets only: a plain
    `lsof -ti tcp:PORT` also matches the browser tabs connected to it."""
    pids = set()
    if IS_WIN:
        out = subprocess.run(["netstat", "-ano", "-p", "TCP"], capture_output=True, text=True).stdout
        for ln in out.splitlines():
            f = ln.split()
            if len(f) >= 5 and f[1].endswith(":%d" % port) and f[3].upper() == "LISTENING":
                pids.add(f[4])
        for pid in pids:
            subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True)
    else:
        out = subprocess.run(["lsof", "-ti", "tcp:%d" % port, "-sTCP:LISTEN"], capture_output=True, text=True).stdout
        for pid in out.split():
            try:
                os.kill(int(pid), signal.SIGTERM)
                pids.add(pid)
            except (OSError, ValueError):
                pass
    return sorted(pids)


def popen_group_kwargs():
    """Start a child in its own process group so it can be killed as a tree."""
    if IS_WIN:
        return {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    return {"start_new_session": True}


def kill_tree(p, hard=False):
    if p.poll() is not None:
        return
    try:
        if IS_WIN:
            subprocess.run(["taskkill", "/PID", str(p.pid), "/T"] + (["/F"] if hard else []),
                           capture_output=True)
        else:
            os.killpg(p.pid, signal.SIGKILL if hard else signal.SIGTERM)
    except OSError:
        pass


def ae_prefs_files():
    """AE preference text files, newest version first."""
    if IS_WIN:
        base = os.path.join(os.environ.get("APPDATA", ""), "Adobe", "After Effects")
    else:
        base = os.path.expanduser("~/Library/Preferences/Adobe/After Effects")
    vers = sorted(glob.glob(os.path.join(base, "[0-9]*")),
                  key=lambda p: [int(x) for x in re.findall(r"\d+", os.path.basename(p))], reverse=True)
    out = []
    for v in vers:
        out += glob.glob(os.path.join(v, "Adobe After Effects * Prefs.txt"))
    return out
