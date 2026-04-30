@echo off
setlocal
cd /d "%~dp0\.."

IF NOT EXIST venv (
    python -m venv venv
)
call venv\Scripts\activate

python -m pip install --upgrade pip
python -m pip install --upgrade pyinstaller
python -m pip install --upgrade -r requirements.txt

rmdir /S /Q build 2>nul
rmdir /S /Q dist\windows 2>nul

pyinstaller --clean --noconfirm --distpath dist\windows clipforge.spec

echo.
echo Build complete: dist\windows\ClipForge.exe
pause
