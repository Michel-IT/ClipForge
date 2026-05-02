#!/usr/bin/env bash
# Stages yt-dlp + ffmpeg sidecars in tauri/src-tauri/binaries/ named per Tauri's
# <basename>-<target-triple> convention.
#
# Usage:
#   ./fetch-sidecars.sh                              # autodetect host triple
#   ./fetch-sidecars.sh --target aarch64-apple-darwin

set -euo pipefail

TARGET=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) TARGET="$2"; shift 2 ;;
    -h|--help)
      grep -E "^# " "$0" | sed -E "s/^# ?//"
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BIN_DIR="$ROOT/src-tauri/binaries"
mkdir -p "$BIN_DIR"

if [[ -z "$TARGET" ]]; then
  if ! command -v rustc >/dev/null 2>&1; then
    echo "rustc not found. Install Rust (https://rustup.rs) or pass --target explicitly." >&2
    exit 1
  fi
  TARGET="$(rustc -vV | awk '/^host:/ {print $2}')"
fi

echo "Staging sidecars for target: $TARGET"

TMP="$(mktemp -d -t clipforge-sidecars.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

dl() {
  local url="$1" out="$2"
  echo "  GET $url"
  curl -L --fail --silent --show-error -o "$out" "$url"
}

case "$TARGET" in
  x86_64-pc-windows-msvc)
    dl "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" \
       "$BIN_DIR/yt-dlp-$TARGET.exe"

    dl "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" \
       "$TMP/ffmpeg.zip"
    unzip -q "$TMP/ffmpeg.zip" -d "$TMP"
    FFMPEG="$(find "$TMP" -type f -name "ffmpeg.exe" | head -n1)"
    [[ -n "$FFMPEG" ]] || { echo "ffmpeg.exe not found in zip" >&2; exit 1; }
    mv -f "$FFMPEG" "$BIN_DIR/ffmpeg-$TARGET.exe"
    ;;

  x86_64-unknown-linux-gnu)
    dl "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" \
       "$BIN_DIR/yt-dlp-$TARGET"
    chmod +x "$BIN_DIR/yt-dlp-$TARGET"

    dl "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" \
       "$TMP/ffmpeg.tar.xz"
    (cd "$TMP" && tar -xJf ffmpeg.tar.xz)
    FFMPEG="$(find "$TMP" -type f -name "ffmpeg" ! -name "*.exe" | head -n1)"
    [[ -n "$FFMPEG" ]] || { echo "ffmpeg not found in tarball" >&2; exit 1; }
    mv -f "$FFMPEG" "$BIN_DIR/ffmpeg-$TARGET"
    chmod +x "$BIN_DIR/ffmpeg-$TARGET"
    ;;

  aarch64-apple-darwin|x86_64-apple-darwin)
    # `yt-dlp_macos` is a universal2 binary that runs on both arm64 and Intel.
    # The historical `yt-dlp_macos_legacy` (for macOS 10.13/14) has been retired
    # by upstream and now 404s, so we use the universal binary for both targets.
    YT_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
    dl "$YT_URL" "$BIN_DIR/yt-dlp-$TARGET"
    chmod +x "$BIN_DIR/yt-dlp-$TARGET"

    dl "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip" "$TMP/ffmpeg.zip"
    unzip -q "$TMP/ffmpeg.zip" -d "$TMP"
    FFMPEG="$(find "$TMP" -type f -name "ffmpeg" ! -name "*.exe" | head -n1)"
    [[ -n "$FFMPEG" ]] || { echo "ffmpeg not found in zip" >&2; exit 1; }
    mv -f "$FFMPEG" "$BIN_DIR/ffmpeg-$TARGET"
    chmod +x "$BIN_DIR/ffmpeg-$TARGET"
    ;;

  *)
    echo "Unsupported target: $TARGET" >&2
    exit 1
    ;;
esac

echo
echo "Sidecars staged in $BIN_DIR :"
ls -la "$BIN_DIR" | awk '/^-/ {print "  " $NF}' | grep -vE "(\.gitkeep|README\.md)$" || true
