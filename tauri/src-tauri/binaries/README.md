# Sidecar binaries

This folder is populated by the `tauri/scripts/fetch-sidecars.{ps1,sh}` script. It must contain — at minimum — the `yt-dlp` and `ffmpeg` binaries for the host's Rust target triple, named per Tauri's sidecar convention:

```
yt-dlp-<target-triple>[.exe]
ffmpeg-<target-triple>[.exe]
```

Examples:

| Host        | Triple                       | Files                                                                |
|-------------|------------------------------|----------------------------------------------------------------------|
| Windows x64 | `x86_64-pc-windows-msvc`     | `yt-dlp-x86_64-pc-windows-msvc.exe`, `ffmpeg-x86_64-pc-windows-msvc.exe` |
| Linux x64   | `x86_64-unknown-linux-gnu`   | `yt-dlp-x86_64-unknown-linux-gnu`, `ffmpeg-x86_64-unknown-linux-gnu`     |
| macOS arm64 | `aarch64-apple-darwin`       | `yt-dlp-aarch64-apple-darwin`, `ffmpeg-aarch64-apple-darwin`             |
| macOS x64   | `x86_64-apple-darwin`        | `yt-dlp-x86_64-apple-darwin`, `ffmpeg-x86_64-apple-darwin`               |

The actual binaries are gitignored — they are downloaded fresh by every CI runner and dev machine to keep the repo small and the upstream versions current.

## Usage

```bash
# from tauri/
pwsh ./scripts/fetch-sidecars.ps1                            # autodetects host triple
bash ./scripts/fetch-sidecars.sh --target aarch64-apple-darwin   # explicit override
```
