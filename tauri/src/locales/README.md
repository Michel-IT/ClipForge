# Translations

ClipForge supports 46 languages. Each lives in `<lang>/translation.json`.

## Status

| Status | Languages |
|---|---|
| **Human-written** (`_meta.source: "human"`) | `en` (master), `it` |
| **Placeholder** (EN copies, marked `_meta.source: "placeholder"`) | the other 44 |
| **Auto-translated** (DeepL / OpenAI) | produced by running `scripts/translate-locales.mjs` |

The fallback chain is `<lang> → en`, so missing keys never break the UI.

## Contribute a translation

Pick a language, replace the placeholder values with native translations, and open a PR.

1. Fork + clone the repo.
2. Open `tauri/src/locales/<your-lang>/translation.json`.
3. Translate every value (right-hand side of every `key: "value"`). **Keep `{{var}}` placeholders intact** — they are interpolated at runtime.
4. Set the file's metadata:
   ```json
   "_meta": { "autoTranslated": false, "source": "human" }
   ```
5. Commit + open PR. No code change needed — `i18n.ts` discovers locales via `import.meta.glob`.

### Conventions

- **Keep brand names in English**: ClipForge, yt-dlp, YouTube, Reddit, TikTok, Instagram, Vimeo, Twitch, Dailymotion, SoundCloud, Facebook, X/Twitter.
- **Keep technical jargon untranslated** if the local convention is the English term (e.g., "playlist", "URL", "MP3", "MP4").
- **Tone**: neutral, second person informal where applicable. Match the `it` translation as a stylistic reference.

## Add a new language

1. `cp -r en/ <new-lang-code>/`
2. Translate.
3. Set `_meta.source: "human"`.

The language picker auto-discovers it. To get a friendly endonym in the dropdown, also add an entry to `LANG_NAMES` in `tauri/src/i18n.ts`.

## Re-run auto-translation

The 44 placeholder files can be filled with machine translations using the script:

```bash
cd tauri
DEEPL_API_KEY=…  OPENAI_API_KEY=…  node scripts/translate-locales.mjs
# or only specific languages:
node scripts/translate-locales.mjs --only=de,fr,zh-CN
```

- DeepL Free key: register at https://www.deepl.com/pro-api (500k chars/month free, covers ~30 langs).
- OpenAI key: required for languages DeepL doesn't support (hi, bn, ur, fa, vi, th, ms, fil, ca, eu, gl, sr, hr, mk, sw, af).
- The script **skips** any language whose existing file is marked `_meta.source: "human"` — it never overwrites a contributor's work.

Cost estimate per full run: DeepL ~free under quota, OpenAI ~$0.01 (gpt-4o-mini, 14 langs, ~52 strings each).
