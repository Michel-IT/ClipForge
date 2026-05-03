#!/usr/bin/env bash
# =============================================================================
# ClipForge — translation pipeline launcher (Linux / macOS)
# -----------------------------------------------------------------------------
# Run with no args to see usage. Pass one of: align | fill | translate | all
#
#   align     -> structural sync. Adds keys missing in 44 placeholder langs
#                from tauri/src/locales/en/translation.json. Zero token cost.
#                Run this any time the EN master gains new keys.
#
#   fill      -> one-shot generator (Claude-direct strings, hardcoded).
#                Overwrites the 44 placeholder langs. Use sparingly.
#
#   translate -> auto-translate via DeepL Free + OpenAI fallback.
#                Requires env vars DEEPL_API_KEY and/or OPENAI_API_KEY.
#                Won't overwrite langs marked _meta.source = "human".
#                Pass --only=de,fr,es to limit scope.
#
#   all       -> align then translate (recommended after EN master updates).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

usage() {
  cat <<EOF

Usage:  ./run.sh <command> [args]

Commands:
  align       Structural sync (zero cost, no API keys needed)
  fill        Regenerate placeholders from hardcoded Claude-direct strings
  translate   Auto-translate via DeepL/OpenAI (needs API keys in env)
  all         align then translate

Examples:
  ./run.sh align
  ./run.sh translate --only=de,fr,es
  DEEPL_API_KEY=xxx ./run.sh translate

EOF
}

cmd="${1:-}"
shift || true

case "$cmd" in
  align)
    echo "[align-locales] Structural sync..."
    python3 align-locales.py
    ;;
  fill)
    echo "[fill-translations] Regenerating 44 placeholder langs (Claude-direct)..."
    python3 fill-translations.py
    ;;
  translate)
    echo "[translate-locales] Auto-translating via DeepL/OpenAI..."
    node translate-locales.mjs "$@"
    ;;
  all)
    echo "[1/2] align-locales..."
    python3 align-locales.py
    echo "[2/2] translate-locales..."
    node translate-locales.mjs "$@"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
