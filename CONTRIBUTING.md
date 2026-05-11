# Contributing to ClipForge

Thanks for considering a contribution! This document explains how to set up your environment, what we expect from a pull request, and the Contributor License Agreement that every non-trivial contribution must be made under.

ClipForge is a **Tauri-based desktop application** (Rust backend + React/TypeScript frontend). The application code lives under [`tauri/`](tauri/) — see [`tauri/README.md`](tauri/README.md) for the build flow. For UI translations, see [`tauri/src/locales/README.md`](tauri/src/locales/README.md).

The original Python single-file build was retired in May 2026 and lives under [`legacy/`](legacy/README.md) for historical reference. No new Python releases are produced.

### Release tag conventions

Releases follow the `tauri-vX.Y.Z` tag pattern. CI workflow: [`.github/workflows/release-tauri.yml`](.github/workflows/release-tauri.yml). Outputs per release: `.msi`/`-setup.exe` (Windows), `.deb`/`.rpm`/`.AppImage` (Linux), `.dmg`/`.app.tar.gz` (macOS arm64), `.dmg` (macOS Intel — built manually on an Intel Mac, since the `macos-13` GitHub Actions runner pool is permanently saturated).

To cut a release: `git tag tauri-vX.Y.Z && git push origin tauri-vX.Y.Z`. The workflow publishes to a draft GitHub Release that you finalize manually (asset rename + Intel DMG upload + publish non-latest).

---

## Development setup

Requirements: Rust toolchain (`rustup`), Node 20+, [`pnpm`](https://pnpm.io/) 9, Git. Platform-specific sidecar binaries (`yt-dlp`, `ffmpeg`) are fetched by the project scripts.

```bash
git clone https://github.com/Michel-IT/ClipForge.git
cd ClipForge/tauri
pnpm install --frozen-lockfile
# Fetch sidecars for your host (Windows / Linux / macOS):
pwsh ./scripts/fetch-sidecars.ps1            # Windows (PowerShell)
bash ./scripts/fetch-sidecars.sh             # Linux / macOS
pnpm tauri dev                               # run from source
pnpm tauri build                             # build a release artifact
```

Full prerequisites + per-OS troubleshooting in [`tauri/README.md`](tauri/README.md).

## Coding style

ClipForge optimizes for **readability and minimum surface area**, not abstractions:

- Match existing patterns in [`tauri/src/`](tauri/src/) (React) and [`tauri/src-tauri/src/`](tauri/src-tauri/src/) (Rust).
- No new dependencies unless absolutely necessary. If you add one, justify it in the PR description and pin the version in `package.json` / `Cargo.toml`.
- Don't over-engineer. Three similar lines is fine; a premature abstraction is not.
- Don't add scaffolding for "future use". If we need it later, we'll add it later.
- No comments that just restate the code. A short comment is welcome when it explains a non-obvious *why* (a workaround, a hidden constraint).
- All new user-facing strings must be in **English** in the master locale [`tauri/src/locales/en/translation.json`](tauri/src/locales/en/translation.json). After adding new keys, run `python scripts/utility/translate/align-locales.py` to structurally sync the 44 placeholder locales.

## Pull request checklist

Before opening a PR, please confirm:

- [ ] You ran `pnpm tauri build` and the resulting binary launches, accepts the disclaimer, and runs at least one happy-path download.
- [ ] You ran `pnpm tsc --noEmit` and got no TypeScript errors.
- [ ] You ran `cargo check` inside `tauri/src-tauri/` and got no Rust errors.
- [ ] If you added new locale keys, you ran `python scripts/utility/translate/align-locales.py`.
- [ ] You did not add a new third-party dependency without discussing it in an issue first.
- [ ] You did not introduce wording (in code, UI, or documentation) that could be read as encouragement to bypass DRM, scrape commercial content, or violate any platform's Terms of Service.
- [ ] You signed the Contributor License Agreement below by adding a comment to your PR — see next section.

## Reporting bugs

Open an issue with:

- ClipForge version (or commit SHA)
- OS + architecture (Windows / Linux / macOS arm64 or Intel)
- The URL or kind of URL that triggered the bug (do **not** paste private URLs)
- The full content of the in-app download modal log panel
- Steps to reproduce

Do not open issues that are essentially "this site no longer works" — those are upstream `yt-dlp` issues. Wait for a new ClipForge release: each `tauri-vX.Y.Z` build re-fetches the latest `yt-dlp` sidecar via the project's `fetch-sidecars` script, so a new release ships with the current extractors.

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
