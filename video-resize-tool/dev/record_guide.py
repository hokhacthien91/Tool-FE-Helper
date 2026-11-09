"""Record a real walkthrough of the Video Resize UI (BCB 1:1 -> 9:16) and take
one screenshot per step. Waiting segments are logged so they can be sped up.

  python record_guide.py <out_dir> [<aep> <master comp> <WxH>]
Writes <out_dir>/raw.webm, <out_dir>/segments.json, <out_dir>/0*.png
"""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
URL = "http://127.0.0.1:8767/"
AEP = sys.argv[2] if len(sys.argv) > 4 else \
    "/Users/thien.ho/Projects/Tool-FE-Helper/Video-resize-testset/01-Middlesex-dOOH/P0012743-Middlesex-NEXUS-dOOH-022.aep"
MASTER = sys.argv[3] if len(sys.argv) > 4 else "P0012743-Middlesex-NEXUS-10s-LAND"
TW, TH = (sys.argv[4] if len(sys.argv) > 4 else "1080x1920").split("x")
SZ = "#sz-%sx%s" % (TW, TH)
W, H = 1440, 900

os.makedirs(OUT, exist_ok=True)
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
    b = p.chromium.launch()
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
    radio.scroll_into_view_if_needed()
    cap(page, "Pick the <b>master comp</b>: each comp shows its own size; likely masters come first", 2)
    radio.click()
    page.wait_for_timeout(1200)
    chip = page.locator('.chip.preset[data-w="%s"][data-h="%s"]' % (TW, TH) + '')
    chip.scroll_into_view_if_needed()
    cap(page, "Pick the <b>sizes</b> to make: presets, or type a custom W x H", 1.5)
    chip.click()
    page.wait_for_timeout(1200)
    page.locator("#autobox").scroll_into_view_if_needed()
    cap(page, "<b>Auto</b> runs steps 2 → 4 in one go. Here we leave it off to show each step", 3)
    full(page, "02-intake.png")
    page.locator("#next").scroll_into_view_if_needed()
    click_wait(page, "#next", "#go", "Analysing layers and grabbing thumbnails…")

    # ---- 2. roles
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 2 · Layer roles (you check): the tool guesses a <b>role</b> for every layer", 3)
    cap(page, "BACKGROUND = Fill · CONTENT (text/logo) = Fit · SUBJECT = in between · FOLLOWS PARENT", 3.5)
    page.mouse.wheel(0, 500)
    page.wait_for_timeout(1200)
    cap(page, "Rows marked ⚠ are guesses with low confidence: check those, change the role if wrong", 3)
    full(page, "03-roles.png")
    page.locator("#go").scroll_into_view_if_needed()
    click_wait(page, "#go", "#render", "Building the new size in AE, grabbing frames at every sample time, running checks…")

    # ---- 3. review
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 3 · Review sizes (you check): master and new size, frame by frame at the same times", 3.5)
    card = page.locator(SZ)
    card.scroll_into_view_if_needed()
    cap(page, "Status PASS / WARN / FAIL comes from the checks: stretching, uncovered edges, text out of frame", 3.5)
    full(page, "04-review.png")
    fig = page.locator(SZ + " .strip figure").nth(2)
    fig.scroll_into_view_if_needed()
    cap(page, "Click a frame to compare it side by side with the master", 1.2)
    fig.click()
    page.wait_for_selector("#lb:not(.hidden)")
    page.wait_for_timeout(1500)
    page.check("#lbsafe")
    cap(page, "Tick <b>Safe area</b> to see the title/action safe frames", 2.5)
    shot(page, "05-compare.png")
    page.click("#lbclose")
    page.wait_for_timeout(600)
    params = page.locator(SZ + " .params")
    params.scroll_into_view_if_needed()
    cap(page, "Not right? Move content X/Y, scale text/logo or background, or ✨ AI suggest, then Rebuild", 3.5)
    ok = page.locator(SZ + ' input[value=ok]')
    ok.scroll_into_view_if_needed()
    cap(page, "Happy with it: choose <b>✅ OK</b> and click <b>Apply</b>", 1.5)
    ok.check()
    page.wait_for_timeout(500)
    page.click(SZ + ' [data-act=apply]')
    page.wait_for_selector("#render:not([disabled])", timeout=60000)
    page.wait_for_timeout(800)
    page.locator("#render").scroll_into_view_if_needed()
    cap(page, "Then <b>Render</b> every approved size", 1.5)
    click_wait(page, "#render", "video", "aerender is rendering the MP4…")

    # ---- 4. render
    page.evaluate("window.scrollTo(0, 0)")
    cap(page, "Step 4 · Render (you check): watch every MP4, mainly the motion between the sample times", 3)
    full(page, "06-render.png")
    page.locator("#rep").scroll_into_view_if_needed()
    cap(page, "<b>Export report.html</b>: frames, checks and video in one page + a .zip to send", 2)
    page.click("#rep")
    page.wait_for_selector("#replink a", timeout=120000)
    page.wait_for_timeout(1000)
    page.locator("#outdir").scroll_into_view_if_needed()
    cap(page, "<b>Copy deliverables</b>: MP4s + working .aep + report.zip into your output folder. Done.", 4)
    shot(page, "07-deliver.png")
    jid = page.evaluate("job && job.id")
    page.close()
    ctx.close()
    b.close()

vids = [f for f in os.listdir(OUT) if f.endswith(".webm") and f != "raw.webm"]
os.replace(os.path.join(OUT, vids[0]), os.path.join(OUT, "raw.webm"))
json.dump({"segments": segs, "job": jid}, open(os.path.join(OUT, "segments.json"), "w"))
print("job", jid, "segments", segs)
