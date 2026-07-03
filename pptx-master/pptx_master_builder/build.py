"""build.py — orchestrator: input.pptx (slide đã duyệt) -> output.pptx (master + layout editable).

Luồng:
  1. classify.analyze + group_slides  -> các nhóm slide cùng bố cục
  2. mỗi nhóm: lấy slide ĐẠI DIỆN (đầu nhóm) -> tạo 1 layout
  3. duyệt shape của slide đại diện theo role đã tag:
       - static        -> copy_static (giữ nguyên, remap ảnh, fix id)
       - content-text  -> make_title_ph (thêm <p:ph> title/body)
       - content-image -> thay bằng make_pic_ph (picture placeholder cùng vị trí)
"""
from __future__ import annotations
import sys
from pptx import Presentation
from pptx.oxml.ns import qn
from pptx.enum.shapes import MSO_SHAPE_TYPE

MSO_PICTURE = MSO_SHAPE_TYPE.PICTURE

from classify import analyze, group_slides
from layout import create_layout, max_shape_id
from newmaster import create_master
from promote import IdGen, copy_static, make_title_ph, make_pic_ph, make_pic_ph_from_original

SHAPE_TAGS = (qn("p:sp"), qn("p:pic"), qn("p:grpSp"), qn("p:graphicFrame"))


def _base_blank(master):
    for l in master.slide_layouts:
        if l.name == "Blank":
            return l
    return master.slide_layouts[-1]


def _prune_unused_layouts(prs, master, keep_parts):
    """Xóa các layout default không slide nào dùng (gỡ rel), rồi ĐỒNG BỘ LẠI sldLayoutIdLst.
    keep_parts: set các layout part cần giữ (layout mới tạo)."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.oxml.ns import qn
    used = {s.slide_layout.part for s in prs.slides} | set(keep_parts)
    master_part = master.part
    for rid, rel in list(master_part.rels.items()):
        if rel.reltype == RT.SLIDE_LAYOUT and rel.target_part not in used:
            master_part.rels.pop(rid)
    _sync_layout_id_lst(master)


def _sync_layout_id_lst(master):
    """Xây LẠI hoàn toàn <p:sldLayoutIdLst> khớp với rels layout thực tế.
    Tránh sldLayoutId trỏ tới rId đã xóa / sai mapping -> PowerPoint repair.
    Giữ id nếu sldLayoutId cũ còn tham chiếu rId hợp lệ; cấp id mới cho phần thiếu."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.oxml.ns import qn
    mp = master.part
    lst = mp._element.find(qn("p:sldLayoutIdLst"))
    layout_rids = [rid for rid, rel in mp.rels.items() if rel.reltype == RT.SLIDE_LAYOUT]

    # id sldLayoutId hiện có (giữ lại các id đang dùng để ổn định)
    existing = {sli.get(qn("r:id")): sli.get("id") for sli in lst.findall(qn("p:sldLayoutId"))}
    # id mới phải > max TOÀN CỤC (mọi master) — id chỉ unique trong 1 master vẫn gây repair
    from layout import _global_max_layout_id
    next_id = _global_max_layout_id(mp.package) + 1

    for sli in list(lst):     # xóa hết, dựng lại
        lst.remove(sli)
    for rid in layout_rids:
        sid = existing.get(rid)
        if sid is None:
            sid = str(next_id)
            next_id += 1
        el = lst.makeelement(qn("p:sldLayoutId"), {"id": sid})
        el.set(qn("r:id"), rid)
        lst.append(el)


def _prune_all_masters(prs, keep_parts):
    """Xóa layout không dùng ở TẤT CẢ master (không chỉ master[0]). Layout 'dùng' =
    slide đang trỏ tới HOẶC layout tool vừa tạo (keep_parts). Rồi sync sldLayoutIdLst từng master."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    used = {s.slide_layout.part for s in prs.slides} | set(keep_parts)
    empty_masters = []
    for master in prs.slide_masters:
        mp = master.part
        for rid, rel in list(mp.rels.items()):
            if rel.reltype == RT.SLIDE_LAYOUT and rel.target_part not in used:
                mp.rels.pop(rid)
        remaining = [r for r in mp.rels.values() if r.reltype == RT.SLIDE_LAYOUT]
        if not remaining:
            empty_masters.append(mp)   # master 0 layout -> KHÔNG hợp lệ, xóa
        else:
            _sync_layout_id_lst(master)
    # xóa master rỗng khỏi presentation
    if empty_masters:
        _drop_masters(prs, empty_masters)


def _drop_masters(prs, master_parts):
    """Gỡ các master (rỗng layout sau prune) khỏi presentation: sldMasterId + rel."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    drop = set(master_parts)
    pres = prs.part
    m_lst = pres._element.find(qn("p:sldMasterIdLst"))
    for rid, rel in list(pres.rels.items()):
        if rel.reltype == RT.SLIDE_MASTER and rel.target_part in drop:
            for sm in m_lst.findall(qn("p:sldMasterId")):
                if sm.get(qn("r:id")) == rid:
                    m_lst.remove(sm)
                    break
            pres.rels.pop(rid)


def _remove_old_masters(prs, keep_master_part):
    """Xóa hết master cũ, chỉ giữ keep_master_part. Slide đang trỏ layout của master cũ ->
    reassign về layout ĐẦU của master mới (để không mồ côi). CHỈ chạy khi user tick."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    from pptx.oxml.ns import qn
    # layout đầu của master mới làm fallback cho slide
    keep_layout = None
    for rel in keep_master_part.rels.values():
        if rel.reltype == RT.SLIDE_LAYOUT:
            keep_layout = rel.target_part
            break
    # slide nào đang trỏ layout KHÔNG thuộc master mới -> reassign
    keep_layouts = {rel.target_part for rel in keep_master_part.rels.values()
                    if rel.reltype == RT.SLIDE_LAYOUT}
    for s in prs.slides:
        if s.slide_layout.part not in keep_layouts and keep_layout is not None:
            _reassign_layout(s.part, keep_layout)

    # gỡ sldMasterId + rel của master cũ khỏi presentation
    pres = prs.part
    m_lst = pres._element.find(qn("p:sldMasterIdLst"))
    for rid, rel in list(pres.rels.items()):
        if rel.reltype == RT.SLIDE_MASTER and rel.target_part is not keep_master_part:
            for sm in m_lst.findall(qn("p:sldMasterId")):
                if sm.get(qn("r:id")) == rid:
                    m_lst.remove(sm)
                    break
            pres.rels.pop(rid)


def _reassign_layout(slide_part, new_layout_part):
    """Đổi slide layout của 1 slide sang layout mới (xóa rel cũ, thêm rel mới)."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    old_rid = None
    for rid, rel in slide_part.rels.items():
        if rel.reltype == RT.SLIDE_LAYOUT:
            old_rid = rid
            break
    if old_rid is not None:
        slide_part.rels.pop(old_rid)
    slide_part.relate_to(new_layout_part, RT.SLIDE_LAYOUT)


def plan(src: str):
    """Trả về danh sách nhóm (cho UI review). Mỗi nhóm có `elements` (ảnh+text) để user
    chọn cố định/cho-sửa: [{name, signature, slides, rep_slide, elements:[{id,type,label,default}]}]."""
    groups = group_slides(analyze(src))
    out = []
    for sig, members in groups.items():
        r = members[0]
        out.append({"name": r.kind, "signature": sig,
                    "slides": [m.index for m in members],
                    "rep_slide": r.index,                 # slide đại diện (để lấy thumbnail ảnh)
                    "n_img": r.n_content_images, "n_txt": len(r.content_texts),
                    "elements": r.elements()})
    return out


def _promote_text2(shp_el, src_part, part, idgen, name, n_txt_ph, ph_idx):
    """Promote 1 text shape -> title/body placeholder với idx cho sẵn (đã đảm bảo unique)."""
    ph_type = "ctrTitle" if n_txt_ph == 0 and name in ("Title Slide", "Thank You Slide") \
        else ("title" if n_txt_ph == 0 else "body")
    return make_title_ph(shp_el, src_part, part, idgen, ph_type=ph_type, ph_idx=ph_idx)


def _build_one_layout(prs, new_master_part, layout_lst, base, name, rep, members,
                      choices=None, reassign=True):
    """Tạo 1 layout từ slide đại diện, gắn vào new_master_part. Trả (part, n_txt, n_pic).
    image_mode: 'keep' = giữ ảnh gốc trong placeholder; 'empty' = placeholder trống.
    reassign: True = gắn slide nhóm về layout này (slide mẫu). False = chỉ tạo layout (gallery)."""
    slide_obj = prs.slides[rep.index - 1]
    src_part = slide_obj.part
    sp_children = [ch for ch in slide_obj.shapes._spTree if ch.tag in SHAPE_TAGS]

    part, sp_tree, _el = create_layout(prs, new_master_part, base, name, layout_id_lst=layout_lst)
    idgen = IdGen(max_shape_id(sp_tree) + 1)

    # cấp ph idx DUY NHẤT: gom TẤT CẢ idx đã có — cả trong layout Blank VÀ trong shape gốc
    # sẽ copy (static shape của V2 mang ph idx sẵn) -> tránh trùng bất kể thứ tự duyệt.
    used_idx = {int(ph.get("idx")) for ph in sp_tree.iter(qn("p:ph")) if ph.get("idx")}
    for ch in sp_children:
        for ph in ch.iter(qn("p:ph")):
            if ph.get("idx"):
                used_idx.add(int(ph.get("idx")))

    def next_ph_idx(start):
        i = start
        while i in used_idx:
            i += 1
        used_idx.add(i)
        return i

    # choices: {shape_idx: "fixed"|"editable"} từ UI. Không có -> dùng default theo role.
    def is_editable(info):
        if info is None:
            return False
        c = choices.get(info.idx) if choices else None
        if c is not None:
            return c == "editable"
        return info.role in ("content-text", "content-image")   # default

    used_pic = set()
    n_txt_ph = n_pic_ph = 0

    for shp_el, info in zip(sp_children, rep.shapes):
        # BỎ QUA graphicFrame (chart/table/SmartArt): rel phức tạp -> repair. Giữ ở slide mẫu.
        if shp_el.tag == qn("p:graphicFrame"):
            continue
        # user XÓA element (layer thừa/bị đè) -> bỏ hẳn khỏi layout
        if info is not None and choices and choices.get(info.idx) == "deleted":
            continue
        editable = is_editable(info)
        if info is not None and info.kind == "text" and info.text.strip() and editable:
            # TEXT -> placeholder editable + text/style gốc + hasCustomPrompt (hiện sẵn text, gõ đúng style)
            idx = None if n_txt_ph == 0 else next_ph_idx(10)
            ph_type = "ctrTitle" if n_txt_ph == 0 and name in ("Title Slide", "Thank You Slide") \
                else ("title" if n_txt_ph == 0 else "body")
            sp_tree.append(make_title_ph(shp_el, src_part, part, idgen,
                                         ph_type=ph_type, ph_idx=idx, inject_style=True))
            n_txt_ph += 1
        elif info is not None and info.kind == "pic" and editable:
            key = (round(info.left, 1), round(info.top, 1))
            if key not in used_pic:   # bỏ ảnh trùng/chồng
                idx = next_ph_idx(20)
                sp_tree.append(make_pic_ph_from_original(shp_el, src_part, part, idgen, ph_idx=idx))
                used_pic.add(key)
                n_pic_ph += 1
        else:
            # CỐ ĐỊNH (default hoặc user chọn fixed): giữ nguyên shape
            sp_tree.append(copy_static(shp_el, src_part, part, idgen))

    _sanitize_layout(part)   # net an toàn: dọn chart/rel mồ côi còn sót bất kể đường nào

    # gắn lại slide gốc về layout mới (giữ slide làm 'slide mẫu' text/ảnh thật để duplicate).
    # CHỈ reassign khi layout CŨ của slide "trống" (nội dung nằm trên slide, như deck chưa có
    # master). Nếu slide KẾ THỪA ảnh/logo từ layout cũ (deck đã có master đẹp như V2) -> GIỮ
    # nguyên, reassign sẽ làm mất phần kế thừa.
    if reassign:
        for m in members:
            sp = prs.slides[m.index - 1]
            if _layout_is_blankish(sp.slide_layout):
                _reassign_layout(sp.part, part)
    return part, n_txt_ph, n_pic_ph


def _strip_placeholder(sp_el):
    """Gỡ <p:ph> khỏi 1 shape text -> thành text thuần CỐ ĐỊNH (giữ chữ+style, hiện sẵn
    trên slide mới thay vì thành placeholder 'Click to add title')."""
    nvpr = sp_el.find(qn("p:nvSpPr"))
    if nvpr is not None:
        nvpr = nvpr.find(qn("p:nvPr"))
        ph = nvpr.find(qn("p:ph")) if nvpr is not None else None
        if ph is not None:
            nvpr.remove(ph)


def _layout_is_blankish(layout) -> bool:
    """Layout 'trống' = không có picture kế thừa (Blank của deck chưa build master).
    Deck đã có master (V2) thì layout chứa ảnh nền/logo -> KHÔNG reassign để khỏi mất."""
    return not any(sh.shape_type == MSO_PICTURE for sh in layout.shapes)


def _sanitize_layout(part):
    """Lượt dọn cuối layout part: (1) xóa mọi <p:graphicFrame> còn sót (chart/table/SmartArt),
    (2) gỡ mọi attr rId trỏ tới rel KHÔNG phải image (mồ côi -> PowerPoint repair)."""
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    el = part._element
    for gf in el.findall(".//" + qn("p:graphicFrame")):
        p = gf.getparent()
        if p is not None:
            p.remove(gf)
    # rId hợp lệ = image rel; các rId khác trong XML -> gỡ
    ok = {rid for rid, rel in part.rels.items() if rel.reltype == RT.IMAGE}
    ref_attrs = (qn("r:embed"), qn("r:link"), qn("r:id"))
    for node in el.iter():
        for a in ref_attrs:
            v = node.get(a)
            if v and v not in ok:
                node.attrib.pop(a, None)


def build(src: str, out: str, verbose=True, names: dict | None = None, options: dict | None = None,
          on_progress=None):
    """names: {signature: custom_layout_name}. options:
        image_mode: 'keep' | 'empty' | 'both'
        prune: True -> xóa layout cũ không dùng ở MỌI master (default True)
        disabled: set/list signature bị TẮT.
    on_progress(done, total, name): gọi trước khi build mỗi layout (UI hiện 'layout X/Y').
    Layout tool tạo gắn vào master gốc (master[0]) — đã verify sạch mọi deck."""
    names = names or {}
    opt = options or {}
    prune = opt.get("prune", False)          # default GIỮ layout cũ + thêm mới
    disabled = set(opt.get("disabled") or [])
    all_choices = opt.get("choices") or {}   # {signature: {shape_id: "fixed"|"editable"}}

    groups = group_slides(analyze(src))
    prs = Presentation(src)
    master = prs.slide_masters[0]
    layout_lst = master.part._element.find(qn("p:sldLayoutIdLst"))
    base = _base_blank(master)

    # tên layout đã tồn tại (mọi master) — để thêm số khi trùng
    taken = {l.name for m in prs.slide_masters for l in m.slide_layouts}

    def unique_name(nm):
        if nm not in taken:
            taken.add(nm)
            return nm, False
        i = 2
        while f"{nm} ({i})" in taken:
            i += 1
        new = f"{nm} ({i})"
        taken.add(new)
        return new, True

    created, new_layout_parts, renamed = [], [], []
    todo = [(sig, m) for sig, m in groups.items() if sig not in disabled]
    total = len(todo)
    for done, (sig, members) in enumerate(todo):
        rep = members[0]
        # choices int-keyed (JSON gửi key string) -> chuẩn hoá về int
        raw_ch = all_choices.get(sig) or {}
        choices = {int(k): v for k, v in raw_ch.items()}
        lname, was_renamed = unique_name(names.get(sig) or rep.kind)
        if was_renamed:
            renamed.append((names.get(sig) or rep.kind, lname))
        if on_progress:
            try:
                on_progress(done, total, lname)
            except Exception:
                pass
        part, n_txt, n_pic = _build_one_layout(prs, master.part, layout_lst, base,
                                               lname, rep, members, choices=choices)
        new_layout_parts.append(part)
        created.append((lname, [m.index for m in members], n_txt, n_pic))
        if verbose:
            idxs = ",".join(str(m.index) for m in members)
            print(f"  Layout '{lname}'  <- slide {idxs}  | text ph={n_txt} pic ph={n_pic}")

    if on_progress:
        try:
            on_progress(total, total, "Saving…")
        except Exception:
            pass
    if prune:
        _prune_all_masters(prs, new_layout_parts)   # xóa layout cũ không dùng ở MỌI master
    prs.save(out)
    if verbose:
        print(f"\nSAVED: {out}  ({len(created)} layout, {'đã dọn layout cũ' if prune else 'giữ layout cũ'})")
        if renamed:
            print("  ⚠ đổi tên do trùng:", ", ".join(f"{a}→{b}" for a, b in renamed))
    return created, renamed


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else \
        "/Users/thien.ho/Projects/Tool-FE-Helper/pptx-master/Sales Deck Template.pptx"
    out = sys.argv[2] if len(sys.argv) > 2 else \
        "/private/tmp/claude-502/-Users-thien-ho-Projects-Tool-FE-Helper-pptx-master/33e88efd-278a-4d19-9fa8-7e3000b504de/scratchpad/BUILD_out.pptx"
    print("Building master slides...")
    build(src, out)
