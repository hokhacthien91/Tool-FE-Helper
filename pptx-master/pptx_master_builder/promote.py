"""promote.py — copy shape từ slide sang layout, fix id + remap ảnh,
và promote shape 'content' thành placeholder editable.

Công thức đã verify qua spike (Phase 0):
  - remap r:embed: relate image part sang layout part, set rId mới
  - reassign cNvPr id duy nhất (tránh PowerPoint repair vì id trùng)
  - text content  -> thêm <p:ph type="title"/"body">
  - ảnh content    -> thay <p:pic> bằng <p:sp> có <p:ph type="pic">
"""
from __future__ import annotations
import copy
from pptx.oxml.ns import qn
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from lxml import etree

NSP = "http://schemas.openxmlformats.org/presentationml/2006/main"
NA = "http://schemas.openxmlformats.org/drawingml/2006/main"
EMU_PER_IN = 914400

R_EMBED = qn("r:embed")
R_LINK = qn("r:link")
BLIP = qn("a:blip")
# các attr tham chiếu tới media/external cần remap (a:blip, asvg:svgBlip, a:hlinkClick...)
_REF_ATTRS = (R_EMBED, R_LINK, qn("r:id"))


class IdGen:
    """Cấp cNvPr id duy nhất trong 1 layout."""
    def __init__(self, start: int):
        self.n = start

    def next(self) -> str:
        v = self.n
        self.n += 1
        return str(v)


def remap_images(shape_el, src_part, layout_part):
    """Remap MỌI tham chiếu media (r:embed / r:link / r:id) trong shape đã copy:
    bao gồm <a:blip> chính VÀ <asvg:svgBlip> trong extLst (ảnh SVG có cả 2).
    Cache theo old_rid để 1 ảnh dùng nhiều nơi không tạo rel trùng."""
    cache = {}
    for el in shape_el.iter():
        for attr in _REF_ATTRS:
            old = el.get(attr)
            if not old:
                continue
            try:
                target = src_part.related_part(old)
            except KeyError:
                continue  # không phải part reference (bỏ qua an toàn)
            reltype = src_part.rels[old].reltype
            if "image" in reltype:
                if old not in cache:
                    cache[old] = layout_part.relate_to(target, RT.IMAGE)
                el.set(attr, cache[old])
            else:
                # rel non-image (chart/tags/hdphoto/oleObject...): KHÔNG copy được part đó
                # -> xóa attr rId mồ côi để tránh gãy rel (PowerPoint repair).
                el.attrib.pop(attr, None)


def reassign_ids(shape_el, idgen: IdGen):
    """Gán id duy nhất cho mọi cNvPr (tránh trùng -> repair)."""
    for cnvpr in shape_el.iter(qn("p:cNvPr")):
        cnvpr.set("id", idgen.next())


def _strip_graphic_frames(el):
    """Xóa mọi <p:graphicFrame> lồng (chart/table/SmartArt) — rel phức tạp, gây repair."""
    for gf in el.findall(".//" + qn("p:graphicFrame")):
        parent = gf.getparent()
        if parent is not None:
            parent.remove(gf)


def copy_static(shape_el, src_part, layout_part, idgen: IdGen):
    """Copy 1 shape giữ nguyên (nền/trang trí): deepcopy + strip chart + remap ảnh + fix id."""
    new = copy.deepcopy(shape_el)
    _strip_graphic_frames(new)          # bỏ chart/table lồng trong group
    remap_images(new, src_part, layout_part)
    reassign_ids(new, idgen)
    return new


def _inject_liststyle(new):
    """Đưa style của run đầu (rPr) vào <a:lstStyle><a:lvl1pPr><a:defRPr> của txBody.
    -> khi user gõ text mới vào placeholder, chữ ra ĐÚNG font/cỡ/màu của text gốc (cách Güntner)."""
    txbody = new.find(qn("p:txBody"))
    if txbody is None:
        return
    # rPr của run đầu tiên
    rpr = None
    for r in txbody.iter(qn("a:r")):
        rpr = r.find(qn("a:rPr"))
        if rpr is not None:
            break
    if rpr is None:
        return
    # xoá lstStyle cũ (nếu có), tạo mới với defRPr = copy rPr gốc
    old = txbody.find(qn("a:lstStyle"))
    if old is not None:
        txbody.remove(old)
    lst = txbody.makeelement(qn("a:lstStyle"), {})
    lvl = lst.makeelement(qn("a:lvl1pPr"), {})
    defrpr = copy.deepcopy(rpr)
    defrpr.tag = qn("a:defRPr")           # rPr -> defRPr
    for a in ("dirty", "lang", "smtClean"):
        defrpr.attrib.pop(a, None)
    # GIỮ màu trong defRPr: prompt (hasCustomPrompt) LUÔN render 1 màu theo lstStyle
    # (giới hạn PowerPoint — kể cả file Güntner mẫu, prompt title chỉ 1 màu). Dùng màu
    # run đầu. Đa màu (vd "GO HERE" xanh) chỉ giữ trên SLIDE MẪU, không trên prompt New Slide.
    lvl.append(defrpr)
    lst.append(lvl)
    # lstStyle đặt SAU bodyPr, TRƯỚC <a:p>
    bodypr = txbody.find(qn("a:bodyPr"))
    if bodypr is not None:
        bodypr.addnext(lst)
    else:
        txbody.insert(0, lst)


def make_title_ph(shape_el, src_part, layout_part, idgen: IdGen, ph_type="title", ph_idx=None,
                  inject_style=False):
    """Promote 1 text shape thành title/body placeholder — GIỮ nguyên vị trí + text style,
    thêm <p:ph> vào nvPr. inject_style=True: nhúng style gốc vào lstStyle để user gõ ra đúng style."""
    new = copy.deepcopy(shape_el)
    remap_images(new, src_part, layout_part)
    reassign_ids(new, idgen)
    nvsp = new.find(qn("p:nvSpPr"))
    if nvsp is None:  # pic-based? bỏ qua
        return new
    # text placeholder BẮT BUỘC có <p:cNvSpPr><a:spLocks noGrp="1"/> (thiếu -> PowerPoint repair)
    cnvsp = nvsp.find(qn("p:cNvSpPr"))
    if cnvsp is not None:
        sl = cnvsp.find(qn("a:spLocks"))
        if sl is None:
            sl = cnvsp.makeelement(qn("a:spLocks"), {})
            cnvsp.insert(0, sl)
        sl.set("noGrp", "1")
    if inject_style:
        _inject_liststyle(new)
    nvpr = nvsp.find(qn("p:nvPr"))
    existing = nvpr.find(qn("p:ph"))
    if existing is not None:
        # shape ĐÃ là placeholder (vd slide gốc có sẵn ctrTitle) -> giữ nguyên,
        # nhưng THÊM hasCustomPrompt để New Slide hiện text run gốc thay vì "Click to add"
        existing.set("hasCustomPrompt", "1")
        return new
    attrs = {"type": ph_type, "hasCustomPrompt": "1"}   # <-- CHÌA KHÓA: New Slide hiện text
    if ph_idx is not None:                               # run gốc (DIVIDER SLIDE) đúng style,
        attrs["idx"] = str(ph_idx)                       # KHÔNG ra "Click to add title"
    ph = nvpr.makeelement(qn("p:ph"), attrs)
    nvpr.insert(0, ph)
    return new


def _prompt_font_size(w_in, h_in):
    """Cỡ chữ prompt (đơn vị 1/100 pt cho a:rPr sz) tự co theo ô nhỏ nhất.
    Ô càng nhỏ chữ càng nhỏ để không tràn/rớt chữ."""
    m = min(w_in, h_in)
    if m < 1.2:
        pt = 7
    elif m < 2.0:
        pt = 9
    elif m < 3.5:
        pt = 11
    else:
        pt = 14
    return pt * 100


def make_pic_ph_from_original(pic_el, src_part, layout_part, idgen: IdGen, ph_idx: int):
    """Biến <p:pic> gốc (đã có ảnh) thành PICTURE PLACEHOLDER giữ ảnh mặc định.
    -> layout hiện sẵn ảnh gốc (giống bản duyệt), user vẫn click thay được.
    Thêm <p:ph type="pic"> vào nvPr + spLocks noGrp + remap ảnh + fix id."""
    new = copy.deepcopy(pic_el)
    remap_images(new, src_part, layout_part)
    reassign_ids(new, idgen)
    nvpic = new.find(qn("p:nvPicPr"))
    nvpr = nvpic.find(qn("p:nvPr"))
    # thêm placeholder marker
    ph = nvpr.makeelement(qn("p:ph"), {"type": "pic", "idx": str(ph_idx)})
    nvpr.insert(0, ph)
    # picture placeholder BẮT BUỘC có <a:picLocks noGrp="1">. Nếu pic gốc đã có picLocks
    # (vd noChangeAspect) thì SET noGrp lên nó; chưa có thì tạo mới. (thiếu noGrp -> PowerPoint repair)
    cnvpic = nvpic.find(qn("p:cNvPicPr"))
    if cnvpic is not None:
        pl = cnvpic.find(qn("a:picLocks"))
        if pl is None:
            pl = cnvpic.makeelement(qn("a:picLocks"), {})
            cnvpic.insert(0, pl)
        pl.set("noGrp", "1")
    return new


def make_pic_ph(left_in, top_in, w_in, h_in, idgen: IdGen, ph_idx: int, name="Picture Placeholder"):
    """Tạo picture placeholder MỚI (<p:sp> type=pic) tại đúng vị trí ảnh gốc.
    Chuẩn OOXML: picture placeholder là <p:sp>, KHÔNG phải <p:pic>.
    Chữ prompt tự co theo kích thước ô + căn giữa + normAutofit để không rớt chữ."""
    off_x, off_y = int(left_in * EMU_PER_IN), int(top_in * EMU_PER_IN)
    ext_x, ext_y = int(w_in * EMU_PER_IN), int(h_in * EMU_PER_IN)
    sz = _prompt_font_size(w_in, h_in)
    xml = f'''<p:sp xmlns:p="{NSP}" xmlns:a="{NA}">
  <p:nvSpPr>
    <p:cNvPr id="{idgen.next()}" name="{name}"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr><p:ph type="pic" idx="{ph_idx}"/></p:nvPr>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="{off_x}" y="{off_y}"/><a:ext cx="{ext_x}" cy="{ext_y}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
  <p:txBody>
    <a:bodyPr wrap="square" anchor="ctr"><a:normAutofit fontScale="100000" lnSpcReduction="0"/></a:bodyPr>
    <a:lstStyle/>
    <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="{sz}"/><a:t>Click icon to add picture</a:t></a:r></a:p>
  </p:txBody>
</p:sp>'''
    return etree.fromstring(xml)
