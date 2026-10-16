# Hướng dẫn cài đặt Hosso Studio

Một cài đặt = một website. Yêu cầu: Node ≥ 22.15 (khuyến nghị 24 LTS), pnpm ≥ 10. Docker chỉ cần khi chạy bằng container.

## 1. Chạy local (một lệnh)

```bash
pnpm install
pnpm dev
```

Lần đầu `pnpm dev` tạo `apps/studio/.env` (khóa ngẫu nhiên, tài khoản admin), tạo database SQLite `apps/studio/data/studio.db` và nạp trang mẫu.

- Site: http://localhost:3000
- Quản trị: http://localhost:3000/admin (email và mật khẩu ở `apps/studio/.env`: `HOSSO_ADMIN_EMAIL`, `HOSSO_ADMIN_PASSWORD`)
- Trình dựng kéo thả: mở một trang trong admin, bấm "Mở trình dựng kéo thả" (hoặc `/editor/<id>`).
- Health check: http://localhost:3000/api/health

## 2. Dựng site

1. **Trang**: Admin → Các trang → tạo trang, lưu, mở trình dựng, kéo block vào, chỉnh thuộc tính. "Lưu nháp" ai cũng làm được; "Xuất bản" chỉ vai trò quản trị viên.
2. **Khung site** (Admin → Giao diện site, các tab): Thương hiệu (tên, logo, favicon, thông báo trên cùng), Menu (menu đầu trang tối đa hai cấp có dropdown, menu chân trang), Liên hệ (điện thoại, email, địa chỉ, Zalo, mạng xã hội; nút Zalo/Gọi điện nổi tự hiện khi có số). Header và footer do theme vẽ, dùng chung mọi trang.
3. **Trình dựng**: chọn ảnh từ thư viện Media hoặc tải ảnh lên ngay trong ô thuộc tính; menu trên cùng của trình dựng có danh sách trang, "+ Trang mới" và "Đổi tên / đường dẫn".
4. **Theme**: tab "Giao diện" cùng trang đó → chọn theme, chỉnh màu/font/bo góc (để trống = mặc định của theme). Đổi theme không đổi nội dung trang.
5. **Người dùng**: vai trò `admin` (xuất bản, cài đặt) và `editor` (chỉ lưu nháp).
6. **Thương hiệu, theme, plugin** khai báo trong một file: `apps/studio/hosso.config.ts`. Muốn thêm theme: thêm package theme và một dòng trong `themes`. Gỡ plugin: xóa import và mục `plugins`; block của plugin bị bỏ qua, site vẫn chạy (Payload sẽ hỏi xác nhận xóa bảng cài đặt của plugin khi khởi động ở chế độ dev).

### Nội dung và quản trị (đợt 2–4)

- **Bài viết** (Admin → Bài viết): tiêu đề, tóm tắt, ảnh đại diện, ngày đăng; nội dung dựng bằng cùng trình dựng kéo thả (`/editor/<id>?c=posts`). Địa chỉ công khai `/bai-viet/<slug>`. Dùng block "Danh sách bài viết" để hiện bài trên một trang (ví dụ trang Cẩm nang, có phân trang).
- **Video**: block Video nhận link YouTube/Vimeo (nhúng qua youtube-nocookie, tải khi cuộn tới) hoặc tệp mp4/webm tải lên từ thư viện Media.
- **Block thêm cho trang bán hàng**: Lưới danh mục (có ảnh), Thanh cam kết, Banner có ảnh nền (Hero có trường ảnh).
- **Tìm kiếm** `/tim-kiem`: tìm trong trang, bài viết và (khi có plugin WIM) sản phẩm; ô tìm trên header bật/tắt ở Cài đặt site. Trang 404 có ô tìm.
- **SEO**: mỗi trang/bài có nhóm SEO (tiêu đề Google, ảnh chia sẻ, không lập chỉ mục); site tự sinh `/sitemap.xml` và `/robots.txt` (dùng `HOSSO_PUBLIC_URL`).
- **Trình dựng**: tự lưu nháp sau 4 giây, cảnh báo khi rời trang còn thay đổi chưa lưu, nút "Lịch sử" mở các phiên bản trong admin để khôi phục, chuyển đổi xem trước điện thoại / máy tính bảng / máy tính.
- **Hướng dẫn bắt đầu** hiện ở dashboard admin cho đến khi hoàn tất các bước (tên và logo, menu, trang chủ, ít nhất 3 trang, kết nối WIM nếu có plugin).
- **Theme**: "Sáng & Sạch", "Kỹ thuật tối" và "Cửa hàng phụ tùng" (header hai tầng có tìm kiếm, hotline, giỏ hàng và thanh menu màu nhấn).

## 3. Kết nối Hosso WIM (plugin, tùy chọn)

Trong PoC dùng mock:

```bash
pnpm mock:wim            # http://localhost:4010, khóa API mặc định: mock-wim-key
```

Admin → Kết nối Hosso WIM: nhập địa chỉ API, khóa API, bí mật webhook (mock: `mock-webhook-secret`) → Lưu → "Kiểm tra kết nối". Khóa và bí mật được mã hóa khi lưu bằng `HOSSO_ENCRYPTION_KEY` và luôn hiện dạng che.

Có thể đặt toàn bộ bằng biến môi trường (ưu tiên hơn giá trị trong admin): `HOSSO_WIM_API_URL`, `HOSSO_WIM_API_KEY`, `HOSSO_WIM_WEBHOOK_SECRET`, `HOSSO_WIM_TIMEOUT_MS`, `HOSSO_WIM_CACHE_TTL`.

Các block thương mại (Bộ chọn xe, Ô tìm, Lưới sản phẩm, Chi tiết sản phẩm, Giỏ hàng, Thanh toán, Trạng thái đơn) xuất hiện trong trình dựng khi plugin được cài. Site mẫu hoàn chỉnh (theme Cửa hàng phụ tùng, 8 trang, 3 bài viết, ảnh, menu, kết nối WIM mock): `seed/sites/phu-tung-o-to.hosso-site.zip`, nhập bằng `pnpm studio:import seed/sites/phu-tung-o-to.hosso-site.zip` (xem mục 5).

Điều khiển mock để thử lỗi (không mở thêm endpoint):

```bash
pnpm --filter @hosso/mock-wim mock chaos slow|timeout|error|out_of_stock|no-compat|order-timeout|off
pnpm --filter @hosso/mock-wim mock price P001 700000
pnpm --filter @hosso/mock-wim mock stock P001 hn 0
pnpm --filter @hosso/mock-wim mock webhook product.updated P001 [--bad-signature|--old-timestamp]
```

Kiểm tra: `pnpm --filter @hosso/mock-wim test:contract` (hợp đồng API) và `pnpm check:order-flow` (luồng đặt đơn qua site đang chạy).

## 4. Deploy bằng Docker + Postgres

```bash
cp .env.example .env     # điền POSTGRES_PASSWORD, HOSSO_SECRET, HOSSO_ENCRYPTION_KEY, HOSSO_PUBLIC_URL, HOSSO_ADMIN_*
docker compose up --build
```

`HOSSO_DATABASE_URL` chọn database: `file:...` là SQLite, `postgres://...` là Postgres. Container tự chạy migration (`payload migrate`) rồi khởi động. Media nằm ở volume `media`. Mọi cấu hình nhạy cảm đi qua biến môi trường; không có địa chỉ hay đường dẫn cứng trong mã.

Migration Postgres được sinh sẵn trong `apps/studio/src/migrations` cho bản phân phối đầy đủ (có plugin WIM). Nếu thêm plugin có bảng riêng: `HOSSO_DATABASE_URL=postgres://... pnpm --filter @hosso/studio payload migrate:create <tên>`.

> Đã kiểm tra thật (17/10/2026, Docker Desktop 4.55): `docker compose up --build` dựng image, Postgres healthy, container tự chạy migration và báo healthy; nhập gói site bằng `studio-tools` thành công; WIM mock ở máy host truy cập qua `HOSSO_WIM_API_URL=http://host.docker.internal:4010`. Lưu ý nhỏ: container vẫn in thông báo Corepack tải pnpm khi chạy `studio-tools`.

## 5. Xuất / nhập gói site

```bash
pnpm studio:export site.zip     # nội dung, cấu trúc trang, theme + token, cấu hình plugin (không có khóa/bí mật), media
pnpm studio:import site.zip     # trên cài đặt sạch đã migrate (SQLite: chạy pnpm dev một lần trước để tạo schema); trang/bài trùng slug được cập nhật
```

Gói không chứa tài khoản, tin nhắn liên hệ, đơn hàng (WIM làm chủ), và không chứa khóa API/bí mật webhook: nhập lại trong admin hoặc đặt bằng `HOSSO_WIM_*`. Với Docker: `docker compose run --rm -v "$PWD:/pkg" studio-tools pnpm studio:import /pkg/site.zip`.

## 6. Biến môi trường chính

Xem `.env.example`. Tiền tố `HOSSO_`: `DATABASE_URL`, `SECRET`, `ENCRYPTION_KEY`, `PUBLIC_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED`, `MEDIA_DIR`, `WIM_*`.
