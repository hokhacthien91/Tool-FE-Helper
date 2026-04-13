@echo off
REM =============================================================
REM QA Checker - One-click Install for Windows
REM Enables debug mode + creates symlink to CEP extensions folder
REM =============================================================

echo ============================================
echo   QA Checker - Windows Installer
echo ============================================
echo.

REM Get the directory where this script lives (= plugin folder)
set "SCRIPT_DIR=%~dp0"
REM Remove trailing backslash
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set "EXTENSION_DIR=%APPDATA%\Adobe\CEP\extensions"
set "LINK_NAME=QA-Checker"
set "LINK_PATH=%EXTENSION_DIR%\%LINK_NAME%"

echo Plugin folder: %SCRIPT_DIR%
echo Target:        %LINK_PATH%
echo.

REM --- Step 1: Enable Debug Mode (CSXS 10, 11, 12) ---
echo [1/2] Enabling CEP Debug Mode...
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo       Done. (CSXS 10, 11, 12)

REM --- Step 2: Create symlink ---
echo [2/2] Creating symlink...

if not exist "%EXTENSION_DIR%" mkdir "%EXTENSION_DIR%"

if not exist "%LINK_PATH%" goto :create_link

REM Check if existing path is a symlink (reparse point)
fsutil reparsepoint query "%LINK_PATH%" >nul 2>&1
if errorlevel 1 goto :is_real_folder

echo       Symlink already exists. Removing old one...
rmdir "%LINK_PATH%" 2>nul
if exist "%LINK_PATH%" (
    echo       ERROR: Could not remove old symlink.
    echo       Try running as administrator.
    echo.
    pause
    exit /b 1
)
goto :create_link

:is_real_folder
echo       WARNING: %LINK_PATH% is a real folder, not a symlink.
echo       Please remove it manually, then re-run this script.
echo.
pause
exit /b 1

:create_link
REM mklink /D requires admin on Windows without Developer Mode
mklink /D "%LINK_PATH%" "%SCRIPT_DIR%"
if errorlevel 1 (
    echo.
    echo       ERROR: Failed to create symlink.
    echo       On Windows, symlinks may need admin privileges.
    echo       Right-click this file and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Install complete!
echo   Restart Illustrator then go to:
echo   Window ^> Extensions ^> QA Checker
echo ============================================
echo.
pause
