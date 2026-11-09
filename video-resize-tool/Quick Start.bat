@echo off
rem Windows: start Video Resize with no checks (fast). First time? Use "Start Video Resize.bat".
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\run.ps1" -Quick
if errorlevel 1 pause
