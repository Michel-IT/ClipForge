@echo off
REM Builds the ClipForge Tauri release bundles for Windows x64.
REM Mirrors what .github/workflows/release-tauri.yml does on windows-latest,
REM so a local build and a CI build produce the same artifacts.
REM
REM Why this script exists: the yt-dlp/ffmpeg sidecars are gitignored and are
REM NOT refreshed by `pnpm tauri build`. Building without re-running
REM fetch-sidecars silently ships whatever binary happens to sit in
REM src-tauri/binaries/ — that is exactly how v0.1.0..v0.1.3 all went out with
REM yt-dlp 2026.03.17 and started failing on YouTube with HTTP 403.
REM Refreshing the sidecars is therefore part of the build, not a separate step.

setlocal
set "TARGET=x86_64-pc-windows-msvc"

REM Ensure cargo / rustc are on PATH for this session.
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

REM cd to tauri/ (parent of this scripts/ folder).
cd /d "%~dp0\.."

echo.
echo === 1/3 Refreshing sidecars (yt-dlp + ffmpeg) ===
where pwsh >nul 2>&1
if %ERRORLEVEL%==0 (
    pwsh ./scripts/fetch-sidecars.ps1 --target %TARGET% || goto :failed
) else (
    powershell -ExecutionPolicy Bypass -File ./scripts/fetch-sidecars.ps1 --target %TARGET% || goto :failed
)

echo.
echo === 2/3 Installing frontend dependencies ===
REM --frozen-lockfile matches CI: fails loudly if pnpm-lock.yaml is stale
REM instead of silently resolving different versions than the release build.
call pnpm install --frozen-lockfile || goto :failed

echo.
echo === 3/3 Building Tauri bundles ===
call pnpm tauri build --target %TARGET% || goto :failed

echo.
echo Build complete. Bundles are in:
echo   src-tauri\target\%TARGET%\release\bundle\msi\
echo   src-tauri\target\%TARGET%\release\bundle\nsis\
if "%CI%"=="" pause
endlocal
exit /b 0

:failed
echo.
echo BUILD FAILED - see the output above.
if "%CI%"=="" pause
endlocal
exit /b 1
