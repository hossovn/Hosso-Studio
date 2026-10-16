# Nghiệm thu PoC (mục 12) và báo cáo cuối

Ngày chạy: 16–17/10/2026, Windows 11, Node 22.15.1, pnpm 10.34.6. Phiên bản chính: Payload 3.91.0, Next 16.4.2, React 19.3.1, Puck (@puckeditor/core) 0.23.0, NestJS 11.2.7, TypeScript 5.9.3, graphql 16.14.2.

## 1. Kết quả theo tiêu chí

| # | Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Clone mới, một lệnh là có Studio và site mẫu | **Đạt** | Clone HEAD vào thư mục sạch: `pnpm install && pnpm dev` → trang chủ 200 có `<h1>` tiếng Việt, `/admin` 200, `/api/health` ok, seed nạp 2 trang |
| 2 | Dựng trang bằng kéo thả Puck, xem trước, xuất bản, trang công khai đúng | **Đạt** (kéo thả kiểm bằng sự kiện pointer giả lập, chưa thử chuột thật) | `docs/GATE2-REPORT.md`; trang chủ cửa hàng dựng và xuất bản qua `/editor/2`, trang công khai hiện đủ block |
| 3 | Đổi theme giữ nguyên nội dung và cấu trúc; chỉnh màu/font trong admin | **Đạt** | SHA-1 toàn bộ JSON trang trước/sau đổi default → alt → default giống hệt; đã đổi `color_primary`, `fontHeading`, `radius` trong "Giao diện site" và CSS đổi theo |
| 4 | Theme thứ hai từ package riêng, không sửa lõi | **Đạt** | `packages/theme-alt` + một dòng trong `hosso.config.ts` (và dependency). `next.config.ts` hiện tự nhận mọi `@hosso/*` nên không cần sửa nữa |
| 5 | Chạy khi không có plugin WIM; gỡ plugin không sập site; lõi/blocks/theme không import plugin-wim | **Đạt** | Gỡ plugin khỏi `hosso.config.ts`: `/`, `/admin` 200, trang có block WIM vẫn 200 (hero còn, block bị bỏ qua), API `wim-settings` 404. `pnpm check:boundaries` OK. Lưu ý: Payload dev hỏi xác nhận xóa bảng `wim_settings` lúc khởi động |
| 6 | Web bán hàng đầu tiên dựng bằng admin, không sửa mã | **Đạt một phần, có ghi chú** | Cấu hình WIM nhập bằng form admin (lưu + "Kiểm tra kết nối" qua trình duyệt); trang chủ dựng và xuất bản bằng trình dựng kéo thả; 5 trang còn lại và token theme tạo qua REST của admin (cùng API mà admin dùng) để tiết kiệm thời gian. Không sửa mã nguồn. Gói kết quả: `seed/sites/phu-tung-o-to.hosso-site.zip` |
| 7 | Sản phẩm, giá, tồn kho từ WIM; DB Studio không có bảng sao chép | **Đạt** | Bảng Postgres của instance 2: `_pages_v, contact_messages, media, pages, payload_*, site_settings, users*, wim_settings, wim_settings_category_map` |
| 8 | Chọn xe thì lưới chỉ hiện phụ tùng tương thích; thiếu dữ liệu tương thích vẫn chạy | **Đạt** | Toyota Vios 2015: 16 sản phẩm, đều tương thích (contract test kiểm từng dòng). `mock chaos no-compat`: bộ chọn xe ẩn, lưới và đặt hàng vẫn chạy, chi tiết không có mục "Xe tương thích" |
| 9 | Tìm bằng mã thay thế ra đúng sản phẩm | **Đạt** | `?q=ALT0007` → P002; `?q=TY-MP-10037` (OEM) → P001, P002; contract test kiểm bỏ gạch nối/hoa thường |
| 10 | Tồn kho theo chi nhánh; đặt nhận tại chi nhánh tạo được đơn trong mock | **Đạt** | Trang chi tiết hiện 3 chi nhánh; `check-order-flow`: đơn pickup `hn` có trong mock với `branchId=hn`, tồn chi nhánh bị trừ |
| 11 | Đơn xuất hiện trong mock; gửi lại cùng Idempotency-Key không tạo đơn thứ hai | **Đạt** | `pnpm check:order-flow` 16/16 (cả trên instance SQLite và instance Postgres); contract test: cùng key → 200 cùng đơn, khác nội dung → 422 |
| 12 | Cache TTL ngắn khi không webhook; webhook làm mới nhanh; webhook sai chữ ký/lệch timestamp bị từ chối | **Đạt** | TTL 4s: đổi giá trong mock → trang đổi sau TTL; webhook đúng chữ ký → đổi ngay (`refreshed`); `--bad-signature` → 401 `bad_signature`; `--old-timestamp` → 401 `stale_timestamp` |
| 13 | Mock lỗi/chậm thì site vẫn hiện nội dung Studio và báo lỗi hợp lý | **Đạt** | `chaos error`/`slow`/tắt hẳn mock: trang 200, hero còn, khối bán hàng hiện câu báo lỗi tiếng Việt; chi tiết dùng bản cache cũ khi WIM chết |
| 14 | Khóa API và bí mật webhook mã hóa khi lưu, không xuất hiện ở trình duyệt, gói export không chứa | **Đạt** | DB: `api_key = enc:v1:…`; API trả `••••••••`; quét `.next/static` (dev và production), HTML trang công khai và trang editor: 0 kết quả; gói zip không có `mock-wim-key`, `mock-webhook-secret`, `enc:v1` |
| 15 | Export từ máy này, import vào cài đặt sạch bằng Docker + Postgres (env) thì site chạy giống bản gốc | **Đạt** | `docker compose up --build` (Postgres 17 + image Node 24): healthy, migration tự chạy; `studio-tools` nhập `seed/sites/phu-tung-o-to.hosso-site.zip` → 7 trang + media; trang chủ, `/san-pham` (12 sản phẩm từ mock qua `host.docker.internal`, cấu hình WIM hoàn toàn bằng env), media 200, đặt đơn `WO-000003` rồi gửi lại cùng giỏ ra cùng đơn, webhook sai chữ ký 401. Trước đó cũng đạt trên Postgres + production build ngoài Docker |
| 16 | Health check, migration chạy được | **Đạt** | `GET /api/health` → `{"status":"ok","db":"up"}`; `payload migrate` chạy trên Postgres trống (16 bảng) |
| 17 | Lighthouse di động ≥ 90 trang chủ và trang sản phẩm; font dấu tiếng Việt; giá VND | **Đạt** | Lighthouse 13.5.0 (headless Chrome, giả lập di động) trên production build: theme "Sáng & Sạch" trang chủ 97 / chi tiết 97 / danh sách 97; theme "Kỹ thuật tối" trang chủ 96 / chi tiết 96. Accessibility 100, SEO 100. Giá `858.000 ₫`; font Be Vietnam Pro/Barlow có subset vietnamese |
| 18 | LICENSE (Apache-2.0 nguyên văn), NOTICE, TRADEMARK.md (nháp), CONTRIBUTING.md ở gốc | **Đạt** | `LICENSE` khớp bản chính thức (chỉ khác một dòng trống đầu file), các file khác có đủ |
| 19 | package.json mọi package mở: Apache-2.0; plugin-wim: UNLICENSED + private, không có LICENSE trong thư mục | **Đạt** | Quét `package.json` của 7 package; `packages/plugin-wim` chỉ có `package.json`, `src`, `tsconfig.json` |
| 20 | `docs/LICENSES.md`; không có GPL/AGPL/LGPL trong cây phụ thuộc của lõi | **Đạt** | `pnpm licenses list --json` (cả dev): chỉ MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, CC-BY-4.0 (dữ liệu), Python-2.0, WTFPL; không có sharp/libvips |

## 2. Chưa chạy được / giới hạn

- ~~Docker chưa chạy~~ → đã chạy thật ngày 17/10 (xem dòng 15). Còn lại: chưa thử trên máy khác; thông báo Corepack tải pnpm khi chạy `studio-tools`.
- **Logo và wordmark.** Ảnh bạn gửi trong chat không có file trên đĩa nên tôi dựng lại bằng SVG (`apps/studio/public/brand/mark.svg` chữ H đỏ, `wordmark.svg` chữ HOSSO bằng font Impact/Anton dự phòng). Hãy thả file gốc thay vào hai tên này. Theo yêu cầu: logo admin là wordmark, favicon là wordmark, biểu tượng nhỏ là chữ H.
- Kéo thả kiểm bằng sự kiện giả lập; sự kiện giả lập thả đôi mỗi block nên đã xóa bản trùng. Chuột thật cần thử.
- Admin Payload hiện ngôn ngữ theo trình duyệt (đã bật `vi`); trình duyệt tiếng Anh thấy nhãn mặc định tiếng Anh.
- Editor chưa có chọn ảnh từ Media, tạo trang mới trong editor, tự lưu, khóa chống ghi đè (xem `docs/GATE2-REPORT.md`).
- Chưa giới hạn tần suất cho form liên hệ và checkout.
- Instance thứ hai (Docker + Postgres) chạy trên cùng máy với bản gốc, chưa ở máy khác.

## 3. Quyết định tự chọn

- Thêm `fflate` (MIT) để nén zip, tránh tự viết định dạng gói.
- Plugin dùng Web Crypto và chỉ `import type` từ `payload` để mã plugin chạy được trong bundle trình duyệt của editor mà không kéo module Node.
- Giỏ hàng ở localStorage; Idempotency-Key = SHA-256(cartId + nội dung đơn); thử lại tối đa 3 lần cùng khóa.
- Tra cứu đơn cần mã đơn + 4 số cuối điện thoại (khách không có tài khoản).
- Webhook: header `X-Hosso-Timestamp` (giây) và `X-Hosso-Signature` = hex(HMAC-SHA256(secret, `timestamp.thân`)). Mock điều khiển lỗi bằng lệnh `mock chaos`, không mở thêm endpoint HTTP.
- Migration Postgres sinh một lần cho bản đầy đủ (có plugin WIM); SQLite dùng push ở dev.
- Bỏ `Critical-CH` của Payload khỏi trang công khai (nó làm trình duyệt gửi lại yêu cầu, mất ~600ms di động), chỉ giữ ở `/admin`.
- Chỉ preload font mặc định; Barlow và JetBrains Mono tải khi theme dùng đến.

## 4. Lệnh tự kiểm tra

```bash
pnpm install && pnpm dev                          # Studio + site mẫu
pnpm mock:wim                                     # mock WIM (cổng khác)
pnpm --filter @hosso/mock-wim test:contract       # 25 kiểm tra hợp đồng API
pnpm check:order-flow                             # 16 kiểm tra luồng đặt đơn (cần cả hai server chạy và đã cấu hình WIM)
pnpm check:boundaries && pnpm typecheck
pnpm studio:export site.zip && pnpm studio:import site.zip
```
