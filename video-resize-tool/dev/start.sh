#!/bin/bash
# Start the Video Resize UI on http://127.0.0.1:8767 (background, log in jobs/server.log).
#   dev/start.sh         start (restarts if already running) and open the browser
#   dev/start.sh --stop  stop
cd "$(dirname "$0")/../app"
PORT="${VR_PORT:-8767}"
# Only the listening process: a plain `lsof -ti tcp:PORT` also matches browser tabs.
PID="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null)"
[ -n "$PID" ] && kill "$PID" && sleep 0.5
[ "$1" = "--stop" ] && { echo "stopped"; exit 0; }
if [ ! -x .venv/bin/python ]; then
  echo "No .venv yet: run app/run.sh --setup once (or double-click 'Start Video Resize.command')."; exit 1
fi
mkdir -p ../jobs
nohup .venv/bin/python server.py > ../jobs/server.log 2>&1 &
for _ in 1 2 3 4 5 6 7 8 9 10; do
  lsof -ti tcp:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && break
  sleep 0.5
done
if lsof -ti tcp:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Video Resize: http://127.0.0.1:$PORT"
  if [ "$1" != "--no-open" ]; then open "http://127.0.0.1:$PORT"; fi
else
  echo "server failed to start:"; cat ../jobs/server.log; exit 1
fi
