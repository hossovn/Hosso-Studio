# Hosso Studio — kết quả triển khai audit

Cập nhật ngày 18/11/2026, nhánh `codex/studio-complete-platform`, worktree `C:/Code/Hosso-Studio-platform`. Phạm vi gốc là roadmap audit ngày 17/11. Dữ liệu Thanh Cường/WIM/catalog và công việc độc lập trong checkout gốc được giữ nguyên. Chưa commit, deploy, chạy migration production hoặc thực hiện giao dịch thật.

## Phần đã triển khai và kiểm chứng

| Nhóm | Kết quả | Bằng chứng / giới hạn |
| --- | --- | --- |
| Dependencies | Next 16.4.5, React 19.3.1, Payload 3.91.0; Playwright nằm trong workspace | Audit còn 2 moderate, 0 high/critical. Giữ `sharp: "-"`. Reachability được ghi trong hướng dẫn vận hành; không coi là miễn rủi ro |
| Media | Responsive WebP/AVIF, srcset/sizes, lazy/priority, cache/ETag; video có poster, pause, reduced-motion và dừng khi ẩn | Test giải mã, cache và giới hạn đường dẫn đạt; có số đo production trước/sau |
| Motion | Breakpoint 600/1024 dùng chung, kiểm tra custom breakpoint, hover theo pointer, scheduler đọc/ghi chung, preset và trigger–target | Motion/runtime, interactive, copy/undo/export và editor-preview đạt |
| CMS | Pagination/filter/sort tại DB, binding field và template trang chi tiết custom CMS, preview/SEO/sitemap | Fixture 10.000 entry đạt. Chưa có UI cấu hình detail template cho các loại nội dung dựng sẵn |
| Bộ website | 5 bộ landing theo mục tiêu + bộ cửa hàng 13 trang, tổng 23 trang nháp | Kiểm tra nhập additive, dependency, xung đột slug và rollback đạt. Không có catalog/testimonial giả; cần điền nội dung doanh nghiệp |
| Lead | Inbox, nguồn/UTM, owner/status/notes/revision, outbox transaction, lease/retry/backoff và gửi lại | Lead vẫn lưu khi analytics lỗi. Thiếu SMTP tạo delivery lỗi có thể xử lý; gửi mail thật chưa được nghiệm thu |
| Đo lường | Consent/DNT/GPC, attribution, funnel, conversion server, A/B assignment/exposure ổn định và rollback qua revision | Browser xác nhận consent/withdrawal và exposure; dashboard không tự tuyên bố variant thắng |
| Commerce | Gallery/lightbox/swipe, sticky buy bar, giỏ tài khoản với CAS và lựa chọn xung đột, checkout, portal đổi trả và bằng chứng riêng tư | Browser đạt khôi phục trên thiết bị khác, phản hồi chậm, đổi/đăng xuất tài khoản, COD → receipt riêng tư → đổi trả/admin. Giá và kho kiểm tra lại tại checkout |
| Hậu mãi | Duyệt/nhận/đóng yêu cầu, nhập lại kho local đủ điều kiện, liên kết refund ledger, giới hạn và retention ảnh | Test ảnh thật, token/admin access, no-store/nosniff, orphan và retention đạt. Giao hàng thay thế/chuyển tiền hoàn vẫn do vận hành thực hiện |
| Xuất bản | Readiness theo cấu hình, placeholder/SEO, custom breakpoint và tình trạng job/tích hợp | Quyền admin và cảnh báo được kiểm thử; không thay thế việc thử nhà cung cấp thật |
| Phân phối | Tách định nghĩa plugin browser/server; đăng ký private plugin riêng; Docker giữ media/private/backups | Build public không cần source `plugin-cross-sell`; license production vẫn được kiểm tra |

## Các lỗi đã tái hiện và sửa trong nghiệm thu

- Giỏ được khôi phục phải nhận đúng generation server; giỏ đã xóa không được tự xuất hiện lại.
- Thanh mua mobile phải cập nhật cả khi nhảy cuộn qua vùng mua; dùng scheduler chung và ResizeObserver.
- Tab tài khoản phải xóa danh tính khi tab khác đăng xuất. Phản hồi hồ sơ hoặc mã ủy quyền CTV thuộc phiên cũ không được áp dụng vào phiên mới.
- Checkout phải giữ dữ liệu địa chỉ mới nhất sau debounce; thông số sản phẩm vắng mặt không render số `0` thừa.
- Payload CLI tự tìm mọi file `.ts` trong thư mục migrations. Helper backfill được chuyển sang `src/lib/platform-search-backfill.ts` để không bị gọi như migration độc lập.

## Kiểm chứng

Các lệnh dưới đây chạy với tiền tố `rtk proxy` trên máy này. Test dùng fixture riêng.

| Kiểm tra | Kết quả |
| --- | --- |
| `pnpm test:platform` | 23 nhóm đạt; kết quả máy đọc tại `output/platform-regressions/results.json` |
| `pnpm test:platform-browser` | Đạt, gồm trường hợp mã ủy quyền phiên cũ trả về sau khi đổi tài khoản |
| `pnpm test:editor-preview`, `test:canvas`, `test:editor-canvas-upgrades` | Đạt |
| `pnpm typecheck` | Đạt toàn workspace; build Next kiểm tra lại ứng dụng sau các sửa cuối |
| `pnpm check:manifests`, `check:boundaries`, `check:i18n`, `git diff --check` | Đạt |
| SQLite migration | Additive, backfill tìm kiếm, bảo toàn dữ liệu/FK, backup và chạy lại đạt |
| PostgreSQL migration riêng | Additive trong transaction, dữ liệu cũ, search, uniqueness và enum job đạt |
| Production mobile | Build/typecheck và 6 route đạt; số đo cuối ở `output/platform-production/baseline.json` |
| Editor production | Đạt trên 30 section/600 phần tử: median dịch chuyển 175,6 ms, p95 226,8 ms, undo đạt. Kết quả ở `output/platform-production/editor-profile.json` |
| Container public | Đạt: đủ 34 migration, health trước/sau restart, private volume, non-root, sáu kit, không có source private/env và license. Image ID `sha256:01a3a0e5bb3e4b82dc79744e23390124a8fad9795142928aba7cbcff815b4fff`; bằng chứng tại `output/platform-container/result.json` |

CI đã được cấu hình chạy regression, browser/production, container và PostgreSQL. GitHub CI chưa được chạy trong phiên này.

Các sửa cuối được xác nhận bằng kiểm thử phù hợp phạm vi: vòng đời tài khoản qua browser, đường import qua production build/typecheck, migration discovery qua container. Docker có thể cấp lại cổng host ngẫu nhiên khi restart; harness đọc lại binding trước khi kiểm tra health lần hai. Bài đo editor theo dõi phím ở cả shell lẫn iframe, vì selection trong canvas không bảo đảm keyboard focus cũng nằm trong iframe.

## Hiệu năng và phạm vi chưa nghiệm thu

Các số đo storefront dùng Chromium local 390×844, CPU ×4, 1,6 Mbps, latency 150 ms và browser cache mới. Mẫu trước tối ưu được giữ ở `output/platform-production/before-font-optimization.json`; mẫu cuối ở `baseline.json`. Số byte là tổng resource transfer của trình duyệt, không chỉ ảnh và không gồm tài liệu HTML chính. Không coi các lần đo đơn lẻ là field p75 hoặc INP.

| Route | LCP mẫu cuối (ms) | Resource trước → sau (byte) | Giảm resource |
| --- | ---: | ---: | ---: |
| `/cua-hang` | 1416 | 681269 → 400206 | 41,3% |
| `/nhan-tai-lieu` | 1024 | 468235 → 388602 | 17,0% |
| `/san-pham` | 2920 | 681269 → 400206 | 41,3% |
| `/chi-tiet?p=platform-product` | 1384 | 720588 → 640955 | 11,1% |
| `/gio-hang` | 2988 | 468235 → 388602 | 17,0% |
| `/thanh-toan` | 2940 | 461466 → 381138 | 17,4% |

Editor đo thời gian từ phím dịch chuyển đến DOM đổi và hai animation frame, kiểm tra undo trên 600 phần tử. Đây là baseline thao tác trong lab; chưa phải phân tích React profiler toàn bộ panel, kéo thả hoặc mọi loại block.

Mục tiêu production vẫn là field p75 LCP ≤2,5s, INP ≤200ms, CLS ≤0,1. Cần đo lại trên host/nội dung thật và theo dõi sau mở traffic. Các mẫu local còn có route LCP vượt 2,5s.

Các phần sau **chưa được giao hoặc nghiệm thu**, không được mô tả là đã ngang toàn bộ Wix:

- SMTP, GHN, SePay/WIM thật; deploy/backup–restore trên hạ tầng đích; tiền thiếu/thừa và callback thật từ nhà cung cấp. Local/mock không chứng minh email, giao hàng hoặc chuyển tiền đã xảy ra.
- VNPay/MoMo, email nhắc giỏ, back-in-stock, loyalty/gift card/subscription. Đây là các nhánh audit phụ thuộc thị trường và quy tắc vận hành; chưa có implementation mới trong đợt này.
- Lottie/Rive/3D/cursor chuyên biệt; audit xếp vào phần tùy chọn theo chiến dịch. Preset/motion hiện có đã được nâng cấp, chưa thêm các engine này.
- Cache public nội dung theo locale/revision và tách toàn bộ CSS/JS theo route chưa được triển khai thành một cơ chế mới. Không đưa giá/giỏ/tài khoản vào cache chung.
- Import với transaction do caller sở hữu hoặc crash tiến trình giữa chừng cần caller/snapshot xử lý phục hồi file; rollback tự quản của wrapper đã có bù trừ media mới không còn tham chiếu.

Xem [vận hành và giới hạn tích hợp](studio-platform-operations.md) để cấu hình, migration, backup, queue, consent và retention. Không chạy fixture test với database production.
