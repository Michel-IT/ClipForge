#!/usr/bin/env bash
# ClipForge run-from-source script for Linux and macOS.
# (No SDK / Tcl/Tk version pitfall here — running from the user's own Python
# uses whatever Tk that Python links against, which already matches their OS.)
# On every invocation upgrades yt-dlp so the latest extractors are picked up
# without rebuilding the venv from scratch.

set -euo pipefail

cd "$(dirname "$0")/.."

PY="${PYTHON:-python3}"

if [ ! -d venv ]; then
    "$PY" -m venv venv
    # shellcheck disable=SC1091
    source venv/bin/activate
    python -m pip install --upgrade pip
    python -m pip install --upgrade -r requirements.txt
else
    # shellcheck disable=SC1091
    source venv/bin/activate
    python -m pip install --upgrade yt-dlp
fi

python clipforge.py
