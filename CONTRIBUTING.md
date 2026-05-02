# Contributing to ClipForge

Thanks for considering a contribution! This document explains how to set up your environment, what we expect from a pull request, and the Contributor License Agreement that every non-trivial contribution must be made under.

ClipForge ships **two parallel builds** (see [README — Two builds available](README.md#two-builds-available)):

- **Stable Python build** at the repo root — see _Development setup_ below for the Python flow.
- **Preview Tauri build** under [`tauri/`](tauri/) — see [`tauri/README.md`](tauri/README.md) for the Rust + React + pnpm flow. For Tauri-specific translations, see [`tauri/src/locales/README.md`](tauri/src/locales/README.md).

### Release tag conventions

The two builds are released independently from the same `main` branch via different tag patterns. The CI workflows are scoped so they never trigger each other.

| Build | Tag pattern | CI workflow | Output |
|---|---|---|---|
| Python (stable) | `vX.Y.Z` (e.g. `v1.0.0`) | [`.github/workflows/release.yml`](.github/workflows/release.yml) | `ClipForge-windows.exe`, `ClipForge-linux`, `ClipForge-macos-arm64` |
| Tauri (preview) | `tauri-vX.Y.Z` (e.g. `tauri-v0.1.0`) | [`.github/workflows/release-tauri.yml`](.github/workflows/release-tauri.yml) | `.msi`/`.exe` (Win), `.deb`/`.AppImage` (Linux), `.dmg` (macOS arm64 + Intel best-effort) |

To cut a release: `git tag <pattern> && git push --tags`. Both workflows publish to a draft GitHub Release that you promote manually.

---

## Development setup

Requirements: Python 3.10+, Git. Tested on Windows; the cross-platform build/run scripts also cover Linux and macOS.

**Windows**

```bat
git clone https://github.com/Michel-IT/ClipForge.git
cd ClipForge
scripts\run-windows.bat
```

**Linux / macOS**

```bash
git clone https://github.com/Michel-IT/ClipForge.git
cd ClipForge
chmod +x scripts/run-unix.sh
scripts/run-unix.sh
```

To produce the bundled binary:

```bash
scripts\build-windows.bat   # Windows  → dist\windows\ClipForge.exe
scripts/build-linux.sh      # Linux    → dist/linux/ClipForge
scripts/build-macos.sh      # macOS    → dist/macos/ClipForge-macos-{arm64,intel}
```

The build scripts auto-upgrade `yt-dlp` and the other Python dependencies on every run, so each fresh build tracks the latest extractor changes.

## Coding style

ClipForge is a small single-file GUI app. We optimize for **readability and minimum surface area**, not abstractions:

- Match the existing patterns in [clipforge.py](clipforge.py) — same naming, same threading model (one daemon thread per long-running operation, all UI updates funneled through `self.after(0, ...)`).
- No new dependencies unless absolutely necessary. If you add one, justify it in the PR description and pin the version in `requirements.txt`.
- Don't over-engineer. Three similar lines is fine; a premature abstraction is not.
- Don't add scaffolding for "future use". If we need it later, we'll add it later.
- No comments that just restate the code. A short comment is welcome when it explains a non-obvious *why* (a workaround, a hidden constraint).
- All new user-facing strings must be in **English**.

## Pull request checklist

Before opening a PR, please confirm:

- [ ] You ran the build script for your platform (`scripts\build-windows.bat`, `scripts/build-linux.sh`, or `scripts/build-macos.sh`) and the resulting binary launches, accepts the disclaimer, and runs at least one happy-path download.
- [ ] You ran `python -c "import ast; ast.parse(open('clipforge.py').read())"` and got `OK`.
- [ ] You did not add a new third-party dependency without discussing it in an issue first.
- [ ] You did not introduce wording (in code, UI, or documentation) that could be read as encouragement to bypass DRM, scrape commercial content, or violate any platform's Terms of Service.
- [ ] You signed the Contributor License Agreement below by adding a comment to your PR — see next section.

## Reporting bugs

Open an issue with:

- ClipForge version (or commit SHA)
- Windows version
- The URL or kind of URL that triggered the bug (do **not** paste private/age-gated URLs)
- The full content of the in-app log panel
- Steps to reproduce

Do not open issues that are essentially "this site no longer works" — those are upstream `yt-dlp` issues. Update `yt-dlp` first (`pip install -U yt-dlp` in your venv, or wait for a new ClipForge release that bumps the pinned version).

---

## Contributor License Agreement

ClipForge is released under the GNU Affero General Public License v3.0. The author wants to keep the option of dual-licensing future versions (e.g. releasing a paid commercial edition alongside the AGPL community edition). To preserve this option, every non-trivial contribution must be made under the following Contributor License Agreement.

**By posting a comment on your pull request that contains the exact text below, you grant the rights described and confirm the statements made.**

```
I have read the Contributor License Agreement in CONTRIBUTING.md
and I agree to it for the contribution submitted in this pull request.

Signed: <your full legal name> <your-github-handle>
Date:   <YYYY-MM-DD>
```

### CLA — terms

1. **Definitions.** "Contribution" means any source code, documentation, configuration, asset, or other work that you intentionally submit to the ClipForge project. "You" means the individual or legal entity making the Contribution. "Author" means the original copyright holder of ClipForge — currently **Michel-IT**, GitHub user `Michel-IT`.

2. **Copyright assignment + grant-back.** You assign to the Author all of your right, title, and interest in the copyright of your Contribution, worldwide and in perpetuity. The Author grants you back a perpetual, worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your Contribution under any open-source license of your choice.

3. **Patent license.** You grant the Author and the recipients of the project a perpetual, worldwide, non-exclusive, royalty-free patent license to make, use, sell, offer for sale, import, and otherwise transfer your Contribution, for any patent claims that you own or control that are necessarily infringed by the Contribution alone or by combination of the Contribution with the project.

4. **Original work.** You represent that each Contribution is your original work, or that you have the right to submit it under this CLA. If your employer has rights to intellectual property that you create, you represent that you have received permission to make the Contribution on behalf of that employer, or that your employer has waived such rights for the Contribution.

5. **No warranty.** You provide the Contribution "as is", without any warranty (express or implied). You are not required to provide support for your Contribution.

6. **Right to relicense.** You acknowledge that the Author may release the project (including your Contribution) under licenses other than AGPL-3.0, including commercial / proprietary licenses, and that such relicensing does not entitle you to any compensation.

7. **Severability.** If any provision of this CLA is held to be unenforceable, the remaining provisions shall remain in full force and effect.

The Author may, at his sole discretion, accept Contributions that are too small to require a CLA (typo fixes, single-character changes, formatting). Contributions whose authorship is unclear may be rejected.

---

## Code of conduct

Be respectful. Assume good faith. Stay on topic. Comments that are abusive, harassing, or that promote illegal use of the project will be removed and the author may be banned from the repository.
