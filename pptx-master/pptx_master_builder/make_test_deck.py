"""make_test_deck.py — tạo 1 file .pptx TỔNG HỢP để test mọi edge case của PPTX Master Builder.

Chạy:  python3 make_test_deck.py   ->  test_deck.pptx

Mỗi slide cover 1 edge case (xem EDGE_CASES audit). Dùng để:
  - build tool trên file này rồi verify visual -> bắt regression
  - kiểm nội dung không chồng chéo / mất shape / repair

Case python-pptx KHÔNG tạo được (SmartArt, video, OLE nhúng) -> ghi chú, cần thêm thủ công.
"""
import io
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from PIL import Image

SW, SH = Inches(13.333), Inches(7.5)


def _png(color, size=(400, 300)):
    """Tạo 1 ảnh PNG màu đặc (làm ảnh test)."""
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    buf.seek(0)
    return buf


def _title(slide, text):
    tb = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12), Inches(0.8))
    p = tb.text_frame.paragraphs[0]
    p.text = text
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = RGBColor(0x1F, 0x6F, 0xC4)
    return tb


def build_test_deck(path="test_deck.pptx"):
    prs = Presentation()
    prs.slide_width = SW
    prs.slide_height = SH
    blank = prs.slide_layouts[6]   # layout Blank
    notes = []   # ghi chú từng slide

    # 1. CONNECTOR ở GIỮA các shape (bug #1) — ảnh + connector + text xen kẽ
    s = prs.slides.add_slide(blank)
    _title(s, "1. Connector between shapes (bug #1)")
    s.shapes.add_picture(_png((80, 140, 200)), Inches(1), Inches(2), Inches(3), Inches(2))
    s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(4.2), Inches(3), Inches(6), Inches(3))
    tb = s.shapes.add_textbox(Inches(6.5), Inches(2), Inches(4), Inches(2))
    tb.text_frame.text = "Content text after a connector — must keep correct role"
    s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(1), Inches(4.5), Inches(11), Inches(4.5))
    s.shapes.add_picture(_png((200, 100, 80)), Inches(8), Inches(2), Inches(2), Inches(1.5))
    notes.append("Connector xen giữa ảnh/text — kiểm role không lệch, không mất shape")

    # 2. TABLE + text
    s = prs.slides.add_slide(blank)
    _title(s, "2. Table + text")
    tb = s.shapes.add_textbox(Inches(0.5), Inches(1.3), Inches(6), Inches(1))
    tb.text_frame.text = "This slide has a table below."
    rows, cols = 3, 4
    tbl = s.shapes.add_table(rows, cols, Inches(1), Inches(2.5), Inches(10), Inches(3)).table
    for r in range(rows):
        for c in range(cols):
            tbl.cell(r, c).text = f"R{r}C{c}"
    notes.append("Table (graphicFrame) — hiện bị XÓA khỏi layout (#3), kiểm slide mẫu vẫn còn")

    # 3. CHART
    s = prs.slides.add_slide(blank)
    _title(s, "3. Chart")
    cd = CategoryChartData()
    cd.categories = ["A", "B", "C"]
    cd.add_series("S1", (1, 2, 3))
    s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(2), Inches(2), Inches(8), Inches(4), cd)
    notes.append("Chart (graphicFrame) — hiện bị XÓA khỏi layout (#3)")

    # 4. GROUP chứa ảnh + caption (bug #5)
    s = prs.slides.add_slide(blank)
    _title(s, "4. Group: image + caption")
    # python-pptx không có API group trực tiếp; tạo ảnh + text rời (mô phỏng, note rõ)
    s.shapes.add_picture(_png((120, 180, 120)), Inches(2), Inches(2), Inches(4), Inches(3))
    tb = s.shapes.add_textbox(Inches(2), Inches(5.1), Inches(4), Inches(0.6))
    tb.text_frame.text = "Caption under image"
    notes.append("MÔ PHỎNG group (python-pptx không group được) — cần group thủ công ảnh+caption để test #5")

    # 5. HYPERLINK trên text (bug #4)
    s = prs.slides.add_slide(blank)
    _title(s, "5. Hyperlink on text")
    tb = s.shapes.add_textbox(Inches(1), Inches(3), Inches(6), Inches(1))
    run = tb.text_frame.paragraphs[0].add_run()
    run.text = "Click here (link to gravity.global)"
    run.hyperlink.address = "https://gravity.global"
    notes.append("Hyperlink trên text — kiểm có bị strip khi promote (#4)")

    # 6 & 7. HAI slide CÙNG kind nhưng bố cục KHÁC (bug #2) — cùng '1 ảnh + text'
    for i, layoutdesc in enumerate(["single column", "three columns"]):
        s = prs.slides.add_slide(blank)
        _title(s, f"6.{i+1} Same kind, diff layout ({layoutdesc})")
        if i == 0:   # 1 cột
            tb = s.shapes.add_textbox(Inches(1), Inches(2), Inches(11), Inches(4))
            tb.text_frame.text = "One big text column.\n" * 3
        else:        # 3 cột
            for c in range(3):
                tb = s.shapes.add_textbox(Inches(1 + c * 4), Inches(2), Inches(3.5), Inches(4))
                tb.text_frame.text = f"Column {c+1}\nshort text"
    notes.append("2 slide cùng kind, bố cục khác — kiểm gom nhóm (#2)")

    # 8. Slide HOÀN TOÀN TRỐNG
    prs.slides.add_slide(blank)
    notes.append("Slide trống hoàn toàn")

    # 9. Slide chỉ 1 SHAPE
    s = prs.slides.add_slide(blank)
    s.shapes.add_picture(_png((150, 150, 220)), Inches(4), Inches(2), Inches(5), Inches(3.5))
    notes.append("Slide chỉ 1 ảnh")

    # 10. Text ĐA NGÔN NGỮ + ký tự đặc biệt + soft return
    s = prs.slides.add_slide(blank)
    _title(s, "10. Special chars / multilang")
    tb = s.shapes.add_textbox(Inches(1), Inches(2), Inches(11), Inches(3))
    tf = tb.text_frame
    tf.text = "Tiếng Việt · 日本語 · العربية · emoji 🚀 ✓"
    p2 = tf.add_paragraph()
    p2.text = "Line with soft break"
    notes.append("Đa ngôn ngữ, emoji, ký tự đặc biệt")

    # 11. AUTO_SHAPE (rounded rect) có text — dạng 'auto' trong _walk
    s = prs.slides.add_slide(blank)
    _title(s, "11. Auto shape with text")
    sh = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(3), Inches(2.5), Inches(6), Inches(2))
    sh.text_frame.text = "Text inside an auto shape"
    notes.append("Auto shape có text")

    # 12. Slide ẨN (show=0) có nội dung (bug B) — set sau khi tạo
    s = prs.slides.add_slide(blank)
    _title(s, "12. Hidden slide (Archive)")
    tb = s.shapes.add_textbox(Inches(1), Inches(3), Inches(10), Inches(1))
    tb.text_frame.text = "This slide is hidden (show=0)"
    s._element.set("show", "0")
    notes.append("Slide ẩn show=0 — kiểm preview render được (#B)")

    prs.save(path)

    print(f"✅ Đã tạo {path} — {len(prs.slides._sldIdLst)} slides")
    print("\nGhi chú từng slide:")
    for i, n in enumerate(notes, 1):
        print(f"  {i}. {n}")
    print("\n⚠ CHƯA cover (python-pptx không tạo được, thêm thủ công nếu cần):")
    print("  - SmartArt (dgm), Video/Audio embed, OLE object (Excel nhúng), group shape thật, SVG-only image")
    return path


if __name__ == "__main__":
    build_test_deck()
