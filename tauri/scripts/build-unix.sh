#!/usr/bin/env bash
# Builds the ClipForge Tauri release bundles on Linux and macOS.
# Mirrors .github/workflows/release-tauri.yml (ubuntu-22.04 / macos-14) so a
# local build and a CI build produce the same artifacts.
#
# Why this script exists: the yt-dlp/ffmpeg sidecars are gitignored and are NOT
# refreshed by `pnpm tauri build`. Building without re-running fetch-sidecars
# silently ships whatever binary happens to sit in src-tauri/binaries/ — that is
# exactly how v0.1.0..v0.1.3 all went out with yt-dlp 2026.03.17 and started
# failing on YouTube with HTTP 403. Refreshing the sidecars is part of the
# build, not a separate step.
#
# Usage:
#   scripts/build-unix.sh                             # autodetect host triple
#   scripts/build-unix.sh --target x86_64-apple-darwin  # explicit override
#
# The Intel-macOS build is run this way over SSH on the Intel iMac: the
# macos-13 GitHub runner pool never starts the queued job.

set -euo pipefail

cd "$(dirname "$0")/.."

# Homebrew is not on PATH in non-interactive SSH sessions (~/.zshrc is not
# sourced), which is how the Intel macOS build is driven. Pre-source it.
if [ -x /usr/local/bin/brew ]; then eval "$(/usr/local/bin/brew shellenv)"
elif [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"
fi
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

TARGET=""
if [ "${1:-}" = "--target" ]; then TARGET="${2:?--target needs a value}"; fi
if [ -z "$TARGET" ]; then
  # `rustc -vV` reports the host triple — the same value CI passes explicitly.
  TARGET="$(rustc -vV | sed -n 's/^host: //p')"
fi
echo "Target: $TARGET"

echo
echo "=== 1/3 Refreshing sidecars (yt-dlp + ffmpeg) ==="
bash ./scripts/fetch-sidecars.sh --target "$TARGET"

echo
echo "=== 2/3 Installing frontend dependencies ==="
# --frozen-lockfile matches CI: fails loudly if pnpm-lock.yaml is stale instead
# of silently resolving different versions than the release build.
pnpm install --frozen-lockfile

echo
echo "=== 3/3 Building Tauri bundles ==="
pnpm tauri build --target "$TARGET"

echo
echo "Build complete. Bundles are in:"
echo "  src-tauri/target/$TARGET/release/bundle/"
