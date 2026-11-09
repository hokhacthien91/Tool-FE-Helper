#!/bin/bash
# Build dev/dist/Video-Resize-<date>.zip: one folder "Video Resize" holding the
# launchers, READ ME FIRST, app/ and docs/. Never ships app/.venv
# (machine-specific), jobs/ (client work) or dev/ (this script, test tools).
set -e
BASE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE"
OUT="$BASE/dev/dist/Video-Resize-$(date +%Y%m%d).zip"
STAGE="$(mktemp -d)/Video Resize"
mkdir -p "$STAGE" "$BASE/dev/dist"
rsync -a \
  --exclude '/dev' --exclude '/jobs' --exclude '.venv' --exclude '__pycache__' --exclude '*.pyc' \
  --exclude '.DS_Store' --exclude '.gitignore' \
  ./ "$STAGE/"
chmod +x "$STAGE/Start Video Resize.command" "$STAGE/Quick Start.command" "$STAGE/app/run.sh"
rm -f "$OUT"
( cd "$(dirname "$STAGE")" && /usr/bin/ditto -c -k --sequesterRsrc --keepParent "Video Resize" "$OUT" )
rm -rf "$(dirname "$STAGE")"
echo "$OUT  $(du -h "$OUT" | cut -f1)"
