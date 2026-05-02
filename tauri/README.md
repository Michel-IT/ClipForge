# ClipForge — Tauri skeleton

This is the **Tauri v2 + React** rewrite skeleton of ClipForge. The Python app at the repo root (`../clipforge.py`) is unchanged and remains the shipping version. This folder is the foundation for a future port — it scaffolds the Rust command surface, the sidecar wiring (yt-dlp + ffmpeg), and a dedicated CI matrix, but does **not** yet implement the actual download logic. See [`../README.md`](../README.md) for the user-facing project overview.

## Prerequisites

- **Node 20+** and **pnpm 9+**
- **Rust stable** (`rustup default stable`) plus the platform toolchain (MSVC build tools on Windows, Xcode CLT on macOS, GTK/WebKit dev libs on Linux — see [Tauri prerequisites](https://tauri.app/start/prerequisites/))
- **PowerShell 7+** (`pwsh`) on Windows, or `bash + curl + tar + unzip` on Unix — needed by the sidecar fetch script

## First run (Windows)

```bash
cd tauri
pnpm install
pwsh ./scripts/fetch-sidecars.ps1     # downloads yt-dlp + ffmpeg into src-tauri/binaries/
pnpm tauri dev                         # opens an empty-but-working app window
```

The `scripts/fetch-sidecars.{ps1,sh}` script auto-detects your Rust host triple (`rustc -vV`) and stages the matching binaries, named per Tauri's `<basename>-<target-triple>` convention.

## First run (Linux / macOS)

```bash
cd tauri
pnpm install
bash ./scripts/fetch-sidecars.sh
pnpm tauri dev
```

## Production build

```bash
pnpm tauri build
```

Outputs land in `src-tauri/target/release/bundle/`:
- Windows: `msi/*.msi` + `nsis/*.exe`
- Linux: `deb/*.deb` + `appimage/*.AppImage`
- macOS: `dmg/*.dmg` + `macos/*.app.tar.gz`

## CI

Pushing a tag matching `tauri-v*.*.*` (e.g. `tauri-v0.1.0`) triggers [`.github/workflows/release-tauri.yml`](../.github/workflows/release-tauri.yml), which builds the matrix (Windows / Linux / macOS arm64 + Intel) and uploads the artifacts to a draft GitHub Release.

The Python pipeline (`v*.*.*` tags → `release.yml`) is unaffected — both ship independently during the migration.

### macOS Intel manual fallback

The `macos-13` runner pool is saturated; the Intel job is marked `continue-on-error`. If the CI build fails, build locally on an Intel Mac:

```bash
cd tauri
pnpm install
bash ./scripts/fetch-sidecars.sh --target x86_64-apple-darwin
pnpm tauri build
# upload src-tauri/target/release/bundle/dmg/*.dmg manually to the draft release
```

## Layout

```
tauri/
├─ src/                          React + TypeScript frontend
├─ src-tauri/
│  ├─ src/                       Rust commands and sidecar plumbing
│  ├─ binaries/                  yt-dlp + ffmpeg sidecars (gitignored)
│  ├─ icons/                     App icons (placeholders for now)
│  ├─ capabilities/              Tauri v2 ACLs
│  └─ tauri.conf.json
└─ scripts/
   ├─ fetch-sidecars.ps1         Windows / cross-host
   └─ fetch-sidecars.sh          Linux / macOS
```

## Out of scope for the skeleton

- Real progress parsing for yt-dlp output
- Cookies-from-browser UX (the Rust commands accept the flag, but the frontend dropdown is not wired)
- Disclaimer screen
- Real app icons (see `src-tauri/icons/README.md`)
- VTT → TXT subtitle conversion
- Auto-updater / telemetry / crash reporting

These land in follow-up PRs, one per feature.
