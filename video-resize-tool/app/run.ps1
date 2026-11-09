# Set up (first run) and start Video Resize on Windows, from PowerShell.
#
#   powershell -ExecutionPolicy Bypass -File run.ps1
#   powershell -ExecutionPolicy Bypass -File run.ps1 -Setup     install only
#   powershell -ExecutionPolicy Bypass -File run.ps1 -Quick     no checks, just start (needs a .venv)
#   powershell -ExecutionPolicy Bypass -File run.ps1 -Restart   stop the running copy, then start this one
#
# Installs into your user account only (no admin rights):
#   uv           Python manager from astral.sh (%USERPROFILE%\.local\bin)
#   Python 3.12  managed by uv
#   .venv\       in this folder: Pillow, numpy, imageio-ffmpeg (bundles ffmpeg)
param([switch]$Setup, [switch]$Quick, [switch]$Restart)
$ErrorActionPreference = "Stop"
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Dir
$Py = Join-Path $Dir ".venv\Scripts\python.exe"
$LaunchArgs = @()
if ($Quick) { $LaunchArgs += "--quick" }
if ($Restart) { $LaunchArgs += "--restart" }
if ($Quick -and (Test-Path $Py)) { & $Py (Join-Path $Dir "launch.py") @LaunchArgs @LaunchArgs; exit $LASTEXITCODE }

function Die($msg, $hint) {
  Write-Host "  x $msg" -ForegroundColor Red
  if ($hint) { Write-Host "    $hint" }
  exit 1
}

Write-Host "Checking Python (the first run installs it, needs internet)..."
$uv = (Get-Command uv -ErrorAction SilentlyContinue).Source
if (-not $uv) {
  foreach ($c in @("$env:USERPROFILE\.local\bin\uv.exe", "$env:USERPROFILE\.cargo\bin\uv.exe")) {
    if (Test-Path $c) { $uv = $c; break }
  }
}
if (-not $uv) {
  Write-Host "  Installing uv..."
  try { powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex" | Out-Null } catch {}
  $uv = "$env:USERPROFILE\.local\bin\uv.exe"
  if (-not (Test-Path $uv)) { Die "Could not install uv." "Check the internet connection (VPN/proxy), then run again." }
}
Write-Host ("  ok uv " + ((& $uv --version) -split " ")[1])

function DepsOk { if (-not (Test-Path $Py)) { return $false }; & $Py -c "import PIL, numpy, imageio_ffmpeg" 2>$null; return ($LASTEXITCODE -eq 0) }
if (-not (DepsOk)) {
  Write-Host "  Creating .venv with Python 3.12 and the libraries (about 1 minute)..."
  & $uv venv --clear --python 3.12 (Join-Path $Dir ".venv") *> $null
  if ($LASTEXITCODE -ne 0) { Die "Could not create the Python environment." "See why: uv venv --python 3.12 .venv" }
  & $uv pip install --python $Py -r (Join-Path $Dir "requirements.txt") *> $null
  if ($LASTEXITCODE -ne 0) { Die "Could not install the libraries." "Check the internet connection, then run again." }
  if (-not (DepsOk)) { Die "Libraries installed but cannot be loaded." }
}
Write-Host "  ok Python with Pillow, numpy, ffmpeg"

if ($Setup) { exit 0 }
& $Py (Join-Path $Dir "launch.py")
