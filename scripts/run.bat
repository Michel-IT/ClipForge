@echo off
setlocal
cd /d "%~dp0\.."

IF NOT EXIST venv (
    python -m venv venv
    call venv\Scripts\activate
    python -m pip install --upgrade pip
    python -m pip install --upgrade -r requirements.txt
) ELSE (
    call venv\Scripts\activate
    python -m pip install --upgrade yt-dlp
)

python clipforge.py
