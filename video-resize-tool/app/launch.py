"""Check this computer, then start Video Resize and open the browser.

Run by the launchers (app/run.sh, app/run.ps1) once the .venv exists; works on macOS
and Windows.
  --quick    skip the checks, just start (Quick Start files)
  --restart  stop the copy already running on the port, then start this one
Environment:
  VR_PORT     port (default 8767)
  VR_NO_OPEN  set to skip opening After Effects and the browser
"""
import json
import os
import re
import shutil
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))  # <tool>/app
sys.path.insert(0, ROOT)

from vr import system  # noqa: E402
from vr.ae import BASE, JOBS  # noqa: E402  (stdlib only: safe before the .venv check)

PORT = int(os.environ.get("VR_PORT", "8767"))
URL = "http://127.0.0.1:%d" % PORT
GREEN, RED, YELLOW, BOLD, END = ("", "", "", "", "") if system.IS_WIN and not os.environ.get("WT_SESSION") \
    else ("\033[32m", "\033[31m", "\033[33m", "\033[1m", "\033[0m")


def ok(m):
    print("  %s✓%s %s" % (GREEN, END, m))


def warn(m):
    print("  %s!%s %s" % (YELLOW, END, m))


def fail(m, hint=""):
    print("  %s✗%s %s" % (RED, END, m))
    if hint:
        print("    " + hint)
    sys.exit(1)


def step(m):
    print("\n%s%s%s" % (BOLD, m, END))


def scripting_pref():
    """'Allow Scripts to Write Files and Access Network' in the newest AE prefs.
    Returns (path, state) with state "on" / "off" / "unknown". Off on a fresh
    install, and then every tool call hangs until it times out."""
    for f in system.ae_prefs_files():
        try:
            txt = open(f, encoding="latin-1").read()
        except OSError:
            continue
        m = re.search(r'"Pref_SCRIPTING_FILE_NETWORK_SECURITY" = "?(\d+)"?', txt)
        if m:
            return f, ("on" if m.group(1).lstrip("0") == "1" else "off")
        return f, "unknown"
    return None, "unknown"


def enable_scripting_pref(path):
    """Flip the pref on in the text file. Only safe while AE is closed: AE
    rewrites its prefs on quit. Keeps a backup next to the file."""
    txt = open(path, encoding="latin-1").read()
    # Keep the file's own value style: "1" (quoted, AE 27 on macOS) or 01 (hex byte).
    new = re.sub(r'("Pref_SCRIPTING_FILE_NETWORK_SECURITY" = )("?)(\d+)("?)',
                 lambda m: m.group(1) + (('"1"') if m.group(2) else "01"), txt, count=1)
    if new == txt:
        return False
    shutil.copy2(path, path + ".before-video-resize")
    with open(path, "w", encoding="latin-1", newline="") as f:
        f.write(new)
    return True


def running_info():
    """The Video Resize already answering on PORT: its /api/jobs payload, or
    None. A server older than the 'root' field answers with root missing."""
    try:
        with urllib.request.urlopen(URL + "/api/jobs", timeout=2) as r:
            return json.load(r)
    except Exception:
        return None


def server_up():
    return running_info() is not None


def stop_running():
    """Stop the server on PORT (`--restart`). Asks it politely first; it refuses
    while a step is running. Falls back to killing the port for old servers."""
    req = urllib.request.Request(URL + "/api/shutdown", data=b"{}", method="POST",
                                 headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as e:
        if e.code == 409:
            fail(json.load(e).get("error", "A step is still running. Wait for it, then restart."))
        system.kill_port(PORT)  # 404: a server from before /api/shutdown existed
    except Exception:
        system.kill_port(PORT)
    for _ in range(40):
        if not server_up():
            return
        time.sleep(0.25)
    fail("Could not stop the tool running on port %d." % PORT)


def checks():
    step("1. Checking this computer")
    if not (system.IS_MAC or system.IS_WIN):
        fail("This tool runs on macOS or Windows only.")
    if not system.AE_DIR or not os.path.exists(system.AERENDER):
        where = r"C:\Program Files\Adobe" if system.IS_WIN else "/Applications"
        fail("After Effects is not installed in %s." % where, "Install it from Creative Cloud, then run this again.")
    ok("After Effects: " + os.path.basename(system.AE_DIR))
    free = shutil.disk_usage(BASE).free / 1e9
    (warn if free < 5 else ok)("Disk: %.0f GB free%s" % (free, " (renders may fail)" if free < 5 else ""))
    path, state = scripting_pref()
    if state == "on":
        ok("AE scripting can write files")
    elif state == "off" and not system.ae_running() and enable_scripting_pref(path):
        ok("Turned on AE 'Allow Scripts to Write Files and Access Network' (backup: %s)"
           % os.path.basename(path + ".before-video-resize"))
    else:
        warn("In After Effects open Settings > Scripting & Expressions and tick "
             "'Allow Scripts to Write Files and Access Network'. Without it the tool waits and times out.")
    step("2. Optional")
    if shutil.which("claude") or os.path.isfile(os.path.expanduser("~/.local/bin/claude")):
        ok("Claude Code found: AI suggest works")
    else:
        warn("Claude Code not found: the AI suggest button will not work (everything else does)")
    if not shutil.which("ffprobe"):
        ok("MP4 checks use the bundled ffmpeg")


def main():
    args = set(sys.argv[1:])
    quick, restart = "--quick" in args, "--restart" in args
    print("Video Resize — folder: " + BASE)
    system.follow_running_ae()  # an older AE that is already open wins over the newest install
    if not quick:
        checks()

    step("Starting")
    info = running_info()
    if info is not None:
        other = info.get("root")
        if restart:
            print("  Stopping the copy that is running%s…" % (" in " + other if other and not system.same_path(other, ROOT) else ""))
            stop_running()
            info = None
        elif other is None or not system.same_path(other, ROOT):
            fail("Port %d is used by another Video Resize%s." % (PORT, " in " + other if other else " (an older copy)"),
                 "Close that copy's terminal window, or run this one with --restart (or VR_PORT=8770 to run both).")
    own = info is None
    if not own:
        ok("Already running at %s (run with --restart to reload the code)" % URL)
    else:
        import server  # noqa: E402  (imports vr.pipeline, which needs the .venv libraries)
        # The UI polls every few seconds: keep request lines out of this window.
        server.H.log_message = lambda *args: None
        os.makedirs(JOBS, exist_ok=True)
        srv = threading.Thread(target=server.main, daemon=True)
        srv.start()
        for _ in range(40):
            if server_up():
                break
            time.sleep(0.25)
        if not server_up():
            fail("The tool did not start on port %d." % PORT, "Another program may use that port: set VR_PORT=8770 and run again.")
        ok("Running at " + URL)

    if not os.environ.get("VR_NO_OPEN"):
        if not system.ae_running():
            print("  Opening After Effects…")
            system.open_ae()
        webbrowser.open(URL)
    if not own:
        return
    print("""
Video Resize is open in your browser.
• First time on macOS: "Terminal wants access to control Adobe After Effects" → click OK.
• Keep this window open while you work. Close it (or press Ctrl+C) to stop the tool.""")
    try:
        # Wait on the server itself: when `--restart` shuts it down from
        # another window, this launcher must exit too (it used to sleep on
        # forever, leaving one stray process per restart).
        while srv.is_alive():
            srv.join(1)
        print("\nStopped: another copy of the tool took over.")
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
