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

## Xác minh live trước cập nhật

Đã đăng nhập và đọc SO-000003: đơn vẫn chờ admin, lịch sử thao tác rỗng. Không bấm xác nhận, ghi tiền, gửi email hoặc hủy đơn để thử lỗi.

Đã xác thực riêng qua API bằng tài khoản người dùng cung cấp, chỉ gửi `action: invalid-probe` không có ID đơn. Cùng token admin: Origin `https://tcap-web.hosso.vn` trả HTTP 403 `invalid_origin`; không có Origin trả HTTP 400 `invalid_action`. Kết quả phân biệt lỗi origin với lỗi phiên/quyền. Stack cấu hình đúng `HOSSO_PUBLIC_URL=https://tcap-web.hosso.vn`.

Trước cập nhật đã tạo dump PostgreSQL custom trong volume: `/var/lib/postgresql/data/hosso-pre-originfix-20261102-0044.dump`, quyền 0600, 577041 bytes. `pg_restore --list` đọc được; SHA256 `8c6e15614048d2622bd85d95629ed0d938743a35604978feafba34f203bb1276`. Chưa kiểm thử phục hồi toàn bộ dump.

Chưa coi thao tác xử lý đơn production đã được nghiệm thu.

## Image sẵn sàng triển khai

- Studio runtime: `abfcc30870ff5415bfd470e909f784981c2ed4f7`.
- Private plugins: `8dfe79b9094ad07e35071047ee1c6345ac53f958`.
- CI Studio check/roundtrip/image đều đạt: https://github.com/hossovn/Hosso-Studio/actions/runs/41332346393.
- Release build đạt: https://github.com/hossovn/Hosso-Deploy/actions/runs/41332412126. Checkout và provenance xác nhận đúng hai commit trên.
- Image: `ghcr.io/hossovn/hosso-tcap:1.4.1-20261102.1`.
- Manifest digest: `sha256:c8b65c5fb0a583599420b48a9a7f1edc5cc3313bee2728178fba4d3e68f995af`.
- Đã điền HOSSO_IMAGE vào form của stack hosso-tcap-web (47); chưa bấm Update. Chờ xác nhận ngay trước thao tác triển khai theo Computer Use.
- Bản sửa không thêm migration; nếu cần rollback, dùng lại image `1.4.0-20261101.1` với volumes và secrets hiện hữu.
