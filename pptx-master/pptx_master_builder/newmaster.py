"""newmaster.py — tạo 1 SlideMaster MỚI copy theme từ master gốc.

Layout tool tạo sẽ gắn vào master mới này (gom 1 group riêng, dễ phân biệt).
Master mới: clone element master[0] (bỏ sldLayoutIdLst cũ) + copy theme part + relate.
"""
from __future__ import annotations
import copy
from pptx.parts.slide import SlideMasterPart
from pptx.opc.packuri import PackURI
from pptx.opc.constants import CONTENT_TYPE as CT, RELATIONSHIP_TYPE as RT
from pptx.oxml.ns import qn


def _next_partname(package, folder, stem, ext="xml"):
    n = 1
    existing = {str(p.partname) for p in package.iter_parts()}
    while f"/ppt/{folder}/{stem}{n}.{ext}" in existing:
        n += 1
    return PackURI(f"/ppt/{folder}/{stem}{n}.{ext}")


def _global_max_master_id(prs):
    lst = prs.part._element.find(qn("p:sldMasterIdLst"))
    ids = [int(e.get("id")) for e in lst.findall(qn("p:sldMasterId")) if e.get("id")]
    return max(ids) if ids else 2147483648


def create_master(prs, base_master, name: str):
    """Tạo SlideMaster mới copy theme+style từ base_master. Trả (master_part, sldLayoutIdLst el).
    Master mới CHƯA có layout — caller thêm layout qua relate + sldLayoutId."""
    package = prs.part.package
    pres_part = prs.part

    # 1. clone element master, đặt tên, XÓA sldLayoutIdLst cũ (master mới bắt đầu rỗng layout)
    new_el = copy.deepcopy(base_master.element)
    csld = new_el.find(qn("p:cSld"))
    csld.set("name", name)

    # đổi creationId (clone -> trùng master gốc -> PowerPoint repair). Seed theo partname.
    P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main"
    _pn = _next_partname(package, "slideMasters", "slideMaster")
    _seed = int("".join(ch for ch in str(_pn) if ch.isdigit()) or "1")
    for cid in new_el.iter("{%s}creationId" % P14):
        cid.set("val", str((_seed * 40503 + 12345) % 4294967295))
    old_lst = new_el.find(qn("p:sldLayoutIdLst"))
    if old_lst is not None:
        for sli in list(old_lst):
            old_lst.remove(sli)
    else:
        # tạo sldLayoutIdLst rỗng (đặt sau cSld+clrMap, đúng schema order: sau clrMap)
        clrmap = new_el.find(qn("p:clrMap"))
        old_lst = new_el.makeelement(qn("p:sldLayoutIdLst"), {})
        clrmap.addnext(old_lst)

    # 2. tạo master part mới (dùng lại partname đã tính ở trên)
    new_part = SlideMasterPart(_pn, CT.PML_SLIDE_MASTER, package, new_el)

    # 3. tạo THEME part RIÊNG cho master mới (mỗi master BẮT BUỘC có theme riêng;
    # share theme với master khác -> PowerPoint repair). Copy nội dung theme gốc.
    base_theme = None
    for rel in base_master.part.rels.values():
        if rel.reltype == RT.THEME:
            base_theme = rel.target_part
            break
    if base_theme is not None:
        theme_pn = _next_partname(package, "theme", "theme")
        from pptx.opc.package import Part
        theme_blob = base_theme.blob
        new_theme = Part(theme_pn, base_theme.content_type, package, theme_blob)
        new_part.relate_to(new_theme, RT.THEME)

    # 4. copy image rel của master (background...) nếu có
    for rel in base_master.part.rels.values():
        if rel.reltype == RT.IMAGE:
            new_part.relate_to(rel.target_part, RT.IMAGE)

    # 5. presentation -> relate master mới + thêm <p:sldMasterId>
    rId = pres_part.relate_to(new_part, RT.SLIDE_MASTER)
    m_lst = pres_part._element.find(qn("p:sldMasterIdLst"))
    sm = m_lst.makeelement(qn("p:sldMasterId"), {"id": str(_global_max_master_id(prs) + 1)})
    sm.set(qn("r:id"), rId)
    m_lst.append(sm)

    return new_part, old_lst
