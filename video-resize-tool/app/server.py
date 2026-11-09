"""Video Resize tool — local web UI (http://127.0.0.1:8767). Started by launch.py, or dev/start.sh."""
import json
import mimetypes
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from vr import ae, pipeline, report

ROOT = os.path.dirname(os.path.abspath(__file__))
UI = os.path.join(ROOT, "ui")
PORT = int(os.environ.get("VR_PORT", "8767"))
SRV = None  # the running ThreadingHTTPServer, for /api/shutdown


class H(BaseHTTPRequestHandler):
    server_version = "VideoResize/0.1"

    def log_message(self, fmt, *args):
        if "/api/jobs/" in (args[0] if args else "") and "GET" in (args[0] if args else ""):
            return  # UI polls every second; keep the console readable
        sys.stderr.write("%s\n" % (fmt % args))

    # ---------------------------------------------------------- helpers
    def _json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8"))

    def _file(self, path):
        if not os.path.isfile(path):
            self.send_error(404)
            return
        size = os.path.getsize(path)
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                if m.group(2):
                    end = min(int(m.group(2)), size - 1)
            self.send_response(206)
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = f.read(min(1 << 16, left))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return
                left -= len(chunk)

    def _safe(self, base, rel):
        p = os.path.realpath(os.path.join(base, rel))
        if not p.startswith(os.path.realpath(base) + os.sep):
            return None
        return p

    # ---------------------------------------------------------- GET
    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        try:
            if path in ("/", "/index.html"):
                return self._file(os.path.join(UI, "index.html"))
            if path.startswith("/ui/"):
                p = self._safe(UI, path[4:])
                return self._file(p) if p else self.send_error(404)
            if path == "/api/jobs":
                # root: lets a second launcher tell this copy from another folder's copy.
                return self._json({"jobs": pipeline.list_jobs(), "presets": pipeline.PRESETS,
                                   "ae_running": ae.is_running(), "root": ROOT})
            m = re.match(r"^/api/jobs/([^/]+)$", path)
            if m:
                job = pipeline.mark_stale(pipeline.load(m.group(1)))
                for s in job.get("sizes", []):
                    s["reference_options"] = pipeline.reference_options(job, s)
                if job.get("intake"):  # jobs made before a ranking change get it too
                    job["intake"]["comps"].sort(key=pipeline.comp_rank)
                return self._json(job)
            m = re.match(r"^/jobs/([^/]+)/(.+)$", path)
            if m:
                p = self._safe(pipeline.job_dir(m.group(1)), m.group(2))
                return self._file(p) if p else self.send_error(404)
            self.send_error(404)
        except FileNotFoundError:
            self._json({"error": "Not found"}, 404)
        except Exception as e:
            self._json({"error": str(e)}, 500)

    # ---------------------------------------------------------- POST
    def do_POST(self):
        path = unquote(urlparse(self.path).path)
        try:
            b = self._body()
            if path == "/api/shutdown":
                # Used by `launch.py --restart`. Never while a step is running:
                # killing it mid-build leaves AE half-way through a script.
                busy = [j["id"] for j in pipeline.list_jobs() if pipeline.load(j["id"]).get("busy")]
                if busy and not b.get("force"):
                    return self._json({"error": "A step is still running in %s. Wait for it, then restart." % ", ".join(busy)}, 409)
                import threading
                threading.Thread(target=SRV.shutdown, daemon=True).start()
                return self._json({"ok": True})
            if path == "/api/jobs":
                return self._json(pipeline.create_job(b.get("aep", ""), bool(b.get("force_close"))))
            m = re.match(r"^/api/jobs/([^/]+)/(\w+)$", path)
            if not m:
                return self.send_error(404)
            act = m.group(2)
            if act == "delete":
                return self._json(pipeline.delete_job(m.group(1)))
            job = pipeline.load(m.group(1))
            if act == "master":
                sizes = [s for s in b.get("sizes", []) if 4 <= int(s["w"]) <= 30000 and 4 <= int(s["h"]) <= 30000]
                if not b.get("master") or not sizes:
                    raise ValueError("Pick a master comp and at least one size.")
                odd = ["%sx%s" % (s["w"], s["h"]) for s in sizes if int(s["w"]) % 2 or int(s["h"]) % 2]
                if odd:
                    raise ValueError("Use even sizes (H.264): %s → %s." % (", ".join(odd), ", ".join(
                                         "%dx%d" % (int(s["w"]) // 2 * 2, int(s["h"]) // 2 * 2) for s in sizes
                                         if int(s["w"]) % 2 or int(s["h"]) % 2)))
                pipeline.set_master(job, b["master"], sizes, bool(b.get("auto")), b.get("master_id"))
            elif act == "roles":
                pipeline.confirm_roles(job, b.get("roles", {}), bool(b.get("ack_missing")))
            elif act == "reference":
                pipeline.set_reference(job, b["key"], b.get("ref"))
            elif act == "deliver":
                pipeline.deliver(job, b.get("folder", ""))
            elif act == "suggest":
                pipeline.suggest(job, b["key"])
            elif act == "size":
                pipeline.update_size(job, b["key"], b.get("params"), b.get("action", "rebuild"))
            elif act == "beats":
                pipeline.refresh_beats(job)
            elif act == "render":
                pipeline.start_render(job)
            elif act == "report":
                return self._json(report.build(pipeline.mark_stale(pipeline.load(job["id"]))))
            elif act == "open":
                pipeline.open_folder(job, b.get("sub", ""))
            elif act == "stage":
                job = pipeline.load(job["id"])
                if b.get("stage") in ("intake", "roles", "review", "render", "done"):
                    job["stage"] = b["stage"]
                    pipeline.save(job)
            else:
                return self.send_error(404)
            self._json({"ok": True})
        except (ValueError, KeyError, RuntimeError, ae.AEError) as e:
            self._json({"error": str(e)}, 400)
        except Exception as e:
            self._json({"error": "%s: %s" % (type(e).__name__, e)}, 500)


def main():
    os.makedirs(pipeline.JOBS, exist_ok=True)
    for jid in pipeline.recover_interrupted():
        print("Recovered interrupted job: " + jid, flush=True)
    global SRV
    SRV = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print("Video Resize: http://127.0.0.1:%d" % PORT, flush=True)
    SRV.serve_forever()
    SRV.server_close()


if __name__ == "__main__":
    main()
