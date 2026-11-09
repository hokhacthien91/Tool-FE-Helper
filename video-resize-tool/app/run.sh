#!/usr/bin/env bash
# Set up (first run) and start Video Resize. macOS Terminal, or Git Bash on Windows.
#
#   bash run.sh            install what is missing, check, start, open the browser
#   bash run.sh --setup    install only
#   bash run.sh --quick    no install check, no computer checks: just start (needs a .venv)
#   bash run.sh --restart  stop the copy already running, then start this one (after an update)
#   VR_PORT=8770 bash run.sh
#
# Installs into your user account only (no admin password):
#   uv           Python manager from astral.sh (~/.local/bin)
#   Python 3.12  managed by uv
#   .venv/       in this folder: Pillow, numpy, imageio-ffmpeg (bundles ffmpeg)
set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1

case "$(uname -s)" in
  Darwin) OS=mac; PY="$DIR/.venv/bin/python" ;;
  MINGW*|MSYS*|CYGWIN*) OS=win; PY="$DIR/.venv/Scripts/python.exe" ;;
  *) echo "Unsupported system: $(uname -s). Use macOS or Windows."; exit 1 ;;
esac

die() { echo "  ✗ $1"; [ $# -gt 1 ] && echo "    $2"; exit 1; }

# A downloaded zip is quarantined: double-clicking a launcher then shows
# "Apple could not verify...". Clear it for the whole tool folder, so one run
# of `bash app/run.sh` is enough for the launchers to open without asking.
[ "$OS" = mac ] && xattr -dr com.apple.quarantine "$(dirname "$DIR")" 2>/dev/null

# Fast path: the .venv is there, skip uv and the library check.
case " $* " in *" --quick "*) [ -x "$PY" ] && exec "$PY" "$DIR/launch.py" "$@" ;; esac

echo "Checking Python (the first run installs it, needs internet)…"
UV="$(command -v uv || true)"
for c in "$HOME/.local/bin/uv" "$HOME/.local/bin/uv.exe" "$HOME/.cargo/bin/uv"; do
  [ -z "$UV" ] && [ -x "$c" ] && UV="$c"
done
if [ -z "$UV" ]; then
  echo "  Installing uv…"
  if [ "$OS" = win ]; then
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex" >/dev/null 2>&1
    UV="$HOME/.local/bin/uv.exe"
  else
    curl -LsSf https://astral.sh/uv/install.sh | env UV_NO_MODIFY_PATH=1 sh >/dev/null 2>&1
    UV="$HOME/.local/bin/uv"
  fi
  [ -x "$UV" ] || die "Could not install uv." "Check the internet connection (VPN/proxy), then run again."
fi
echo "  ✓ uv $("$UV" --version | awk '{print $2}')"

deps_ok() { [ -x "$PY" ] && "$PY" -c "import PIL, numpy, imageio_ffmpeg" >/dev/null 2>&1; }
if ! deps_ok; then
  echo "  Creating .venv with Python 3.12 and the libraries (about 1 minute)…"
  "$UV" venv --clear --python 3.12 "$DIR/.venv" >/dev/null 2>&1 \
    || die "Could not create the Python environment." "See why: \"$UV\" venv --python 3.12 \"$DIR/.venv\""
  "$UV" pip install --python "$PY" -r "$DIR/requirements.txt" >/dev/null 2>&1 \
    || die "Could not install the libraries." "Check the internet connection, then run again."
  deps_ok || die "Libraries installed but cannot be loaded."
fi
echo "  ✓ Python $("$PY" -c 'import sys; print("%d.%d" % sys.version_info[:2])') with Pillow, numpy, ffmpeg"

[ "${1:-}" = "--setup" ] && exit 0
exec "$PY" "$DIR/launch.py" "$@"
