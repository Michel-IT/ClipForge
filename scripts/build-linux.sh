#!/usr/bin/env bash
# ClipForge build script for Linux.
# For macOS use scripts/build-macos.sh instead — it handles the Tcl/Tk SDK
# mismatch that bites python.org-installed Pythons on point-version macOS.
# Always upgrades yt-dlp (and the other Python deps) so the produced binary
# tracks the latest extractor changes for YouTube, TikTok, etc.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ "$(uname -s)" != "Linux" ]; then
    echo "This script is for Linux only." >&2
    echo "  - macOS  → scripts/build-macos.sh" >&2
    echo "  - Windows → scripts\\build-windows.bat" >&2
    exit 1
fi

PY="${PYTHON:-python3}"

if [ ! -d venv ]; then
    "$PY" -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate

python -m pip install --upgrade pip
python -m pip install --upgrade pyinstaller
python -m pip install --upgrade -r requirements.txt

rm -rf "build" "dist/linux"

pyinstaller --clean --noconfirm --distpath "dist/linux" clipforge.spec

echo
echo "Build complete: dist/linux/ClipForge"
echo "Tip: chmod +x dist/linux/ClipForge if needed."
