@echo off
REM Launches ClipForge in Tauri dev mode.
REM First run compiles Rust (~5-10 min), opens a native window when done.
REM Subsequent runs reuse the cargo cache (~30s).

setlocal

REM Ensure cargo / rustc are on PATH for this session.
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

REM cd to tauri/ (parent of this scripts/ folder).
cd /d "%~dp0\.."

REM Free port 5173 if a zombie Vite is holding it.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') do (
    echo Killing process %%a holding port 5173...
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo === ClipForge Tauri dev ===
echo Working directory: %CD%
echo.

call npm run tauri dev

endlocal
