@echo off
cd /d "%~dp0"

REM Check that PHP is available before doing anything
where php >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] PHP was not found on this machine ^(not in PATH^).
    echo Install PHP from https://windows.php.net/download
    echo and add the PHP folder to your PATH environment variable.
    echo.
    pause
    exit /b 1
)

REM Give the PHP server a moment to start before opening the browser (port 8080)
start "" /b cmd /c "timeout /t 1 >nul & start http://localhost:8080"
php -S localhost:8080

REM Keep the window open if the server exits (so any error is readable)
pause
