@echo off
REM ============================================================================
REM ClipForge — translation pipeline launcher (Windows)
REM ----------------------------------------------------------------------------
REM Run with no args to see usage. Pass one of: align | fill | translate | all
REM
REM   align     -> structural sync. Adds keys missing in 44 placeholder langs
REM                from tauri/src/locales/en/translation.json. Zero token cost.
REM                Run this any time the EN master gains new keys.
REM
REM   fill      -> one-shot generator (Claude-direct strings, hardcoded).
REM                Overwrites the 44 placeholder langs. Use sparingly.
REM
REM   translate -> auto-translate via DeepL Free + OpenAI fallback.
REM                Requires env vars DEEPL_API_KEY and/or OPENAI_API_KEY.
REM                Won't overwrite langs marked _meta.source = "human".
REM                Pass --only=de,fr,es to limit scope.
REM
REM   all       -> align then translate (recommended after EN master updates).
REM ============================================================================

setlocal
cd /d "%~dp0"

if "%1"=="" goto :usage
if "%1"=="align"     goto :align
if "%1"=="fill"      goto :fill
if "%1"=="translate" goto :translate
if "%1"=="all"       goto :all
goto :usage

:align
echo [align-locales] Structural sync...
python align-locales.py
goto :end

:fill
echo [fill-translations] Regenerating 44 placeholder langs (Claude-direct)...
python fill-translations.py
goto :end

:translate
echo [translate-locales] Auto-translating via DeepL/OpenAI...
shift
node translate-locales.mjs %*
goto :end

:all
echo [1/2] align-locales...
python align-locales.py
if errorlevel 1 goto :end
echo [2/2] translate-locales...
node translate-locales.mjs
goto :end

:usage
echo.
echo Usage:  run.bat ^<command^> [args]
echo.
echo Commands:
echo   align       Structural sync (zero cost, no API keys needed)
echo   fill        Regenerate placeholders from hardcoded Claude-direct strings
echo   translate   Auto-translate via DeepL/OpenAI (needs API keys in env)
echo   all         align then translate
echo.
echo Examples:
echo   run.bat align
echo   run.bat translate --only=de,fr,es
echo   set DEEPL_API_KEY=xxx ^&^& run.bat translate
echo.

:end
endlocal
