# Legacy — Python single-file build (retired)

This folder contains the **retired** Python + PyInstaller build of ClipForge that was the project's first incarnation (releases `vX.Y.Z`). It is preserved here for historical reference only.

## Status

- **No new Python releases will be cut.** The last shipped Python release is `v0.1.4`.
- **The `release.yml` workflow has been disabled** (renamed to `release.yml.disabled`) and will not run on tag push.
- **No bug fixes, security patches, or yt-dlp updates will be backported** to this code path.
- For the current, maintained application use the **Tauri build**: see the top-level [README.md](../README.md) and the [latest Tauri release](https://github.com/Michel-IT/ClipForge/releases?q=tauri&expanded=true).

## Why retired?

The Tauri build (React + TypeScript + Rust) reached feature parity with the Python build in `tauri-v0.1.2`, ships a smaller installer (native ~10 MB + WebView2 vs. bundled `.exe` ~56 MB), supports 46 locales auto-detected from the OS, ships with a hardened legal posture (tool-neutrality clause, indemnification clause, donations clause, Privacy Policy, Terms of Use), and uses a maintained UI stack. Maintaining two parallel build pipelines was not justified.

## Contents

| Path | Purpose |
|---|---|
| `clipforge.py` | Single-file application (~1000 lines, CustomTkinter UI) |
| `clipforge.spec` | PyInstaller spec (bundled `ffmpeg`, `yt-dlp`, `customtkinter`, icon) |
| `requirements.txt` | Python dependencies |
| `scripts/build-windows.bat` | Windows build (venv + PyInstaller) |
| `scripts/build-linux.sh` | Linux build |
| `scripts/build-macos.sh` | macOS build (handles Tcl/Tk SDK mismatch) |
| `scripts/run-windows.bat`, `scripts/run-unix.sh` | Run from source without building |
| `docs/BUILD.md` | Original Python build guide |
| `.github/release.yml.disabled` | The CI workflow that produced `vX.Y.Z` releases (disabled — file extension prevents GitHub Actions from picking it up) |

## Re-activating the build (not recommended)

If you have a specific reason to build the Python variant from this folder, all scripts still work — you'll need Python 3.10+ and a few minutes for `pip install`. See [`docs/BUILD.md`](docs/BUILD.md). The bundled `yt-dlp` will be the version pinned at the time the build is run; nothing maintains it.

If you re-enable the GitHub Actions workflow (rename `release.yml.disabled` → `release.yml` under `.github/workflows/`), be aware that the legal posture is the one shipped at the time of `v0.1.4` — it predates the additions made to [DISCLAIMER.md](../DISCLAIMER.md) in May 2026 (tool-neutrality clause §3-bis, indemnification §4-bis, donations §13, trademark §12, full Tauri component list). Either backport those additions before re-cutting a release, or do not re-enable.
