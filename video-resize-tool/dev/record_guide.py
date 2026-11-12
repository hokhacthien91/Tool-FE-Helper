"""Record a real walkthrough of the Video Resize UI (BCB 1:1 -> 9:16) and take
one screenshot per step. Waiting segments are logged so they can be sped up.

  python record_guide.py <out_dir> [<aep> <master comp> <WxH>]
Writes <out_dir>/raw.webm, <out_dir>/segments.json, <out_dir>/0*.png
VR_URL picks the server (default :8767); run it on a test server with its own
VR_JOBS so the demo job does not land in the user's jobs. VR_TASK is the task
folder Copy deliverables writes into (default <out_dir>/task).
Needs After Effects free: it builds, asks the AI, renders and delivers for real.
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
URL = os.environ.get("VR_URL", "http://127.0.0.1:8767/")
AEP = sys.argv[2] if len(sys.argv) > 4 else \
    "/Users/thien.ho/Projects/Tool-FE-Helper/Video-resize-testset/01-Middlesex-dOOH/P0012743-Middlesex-NEXUS-dOOH-022.aep"
MASTER = sys.argv[3] if len(sys.argv) > 4 else "P0012743-Middlesex-NEXUS-10s-LAND"
TW, TH = (sys.argv[4] if len(sys.argv) > 4 else "1080x1920").split("x")
SZ = "#sz-%sx%s" % (TW, TH)
W, H = 1440, 900
TASK = os.environ.get("VR_TASK") or os.path.join(sys.argv[1], "task", "P0012743 Middlesex resize")

os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(TASK), exist_ok=True)  # the task folder itself is created by the tool
segs = []  # [start, end] seconds of waits, relative to T0
T0 = None


def now():
    return time.time() - T0


CAP_JS = """(t) => {
  let el = document.getElementById('guidecap');
  if (!el) {
    el = document.createElement('div'); el.id = 'guidecap';
    el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99;max-width:1100px;' +
      'background:rgba(20,20,20,.92);color:#fff;font:600 20px/1.4 -apple-system,sans-serif;padding:12px 22px;' +
      'border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.4);border:2px solid #6f97ff;text-align:center';
    document.body.appendChild(el);
  }
  el.innerHTML = t; el.style.display = t ? 'block' : 'none';
}"""


def centre(loc):
    """Scroll so the element sits mid-screen, clear of the caption at the bottom
    (scroll_into_view_if_needed leaves it at the edge, under the caption)."""
    loc.evaluate("e => e.scrollIntoView({block: 'center'})")
    loc.page.wait_for_timeout(300)


def cap(page, text, hold=2.5):
    page.evaluate(CAP_JS, text)
    page.wait_for_timeout(int(hold * 1000))


def shot(page, name):
    page.evaluate(CAP_JS, "")
    page.screenshot(path=os.path.join(OUT, name), full_page=False)


def click_wait(page, sel, until, label, timeout=600):
    """Click, then wait for `until` and for the busy bar to go. The whole wait
    is logged as a segment that the edit speeds up."""
    page.click(sel)
    page.evaluate(CAP_JS, label + " <span style='opacity:.7'>(sped up)</span>")
    s = now() + 0.8
    page.wait_for_selector(until, state="attached", timeout=timeout * 1000)
    page.wait_for_timeout(1500)
    page.wait_for_selector("#busy.hidden", state="attached", timeout=timeout * 1000)
    page.wait_for_timeout(500)
    segs.append([s, now()])
    page.wait_for_timeout(800)


def full(page, name):
    page.evaluate(CAP_JS, "")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(300)
    page.screenshot(path=os.path.join(OUT, name), full_page=True)


with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")  # the installed Chrome: no browser download needed
    ctx = b.new_context(viewport={"width": W, "height": H}, color_scheme="dark",
                        record_video_dir=OUT, record_video_size={"width": W, "height": H})
    page = ctx.new_page()
    T0 = time.time()
    page.goto(URL)
    page.wait_for_selector("#aep")
    cap(page, "Video Resize: one finished .aep at one size → MP4s at the sizes you type", 3)

    # ---- 0. new job
    cap(page, "Start: paste the path of the .aep and click <b>Read file</b>", 1.5)
    page.click("#aep")
    page.type("#aep", AEP, delay=12)
    page.wait_for_timeout(600)
    shot(page, "01-new-job.png")
    cap(page, "The original is never written: AE opens it and <b>Saves As</b> a copy into the job", 2.5)
    click_wait(page, "#read", "#comps", "AE is opening the file and reading comps, fonts, footage…")

    # ---- 1. intake
    cap(page, "Step 1 · Preflight: fonts and footage are checked first. Missing footage on disabled layers is only a warning", 3.5)
    radio = page.locator('input[name=m][data-name="%s"]' % MASTER)
    centre(radio)
    cap(page, "Pick the <b>master comp</b>: each comp shows its own size; likely masters come first", 2)
    radio.click()
    page.wait_for_timeout(1200)
    chip = page.locator('.chip.preset[data-w="%s"][data-h="%s"]' % (TW, TH) + '')
    centre(chip)
    cap(page, "Pick the <b>sizes</b> to make: presets, or type a custom W x H", 1.5)
    chip.click()
    page.wait_for_timeout(1200)
    centre(page.locator("#autobox"))
    cap(page, "<b>Auto</b> runs steps 2 → 4 in one go. Here we leave it off to show each step", 3)
    full(page, "02-intake.png")
    centre(page.locator("#next"))
    click_wait(page, "#next", "#go", "Analysing layers and grabbing thumbnails…")

    # ---- 2. roles
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 2 · Layer roles (you check): the tool guesses a <b>role</b> for every layer", 3)
    cap(page, "BACKGROUND = Fill · CONTENT (text/logo) = Fit · SUBJECT = in between · FOLLOWS PARENT", 3.5)
    page.mouse.wheel(0, 500)
    page.wait_for_timeout(1200)
    cap(page, "Rows marked ⚠ are guesses with low confidence: check those, change the role if wrong", 3)
    full(page, "03-roles.png")
    centre(page.locator("#go"))
    click_wait(page, "#go", "#render", "Building the new size in AE, grabbing frames at every sample time, running checks…")

    # ---- 3. review
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 3 · Review sizes (you check): the master on top, then a table per size", 3)
    card = page.locator(SZ)
    centre(card)
    cap(page, "One row per <b>version</b>, frames lined up by time. The blue row is <b>in use</b>: it renders", 3.5)
    cap(page, "PASS / WARN / FAIL come from the checks: stretching, uncovered edges, text out of frame", 3)
    full(page, "04-review.png")
    fig = page.locator(SZ + " .rowstrip figure[data-i]").nth(1)
    centre(fig)
    cap(page, "Click a frame to compare it with the master at the same moment", 1.2)
    fig.click()
    page.wait_for_selector("#lb:not(.hidden)")
    page.wait_for_timeout(1500)
    page.check("#lbsafe")
    cap(page, "Tick <b>Safe area</b> to see the title/action safe frames", 2.5)
    shot(page, "05-compare.png")
    page.click("#lbclose")
    page.wait_for_timeout(600)
    box = page.locator(SZ + " textarea")
    centre(box)
    cap(page, "Not right? <b>Open in AE</b> and adjust there, then <b>Reload</b>. Or ask the AI for a version", 3.5)
    box.click()
    box.type("make the text a bit bigger", delay=25)
    page.wait_for_timeout(500)
    # Either the new AI row or an error (usage limit…): never wait forever on the AI.
    click_wait(page, SZ + " [data-act=suggest]", SZ + " .vlab b:has-text('AI 1'), #err:not(.hidden)",
               "The AI looks at the frames and builds its own version…")
    centre(page.locator(SZ))
    cap(page, "The AI version is a new row. <b>Use</b> makes it the one that renders; nothing is lost", 4)
    ok = page.locator(SZ + " [data-act=ok]")
    centre(ok)
    cap(page, "Happy with the one in use: <b>Approve</b>. Only approved sizes render", 2)
    ok.click()
    page.wait_for_selector("#render:not([disabled])", timeout=60000)
    page.wait_for_timeout(800)
    centre(page.locator("#render"))
    cap(page, "Then <b>Render</b>: only sizes that changed are rendered", 1.5)
    click_wait(page, "#render", "video", "aerender is rendering the MP4…")

    # ---- 4. render & deliver
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 4 · Render & deliver (you check): watch every MP4, mainly the motion between the sample times", 3)
    full(page, "06-render.png")
    # Show the result: the rendered MP4, full screen, at real speed (not sped up).
    vid = page.locator("video").first
    centre(vid)
    cap(page, "Here is the result: the 9:16 MP4 the tool rendered", 2)
    page.evaluate(CAP_JS, "")
    vid.evaluate("v => { v.muted = true; v.currentTime = 0; }")
    vid.evaluate("v => v.requestFullscreen ? v.requestFullscreen().catch(() => null) : null")
    page.wait_for_timeout(800)
    vid.evaluate("v => v.play()")
    page.wait_for_timeout(int((vid.evaluate("v => v.duration") or 10) * 1000) + 600)
    page.evaluate("() => document.fullscreenElement ? document.exitFullscreen() : null")
    page.wait_for_timeout(800)
    centre(page.locator("#outdir"))
    cap(page, "Type the <b>task folder</b> (the one with 1-Doc, 2-Stock, 3-Working Files, 4-Output)", 2)
    page.fill("#outdir", "")
    page.type("#outdir", TASK, delay=8)
    page.wait_for_timeout(500)
    page.click("#deliver")
    page.wait_for_selector("#cleanbox")
    centre(page.locator("#cleanbox"))
    cap(page, "A last check: where the files go, MP4s held back, and the unused versions left out of the .aep", 4)
    shot(page, "07-deliver.png")
    click_wait(page, "#cleango", ".lv-PASS code", "Copying MP4s, the working .aep and the report…")
    cap(page, "MP4s → 4-Output · .aep → 3-Working Files · report → 1-Doc", 3)

    # ---- the report (read the job id first: the report page has no `job`)
    jid = page.evaluate("job && job.id")
    centre(page.locator("#rep"))
    cap(page, "<b>Preview report</b>: the QC report that went into 1-Doc", 1.5)
    page.click("#rep")
    page.wait_for_selector("#replink a", timeout=120000)
    href = page.eval_on_selector("#replink a", "a => a.href")
    page.goto(href)
    page.wait_for_load_state("load")
    page.wait_for_timeout(1200)
    cap(page, "Every size: frames next to the master, the checks, the version in use and the MP4 results", 3)
    for _ in range(6):
        page.mouse.wheel(0, 450)
        page.wait_for_timeout(900)
    cap(page, "Send it with the files, or keep it as the record of the job. Done.", 3)
    page.go_back()
    page.wait_for_timeout(800)
    page.close()
    ctx.close()
    b.close()

vids = [f for f in os.listdir(OUT) if f.endswith(".webm") and f != "raw.webm"]
os.replace(os.path.join(OUT, vids[0]), os.path.join(OUT, "raw.webm"))
json.dump({"segments": segs, "job": jid}, open(os.path.join(OUT, "segments.json"), "w"))
print("job", jid, "segments", segs)
