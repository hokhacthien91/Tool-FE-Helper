"""Run a jsx task inside the After Effects GUI and read its JSON result.

Handing the script to AE (osascript DoScriptFile on macOS, AfterFX.exe -r on
Windows, see system.py) returns before the script has finished, so every task
writes its result to a file via tmp+rename and this module waits for that
file. One AE call at a time (global lock).
"""
import json
import os
import threading
import time
import uuid

# Layout: <tool>/app/vr/ae.py. Code lives in app/; the user's jobs sit next to
# the launchers in <tool>/jobs so they are easy to find (VR_JOBS overrides).
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # <tool>/app
BASE = os.path.dirname(ROOT)                                         # <tool>
JOBS = os.environ.get("VR_JOBS") or os.path.join(BASE, "jobs")
JSX = os.path.join(ROOT, "jsx")
RUN_DIR = os.path.join(JOBS, "_ae")
from .system import ae_running, jsx_path, send_jsx  # noqa: E402

_lock = threading.Lock()


class AEError(Exception):
    pass


def _js_literal(obj):
    # JSON is a valid JS literal; ensure_ascii keeps the .jsx file pure ASCII.
    return json.dumps(obj, ensure_ascii=True)


def _jsx_lib(name):
    with open(os.path.join(JSX, name), encoding="ascii") as f:
        return f.read()


# Tasks that take a second at most. A lost call (12/11: two tools drove the same
# AE at once and one answer never came) then fails in 30-60 s, not 10 minutes.
QUICK = {"status": 30, "save": 120, "open_comp": 60, "remove_comp": 60, "rename_comp": 60,
         "dup_comp": 60, "replace_comp": 60, "close_if": 60}


class AECancelled(Exception):
    """Cancel was pressed while waiting for AE (pipeline treats it as Cancel)."""


# Per worker thread: a function that says whether Cancel was pressed.
_tls = threading.local()


def set_cancel_check(fn):
    _tls.cancelled = fn


def run(task, params=None, timeout=None):
    """Run vrTask_<task>(params) in AE and return its result dict."""
    if timeout is None:
        timeout = QUICK.get(task, 600)
    os.makedirs(RUN_DIR, exist_ok=True)
    rid = uuid.uuid4().hex[:10]
    out = os.path.join(RUN_DIR, "%s_%s.json" % (task, rid))
    script = os.path.join(RUN_DIR, "%s_%s.jsx" % (task, rid))
    # The helpers are pasted in, not #include'd: an #include line carries the
    # tool's folder path raw, and a folder name with accented letters breaks
    # the ASCII-only script. Every path that is needed travels as a JSON literal.
    body = (
        "var __P = %s;\n"
        "var __OUT = %s;\n"
        "%s\n%s\n"
        "(function () {\n"
        "  var res;\n"
        "  try { res = vrTask_%s(__P); } catch (e) { res = { error: vrErr(e) }; }\n"
        "  vrWrite(res);\n"
        "})();\n"
    ) % (_js_literal(params or {}), _js_literal(jsx_path(out)), _jsx_lib("common.jsxinc"), _jsx_lib("tasks.jsxinc"), task)
    with open(script, "w", encoding="ascii") as f:
        f.write(body)
    with _lock:
        err = send_jsx(script, timeout)
        if err:
            raise AEError(err)
        # AE may still be working after the hand-over returned: wait on the file.
        deadline = time.time() + timeout
        cancelled = getattr(_tls, "cancelled", None)
        while not os.path.exists(out):
            if cancelled and cancelled():
                # AE may still finish this script; the step stops waiting for it.
                raise AECancelled()
            if time.time() > deadline:
                raise AEError("AE did not answer task '%s' within %ds. Either a dialog is open in After Effects, "
                              "or 'Allow Scripts to Write Files and Access Network' is off "
                              "(AE Settings > Scripting & Expressions)." % (task, timeout))
            time.sleep(0.2)
    with open(out, encoding="utf-8") as f:
        res = json.load(f)
    for pth in (script, out):
        try:
            os.remove(pth)
        except OSError:
            pass
    if isinstance(res, dict) and res.get("error"):
        raise AEError(res["error"])
    return res


def wait_files(paths, timeout=180, settle=0.6):
    """saveFrameToPng is asynchronous: wait until every file exists and its
    size stops changing. Returns the list of paths still missing."""
    deadline = time.time() + timeout
    pending = list(paths)
    sizes = {}
    while pending and time.time() < deadline:
        nxt = []
        for p in pending:
            if os.path.exists(p):
                s = os.path.getsize(p)
                if s > 0 and sizes.get(p) == s:
                    continue
                sizes[p] = s
            nxt.append(p)
        pending = nxt
        if pending:
            time.sleep(settle)
    return pending


def is_running():
    return ae_running()
