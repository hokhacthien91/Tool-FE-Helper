"""layout.py — tạo slideLayout part mới trong package + wiring.

Công thức đã verify qua spike (Phase 0):
  - deepcopy element layout 'Blank' làm khung, đổi cSld name
  - XmlPart(partname, CT, package, element)  <-- QUAN TRỌNG: blob serialize từ _element
    (dùng plain Part sẽ chụp blob cố định, shapes append sau bị mất)
  - layout.relate_to(master, SLIDE_MASTER) + master.relate_to(layout, SLIDE_LAYOUT)
  - thêm <p:sldLayoutId> vào master.sldLayoutIdLst
"""
from __future__ import annotations
import copy
from pptx.oxml.ns import qn
from pptx.parts.slide import SlideLayoutPart
from pptx.opc.packuri import PackURI
from pptx.opc.constants import CONTENT_TYPE as CT, RELATIONSHIP_TYPE as RT


def _global_max_layout_id(package) -> int:
    """max sldLayoutId id qua MỌI slideMaster (id phải unique toàn cục)."""
    mx = 2147483648
    for p in package.iter_parts():
        if str(p.partname).startswith("/ppt/slideMasters/slideMaster"):
            for sli in p._element.iter(qn("p:sldLayoutId")):
                v = sli.get("id")
                if v:
                    mx = max(mx, int(v))
    return mx


def _next_layout_partname(package) -> PackURI:
    existing = {str(p.partname) for p in package.iter_parts()
                if str(p.partname).startswith("/ppt/slideLayouts/slideLayout")}
    n = 1
    while f"/ppt/slideLayouts/slideLayout{n}.xml" in existing:
        n += 1
    return PackURI(f"/ppt/slideLayouts/slideLayout{n}.xml")


def create_layout(prs, master_part, base_layout, name: str, layout_id_lst=None):
    """Tạo layout part rỗng (khung từ base_layout), gắn vào master_part. Trả (part, spTree, element).
    master_part: SlideMasterPart để gắn layout. layout_id_lst: sldLayoutIdLst element (nếu None,
    lấy từ master_part). Chưa append shapes — caller append rồi để nguyên."""
    package = prs.part.package

    partname = _next_layout_partname(package)
    new_el = copy.deepcopy(base_layout.element)
    csld = new_el.find(qn("p:cSld"))
    csld.set("name", name)

    # ĐỔI <p14:creationId val> thành số DUY NHẤT (giữ nguyên cấu trúc extLst):
    # clone từ base -> mọi layout trùng creationId -> PowerPoint repair. Đặt val theo
    # số partname để mỗi layout 1 id khác nhau (KHÔNG xóa extLst - PowerPoint cần nó).
    P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main"
    seed = int("".join(ch for ch in str(partname) if ch.isdigit()) or "1")
    for cid in new_el.iter("{%s}creationId" % P14):
        cid.set("val", str((seed * 2654435761) % 4294967295))

    sp_tree = csld.find(qn("p:spTree"))
    # xoá shape thừa của base (giữ lại nvGrpSpPr + grpSpPr, bỏ placeholder mẫu của Blank)
    for ch in list(sp_tree):
        if ch.tag in (qn("p:sp"), qn("p:pic"), qn("p:grpSp"), qn("p:graphicFrame")):
            sp_tree.remove(ch)

    part = SlideLayoutPart(partname, CT.PML_SLIDE_LAYOUT, package, new_el)
    part.relate_to(master_part, RT.SLIDE_MASTER)

    rId = master_part.relate_to(part, RT.SLIDE_LAYOUT)
    lst = layout_id_lst if layout_id_lst is not None else master_part._element.find(qn("p:sldLayoutIdLst"))
    # sldLayoutId id phải unique TOÀN CỤC (mọi master), KHÔNG chỉ master hiện tại.
    # V2 có 3 master dùng dải id sát nhau -> max(1 master)+1 đè dải master khác -> repair.
    new_id = _global_max_layout_id(package) + 1
    sli = lst.makeelement(qn("p:sldLayoutId"), {"id": str(new_id)})
    sli.set(qn("r:id"), rId)
    lst.append(sli)

    return part, sp_tree, new_el


def max_shape_id(sp_tree) -> int:
    ids = [int(c.get("id")) for c in sp_tree.iter(qn("p:cNvPr")) if c.get("id")]
    return max(ids) if ids else 1
