#!/bin/bash
# macOS: start Video Resize with no checks (fast). First time? Use "Start Video Resize.command".
DIR="$(cd "$(dirname "$0")" && pwd)"
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
bash "$DIR/app/run.sh" --quick || { printf "\nPress Return to close."; read -r _; }
