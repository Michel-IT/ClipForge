# ClipForge — Build guide

Step-by-step instructions to build a single-file ClipForge binary on Windows, Linux and macOS.

> **Why build it yourself?** The build scripts always upgrade `yt-dlp` (and the other Python deps) before invoking PyInstaller. `yt-dlp` ships extractor patches almost every day, so a fresh build is the simplest way to stay aligned with the latest YouTube / TikTok / Instagram / Facebook / X / etc. backend changes. Pre-built releases on GitHub will get stale within weeks.

---

## 1. Prerequisites

| | Required | Notes |
|---|---|---|
| Python | **3.10 or newer** | `python --version` (Windows) or `python3 --version` (Linux/macOS). |
| Git | latest | To clone the repo. |
| Disk | ~500 MB | For `venv` + PyInstaller cache + `dist/`. |
| Internet | yes | Pip pulls fresh `yt-dlp` on every build. |

### Windows

- [Python 3.x for Windows](https://www.python.org/downloads/windows/) — at install time, tick **"Add Python to PATH"**.
- [Git for Windows](https://git-scm.com/download/win) — installs `git` on the PATH and the Git Credential Manager.

### Linux (Debian / Ubuntu / Mint)

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip python3-tk git
```

The `python3-tk` package is required: `customtkinter` is built on top of Tk.

### Linux (Fedora / RHEL / Rocky)

```bash
sudo dnf install python3 python3-pip python3-tkinter git
```

### Linux (Arch / Manjaro)

```bash
sudo pacman -S python python-pip tk git
```

### macOS

```bash
# Install Homebrew first if you don't have it: https://brew.sh
brew install python git
```

The Tk bindings ship with Apple's Python and with Homebrew Python.

---

## 2. Clone the repository

```bash
git clone https://github.com/Michel-IT/ClipForge.git
cd ClipForge
```

---

## 3. Build the binary

### Windows

From the project root in `cmd.exe` or PowerShell:

```bat
scripts\build.bat
```

What happens:
1. Creates `venv\` (only on the first run).
2. `pip install --upgrade pip pyinstaller`.
3. `pip install --upgrade -r requirements.txt` → fresh `yt-dlp`, `customtkinter`, `imageio-ffmpeg`.
4. Wipes `build\` and `dist\`.
5. `pyinstaller --clean --noconfirm clipforge.spec` → produces `dist\windows\ClipForge.exe` (~56 MB).
6. Pauses for any final keypress.

**Output:** `dist\windows\ClipForge.exe`. Double-click to launch. The disclaimer dialog appears first; you must scroll to the bottom and click "I Accept" before the main window opens.

### Linux

```bash
chmod +x scripts/build.sh scripts/run.sh
scripts/build.sh
```

**Output:** `dist/<platform>/ClipForge` — a single ELF binary. Make it executable if it isn't already (`chmod +x dist/<platform>/ClipForge`) and launch with:

```bash
./dist/<platform>/ClipForge
```

### macOS

```bash
chmod +x scripts/build.sh scripts/run.sh
scripts/build.sh
```

**Output:** `dist/<platform>/ClipForge` — a single Mach-O binary. Launch with:

```bash
./dist/<platform>/ClipForge
```

Want a real `.app` bundle? Drop a `assets/icon.icns` next to `assets/icon.ico` and re-run `scripts/build.sh`. PyInstaller will pick up the `.icns` and embed it. (For a true `.app` package with `Info.plist` and code signing you'll need to extend [clipforge.spec](../clipforge.spec) — see the [PyInstaller macOS docs](https://pyinstaller.org/en/stable/feature-notes.html#macos-app-bundles).)

> macOS Gatekeeper will refuse to launch unsigned binaries downloaded from the internet. For your own builds this isn't a problem (Gatekeeper trusts files you compiled locally). To distribute the binary to other Macs you need an Apple Developer ID and a code signature — out of scope for this guide.

---

## 4. Run from source without building

If you just want to develop / debug, skip PyInstaller and run the Python script directly:

| Platform | Command |
|---|---|
| Windows | `scripts\run.bat` |
| Linux / macOS | `scripts/run.sh` |

Both scripts upgrade `yt-dlp` on every invocation, so you always pick up the latest extractor changes without rebuilding.

Manual fallback (any platform):

```bash
python -m venv venv
# Windows:        venv\Scripts\activate
# Linux / macOS:  source venv/bin/activate
pip install --upgrade -r requirements.txt
python clipforge.py
```

---

## 5. Verifying the build

After launching the binary you should see, in order:

1. **The legal disclaimer dialog** — full text, "I Accept" disabled until you scroll to the bottom.
2. After clicking "I Accept", the **main window** with the ClipForge title bar, an empty platform badge, three green capability pills, the four tabs (Video MP4 / Audio MP3 / Subtitles → Text / Settings) and the progress bar.

A quick happy-path smoke test:

1. Paste a public, short YouTube URL.
2. Watch the platform badge go red and read "YouTube".
3. Click `Video info` → title / uploader / duration appear under the URL field.
4. Tab `Audio MP3`, pick `192 kbps`, click `Extract MP3`.
5. The progress bar fills up; status flips to `MP3 ready`.
6. Open the output folder (button "Open" next to the Output field) → the `.mp3` is there.

If any of these steps fails, see Troubleshooting below.

---

## 6. Keeping yt-dlp up to date

`yt-dlp` is the engine that talks to every supported site. When YouTube / TikTok / Instagram change their internal API (which they do all the time), `yt-dlp` ships a fix within hours-to-days. ClipForge inherits the fix automatically:

- **Build scripts**: always run `pip install --upgrade -r requirements.txt` → fresh `yt-dlp`.
- **Run-from-source scripts**: always run `pip install --upgrade yt-dlp` after activating the venv.
- **Pre-built EXE / binary**: rebuild it. The simplest way is to re-run the build script for your platform.

If a download fails with a "site no longer supported" or "extractor error" message:

1. Re-run the build script (or the run script) — usually fixes it.
2. If it doesn't, check the [yt-dlp issues page](https://github.com/yt-dlp/yt-dlp/issues) — there might be a pending fix.
3. Open an issue on this repo only if the problem is in ClipForge's code (the GUI, the dispatcher, the build), not in `yt-dlp` itself.

---

## 7. Troubleshooting

### Windows: `python` is not recognised

Python isn't on the PATH. Reinstall from [python.org](https://www.python.org/downloads/windows/) and tick "Add Python to PATH" on the first installer screen, or add `C:\Users\<you>\AppData\Local\Programs\Python\Python3xx` to PATH manually.

### Windows: `pyinstaller` is not recognised after activating the venv

The venv was created but the activation didn't apply. Make sure you ran `call venv\Scripts\activate` (note the `call`) — without it, `setlocal` resets the environment. The build script does this for you; if you're running commands manually, use `venv\Scripts\activate.bat`.

### Linux: `ModuleNotFoundError: No module named '_tkinter'`

The system Python doesn't include the Tk bindings. Install them:

- Debian / Ubuntu: `sudo apt install python3-tk`
- Fedora: `sudo dnf install python3-tkinter`
- Arch: `sudo pacman -S tk`

Then delete `venv/`, re-run `scripts/build.sh`.

### macOS: `Failed to execute script 'clipforge'` on launch

The bundled binary may have been blocked by Gatekeeper. Open `System Settings → Privacy & Security`, scroll down to the "ClipForge was blocked" message, click "Open Anyway". Or right-click the binary in Finder → "Open" → confirm.

### Build error: `Could not copy Chrome cookie database`

This is a runtime error, not a build error. It happens when you set the cookie source to a browser in Settings while that browser is running. Close the browser, or set "Cookies from" to **None** in Settings.

### Build succeeds but the EXE is huge (>100 MB)

PyInstaller picked up extra binaries (e.g. CUDA, full ffmpeg variants). Check `clipforge.spec` — it should pull only `yt_dlp`, `customtkinter`, `imageio_ffmpeg`. If you customised it, double-check the `binaries=` and `datas=` lists.

### `yt-dlp` upgrades but the EXE keeps using the old version

The EXE bundles its own copy of `yt-dlp`. Upgrading the venv only affects the run-from-source path. **Rebuild the EXE** to refresh the bundled `yt-dlp`.

### "I Accept" button stays disabled

Scroll to the very bottom of the disclaimer text. The button is enabled by a scroll-position callback (`yview()[1] >= 0.99`). If you reach the bottom and the button is still grey, click inside the textbox once — the focus event triggers a recheck.

---

## 8. Publishing a release (maintainer)

The repository ships a [GitHub Actions workflow](../.github/workflows/release.yml) that builds ClipForge on Windows, Linux and macOS and attaches the three binaries to a public Release. To cut a new version:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions takes ~10 minutes per OS (parallel) and produces:

- `ClipForge-windows.exe`
- `ClipForge-linux`
- `ClipForge-macos`

All three are uploaded to a Release titled with the tag name, with auto-generated release notes (commits since the previous tag). The "Latest release" download links in [README.md](../README.md) automatically point to the most recent tag.

To re-run the build for an existing tag (e.g. after fixing a CI bug), use the **Run workflow** button on the Actions → Release page.

To dry-run locally without publishing, just run `scripts/build.bat` (Windows) or `scripts/build.sh` (Linux/macOS).

---

## 9. Where to file issues

- **Build / GUI / dispatcher bugs in ClipForge** → [github.com/Michel-IT/ClipForge/issues](https://github.com/Michel-IT/ClipForge/issues).
- **Site extractor bugs** (`Unable to extract...`, `Sign in to confirm you're not a bot`, etc.) → [github.com/yt-dlp/yt-dlp/issues](https://github.com/yt-dlp/yt-dlp/issues). These are fixed upstream; rebuild ClipForge after the fix lands.

---

For contribution guidelines and the CLA, see [CONTRIBUTING.md](../CONTRIBUTING.md).
For the legal terms governing the use of ClipForge, see [DISCLAIMER.md](../DISCLAIMER.md).
