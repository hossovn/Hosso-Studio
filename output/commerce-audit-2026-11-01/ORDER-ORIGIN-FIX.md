# Sửa lỗi 403 khi xử lý đơn sau reverse proxy

## Tái hiện

`node scripts/test-order-origin.mjs` gọi endpoint POST manage-order thật với tài khoản admin giả lập, Origin công khai và URL request nội bộ. Action không hợp lệ bị chặn trước khi đọc đơn, không có hiệu ứng đơn hàng.

Trước sửa: HTTP 403, `invalid_origin`. Cùng request khi URL nội bộ được thay bằng URL công khai trả HTTP 400, `invalid_action` như mong đợi.

## Nguyên nhân và sửa

Guard so sánh Origin của trình duyệt với `req.url`, nhưng Next có thể dựng URL theo hostname/port nội bộ sau reverse proxy. Guard nay dùng origin của `payload.config.serverURL` (được cấu hình bằng `HOSSO_PUBLIC_URL`); chỉ fallback về URL request khi chưa cấu hình URL công khai. Không tin Host/X-Forwarded-* do bên gọi gửi; origin ngoài site vẫn bị chặn. Cấu hình URL lỗi sẽ từ chối yêu cầu.

## Kiểm tra

- Regression endpoint: proxy HTTP/HTTPS nội bộ, URL công khai có dấu / cuối, sai scheme/port/subdomain, null/malformed origin, forwarded headers giả, thiếu quyền admin, cấu hình lỗi và fallback local. Không đọc/ghi đơn.
- Receipt integration dùng SQLite tạm chạy các thao tác quản trị với Origin công khai và URL nội bộ: chuẩn bị, ghi nhận tiền, gửi lại, hủy và kiểm tra chống thao tác trùng.
- Typecheck plugin-shop và commerce-security đạt.
- Regression được thêm vào CI.

## Giới hạn xác minh live

Đã đăng nhập và đọc SO-000003: đơn vẫn chờ admin, lịch sử thao tác rỗng. Không bấm xác nhận, ghi tiền, gửi email hoặc hủy đơn để thử lỗi. Lỗi proxy tái hiện được cục bộ; chưa thu được response body của lần lỗi trên trình duyệt người dùng. Chưa coi thao tác xử lý đơn production đã được nghiệm thu.
