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
- Người dùng đã xác nhận và đã triển khai image này vào stack hosso-tcap-web (47).
- Bản sửa không thêm migration; nếu cần rollback, dùng lại image `1.4.0-20261101.1` với volumes và secrets hiện hữu.

## Triển khai và nghiệm thu ngày 02/11/2026

Portainer tạo container Studio `55b94a46d54f47f28218373bcc06704f028718c8f0a878bc57dbab272fa5eaca` và backup `e08fef880ee0abbc143a4399fc1c4f652d097f8dc7fd2b794db7e2c82febe8aa` với image `1.4.1-20261102.1`. PostgreSQL giữ container và volume hiện hữu.

### Sự cố hết dung lượng trong quá trình triển khai

- Container mới ban đầu không tạo được `/tmp/tsx-1000` (`ENOSPC`); web trả 502. PostgreSQL sau đó cũng không ghi được checkpoint/lock file và phải khởi động lại. Chưa có migration mới được áp dụng.
- Đo từ worker backup: filesystem 98 GB, used 95 GB, available 0, 100%; inode chỉ dùng 36%. Đây là thiếu dung lượng ghi, không phải hết inode.
- Sau từng xác nhận trực tiếp của người dùng, đã xóa image Hosso-Hub không dùng `sha256:a198fe2a34c56f0ac9985791305c33a70e077f74483f93d14e4de6ce0d4bf9b1` và 13 image TCAP cũ được Portainer đánh dấu Unused: `1.2.0–1.2.7`, `1.2.9`, `1.3.0–1.3.2`, `1.3.4`. Không force xóa image đang được container sử dụng.
- Sau dọn: used 71 GB, available 23 GB, 76%; inode 27%. Danh sách TCAP sau Refresh chỉ còn `1.2.8` đang được một container khác dùng, bản rollback `1.4.0-20261101.1`, và bản mới `1.4.1-20261102.1`.
- PostgreSQL và Studio tự khởi động lại sau khi có chỗ trống. Startup chạy kiểm tra migration xong (`Done.`), Next báo Ready. Portainer xác nhận PostgreSQL và Studio healthy, backup running.

### Kiểm tra sau cập nhật

API client xác thực riêng bằng tài khoản do người dùng cung cấp, không ghi token/mật khẩu vào báo cáo hoặc file:

| Kiểm tra | Kết quả |
| --- | --- |
| GET `/api/health` | HTTP 200, `status: ok`, `db: up` |
| POST manage-order, action vô hiệu, Origin TCAP | HTTP 400 `invalid_action`: đã vượt origin guard; trước cập nhật là 403 `invalid_origin` |
| Cùng POST, origin ngoài site | HTTP 403 `invalid_origin`: chống giả mạo vẫn hoạt động |
| Cùng POST, không có Origin | HTTP 400 `invalid_action`, giữ hành vi API client |
| GET manage-order id 3 | HTTP 200; SO-000003, new, awaiting, history 0 |
| Tải lại trang admin của SO-000003 | Trang tải được và hiện nút Approve and process |

Các POST thử nghiệm không có ID đơn và bị chặn tại kiểm tra action, trước khi đọc/ghi đơn. Không xác nhận đơn thật, ghi tiền, gửi email hay thay đổi tồn để nghiệm thu. Nghiệm thu này xác nhận lỗi origin 403 đã hết trên live, chưa xác nhận toàn bộ quy trình đơn nguồn WIM/Woo.

Bằng chứng ảnh cục bộ: `originfix-deployed.jpg`, `originfix-disk-recovered.jpg`, `originfix-old-images-removed.jpg`. Không commit ảnh hoặc dữ liệu khách hàng. Cần đưa kiểm tra dung lượng khả dụng thành bước bắt buộc trước các lần pull/redeploy tiếp theo và đặt cảnh báo dung lượng ở hệ thống giám sát.
