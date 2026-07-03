"""verify.py — kiểm tra file .pptx output: id trùng, ảnh resolved, placeholder count."""
from __future__ import annotations
import sys, zipfile, re


def verify(path: str):
    problems = []
    with zipfile.ZipFile(path) as z:
        layout_files = [n for n in z.namelist()
                        if re.match(r"ppt/slideLayouts/slideLayout\d+\.xml$", n)]
        for lf in sorted(layout_files):
            xml = z.read(lf).decode("utf-8", "ignore")
            # duplicate cNvPr id
            ids = re.findall(r'<p:cNvPr id="(\d+)"', xml)
            dup = {i for i in ids if ids.count(i) > 1}
            # ảnh: mọi r:embed phải resolve trong rels
            rels_name = lf.replace("slideLayouts/", "slideLayouts/_rels/") + ".rels"
            relids = set()
            if rels_name in z.namelist():
                relids = set(re.findall(r'Id="([^"]+)"', z.read(rels_name).decode()))
            embeds = set(re.findall(r'r:embed="([^"]+)"', xml))
            missing = embeds - relids
            name = re.search(r'<p:cSld name="([^"]*)"', xml)
            name = name.group(1) if name else lf
            n_ph = len(re.findall(r'<p:ph ', xml))
            n_pic = xml.count("<a:blip")
            # placeholder type/idx trùng (ctrTitle/title/subTitle chỉ được 1; idx phải unique)
            ph_attrs = re.findall(r'<p:ph ([^/>]*)/?>', xml)
            types = [re.search(r'type="([^"]+)"', p).group(1) for p in ph_attrs if 'type=' in p]
            uniq_types = {"ctrTitle", "title", "subTitle"}  # các type chỉ được xuất hiện 1 lần
            dup_type = {t for t in types if t in uniq_types and types.count(t) > 1}
            idxs = [re.search(r'idx="(\d+)"', p).group(1) for p in ph_attrs if 'idx=' in p]
            dup_idx = {i for i in idxs if idxs.count(i) > 1}
            status = "OK"
            if dup:
                problems.append(f"{lf}: DUPLICATE cNvPr ids {dup}")
                status = "DUP-ID"
            if missing:
                problems.append(f"{lf}: unresolved r:embed {missing}")
                status = "IMG-MISSING"
            if dup_type:
                problems.append(f"{lf}: DUPLICATE ph type {dup_type}")
                status = "DUP-PH-TYPE"
            if dup_idx:
                problems.append(f"{lf}: DUPLICATE ph idx {dup_idx}")
                status = "DUP-PH-IDX"
            print(f"  {name:<24} ph={n_ph:<3} images={n_pic:<3} [{status}]")

    print()
    if problems:
        print("❌ VẤN ĐỀ:")
        for p in problems:
            print("   -", p)
        return False
    print("✅ Không phát hiện lỗi cấu trúc (id unique + ảnh resolved).")
    return True


if __name__ == "__main__":
    verify(sys.argv[1])
