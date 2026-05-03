"""
Structural sync: walks tauri/src/locales/en/translation.json (the master) and
fills any missing keys in the other 45 lang files using the EN value as a
placeholder. **Does not touch existing translations** — only adds keys that
the target file lacks.

Zero token cost: pure file diff + write. Use this any time the EN master gains
new keys to keep all locales structurally aligned (i18next falls back to EN at
runtime anyway, but this makes the JSONs consistent for review and for the
auto-translation pipeline downstream).

After running, you can optionally run translate-locales.mjs to translate the
newly-added keys via DeepL/OpenAI for languages that have a real
`_meta.source: "human"` and want their fresh keys translated too.

Usage:
    python scripts/utility/translate/align-locales.py
"""
import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tauri")
LOCALES_DIR = os.path.join(ROOT, "src", "locales")
MASTER = os.path.join(LOCALES_DIR, "en", "translation.json")


def merge_missing(master, target):
    """Recursively add keys present in master but missing in target.

    - For dict nodes: merge keys.
    - For leaf nodes: only fill if the key is absent in target.
    - Existing values in target are NEVER overwritten.

    Returns the number of new leaf keys added.
    """
    added = 0
    for k, v in master.items():
        if k == "_meta":
            continue  # _meta is per-file, never copy from master
        if isinstance(v, dict):
            if k not in target or not isinstance(target.get(k), dict):
                target[k] = {}
            added += merge_missing(v, target[k])
        else:
            if k not in target:
                target[k] = v  # placeholder = EN value
                added += 1
    return added


def main():
    if not os.path.isfile(MASTER):
        print(f"ERROR: master not found at {MASTER}", file=sys.stderr)
        sys.exit(1)

    with open(MASTER, "r", encoding="utf-8") as f:
        master = json.load(f)

    total_added = 0
    langs_changed = 0
    for entry in sorted(os.listdir(LOCALES_DIR)):
        path = os.path.join(LOCALES_DIR, entry)
        if not os.path.isdir(path) or entry == "en":
            continue
        target_file = os.path.join(path, "translation.json")
        if not os.path.isfile(target_file):
            print(f"  skip {entry} (no translation.json)")
            continue

        with open(target_file, "r", encoding="utf-8") as f:
            target = json.load(f)

        added = merge_missing(master, target)
        if added == 0:
            continue

        # Touch _meta so reviewers see this lang was bumped.
        meta = target.get("_meta", {}) if isinstance(target.get("_meta"), dict) else {}
        meta["lastAligned"] = datetime.now(timezone.utc).isoformat()
        meta["pendingTranslationKeys"] = meta.get("pendingTranslationKeys", 0) + added
        target["_meta"] = meta

        with open(target_file, "w", encoding="utf-8") as f:
            json.dump(target, f, ensure_ascii=False, indent=2)
            f.write("\n")

        total_added += added
        langs_changed += 1
        print(f"  {entry:<10} +{added} key{'s' if added != 1 else ''}")

    print(f"\nDone. {total_added} keys added across {langs_changed} languages.")
    print("Run translate-locales.mjs (with API keys) to translate the new keys "
          "for languages that are still placeholder.")


if __name__ == "__main__":
    main()
