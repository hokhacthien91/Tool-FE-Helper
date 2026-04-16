# RML Spike — Record API

Plugin tách riêng để test xem UXP `batchPlay` có descriptor nào cho phép **start / stop recording** một Photoshop Action được không. Kết quả của spike quyết định được full feature "Record & Replay" có khả thi hay không, và nếu có thì dùng descriptor nào.

## Load

1. Mở **Adobe UXP Developer Tool** (UDT).
2. **Add Plugin…** → trỏ tới file `manifest.json` trong thư mục `spike-record-api/`.
3. **Load** → mở panel: `Plugins ▸ RML Spike — Record API`.

## Thứ tự test

1. **Setup**: bấm `1. Create action set + action` → panel Actions của PS phải xuất hiện set `RML_Spike` chứa action `rec1`.
2. **Start listener** (*Misc ▸ Start descriptor listener*) — trước khi thử record, bật listener để quan sát PS phát ra descriptor gì khi bạn bấm nút record native. Xong rồi bạn có thể thử 2a/2b/2c.
3. **Start recording** — thử lần lượt `2a`, `2b`, `2c`. Sau mỗi lần start thành công, qua PS sửa một layer (ví dụ đổi màu fill). Nếu step xuất hiện trong action slot ở panel Actions → descriptor đó work.
4. **Stop recording**: thử `3a` / `3b` / `3c` khớp với cái đã start. Mỗi cặp start/stop có thể yêu cầu descriptor khác nhau.
5. **Read step count** (`5`) → ghi xem field nào trong descriptor phản ánh số step. Dùng cho UI "Recorded: N steps".
6. **Dump action set** — in toàn bộ descriptor. Nếu step count không có trực tiếp ở action, thường nằm trong `commands` array của set.
7. **Play on targets**: sau khi đã record xong thủ công qua PS Actions panel (hoặc qua 2+3), chọn các target layer khác → bấm `4` → kiểm tra từng layer đã áp effect chưa.
8. **Cleanup**: bấm `Cleanup (delete set)` để xóa set tạm.

## Ý nghĩa kết quả

| Scenario | Kết luận |
|---|---|
| 2a/2b/2c đều fail | Không có public descriptor để start recording → fallback: plugin chỉ tạo action set, user phải bấm nút Record ở Actions panel |
| Một trong 2a/2b/2c work | Ghi descriptor đó lại — full auto record trong plugin khả thi |
| Test 4 (play) fail | Nghiêm trọng — cần tìm descriptor khác cho play, có thể tồn tại nhưng tên khác |
| Listener bắt được descriptor khi bấm native Record | Copy descriptor đó làm start/stop reference |

## Ghi chú

- Set và action đều có tên cố định (`RML_Spike` / `rec1`). Nếu muốn chạy lại Test 1 nhiều lần mà không phiền, nó tự cleanup set cũ trước khi tạo mới.
- Listener log mọi action descriptor → log có thể phình nhanh. Nhấn `Clear log` thoải mái, hoặc Stop listener khi không cần.
- Plugin này tách riêng hẳn với plugin chính `Replace Matching Layers` — load cạnh nhau trong UDT không xung đột.
