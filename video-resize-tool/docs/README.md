# Video Resize — PoC

Takes a finished After Effects `.aep` at **one size** and makes the extra sizes you type
(9:16, 1:1, 4:5, 16:9 or any custom size). The output is one MP4 per size plus a working
`.aep` that holds one comp per size.

Asana: *POC - Video resize tool* (1220159200251985).

Runs on **macOS and Windows**. Windows support is written but has not been run on a Windows
machine yet (see [Platform notes](#platform-notes)).

## Run

| | macOS | Windows |
|---|---|---|
| Double-click | `Start Video Resize.command` | `Start Video Resize.bat` |
| Command line | `bash app/run.sh` | `bash app/run.sh` (Git Bash) or `powershell -ExecutionPolicy Bypass -File app\run.ps1` |
| Fast, no checks | `Quick Start.command` / `bash app/run.sh --quick` | `Quick Start.bat` / `app\run.ps1 -Quick` |
| After an update | `bash app/run.sh --restart` | `app\run.ps1 -Restart` |

Step-by-step commands: [RUN.md](RUN.md). For people who only double-click: `READ ME FIRST.txt` (top folder).

On the first run the launcher installs everything into the user's account, no admin rights:
- `uv` in `~/.local/bin` (`%USERPROFILE%\.local\bin` on Windows);
- Python 3.12, managed by uv;
- `app/.venv/` with Pillow, numpy and `imageio-ffmpeg` (ships its own ffmpeg, so the
  machine needs neither ffprobe nor Homebrew).

Then `launch.py` checks After Effects, free disk space, AE's *Allow Scripts to Write Files and Access
Network* setting (turns it on itself when AE is closed, keeping a backup of the prefs file) and Claude
Code (only AI suggest needs it), opens AE if it is closed, starts the server and opens the browser.
Closing the terminal window stops the tool.

**Share with someone:** `dev/make_zip.sh` → `dev/dist/Video-Resize-<date>.zip` (about 4 MB; never
contains `app/.venv`, `jobs/` or `dev/`).

Tested on macOS from a fresh unzip (quarantine set, no ffprobe or claude on PATH): set-up finished,
the tool started, Auto BCB 1:1→9:16 rendered a PASSing MP4 in 50 s. The bundled-ffmpeg MP4 probe
matches ffprobe (1080x1920, 30 fps, 451 frames).

Dev machine: `dev/start.sh` / `dev/start.sh --stop` runs the server in the background (needs an existing `app/.venv`).

## Guide

The **Guide** page (📖 link top right, or `/ui/guide.html`) has a screenshot of every step and a
walkthrough video.
When the UI changes, re-record with `dev/record_guide.py <out_dir>`. By default it runs for real
on the Middlesex sample (`10s-LAND` → 1080x1920), so AE must be open; pass `<aep> <master> <WxH>` for
another file. It uses Playwright (from the `canto-downloader` venv) and logs the waits so ffmpeg can
speed them up 8×.

## Four steps, three human checks

| Step | The tool | The person |
|---|---|---|
| 1 · Intake | Opens the original in AE and *Saves As* `jobs/<id>/<name>-resize.aep`. Reads comps, fonts, footage | Picks the master comp and the sizes. Missing fonts need an explicit "continue anyway" |
| 2 · Layer roles | Guesses a role per layer: **BACKGROUND** (×max), **SUBJECT** (×√(Kw·Kh)), **CONTENT** (×min), **FOLLOWS PARENT**, **IGNORE**. Grabs thumbnails | **Check 1**: fixes the ⚠ rows |
| 3 · Review sizes | Duplicates the master into each size in the `VR-Resize` folder, applies the roles, grabs frames at the sample times, runs the checks | **Check 2**: OK / change values and rebuild / edit by hand in AE and re-read |
| 4 · Render | `aerender` H.264 (40 Mbps above HD, 15 Mbps otherwise), checks each MP4 | **Check 3**: watch the MP4s, export `report.html` + `report.zip` |

## Resize rules

- Factors: `Kw = W/w`, `Kh = H/h`. **BACKGROUND** scales `×max(Kw,Kh)` around the frame centre, so it
  always covers the frame. It gets about 2 px of bleed per side: an exact fit anti-aliases the edge
  into a 1 px line (BCB 1080→1920: top row alpha 199). **CONTENT** scales `×min(Kw,Kh)`.
- Content layout, per size:
  - **Keep group**: scale around the centre. Default when the orientation flips (landscape ↔ portrait).
  - **Stick to edges**: `x·Kw`, `y·Kh`, the Middlesex hand-over rule. Default for the same orientation.
- Only Scale and Position of layers **without a parent** change. Every keyframe is mapped, eases are
  kept, spatial tangents are scaled. Anchor Points are not touched; children follow their parent.
  Properties with an expression are skipped and reported as WARN.
- Quick per-size controls: content X/Y (px), `Text/logo ×`, `Background ×`, subject ×/X/Y, per-layer k/dx/dy.

## Sample times

Previews and every check run at up to 10 times per size:
- **Scene times:** between the in-points of background/text layers, plus the end frame. At most 8.
- **Motion times:** the middle of each keyframe span of a visible layer (transform, mask, effect,
  text animator), added farthest-from-existing first, at least 0.3 s apart.

BCB needs motion times: every layer starts at 0 s and all the animation sits in 0–6.3 s, so scene
times alone only catch 7.5 s and 14.8 s, when everything has settled.
`POST /api/jobs/<id>/beats` recomputes them for an old job without losing roles or renders.

## Checks (each tried on a deliberately broken case)

| Check | How | Level |
|---|---|---|
| Stretched | X/Y scale ratio of every layer, at every keyframe, vs the master | FAIL |
| Uncovered edge | Transparent pixels along the frame edge, vs the master at the same time | FAIL |
| Out of frame | Bounds of CONTENT layers (through the parent chain, ignoring rotation) inside the master frame but outside the new one | WARN |
| Text inside a BACKGROUND | A BACKGROUND precomp with text inside, scaled more than the content | WARN |
| Cropped scene | Precomp with ≥3 layers or video as background, when background/content ≥ 1.5 | WARN |
| MP4 (step 4) | Size, fps and frame count vs the comp; audio track present when the master has sound | FAIL / WARN (audio) |

Middlesex `15s-LAND`: background ×0.5 → FAIL "uncovered edge" at all 8 times; text ×2 → WARN "out of
frame" on exactly 8 layers; intro precomp → WARN "text inside a BACKGROUND".
Every FAIL/WARN message ends with a `Fix:` hint.

## Traps found (measured on AE 26.5 / 27.0, macOS)

- **Copying an `.aep` breaks footage links:** the copy reported 66 missing files, the original 9,
  because AE resolves footage relative to the `.aep`. The tool opens the original and *Saves As*.
- **`saveFrameToPng` is asynchronous**, renders at the comp's Resolution (Third → 1/3) and gives
  near-black frames (25/255) at 32 bpc. The tool switches to 8 bpc + Full while grabbing, waits for
  the files, then restores.
- **aerender never exits after rendering:** the tool watches the log for `Total Time Elapsed` and kills it.
- **Missing plugins cannot be detected** through `app.effects`. On Middlesex they do not change the
  picture either, so the tool does not check them.
- **A fresh AE has 'Allow Scripts to Write Files and Access Network' off.** Every task then hangs
  until its timeout with no error. `launch.py` checks the prefs file
  (`Pref_SCRIPTING_FILE_NETWORK_SECURITY`).

## Platform notes

| | macOS | Windows |
|---|---|---|
| Find AE | newest `/Applications/Adobe After Effects 20NN` | newest `%ProgramFiles%\Adobe\Adobe After Effects 20NN\Support Files` |
| Send a script to the open AE | `osascript … DoScriptFile` | `AfterFX.exe -r <file.jsx>` |
| Is AE running | `pgrep` | `tasklist` |
| Stop aerender | `killpg` | `taskkill /T` |
| Open a folder | `open` | `os.startfile` |
| Permission | macOS asks once: "Terminal wants to control After Effects" | none |
| First-run block | Gatekeeper: System Settings → Privacy & Security → Open Anyway | SmartScreen: More info → Run anyway |

All OS differences live in `vr/system.py`. Paths written into `.jsx` use forward slashes; path
comparisons in jsx go through `vrSamePath` (case-insensitive on Windows).
**Not yet run on Windows:** `AfterFX.exe -r` hand-over, aerender exit behaviour and `run.ps1` need one
real test before the team relies on it. Override the AE location with `VR_AE_DIR` if it is installed elsewhere.

## PoC limits

- No PSD layout reference yet.
- No automatic re-layout for extreme ratios (1520x240, 7168x1296): use "Edit by hand in AE".
- No 3D cameras, rotated layers (reported only) or expressions on transforms.
- Checks only run at the sample times (up to 10), not every frame.
- No brand-guideline rules: logo minimum size, clear space, platform safe zones, minimum text size.

## Layout

```
Video Resize/
├── Start Video Resize.command / .bat   first run: installs, checks, starts
├── Quick Start.command / .bat          later runs: no checks, just starts
├── READ ME FIRST.txt                   install steps for people who only double-click
├── jobs/<id>/                          the user's work: .aep copy, previews/, thumbs/, mp4/, logs/, report/
├── docs/                               README.md (this file), RUN.md (commands)
├── app/
│   ├── launch.py                       checks + starts the server + opens the browser (both OS)
│   ├── run.sh / run.ps1                first-run set-up (uv, Python, .venv), then launch.py
│   ├── server.py                       web server (stdlib) + API
│   ├── requirements.txt
│   ├── vr/system.py                    macOS / Windows differences
│   ├── vr/ae.py                        sends jsx to AE, waits for the result file; path roots (JOBS)
│   ├── vr/pipeline.py                  job.json + every step
│   ├── vr/render.py                    aerender + MP4 probe (ffprobe or bundled ffmpeg)
│   ├── vr/report.py                    report.html + zip
│   ├── jsx/*.jsxinc                    code that runs inside AE (ES3)
│   └── ui/                             index.html, app.js, style.css, guide.html, guide/
└── dev/                                not in the zip: make_zip.sh, start.sh, record_guide.py, relink.py, dist/
```

## Features added 09/11/2026

| Feature | Where | Notes |
|---|---|---|
| Block on **visible** missing footage | Step 2 | Only files reached through enabled layers count. Middlesex has 3 missing files, all on disabled layers, so it is not blocked; CW45 has 4 visible ones, so it is |
| **SUBJECT** role | Step 2 | Scales ×√(Kw·Kh), keeps the edge it touches. A cut-out image covering 30–98% of the frame is guessed as SUBJECT |
| **Alpha** measure for full-frame layers | Step 2 | A PNG or precomp spanning the frame but under 60% drawn, solid strokes (≥85%) or text → CONTENT. Skips track mattes, non-Normal blend modes and empty samples (<0.5%) |
| Subject X/Y, per-layer adjustments | Step 3 | `params.sx/sy`, `params.layers = {idx: {k, dx, dy}}` |
| Compare with the **designer's comp** of the same size | Step 3 | Found by name (WxH tokens stripped). Measures the centre offset of each name-matched layer and the pixel difference per sample time |
| **AI suggest** | Step 3 | `claude -p` (Sonnet) Reads 3 frames (master, resize at the same time, resize mid-animation) and returns values as JSON, incl. layout and per-layer dx/dy. Runs with `--tools Read` only: with just `--allowedTools Read` it also ran Bash (drew a grid into /tmp). 1–4 minutes. Never applied by itself: "Use these values", then Apply. The frames leave the machine (Anthropic) |
| **Cropped scene** warning | Checks | Precomp ≥3 layers or video as background, background/content ≥ 1.5 → WARN with the % of width/height kept |
| **Copy deliverables** | Step 4 | Copies MP4s, `.aep` and `report.zip` into `<folder>/<master>_resize/`, never overwrites |
| **Auto** (checkbox, step 1) | Steps 1 → 4 | Uses the guessed roles, approves every size without a FAIL, renders, builds the report. Stops on visible missing footage (step 2) or a FAIL (step 3). BCB 1:1→9:16 done in 64 s; CW45 stops at step 2 |
| Delete job | Home | Moves the job folder to `jobs/_trash/` (move it back to restore) |
| Master picked by comp **id** | Step 1 | Comp names repeat (Middlesex: 15 duplicated names). Picking the 2nd `Soccer-Kick` (8 layers) used to analyse the 1st (9 layers) |
| Built comps get a **unique name** | Step 3 | `aerender -comp` goes by name; a clash gets ` (VR2)`, and rebuilds keep the planned name |
| **Odd sizes refused** | Step 1 | AE's H.264 quietly renders 1081x1921 as 1080x1920 (measured); the tool suggests the nearest even size |
| **Interrupted runs recovered** | Server start | A job left "busy" (terminal closed, Mac asleep) is cleared with an "Interrupted…" message; Auto shows stopped |
| **Missing audio** warning | Step 4 | Master has an audible layer, MP4 has no audio track → WARN. Middlesex MP4 has AAC, BCB has none |
| Dialogs suppressed while opening | Step 1 | A newer-version project now fails with a message instead of a hidden modal dialog |
| Follow the **running** AE | Everywhere | With two installs, scripts and aerender use the version that is open, not just the newest |
| Tool folder with non-ASCII name | Everywhere | jsx helpers are pasted into the script instead of `#include`d by path; tested from a folder named with Vietnamese accented letters |
| Save the job before switching project | Background | Switching jobs used to drop built but unsaved size comps |

## Test-set results (`Video-resize-testset/`, 09/11/2026)

| Project | Master → size | Result | vs designer |
|---|---|---|---|
| 01 Middlesex | 10s-LAND → 9:16 | WARN: intro cropped, background scene keeps 32% of its width | **1.6%** (35 px), 8 layers matched |
| 06 BCB | 1:1 → 9:16 | PASS | 10% (220 px); **6.2% after AI suggest** |
| 06 BCB | 1:1 → 1200x628 | PASS | 11.7%: the designer re-laid it out |
| 05 Showa | 1:1 → 9:16, 16:9 | WARN ×5 scenes: text sits **inside** precomps | 0 layers matched |
| 04 Airbus MTM | 16:9 → 9:16, 4:5 | WARN cropped scene (32% / 45% kept) | — |
| 07 Fraud | 16:9 → 9:16 | WARN 8 layers with expressions | — |
| 02 Airbus CW45 | — | Blocked: 4 visible missing footage files | — |
| 03 Airbus Verticon | — | Blocked: 9 visible missing footage files | — |

**Biggest remaining limit:** the tool only adjusts layers in the master comp. Projects that put the
text inside per-scene precomps (Showa, MTM) need the resize to go inside those precomps; not done yet.
