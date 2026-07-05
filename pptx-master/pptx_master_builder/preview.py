"""preview.py — render 1 slide của .pptx thành PNG (thumbnail).

CROSS-PLATFORM renderer (auto-detect):
  - macOS: qlmanage (Quick Look) — nhanh nhất, có sẵn. SVG convert riêng bằng qlmanage.
  - Mac/Win/Linux: LibreOffice `soffice --headless --convert-to png` — chạy mọi OS,
    tự render SVG luôn (không cần convert riêng). Dùng khi không có qlmanage.
Cách làm: tạo file .pptx tạm CHỈ chứa slide N -> render -> đọc PNG. Cache theo (src, slide).
"""
import os
import shutil
import subprocess
import sys
import tempfile
import copy
from concurrent.futures import ThreadPoolExecutor, as_completed
from pptx import Presentation

from collections import OrderedDict
_CACHE = OrderedDict()   # (slide_idx, size, mtime, src) -> png bytes  (LRU bounded)
_CACHE_MAX = 200
_WORKDIR = os.path.join(tempfile.gettempdir(), "pptx_mb_preview")
os.makedirs(_WORKDIR, exist_ok=True)


def _find_soffice():
    """Tìm executable LibreOffice/soffice trên mọi OS. None nếu không có."""
    for name in ("soffice", "libreoffice"):
        p = shutil.which(name)
        if p:
            return p
    # đường dẫn cài mặc định theo OS
    candidates = [
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",              # macOS
        r"C:\Program Files\LibreOffice\program\soffice.exe",                 # Windows
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/usr/bin/soffice", "/usr/local/bin/soffice", "/snap/bin/libreoffice",  # Linux
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None


_HAS_QLMANAGE = sys.platform == "darwin" and shutil.which("qlmanage") is not None
_SOFFICE = _find_soffice()


def renderer_name():
    """Tên renderer đang dùng (để log/hiện cho user biết preview có hoạt động không)."""
    if _HAS_QLMANAGE:
        return "qlmanage"
    if _SOFFICE:
        return "soffice"
    return None


def _svg_to_png(svg_bytes, size=400, slot=0):
    """Convert SVG -> PNG bytes bằng qlmanage (macOS, không cần cài app).
    Tên file tạm UNIQUE tuyệt đối (uuid) — trước dùng `_c{slot}.svg` slot cố định, 2 render
    ĐỒNG THỜI (vd thumbnail + verify cùng lúc) đè `.svg`/`.png` của nhau -> PNG lẫn (icon sai)."""
    import uuid
    base = os.path.join(_WORKDIR, f"_c{uuid.uuid4().hex}")
    tmp_svg = base + ".svg"
    with open(tmp_svg, "wb") as f:
        f.write(svg_bytes)
    png = tmp_svg + ".png"
    try:
        subprocess.run(["qlmanage", "-t", "-s", str(size), "-o", _WORKDIR, tmp_svg],
                       capture_output=True, timeout=15, check=False)
        result = _white_to_transparent(open(png, "rb").read()) if os.path.exists(png) else None
    except Exception:
        result = None
    finally:
        for f in (tmp_svg, png):   # dọn ngay, không để rác tích
            try:
                os.remove(f)
            except OSError:
                pass
    return result


def _white_to_transparent(png_bytes):
    """qlmanage render SVG với nền TRẮNG ĐẶC (alpha 255). Đổi pixel trắng -> trong suốt
    để icon không dính ô trắng khi nhúng lên slide. Dùng PIL (có sẵn)."""
    try:
        import io
        from PIL import Image
        im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
        px = im.getdata()
        out = [(r, g, b, 0) if r > 244 and g > 244 and b > 244 else (r, g, b, a)
               for (r, g, b, a) in px]
        im.putdata(out)
        buf = io.BytesIO()
        im.save(buf, "PNG")
        return buf.getvalue()
    except Exception:
        return png_bytes


def _one_slide_file(src: str, slide_idx: int, out_path: str):
    """Lưu file .pptx chỉ giữ slide slide_idx, đồng thời CONVERT ảnh SVG -> PNG (qlmanage render
    slide bỏ qua SVG). Đổi blob + content-type của image part SVG sang PNG (giữ partname/rId)."""
    prs = Presentation(src)
    lst = prs.slides._sldIdLst
    for i, sid in enumerate(list(lst)):
        if i != slide_idx - 1:
            lst.remove(sid)
    from pptx.oxml.ns import qn
    SVGNS = "{http://schemas.microsoft.com/office/drawing/2016/SVG/main}svgBlip"
    slide = list(prs.slides)[0]
    slide_part = slide.part
    # slide ẨN (hidden/Archive, show="0") -> renderer bỏ qua không render (báo nhầm "too complex").
    # Bỏ attr show để render được. (KHÔNG ảnh hưởng file output — đây chỉ là file tạm để preview.)
    if slide._element.get("show") is not None:
        del slide._element.attrib["show"]

    # CHỈ xử lý SVG mà SLIDE NÀY dùng (không convert cả 106 SVG -> tránh 32s treo).
    # (1) copy r:embed từ svgBlip -> <a:blip>, (2) convert đúng các part SVG đó -> PNG.
    svg_parts = set()
    for blip in slide.shapes._spTree.iter(qn("a:blip")):
        svg = blip.find(".//" + SVGNS)
        rid = svg.get(qn("r:embed")) if svg is not None else None
        if rid and not blip.get(qn("r:embed")):
            blip.set(qn("r:embed"), rid)   # dùng part (sẽ chứa PNG) làm raster
        if rid:
            try:
                svg_parts.add(slide_part.related_part(rid))
            except KeyError:
                pass
    # SVG: chỉ cần convert->PNG khi render bằng QLMANAGE (nó bỏ qua SVG). soffice render SVG
    # trực tiếp -> bỏ qua bước này. convert SONG SONG (mỗi SVG 1 process qlmanage, slot riêng).
    if _HAS_QLMANAGE:
        todo = [p for p in svg_parts if str(p.partname).endswith(".svg")]
        if todo:
            def _conv(item):
                slot, part = item
                return part, _svg_to_png(part.blob, slot=slot)
            with ThreadPoolExecutor(max_workers=min(4, len(todo))) as ex:
                for part, png in ex.map(_conv, enumerate(todo)):
                    if png:
                        part._blob = png
    prs.save(out_path)


def _render_qlmanage(tmp_pptx, size):
    """macOS Quick Look -> <tmp_pptx>.png. Trả path PNG hoặc None."""
    png_path = tmp_pptx + ".png"
    if os.path.exists(png_path):
        os.remove(png_path)
    try:
        subprocess.run(["qlmanage", "-t", "-s", str(size), "-o", _WORKDIR, tmp_pptx],
                       capture_output=True, timeout=20, check=False)
    except Exception:
        return None
    return png_path if os.path.exists(png_path) else None


def _render_soffice(tmp_pptx):
    """LibreOffice headless -> PNG cùng tên trong _WORKDIR (mọi OS). Trả path hoặc None.
    soffice render slide đầu (file tạm chỉ có 1 slide) + render SVG trực tiếp."""
    base = os.path.splitext(os.path.basename(tmp_pptx))[0]
    png_path = os.path.join(_WORKDIR, base + ".png")
    if os.path.exists(png_path):
        os.remove(png_path)
    # profile riêng -> tránh xung đột khi nhiều request chạy song song
    profile = "file://" + os.path.join(_WORKDIR, "_lo_profile")
    try:
        subprocess.run(
            [_SOFFICE, "--headless", "--norestore", f"-env:UserInstallation={profile}",
             "--convert-to", "png", "--outdir", _WORKDIR, tmp_pptx],
            capture_output=True, timeout=60, check=False,
        )
    except Exception:
        return None
    return png_path if os.path.exists(png_path) else None


def render_slide(src: str, slide_idx: int, size: int = 480):
    """Trả PNG bytes của slide slide_idx (1-based). None nếu render lỗi hoặc không có renderer."""
    if not _HAS_QLMANAGE and not _SOFFICE:
        return None   # không có renderer nào -> UI ẩn preview
    key = (slide_idx, size, os.path.getmtime(src), src)
    if key in _CACHE:
        _CACHE.move_to_end(key)
        return _CACHE[key]

    # tên file tạm DUY NHẤT theo (nguồn + slide) — trước dùng f"s{slide_idx}.pptx" chung cho
    # MỌI file nguồn -> verify render src rồi out cùng slide GHI ĐÈ nhau -> PNG lẫn (icon sai).
    import hashlib
    tag = hashlib.md5(src.encode()).hexdigest()[:8]
    tmp_pptx = os.path.join(_WORKDIR, f"s{tag}_{slide_idx}.pptx")
    try:
        _one_slide_file(src, slide_idx, tmp_pptx)
    except Exception:
        return None

    png_path = _render_qlmanage(tmp_pptx, size) if _HAS_QLMANAGE else _render_soffice(tmp_pptx)
    if not png_path:
        return None
    data = open(png_path, "rb").read()
    _CACHE[key] = data
    _CACHE.move_to_end(key)
    while len(_CACHE) > _CACHE_MAX:
        _CACHE.popitem(last=False)
    return data


def _similarity(png_a: bytes, png_b: bytes) -> float:
    """% giống nhau giữa 2 ảnh PNG (0-100). Resize về cùng cỡ, tính mean absolute difference
    per-pixel RGB bằng ImageChops.difference (C-level, nhanh). 100 = giống hệt."""
    import io
    from PIL import Image, ImageChops, ImageStat
    a = Image.open(io.BytesIO(png_a)).convert("RGB")
    b = Image.open(io.BytesIO(png_b)).convert("RGB")
    # chuẩn hoá về cùng kích thước (render 2 file có thể lệch vài px)
    size = (min(a.width, b.width), min(a.height, b.height))
    if size[0] < 4 or size[1] < 4:
        return 0.0
    a = a.resize(size)
    b = b.resize(size)
    stat = ImageStat.Stat(ImageChops.difference(a, b))
    mean_diff = sum(stat.mean) / len(stat.mean)   # trung bình lệch 0-255 qua các kênh
    return round(100.0 * (1 - mean_diff / 255), 1)


def _diff_image(png_a: bytes, png_b: bytes) -> bytes:
    """Tạo ảnh ghép NGANG: [gốc | output | diff]. Panel diff = output với vùng KHÁC tô đỏ.
    Cho user thấy NGAY slide lệch ở đâu. Trả PNG bytes (None nếu lỗi)."""
    import io
    from PIL import Image, ImageChops, ImageDraw, ImageFont
    try:
        a = Image.open(io.BytesIO(png_a)).convert("RGB")
        b = Image.open(io.BytesIO(png_b)).convert("RGB")
        size = (min(a.width, b.width), min(a.height, b.height))
        if size[0] < 4 or size[1] < 4:
            return None
        a = a.resize(size)
        b = b.resize(size)
        # mask vùng khác: |a-b| theo pixel -> gray -> pixel lệch > ngưỡng = đỏ
        diff = ImageChops.difference(a, b).convert("L")
        mask = diff.point(lambda p: 255 if p > 28 else 0)   # ngưỡng bỏ nhiễu anti-alias
        overlay = b.copy()
        red = Image.new("RGB", size, (255, 40, 40))
        overlay.paste(red, (0, 0), mask)   # tô đỏ chỗ khác lên bản output
        # ghép ngang 3 panel + DẢI LABEL phía trên mỗi panel (user biết panel nào là gì)
        gap = 6
        bar = max(24, size[1] // 22)   # chiều cao dải label theo ảnh
        W = size[0] * 3 + gap * 2
        canvas = Image.new("RGB", (W, size[1] + bar), (20, 20, 20))
        panels = [(a, "ORIGINAL", 0),
                  (b, "TOOL OUTPUT", size[0] + gap),
                  (overlay, "DIFFERENCES (red)", size[0] * 2 + gap * 2)]
        try:
            font = ImageFont.truetype("DejaVuSans-Bold.ttf", max(11, bar // 2))
        except Exception:
            font = ImageFont.load_default()
        draw = ImageDraw.Draw(canvas)
        for img, label, x in panels:
            canvas.paste(img, (x, bar))
            draw.text((x + 8, max(2, (bar - (bar // 2)) // 2)), label, fill=(183, 227, 155), font=font)
        buf = io.BytesIO()
        canvas.save(buf, "PNG")
        return buf.getvalue()
    except Exception:
        return None


def verify_visual(src: str, out: str, on_progress=None, diff_dir=None, diff_prefix=""):
    """So sánh trực quan: render từng slide của file GỐC (src) vs file OUTPUT (out) — chúng
    cùng số slide, cùng thứ tự (build không đụng slides) — trả list per-slide % giống.
    on_progress(done, total, row): báo tiến độ + kết quả slide vừa xong (để UI hiện DẦN).
    diff_dir/diff_prefix: nếu set, slide KHÁC gốc (close/diff) lưu ảnh diff [gốc|output|đỏ]
    vào {diff_dir}/{diff_prefix}{i}.png -> UI xem chỗ lệch. row['has_diff']=True khi có."""
    if renderer_name() is None:
        return {"ok": False, "error": "No preview renderer (qlmanage/LibreOffice) available."}
    n_src = len(list(Presentation(src).slides))
    n_out = len(list(Presentation(out).slides))
    total = min(n_src, n_out)

    def _one(i):
        a = render_slide(src, i)
        b = render_slide(out, i)
        if not a or not b:
            return {"index": i, "pct": None, "status": "render-failed"}
        pct = _similarity(a, b)
        # ngưỡng SIẾT: slide khớp thật ra ~100% (chỉ sai số render nhỏ). 98% cũ quá dễ dãi ->
        # khác thấy được (icon/text lệch) vẫn bị gọi "match". Giờ: >=99.5 match, >=97 minor, <97 diff.
        status = "match" if pct >= 99.5 else ("close" if pct >= 97 else "diff")
        row = {"index": i, "pct": pct, "status": status}
        # tạo ảnh so sánh cho MỌI slide render được (kể cả match) -> user click xem [gốc|output|đỏ]
        # để tự tin slide giống thật (slide match thì panel đỏ gần trống).
        if diff_dir:
            dimg = _diff_image(a, b)
            if dimg:
                with open(os.path.join(diff_dir, f"{diff_prefix}{i}.png"), "wb") as f:
                    f.write(dimg)
                row["has_diff"] = True
        return row

    # TUẦN TỰ: mỗi render tách+save file 25MB (~1.5s) là phần nặng, KHÔNG phải qlmanage (0.37s).
    # Chạy song song 4 qlmanage tranh IO/CPU -> chậm GẤP ĐÔI (đo thực tế 488s vs ~230s). Nên tuần tự.
    rows = [None] * total
    for done, i in enumerate(range(1, total + 1), 1):
        row = _one(i)
        rows[i - 1] = row
        if on_progress:
            try:
                on_progress(done, total, row)
            except Exception:
                pass
    valid = [r["pct"] for r in rows if r and r["pct"] is not None]
    return {"ok": True, "renderer": renderer_name(), "slides": rows,
            "min_pct": min(valid) if valid else None,
            "count_diff": sum(1 for r in rows if r and r["status"] == "diff")}
