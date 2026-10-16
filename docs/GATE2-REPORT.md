# Báo cáo Cổng 2: Puck + Payload (cuối lát 2)

Bản này chạy thật trên Payload 3.91.0, Next 16.4.2, React 19.3.1, @puckeditor/core 0.23.0. Theo yêu cầu "làm liền, sáng mai review", tôi không dừng chờ ở cổng này mà ghi báo cáo lại và đi tiếp lát 3. Không gặp điều kiện dừng nào.

## Đã chứng minh bằng chạy thật

- **Kéo thả**: thêm block từ danh sách vào canvas, sửa field (có xem trước trực tiếp trong iframe), xóa/nhân đôi, hoàn tác/làm lại, outline, đổi viewport. Kiểm tra tự động dùng sự kiện pointer giả lập (công cụ trình duyệt không tự kéo được), chưa thử bằng chuột thật.
- **Lưu nháp / xuất bản**: nút "Lưu nháp" ghi `PATCH /api/pages/:id?draft=true`, "Xuất bản" ghi bản chính. Khách (chưa đăng nhập) chỉ thấy bản đã xuất bản; `?preview=1` cho người đã đăng nhập xem bản nháp mới nhất. Phiên bản/nháp là của Payload (`versions.drafts`), không tự viết.
- **Phân quyền**: `editor` lưu nháp được (200), xuất bản bị chặn (403), xóa trang 403, sửa giao diện site 403, tự nâng quyền không có tác dụng; `admin` làm được tất cả.
- **Đổi theme giữ nguyên nội dung**: băm SHA-1 của toàn bộ JSON trang trước và sau khi đổi default → alt → default giống hệt nhau. Chỉ renderer và CSS đổi.
- **Token trong admin**: màu, font, bo góc, khoảng cách chỉnh trong "Giao diện site" (nhóm field sinh tự động theo theme); để trống = dùng mặc định của theme. Đã kiểm tra CSS thay đổi tương ứng.
- **Render công khai phía server**: `Render` từ `@puckeditor/core/rsc` chạy trong Server Component, cấu hình dựng lúc chạy từ schema + renderer theme. Block không có renderer (plugin đã gỡ) bị bỏ qua ở trang công khai (trang vẫn 200) và hiện khung "thiếu plugin" trong editor.
- Hai theme khác hẳn bố cục: "Sáng & Sạch" (card, banner nền sáng) và "Kỹ thuật tối" (nền lưới, bảng đánh số, hai cột, font Barlow + mono). Dấu tiếng Việt hiển thị đúng ở cả hai.

## Giới hạn và công sức còn lại

| Việc | Mức |
|---|---|
| Chọn ảnh từ Media của Payload (hiện nhập URL) | ~1 ngày: custom field của Puck gọi `/api/media` |
| Tạo trang mới và sửa tiêu đề/slug ngay trong editor (hiện làm ở admin) | ~0,5 ngày |
| Tự lưu nháp, cảnh báo chưa lưu khi rời trang | ~0,5 ngày |
| Khóa chống ghi đè khi hai người cùng sửa (hiện last-write-wins; Payload có document locking nhưng route `/editor` chưa dùng) | ~0,5 ngày |
| Khôi phục phiên bản từ editor (admin Payload đã có giao diện phiên bản) | ~0,5 ngày |
| Danh sách block trong editor còn hiện cả block "thiếu plugin" như thể thêm được | nhỏ |

Giới hạn khác cần biết:

- Puck còn ở 0.x (API có thể đổi giữa các bản), nên đã ghim 0.23.0.
- Xác thực cookie của Payload từ chối request không có `Sec-Fetch-Site: same-origin` (chỉ ảnh hưởng khi thử bằng curl).
- `next/font` đòi giá trị tĩnh, nên font khai báo cứng trong `lib/fonts.ts` (3 font), admin chọn trong danh sách đó.
- Admin Payload theo ngôn ngữ trình duyệt: trình duyệt tiếng Anh thấy nhãn mặc định tiếng Anh (nhãn của chúng ta vẫn tiếng Việt). Đã bật `vi`.

## Đề xuất

Tiếp tục với Payload + Puck. Không có chỗ nào phải fork hay sửa lõi, không dùng tính năng Enterprise.
