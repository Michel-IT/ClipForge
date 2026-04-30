#!/usr/bin/env bash
# ClipForge build script for Linux and macOS.
# Always upgrades yt-dlp (and the other Python deps) so the produced binary
# tracks the latest extractor changes for YouTube, TikTok, etc.

set -euo pipefail

cd "$(dirname "$0")/.."

case "$(uname -s)" in
    Darwin)  PLATFORM="macos" ;;
    Linux)   PLATFORM="linux" ;;
    *)       PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')" ;;
esac

PY="${PYTHON:-python3}"

if [ ! -d venv ]; then
    "$PY" -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate

python -m pip install --upgrade pip
python -m pip install --upgrade pyinstaller
python -m pip install --upgrade -r requirements.txt

rm -rf "build" "dist/${PLATFORM}"

pyinstaller --clean --noconfirm --distpath "dist/${PLATFORM}" clipforge.spec

echo
echo "Build complete: dist/${PLATFORM}/ClipForge"
case "$PLATFORM" in
    macos) echo "Tip: provide assets/icon.icns to embed an icon on macOS builds." ;;
    linux) echo "Tip: chmod +x dist/${PLATFORM}/ClipForge if needed." ;;
esac
