# Hướng dẫn cài đặt Hosso Studio
**Tiếng Việt** | [English](en/INSTALL.md)

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

### Tính năng quen thuộc kiểu WordPress (đợt 5)

- **Sidebar admin**: nền tối, biểu tượng, nhóm menu và mục con; huy hiệu số thật (bình luận chờ duyệt, bản nháp, lượt gửi biểu mẫu 24 giờ), nút "+" thêm nhanh, ô tìm lệnh (phím `/`), thu gọn thành thanh biểu tượng (menu con bung khi rê chuột), chỉ hiện mục hợp với vai trò. Plugin thêm mục qua `HossoPlugin.adminNav`.
- **Sửa ảnh** trong thư viện Media (xoay, lật, cắt, đổi cỡ, độ sáng/tương phản/bão hòa, trắng đen; lưu thành ảnh mới hoặc thay ảnh cũ).
- **Chuyên mục và thẻ** cho bài viết (`/bai-viet/danh-muc/<slug>`, `/bai-viet/the/<slug>`), block Danh sách bài viết lọc theo chuyên mục/thẻ.
- **Bình luận**: gửi từ trang bài viết (`POST /api/site/comments`), có kiểm duyệt, bẫy bot, giới hạn tần suất; bật/tắt ở Cài đặt site và từng bài.
- **Biểu mẫu** tự dựng (Admin → Biểu mẫu), nhúng bằng block Biểu mẫu; lượt gửi xem trong "Đã gửi", xuất CSV (`/api/site/forms-export/<id>`).
- **Nhiều ngôn ngữ**: khai báo `locales` trong `hosso.config.ts` (mặc định `vi`, thêm `en`); URL tiền tố `/en`, hreflang và sitemap theo ngôn ngữ, nội dung dịch theo từng ngôn ngữ trong trình dựng.
- **Khu vực dùng chung** (trước/sau header, trước/sau footer) dựng bằng kéo thả, và **Khối dùng lại** (block Reusable chèn vào nhiều trang).
- **Phân quyền**: `admin`, `publisher` (xuất bản), `editor`, `author` (chỉ bài của mình), `moderator` (bình luận, biểu mẫu).
- **Nhập từ WordPress**: xuất WXR từ WordPress rồi chạy

```bash
pnpm studio:import-wordpress export.xml --media --site-url https://site-cu.vn --locale vi   # thêm --dry-run để chạy thử
```

  Trang, bài viết, chuyên mục, thẻ, bình luận, ảnh đại diện được chuyển; link nội bộ được viết lại, video YouTube thành block Video.

### Vận hành, biên tập và SEO (đợt 6)

- **Công cụ** (Admin → Công cụ, chỉ admin): tải gói site về máy, sao lưu ngay trên máy chủ (giữ `HOSSO_BACKUP_KEEP` bản trong `HOSSO_BACKUP_DIR`), khôi phục từ gói zip, cài **mẫu site** (các tệp `*.hosso-site.zip` trong `HOSSO_TEMPLATES_DIR`, mặc định `seed/sites` và `packages/*/templates`), xem phiên bản và báo có bản mới (đặt `HOSSO_UPDATE_URL`).
- **Sao lưu tự động**: `pnpm studio:backup` (chạy bằng cron), hoặc service `backup` trong docker-compose (mỗi 24 giờ). Gói chứa nội dung, cấu hình và media, không chứa tài khoản/bình luận/bí mật; sao lưu cả CSDL bằng `pg_dump` (xem chú thích trong docker-compose.yml).
- **Cập nhật một lệnh**: `pnpm studio:update` (cài từ git: sao lưu, `git pull --ff-only`, cài phụ thuộc, migrate, build; dừng nếu có lỗi hoặc có thay đổi chưa commit). Docker: `docker compose pull && docker compose up -d` (migration chạy khi khởi động). Theme và plugin là mã nguồn: thêm package vào `hosso.config.ts` rồi build lại, không cài từ trình duyệt (cố ý, để không chạy mã lạ trên máy chủ).
- **Email thông báo** khi có biểu mẫu/bình luận mới (Cài đặt site → Thông báo; người nhận mặc định là email liên hệ). Cần `HOSSO_SMTP_URL` (ví dụ `smtp://user:pass@host:587`) và `HOSSO_MAIL_FROM`; chưa cấu hình thì email chỉ ghi ra nhật ký.
- **Link xem trước bản nháp**: trong trang/bài (admin) bấm "Link xem trước chia sẻ" → link 7 ngày, ký HMAC bằng `HOSSO_SECRET`, chỉ mở đúng tài liệu đó, có noindex.
- **Chuyển hướng** (Admin → SEO → Chuyển hướng 301): đường dẫn cũ → mới (HTTP 308 vĩnh viễn hoặc 307 tạm); có trong gói xuất/nhập.
- **SEO**: JSON-LD (Organization + WebSite ở trang chủ, Article + BreadcrumbList ở bài viết, BreadcrumbList ở trang), breadcrumb hiển thị trên bài viết, sitemap theo ngôn ngữ.
- **Tùy biến giao diện** (Admin → Giao diện → Tùy biến trực tiếp): chỉnh màu, font, bo góc và thấy ngay trên site thật (khung xem trước máy tính/tablet/điện thoại, chọn trang), rồi Lưu.
- **Sửa trực tiếp**: thanh quản trị hiện trên site cho người đã đăng nhập ("Sửa trang này", "Thuộc tính và SEO", "Tùy biến giao diện"); trong trình dựng, tiêu đề/mô tả/nhãn nút của Banner, tiêu đề của Văn bản và Lưới tính năng sửa thẳng trên canvas.
- **Khóa sửa**: hai người mở cùng trang/ngôn ngữ trong trình dựng thì người sau bị báo ai đang sửa và bị chặn lưu (có nút "Tiếp quản").
- **Widget**: vùng "Cột bên cạnh bài viết" dựng bằng kéo thả (cùng các vùng trước/sau header, footer); menu có dòng tóm tắt "Tên → đường dẫn · n mục con" để sắp xếp bằng kéo thả.
- **Cache trang**: Next trả `Cache-Control: private, no-store` cho trang động nên cache toàn trang nên đặt ở reverse proxy/CDN (ví dụ nginx `proxy_cache` 30–60 giây, bỏ qua khi có cookie `payload-token`). Đã đo TTFB 30–60 ms (SQLite, trang chủ) nên không bắt buộc.

- **Menu dạng cây** (Cài đặt site → Menu): kéo thả để sắp xếp và tạo menu con, thêm nhanh từ danh sách trang; mỗi ngôn ngữ một menu.
- **Widget** (Admin → Giao diện → Widget): thêm/sắp xếp widget cho cột bên bài viết và các vùng trước/sau header, footer.
- **Nâng cấp từ DB PoC cũ (Postgres)**: chỉ cần `pnpm migrate`; dữ liệu cũ (trang, bài, cài đặt, menu) được giữ và đặt vào ngôn ngữ đầu tiên (vi). Với SQLite dev: xuất gói bằng bản cũ rồi `pnpm studio:import` vào DB mới.

- **Admin song ngữ (vi/en)**: giao diện quản trị và trình dựng đổi theo ngôn ngữ người dùng chọn trong Payload (Tài khoản → Ngôn ngữ): sidebar, Công cụ, Widget, Tùy biến, menu cây, sửa ảnh, trình dựng (nút, trạng thái, nhãn block), tên collection/trường. Thêm chuỗi mới: viết tiếng Việt trong code (`T('…')`/`L('…')`) và thêm bản tiếng Anh vào `apps/studio/src/lib/admin-en/*.ts` (nhãn block: `packages/blocks/src/labels-en.ts`; plugin: `HossoPlugin.adminEn`); `pnpm check:i18n` báo chuỗi còn thiếu.

## 3. Kết nối Hosso WIM (plugin, tùy chọn)

Trong PoC dùng mock:

```bash
pnpm mock:wim            # http://localhost:4010, khóa API mặc định: mock-wim-key
```

Admin → Kết nối Hosso WIM: nhập địa chỉ API, khóa API, bí mật webhook (mock: `mock-webhook-secret`) → Lưu → "Kiểm tra kết nối". Khóa và bí mật được mã hóa khi lưu bằng `HOSSO_ENCRYPTION_KEY` và luôn hiện dạng che.

Có thể đặt toàn bộ bằng biến môi trường (ưu tiên hơn giá trị trong admin): `HOSSO_WIM_API_URL`, `HOSSO_WIM_API_KEY`, `HOSSO_WIM_WEBHOOK_SECRET`, `HOSSO_WIM_TIMEOUT_MS`, `HOSSO_WIM_CACHE_TTL`.

Các block thương mại (Bộ chọn xe, Ô tìm, Lưới sản phẩm, Chi tiết sản phẩm, Giỏ hàng, Thanh toán, Trạng thái đơn) xuất hiện trong trình dựng khi plugin được cài. Site mẫu hoàn chỉnh (theme Cửa hàng phụ tùng, 8 trang, 3 bài viết, ảnh, menu, kết nối WIM mock): `packages/plugin-wim/templates/phu-tung-o-to.hosso-site.zip`, nhập bằng `pnpm studio:import packages/plugin-wim/templates/phu-tung-o-to.hosso-site.zip` (xem mục 5).

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

Migration Postgres được sinh sẵn trong `apps/studio/src/migrations` cho bản phân phối đầy đủ (có các plugin WIM, Cửa hàng, Tiếp thị liên kết, Giao vận). Nếu thêm plugin có bảng riêng: `HOSSO_DATABASE_URL=postgres://... pnpm --filter @hosso/studio payload migrate:create <tên>`.

> Đã kiểm tra thật (17/10/2026, Docker Desktop 4.55): `docker compose up --build` dựng image, Postgres healthy, container tự chạy migration và báo healthy; nhập gói site bằng `studio-tools` thành công; WIM mock ở máy host truy cập qua `HOSSO_WIM_API_URL=http://host.docker.internal:4010`. Lưu ý nhỏ: container vẫn in thông báo Corepack tải pnpm khi chạy `studio-tools`.

## 5. Xuất / nhập gói site

```bash
pnpm studio:export site.zip     # nội dung, cấu trúc trang, theme + token, cấu hình plugin (không có khóa/bí mật), media
pnpm studio:import site.zip     # trên cài đặt sạch đã migrate (SQLite: chạy pnpm dev một lần trước để tạo schema); trang/bài trùng slug được cập nhật
```

Gói không chứa tài khoản, tin nhắn liên hệ, đơn hàng (WIM làm chủ), và không chứa khóa API/bí mật webhook: nhập lại trong admin hoặc đặt bằng `HOSSO_WIM_*`. Với Docker: `docker compose run --rm -v "$PWD:/pkg" studio-tools pnpm studio:import /pkg/site.zip`.

## 6. Biến môi trường chính

Xem `.env.example`. Tiền tố `HOSSO_`: `DATABASE_URL`, `SECRET`, `ENCRYPTION_KEY`, `PUBLIC_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SEED`, `MEDIA_DIR`, `WIM_*`.
