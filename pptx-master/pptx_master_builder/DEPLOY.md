# Deploy PPTX Master Builder lên Portainer (Git Stack)

Hướng dẫn deploy lần đầu. Truy cập nội bộ qua VPN — không cần login.

## Thông tin cần chuẩn bị

| Cần | Ghi chú |
|---|---|
| URL Portainer | Trang bạn đăng nhập Portainer |
| IP server | Để vào tool sau khi deploy, vd `192.168.1.50` |
| Cổng trống | Mặc định `8765`. Đổi nếu bận. |
| RAM server ≥ 1GB | LibreOffice render cần |
| Git repo | Đã có: `github.com/hokhacthien91/Tool-FE-Helper` |

---

## BƯỚC 1 — Push code lên Git

Từ máy bạn, trong thư mục repo:

```bash
cd /Users/thien.ho/Projects/Tool-FE-Helper
git add pptx_master_builder/
git commit -m "Add Docker deploy for PPTX Master Builder"
git push origin plugin-for-design
```

> Nếu muốn deploy từ nhánh chính, đổi `plugin-for-design` → `main` (nhớ merge trước).

---

## BƯỚC 2 — Tạo Stack trên Portainer

1. Portainer → **Stacks** → **+ Add stack**.
2. Đặt tên: `pptx-master`.
3. **Build method**: chọn **Repository**.
4. Điền:
   - **Repository URL**: `https://github.com/hokhacthien91/Tool-FE-Helper`
   - **Repository reference**: `refs/heads/plugin-for-design` (hoặc `refs/heads/main`)
   - **Compose path**: `pptx_master_builder/docker-compose.yml`   ← QUAN TRỌNG (trỏ đúng thư mục con)
   - Nếu repo **private**: bật **Authentication**, điền username + GitHub Personal Access Token.
5. Bấm **Deploy the stack**.

Lần đầu build ~vài phút (cài LibreOffice ~300MB). Chờ tới khi container xanh (running).

---

## BƯỚC 3 — Truy cập

Mở trình duyệt (đã kết nối VPN):

```
http://<IP-server>:8765
```

Nếu không vào được, xem TROUBLESHOOT bên dưới.

---

## CẬP NHẬT về sau (khi sửa code)

```bash
git add pptx_master_builder/ && git commit -m "update" && git push
```
Rồi Portainer → Stacks → `pptx-master` → **Update the stack** → tick **Re-pull image and redeploy** (hoặc **Pull latest** cho repo).

---

## TROUBLESHOOT

| Triệu chứng | Nguyên nhân / Cách sửa |
|---|---|
| Container không lên, exit ngay | Xem **Logs** trong Portainer. Thường do RAM thiếu hoặc build lỗi. |
| Không vào được `:8765` | (1) VPN đã kết nối? (2) Cổng đúng? (3) Firewall server mở cổng 8765? |
| Preview slide trống | LibreOffice trong image chưa chạy được — xem logs, dòng "Preview renderer". |
| Container bị kill khi build deck lớn | RAM thiếu → tăng `memory` trong docker-compose.yml. |
| Cổng 8765 đã bận | Sửa compose `"8765:8765"` → `"3940:8765"`, push lại, truy cập `:3940`. |

## Kiểm tra nhanh trong Portainer
- **Containers** → `pptx-master` → **Logs**: phải thấy "Preview renderer: soffice" và "đang chạy tại".
- **Stats**: xem RAM/CPU realtime.
