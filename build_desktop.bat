@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo   Bulk Certificate Generator - Desktop App Builder
echo =======================================================
echo.

cd /d "%~dp0"

REM 1. Build frontend bundle
echo [1/3] Building frontend bundle...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)
cd ..

REM 2. Prepare Python Environment
echo [2/3] Checking backend dependencies...
cd backend
if not exist venv (
    echo Setting up Python virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

REM 3. Compile standalone EXE with PyInstaller
echo [3/3] Compiling standalone desktop .exe with PyInstaller...
venv\Scripts\pyinstaller.exe --noconsole --onefile ^
  --name "BulkCertificateGenerator" ^
  --icon "..\app_icon.ico" ^
  --clean ^
  --add-data "..\frontend\dist;frontend\dist" ^
  --hidden-import "uvicorn" ^
  --hidden-import "uvicorn.logging" ^
  --hidden-import "uvicorn.loops" ^
  --hidden-import "uvicorn.loops.asyncio" ^
  --hidden-import "uvicorn.protocols" ^
  --hidden-import "uvicorn.protocols.http" ^
  --hidden-import "uvicorn.protocols.http.auto" ^
  --hidden-import "uvicorn.protocols.http.h11_impl" ^
  --hidden-import "uvicorn.protocols.http.httptools_impl" ^
  --hidden-import "uvicorn.protocols.websockets" ^
  --hidden-import "uvicorn.protocols.websockets.auto" ^
  --hidden-import "uvicorn.lifespans" ^
  --hidden-import "uvicorn.lifespans.off" ^
  --hidden-import "fastapi" ^
  --hidden-import "fastapi.staticfiles" ^
  --hidden-import "fastapi.middleware.cors" ^
  --hidden-import "starlette.staticfiles" ^
  --hidden-import "pymupdf" ^
  --hidden-import "pypdf" ^
  --hidden-import "openpyxl" ^
  --hidden-import "clr_loader" ^
  --hidden-import "pythonnet" ^
  --hidden-import "webview" ^
  --distpath "..\dist_app" ^
  --workpath "..\build_cache" ^
  desktop.py

if %errorlevel% neq 0 (
    echo [ERROR] PyInstaller build failed.
    pause
    exit /b %errorlevel%
)

REM Clean up build cache
cd ..
if exist build_cache rmdir /s /q build_cache
if exist backend\BulkCertificateGenerator.spec del /f /q backend\BulkCertificateGenerator.spec

echo.
echo =======================================================
echo   BUILD COMPLETE!
echo   Executable located at: dist_app\BulkCertificateGenerator.exe
echo =======================================================
echo.
pause
