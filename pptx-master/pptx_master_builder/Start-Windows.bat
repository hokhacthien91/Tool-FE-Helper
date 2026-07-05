@echo off
REM Khoi dong PPTX Master Builder (Windows) — double-click de chay.
cd /d "%~dp0"

REM kiem tra python (thu ca 'python' va 'py')
set PY=
where python >nul 2>&1 && set PY=python
if "%PY%"=="" ( where py >nul 2>&1 && set PY=py )
if "%PY%"=="" (
  echo [X] Chua cai Python 3. Tai tai: https://www.python.org/downloads/
  echo     Khi cai nho tick "Add Python to PATH".
  pause
  exit /b 1
)

REM kiem tra python-pptx, tu cai neu thieu
%PY% -c "import pptx" >nul 2>&1
if errorlevel 1 (
  echo [...] Dang cai thu vien python-pptx (lan dau)...
  %PY% -m pip install --user python-pptx
  if errorlevel 1 (
    echo [X] Cai python-pptx that bai. Chay tay: %PY% -m pip install --user python-pptx
    pause
    exit /b 1
  )
)

echo [*] Dang khoi dong PPTX Master Builder...
echo     Neu preview slide trong: cai LibreOffice (https://www.libreoffice.org/download/) de bat preview.
%PY% app.py
pause
