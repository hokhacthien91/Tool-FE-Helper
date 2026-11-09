#!/bin/bash
# macOS: double-click in Finder. Same as `bash run.sh` in Terminal.
DIR="$(cd "$(dirname "$0")" && pwd)"
# A zip from Teams/Dropbox/mail is quarantined; clear it so nothing inside is blocked again.
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null
bash "$DIR/app/run.sh"
code=$?
if [ $code -ne 0 ]; then
  osascript -e 'display alert "Video Resize could not start" message "See the Terminal window for the reason." as critical' >/dev/null 2>&1
  printf "\nPress Return to close."; read -r _
fi
exit $code
