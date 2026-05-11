#!/usr/bin/env bash
# ClipForge macOS build script — opinionated, end-user friendly.
#
# Why this exists in addition to scripts/build-linux.sh:
#   - Forces the Python that Homebrew compiled against the running macOS, so
#     the bundled Tcl/Tk does NOT carry a hard "macOS X.Y required" check
#     inherited from a stricter SDK (e.g. python.org installer builds).
#   - Auto-installs Homebrew + python@3.12 + python-tk@3.12 on demand.
#   - Renames the output to ClipForge-macos-intel or ClipForge-macos-arm64
#     based on host architecture.
#   - Launches the resulting binary at the end as a smoke test.
#
# Usage:
#   chmod +x scripts/build-macos.sh
#   scripts/build-macos.sh           # build + launch
#   scripts/build-macos.sh --no-run  # build only, don't auto-launch

set -euo pipefail

cd "$(dirname "$0")/.."

RUN_AFTER_BUILD=1
for arg in "$@"; do
    case "$arg" in
        --no-run) RUN_AFTER_BUILD=0 ;;
        *) echo "Unknown argument: $arg" >&2; exit 2 ;;
    esac
done

if [ "$(uname -s)" != "Darwin" ]; then
    echo "This script is for macOS only. On Linux use scripts/build-linux.sh." >&2
    exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
    arm64)  RELEASE_NAME="ClipForge-macos-arm64" ;;
    x86_64) RELEASE_NAME="ClipForge-macos-intel" ;;
    *)      echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac
echo "==> Host architecture: $ARCH → output will be $RELEASE_NAME"

if ! command -v brew >/dev/null 2>&1; then
    # Brew might already be installed but its PATH wasn't sourced from a
    # non-login / non-interactive shell (SSH sessions, CI runners). Try the
    # standard install paths before falling back to a fresh install.
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "==> Homebrew not found. Installing…"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [ "$ARCH" = "arm64" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
fi

echo "==> Ensuring python@3.12 and python-tk@3.12 are installed"
brew install python@3.12 python-tk@3.12

PYTHON_BIN="$(brew --prefix python@3.12)/bin/python3.12"
if [ ! -x "$PYTHON_BIN" ]; then
    echo "ERROR: expected Python at $PYTHON_BIN not found." >&2
    exit 1
fi
echo "==> Using Python: $PYTHON_BIN"
"$PYTHON_BIN" --version

echo "==> Cleaning previous venv / build / dist"
rm -rf venv build dist/macos

echo "==> Creating venv with Homebrew Python"
"$PYTHON_BIN" -m venv venv
# shellcheck disable=SC1091
source venv/bin/activate

echo "==> Installing build deps"
python -m pip install --upgrade pip
python -m pip install --upgrade pyinstaller
python -m pip install --upgrade -r requirements.txt

echo "==> Running PyInstaller"
pyinstaller --clean --noconfirm --distpath dist/macos clipforge.spec

OUTPUT_BIN="dist/macos/ClipForge"
if [ ! -f "$OUTPUT_BIN" ]; then
    echo "ERROR: expected build output $OUTPUT_BIN not found." >&2
    exit 1
fi

echo "==> Renaming output to $RELEASE_NAME"
mv "$OUTPUT_BIN" "dist/macos/$RELEASE_NAME"
chmod +x "dist/macos/$RELEASE_NAME"

echo
echo "✓ Build complete: dist/macos/$RELEASE_NAME"
echo "  Size: $(du -h "dist/macos/$RELEASE_NAME" | cut -f1)"
echo

if [ "$RUN_AFTER_BUILD" -eq 1 ]; then
    echo "==> Launching ClipForge as smoke test (Ctrl+C to cancel)"
    echo
    exec "./dist/macos/$RELEASE_NAME"
else
    echo "Run it with: ./dist/macos/$RELEASE_NAME"
fi
