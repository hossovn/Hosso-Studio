# Vận hành nền tảng Studio

Phạm vi bản nâng cấp: landing theo mục tiêu, custom CMS, lead/outbox, consent và experiment, giỏ tài khoản, đổi trả, ảnh responsive và kiểm tra trước xuất bản. Dữ liệu/catalog WIM và các website đã có không được thay bằng dữ liệu mẫu.

## Cài đặt và nâng cấp

1. Dừng ghi dữ liệu; tạo bản sao database nhất quán và snapshot các thư mục media/private. Lưu cấu hình môi trường, khóa mã hóa và giấy phép trong kho bí mật riêng.
2. Cài bằng `pnpm install --frozen-lockfile`. Giữ override `sharp: "-"`; ảnh dùng `@napi-rs/image`.
3. PostgreSQL: chạy `pnpm migrate` với cấu hình đúng database triển khai. SQLite: khi ứng dụng đã dừng, chạy `node scripts/migrate-sqlite-platform.mjs <đường-dẫn-database.db>`; script tạo bản backup trước khi thay schema và có thể chạy lại an toàn.
4. Chạy `pnpm --filter @hosso/studio generate:importmap`, `pnpm typecheck` và `pnpm build`. Khởi động ứng dụng rồi mở `/admin/readiness`.
5. Kiểm tra các luồng form, mua hàng, tra cứu riêng tư và job trên môi trường staging trước khi mở traffic.

Trên máy có quy tắc RTK, thêm `rtk proxy` trước các lệnh trên. Migration platform là additive và forward-only. Rollback database bằng bản sao trước nâng cấp cùng phiên bản ứng dụng tương ứng; không dùng một lệnh down để xóa lịch sử lead, analytics hay đổi trả. Khôi phục thử vào database riêng và xác minh số bản ghi, foreign key, file cùng các job chưa gửi trước khi chuyển traffic.

Plugin private được cài riêng trong `packages/plugin-cross-sell`; không nằm trong source/image public. `prepare-installed-plugins.mjs` sinh đăng ký server/browser và liên kết module cục bộ khi package tồn tại. Package cũ cần nâng cấp để cung cấp `src/browser.ts`; build sẽ báo rõ nếu thiếu. Không commit các file `hosso.installed*.ts` hoặc source private. Production vẫn yêu cầu giấy phép hợp lệ cho các plugin thương mại.

## Lưu trữ và sao lưu

| Dữ liệu | Nơi lưu | Cách bảo vệ |
| --- | --- | --- |
| Database | SQLite hoặc PostgreSQL | Backup nhất quán; gồm đơn hàng, lead, outbox, giỏ, analytics, đổi trả và sổ thanh toán |
| Media công khai | `HOSSO_MEDIA_DIR` | Volume bền vững, backup cùng database; `.variants` là cache có thể tái tạo |
| Ảnh bằng chứng đổi trả | `HOSSO_PRIVATE_DIR/returns` | Volume riêng; không phục vụ bằng static web server; truy cập qua endpoint có kiểm tra token/quyền |
| Gói nội dung website | `HOSSO_BACKUP_DIR` | Gói chuyển nội dung, không thay thế full database backup hoặc backup ảnh riêng tư |

Docker Compose gắn các volume `pgdata`, `media`, `private`, `backups`. Khôi phục cả database và media/private từ cùng thời điểm, giữ quyền ghi của user `node`. Không chép ảnh bằng chứng sang thư mục public. Site package cố ý không chứa khóa tích hợp, mật khẩu, database vận hành hoặc ảnh đổi trả.

Ảnh đổi trả nhận PNG/JPEG/WebP tối đa 1 MB, kiểm tra kích thước và giải mã rồi lưu WebP tối đa rộng 1600px, tối đa ba ảnh cho yêu cầu đang chờ duyệt. Job `shop-return-retention` dọn file không còn tham chiếu và đã cũ hơn hai ngày. Mặc định giữ ảnh đang được tham chiếu. Chỉ khi chủ site đặt `HOSSO_RETURN_EVIDENCE_DAYS` là số nguyên từ 30 trở lên, ảnh của hồ sơ đóng/từ chối quá hạn mới được bỏ tham chiếu và dọn. Hồ sơ đang xử lý được giữ nguyên.

## Landing, lead và đo lường

Sáu bộ mẫu trong `seed/sites` được cài qua thư viện bộ website: thu lead, tư vấn, ra mắt, bán một sản phẩm, sự kiện và cửa hàng. Tổng cộng 23 trang nháp; không có catalog hoặc đánh giá khách hàng giả. Điền placeholder, ảnh, thông tin liên hệ, chính sách và SEO trước xuất bản. Bộ một sản phẩm cần các route commerce. Cửa hàng bắt đầu ở `/cua-hang`; chỉ đặt làm trang chủ sau khi review.

Nhập additive từ chối xung đột slug, kiểm tra dependency và trang cảm ơn, dùng transaction và publication lock. Nếu nhập thất bại sau khi tạo media, wrapper bù trừ các file mới không còn bản ghi. Khi caller tự truyền transaction request, caller chịu trách nhiệm vòng đời transaction và file. Snapshot filesystem vẫn là lớp khôi phục cho sự cố tiến trình/ổ đĩa giữa chừng.

Lead và delivery intent lưu cùng transaction. Outbox dùng lease, idempotency key, backoff và tối đa tám lần gửi. Thiếu SMTP tạo lỗi có thể xử lý; không coi log email là đã gửi. Dùng `/admin/leads` để phân công, ghi chú, cập nhật trạng thái và gửi lại delivery lỗi. Với webhook/SMTP, nhà cung cấp vẫn phải hỗ trợ deduplication để giảm gửi lặp khi mất phản hồi sau khi đã nhận.

Sự kiện lead được xếp vào job `analytics-record-event` trong cùng transaction; worker ghi analytics riêng, retry tối đa tám lần. Lỗi kho analytics không rollback lead. Theo dõi job thất bại trong admin và retry sau khi sửa nguyên nhân. Dashboard có độ trễ theo worker. Mốc thời gian event là thời điểm worker ghi nhận.

Không có consent, DNT hoặc GPC: attribution/experiment bị loại bỏ phía server. Những sự kiện nghiệp vụ được xác nhận (lead/đơn) có thể vẫn được đếm tổng hợp không kèm session/campaign; client không tự tạo purchase. Analytics giữ 90 ngày. A/B không tự tuyên bố thắng, không tính ý nghĩa thống kê; so sánh lượt tiếp xúc và conversion cùng experiment/revision. Để rollback, chuyển experiment sang bản A hoặc B cố định và xuất bản lại; đổi revision khi bắt đầu một thử nghiệm mới. Purchase là đơn đã thanh toán đủ, không phải doanh thu thuần sau hoàn tiền.

## Commerce và tích hợp

Giỏ khách nằm trên máy; khi có tài khoản sẽ đồng bộ server với owner/revision. Giỏ khác nhau có lựa chọn khôi phục, giữ local hoặc gộp. Đăng xuất/đổi tài khoản làm mất hiệu lực request cũ; giỏ đã gắn tài khoản không được chuyển sang tài khoản khác. Checkout luôn kiểm tra lại sản phẩm, giá, tồn kho và quote; không tin giá lưu trong trình duyệt.

Portal đổi trả dùng token tra cứu đơn. Quản trị viên duyệt, nhận hàng, nhập lại kho local đủ điều kiện, ghi khoản cần hoàn và đóng sau khi xác nhận giao dịch hoàn tiền thật. Hàng WIM/nhà cung cấp phải đối soát tại nguồn. Quy trình đổi hàng hiện cần nhân viên tổ chức giao hàng thay thế. Ghi sổ hoàn tiền không thực hiện chuyển tiền ngân hàng.

COD và VietQR/SePay là phương thức hiện có. SMTP, GHN, SePay/WIM cần cấu hình staging và kiểm tra callback, timeout, gửi lặp, tiền thiếu/thừa, kho và cảnh báo bằng tài khoản nhà cung cấp thực. Bộ kiểm thử local không chứng minh giao hàng/email/chuyển tiền thật. VNPay/MoMo, subscription, loyalty, gift card, email nhắc giỏ, back-in-stock và effect Lottie/Rive/3D là các nhánh tùy chọn trong audit; cần hợp đồng nhà cung cấp/nội dung/quy tắc kinh doanh trước khi đưa vào sử dụng.

## Kiểm chứng

- `pnpm test:platform`: regression motion, tương tác, form, đơn hàng, commerce, CMS, package/release, dữ liệu 10.000 mục và migration SQLite.
- `pnpm test:platform-browser`: consent/A/B, landing → cảm ơn, gallery/sticky CTA, giỏ, checkout, đổi trả và admin trong fixture riêng.
- `pnpm test:platform-production`: build và sáu route mobile trên bản production, có kiểm tra license enforcement; sau đó đo editor trên 30 section/600 phần tử và kiểm tra undo. Kết quả ở `output/platform-production/baseline.json` và `editor-profile.json`.
- `node scripts/test-platform-postgres.mjs`: migration PostgreSQL trên database riêng được chỉ định bởi `PLATFORM_TEST_DATABASE_URL`.
- `pnpm test:platform-container`: sau khi build `docker build -t hosso-studio:platform-audit .`, kiểm tra image với PostgreSQL/volume/network dùng một lần. Có thể đặt `PLATFORM_TEST_IMAGE` để chọn image khác. Kiểm tra toàn chuỗi migration, health sau restart, license, sáu kit, non-root, không có source private/env và dữ liệu private tồn tại sau restart; kết quả cùng image ID ở `output/platform-container/result.json`. Harness chỉ dọn các tài nguyên do chính lần chạy đó tạo.

Số đo Chromium local với CPU/network throttle là mẫu lab, không phải field p75 và không thay INP. Mục tiêu production vẫn là p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1. Đo lại trên host, nội dung và tích hợp thật; theo dõi riêng thao tác editor trên trang lớn. Không chạy các bài fixture với database production.

Hai advisory moderate còn trong dependency audit: esbuild 0.18.20 qua Payload/Drizzle/esm-loader và uuid 8.3.2 qua ExcelJS. Code đường dẫn đã kiểm tra dùng esbuild transform/transformSync và uuid.v4; chưa thấy gọi esbuild serve hoặc API UUID bị ảnh hưởng trong các đường này. Đây là phân loại reachability cục bộ, không phải khẳng định miễn rủi ro. Giữ theo dõi bản nâng cấp upstream và chạy lại audit/build/import XLSX khi thay dependency. Nguồn: [esbuild advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99), [uuid advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
