@echo off
rem Windows: double-click in Explorer. Same as: powershell -ExecutionPolicy Bypass -File app\run.ps1
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Recurse | Unblock-File"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\run.ps1"
if errorlevel 1 (
  echo.
  echo Video Resize could not start. See the reason above.
  pause
)
