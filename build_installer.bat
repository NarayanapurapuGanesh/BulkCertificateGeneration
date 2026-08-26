@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo   Bulk Certificate Generator - Windows Installer Builder
echo =======================================================
echo.

cd /d "%~dp0"

REM 1. Ensure the standalone EXE is built
if not exist "dist_app\BulkCertificateGenerator.exe" (
    echo [1/2] Building standalone executable first...
    call build_desktop.bat
    if errorlevel 1 (
        echo [ERROR] Failed to build executable.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Found existing dist_app\BulkCertificateGenerator.exe
)

REM 2. Locate Inno Setup Compiler (ISCC.exe)
echo [2/2] Locating Inno Setup Compiler...
set "ISCC="

if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if "%ISCC%"=="" if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if "%ISCC%"=="" if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if "%ISCC%"=="" (
    where iscc >nul 2>&1
    if not errorlevel 1 set "ISCC=iscc"
)

if "%ISCC%"=="" (
    echo.
    echo [NOTE] Inno Setup is required to compile the installer (.exe setup wizard).
    echo You can install it for free via: winget install JRSoftware.InnoSetup
    echo or download from: https://jrsoftware.org/isdl.php
    echo.
    pause
    exit /b 1
)

echo Found Inno Setup at: "%ISCC%"
echo Compiling Windows Installer Setup...
"%ISCC%" installer.iss

if errorlevel 1 (
    echo [ERROR] Installer compilation failed.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo   INSTALLER CREATED SUCCESSFULLY!
echo   Installer Setup file: dist_installer\BulkCertificateGenerator_Setup.exe
echo =======================================================
echo.
pause
