#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Stages yt-dlp + ffmpeg sidecars in tauri/src-tauri/binaries/ named per Tauri's
  <basename>-<target-triple> convention.

.PARAMETER Target
  Rust target triple to stage. Defaults to the host's default target
  (parsed from `rustc -vV`).
#>

$ErrorActionPreference = "Stop"

# Manual arg parsing so both `-Target X` and `--target X` work — needed because
# the CI workflow calls this script from `bash` with the `--target` long form
# and PowerShell parameter binding does not natively accept the double-dash.
$Target = $null
for ($i = 0; $i -lt $args.Count; $i++) {
    switch ($args[$i]) {
        { $_ -in @('-Target','--target','-t') } {
            if ($i + 1 -ge $args.Count) { throw "Missing value for $($args[$i])" }
            $Target = $args[$i + 1]
            $i++
        }
        default { throw "Unknown argument: $($args[$i])" }
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root      = Split-Path -Parent $scriptDir
$binDir    = Join-Path $root "src-tauri\binaries"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

if (-not $Target) {
    $rustcOut = & rustc -vV 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "rustc not found. Install Rust (https://rustup.rs) or pass -Target explicitly."
    }
    $hostLine = ($rustcOut -split "`n") | Where-Object { $_ -match '^host:' } | Select-Object -First 1
    if (-not $hostLine) { throw "Could not parse host triple from rustc -vV output." }
    $Target = ($hostLine -split ':', 2)[1].Trim()
}

Write-Host "Staging sidecars for target: $Target"

function Save-File($Url, $Out) {
    Write-Host "  GET $Url"
    Invoke-WebRequest -Uri $Url -OutFile $Out -UseBasicParsing
}

$tmpRoot = Join-Path $env:TEMP ("clipforge-sidecars-" + [System.Guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null

try {
    switch ($Target) {
        "x86_64-pc-windows-msvc" {
            $ytDst = Join-Path $binDir "yt-dlp-$Target.exe"
            Save-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" $ytDst

            $zip = Join-Path $tmpRoot "ffmpeg.zip"
            Save-File "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" $zip
            Expand-Archive -Path $zip -DestinationPath $tmpRoot -Force
            $ffmpegSrc = Get-ChildItem -Path $tmpRoot -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
            if (-not $ffmpegSrc) { throw "ffmpeg.exe not found inside the gyan.dev archive." }
            Move-Item -Force $ffmpegSrc.FullName (Join-Path $binDir "ffmpeg-$Target.exe")
        }

        "x86_64-unknown-linux-gnu" {
            $ytDst = Join-Path $binDir "yt-dlp-$Target"
            Save-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" $ytDst
            if ($IsLinux -or $IsMacOS) { & chmod +x $ytDst }

            $tar = Join-Path $tmpRoot "ffmpeg.tar.xz"
            Save-File "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" $tar
            Push-Location $tmpRoot
            try { & tar -xJf $tar } finally { Pop-Location }
            $ffmpegSrc = Get-ChildItem -Path $tmpRoot -Recurse -Filter "ffmpeg" -File `
                | Where-Object { -not $_.Name.EndsWith(".exe") } `
                | Select-Object -First 1
            if (-not $ffmpegSrc) { throw "ffmpeg not found inside the johnvansickle archive." }
            $dst = Join-Path $binDir "ffmpeg-$Target"
            Move-Item -Force $ffmpegSrc.FullName $dst
            if ($IsLinux -or $IsMacOS) { & chmod +x $dst }
        }

        { $_ -eq "aarch64-apple-darwin" -or $_ -eq "x86_64-apple-darwin" } {
            # `yt-dlp_macos` is universal2 — works on both arm64 and Intel.
            # Upstream retired `yt-dlp_macos_legacy` (now 404), so we use the
            # universal binary for both macOS targets.
            $ytUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos"
            $ytDst = Join-Path $binDir "yt-dlp-$Target"
            Save-File $ytUrl $ytDst
            if ($IsMacOS -or $IsLinux) { & chmod +x $ytDst }

            $zip = Join-Path $tmpRoot "ffmpeg.zip"
            Save-File "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip" $zip
            Expand-Archive -Path $zip -DestinationPath $tmpRoot -Force
            $ffmpegSrc = Get-ChildItem -Path $tmpRoot -Recurse -Filter "ffmpeg" -File `
                | Where-Object { -not $_.Name.EndsWith(".exe") } `
                | Select-Object -First 1
            if (-not $ffmpegSrc) { throw "ffmpeg not found inside the evermeet archive." }
            $dst = Join-Path $binDir "ffmpeg-$Target"
            Move-Item -Force $ffmpegSrc.FullName $dst
            if ($IsMacOS -or $IsLinux) { & chmod +x $dst }
        }

        default { throw "Unsupported target: $Target" }
    }
}
finally {
    if (Test-Path $tmpRoot) { Remove-Item -Recurse -Force $tmpRoot }
}

Write-Host ""
Write-Host "Sidecars staged in $binDir :"
Get-ChildItem $binDir | Where-Object { $_.Name -notlike "*.gitkeep" -and $_.Name -ne "README.md" } `
    | ForEach-Object { Write-Host "  $($_.Name)" }
