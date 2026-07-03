"""classify.py — phân loại slide và gom nhóm slide cùng bố cục.

Đầu vào: file .pptx đã duyệt layout.
Đầu ra: danh sách SlideInfo + các nhóm (group) slide cùng bố cục -> mỗi nhóm 1 layout.

Chiến lược nhận diện dựa trên "chữ ký" đo được từ shape:
  - số ảnh nội dung (pic trong viewport, không full-bleed, không trang trí)
  - có/không text, nội dung text (keyword DIVIDER / THANK YOU)
  - bố cục ảnh (full-bleed, grid nhiều ảnh, ảnh đơn lớn...)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from pptx import Presentation
from pptx.util import Emu
from pptx.enum.shapes import MSO_SHAPE_TYPE

# ngưỡng (theo inch) — hiệu chỉnh cho slide 13.33 x 7.5
FULLBLEED_COVER = 0.92      # ảnh phủ >=92% cả 2 chiều => nền full-bleed
DECOR_MAX_SIZE = 1.6        # shape <=1.6" mỗi chiều ở góc => trang trí (logo/icon)
OFFSCREEN_EPS = 0.05


@dataclass
class ShapeInfo:
    idx: int
    kind: str            # 'pic' | 'text' | 'auto' | 'group' | 'other'
    left: float
    top: float
    width: float
    height: float
    text: str = ""
    name: str = ""           # tên shape (Picture 7...) — phân biệt trong UI
    is_fullbleed: bool = False
    is_offscreen: bool = False
    is_decor: bool = False   # logo/icon/đường trang trí nhỏ hoặc chrome dùng chung
    role: str = "static"     # 'static' (giữ nguyên) | 'content-text' | 'content-image'


@dataclass
class SlideInfo:
    index: int               # 1-based
    shapes: list[ShapeInfo] = field(default_factory=list)
    kind: str = ""           # loại slide nhận diện
    signature: str = ""      # chữ ký để gom nhóm
    slide_area: float = 0.0  # diện tích slide (inch²) để tính % diện tích element

    @property
    def content_images(self):
        return _dedupe(( s for s in self.shapes if s.role == "content-image"))

    @property
    def content_texts(self):
        return [s for s in self.shapes if s.role == "content-text"]

    @property
    def n_content_images(self):
        return len(self.content_images)

    def elements(self):
        """List element (ảnh + text) cho UI chọn cố định/cho-sửa. Mỗi element:
        {id, type, label, default, size, role}.
        role dùng cho PRESET (fix icon / edit image / ...):
          image -> 'icon' (logo/icon nhỏ) | 'bg' (ảnh nền full-bleed) | 'content' (ảnh nội dung)
          text  -> 'content' (text nội dung) | 'chrome' (text trang trí/chung)
        default theo role: content-* -> editable, còn lại -> fixed."""
        out = []
        for s in self.shapes:
            size = f"{s.width:.1f}×{s.height:.1f}\""     # kích thước inch
            if s.kind == "pic":
                default = "editable" if s.role == "content-image" else "fixed"
                if s.is_fullbleed:
                    role, kindtag = "bg", " · nền/lớn"
                elif s.is_decor:
                    role, kindtag = "icon", " · logo/nhỏ"
                else:
                    role, kindtag = "content", ""
                label = (s.name or "Ảnh") + kindtag   # tên shape (Picture 7...) để phân biệt
                # % diện tích so với slide -> user hiểu vì sao ảnh là bg (to) hay content (nhỏ)
                pct = round(100 * s.width * s.height / self.slide_area) if self.slide_area else 0
                out.append({"id": s.idx, "type": "image", "label": label,
                            "default": default, "size": size, "role": role, "pct": pct})
            elif s.kind == "text" and s.text.strip():
                default = "editable" if s.role == "content-text" else "fixed"
                role = "content" if s.role == "content-text" else "chrome"
                # thay ký tự điều khiển (soft-return \x0b...) bằng space -> JSON hợp lệ
                label = "".join(c if c >= " " else " " for c in s.text.strip())[:40]
                out.append({"id": s.idx, "type": "text", "label": label,
                            "default": default, "size": size, "role": role})
        return out


def _walk(shapes, sw, sh, out, depth=0):
    for i, shp in enumerate(shapes):
        try:
            l, t, w, h = (Emu(shp.left).inches, Emu(shp.top).inches,
                          Emu(shp.width).inches, Emu(shp.height).inches)
        except Exception:
            l = t = w = h = 0.0
        st = shp.shape_type
        if st == MSO_SHAPE_TYPE.PICTURE:
            kind = "pic"
        elif st == MSO_SHAPE_TYPE.GROUP:
            kind = "group"
        elif shp.has_text_frame and shp.text_frame.text.strip():
            kind = "text"
        elif st == MSO_SHAPE_TYPE.AUTO_SHAPE:
            kind = "auto"
        else:
            kind = "other"
        txt = shp.text_frame.text.strip() if shp.has_text_frame else ""
        fb = (abs(l) < 0.15 and abs(t) < 0.15 and w >= sw * FULLBLEED_COVER
              and h >= sh * FULLBLEED_COVER)
        off = (l + w <= OFFSCREEN_EPS or t + h <= OFFSCREEN_EPS
               or l >= sw - OFFSCREEN_EPS or t >= sh - OFFSCREEN_EPS)
        try:
            nm = shp.name or ""
        except Exception:
            nm = ""
        si = ShapeInfo(idx=len(out), kind=kind, left=l, top=t, width=w, height=h,
                       text=txt, name=nm, is_fullbleed=fb, is_offscreen=off)
        out.append(si)
        # group: đi vào trong để đánh dấu, nhưng vẫn coi cả group là 1 đơn vị static
        # (không tách ảnh trong group ra làm placeholder ở v1)


def _tag_roles(slide: SlideInfo, sw: float, sh: float):
    """Gán role cho mỗi shape: static / content-text / content-image."""
    for s in slide.shapes:
        cx, cy = s.left + s.width / 2, s.top + s.height / 2
        in_corner = ((cx < sw * 0.2 or cx > sw * 0.8) and (cy < sh * 0.2 or cy > sh * 0.85))
        thin_bar = (s.height < 1.0 and s.width > sw * 0.8)   # thanh gradient/trang trí ngang
        # QUY TẮC KHÁC NHAU cho ảnh vs text:
        #  - ẢNH: nhỏ mọi chiều (<=1.6") HOẶC nhỏ-vừa (<=2.5") nằm trong góc -> logo/icon decor
        #  - TEXT: KHÔNG dùng ngưỡng kích thước tuyệt đối (nhãn cột ngắn như "HYBRID",
        #    "OPEN CIRCUIT" cũng nhỏ nhưng LÀ nội dung). Text chỉ decor khi: offscreen,
        #    thanh mỏng, hoặc RẤT nhỏ nằm SÁT góc (footer/số trang: cao <0.5" và ở góc).
        if s.kind == "pic":
            small_corner = (s.width <= DECOR_MAX_SIZE and s.height <= DECOR_MAX_SIZE)
            chrome = (s.width <= 2.5 and s.height <= 2.5 and in_corner)
            is_decor = s.is_offscreen or thin_bar or small_corner or chrome
        else:  # text & khác
            tiny_footer = (s.height < 0.5 and s.width < sw * 0.25 and in_corner)
            is_decor = s.is_offscreen or thin_bar or tiny_footer
        if is_decor:
            s.is_decor = True

        # ảnh NỀN = full-bleed / lớn phủ >=55% 1 chiều / chạm mép slide -> giữ CỐ ĐỊNH (static)
        # (New Slide hiện sẵn qua kế thừa layout). Ảnh nhỏ vùng chính -> placeholder editable.
        touches_edge = (s.left <= 0.1 or s.top <= 0.1
                        or s.left + s.width >= sw - 0.1 or s.top + s.height >= sh - 0.1)
        big = (s.width >= sw * 0.55 or s.height >= sh * 0.55)
        is_bg_image = s.kind == "pic" and (s.is_fullbleed or (big and touches_edge))

        if s.kind == "text" and not s.is_decor:
            s.role = "content-text"
        elif s.kind == "pic" and not s.is_decor and not s.is_offscreen and not is_bg_image:
            s.role = "content-image"
        else:
            s.role = "static"


def _dedupe(shapes, tol=0.15):
    """Bỏ ảnh trùng vị trí+kích thước (±tol inch) — slide gốc hay có ảnh chồng nhau.
    Giữ ảnh đầu tiên tại mỗi vị trí."""
    out = []
    for s in shapes:
        dup = any(abs(s.left - o.left) < tol and abs(s.top - o.top) < tol
                  and abs(s.width - o.width) < tol and abs(s.height - o.height) < tol
                  for o in out)
        if not dup:
            out.append(s)
    return out


def _detect_grid(images: list[ShapeInfo]) -> int:
    """Đếm số ảnh nằm trong 1 'grid' — nhiều ảnh cùng kích thước (±10%)."""
    if len(images) < 2:
        return 0
    best = 0
    for base in images:
        same = [im for im in images
                if abs(im.width - base.width) < base.width * 0.12
                and abs(im.height - base.height) < base.height * 0.12]
        best = max(best, len(same))
    return best


def _classify(slide: SlideInfo, sw: float, sh: float) -> None:
    """Nhận diện loại slide + tạo chữ ký gom nhóm (phân biệt bố cục sâu)."""
    all_text = " ".join(s.text.upper() for s in slide.shapes if s.text)
    imgs = slide.content_images
    n_img = len(imgs)
    n_txt = len(slide.content_texts)

    if "THANK" in all_text:
        kind = "Thank You Slide"
    elif "DIVIDER" in all_text:
        kind = "Divider Slide"
    elif slide.index == 1 or "TITLE SLIDE" in all_text:
        kind = "Title Slide"
    else:
        # phân biệt bố cục ảnh THẬT
        grid_n = _detect_grid(imgs)
        big = [im for im in imgs if im.width >= sw * 0.55 and im.height >= sh * 0.55]
        if n_img == 0:
            kind = "Title and Content" if n_txt else "Blank Content"
        elif big and n_img <= 2:
            kind = "Single Large Image"
        elif grid_n >= 3:
            kind = f"Image Grid ({grid_n})"
        elif n_img == 1:
            kind = "Content with Image" if n_txt else "Single Image"
        elif n_img == 2:
            kind = "Two Images"
        else:
            kind = f"Multiple Image ({n_img})"

    slide.kind = kind
    # chữ ký gom nhóm: dùng chính kind (đã đủ mịn để phân biệt bố cục)
    slide.signature = kind


def analyze(path: str) -> list[SlideInfo]:
    prs = Presentation(path)
    sw, sh = Emu(prs.slide_width).inches, Emu(prs.slide_height).inches
    slides = []
    for i, s in enumerate(prs.slides, 1):
        info = SlideInfo(index=i, slide_area=sw * sh)
        _walk(s.shapes, sw, sh, info.shapes)
        _tag_roles(info, sw, sh)
        _classify(info, sw, sh)
        slides.append(info)
    return slides


def group_slides(slides: list[SlideInfo]) -> dict[str, list[SlideInfo]]:
    """Gom slide cùng chữ ký (cùng bố cục) -> 1 layout."""
    groups: dict[str, list[SlideInfo]] = {}
    for s in slides:
        groups.setdefault(s.signature, []).append(s)
    return groups


if __name__ == "__main__":
    import sys
    src = sys.argv[1] if len(sys.argv) > 1 else \
        "/Users/thien.ho/Projects/Tool-FE-Helper/pptx-master/Sales Deck Template.pptx"
    slides = analyze(src)
    print(f"\n{'Slide':<6}{'Loại nhận diện':<22}{'#ảnh':<6}{'#text':<7}{'Chữ ký'}")
    print("-" * 70)
    for s in slides:
        print(f"{s.index:<6}{s.kind:<22}{s.n_content_images:<6}{len(s.content_texts):<7}{s.signature}")

    print("\n=== GOM NHÓM (mỗi nhóm -> 1 layout) ===")
    groups = group_slides(slides)
    for i, (sig, members) in enumerate(groups.items(), 1):
        idxs = ", ".join(str(m.index) for m in members)
        name = members[0].kind
        print(f"  Layout {i}: '{name}'  <- slide {idxs}")
    print(f"\nTổng: {len(slides)} slide -> {len(groups)} layout")
