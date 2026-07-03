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
from concurrent.futures import ThreadPoolExecutor
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
    slot: tên file riêng cho mỗi SVG -> chạy song song không đè nhau."""
    tmp_svg = os.path.join(_WORKDIR, f"_c{slot}.svg")
    with open(tmp_svg, "wb") as f:
        f.write(svg_bytes)
    png = tmp_svg + ".png"
    if os.path.exists(png):
        os.remove(png)
    try:
        subprocess.run(["qlmanage", "-t", "-s", str(size), "-o", _WORKDIR, tmp_svg],
                       capture_output=True, timeout=15, check=False)
        if os.path.exists(png):
            return _white_to_transparent(open(png, "rb").read())
    except Exception:
        pass
    return None


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

    tmp_pptx = os.path.join(_WORKDIR, f"s{slide_idx}.pptx")
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
