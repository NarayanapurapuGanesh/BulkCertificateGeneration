@echo off
REM Bulk Certificate Generator - Windows Desktop Launcher
cd /d "%~dp0backend"

if not exist venv (
    echo Setting up first run only...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

python desktop.py
if %errorlevel% neq 0 (
    echo Falling back to web server launcher...
    python main.py
)
