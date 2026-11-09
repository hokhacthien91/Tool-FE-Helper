# Run Video Resize from the command line

Needs: After Effects installed, internet on the first run. No admin rights.

## macOS (Terminal)

```bash
cd "/path/to/Video Resize"     # the unzipped folder
bash app/run.sh                # first run: installs uv, Python 3.12 and .venv (~1 min), then starts
```

Running a script with `bash` is never stopped by macOS's *"Apple could not verify…"* check; that only
happens when you double-click a downloaded file in Finder. `run.sh` also clears the download flag
(`com.apple.quarantine`) of the whole folder, so after one `bash app/run.sh` the double-click launchers
open without that message too.

The browser opens at <http://127.0.0.1:8767>. Keep the Terminal open; `Ctrl+C` stops the tool.

First time only, macOS asks *"Terminal wants access to control Adobe After Effects"*: click **OK**.
If you clicked *Don't Allow*: System Settings → Privacy & Security → Automation → turn on
After Effects under Terminal, then run `bash app/run.sh` again.

## Windows (Git Bash)

```bash
cd "/c/Users/<you>/Documents/Video Resize"
bash app/run.sh
```

## Windows (PowerShell, no Git Bash)

```powershell
cd "$env:USERPROFILE\Documents\Video Resize"
powershell -ExecutionPolicy Bypass -File app\run.ps1
```

If Windows blocks the files of a downloaded zip, unblock them once:

```powershell
Get-ChildItem -Recurse | Unblock-File
```

## Fast start (no checks)

Once the first run has installed everything, skip the checks:

| | |
|---|---|
| Double-click | `Quick Start.command` (macOS) · `Quick Start.bat` (Windows) |
| Command | `bash app/run.sh --quick` · PowerShell `app\run.ps1 -Quick` |

It goes straight to starting the server (about 0.1 s before the browser opens). If `.venv` is missing it
falls back to the full set-up.

## Running it a second time

| Situation | What happens |
|---|---|
| This folder's tool is already running | Nothing is started twice: it opens a browser tab to the running tool and exits |
| You updated the files and want the new code | `bash app/run.sh --restart` stops the running one and starts again |
| Another folder's copy (or an older version) is running | It stops with the folder of the running copy. Close that window, or use `--restart`, or `VR_PORT=8770` to run both |
| A step is still running (busy bar) | `--restart` refuses until it has finished, so no build is cut half-way |

## Options

| Command | What it does |
|---|---|
| `bash app/run.sh --quick` | Skip the install check and the computer checks (PowerShell: `app\run.ps1 -Quick`) |
| `bash app/run.sh --restart` | Stop the copy that is running on the port, then start this one (PowerShell: `app\run.ps1 -Restart`) |
| `bash app/run.sh --setup` | Install only, do not start (PowerShell: `app\run.ps1 -Setup`) |
| `VR_PORT=8770 bash app/run.sh` | Use another port (PowerShell: `$env:VR_PORT=8770` first) |
| `VR_NO_OPEN=1 bash app/run.sh` | Do not open After Effects or the browser |
| `VR_AE_DIR="/Applications/Adobe After Effects 2027" bash app/run.sh` | Use this After Effects install instead of the newest one |

## What the first run installs

| What | Where |
|---|---|
| `uv` (Python manager, astral.sh) | `~/.local/bin` · Windows `%USERPROFILE%\.local\bin` |
| Python 3.12 | managed by uv |
| Pillow, numpy, imageio-ffmpeg (includes ffmpeg) | `app/.venv/` in this folder |

To uninstall, delete the folder (and `~/.local/bin/uv` if nothing else uses it). Your jobs live in
`jobs/` inside the folder: copy it first if you want to keep them.

## Checks the launcher prints

```
1. Checking this computer
  ✓ After Effects: Adobe After Effects 2027
  ✓ Disk: 137 GB free
  ✓ AE scripting can write files
2. Optional
  ! Claude Code not found: the AI suggest button will not work (everything else does)
Starting
  ✓ Running at http://127.0.0.1:8767
```

| Message | Fix |
|---|---|
| `After Effects is not installed` | Install AE from Creative Cloud, or point `VR_AE_DIR` at its folder |
| `Tick 'Allow Scripts to Write Files and Access Network'` | AE → Settings → Scripting & Expressions → tick it. The launcher turns it on itself when AE is closed |
| `Could not install uv` / `the libraries` | Internet, VPN or proxy blocked the download. Run again on another network |
| `The tool did not start on port 8767` | Another program uses the port: `VR_PORT=8770 bash app/run.sh` |
| `Claude Code not found` | Optional. Install Claude Code only if you want AI suggest |
