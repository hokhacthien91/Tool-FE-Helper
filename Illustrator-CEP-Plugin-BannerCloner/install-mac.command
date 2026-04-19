#!/bin/bash
# =============================================================
# Banner Cloner — One-click Install for macOS
# Enables debug mode + creates symlink to CEP extensions folder
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
LINK_NAME="Banner-Cloner"
LINK_PATH="$EXTENSION_DIR/$LINK_NAME"

echo "============================================"
echo "  Banner Cloner — macOS Installer"
echo "============================================"
echo ""
echo "Plugin folder: $SCRIPT_DIR"
echo "Target:        $LINK_PATH"
echo ""

echo "[1/2] Enabling CEP Debug Mode..."
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
echo "      Done. (CSXS 10, 11, 12)"

echo "[2/2] Creating symlink..."
mkdir -p "$EXTENSION_DIR"

if [ -L "$LINK_PATH" ]; then
    EXISTING="$(readlink "$LINK_PATH")"
    if [ "$EXISTING" = "$SCRIPT_DIR" ]; then
        echo "      Symlink already exists and points to the correct folder."
    else
        echo "      Updating symlink: $EXISTING → $SCRIPT_DIR"
        rm "$LINK_PATH"
        ln -s "$SCRIPT_DIR" "$LINK_PATH"
        echo "      Done."
    fi
elif [ -d "$LINK_PATH" ]; then
    echo "      WARNING: $LINK_PATH is a real folder (not a symlink)."
    echo "      Please remove it manually, then re-run this script."
    echo ""
    echo "      rm -rf \"$LINK_PATH\""
    echo ""
    read -n 1 -s -r -p "Press any key to exit..."
    exit 1
else
    ln -s "$SCRIPT_DIR" "$LINK_PATH"
    echo "      Done."
fi

echo ""
echo "============================================"
echo "  Install complete!"
echo "  Restart Illustrator (Cmd+Q then reopen)"
echo "  Then: Window > Extensions > Banner Cloner"
echo "============================================"
echo ""
read -n 1 -s -r -p "Press any key to close..."
