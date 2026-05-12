<p align="center">
  <img src="assets/clipforge_icon4.png" alt="ClipForge logo" width="160">
</p>

<h1 align="center">ClipForge</h1>

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Platform: Windows | Linux | macOS](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB.svg)](https://tauri.app)
[![Latest Tauri release](https://img.shields.io/github/v/release/Michel-IT/ClipForge?label=tauri%20release&color=success&filter=tauri-*)](https://github.com/Michel-IT/ClipForge/releases?q=tauri&expanded=true)

> Native desktop GUI to download videos, audio and subtitles from YouTube and 1800+ sites — for personal archival of content you have rights to.

ClipForge is a Tauri-based desktop application built on top of [`yt-dlp`](https://github.com/yt-dlp/yt-dlp). It auto-detects the source platform from a pasted URL, shows you which operations are available (Video / Audio / Subtitles), and runs them with one click. `yt-dlp` and `ffmpeg` are bundled as sidecars — end users do not need to install anything else.

---

## ⚠️ Read this first

ClipForge is a generic downloader. It is intended **only** for content that you own, that is in the public domain, or that you have explicit permission to download. Using ClipForge to bypass DRM, scrape commercial content, or violate a platform's Terms of Service is **not** an authorized use.

The full legal terms — including the limitation of liability, the list of permitted/forbidden uses, the tool-neutrality clause (§3-bis), the indemnification clause (§4-bis), the donations clause (§13), and the trademark notice (§12) — are in [DISCLAIMER.md](DISCLAIMER.md). The same text is shown inside the application at every launch and must be explicitly accepted before the main window opens. Companion documents: [Terms of Use](docs/TERMS.md), [Privacy Policy](docs/PRIVACY.md).

---

## Features

- **Auto-detects the source platform** from the pasted URL and shows a colored badge with the platform name and a one-line note describing what the app supports for that platform.
- **Visual capability indicators** — three pills (Video / Audio / Subtitles) tell you at a glance what is supported for the current URL.
- **Video MP4** download with quality picker (`Auto / 1080p / 720p / 480p / 360p`), thumbnail embedded as cover art.
- **Audio MP3** extraction with bitrate picker (`128 / 192 / 256 / 320 kbps`), ID3 metadata + thumbnail embedded.
- **Subtitles → cleaned `.txt`** for sites that expose them (YouTube, Vimeo, Dailymotion). Pulls the requested languages and strips timing/markup.
- **Playlist selection modal** — when a playlist URL is pasted, ClipForge enumerates the entries with `--flat-playlist` (live "Found N items…" counter) and lets you tick exactly which items to download. A bulk-confirmation step gates selections above 50 items so you never start a large batch by accident.
- **Cookie support from your browser** (Chrome / Firefox / Edge / Brave / Opera / Vivaldi) for content visible to your logged-in account. Auto-fallback to no-cookie if the browser cookie database is locked, with a friendly status message otherwise.
- **Single-video by default** for playlist URLs. Toggle "Download whole playlist" if you really want all (or a selection) of them.
- **Live progress modal** with phase indicator, download speed, ETA, expandable log panel, and a Cancel button that aborts cleanly mid-download (and only removes the in-progress item's partials, not earlier completed items).
- **46-language UI** — interface auto-detected from your OS locale (English, Italian human-written; 44 others auto-translated and open to community contributions).
- **Theme switcher** — Light, Dark, or System (follows OS).
- **Auto-paste** at startup if the clipboard contains a recognized URL.
- **Bundled `yt-dlp` and `ffmpeg`** as Tauri sidecars — zero install on the host.
- **No telemetry, no analytics, no data collection** — see [Privacy Policy](docs/PRIVACY.md).

## Supported platforms (first-class)

| Platform | Video | Audio | Subtitles |
|---|---|---|---|
| YouTube | ✓ | ✓ | ✓ |
| TikTok | ✓ | ✓ | — |
| Instagram | ✓ | ✓ | — |
| Facebook | ✓ | ✓ | — |
| X / Twitter | ✓ | ✓ | — |
| Vimeo | ✓ | ✓ | ✓ |
| Twitch | ✓ (VOD/clips) | ✓ | — |
| Reddit | ✓ | ✓ | — |
| Dailymotion | ✓ | ✓ | ✓ |
| SoundCloud | — | ✓ | — |
| ~1800 others | best-effort via yt-dlp generic dispatcher |

For the full list see the [yt-dlp supported sites page](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

## Screenshots

<details open>
<summary><b>macOS</b></summary>

![ClipForge main window — macOS](docs/screenshots/main-mac.png)

</details>

<details>
<summary><b>Windows</b></summary>

![ClipForge main window — Windows](docs/screenshots/main-win.png)

</details>

---

## Installation

Native installers per platform with full UI polish: 46-language auto-detected interface, About modal with license attribution, live download console. Current release: **`tauri-v0.1.3`**.

| Platform | Direct download | Notes |
|---|---|---|
| Windows (MSI installer) | [⬇️ ClipForge-0.1.3-windows-x64.msi](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-windows-x64.msi) | Standard MSI installer, ~57 MB. Requires WebView2 (preinstalled on Windows 10/11). |
| Windows (NSIS installer) | [⬇️ ClipForge-0.1.3-windows-x64-setup.exe](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-windows-x64-setup.exe) | Smaller NSIS installer, ~46 MB, same runtime. |
| Linux (Debian/Ubuntu) | [⬇️ ClipForge-0.1.3-linux-amd64.deb](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-linux-amd64.deb) | `sudo apt install ./ClipForge-*.deb` |
| Linux (Fedora/RHEL) | [⬇️ ClipForge-0.1.3-linux-x86_64.rpm](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-linux-x86_64.rpm) | `sudo dnf install ./ClipForge-*.rpm` |
| Linux (AppImage) | [⬇️ ClipForge-0.1.3-linux-amd64.AppImage](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-linux-amd64.AppImage) | `chmod +x ClipForge-*.AppImage && ./ClipForge-*.AppImage` |
| macOS — Apple Silicon (M1/M2/M3/M4) | [⬇️ ClipForge-0.1.3-macos-arm64.dmg](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-macos-arm64.dmg) | Open + drag to Applications. Unsigned, right-click → Open the first time. |
| macOS — Intel (x86_64) | [⬇️ ClipForge-0.1.3-macos-intel.dmg](https://github.com/Michel-IT/ClipForge/releases/download/tauri-v0.1.3/ClipForge-0.1.3-macos-intel.dmg) | Built manually on an Intel Mac (`macos-13` GitHub runner pool is permanently saturated). |

[Browse all Tauri releases](https://github.com/Michel-IT/ClipForge/releases?q=tauri&expanded=true).

**Which macOS build do I need?** Open Terminal and run `uname -m` — `arm64` → Apple Silicon DMG, `x86_64` → Intel DMG.

### Build from source

See [`tauri/README.md`](tauri/README.md) for prerequisites (Rust toolchain, Node 20+, pnpm 9, platform sidecars) and step-by-step instructions for each OS.

---

## Usage

1. Launch ClipForge and accept the legal disclaimer.
2. Paste a URL into the URL field — the platform badge and capability pills update live.
3. Pick a tab (`Video MP4`, `Audio MP3`, `Subtitles → Text`, or `Settings`).
4. Pick the output folder if you don't want the default (`~/Downloads/ClipForge`).
5. Hit the action button. Watch the progress modal. Use **Cancel** if you change your mind — only the in-progress item's partials get removed.

For private content visible only to your logged-in account: open `Settings`, pick the browser whose login cookies should be used, then start the download (if Windows holds a file lock on the cookie database, ClipForge automatically retries without cookies).

For playlist URLs: tick "Download whole playlist" before clicking the action button. ClipForge will fetch the playlist metadata, present a modal with the full list (live "Found N items…" counter while it streams), and let you pick exactly which items to download. Selections above 50 items show a bulk-confirmation step.

---

## Project structure

```
ClipForge/
├─ .github/
│  ├─ workflows/
│  │  └─ release-tauri.yml   # GitHub Actions: builds Win/Linux/macOS-arm64 on tauri-vX.Y.Z tag push, attaches to Release
│  └─ FUNDING.yml            # Sponsor / donation links
├─ assets/                   # Project logo + application icon
├─ docs/
│  ├─ PRIVACY.md             # Privacy policy (no data collected)
│  ├─ TERMS.md               # Terms of Use
│  └─ screenshots/           # README images
├─ scripts/utility/translate/ # Locale tooling (structural sync, DeepL/OpenAI auto-translate)
├─ tauri/                    # Tauri application (React + TypeScript frontend, Rust backend)
│  ├─ src/                   # React UI + i18n + 46 locales
│  ├─ src-tauri/             # Rust commands + sidecar wiring
│  ├─ scripts/               # Sidecar fetchers + dev helpers
│  └─ README.md              # Build-from-source guide for the Tauri app
├─ legacy/                   # Retired Python single-file build — see legacy/README.md
├─ DISCLAIMER.md             # Full legal disclaimer (shown in-app at every launch)
├─ LICENSE                   # GNU AGPL-3.0
├─ README.md                 # This file
└─ CONTRIBUTING.md           # Contribution guidelines + CLA
```

## Tech stack

| Component | Role |
|---|---|
| [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) | Extraction and download engine (sidecar) |
| [`ffmpeg`](https://ffmpeg.org/) | Media processor (sidecar) |
| [`Tauri`](https://tauri.app/) v2 | Desktop application runtime (Rust core + system webview) |
| [`React`](https://react.dev/) + [`TypeScript`](https://www.typescriptlang.org/) | Frontend UI |
| [`i18next`](https://www.i18next.com/) + [`react-i18next`](https://react.i18next.com/) | Internationalization (46 languages) |
| [`tauri-plugin-clipboard-manager`](https://github.com/tauri-apps/plugins-workspace) | Clipboard auto-paste |
| [`tauri-plugin-shell`](https://github.com/tauri-apps/plugins-workspace) | Sidecar invocation + open in file manager |
| [`tauri-plugin-store`](https://github.com/tauri-apps/plugins-workspace) | Settings persistence |

## Roadmap

Planned for future iterations:

- Local AI transcription via [`faster-whisper`](https://github.com/SYSTRAN/faster-whisper) (when subtitles aren't available).
- Multi-URL queue (paste several links and process in sequence).
- Playlist filters (date range, max items).
- Timestamp-based clipping (`--download-sections` to grab only minute X to Y).
- Drag & drop URLs onto the window.
- Auto-summary and translation of subtitles/text.

---

## License

ClipForge is released under the **GNU Affero General Public License v3.0** — see [LICENSE](LICENSE) for the full text.

In plain language:

- You are free to use, modify, and redistribute ClipForge.
- If you distribute a modified version, or run a modified version as a network service, you must publish the source code of your modifications under the AGPL-3.0 as well.
- The bundled `ffmpeg` binary may include components under (L)GPL — AGPL-3.0 is compatible with these.
- The author retains the copyright and may release future versions under additional licenses (dual licensing). Contributions are accepted only under the terms of the [Contributor License Agreement](CONTRIBUTING.md#contributor-license-agreement).

This is not legal advice — read [LICENSE](LICENSE) and [DISCLAIMER.md](DISCLAIMER.md) for the binding terms.

## Historical note — Python single-file build (retired)

ClipForge started as a Python + CustomTkinter + PyInstaller single-file application. That code path has been retired in favor of the Tauri build, which reached feature parity in `tauri-v0.1.3` and ships a smaller native installer plus a 46-language UI. The original Python source, scripts and the disabled CI workflow are preserved under [`legacy/`](legacy/README.md) for historical reference; no new Python releases will be cut and the Python `release.yml` workflow has been disabled.

## Contributing

Issues and pull requests are welcome. Before submitting a PR please read [CONTRIBUTING.md](CONTRIBUTING.md) — non-trivial contributions require signing a short Contributor License Agreement.

## Author

**Michel-IT** — [github.com/Michel-IT](https://github.com/Michel-IT)
