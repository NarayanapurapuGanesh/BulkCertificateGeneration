@echo off
REM Bulk Certificate Generator - Windows launcher
REM Starts the local backend, which also serves the built frontend
REM if you've already run "npm run build" inside the frontend folder.

cd /d "%~dp0backend"

if not exist venv (
    echo Setting up first run only...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

python main.py
pause
